import { CompanionState, CompanionReactionType, CompanionReactionEvent } from '../../types/companion';
import { BodyMotion, AvatarKinematics } from '../../types';
import { AvatarFacePose, HandSignals } from '../../types/avatar';
import { CharacterProfile } from '../../types';

export interface CompanionStateCallbacks {
  onStateChange?: (state: CompanionState, previous: CompanionState) => void;
  onReaction?: (reaction: CompanionReactionEvent) => void;
  onSpeak?: (text: string) => void;
}

export interface CompanionTickInput {
  time: number;
  delta: number;
  kinematics: AvatarKinematics | null;
  motion: BodyMotion | null;
  facePose: AvatarFacePose | null;
  handSignals: HandSignals | null;
  isChildSpeaking: boolean;
  isCharacterSpeaking: boolean;
  childTranscript?: string;
  mouthOpenLevel?: number;
}

export class CompanionStateMachine {
  private currentState: CompanionState = CompanionState.IDLE;
  private previousState: CompanionState = CompanionState.IDLE;
  private activeReaction: CompanionReactionType = 'none';
  private reactionEndTime = 0;
  private currentMessage = '';

  // State smooth transition blending (0.0 to 1.0)
  private stateBlend = 1.0;
  private readonly transitionSpeed = 4.5; // reaches ~1.0 in ~220ms

  // Inactivity tracking
  private lastActivityTime = 0;
  private readonly idleThresholdSeconds = 2.2;

  // Reaction cooldowns to prevent spamming reactions
  private lastReactionTimes: Record<string, number> = {};
  private readonly reactionCooldownMs = 3800;

  // Active character personality
  private character: CharacterProfile;
  private callbacks: CompanionStateCallbacks;

  // Track previous frame signals for edge detection
  private prevWasWaving = false;
  private prevWasJumping = false;
  private prevWasSmiling = false;
  private prevWasSurprised = false;
  private prevThumbUp = false;

  constructor(character: CharacterProfile, callbacks: CompanionStateCallbacks = {}) {
    this.character = character;
    this.callbacks = callbacks;
    this.lastActivityTime = performance.now() / 1000;
  }

  public setCharacter(character: CharacterProfile): void {
    this.character = character;
  }

  public handleSpeechInput(transcript: string): void {
    this.lastActivityTime = performance.now() / 1000;
  }

  public getState(): CompanionState {
    return this.currentState;
  }

  public getPreviousState(): CompanionState {
    return this.previousState;
  }

  public getActiveReaction(): CompanionReactionType {
    return this.activeReaction;
  }

  public getBlend(): number {
    return this.stateBlend;
  }

  public getCurrentMessage(): string {
    return this.currentMessage;
  }

