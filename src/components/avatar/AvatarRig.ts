import * as THREE from 'three';
import {
  HumanoidBoneName,
  HumanoidBoneMap,
  AvatarFaceRig,
  AvatarRigPose,
  AvatarHandPose,
} from '../../types/avatar';
import { AvatarKinematics, BodyMotion, CharacterProfile } from '../../types';

export interface AvatarHandRig {
  leftHand?: THREE.Object3D | null;
  rightHand?: THREE.Object3D | null;
  leftThumb?: THREE.Object3D | null;
  rightThumb?: THREE.Object3D | null;
  leftIndex?: THREE.Object3D | null;
  rightIndex?: THREE.Object3D | null;
  leftFingers?: THREE.Object3D | null;
  rightFingers?: THREE.Object3D | null;
}

/**
 * Common bone naming patterns across Blender, Mixamo, VRM, Ready Player Me, and standard GLTF rigs
 */
const BONE_NAME_PATTERNS: Record<HumanoidBoneName, RegExp[]> = {
  head: [/head/i, /c_head/i, /mixamorig:?head/i, /def[-_]head/i, /j_bip_c_head/i],
  neck: [/neck/i, /c_neck/i, /mixamorig:?neck/i, /def[-_]neck/i, /j_bip_c_neck/i],
  spine: [/spine/i, /spine1/i, /spine2/i, /chest/i, /mixamorig:?spine/i, /j_bip_c_chest/i],
  hips: [/hips/i, /pelvis/i, /root/i, /mixamorig:?hips/i, /j_bip_c_hips/i, /def[-_]pelvis/i],
  leftShoulder: [/shoulder[._-]l/i, /leftshoulder/i, /l_shoulder/i, /mixamorig:?leftshoulder/i, /j_bip_l_shoulder/i],
  rightShoulder: [/shoulder[._-]r/i, /rightshoulder/i, /r_shoulder/i, /mixamorig:?rightshoulder/i, /j_bip_r_shoulder/i],
  leftUpperArm: [/arm[._-]l/i, /leftarm/i, /upper_arm[._-]l/i, /l_upperarm/i, /mixamorig:?leftarm/i, /j_bip_l_upperarm/i],
  rightUpperArm: [/arm[._-]r/i, /rightarm/i, /upper_arm[._-]r/i, /r_upperarm/i, /mixamorig:?rightarm/i, /j_bip_r_upperarm/i],
  leftForearm: [/forearm[._-]l/i, /leftforearm/i, /lower_arm[._-]l/i, /l_forearm/i, /mixamorig:?leftforearm/i, /j_bip_l_lowerarm/i],
  rightForearm: [/forearm[._-]r/i, /rightforearm/i, /lower_arm[._-]r/i, /r_forearm/i, /mixamorig:?rightforearm/i, /j_bip_r_lowerarm/i],
  leftHand: [/hand[._-]l/i, /lefthand/i, /l_hand/i, /mixamorig:?lefthand/i, /j_bip_l_hand/i],
  rightHand: [/hand[._-]r/i, /righthand/i, /r_hand/i, /mixamorig:?righthand/i, /j_bip_r_hand/i],
  leftThigh: [/up_leg[._-]l/i, /leftupleg/i, /thigh[._-]l/i, /l_thigh/i, /mixamorig:?leftupleg/i, /j_bip_l_upperleg/i],
  rightThigh: [/up_leg[._-]r/i, /rightupleg/i, /thigh[._-]r/i, /r_thigh/i, /mixamorig:?rightupleg/i, /j_bip_r_upperleg/i],
  leftLowerLeg: [/leg[._-]l/i, /leftleg/i, /calf[._-]l/i, /l_shin/i, /mixamorig:?leftleg/i, /j_bip_l_lowerleg/i],
  rightLowerLeg: [/leg[._-]r/i, /rightleg/i, /calf[._-]r/i, /r_shin/i, /mixamorig:?rightleg/i, /j_bip_r_lowerleg/i],
  leftFoot: [/foot[._-]l/i, /leftfoot/i, /l_foot/i, /mixamorig:?leftfoot/i, /j_bip_l_foot/i],
  rightFoot: [/foot[._-]r/i, /rightfoot/i, /r_foot/i, /mixamorig:?rightfoot/i, /j_bip_r_foot/i],
};

