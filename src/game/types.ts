import { AvatarKinematics, BodyMotion, PoseLandmarks } from '../types';
import { AvatarFacePose, HandSignals } from '../types/avatar';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type GamePhase =
  | 'idle'
  | 'prompt'    // "Can you copy me?"
  | 'demo'      // Character performs the movement
  | 'observe'   // AI observes the child copying
  | 'success'   // "Perfect! 🎉"
  | 'summary';  // Round complete recap

export type PoseCategory = 'arms' | 'body' | 'head' | 'hands' | 'combo';

export interface ScoreBreakdown {
  armScore: number;      // 0 - 100
  bodyScore: number;     // 0 - 100
  headScore: number;     // 0 - 100
  handScore?: number;    // 0 - 100
  overallScore: number;  // 0 - 100
  isMatching: boolean;
  feedbackNote: string;
}

export interface TargetPoseAngles {
  leftArmAngle?: number;      // Shoulder elevation in radians
  rightArmAngle?: number;     // Shoulder elevation in radians
  leftForearmAngle?: number;  // Elbow bend in radians
  rightForearmAngle?: number; // Elbow bend in radians
  torsoLean?: number;         // Torso forward/back lean
  torsoTwist?: number;        // Torso left/right rotation
  headPitch?: number;         // Head nod up/down
  headYaw?: number;           // Head turn left/right
  headRoll?: number;          // Head tilt sideways
  jumpOffset?: number;        // Feet off ground
}

export interface CopyMeChallenge {
  id: string;
  name: string;
  emoji: string;
  category: PoseCategory;
  difficulty: DifficultyLevel;
  promptText: string;          // Character prompt e.g. "Can you copy me?"
  speechInstruction: string;   // Detailed voice line e.g. "Raise both hands up to the sky!"
  successMessage: string;      // Celebration text e.g. "Perfect! Reaching for the stars! 🎉"
  points: number;
  xpReward: number;
  starsReward: number;
  baseDurationSeconds: number; // Required hold time in seconds
  baseSimilarityThreshold: number; // 0 - 100 required similarity
  targetAngles: TargetPoseAngles;
  demoKinematics: Partial<AvatarKinematics>;
  // Custom evaluator for MediaPipe landmarks or special gesture checks
  customMatchCheck?: (
    motion: BodyMotion | null,
    landmarks: PoseLandmarks | null,
    facePose: AvatarFacePose | null,
    handSignals: HandSignals | null
  ) => { matched: boolean; bonusScore: number; hint?: string };
}

export interface GameConfig {
  difficulty: DifficultyLevel;
  similarityThreshold: number; // Configurable threshold (e.g. 70 - 95%)
  minConfidence: number;        // Configurable minimum landmark confidence (e.g. 0.45)
  completionDuration: number;   // Configurable hold duration in seconds (e.g. 1.5 - 3.0s)
  enableVoicePrompts: boolean;
  enableSoundEffects: boolean;
  demoPlaybackSpeed: number;
}

export interface GameAwards {
  xp: number;
  stars: number;
  streak: number;
  points: number;
  roundSuccessCount: number;
}