  /**
   * Main per-frame update loop of the state machine
   */
  public update(input: CompanionTickInput): {
    state: CompanionState;
    blend: number;
    reaction: CompanionReactionType;
  } {
    const { time, delta, kinematics, motion, facePose, handSignals, isChildSpeaking, isCharacterSpeaking } = input;
    const nowMs = performance.now();

    // Advance state transition blend
    if (this.stateBlend < 1.0) {
      this.stateBlend = Math.min(1.0, this.stateBlend + delta * this.transitionSpeed);
    }

    // Check if active timed reaction has expired
    if (this.activeReaction !== 'none' && time >= this.reactionEndTime) {
      this.activeReaction = 'none';
    }

    // 1. HIGHEST PRIORITY: Character is currently speaking/responding
    if (isCharacterSpeaking) {
      this.transitionTo(CompanionState.SPEAKING);
      return { state: this.currentState, blend: this.stateBlend, reaction: this.activeReaction };
    }

    // 2. Child is speaking into microphone (VAD or voice recognition active)
    if (isChildSpeaking) {
      this.lastActivityTime = time;
      this.transitionTo(CompanionState.LISTENING);
      return { state: this.currentState, blend: this.stateBlend, reaction: this.activeReaction };
    }

    // 3. Check for specific interactive triggers from Body, Face, or Hand Gestures
    const isMoving = motion && motion.isDetected;
    const isFaceActive = facePose && facePose.isDetected;

    // Movement Activity Detection
    let isChildActive = false;

    // Hand Gesture Triggers
    const rightGesture = handSignals?.rightHand?.gesture;
    const leftGesture = handSignals?.leftHand?.gesture;
    const hasThumbsUp = rightGesture === 'thumbs_up' || leftGesture === 'thumbs_up';
    const hasVictory = rightGesture === 'victory' || leftGesture === 'victory';
    const hasHighFive = rightGesture === 'open_palm' || leftGesture === 'open_palm';

    // Face Expression Triggers
    const isSmiling = isFaceActive && (facePose.dominantExpression === 'happy' || facePose.mouthSmile > 0.45);
    const isSurprised =
      isFaceActive &&
      (facePose.dominantExpression === 'surprised' ||
        (facePose.mouthOpen > 0.65 && facePose.eyebrowHeight > 0.3));

    // Body Motion Triggers
    const isJumping = kinematics && kinematics.jumpOffset && kinematics.jumpOffset > 0.1;
    const isWaving = kinematics && (kinematics.isWavingLeft || kinematics.isWavingRight);
    const isHandsUp = kinematics && kinematics.isHandsUp;

    // Evaluate Activity Timestamp
    if (
      isMoving ||
      isFaceActive ||
      hasThumbsUp ||
      hasVictory ||
      hasHighFive ||
      isSmiling ||
      isSurprised ||
      isJumping ||
      isWaving ||
      isHandsUp
    ) {
      isChildActive = true;
      this.lastActivityTime = time;
    }

    // Reaction Triggers with Edge Detection and Cooldowns
    // A. Waving -> Character waves back & says hi!
    if (isWaving && !this.prevWasWaving && this.canTriggerReaction('wave', nowMs)) {
      this.triggerReaction(
        CompanionState.CELEBRATING,
        'wave',
        `Hello there! 👋`,
        2.5,
        nowMs
      );
    }
    // B. Jumping -> Character gets EXCITED & jumps!
    else if (isJumping && !this.prevWasJumping && this.canTriggerReaction('jump', nowMs)) {
      this.triggerReaction(
        CompanionState.EXCITED,
        'jump',
        `Boing boing! 🦘 High jump!`,
        2.5,
        nowMs
      );
    }
    // C. Thumbs up or Victory -> Character CELEBRATING!
    else if (hasThumbsUp && !this.prevThumbUp && this.canTriggerReaction('thumbs_up', nowMs)) {
      this.triggerReaction(
        CompanionState.CELEBRATING,
        'thumbs_up',
        `Super job, buddy! 👍`,
        2.5,
        nowMs
      );
    } else if (hasVictory && this.canTriggerReaction('victory', nowMs)) {
      this.triggerReaction(
        CompanionState.CELEBRATING,
        'cheer',
        `Peace & victory! ✌️`,
        2.5,
        nowMs
      );
    } else if (hasHighFive && this.canTriggerReaction('high_five', nowMs)) {
      this.triggerReaction(
        CompanionState.CELEBRATING,
        'high_five',
        `High five, superstar! 🖐️`,
        2.4,
        nowMs
      );
    }
    // D. Smiling -> Character gets HAPPY / EXCITED!
    else if (isSmiling && !this.prevWasSmiling && this.canTriggerReaction('smile', nowMs)) {
      this.triggerReaction(
        CompanionState.EXCITED,
        'laugh',
        `Love your big smile! 😊`,
        2.5,
        nowMs
      );
    }
    // E. Surprised Face -> Character gets SURPRISED!
    else if (isSurprised && !this.prevWasSurprised && this.canTriggerReaction('surprised', nowMs)) {
      this.triggerReaction(
        CompanionState.SURPRISED,
        'surprised',
        `Whoaaa! 😲 So cool!`,
        2.5,
        nowMs
      );
    }
    // F. Hands in the air -> Character cheers!
    else if (isHandsUp && this.canTriggerReaction('hands_up', nowMs)) {
      this.triggerReaction(
        CompanionState.EXCITED,
        'cheer',
        `Hands up! Party time! 🙌`,
        2.5,
        nowMs
      );
    }

    // Save current states for next frame edge detection
    this.prevWasWaving = Boolean(isWaving);
    this.prevWasJumping = Boolean(isJumping);
    this.prevWasSmiling = Boolean(isSmiling);
    this.prevWasSurprised = Boolean(isSurprised);
    this.prevThumbUp = Boolean(hasThumbsUp);

    // If an active special reaction is playing, stay in that reaction state until it finishes
    if (this.activeReaction !== 'none') {
      return { state: this.currentState, blend: this.stateBlend, reaction: this.activeReaction };
    }

    // 4. If child is actively moving in front of the camera, we are in FOLLOWING state!
    if (isChildActive && isMoving) {
      this.transitionTo(CompanionState.FOLLOWING);
      return { state: this.currentState, blend: this.stateBlend, reaction: 'none' };
    }

    // 5. If no active motion or activity for > threshold, transition smoothly to IDLE
    const inactiveDuration = time - this.lastActivityTime;
    if (inactiveDuration > this.idleThresholdSeconds) {
      this.transitionTo(CompanionState.IDLE);
    } else if (this.currentState === CompanionState.IDLE && isChildActive) {
      this.transitionTo(CompanionState.FOLLOWING);
    }

    return { state: this.currentState, blend: this.stateBlend, reaction: this.activeReaction };
  }

