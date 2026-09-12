import { AvatarFaceExpressionType, AvatarFacePose, FaceSignals } from '../../types/avatar';

export interface FaceExpressionMapperOptions {
  smoothingAlpha?: number;       // 0.1 (snappy) to 0.5 (silky smooth, default 0.25)
  speechAmplification?: number;  // Multiplier for child's speech mouth openness (default 1.25)
  hysteresisThreshold?: number;  // Activation threshold to enter an expression (default 0.38)
  releaseThreshold?: number;     // Release threshold to exit an expression (default 0.22)
  deadzone?: number;             // Noise cutoff for micro-jitter (default 0.03)
}

/**
 * FaceExpressionMapper converts raw MediaPipe facial signals into smoothed,
 * noise-filtered avatar facial expressions (neutral, happy, surprised, sad, angry, blink).
 * 
 * Features:
 * - Hysteresis state machine preventing rapid expression fluttering
 * - Temporal low-pass filtering and velocity damping
 * - Speech amplification for responsive cartoon lip-sync
 * - Dual-eye blinking & winking normalization
 * - Continuous blend weights for smooth facial blending
 */
export class FaceExpressionMapper {
  private smoothingAlpha: number;
  private speechAmplification: number;
  private hysteresisThreshold: number;
  private releaseThreshold: number;
  private deadzone: number;

  // Active state
  private currentExpression: AvatarFaceExpressionType = 'neutral';
  private expressionHoldFrames: number = 0;

  // Smoothed internal values for continuous transition
  private smoothedPose: AvatarFacePose = {
    timestamp: 0,
    isDetected: false,
    confidence: 0,
    dominantExpression: 'neutral',
    expressionWeights: {
      neutral: 1.0,
      happy: 0.0,
      surprised: 0.0,
      sad: 0.0,
      angry: 0.0,
      blink: 0.0,
    },
    mouthOpen: 0,
    mouthSmile: 0,
    mouthFrown: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    eyebrowHeight: 0,
    eyebrowTilt: 0,
    headRotation: { pitch: 0, yaw: 0, roll: 0 },
    faceDirection: { x: 0, y: 0 },
  };

  constructor(options: FaceExpressionMapperOptions = {}) {
    this.smoothingAlpha = options.smoothingAlpha ?? 0.28;
    this.speechAmplification = options.speechAmplification ?? 1.25;
    this.hysteresisThreshold = options.hysteresisThreshold ?? 0.38;
    this.releaseThreshold = options.releaseThreshold ?? 0.22;
    this.deadzone = options.deadzone ?? 0.03;
  }

  public setSmoothingAlpha(alpha: number): void {
    this.smoothingAlpha = Math.max(0.05, Math.min(0.8, alpha));
  }

  public setSpeechAmplification(amp: number): void {
    this.speechAmplification = amp;
  }

