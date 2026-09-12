import { ScoreBreakdown, TargetPoseAngles, DifficultyLevel } from './types';
import { AvatarKinematics, BodyMotion } from '../types';
import { AvatarFacePose, HandSignals } from '../types/avatar';

/**
 * ScoreCalculator
 * Computes granular 0-100% similarity scores for Arm, Body, Head, and Overall positions.
 * Applies continuous mathematical distance falloff curves for motivating real-time feedback.
 */
export class ScoreCalculator {
  /**
   * Continuous gaussian-like falloff for angle similarity
   * distance of 0 radians = 100%
   * tolerance of sigma radians = ~60%
   */
  public static angleSimilarity(actual: number, target: number, toleranceRadians: number): number {
    const diff = Math.abs(actual - target);
    // Gaussian falloff
    const score = Math.exp(-0.5 * Math.pow(diff / Math.max(0.1, toleranceRadians), 2));
    return Math.max(0, Math.min(100, Math.round(score * 100)));
  }

  /**
   * Determine angle tolerance based on difficulty level
   */
  public static getTolerance(difficulty: DifficultyLevel): {
    arm: number;
    body: number;
    head: number;
  } {
    switch (difficulty) {
      case 'easy':
        return { arm: 0.55, body: 0.45, head: 0.40 }; // ~31 degrees arm tolerance (very forgiving)
      case 'hard':
        return { arm: 0.28, body: 0.22, head: 0.20 }; // ~16 degrees arm tolerance (precise)
      case 'medium':
      default:
        return { arm: 0.40, body: 0.32, head: 0.28 }; // ~23 degrees arm tolerance (balanced)
    }
  }

  /**
   * Calculate Arm Position Score (0 to 100)
   */
  public static calculateArmScore(
    kinematics: AvatarKinematics | null,
    target: TargetPoseAngles,
    difficulty: DifficultyLevel
  ): number {
    if (!kinematics) return 0;
    const tol = this.getTolerance(difficulty).arm;

    const scores: number[] = [];

    // Left Arm / Shoulder
    if (target.leftArmAngle !== undefined) {
      scores.push(this.angleSimilarity(kinematics.leftArmAngle, target.leftArmAngle, tol));
    }

    // Right Arm / Shoulder
    if (target.rightArmAngle !== undefined) {
      scores.push(this.angleSimilarity(kinematics.rightArmAngle, target.rightArmAngle, tol));
    }

    // Forearms / Elbows
    if (target.leftForearmAngle !== undefined) {
      scores.push(this.angleSimilarity(kinematics.leftForearmAngle, target.leftForearmAngle, tol * 1.2));
    }
    if (target.rightForearmAngle !== undefined) {
      scores.push(this.angleSimilarity(kinematics.rightForearmAngle, target.rightForearmAngle, tol * 1.2));
    }

    if (scores.length === 0) return 95; // Default if pose doesn't constrain arms
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }

  /**
   * Calculate Body Position Score (0 to 100)
   */
  public static calculateBodyScore(
    kinematics: AvatarKinematics | null,
    motion: BodyMotion | null,
    target: TargetPoseAngles,
    difficulty: DifficultyLevel
  ): number {
    if (!kinematics) return 0;
    const tol = this.getTolerance(difficulty).body;
    const scores: number[] = [];

    // Torso Lean (forward/back or sideways)
    if (target.torsoLean !== undefined) {
      scores.push(this.angleSimilarity(kinematics.torsoLean, target.torsoLean, tol));
    } else {
      // If neutral body expected, check lean is near 0
      scores.push(this.angleSimilarity(kinematics.torsoLean, 0, tol * 1.5));
    }

    // Torso Twist
    if (target.torsoTwist !== undefined) {
      scores.push(this.angleSimilarity(kinematics.torsoTwist, target.torsoTwist, tol));
    }

    // Jump / Squat offset
    if (target.jumpOffset !== undefined) {
      const actualJump = kinematics.jumpOffset || 0;
      const jumpDiff = Math.abs(actualJump - target.jumpOffset);
      const jumpScore = Math.max(0, 100 - jumpDiff * 250);
      scores.push(jumpScore);
    }

    if (scores.length === 0) return 92;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }

