import * as THREE from 'three';
import { Landmark, PoseLandmarks, BodyMotion } from '../../types';
import { HumanoidBoneName, BoneTransform, MappedAvatarPose, MotionMapperOptions } from '../../types/avatar';

/**
 * Coordinate Conversion & Mirroring Architecture:
 * -----------------------------------------------
 * MediaPipe Pose Output:
 * - X_mp: [0, 1] normalized horizontal (0 = left of camera image, 1 = right)
 * - Y_mp: [0, 1] normalized vertical (0 = top of screen/head, 1 = bottom/feet)
 * - Z_mp: depth relative to hips (negative = closer to camera, positive = farther)
 * 
 * Avatar 3D Coordinate Space (Three.js):
 * - X_3d: Horizontal axis (+X = right in 3D world space, -X = left)
 * - Y_3d: Vertical axis (+Y = up toward sky, -Y = down toward ground)
 * - Z_3d: Forward/back axis (+Z = towards camera/viewer, -Z = into screen)
 * 
 * Mirroring Logic:
 * - When `isMirrored = true` (standard selfie webcam):
 *   The child sees the screen as a mirror reflection.
 *   When the child raises their physical right arm, it is on the left in the raw camera frame (x < 0.5),
 *   but rendered on the right side of the screen.
 *   To give the child the feeling of looking into a magical cartoon mirror:
 *   - The avatar faces the child.
 *   - X is inverted: X_avatar = (0.5 - X_mp) * scale
 *   - Y is inverted: Y_avatar = (0.5 - Y_mp) * scale (since screen Y goes down, 3D Y goes up)
 *   - Z is preserved: Z_avatar = -Z_mp * scale (negative depth = closer to viewer)
 *   - Child's anatomical right shoulder/arm maps to avatar's right shoulder/arm.
 *   - Child's anatomical left shoulder/arm maps to avatar's left shoulder/arm.
 */
export class MotionMapper {
  private isMirrored: boolean;
  private confidenceThreshold: number;
  private sensitivity: number;

  // Reusable 3D vectors to prevent garbage collection hiccups during 60FPS loops
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private v4 = new THREE.Vector3();
  private q1 = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private qInv = new THREE.Quaternion();

  // Anatomical rest vectors (direction in avatar local space when in default resting A-pose)
  private readonly REST_UPPER_ARM_L = new THREE.Vector3(-0.35, -0.93, 0).normalize();
  private readonly REST_UPPER_ARM_R = new THREE.Vector3(0.35, -0.93, 0).normalize();
  private readonly REST_FOREARM_L = new THREE.Vector3(-0.15, -0.98, 0).normalize();
  private readonly REST_FOREARM_R = new THREE.Vector3(0.15, -0.98, 0).normalize();
  private readonly REST_THIGH_L = new THREE.Vector3(-0.1, -0.99, 0).normalize();
  private readonly REST_THIGH_R = new THREE.Vector3(0.1, -0.99, 0).normalize();
  private readonly REST_SHIN = new THREE.Vector3(0, -1, 0);
  private readonly REST_HEAD = new THREE.Vector3(0, 1, 0);
  private readonly REST_SPINE = new THREE.Vector3(0, 1, 0);

  // Baseline calibration for jumping / crouching
  private baselineHipY: number | null = null;

  constructor(options: MotionMapperOptions = {}) {
    this.isMirrored = options.isMirrored ?? true;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.45;
    this.sensitivity = options.sensitivity ?? 1.0;
  }

  public setMirrored(mirrored: boolean): void {
    this.isMirrored = mirrored;
  }

