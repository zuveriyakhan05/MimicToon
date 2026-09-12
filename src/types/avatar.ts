import * as THREE from 'three';
import { CharacterProfile, AvatarKinematics, BodyMotion } from './index';

/**
 * Standard humanoid bone identifiers covering GLTF, VRM, Mixamo, and procedural rigs
 */
export type HumanoidBoneName =
  | 'head'
  | 'neck'
  | 'spine'
  | 'hips'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftUpperArm'
  | 'rightUpperArm'
  | 'leftForearm'
  | 'rightForearm'
  | 'leftHand'
  | 'rightHand'
  | 'leftThigh'
  | 'rightThigh'
  | 'leftLowerLeg'
  | 'rightLowerLeg'
  | 'leftFoot'
  | 'rightFoot';

/**
 * Map of recognized humanoid bones to Three.js Object3D / Bone instances
 */
export type HumanoidBoneMap = Partial<Record<HumanoidBoneName, THREE.Object3D | THREE.Bone>>;

/**
 * Procedural face nodes for cartoon characters
 */
export interface AvatarFaceRig {
  mouth?: THREE.Object3D | THREE.Mesh | null;
  leftEye?: THREE.Object3D | null;
  rightEye?: THREE.Object3D | null;
  leftPupil?: THREE.Object3D | null;
  rightPupil?: THREE.Object3D | null;
  leftEyebrow?: THREE.Object3D | null;
  rightEyebrow?: THREE.Object3D | null;
  leftCheek?: THREE.Object3D | null;
  rightCheek?: THREE.Object3D | null;
  leftEar?: THREE.Object3D | null;
  rightEar?: THREE.Object3D | null;
  tail?: THREE.Object3D | null;
  antennae?: THREE.Object3D | null;
}

/**
 * Target joint rotations (Euler angles in radians) for the rig solver
 */
export interface AvatarRigPose {
  head: { pitch: number; yaw: number; roll: number };
  neck: { pitch: number; yaw: number; roll: number };
  spine: { leanX: number; twistY: number; rollZ: number };
  hips: { posX: number; posY: number; posZ: number; rotY: number };
  leftUpperArm: { x: number; y: number; z: number };
  rightUpperArm: { x: number; y: number; z: number };
  leftForearm: { x: number; y: number; z: number };
  rightForearm: { x: number; y: number; z: number };
  leftHand: { x: number; y: number; z: number };
  rightHand: { x: number; y: number; z: number };
  leftThigh: { x: number; y: number; z: number };
  rightThigh: { x: number; y: number; z: number };
  leftLowerLeg: { x: number; y: number; z: number };
  rightLowerLeg: { x: number; y: number; z: number };
  mouthOpen: number; // 0 to 1
  eyeBlink: number;  // 0 to 1 (0 = open, 1 = closed)
}

/**
 * Supported 3D stage environment themes
 */
export type StageTheme =
  | 'playground'
  | 'forest'
  | 'cosmic'
  | 'toyroom'
  | 'studio'
  | 'transparent';

/**
 * Mock / Test motion presets for testing avatar movements without webcam
 */
export type TestMotionPreset =
  | 'none'
  | 'idle'
  | 'wave'
  | 'hands_up'
  | 'squat'
  | 't_pose'
  | 'dance'
  | 'head_tilt';

/**
 * Model loading status
 */
export type ModelLoadStatus = 'loading' | 'ready' | 'error' | 'procedural';

/**
 * Individual bone transform data with quaternion orientation, position, and tracking confidence
 */
export interface BoneTransform {
  rotation: THREE.Quaternion;
  position: THREE.Vector3;
  confidence: number;
  isReliable: boolean;
}

/**
 * Complete quaternion-based mapped avatar pose produced by MotionMapper
 */
export interface MappedAvatarPose {
  timestamp: number;
  confidence: number;
  isDetected: boolean;
  bones: Partial<Record<HumanoidBoneName, BoneTransform>>;
  hipTranslation: THREE.Vector3;
  mouthOpen: number;
  eyeBlink: number;
}

/**
 * Options for MotionMapper coordinate conversion and landmark calculation
 */
export interface MotionMapperOptions {
  isMirrored?: boolean;
  confidenceThreshold?: number; // 0.0 - 1.0 (default 0.45)
  sensitivity?: number;         // 0.5 - 2.0 (default 1.0)
  damping?: number;
}

/**
 * Options for MotionSmoother temporal filtering and jitter reduction
 */
export interface MotionSmootherOptions {
  smoothingAmount?: number;     // 0.0 (snappy) - 1.0 (heavy smooth, default 0.25)
  sensitivity?: number;         // 0.5 - 2.0 (default 1.0)
  deadzone?: number;            // minimum angular difference to register (noise cutoff, default 0.005)
  maxAngularVelocity?: number;  // radians per second clamp (prevents crazy teleportation)
}

/**
 * Standard facial emotion categories supported by MimicToon
 */
