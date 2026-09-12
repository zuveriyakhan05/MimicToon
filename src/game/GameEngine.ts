import {
  CopyMeChallenge,
  DifficultyLevel,
  GamePhase,
  ScoreBreakdown,
  GameConfig,
  GameAwards,
} from './types';
import { ChallengeManager } from './ChallengeManager';
import { PoseMatcher } from './PoseMatcher';
import { AvatarKinematics, BodyMotion, PoseLandmarks } from '../types';
import { AvatarFacePose, HandSignals } from '../types/avatar';
import { playSoundEffect } from '../utils/audioEffects';

export interface GameEngineCallbacks {
  onPhaseChange?: (phase: GamePhase) => void;
  onChallengeChange?: (challenge: CopyMeChallenge) => void;
  onScoreUpdate?: (breakdown: ScoreBreakdown, holdProgress: number) => void;
  onSuccess?: (challenge: CopyMeChallenge, awards: GameAwards) => void;
  onDemoKinematics?: (kinematics: AvatarKinematics | null) => void;
  onSpeakText?: (text: string) => void;
}

/**
 * GameEngine
 * Core state machine and scoring orchestrator for the "Copy Me" game mode.
 * Coordinates Prompt, 3D Avatar Demo, Child Observation, Hold Duration Verification, and Awards.
 */
export class GameEngine {
  private phase: GamePhase = 'idle';
  private challengeManager: ChallengeManager;
  private config: GameConfig;
  private awards: GameAwards = {
    xp: 0,
    stars: 0,
    streak: 0,
    points: 0,
    roundSuccessCount: 0,
  };

  // State Tracking
  private holdStartTime: number | null = null;
  private holdProgress = 0; // 0 to 100
  private phaseStartTime = 0;
  private currentScoreBreakdown: ScoreBreakdown = {
    armScore: 0,
    bodyScore: 0,
    headScore: 0,
    overallScore: 0,
    isMatching: false,
    feedbackNote: '',
  };

  // Demo Animation Interpolation (0.0 to 1.0)
  private demoProgress = 0;
  private demoActive = false;

  private callbacks: GameEngineCallbacks;
  private isRunning = false;

  constructor(
    difficulty: DifficultyLevel = 'easy',
    callbacks: GameEngineCallbacks = {},
    customConfig?: Partial<GameConfig>
  ) {
    this.challengeManager = new ChallengeManager(difficulty);
    this.callbacks = callbacks;

    const baseThreshold = difficulty === 'easy' ? 70 : difficulty === 'medium' ? 78 : 84;
    const baseDuration = difficulty === 'easy' ? 1.8 : difficulty === 'medium' ? 2.0 : 2.4;

    this.config = {
      difficulty,
      similarityThreshold: baseThreshold,
      minConfidence: 0.45,
      completionDuration: baseDuration,
      enableVoicePrompts: true,
      enableSoundEffects: true,
      demoPlaybackSpeed: 1.0,
      ...customConfig,
    };
  }

  public start(): void {
    this.isRunning = true;
    this.awards.streak = 1;
    this.startPromptPhase();
  }

  public pause(): void {
    this.isRunning = false;
    this.setPhase('idle');
  }

  public reset(): void {
    this.isRunning = false;
    this.awards = {
      xp: 0,
      stars: 0,
      streak: 0,
      points: 0,
      roundSuccessCount: 0,
    };
    this.holdStartTime = null;
    this.holdProgress = 0;
    this.setPhase('idle');
  }

  public setDifficulty(difficulty: DifficultyLevel): void {
    this.config.difficulty = difficulty;
    if (difficulty === 'easy') {
      this.config.similarityThreshold = 70;
      this.config.completionDuration = 1.8;
    } else if (difficulty === 'medium') {
      this.config.similarityThreshold = 78;
      this.config.completionDuration = 2.0;
    } else {
      this.config.similarityThreshold = 84;
      this.config.completionDuration = 2.4;
    }

    this.challengeManager.setDifficulty(difficulty);
    if (this.isRunning) {
      this.startPromptPhase();
    }
  }

  public updateConfig(newConfig: Partial<GameConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): GameConfig {
    return { ...this.config };
  }