  public setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = THREE.MathUtils.clamp(threshold, 0.1, 0.9);
  }

  public setSensitivity(sensitivity: number): void {
    this.sensitivity = THREE.MathUtils.clamp(sensitivity, 0.5, 2.0);
  }

  public resetCalibration(): void {
    this.baselineHipY = null;
  }

  /**
   * Converts a single MediaPipe landmark into avatar-local 3D Cartesian coordinates.
   * Handles Y-axis inversion, depth scaling, and mirroring.
   */
  public landmarkToAvatarLocal(
    lm: Landmark | undefined,
    out: THREE.Vector3,
    centerOffset?: THREE.Vector3
  ): { valid: boolean; confidence: number } {
    if (!lm) {
      out.set(0, 0, 0);
      return { valid: false, confidence: 0 };
    }

    const confidence = lm.visibility ?? 1.0;
    const isReliable = confidence >= this.confidenceThreshold;

    // Convert normalized [0, 1] to centered [-1, 1]
    // In mirror mode: left on screen matches user's right side reflection
    const rawX = this.isMirrored ? (0.5 - lm.x) * 2.0 : (lm.x - 0.5) * 2.0;
    
    // Invert Y: Screen Y=0 is top, Y=1 is bottom; in 3D +Y is UP
    const rawY = (0.5 - lm.y) * 2.0;

    // Depth Z: MediaPipe negative is closer to camera; in Three.js +Z is closer to viewer
    const rawZ = -(lm.z || 0) * 2.0;

    out.set(rawX, rawY, rawZ);

    if (centerOffset) {
      out.sub(centerOffset);
    }

    return { valid: isReliable, confidence };
  }

  /**
   * Primary mapping function:
   * Maps incoming BodyMotion or raw MediaPipe landmarks into avatar bone transforms.
   */
  public mapMotionToAvatarPose(
    motion: BodyMotion | null,
    landmarks?: PoseLandmarks | null,
    mouthOpenLevel: number = 0,
    timestamp: number = performance.now()
  ): MappedAvatarPose {
    const bones: Partial<Record<HumanoidBoneName, BoneTransform>> = {};
    const hipTranslation = new THREE.Vector3(0, 0, 0);

    // If no motion or detection, return default resting identity pose
    if (!motion || !motion.isDetected) {
      return {
        timestamp,
        confidence: 0,
        isDetected: false,
        bones,
        hipTranslation,
        mouthOpen: mouthOpenLevel,
        eyeBlink: 0,
      };
    }

    // Extract landmarks: prefer explicitly passed landmarks or motion's landmarks
    const lm = landmarks || {
      nose: motion.head?.nose,
      leftEye: motion.head?.leftEye,
      rightEye: motion.head?.rightEye,
      leftShoulder: motion.shoulders?.left,
      rightShoulder: motion.shoulders?.right,
      leftElbow: motion.elbows?.left,
      rightElbow: motion.elbows?.right,
      leftWrist: motion.wrists?.left,
      rightWrist: motion.wrists?.right,
      leftHip: motion.hips?.left,
      rightHip: motion.hips?.right,
      leftKnee: motion.knees?.left,
      rightKnee: motion.knees?.right,
      leftAnkle: motion.ankles?.left,
      rightAnkle: motion.ankles?.right,
    };

    // 1. Calculate Torso Center Reference Point (Midpoint of hips or shoulders)
    const shoulderL = new THREE.Vector3();
    const shoulderR = new THREE.Vector3();
    const hipL = new THREE.Vector3();
    const hipR = new THREE.Vector3();

    const confShoulderL = this.landmarkToAvatarLocal(lm.leftShoulder, shoulderL);
    const confShoulderR = this.landmarkToAvatarLocal(lm.rightShoulder, shoulderR);
    const confHipL = this.landmarkToAvatarLocal(lm.leftHip, hipL);
    const confHipR = this.landmarkToAvatarLocal(lm.rightHip, hipR);

    // Torso center
    const torsoCenter = new THREE.Vector3()
      .addVectors(shoulderL, shoulderR)
      .add(hipL)
      .add(hipR)
      .multiplyScalar(0.25);

    // 2. Map Head & Neck
    this.mapHead(lm, torsoCenter, bones);

    // 3. Map Arms (Left Shoulder -> Elbow -> Wrist, Right Shoulder -> Elbow -> Wrist)
    this.mapArm('left', lm.leftShoulder, lm.leftElbow, lm.leftWrist, bones);
    this.mapArm('right', lm.rightShoulder, lm.rightElbow, lm.rightWrist, bones);

    // 4. Map Spine & Torso Lean / Twist
    this.mapTorso(shoulderL, shoulderR, hipL, hipR, confShoulderL.confidence, confShoulderR.confidence, bones);

    // 5. Map Hips / Pelvis & Jumping / Squatting
    this.mapHips(hipL, hipR, confHipL.confidence, confHipR.confidence, hipTranslation, bones);

    // 6. Map Legs (Thigh -> Knee -> Ankle)
    this.mapLeg('left', lm.leftHip, lm.leftKnee, lm.leftAnkle, bones);
    this.mapLeg('right', lm.rightHip, lm.rightKnee, lm.rightAnkle, bones);

    return {
      timestamp,
      confidence: motion.confidence,
      isDetected: true,
      bones,
      hipTranslation,
      mouthOpen: mouthOpenLevel,
      eyeBlink: 0,
    };
  }

  /**
   * Maps Head (Pitch, Yaw, Roll) using Nose, Eyes, and Shoulder Center
   */
  private mapHead(
    lm: PoseLandmarks,
    torsoCenter: THREE.Vector3,
    bones: Partial<Record<HumanoidBoneName, BoneTransform>>
  ): void {
    const nose3d = new THREE.Vector3();
    const eyeL3d = new THREE.Vector3();
    const eyeR3d = new THREE.Vector3();

    const confNose = this.landmarkToAvatarLocal(lm.nose, nose3d);
    const confEyeL = this.landmarkToAvatarLocal(lm.leftEye, eyeL3d);
    const confEyeR = this.landmarkToAvatarLocal(lm.rightEye, eyeR3d);

    if (!confNose.valid) {
      bones.head = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: confNose.confidence,
        isReliable: false,
      };
      return;
    }

    // Direction from shoulder center to nose
    const shoulderCenter = new THREE.Vector3();
    if (lm.leftShoulder && lm.rightShoulder) {
      const sL = new THREE.Vector3();
      const sR = new THREE.Vector3();
      this.landmarkToAvatarLocal(lm.leftShoulder, sL);
      this.landmarkToAvatarLocal(lm.rightShoulder, sR);
      shoulderCenter.addVectors(sL, sR).multiplyScalar(0.5);
    } else {
      shoulderCenter.copy(torsoCenter);
    }

    const headDir = new THREE.Vector3().subVectors(nose3d, shoulderCenter).normalize();

    // Yaw: left / right looking (around Y axis)
    // Pitch: up / down looking (around X axis)
    // Roll: head tilt (around Z axis)
    const yaw = THREE.MathUtils.clamp(-headDir.x * 1.5 * this.sensitivity, -0.9, 0.9);
    const pitch = THREE.MathUtils.clamp((headDir.y - 0.95) * 2.2 * this.sensitivity, -0.65, 0.65);

    let roll = 0;
    if (confEyeL.valid && confEyeR.valid) {
      const eyeDiff = new THREE.Vector3().subVectors(eyeR3d, eyeL3d);
      roll = Math.atan2(eyeDiff.y, eyeDiff.x);
      // In mirror mode adjust roll direction
      if (this.isMirrored) roll = -roll;
      roll = THREE.MathUtils.clamp(roll * 1.2 * this.sensitivity, -0.5, 0.5);
    }

    const euler = new THREE.Euler(pitch, yaw, roll, 'YXZ');
    const quat = new THREE.Quaternion().setFromEuler(euler);

    bones.head = {
      rotation: quat,
      position: new THREE.Vector3(0, 0, 0),
      confidence: confNose.confidence,
      isReliable: true,
    };

    // Neck: shares a softened portion of head rotation for natural cartoon posture
    const neckEuler = new THREE.Euler(pitch * 0.4, yaw * 0.4, roll * 0.4, 'YXZ');
    bones.neck = {
      rotation: new THREE.Quaternion().setFromEuler(neckEuler),
      position: new THREE.Vector3(0, 0, 0),
      confidence: confNose.confidence,
      isReliable: true,
    };
  }

  /**
   * Maps an arm (Upper Arm and Forearm) using Shoulder, Elbow, and Wrist landmarks.
   * Calculates rotations using direction vectors and unit vector quaternions.
   */
  private mapArm(
    side: 'left' | 'right',
    lmShoulder: Landmark | undefined,
    lmElbow: Landmark | undefined,
    lmWrist: Landmark | undefined,
    bones: Partial<Record<HumanoidBoneName, BoneTransform>>
  ): void {
    const isLeft = side === 'left';
    const upperArmBoneName: HumanoidBoneName = isLeft ? 'leftUpperArm' : 'rightUpperArm';
    const forearmBoneName: HumanoidBoneName = isLeft ? 'leftForearm' : 'rightForearm';

    const pShoulder = new THREE.Vector3();
    const pElbow = new THREE.Vector3();
    const pWrist = new THREE.Vector3();

    const confShoulder = this.landmarkToAvatarLocal(lmShoulder, pShoulder);
    const confElbow = this.landmarkToAvatarLocal(lmElbow, pElbow);
    const confWrist = this.landmarkToAvatarLocal(lmWrist, pWrist);

    // 1. Upper Arm Direction Vector (Shoulder -> Elbow)
    const isUpperArmReliable = confShoulder.valid && confElbow.valid;
    const armDir = this.v1.subVectors(pElbow, pShoulder);
    const armLength = armDir.length();

    if (!isUpperArmReliable || armLength < 0.02) {
      // Retain rest pose with low confidence
      bones[upperArmBoneName] = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: Math.min(confShoulder.confidence, confElbow.confidence),
        isReliable: false,
      };
      bones[forearmBoneName] = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: confWrist.confidence,
        isReliable: false,
      };
      return;
    }

    armDir.normalize();

    // Rest vector for this arm in neutral A-pose
    const restUpperArm = isLeft ? this.REST_UPPER_ARM_L : this.REST_UPPER_ARM_R;

    // Compute rotation quaternion from rest direction to tracked direction
    const quatUpperArm = new THREE.Quaternion().setFromUnitVectors(restUpperArm, armDir);

    // Prevent unnatural hyper-extension (clamp excessive inward or backward twisting)
    this.clampUpperArmRotation(quatUpperArm, isLeft);

    bones[upperArmBoneName] = {
      rotation: quatUpperArm,
      position: new THREE.Vector3(),
      confidence: Math.min(confShoulder.confidence, confElbow.confidence),
      isReliable: true,
    };

    // 2. Forearm Direction Vector (Elbow -> Wrist)
    const isForearmReliable = isUpperArmReliable && confWrist.valid;
    const forearmDir = this.v2.subVectors(pWrist, pElbow);
    const forearmLength = forearmDir.length();

    if (!isForearmReliable || forearmLength < 0.02) {
      bones[forearmBoneName] = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: confWrist.confidence,
        isReliable: false,
      };
      return;
    }

    forearmDir.normalize();

    // The forearm rotation relative to the upper arm:
    // In human anatomy, the elbow functions primarily as a hinge joint (flexion 0 to 150 deg).
    // We compute the flexion angle between armDir and forearmDir.
    const dot = THREE.MathUtils.clamp(armDir.dot(forearmDir), -1.0, 1.0);
    const elbowFlexAngle = Math.acos(dot); // 0 = straight arm, PI = fully bent

    // Constrain elbow flexion between 0 and 150 degrees (cannot bend backward)
    const clampedFlex = THREE.MathUtils.clamp(elbowFlexAngle * this.sensitivity, 0.0, 2.6);

    // Create relative hinge rotation along local bend axis
    // For cartoon characters, bend axis is perpendicular to upper arm and forearm plane
    const bendAxis = this.v3.crossVectors(armDir, forearmDir);
    if (bendAxis.lengthSq() < 0.001) {
      // Parallel (straight arm)
      bendAxis.set(0, 0, isLeft ? -1 : 1);
    } else {
      bendAxis.normalize();
    }

    const quatForearm = new THREE.Quaternion().setFromAxisAngle(bendAxis, clampedFlex);

    bones[forearmBoneName] = {
      rotation: quatForearm,
      position: new THREE.Vector3(),
      confidence: Math.min(confElbow.confidence, confWrist.confidence),
      isReliable: true,
    };
  }

  /**
   * Maps Spine / Torso lean and twist
   */
  private mapTorso(
    shoulderL: THREE.Vector3,
    shoulderR: THREE.Vector3,
    hipL: THREE.Vector3,
    hipR: THREE.Vector3,
    confL: number,
    confR: number,
    bones: Partial<Record<HumanoidBoneName, BoneTransform>>
  ): void {
    const isReliable = confL >= this.confidenceThreshold && confR >= this.confidenceThreshold;
    if (!isReliable) {
      bones.spine = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: Math.min(confL, confR),
        isReliable: false,
      };
      return;
    }

    // Shoulder line vector
    const shoulderLine = this.v1.subVectors(shoulderR, shoulderL).normalize();
    
    // Lean: tilt left/right (roll around Z)
    const leanZ = THREE.MathUtils.clamp(shoulderLine.y * 1.5 * this.sensitivity, -0.4, 0.4);

    // Twist: shoulder depth difference (yaw around Y)
    const twistY = THREE.MathUtils.clamp(shoulderLine.z * 1.8 * this.sensitivity, -0.5, 0.5);

    // Forward/Backward lean (pitch around X)
    const shoulderMidY = (shoulderL.y + shoulderR.y) * 0.5;
    const hipMidY = (hipL.y + hipR.y) * 0.5;
    const shoulderMidZ = (shoulderL.z + shoulderR.z) * 0.5;
    const hipMidZ = (hipL.z + hipR.z) * 0.5;
    const leanX = THREE.MathUtils.clamp((shoulderMidZ - hipMidZ) * 1.2 * this.sensitivity, -0.35, 0.35);

    const spineEuler = new THREE.Euler(leanX, twistY, leanZ, 'YXZ');
    const quatSpine = new THREE.Quaternion().setFromEuler(spineEuler);

    bones.spine = {
      rotation: quatSpine,
      position: new THREE.Vector3(),
      confidence: Math.min(confL, confR),
      isReliable: true,
    };
  }

  /**
   * Maps Hips / Pelvis and calculates jumping/crouching offset
   */
  private mapHips(
    hipL: THREE.Vector3,
    hipR: THREE.Vector3,
    confL: number,
    confR: number,
    outHipTranslation: THREE.Vector3,
    bones: Partial<Record<HumanoidBoneName, BoneTransform>>
  ): void {
    const isReliable = confL >= this.confidenceThreshold && confR >= this.confidenceThreshold;
    const hipCenter = new THREE.Vector3().addVectors(hipL, hipR).multiplyScalar(0.5);

    if (!isReliable) {
      bones.hips = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: Math.min(confL, confR),
        isReliable: false,
      };
      return;
    }

    // Auto-calibrate baseline hip height
    if (this.baselineHipY === null) {
      this.baselineHipY = hipCenter.y;
    } else {
      // Gently drift baseline to accommodate posture changes over time
      this.baselineHipY = THREE.MathUtils.lerp(this.baselineHipY, hipCenter.y, 0.002);
    }

    // Compute jump / squat offset relative to baseline
    const deltaY = (hipCenter.y - this.baselineHipY) * 1.6 * this.sensitivity;
    // deltaY > 0 is jumping up, deltaY < 0 is squatting/crouching down
    outHipTranslation.set(
      hipCenter.x * 0.3,
      THREE.MathUtils.clamp(deltaY, -0.4, 0.6),
      hipCenter.z * 0.2
    );

    // Hip rotation (yaw following spine twist subtly)
    const hipLine = this.v2.subVectors(hipR, hipL).normalize();
    const hipYaw = THREE.MathUtils.clamp(hipLine.z * 0.8 * this.sensitivity, -0.3, 0.3);
    const quatHips = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hipYaw);

    bones.hips = {
      rotation: quatHips,
      position: outHipTranslation.clone(),
      confidence: Math.min(confL, confR),
      isReliable: true,
    };
  }

  /**
   * Maps Legs (Thigh and Lower Leg / Knee)
   * Knee joint can only bend backwards in anatomical flexion.
   */
  private mapLeg(
    side: 'left' | 'right',
    lmHip: Landmark | undefined,
    lmKnee: Landmark | undefined,
    lmAnkle: Landmark | undefined,
    bones: Partial<Record<HumanoidBoneName, BoneTransform>>
  ): void {
    const isLeft = side === 'left';
    const thighBoneName: HumanoidBoneName = isLeft ? 'leftThigh' : 'rightThigh';
    const lowerLegBoneName: HumanoidBoneName = isLeft ? 'leftLowerLeg' : 'rightLowerLeg';

    const pHip = new THREE.Vector3();
    const pKnee = new THREE.Vector3();
    const pAnkle = new THREE.Vector3();

    const confHip = this.landmarkToAvatarLocal(lmHip, pHip);
    const confKnee = this.landmarkToAvatarLocal(lmKnee, pKnee);
    const confAnkle = this.landmarkToAvatarLocal(lmAnkle, pAnkle);

    const isThighReliable = confHip.valid && confKnee.valid;
    const thighDir = this.v1.subVectors(pKnee, pHip);

    if (!isThighReliable || thighDir.length() < 0.02) {
      bones[thighBoneName] = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: Math.min(confHip.confidence, confKnee.confidence),
        isReliable: false,
      };
      bones[lowerLegBoneName] = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: confAnkle.confidence,
        isReliable: false,
      };
      return;
    }

    thighDir.normalize();
    const restThigh = isLeft ? this.REST_THIGH_L : this.REST_THIGH_R;
    const quatThigh = new THREE.Quaternion().setFromUnitVectors(restThigh, thighDir);

    bones[thighBoneName] = {
      rotation: quatThigh,
      position: new THREE.Vector3(),
      confidence: Math.min(confHip.confidence, confKnee.confidence),
      isReliable: true,
    };

    // Knee / Lower Leg (Shin)
    const isLowerLegReliable = isThighReliable && confAnkle.valid;
    const shinDir = this.v2.subVectors(pAnkle, pKnee);

    if (!isLowerLegReliable || shinDir.length() < 0.02) {
      bones[lowerLegBoneName] = {
        rotation: new THREE.Quaternion(),
        position: new THREE.Vector3(),
        confidence: confAnkle.confidence,
        isReliable: false,
      };
      return;
    }

    shinDir.normalize();

    // Knee flexion angle: knees can ONLY bend backward!
    const dot = THREE.MathUtils.clamp(thighDir.dot(shinDir), -1.0, 1.0);
    const kneeFlexAngle = Math.acos(dot);

    // Anatomical hinge constraint: knees can only bend backwards (0 to 140 deg)
    const clampedKneeFlex = THREE.MathUtils.clamp(kneeFlexAngle * this.sensitivity, 0.0, 2.4);

    // Bend around local X axis (backward bend)
    const quatShin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), clampedKneeFlex);

    bones[lowerLegBoneName] = {
      rotation: quatShin,
      position: new THREE.Vector3(),
      confidence: Math.min(confKnee.confidence, confAnkle.confidence),
      isReliable: true,
    };
  }

  /**
   * Clamps upper arm rotation to prevent impossible biological poses while allowing overhead waving & jumping
   */
  private clampUpperArmRotation(quat: THREE.Quaternion, isLeft: boolean): void {
    if (
      !Number.isFinite(quat.x) ||
      !Number.isFinite(quat.y) ||
      !Number.isFinite(quat.z) ||
      !Number.isFinite(quat.w)
    ) {
      quat.set(0, 0, 0, 1);
      return;
    }

    const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
    if (!Number.isFinite(euler.x) || !Number.isFinite(euler.y) || !Number.isFinite(euler.z)) {
      quat.set(0, 0, 0, 1);
      return;
    }

    // Clamp pitch (up/down reach): -150 deg (reach up) to +40 deg (back)
    euler.x = THREE.MathUtils.clamp(euler.x, -2.6, 0.7);

    // Clamp yaw & roll (allowing natural high reaches & waving overhead)
    if (isLeft) {
      euler.y = THREE.MathUtils.clamp(euler.y, -1.6, 1.6);
      euler.z = THREE.MathUtils.clamp(euler.z, -2.6, 1.4);
    } else {
      euler.y = THREE.MathUtils.clamp(euler.y, -1.6, 1.6);
      euler.z = THREE.MathUtils.clamp(euler.z, -1.4, 2.6);
    }

    quat.setFromEuler(euler);
  }
}
