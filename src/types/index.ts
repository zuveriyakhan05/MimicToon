export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type Point3D = Landmark;

export interface JointAngles {
  leftElbow: number;      // degrees (0 - 180)
  rightElbow: number;     // degrees (0 - 180)
  leftShoulder: number;   // degrees (0 - 180)
  rightShoulder: number;  // degrees (0 - 180)
  leftKnee: number;       // degrees (0 - 180)
  rightKnee: number;      // degrees (0 - 180)
  leftHip: number;        // degrees (0 - 180)
  rightHip: number;       // degrees (0 - 180)
  torsoLean: number;      // normalized (-1 to 1)
  torsoTwist: number;     // normalized (-1 to 1)
  headPitch: number;      // degrees (-90 to 90)
  headYaw: number;        // degrees (-90 to 90)
  headRoll: number;       // degrees (-90 to 90)
}

export interface BodyMotion {
  timestamp: number;
  confidence: number;
  isDetected: boolean;
  head: {
    nose: Point3D;
    leftEye?: Point3D;
    rightEye?: Point3D;
    leftEar?: Point3D;
    rightEar?: Point3D;
    pitch: number;
    yaw: number;
    roll: number;
  };
  shoulders: {
    left: Point3D;
    right: Point3D;
    center: Point3D;
    width: number;
  };
  elbows: {
    left: Point3D;
    right: Point3D;
  };
  wrists: {
    left: Point3D;
    right: Point3D;
  };
  hips: {
    left: Point3D;
    right: Point3D;
    center: Point3D;
  };
  knees: {
    left: Point3D;
    right: Point3D;
  };
  ankles: {
    left: Point3D;
    right: Point3D;
  };
  angles: JointAngles;
  gestures: {
    isHandsUp: boolean;
    isWavingLeft: boolean;
    isWavingRight: boolean;
    isCrouching: boolean;
    isTpose: boolean;
  };
  kinematics: AvatarKinematics;
  rawLandmarks?: Landmark[];
}

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'permission_denied'
  | 'not_found'
  | 'unsupported'
  | 'error';

export interface PoseLandmarks {
  nose?: Landmark;
  leftEye?: Landmark;
  rightEye?: Landmark;
  leftEar?: Landmark;
  rightEar?: Landmark;
  leftShoulder?: Landmark;
  rightShoulder?: Landmark;
  leftElbow?: Landmark;
  rightElbow?: Landmark;
  leftWrist?: Landmark;
  rightWrist?: Landmark;
  leftHip?: Landmark;
  rightHip?: Landmark;
  leftKnee?: Landmark;
  rightKnee?: Landmark;
  leftAnkle?: Landmark;
  rightAnkle?: Landmark;
  rawLandmarks?: Landmark[];
}

export interface AvatarKinematics {
  headPitch: number; // up / down
  headYaw: number;   // left / right
  headRoll: number;  // tilt
  leftArmAngle: number;
  rightArmAngle: number;
  leftForearmAngle: number;
  rightForearmAngle: number;
  torsoLean: number;
  torsoTwist: number;
  jumpOffset: number;
  isWavingLeft: boolean;
  isWavingRight: boolean;
  isHandsUp: boolean;
  isCrouching: boolean;
  mouthOpen: number; // 0 to 1
  isBlinking: boolean;
}

export type CharacterIdleAnimationType =
  | 'bunny_hop'
  | 'bear_sway'
  | 'fox_swish'
  | 'cat_stretch'
  | 'robot_scan';

export interface CharacterPersonality {
  traits: string[];
  favoriteActivity: string;
  energyLevel: 'Calm' | 'Playful' | 'Hyper' | 'Cozy';
  secretPower: string;
}

export interface CharacterIdleConfig {
  type: CharacterIdleAnimationType;
  name: string;
  description: string;
  speed?: number;
  amplitude?: number;
}

export interface CharacterThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  badgeBg: string;
  cardGradient: string;
  glowColor: string;
  auraClass?: string;
}

export interface CharacterVoiceConfig {
  styleName: string;
  pitch: number;
  rate: number;
  voiceEffect: VoiceEffect;
  greeting: string;
  samplePhrases: string[];
}

export interface CharacterProfile {
  id: string;
  name: string;
  species: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  voicePitch: number; // multiplier e.g. 1.5 for high chipmunk
  avatarStyle: 'bunny' | 'bear' | 'fox' | 'cat' | 'robot' | 'robo_pup' | 'space_cat' | 'bouncy_bear' | 'baby_dragon';
  bio: string;
  favoritePose: string;
  unlocked: boolean;
  icon?: string;
  personality?: CharacterPersonality;
  idleAnimation?: CharacterIdleConfig;
  theme?: CharacterThemeConfig;
  voiceStyle?: CharacterVoiceConfig;
  modelUrl?: string; // Optional GLB or VRM 3D model asset URL
  modelType?: 'procedural' | 'glb' | 'vrm';
}

export type VoiceEffect = 'chipmunk' | 'robot' | 'baby' | 'echo' | 'normal';

export interface ChallengePose {
  id: string;
  title: string;
  instruction: string;
  icon: string;
  targetCondition: (kinematics: AvatarKinematics) => boolean;
  durationSeconds: number;
  points: number;
}

export interface UserStats {
  stars: number;
  streakDays: number;
  posesCompleted: number;
  minutesPlayed: number;
  unlockedCharacters: string[];
}

export interface StudioSettings {
  mirrorCamera: boolean;
  showSkeletonOverlay: boolean;
  smoothingFactor: number;
  movementSensitivity: number;
  confidenceThreshold: number;
  activeVoiceEffect: VoiceEffect;
  micSensitivity: number;
  themeEnvironment: 'forest' | 'cosmic' | 'playground' | 'toyroom';
  speechRecognitionEnabled: boolean;
  audioFeedback: boolean;
}

export type AppPage =
  | 'landing'
  | 'characters'
  | 'camera-setup'
  | 'experience'
  | 'copyme'
  | 'results'
  | 'progress'
  | 'settings';

export interface GameSessionResult {
  score: number;
  starsEarned: number;
  xpEarned: number;
  streakDays: number;
  posesCompleted: number;
  armAccuracy: number;
  bodyAccuracy: number;
  headAccuracy: number;
  characterName: string;
  characterAvatar: string;
  feedbackTitle: string;
  feedbackMessage: string;
  date: string;
}

export interface PerformanceMetrics {
  fps: number;
  trackingLatencyMs: number;
  inferenceTimeMs: number;
  poseTimeMs?: number;
  faceTimeMs?: number;
  handTimeMs?: number;
  renderFps?: number;
  qualityTier: 'optimal' | 'good' | 'low';
}