  /**
   * Calculate Head Position Score (0 to 100)
   */
  public static calculateHeadScore(
    kinematics: AvatarKinematics | null,
    facePose: AvatarFacePose | null,
    target: TargetPoseAngles,
    difficulty: DifficultyLevel
  ): number {
    if (!kinematics && !facePose) return 0;
    const tol = this.getTolerance(difficulty).head;
    const scores: number[] = [];

    const headPitch = facePose?.headRotation?.pitch ?? kinematics?.headPitch ?? 0;
    const headYaw = facePose?.headRotation?.yaw ?? kinematics?.headYaw ?? 0;
    const headRoll = facePose?.headRotation?.roll ?? kinematics?.headRoll ?? 0;

    // Head Nod (Pitch)
    if (target.headPitch !== undefined) {
      scores.push(this.angleSimilarity(headPitch, target.headPitch, tol));
    } else {
      scores.push(this.angleSimilarity(headPitch, 0, tol * 1.6));
    }

    // Head Turn (Yaw)
    if (target.headYaw !== undefined) {
      scores.push(this.angleSimilarity(headYaw, target.headYaw, tol));
    } else {
      scores.push(this.angleSimilarity(headYaw, 0, tol * 1.6));
    }

    // Head Tilt (Roll)
    if (target.headRoll !== undefined) {
      scores.push(this.angleSimilarity(headRoll, target.headRoll, tol));
    }

    if (scores.length === 0) return 90;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }

  /**
   * Compute complete breakdown and overall weighted score
   */
  public static calculateBreakdown(
    kinematics: AvatarKinematics | null,
    motion: BodyMotion | null,
    facePose: AvatarFacePose | null,
    handSignals: HandSignals | null,
    target: TargetPoseAngles,
    difficulty: DifficultyLevel,
    threshold = 80,
    confidenceThreshold = 0.45
  ): ScoreBreakdown {
    // Confidence check
    const isConfident = motion?.isDetected && (motion.confidence ?? 0.8) >= confidenceThreshold;

    if (!isConfident && !kinematics) {
      return {
        armScore: 0,
        bodyScore: 0,
        headScore: 0,
        overallScore: 0,
        isMatching: false,
        feedbackNote: 'Step in front of your camera so your buddy can see you! 📷',
      };
    }

    const armScore = this.calculateArmScore(kinematics, target, difficulty);
    const bodyScore = this.calculateBodyScore(kinematics, motion, target, difficulty);
    const headScore = this.calculateHeadScore(kinematics, facePose, target, difficulty);

    // Dynamic weighting based on which joints the target constrains
    let armWeight = 0.45;
    let bodyWeight = 0.35;
    let headWeight = 0.20;

    if (target.leftArmAngle !== undefined || target.rightArmAngle !== undefined) {
      armWeight = 0.55;
      bodyWeight = 0.30;
      headWeight = 0.15;
    } else if (target.headYaw !== undefined || target.headPitch !== undefined) {
      headWeight = 0.55;
      armWeight = 0.25;
      bodyWeight = 0.20;
    } else if (target.torsoLean !== undefined || target.jumpOffset !== undefined) {
      bodyWeight = 0.55;
      armWeight = 0.30;
      headWeight = 0.15;
    }

    const rawOverall = armScore * armWeight + bodyScore * bodyWeight + headScore * headWeight;
    const overallScore = Math.min(100, Math.max(0, Math.round(rawOverall)));

    const isMatching = overallScore >= threshold;

    // Encouraging child-friendly feedback
    let feedbackNote = 'Look at your buddy and copy! 👀';
    if (overallScore >= 90) {
      feedbackNote = 'Perfect! 🎉';
    } else if (overallScore >= 80) {
      feedbackNote = 'Awesome! 🌟 Hold it!';
    } else if (overallScore >= 70) {
      feedbackNote = 'Almost there! Keep holding! 💪';
    } else if (overallScore >= 50) {
      feedbackNote = 'Good try, reach a little more! 🚀';
    }

    return {
      armScore,
      bodyScore,
      headScore,
      overallScore,
      isMatching,
      feedbackNote,
    };
  }
}