  /**
   * Main mapping function:
   * Maps raw FaceSignals into an AvatarFacePose with smoothed weights and parameters.
   */
  public mapSignalsToFacePose(signals: FaceSignals | null, deltaTime: number = 0.016): AvatarFacePose {
    if (!signals || !signals.isDetected) {
      // Smoothly relax to neutral rest pose if face is lost or obscured
      return this.decayToNeutral(deltaTime);
    }

    // 1. Calculate raw emotion scores from normalized signals
    const rawScores = this.computeExpressionScores(signals);

    // 2. Apply hysteresis to select dominant expression without jitter
    const dominant = this.resolveDominantExpression(rawScores);
    this.currentExpression = dominant;

    // 3. Speech and Lip-sync processing:
    // Scale mouth open level dynamically so child's speech translates to lively cartoon mouth opening
    let targetMouthOpen = signals.mouthOpen;
    if (targetMouthOpen < this.deadzone) {
      targetMouthOpen = 0;
    } else {
      targetMouthOpen = Math.min(1.0, Math.pow(targetMouthOpen, 0.85) * this.speechAmplification);
    }

    // 4. Calculate Eyebrow height and tilt (-1.0 angry slant to +1.0 surprised arch)
    let targetEyebrowHeight = 0;
    let targetEyebrowTilt = 0;

    if (signals.browRaise > 0.2) {
      targetEyebrowHeight = signals.browRaise; // Raised (surprised / curious)
    } else if (signals.browFurrow > 0.25) {
      targetEyebrowHeight = -signals.browFurrow; // Lowered (angry / determined)
      targetEyebrowTilt = signals.browFurrow;    // Angled inward (angry)
    } else if (signals.mouthFrown > 0.3) {
      targetEyebrowTilt = -signals.mouthFrown * 0.7; // Angled upward-center (sad)
    }

    // 5. Blinking (filter micro-blinks, clamp full blinks)
    const targetBlinkL = signals.blinkLeft > 0.45 ? 1.0 : signals.blinkLeft < 0.15 ? 0 : signals.blinkLeft;
    const targetBlinkR = signals.blinkRight > 0.45 ? 1.0 : signals.blinkRight < 0.15 ? 0 : signals.blinkRight;

    // 6. Compute Target Expression Weights
    const targetWeights: Record<AvatarFaceExpressionType, number> = {
      neutral: dominant === 'neutral' ? 1.0 : 0.0,
      happy: rawScores.happy,
      surprised: rawScores.surprised,
      sad: rawScores.sad,
      angry: rawScores.angry,
      blink: Math.max(targetBlinkL, targetBlinkR),
    };

    // Normalize weights so they sum smoothly
    const weightSum =
      targetWeights.neutral +
      targetWeights.happy +
      targetWeights.surprised +
      targetWeights.sad +
      targetWeights.angry +
      targetWeights.blink || 1.0;

    // 7. Apply Temporal Exponential Smoothing (Low-Pass Filter)
    // Faster smoothing for blinks and mouth open (snappy speech response),
    // gentle smoothing for emotions (no visual twitching)
    const alphaEmotion = THREE_lerp_factor(this.smoothingAlpha, deltaTime);
    const alphaSpeech = THREE_lerp_factor(this.smoothingAlpha * 0.5, deltaTime); // Snappier for speech
    const alphaHead = THREE_lerp_factor(this.smoothingAlpha * 0.7, deltaTime);

    const prev = this.smoothedPose;

    prev.timestamp = signals.timestamp;
    prev.isDetected = true;
    prev.confidence = signals.confidence;
    prev.dominantExpression = dominant;

    // Smooth emotion weights
    prev.expressionWeights.neutral = lerp(prev.expressionWeights.neutral, targetWeights.neutral / weightSum, alphaEmotion);
    prev.expressionWeights.happy = lerp(prev.expressionWeights.happy, targetWeights.happy, alphaEmotion);
    prev.expressionWeights.surprised = lerp(prev.expressionWeights.surprised, targetWeights.surprised, alphaEmotion);
    prev.expressionWeights.sad = lerp(prev.expressionWeights.sad, targetWeights.sad, alphaEmotion);
    prev.expressionWeights.angry = lerp(prev.expressionWeights.angry, targetWeights.angry, alphaEmotion);
    prev.expressionWeights.blink = lerp(prev.expressionWeights.blink, targetWeights.blink, 0.45); // Snappy blinks

    // Smooth continuous signals
    prev.mouthOpen = lerp(prev.mouthOpen, targetMouthOpen, alphaSpeech);
    prev.mouthSmile = lerp(prev.mouthSmile, signals.mouthSmile, alphaEmotion);
    prev.mouthFrown = lerp(prev.mouthFrown, signals.mouthFrown, alphaEmotion);
    prev.eyeBlinkLeft = lerp(prev.eyeBlinkLeft, targetBlinkL, 0.5);
    prev.eyeBlinkRight = lerp(prev.eyeBlinkRight, targetBlinkR, 0.5);
    prev.eyebrowHeight = lerp(prev.eyebrowHeight, targetEyebrowHeight, alphaEmotion);
    prev.eyebrowTilt = lerp(prev.eyebrowTilt, targetEyebrowTilt, alphaEmotion);

    // Smooth head orientation
    prev.headRotation.pitch = lerp(prev.headRotation.pitch, signals.headRotation.pitch, alphaHead);
    prev.headRotation.yaw = lerp(prev.headRotation.yaw, signals.headRotation.yaw, alphaHead);
    prev.headRotation.roll = lerp(prev.headRotation.roll, signals.headRotation.roll, alphaHead);

    // Smooth face gaze direction
    prev.faceDirection.x = lerp(prev.faceDirection.x, signals.faceDirection.x, alphaHead);
    prev.faceDirection.y = lerp(prev.faceDirection.y, signals.faceDirection.y, alphaHead);

    return { ...this.smoothedPose };
  }

  /**
   * Computes raw scores for each emotion based on facial movement cues
   */
  private computeExpressionScores(signals: FaceSignals): Record<AvatarFaceExpressionType, number> {
    const isBlinking = signals.blinkLeft > 0.6 && signals.blinkRight > 0.6;

    // 1. Happy: Driven by smiling mouth corners, augmented by squinting cheeks
    let happyScore = signals.mouthSmile;
    if (signals.mouthSmile > 0.3) {
      happyScore = Math.min(1.0, signals.mouthSmile * 1.3);
    }

    // 2. Surprised: Driven by raised eyebrows and dropped jaw (wide mouth)
    let surprisedScore = 0;
    if (signals.browRaise > 0.25) {
      surprisedScore = signals.browRaise * 0.7 + (signals.mouthOpen > 0.2 ? signals.mouthOpen * 0.5 : 0);
    }

    // 3. Angry: Driven by furrowed eyebrows and downward mouth/eyes
    let angryScore = 0;
    if (signals.browFurrow > 0.28) {
      angryScore = signals.browFurrow * 0.8 + (signals.mouthFrown > 0.2 ? signals.mouthFrown * 0.4 : 0);
    }

    // 4. Sad: Driven by mouth corners frowning and subtle brow slant
    let sadScore = 0;
    if (signals.mouthFrown > 0.35 && signals.mouthSmile < 0.2) {
      sadScore = signals.mouthFrown * 0.85;
    }

    // 5. Blink: Both eyes closed
    const blinkScore = isBlinking ? 1.0 : 0.0;

    return {
      neutral: 0.2, // Baseline threshold
      happy: clamp01(happyScore),
      surprised: clamp01(surprisedScore),
      sad: clamp01(sadScore),
      angry: clamp01(angryScore),
      blink: blinkScore,
    };
  }

