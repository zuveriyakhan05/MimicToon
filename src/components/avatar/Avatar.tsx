import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AvatarAnimation } from './AvatarAnimation';
import { AvatarMotionEngine } from './AvatarMotionEngine';
import { AvatarRig } from './AvatarRig';
import { AvatarFaceController } from './AvatarFaceController';
import { HandMotionMapper } from './HandMotionMapper';
import { AvatarKinematics, BodyMotion } from '../../types';
import {
  AvatarRigPose,
  TestMotionPreset,
  FaceSignals,
  AvatarFacePose,
  HandSignals,
  AvatarHandPose,
} from '../../types/avatar';
import { CompanionState, CompanionReactionType } from '../../types/companion';

interface AvatarProps {
  modelObject: THREE.Object3D | null;
  characterStyle?: string;
  kinematics?: AvatarKinematics | null;
  motion?: BodyMotion | null;
  testPreset?: TestMotionPreset;
  mouthOpenLevel?: number;
  smoothingFactor?: number;      // 0 (snappy) to 0.8 (ultra-smooth), default ~0.25
  isMirrored?: boolean;
  movementSensitivity?: number; // 0.5 to 2.0 (default 1.0)
  confidenceThreshold?: number; // 0.1 to 0.9 (default 0.45)
  faceSignals?: FaceSignals | null;
  facePose?: AvatarFacePose | null;
  handSignals?: HandSignals | null;
  handPose?: AvatarHandPose | null;
  companionState?: CompanionState;
  companionReaction?: CompanionReactionType;
  companionBlend?: number;
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

// Pre-allocated scratch objects to eliminate per-frame garbage collection
const _SCRATCH_QUAT = new THREE.Quaternion();
const _SCRATCH_WAVE_HAND_POSE: AvatarHandPose = {
  timestamp: 0,
  leftHand: {
    wristRotation: _SCRATCH_QUAT,
    wristEuler: { x: 0, y: 0, z: 0 },
    fingerCurls: { thumb: 0.2, index: 0.2, middle: 0.2, ring: 0.2, pinky: 0.2 },
    gesture: 'none',
    gestureWeight: 0,
    isRaised: false,
    isDetected: false,
  },
  rightHand: {
    wristRotation: _SCRATCH_QUAT,
    wristEuler: { x: 0, y: 0, z: 0 },
    fingerCurls: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
    gesture: 'open_palm',
    gestureWeight: 1,
    isRaised: true,
    isDetected: true,
  },
};

export const Avatar: React.FC<AvatarProps> = React.memo(({
  modelObject,
  characterStyle = 'bunny',
  kinematics = null,
  motion = null,
  testPreset = 'none',
  mouthOpenLevel = 0,
  smoothingFactor = 0.25,
  isMirrored = true,
  movementSensitivity = 1.0,
  confidenceThreshold = 0.45,
  faceSignals = null,
  facePose = null,
  handSignals = null,
  handPose = null,
  companionState = CompanionState.IDLE,
  companionReaction = 'none',
  companionBlend = 1.0,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const rigRef = useRef<AvatarRig | null>(null);

  // Dedicated Motion Engine with MotionMapper, MotionSmoother, and BoneController
  const motionEngine = useMemo(() => {
    return new AvatarMotionEngine({
      isMirrored,
      smoothingFactor,
      sensitivity: movementSensitivity,
      confidenceThreshold,
    });
  }, []);

  // Dedicated Face Controller for procedural expressions and morph targets
  const faceController = useMemo(() => new AvatarFaceController(), []);

  // Dedicated Hand Motion Mapper for wrist quaternions and finger articulators
  const handMotionMapper = useMemo(() => {
    return new HandMotionMapper({
      isMirrored,
      smoothingFactor,
    });
  }, []);

  // Animation Engine for idle breathing and mock test presets
  const animationEngine = useMemo(() => new AvatarAnimation(), []);

  // Sync settings into motionEngine & handMotionMapper
  useEffect(() => {
    motionEngine.setMirrored(isMirrored);
    motionEngine.setSmoothing(smoothingFactor);
    motionEngine.setSensitivity(movementSensitivity);
    motionEngine.setConfidenceThreshold(confidenceThreshold);
    handMotionMapper.setMirrored(isMirrored);
    handMotionMapper.setSmoothing(smoothingFactor);
  }, [motionEngine, handMotionMapper, isMirrored, smoothingFactor, movementSensitivity, confidenceThreshold]);

  // Smoothed Euler pose state for test presets and idle blending
  const currentPoseRef = useRef<AvatarRigPose>({
    head: { pitch: 0, yaw: 0, roll: 0 },
    neck: { pitch: 0, yaw: 0, roll: 0 },
    spine: { leanX: 0, twistY: 0, rollZ: 0 },
    hips: { posX: 0, posY: 0, posZ: 0, rotY: 0 },
    leftUpperArm: { x: 0, y: 0, z: -0.3 },
    rightUpperArm: { x: 0, y: 0, z: 0.3 },
    leftForearm: { x: 0, y: 0, z: -0.2 },
    rightForearm: { x: 0, y: 0, z: 0.2 },
    leftHand: { x: 0, y: 0, z: 0 },
    rightHand: { x: 0, y: 0, z: 0 },
    leftThigh: { x: 0, y: 0, z: 0 },
    rightThigh: { x: 0, y: 0, z: 0 },
    leftLowerLeg: { x: 0, y: 0, z: 0 },
    rightLowerLeg: { x: 0, y: 0, z: 0 },
    mouthOpen: 0,
    eyeBlink: 0,
  });

  // Attach 3D Model to AvatarMotionEngine, AvatarFaceController, and AvatarRig
  useEffect(() => {
    if (!modelObject) {
      motionEngine.attachModel(null);
      faceController.attachModel(null);
      rigRef.current = null;
      return;
    }

    motionEngine.attachModel(modelObject);
    faceController.attachModel(modelObject);
    const rig = new AvatarRig(modelObject);
    rigRef.current = rig;

    return () => {
      motionEngine.reset();
      faceController.resetToRest();
      rig.resetToRestPose();
    };
  }, [modelObject, motionEngine, faceController]);

  // Main per-frame animation and motion tracking loop
  useFrame((state, delta) => {
    if (!modelObject) return;

    const time = state.clock.getElapsedTime();

    // 1. Process Face Controller (Mouth, Eyes, Eyebrows, Pupils, Head Rotation)
    if (companionState === CompanionState.SURPRISED) {
      faceController.applyFacePose({
        timestamp: performance.now(),
        isDetected: true,
        confidence: 0.95,
        dominantExpression: 'surprised',
        expressionWeights: { neutral: 0, happy: 0, surprised: 1, sad: 0, angry: 0, blink: 0 },
        mouthOpen: Math.max(mouthOpenLevel, 0.85),
        mouthSmile: 0,
        mouthFrown: 0,
        eyeBlinkLeft: 0,
        eyeBlinkRight: 0,
        eyebrowHeight: 0.85,
        eyebrowTilt: 0,
        headRotation: { pitch: -0.2, yaw: 0, roll: 0 },
        faceDirection: { x: 0, y: 0 },
      }, delta);
    } else if (companionState === CompanionState.EXCITED || companionState === CompanionState.CELEBRATING) {
      faceController.applyFacePose({
        timestamp: performance.now(),
        isDetected: true,
        confidence: 0.95,
        dominantExpression: 'happy',
        expressionWeights: { neutral: 0, happy: 1, surprised: 0, sad: 0, angry: 0, blink: 0 },
        mouthOpen: Math.max(mouthOpenLevel, 0.6),
        mouthSmile: 0.95,
        mouthFrown: 0,
        eyeBlinkLeft: 0,
        eyeBlinkRight: 0,
        eyebrowHeight: 0.45,
        eyebrowTilt: 0.15,
        headRotation: { pitch: -0.1, yaw: Math.sin(time * 6) * 0.1, roll: 0 },
        faceDirection: { x: 0, y: 0 },
      }, delta);
    } else if (facePose && facePose.isDetected) {
      faceController.applyFacePose(facePose, delta);
    } else if (faceSignals) {
      faceController.updateFromSignals(faceSignals, delta);
    } else if (mouthOpenLevel > 0 || companionState === CompanionState.SPEAKING) {
      const speechMouth = Math.max(
        mouthOpenLevel,
        companionState === CompanionState.SPEAKING ? 0.35 + Math.abs(Math.sin(time * 11)) * 0.35 : 0
      );
      faceController.applyFacePose({
        timestamp: performance.now(),
        isDetected: true,
        confidence: 0.8,
        dominantExpression: 'neutral',
        expressionWeights: { neutral: 1, happy: 0.2, surprised: 0, sad: 0, angry: 0, blink: 0 },
        mouthOpen: speechMouth,
        mouthSmile: 0.25,
        mouthFrown: 0,
        eyeBlinkLeft: 0,
        eyeBlinkRight: 0,
        eyebrowHeight: speechMouth > 0.4 ? 0.25 : 0,
        eyebrowTilt: 0,
        headRotation: { pitch: 0, yaw: 0, roll: 0 },
        faceDirection: { x: 0, y: 0 },
      }, delta);
    }

    // 2. MODE A: Live MediaPipe Body Tracking detected in FOLLOWING or default IDLE state
    const isFollowingLiveMotion =
      testPreset === 'none' &&
      Boolean(motion && motion.isDetected) &&
      (companionState === CompanionState.FOLLOWING || companionState === CompanionState.IDLE);

    if (isFollowingLiveMotion && motion) {
      motionEngine.updateWithMotion(motion, mouthOpenLevel, delta);

      // Procedural ear/antenna wiggles when waving
      const rig = rigRef.current;
      if (rig) {
        if (rig.face.leftEar && rig.face.rightEar) {
          if (kinematics?.isWavingLeft || kinematics?.isWavingRight) {
            rig.face.leftEar.rotation.z = Math.sin(time * 16) * 0.28;
            rig.face.rightEar.rotation.z = -Math.sin(time * 16) * 0.28;
          }
        }

        // Apply hand pose and finger gestures to rig
        const mappedHandPose =
          handPose || (handSignals ? handMotionMapper.mapHandSignals(handSignals, delta) : null);
        if (mappedHandPose) {
          rig.applyHandPose(mappedHandPose);
        }
      }
      return;
    }

    // MODE B: Companion Reactive States, Idle animation, or Test Presets
    const rig = rigRef.current;
    if (!rig) return;

    let targetPose: AvatarRigPose;
    if (testPreset && testPreset !== 'none') {
      targetPose = animationEngine.computeTestMotionPose(testPreset, time);
    } else {
      // Computes companion state pose (LISTENING, SPEAKING, EXCITED, SURPRISED, CELEBRATING, IDLE, FOLLOWING)
      targetPose = animationEngine.computeCompanionPose(
        companionState,
        companionReaction,
        kinematics,
        motion,
        time,
        mouthOpenLevel,
        companionBlend,
        characterStyle
      );
    }

    // Hand tracking override for arm elevation if user raises hand into webcam frame
    const mappedHandPose =
      handPose || (handSignals ? handMotionMapper.mapHandSignals(handSignals, delta) : null);
    if (mappedHandPose) {
      if (mappedHandPose.rightHand.isRaised) {
        targetPose.rightUpperArm = { x: -0.2, y: 0, z: 1.7 };
        targetPose.rightForearm = { x: 0, y: 0, z: 0.3 };
      }
      if (mappedHandPose.leftHand.isRaised) {
        targetPose.leftUpperArm = { x: -0.2, y: 0, z: -1.7 };
        targetPose.leftForearm = { x: 0, y: 0, z: -0.3 };
      }
    }

    const lambda = THREE.MathUtils.lerp(35, 7, THREE.MathUtils.clamp(smoothingFactor, 0, 0.9));
    const cur = currentPoseRef.current;

    // Damp Head & Neck
    cur.head.pitch = dampAngle(cur.head.pitch, targetPose.head.pitch, lambda, delta);
    cur.head.yaw = dampAngle(cur.head.yaw, targetPose.head.yaw, lambda, delta);
    cur.head.roll = dampAngle(cur.head.roll, targetPose.head.roll, lambda, delta);

    cur.neck.pitch = dampAngle(cur.neck.pitch, targetPose.neck.pitch, lambda, delta);
    cur.neck.yaw = dampAngle(cur.neck.yaw, targetPose.neck.yaw, lambda, delta);

    // Damp Spine
    cur.spine.leanX = dampAngle(cur.spine.leanX, targetPose.spine.leanX, lambda, delta);
    cur.spine.twistY = dampAngle(cur.spine.twistY, targetPose.spine.twistY, lambda, delta);
    cur.spine.rollZ = dampAngle(cur.spine.rollZ, targetPose.spine.rollZ, lambda, delta);

    // Damp Hips
    cur.hips.posY = dampAngle(cur.hips.posY, targetPose.hips.posY, lambda, delta);
    cur.hips.rotY = dampAngle(cur.hips.rotY, targetPose.hips.rotY, lambda, delta);

    // Damp Arms & Forearms
    cur.leftUpperArm.x = dampAngle(cur.leftUpperArm.x, targetPose.leftUpperArm.x, lambda, delta);
    cur.leftUpperArm.y = dampAngle(cur.leftUpperArm.y, targetPose.leftUpperArm.y, lambda, delta);
    cur.leftUpperArm.z = dampAngle(cur.leftUpperArm.z, targetPose.leftUpperArm.z, lambda, delta);

    cur.leftForearm.x = dampAngle(cur.leftForearm.x, targetPose.leftForearm.x, lambda, delta);
    cur.leftForearm.y = dampAngle(cur.leftForearm.y, targetPose.leftForearm.y, lambda, delta);
    cur.leftForearm.z = dampAngle(cur.leftForearm.z, targetPose.leftForearm.z, lambda, delta);

    cur.rightUpperArm.x = dampAngle(cur.rightUpperArm.x, targetPose.rightUpperArm.x, lambda, delta);
    cur.rightUpperArm.y = dampAngle(cur.rightUpperArm.y, targetPose.rightUpperArm.y, lambda, delta);
    cur.rightUpperArm.z = dampAngle(cur.rightUpperArm.z, targetPose.rightUpperArm.z, lambda, delta);

    cur.rightForearm.x = dampAngle(cur.rightForearm.x, targetPose.rightForearm.x, lambda, delta);
    cur.rightForearm.y = dampAngle(cur.rightForearm.y, targetPose.rightForearm.y, lambda, delta);
    cur.rightForearm.z = dampAngle(cur.rightForearm.z, targetPose.rightForearm.z, lambda, delta);

    // Damp Legs
    cur.leftThigh.x = dampAngle(cur.leftThigh.x, targetPose.leftThigh.x, lambda, delta);
    cur.rightThigh.x = dampAngle(cur.rightThigh.x, targetPose.rightThigh.x, lambda, delta);
    cur.leftLowerLeg.x = dampAngle(cur.leftLowerLeg.x, targetPose.leftLowerLeg.x, lambda, delta);
    cur.rightLowerLeg.x = dampAngle(cur.rightLowerLeg.x, targetPose.rightLowerLeg.x, lambda, delta);

    // Face & Eyes
    cur.mouthOpen = dampAngle(cur.mouthOpen, targetPose.mouthOpen, 40, delta);
    cur.eyeBlink = targetPose.eyeBlink;

    rig.applyPose(cur);

    // Apply hand tracking or preset hand animations
    if (mappedHandPose) {
      rig.applyHandPose(mappedHandPose);
    } else if (testPreset === 'wave') {
      _SCRATCH_WAVE_HAND_POSE.timestamp = time * 1000;
      _SCRATCH_WAVE_HAND_POSE.rightHand.wristEuler.y = Math.sin(time * 8) * 0.4;
      _SCRATCH_WAVE_HAND_POSE.rightHand.wristEuler.z = Math.cos(time * 8) * 0.3;
      rig.applyHandPose(_SCRATCH_WAVE_HAND_POSE);
    }

    if (rig.face.leftEar && rig.face.rightEar) {
      const isWaving = kinematics?.isWavingLeft || kinematics?.isWavingRight || testPreset === 'wave';
      if (isWaving) {
        rig.face.leftEar.rotation.z = Math.sin(time * 16) * 0.28;
        rig.face.rightEar.rotation.z = -Math.sin(time * 16) * 0.28;
      }
    }
  });

  if (!modelObject) return null;

  return (
    <group ref={groupRef}>
      <primitive object={modelObject} />
    </group>
  );
});