  /**
   * Helper to execute a state transition with smooth blending
   */
  public transitionTo(newState: CompanionState): void {
    if (this.currentState === newState) return;

    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateBlend = 0.0; // reset blend to animate smooth lerp

    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(newState, this.previousState);
    }
  }

  /**
   * Trigger a fun cartoon reaction with voice/dialogue
   * Supports both (state, reaction, message, duration) and (reaction, message, duration)
   */
  public triggerReaction(
    stateOrReaction: CompanionState | CompanionReactionType,
    reactionOrMessage?: CompanionReactionType | string,
    messageOrDuration?: string | number,
    durationSeconds = 2.5,
    nowMs = performance.now()
  ): void {
    let state: CompanionState;
    let reaction: CompanionReactionType;
    let message = '';
    let duration = durationSeconds;

    if (Object.values(CompanionState).includes(stateOrReaction as CompanionState)) {
      state = stateOrReaction as CompanionState;
      reaction = (reactionOrMessage as CompanionReactionType) || 'none';
      message = (messageOrDuration as string) || '';
    } else {
      reaction = stateOrReaction as CompanionReactionType;
      message = (reactionOrMessage as string) || '';
      if (typeof messageOrDuration === 'number') {
        duration = messageOrDuration;
      }
      // Infer state from reaction
      if (
        reaction === 'wave' ||
        reaction === 'waving' ||
        reaction === 'cheer' ||
        reaction === 'cheering' ||
        reaction === 'high_five' ||
        reaction === 'thumbs_up'
      ) {
        state = CompanionState.CELEBRATING;
      } else if (
        reaction === 'jump' ||
        reaction === 'jumping' ||
        reaction === 'excited' ||
        reaction === 'laugh' ||
        reaction === 'laughing' ||
        reaction === 'dance'
      ) {
        state = CompanionState.EXCITED;
      } else if (reaction === 'surprised') {
        state = CompanionState.SURPRISED;
      } else {
        state = CompanionState.FOLLOWING;
      }
    }

    this.transitionTo(state);
    this.activeReaction = reaction;
    this.reactionEndTime = performance.now() / 1000 + duration;
    this.currentMessage = message;
    this.lastReactionTimes[reaction] = nowMs;

    const event: CompanionReactionEvent = {
      state,
      reaction,
      message,
      durationMs: duration * 1000,
      timestamp: nowMs,
    };

    if (this.callbacks.onReaction) {
      this.callbacks.onReaction(event);
    }

    if (this.callbacks.onSpeak) {
      this.callbacks.onSpeak(message);
    }
  }

  /**
   * Check if a reaction is off cooldown
   */
  private canTriggerReaction(reaction: string, nowMs: number): boolean {
    const lastTime = this.lastReactionTimes[reaction] || 0;
    return nowMs - lastTime >= this.reactionCooldownMs;
  }

  /**
   * Manual interaction trigger from UI buttons (child clicked a prompt/reaction button)
   */
  public handleUserAction(action: 'hello' | 'wave' | 'dance' | 'jump' | 'joke' | 'cheer' | 'high_five'): void {
    const now = performance.now();
    const charName = this.character.name.split(' ')[0];

    switch (action) {
      case 'hello':
        this.triggerReaction(
          CompanionState.CELEBRATING,
          'wave',
          `Hello! 👋 I'm ${charName}! Let's make some cartoon magic together!`,
          3.0,
          now
        );
        break;

      case 'wave':
        this.triggerReaction(
          CompanionState.CELEBRATING,
          'wave',
          `Waving back at you! You're my favorite pal! 👋`,
          2.8,
          now
        );
        break;

      case 'dance':
        this.triggerReaction(
          CompanionState.EXCITED,
          'dance',
          `Dance party! 💃 Shake your shoulders and wiggle with me!`,
          3.2,
          now
        );
        break;

      case 'jump':
        this.triggerReaction(
          CompanionState.EXCITED,
          'jump',
          `Jump jump jump! 🦘 Look at us flying high!`,
          2.8,
          now
        );
        break;

      case 'joke':
        const jokes = [
          `Why do birds fly south? Because it's too far to walk! Hehehe! 😂`,
          `What kind of shoes do ninjas wear? Sneakers! 🥷 Hehehe!`,
          `What did zero say to eight? Nice belt! 8️⃣ Hehehe!`,
          `Why did the cookie go to the doctor? Because it felt crummy! 🍪 Hehehe!`,
        ];
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        this.triggerReaction(CompanionState.SPEAKING, 'laugh', randomJoke, 3.5, now);
        break;

      case 'cheer':
        this.triggerReaction(
          CompanionState.CELEBRATING,
          'cheer',
          `You're an absolute champion! 🎉 Woohoo! Keep shining!`,
          3.0,
          now
        );
        break;

      case 'high_five':
        this.triggerReaction(
          CompanionState.CELEBRATING,
          'high_five',
          `Boom! High five across the screen! 🖐️⚡ Awesome!`,
          2.8,
          now
        );
        break;
    }
  }
}
