import { CopyMeChallenge, ScoreBreakdown, GameConfig } from './types';
import { AvatarKinematics, BodyMotion, PoseLandmarks } from '../types';
import { AvatarFacePose, HandSignals } from '../types/avatar';
import { ScoreCalculator } from './ScoreCalculator';

/**
 * PoseMatcher
 * Evaluates the child's real-time motion and MediaPipe landmarks against a Target Pose.
 * Checks coordinate relationships (e.g. wrists above shoulders/head, hand proximity, torso angles).
 */
export class PoseMatcher {
  /**
   * Evaluate a challenge against child's current vision and body telemetry
   */
  public static evaluate(
    challenge: CopyMeChallenge,
    motion: BodyMotion | null,
    landmarks: PoseLandmarks | null,
    kinematics: AvatarKinematics | null,
    facePose: AvatarFacePose | null,
    handSignals: HandSignals | null,
    config: GameConfig
  ): ScoreBreakdown {
    // 1. Calculate standard angle-based breakdown
    const baseBreakdown = ScoreCalculator.calculateBreakdown(
      kinematics,
      motion,
      facePose,
      handSignals,
      challenge.targetAngles,
      config.difficulty,
      config.similarityThreshold,
      config.minConfidence
    );

    // 2. Perform landmark-specific geometry checks using raw MediaPipe landmark points
    const landmarkScoreAdjustments = this.evaluateLandmarkGeometry(challenge, landmarks, motion);

    // 3. Custom evaluator if defined on challenge (e.g. clap, thumbs up, special gestures)
    let customBonus = 0;
    let customMatched = false;
    let customHint: string | undefined = undefined;

    if (challenge.customMatchCheck) {
      const customRes = challenge.customMatchCheck(motion, landmarks, facePose, handSignals);
      customBonus = customRes.bonusScore;
      customMatched = customRes.matched;
      customHint = customRes.hint;
    }

    // Blend base breakdown with landmark geometry bonus
    let finalArmScore = Math.min(100, Math.max(0, baseBreakdown.armScore + landmarkScoreAdjustments.armDelta));
    let finalBodyScore = Math.min(100, Math.max(0, baseBreakdown.bodyScore + landmarkScoreAdjustments.bodyDelta));
    let finalHeadScore = Math.min(100, Math.max(0, baseBreakdown.headScore + landmarkScoreAdjustments.headDelta));

    if (customMatched && customBonus > 0) {
      finalArmScore = Math.min(100, finalArmScore + customBonus);
      finalBodyScore = Math.min(100, finalBodyScore + customBonus);
    }

    // Recompute weighted overall score
    const weightedOverall = Math.round(
      finalArmScore * 0.45 + finalBodyScore * 0.35 + finalHeadScore * 0.20
    );

    const isMatching = weightedOverall >= config.similarityThreshold;

    let feedbackNote = baseBreakdown.feedbackNote;
    if (customHint && !isMatching) {
      feedbackNote = customHint;
    } else if (weightedOverall >= 90) {
      feedbackNote = 'Perfect! 🎉';
    } else if (weightedOverall >= 80) {
      feedbackNote = 'Awesome! 🌟';
    } else if (weightedOverall >= config.similarityThreshold) {
      feedbackNote = 'Great! Hold it right there! ⏱️';
    }

    return {
      armScore: finalArmScore,
      bodyScore: finalBodyScore,
      headScore: finalHeadScore,
      overallScore: weightedOverall,
      isMatching,
      feedbackNote,
    };
  }

  /**
   * MediaPipe landmark-specific geometry checks:
   * - Height of wrists relative to shoulders & nose (y-axis is inverted in MediaPipe: smaller y = higher up)
   * - Separation distance of wrists (for clap)
   * - Hip-to-shoulder vertical alignment
   */
  private static evaluateLandmarkGeometry(
    challenge: CopyMeChallenge,
    landmarks: PoseLandmarks | null,
    motion: BodyMotion | null
  ): { armDelta: number; bodyDelta: number; headDelta: number } {
    let armDelta = 0;
    let bodyDelta = 0;
    let headDelta = 0;

    if (!landmarks && !motion) return { armDelta: 0, bodyDelta: 0, headDelta: 0 };

    const leftWristY = landmarks?.leftWrist?.y ?? motion?.wrists?.left?.y;
    const rightWristY = landmarks?.rightWrist?.y ?? motion?.wrists?.right?.y;
    const leftShoulderY = landmarks?.leftShoulder?.y ?? motion?.shoulders?.left?.y;
    const rightShoulderY = landmarks?.rightShoulder?.y ?? motion?.shoulders?.right?.y;
    const noseY = landmarks?.nose?.y ?? motion?.head?.nose?.y;

    // A. "Raise Both Hands" check: wrists must be above nose/shoulders
    if (challenge.id === 'raise_both_hands') {
      if (leftWristY !== undefined && rightWristY !== undefined && leftShoulderY !== undefined && rightShoulderY !== undefined) {
        // In screen space, smaller y = higher up
        const leftUp = leftWristY < leftShoulderY;
        const rightUp = rightWristY < rightShoulderY;
        const aboveNose = noseY !== undefined && leftWristY < noseY && rightWristY < noseY;

        if (aboveNose) {
          armDelta += 8; // High reach bonus
        } else if (leftUp && rightUp) {
          armDelta += 4;
        } else {
          armDelta -= 15; // Arm not high enough
        }
      }
    }

    // B. "Raise Left Hand" check (User's left arm up)
    if (challenge.id === 'raise_left_hand') {
      if (leftWristY !== undefined && leftShoulderY !== undefined) {
        if (leftWristY < leftShoulderY) {
          armDelta += 6;
        } else {
          armDelta -= 12;
        }
      }
    }

    // C. "Raise Right Hand" check
    if (challenge.id === 'raise_right_hand') {
      if (rightWristY !== undefined && rightShoulderY !== undefined) {
        if (rightWristY < rightShoulderY) {
          armDelta += 6;
        } else {
          armDelta -= 12;
        }
      }
    }

    // D. "Bend Down" check: shoulders approach hips height
    if (challenge.id === 'bend_down') {
      const leftHipY = landmarks?.leftHip?.y ?? motion?.hips?.left?.y;
      if (leftShoulderY !== undefined && leftHipY !== undefined) {
        const torsoHeight = Math.abs(leftHipY - leftShoulderY);
        // If bent down, vertical shoulder-hip distance is compressed
        if (torsoHeight < 0.22) {
          bodyDelta += 10;
        } else {
          bodyDelta -= 10;
        }
      }
    }

    return { armDelta, bodyDelta, headDelta };
  }
}