  public getAwards(): GameAwards {
    return { ...this.awards };
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public getCurrentChallenge(): CopyMeChallenge {
    return this.challengeManager.getCurrentChallenge();
  }

  public nextChallenge(): void {
    this.challengeManager.nextChallenge();
    this.startPromptPhase();
  }

  public skipChallenge(): void {
    if (this.config.enableSoundEffects) playSoundEffect('pop');
    this.challengeManager.nextChallenge();
    this.startPromptPhase();
  }

  public replayDemo(): void {
    this.startDemoPhase();
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.phaseStartTime = performance.now();
    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange(phase);
    }
  }

  /**
   * Phase 1: PROMPT
   * Character says: "Can you copy me?"
   */
  private startPromptPhase(): void {
    this.setPhase('prompt');
    this.holdStartTime = null;
    this.holdProgress = 0;
    const challenge = this.getCurrentChallenge();

    if (this.callbacks.onChallengeChange) {
      this.callbacks.onChallengeChange(challenge);
    }

    if (this.config.enableSoundEffects) {
      playSoundEffect('pop');
    }

    if (this.config.enableVoicePrompts && this.callbacks.onSpeakText) {
      this.callbacks.onSpeakText(`Can you copy me? ${challenge.speechInstruction}`);
    }

    // Move to DEMO phase after 1.4s voice prompt
    setTimeout(() => {
      if (this.isRunning && this.phase === 'prompt') {
        this.startDemoPhase();
      }
    }, 1400);
  }

  /**
   * Phase 2: DEMO
   * Character physically performs the movement on 3D stage for child to observe
   */
  private startDemoPhase(): void {
    this.setPhase('demo');
    this.demoProgress = 0;
    this.demoActive = true;

    if (this.config.enableSoundEffects) {
      playSoundEffect('pop');
    }

    // Demo duration is ~2.2 seconds, then transition to OBSERVE phase
    const demoDurationMs = 2400 / this.config.demoPlaybackSpeed;
    setTimeout(() => {
      if (this.isRunning && this.phase === 'demo') {
        this.startObservePhase();
      }
    }, demoDurationMs);
  }

  /**
   * Phase 3: OBSERVE
   * AI observes the child copying the pose in real time
   */
  private startObservePhase(): void {
    this.setPhase('observe');
    this.demoActive = false;
    this.holdStartTime = null;
    this.holdProgress = 0;

    if (this.callbacks.onDemoKinematics) {
      this.callbacks.onDemoKinematics(null); // Release demo override back to camera mirroring
    }
  }

  /**
   * Phase 4: SUCCESS
   * Child held the pose! "Perfect! 🎉"
   */
  private triggerSuccess(): void {
    this.setPhase('success');
    const challenge = this.getCurrentChallenge();

    // Calculate awards
    const xpEarned = challenge.xpReward;
    const starsEarned = challenge.starsReward;
    const pointsEarned = challenge.points;

    this.awards.xp += xpEarned;
    this.awards.stars += starsEarned;
    this.awards.points += pointsEarned;
    this.awards.streak += 1;
    this.awards.roundSuccessCount += 1;

    if (this.config.enableSoundEffects) {
      playSoundEffect('fanfare');
    }

    if (this.config.enableVoicePrompts && this.callbacks.onSpeakText) {
      this.callbacks.onSpeakText(challenge.successMessage);
    }

    if (this.callbacks.onSuccess) {
      this.callbacks.onSuccess(challenge, { ...this.awards });
    }

    // Advance to next challenge after celebration
    setTimeout(() => {
      if (this.isRunning && this.phase === 'success') {
        this.nextChallenge();
      }
    }, 2800);
  }