export type AvatarFaceExpressionType =
  | 'neutral'
  | 'happy'
  | 'surprised'
  | 'sad'
  | 'angry'
  | 'blink';

/**
 * Raw normalized facial movement signals extracted from MediaPipe Face Landmarker
 */
export interface FaceSignals {
  timestamp: number;
  isDetected: boolean;
  confidence: number;
  mouthOpen: number;       // 0.0 to 1.0
  mouthSmile: number;      // 0.0 to 1.0
  isSmiling?: boolean;     // convenience indicator (mouthSmile > 0.4)
  mouthFrown: number;      // 0.0 to 1.0
  mouthPucker: number;     // 0.0 to 1.0
  browRaise: number;       // 0.0 to 1.0
  browFurrow: number;      // 0.0 to 1.0
  blinkLeft: number;       // 0.0 to 1.0
  blinkRight: number;      // 0.0 to 1.0
  headRotation: {
    pitch: number;         // radians (-0.6 to 0.6)
    yaw: number;           // radians (-0.8 to 0.8)
    roll: number;          // radians (-0.6 to 0.6)
  };
  faceDirection: {
    x: number;             // -1.0 (child looking left) to +1.0 (child looking right)
    y: number;             // -1.0 (down) to +1.0 (up)
    z: number;             // depth/distance estimate
  };
  blendshapes?: Record<string, number>;
  rawLandmarks?: Array<{ x: number; y: number; z: number }>;
}

/**
 * Mapped avatar facial pose ready for bone, morph target, and procedural face application
 */
export interface AvatarFacePose {
  timestamp: number;
  isDetected: boolean;
  confidence: number;
  dominantExpression: AvatarFaceExpressionType;
  expressionWeights: Record<AvatarFaceExpressionType, number>;
  mouthOpen: number;       // 0.0 to 1.0 (dynamically scaled for speech and lip-sync)
  mouthSmile: number;      // 0.0 to 1.0
  mouthFrown: number;      // 0.0 to 1.0
  eyeBlinkLeft: number;    // 0.0 to 1.0
  eyeBlinkRight: number;   // 0.0 to 1.0
  eyebrowHeight: number;   // -1.0 (furrowed angry) to +1.0 (raised surprised)
  eyebrowTilt: number;     // -1.0 (sad angle) to +1.0 (angry slant)
  headRotation: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  faceDirection: {
    x: number;
    y: number;
  };
}

/**
 * Hand identifiers
 */
export type HandType = 'left' | 'right';

/**
 * Recognizable child-friendly hand gestures
 */
export type HandGestureType =
  | 'open_palm'
  | 'fist'
  | 'thumbs_up'
  | 'pointing'
  | 'victory'
  | 'none';

/**
 * Anatomical fingers of the hand
 */
export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

/**
 * Dynamic state and curl of an individual finger
 */
export interface FingerState {
  name: FingerName;
  curl: number;           // 0.0 = fully extended straight, 1.0 = fully curled into fist
  isExtended: boolean;
  spreadAngle?: number;   // angle relative to palm center line
  tip: { x: number; y: number; z: number };
  mcp: { x: number; y: number; z: number };
  pip?: { x: number; y: number; z: number };
  dip?: { x: number; y: number; z: number };
}

/**
 * Comprehensive tracking data for a single hand
 */
export interface SingleHandData {
  hand: HandType;
  confidence: number;
  wrist: { x: number; y: number; z: number };
  palmCenter: { x: number; y: number; z: number };
  palmNormal: { x: number; y: number; z: number };
  wristRotation: { pitch: number; yaw: number; roll: number };
  fingers: Record<FingerName, FingerState>;
  pinchDistance: number;
  isRaised: boolean;
  gesture: HandGestureType;
  gestureConfidence: number;
  rawLandmarks: Array<{ x: number; y: number; z: number }>;
}

/**
 * Full frame tracking data for both hands
 */
export interface HandSignals {
  timestamp: number;
  leftHand: SingleHandData | null;
  rightHand: SingleHandData | null;
}

/**
 * Gesture event fired when gestures are detected, held, or released
 */
export type GestureEventType = 'gesture_start' | 'gesture_hold' | 'gesture_end';

export interface GestureEvent {
  type: GestureEventType;
  gesture: HandGestureType;
  hand: HandType;
  confidence: number;
  holdDuration: number; // in milliseconds
  timestamp: number;
}

/**
 * Hand pose for a single hand mapped into 3D avatar orientation and finger curls
 */
export interface AvatarSingleHandPose {
  wristRotation: THREE.Quaternion;
  wristEuler: { x: number; y: number; z: number };
  fingerCurls: Record<FingerName, number>;
  gesture: HandGestureType;
  gestureWeight: number;
  isRaised: boolean;
  isDetected: boolean;
}

/**
 * Combined avatar hand kinematics ready to drive the 3D rig
 */
export interface AvatarHandPose {
  timestamp: number;
  leftHand: AvatarSingleHandPose;
  rightHand: AvatarSingleHandPose;
}