/**
 * AvatarRig provides an abstraction over any 3D humanoid skeleton or procedural cartoon mesh.
 * It identifies bones by name, normalizes rest poses, and safely applies smoothed rotations.
 */
export class AvatarRig {
  public root: THREE.Object3D;
  public bones: HumanoidBoneMap = {};
  public face: AvatarFaceRig = {};
  public handRig: AvatarHandRig = {};
  public initialRotations: Map<THREE.Object3D, THREE.Euler> = new Map();
  public isSkinnedMesh = false;

  constructor(root: THREE.Object3D) {
    this.root = root;
    this.inspectAndMapBones();
  }

  /**
   * Traverse the 3D scene hierarchy to find and classify all humanoid bones
   */
  public inspectAndMapBones(): void {
    this.bones = {};
    this.face = {};
    this.handRig = {};
    this.initialRotations.clear();
    this.isSkinnedMesh = false;

    this.root.traverse((node) => {
      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        this.isSkinnedMesh = true;
      }

      const nodeName = node.name.toLowerCase();

      // Check against standard humanoid bone patterns
      for (const [boneKey, patterns] of Object.entries(BONE_NAME_PATTERNS) as [HumanoidBoneName, RegExp[]][]) {
        if (!this.bones[boneKey]) {
          for (const pattern of patterns) {
            if (pattern.test(nodeName)) {
              this.bones[boneKey] = node;
              this.initialRotations.set(node, node.rotation.clone());
              break;
            }
          }
        }
      }

      // Check for facial features in procedural or textured rigs
      if (/mouth/i.test(nodeName)) this.face.mouth = node;
      if (/eye[._-]l|lefteye/i.test(nodeName)) this.face.leftEye = node;
      if (/eye[._-]r|righteye/i.test(nodeName)) this.face.rightEye = node;
      if (/pupil[._-]l/i.test(nodeName)) this.face.leftPupil = node;
      if (/pupil[._-]r/i.test(nodeName)) this.face.rightPupil = node;
      if (/eyebrow[._-]l|brow[._-]l|lefteyebrow/i.test(nodeName)) this.face.leftEyebrow = node;
      if (/eyebrow[._-]r|brow[._-]r|righteyebrow/i.test(nodeName)) this.face.rightEyebrow = node;
      if (/cheek[._-]l|leftcheek/i.test(nodeName)) this.face.leftCheek = node;
      if (/cheek[._-]r|rightcheek/i.test(nodeName)) this.face.rightCheek = node;
      if (/ear[._-]l|leftear/i.test(nodeName)) this.face.leftEar = node;
      if (/ear[._-]r|rightear/i.test(nodeName)) this.face.rightEar = node;
      if (/tail/i.test(nodeName)) this.face.tail = node;
      if (/antenna/i.test(nodeName)) this.face.antennae = node;

      // Check for hand & finger elements (both procedural and standard skeleton rigs)
      if (/hand[._-]l|l_hand|lefthand/i.test(nodeName)) this.handRig.leftHand = node;
      if (/hand[._-]r|r_hand|righthand/i.test(nodeName)) this.handRig.rightHand = node;
      if (/thumb[._-]l|l_thumb|leftthumb/i.test(nodeName)) {
        this.handRig.leftThumb = node;
        this.initialRotations.set(node, node.rotation.clone());
      }
      if (/thumb[._-]r|r_thumb|rightthumb/i.test(nodeName)) {
        this.handRig.rightThumb = node;
        this.initialRotations.set(node, node.rotation.clone());
      }
      if (/index[._-]l|l_index|leftindex/i.test(nodeName)) {
        this.handRig.leftIndex = node;
        this.initialRotations.set(node, node.rotation.clone());
      }
      if (/index[._-]r|r_index|rightindex/i.test(nodeName)) {
        this.handRig.rightIndex = node;
        this.initialRotations.set(node, node.rotation.clone());
      }
      if (/fingers?[._-]l|l_fingers?|leftfingers?/i.test(nodeName)) {
        this.handRig.leftFingers = node;
        this.initialRotations.set(node, node.rotation.clone());
      }
      if (/fingers?[._-]r|r_fingers?|rightfingers?/i.test(nodeName)) {
        this.handRig.rightFingers = node;
        this.initialRotations.set(node, node.rotation.clone());
      }
    });
  }

  /**
   * Applies target kinematic rotations onto the rigged bones with safety clamping
   */
  public applyPose(pose: AvatarRigPose): void {
    // 1. Head & Neck
    if (this.bones.head) {
      this.bones.head.rotation.x = THREE.MathUtils.clamp(pose.head.pitch, -0.6, 0.6);
      this.bones.head.rotation.y = THREE.MathUtils.clamp(pose.head.yaw, -0.8, 0.8);
      this.bones.head.rotation.z = THREE.MathUtils.clamp(pose.head.roll, -0.6, 0.6);
    }
    if (this.bones.neck) {
      this.bones.neck.rotation.x = THREE.MathUtils.clamp(pose.neck.pitch * 0.5, -0.3, 0.3);
      this.bones.neck.rotation.y = THREE.MathUtils.clamp(pose.neck.yaw * 0.5, -0.4, 0.4);
    }

    // 2. Spine / Torso
    if (this.bones.spine) {
      this.bones.spine.rotation.x = THREE.MathUtils.clamp(pose.spine.leanX, -0.4, 0.4);
      this.bones.spine.rotation.y = THREE.MathUtils.clamp(pose.spine.twistY, -0.5, 0.5);
      this.bones.spine.rotation.z = THREE.MathUtils.clamp(pose.spine.rollZ, -0.4, 0.4);
    }

    // 3. Hips / Root position (squat, jump)
    if (this.bones.hips) {
      this.bones.hips.position.y = pose.hips.posY;
      this.bones.hips.rotation.y = pose.hips.rotY;
    } else {
      this.root.position.y = pose.hips.posY;
    }

    // 4. Upper Arms (Left & Right)
    if (this.bones.leftUpperArm) {
      this.bones.leftUpperArm.rotation.x = pose.leftUpperArm.x;
      this.bones.leftUpperArm.rotation.y = pose.leftUpperArm.y;
      this.bones.leftUpperArm.rotation.z = pose.leftUpperArm.z;
    }
    if (this.bones.rightUpperArm) {
      this.bones.rightUpperArm.rotation.x = pose.rightUpperArm.x;
      this.bones.rightUpperArm.rotation.y = pose.rightUpperArm.y;
      this.bones.rightUpperArm.rotation.z = pose.rightUpperArm.z;
    }

    // 5. Forearms (Elbow flex)
    if (this.bones.leftForearm) {
      this.bones.leftForearm.rotation.x = pose.leftForearm.x;
      this.bones.leftForearm.rotation.y = pose.leftForearm.y;
      this.bones.leftForearm.rotation.z = pose.leftForearm.z;
    }
    if (this.bones.rightForearm) {
      this.bones.rightForearm.rotation.x = pose.rightForearm.x;
      this.bones.rightForearm.rotation.y = pose.rightForearm.y;
      this.bones.rightForearm.rotation.z = pose.rightForearm.z;
    }

    // 6. Thighs & Lower Legs (Squatting/Stepping)
    if (this.bones.leftThigh) {
      this.bones.leftThigh.rotation.x = pose.leftThigh.x;
      this.bones.leftThigh.rotation.z = pose.leftThigh.z;
    }
    if (this.bones.rightThigh) {
      this.bones.rightThigh.rotation.x = pose.rightThigh.x;
      this.bones.rightThigh.rotation.z = pose.rightThigh.z;
    }
    if (this.bones.leftLowerLeg) {
      this.bones.leftLowerLeg.rotation.x = pose.leftLowerLeg.x;
    }
    if (this.bones.rightLowerLeg) {
      this.bones.rightLowerLeg.rotation.x = pose.rightLowerLeg.x;
    }

    // 7. Facial Lip-sync and Blinking
    if (this.face.mouth) {
      const scaleY = THREE.MathUtils.clamp(0.2 + pose.mouthOpen * 1.8, 0.2, 2.2);
      this.face.mouth.scale.y = scaleY;
    }

    if (this.face.leftEye && this.face.rightEye) {
      const eyeScaleY = 1.0 - pose.eyeBlink * 0.85;
      this.face.leftEye.scale.y = Math.max(0.1, eyeScaleY);
      this.face.rightEye.scale.y = Math.max(0.1, eyeScaleY);
    }
  }

  /**
   * Applies real-time 3D hand tracking orientations and gesture articulations onto the avatar
   */
  public applyHandPose(handPose: AvatarHandPose): void {
    // 1. LEFT HAND
    const lh = handPose.leftHand;
    const leftHandTarget = this.bones.leftHand || this.handRig.leftHand;
    if (leftHandTarget && lh.isDetected) {
      leftHandTarget.rotation.x = lh.wristEuler.x;
      leftHandTarget.rotation.y = lh.wristEuler.y;
      leftHandTarget.rotation.z = lh.wristEuler.z;
    }

    // Left Thumb
    if (this.handRig.leftThumb) {
      const initEuler = this.initialRotations.get(this.handRig.leftThumb);
      const baseZ = initEuler?.z ?? 0.5;
      if (lh.gesture === 'thumbs_up') {
        this.handRig.leftThumb.rotation.z = 0.9;
        this.handRig.leftThumb.rotation.x = -0.3;
        this.handRig.leftThumb.rotation.y = 0.2;
      } else if (lh.gesture === 'fist') {
        this.handRig.leftThumb.rotation.z = 0.1;
        this.handRig.leftThumb.rotation.x = 0.8;
      } else {
        const curl = lh.fingerCurls.thumb;
        this.handRig.leftThumb.rotation.z = THREE.MathUtils.lerp(baseZ, 0.1, curl);
        this.handRig.leftThumb.rotation.x = THREE.MathUtils.lerp(0, 0.7, curl);
      }
    }

    // Left Index Finger
    if (this.handRig.leftIndex) {
      if (lh.gesture === 'pointing') {
        this.handRig.leftIndex.rotation.x = -0.2;
        this.handRig.leftIndex.rotation.z = 0;
      } else if (lh.gesture === 'victory') {
        this.handRig.leftIndex.rotation.x = -0.1;
        this.handRig.leftIndex.rotation.z = 0.25;
      } else if (lh.gesture === 'fist' || lh.gesture === 'thumbs_up') {
        this.handRig.leftIndex.rotation.x = 1.4;
      } else {
        const curl = lh.fingerCurls.index;
        this.handRig.leftIndex.rotation.x = THREE.MathUtils.lerp(-0.05, 1.4, curl);
      }
    }

    // Left Remaining Fingers
    if (this.handRig.leftFingers) {
      if (lh.gesture === 'victory') {
        this.handRig.leftFingers.rotation.x = -0.1;
        this.handRig.leftFingers.rotation.z = -0.25;
      } else if (lh.gesture === 'open_palm') {
        this.handRig.leftFingers.rotation.x = -0.05;
      } else if (lh.gesture === 'fist' || lh.gesture === 'thumbs_up' || lh.gesture === 'pointing') {
        this.handRig.leftFingers.rotation.x = 1.4;
      } else {
        const curl = (lh.fingerCurls.middle + lh.fingerCurls.ring + lh.fingerCurls.pinky) / 3;
        this.handRig.leftFingers.rotation.x = THREE.MathUtils.lerp(-0.05, 1.4, curl);
      }
    }

    // 2. RIGHT HAND
    const rh = handPose.rightHand;
    const rightHandTarget = this.bones.rightHand || this.handRig.rightHand;
    if (rightHandTarget && rh.isDetected) {
      rightHandTarget.rotation.x = rh.wristEuler.x;
      rightHandTarget.rotation.y = rh.wristEuler.y;
      rightHandTarget.rotation.z = rh.wristEuler.z;
    }

    // Right Thumb
    if (this.handRig.rightThumb) {
      const initEuler = this.initialRotations.get(this.handRig.rightThumb);
      const baseZ = initEuler?.z ?? -0.5;
      if (rh.gesture === 'thumbs_up') {
        this.handRig.rightThumb.rotation.z = -0.9;
        this.handRig.rightThumb.rotation.x = -0.3;
        this.handRig.rightThumb.rotation.y = -0.2;
      } else if (rh.gesture === 'fist') {
        this.handRig.rightThumb.rotation.z = -0.1;
        this.handRig.rightThumb.rotation.x = 0.8;
      } else {
        const curl = rh.fingerCurls.thumb;
        this.handRig.rightThumb.rotation.z = THREE.MathUtils.lerp(baseZ, -0.1, curl);
        this.handRig.rightThumb.rotation.x = THREE.MathUtils.lerp(0, 0.7, curl);
      }
    }

    // Right Index Finger
    if (this.handRig.rightIndex) {
      if (rh.gesture === 'pointing') {
        this.handRig.rightIndex.rotation.x = -0.2;
        this.handRig.rightIndex.rotation.z = 0;
      } else if (rh.gesture === 'victory') {
        this.handRig.rightIndex.rotation.x = -0.1;
        this.handRig.rightIndex.rotation.z = -0.25;
      } else if (rh.gesture === 'fist' || rh.gesture === 'thumbs_up') {
        this.handRig.rightIndex.rotation.x = 1.4;
      } else {
        const curl = rh.fingerCurls.index;
        this.handRig.rightIndex.rotation.x = THREE.MathUtils.lerp(-0.05, 1.4, curl);
      }
    }

    // Right Remaining Fingers
    if (this.handRig.rightFingers) {
      if (rh.gesture === 'victory') {
        this.handRig.rightFingers.rotation.x = -0.1;
        this.handRig.rightFingers.rotation.z = 0.25;
      } else if (rh.gesture === 'open_palm') {
        this.handRig.rightFingers.rotation.x = -0.05;
      } else if (rh.gesture === 'fist' || rh.gesture === 'thumbs_up' || rh.gesture === 'pointing') {
        this.handRig.rightFingers.rotation.x = 1.4;
      } else {
        const curl = (rh.fingerCurls.middle + rh.fingerCurls.ring + rh.fingerCurls.pinky) / 3;
        this.handRig.rightFingers.rotation.x = THREE.MathUtils.lerp(-0.05, 1.4, curl);
      }
    }
  }

  /**
   * Resets all recognized bones back to default rest pose
   */
  public resetToRestPose(): void {
    for (const [node, initEuler] of this.initialRotations.entries()) {
      node.rotation.copy(initEuler);
    }
    if (this.bones.hips) this.bones.hips.position.set(0, 0, 0);
    this.root.position.set(0, 0, 0);
  }

  /**
   * Returns list of identified humanoid bones for diagnostics/debugging
   */
  public getIdentifiedBonesList(): string[] {
    return Object.keys(this.bones).filter((k) => !!this.bones[k as HumanoidBoneName]);
  }
}