  /**
   * Main Per-Frame Tick (runs at 60fps)
   * Feeds camera landmarks and child body motion into PoseMatcher & ScoreCalculator
   */
  public update(
    motion: BodyMotion | null,
    landmarks: PoseLandmarks | null,
    kinematics: AvatarKinematics | null,
    facePose: AvatarFacePose | null,
    handSignals: HandSignals | null
  ): {
    phase: GamePhase;
    breakdown: ScoreBreakdown;
    holdProgress: number;
    demoKinematics: AvatarKinematics | null;
  } {
    const now = performance.now();
    let computedDemoKinematics: AvatarKinematics | null = null;

    // 1. DEMO Phase Handling: Interpolate cartoon character towards target pose
    if (this.phase === 'demo' && this.demoActive) {
      const challenge = this.getCurrentChallenge();
      const elapsed = (now - this.phaseStartTime) / 1000;
      this.demoProgress = Math.min(1.0, elapsed * 1.5);

      // Smooth cubic ease-in-out
      const ease =
        this.demoProgress < 0.5
          ? 4 * this.demoProgress * this.demoProgress * this.demoProgress
          : 1 - Math.pow(-2 * this.demoProgress + 2, 3) / 2;

      computedDemoKinematics = this.interpolateKinematics(
        challenge.demoKinematics,
        ease,
        now / 1000
      );

      if (this.callbacks.onDemoKinematics) {
        this.callbacks.onDemoKinematics(computedDemoKinematics);
      }

      return {
        phase: this.phase,
        breakdown: this.currentScoreBreakdown,
        holdProgress: 0,
        demoKinematics: computedDemoKinematics,
      };
    }

    // 2. OBSERVE Phase Handling: Match child's real-time body motion
    if (this.phase === 'observe' && this.isRunning) {
      const challenge = this.getCurrentChallenge();
      const breakdown = PoseMatcher.evaluate(
        challenge,
        motion,
        landmarks,
        kinematics,
        facePose,
        handSignals,
        this.config
      );

      this.currentScoreBreakdown = breakdown;

      // Check if current score meets similarity threshold
      if (breakdown.isMatching) {
        if (!this.holdStartTime) {
          this.holdStartTime = now;
        } else {
          const heldSeconds = (now - this.holdStartTime) / 1000;
          const required = this.config.completionDuration;
          this.holdProgress = Math.min(100, Math.round((heldSeconds / required) * 100));

          if (this.holdProgress >= 100) {
            // Pose completed successfully!
            this.triggerSuccess();
          }
        }
      } else {
        // Reset hold progress if child leaves pose
        this.holdStartTime = null;
        this.holdProgress = Math.max(0, this.holdProgress - 3); // gentle decay
      }

      if (this.callbacks.onScoreUpdate) {
        this.callbacks.onScoreUpdate(breakdown, this.holdProgress);
      }
    }

    return {
      phase: this.phase,
      breakdown: this.currentScoreBreakdown,
      holdProgress: this.holdProgress,
      demoKinematics: null,
    };
  }

  /**
   * Helper to interpolate kinematics for smooth 3D character demonstration
   */
  private interpolateKinematics(
    target: Partial<AvatarKinematics>,
    progress: number,
    time: number
  ): AvatarKinematics {
    const idleArm = 0.3 + Math.sin(time * 2) * 0.05;
    const targetLeftArm = target.leftArmAngle ?? idleArm;
    const targetRightArm = target.rightArmAngle ?? idleArm;

    return {
      headPitch: (target.headPitch ?? 0) * progress,
      headYaw: (target.headYaw ?? 0) * progress,
      headRoll: (target.headRoll ?? 0) * progress,
      leftArmAngle: idleArm * (1 - progress) + targetLeftArm * progress,
      rightArmAngle: idleArm * (1 - progress) + targetRightArm * progress,
      leftForearmAngle: (target.leftForearmAngle ?? 0.2) * progress,
      rightForearmAngle: (target.rightForearmAngle ?? 0.2) * progress,
      torsoLean: (target.torsoLean ?? 0) * progress,
      torsoTwist: (target.torsoTwist ?? 0) * progress,
      jumpOffset: (target.jumpOffset ?? 0) * progress,
      isWavingLeft: Boolean(target.isWavingLeft),
      isWavingRight: Boolean(target.isWavingRight),
      isHandsUp: Boolean(target.isHandsUp),
      isCrouching: Boolean(target.isCrouching),
      mouthOpen: target.mouthOpen ?? 0.2,
      isBlinking: false,
    };
  }
}