  /**
   * Hysteresis resolver:
   * Prevents flickering when emotion scores hover around the threshold
   */
  private resolveDominantExpression(
    scores: Record<AvatarFaceExpressionType, number>
  ): AvatarFaceExpressionType {
    // Blinking overrides other facial expressions
    if (scores.blink > 0.8) {
      return 'blink';
    }

    // Find highest scoring emotion
    const candidates: Array<{ type: AvatarFaceExpressionType; score: number }> = [
      { type: 'happy', score: scores.happy },
      { type: 'surprised', score: scores.surprised },
      { type: 'angry', score: scores.angry },
      { type: 'sad', score: scores.sad },
    ];

    candidates.sort((a, b) => b.score - a.score);
    const topCandidate = candidates[0];

    // If currently in a non-neutral expression, check if it falls below the release threshold
    if (this.currentExpression !== 'neutral' && this.currentExpression !== 'blink') {
      const currentScore = scores[this.currentExpression];
      if (currentScore >= this.releaseThreshold) {
        // If top candidate is significantly stronger, switch to it
        if (topCandidate.score > currentScore + 0.25 && topCandidate.score >= this.hysteresisThreshold) {
          return topCandidate.type;
        }
        // Otherwise sustain current emotion (hysteresis stability)
        return this.currentExpression;
      }
    }

    // Entering a new emotion requires passing the higher hysteresis threshold
    if (topCandidate.score >= this.hysteresisThreshold) {
      return topCandidate.type;
    }

    return 'neutral';
  }

  /**
   * Smoothly relaxes avatar face back to neutral when face detection drops
   */
  private decayToNeutral(deltaTime: number): AvatarFacePose {
    const decay = THREE_lerp_factor(0.15, deltaTime);
    const p = this.smoothedPose;

    p.isDetected = false;
    p.confidence = 0;
    p.dominantExpression = 'neutral';
    p.expressionWeights.neutral = lerp(p.expressionWeights.neutral, 1.0, decay);
    p.expressionWeights.happy = lerp(p.expressionWeights.happy, 0.0, decay);
    p.expressionWeights.surprised = lerp(p.expressionWeights.surprised, 0.0, decay);
    p.expressionWeights.sad = lerp(p.expressionWeights.sad, 0.0, decay);
    p.expressionWeights.angry = lerp(p.expressionWeights.angry, 0.0, decay);
    p.expressionWeights.blink = lerp(p.expressionWeights.blink, 0.0, decay);

    p.mouthOpen = lerp(p.mouthOpen, 0, decay);
    p.mouthSmile = lerp(p.mouthSmile, 0, decay);
    p.mouthFrown = lerp(p.mouthFrown, 0, decay);
    p.eyeBlinkLeft = lerp(p.eyeBlinkLeft, 0, decay);
    p.eyeBlinkRight = lerp(p.eyeBlinkRight, 0, decay);
    p.eyebrowHeight = lerp(p.eyebrowHeight, 0, decay);
    p.eyebrowTilt = lerp(p.eyebrowTilt, 0, decay);

    p.headRotation.pitch = lerp(p.headRotation.pitch, 0, decay);
    p.headRotation.yaw = lerp(p.headRotation.yaw, 0, decay);
    p.headRotation.roll = lerp(p.headRotation.roll, 0, decay);

    p.faceDirection.x = lerp(p.faceDirection.x, 0, decay);
    p.faceDirection.y = lerp(p.faceDirection.y, 0, decay);

    this.currentExpression = 'neutral';
    return { ...this.smoothedPose };
  }

  public reset(): void {
    this.currentExpression = 'neutral';
    this.smoothedPose = {
      timestamp: 0,
      isDetected: false,
      confidence: 0,
      dominantExpression: 'neutral',
      expressionWeights: {
        neutral: 1.0,
        happy: 0.0,
        surprised: 0.0,
        sad: 0.0,
        angry: 0.0,
        blink: 0.0,
      },
      mouthOpen: 0,
      mouthSmile: 0,
      mouthFrown: 0,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
      eyebrowHeight: 0,
      eyebrowTilt: 0,
      headRotation: { pitch: 0, yaw: 0, roll: 0 },
      faceDirection: { x: 0, y: 0 },
    };
  }
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function THREE_lerp_factor(factor: number, dt: number): number {
  return 1.0 - Math.exp(-factor * (dt * 60));
}

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}
