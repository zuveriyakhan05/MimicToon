import {
  HandType,
  HandGestureType,
  SingleHandData,
  GestureEvent,
  FingerState,
} from '../../types/avatar';

export type GestureEventListener = (event: GestureEvent) => void;

interface HandGestureState {
  currentGesture: HandGestureType;
  pendingGesture: HandGestureType;
  pendingFrames: number;
  confidence: number;
  startTime: number;
  lastUpdateTime: number;
}

/**
 * GestureDetector processes hand landmark signals and finger articulators to identify
 * high-level child-friendly gestures:
 * - 'open_palm': All fingers spread open flat
 * - 'fist': All fingers and thumb curled tight
 * - 'thumbs_up': Thumb pointing up, other 4 fingers curled
 * - 'pointing': Index finger extended out, other fingers curled
 * - 'victory': Index and middle fingers extended in a V-shape, others curled
 * 
 * Features:
 * - Multi-frame debouncing / hysteresis to eliminate false positives
 * - Confidence scoring based on geometric consistency
 * - Clean event emission ('gesture_start', 'gesture_hold', 'gesture_end')
 * - Query API for interactive games, challenges, and high-five mechanics
 */
export class GestureDetector {
  private listeners: Set<GestureEventListener> = new Set();

  // Gesture state tracking for each hand
  private handStates: Record<HandType, HandGestureState> = {
    left: {
      currentGesture: 'none',
      pendingGesture: 'none',
      pendingFrames: 0,
      confidence: 0,
      startTime: 0,
      lastUpdateTime: 0,
    },
    right: {
      currentGesture: 'none',
      pendingGesture: 'none',
      pendingFrames: 0,
      confidence: 0,
      startTime: 0,
      lastUpdateTime: 0,
    },
  };

  // Minimum consecutive frames to confirm gesture transition (prevents flicker)
  private readonly CONFIRMATION_FRAMES = 3;
  // Threshold to emit periodic 'gesture_hold' updates (every 250ms)
  private readonly HOLD_EMIT_INTERVAL = 250;
  private lastHoldEmitTime: Record<HandType, number> = { left: 0, right: 0 };

  constructor() {}

  /**
   * Evaluates raw hand data and updates internal gesture state and event triggers
   */
  public processHand(handData: SingleHandData | null, hand: HandType): {
    gesture: HandGestureType;
    confidence: number;
  } {
    const now = performance.now();
    const state = this.handStates[hand];

    if (!handData || handData.confidence < 0.4) {
      // Hand lost or untracked
      if (state.currentGesture !== 'none') {
        const holdDuration = now - state.startTime;
        this.emitEvent({
          type: 'gesture_end',
          gesture: state.currentGesture,
          hand,
          confidence: state.confidence,
          holdDuration,
          timestamp: now,
        });
        state.currentGesture = 'none';
        state.pendingGesture = 'none';
        state.pendingFrames = 0;
        state.confidence = 0;
      }
      return { gesture: 'none', confidence: 0 };
    }

    // 1. Analyze geometric cues to detect candidate gesture
    const candidate = this.classifyHandGeometry(handData);

    // 2. Debounce and temporal confirmation
    if (candidate.gesture === state.currentGesture) {
      // Maintaining current gesture
      state.pendingGesture = candidate.gesture;
      state.pendingFrames = 0;
      state.confidence = candidate.confidence;
      state.lastUpdateTime = now;

      // Check if time to emit 'gesture_hold' event
      if (state.currentGesture !== 'none' && now - this.lastHoldEmitTime[hand] >= this.HOLD_EMIT_INTERVAL) {
        this.lastHoldEmitTime[hand] = now;
        this.emitEvent({
          type: 'gesture_hold',
          gesture: state.currentGesture,
          hand,
          confidence: state.confidence,
          holdDuration: now - state.startTime,
          timestamp: now,
        });
      }
    } else {
      // Different gesture candidate observed
      if (candidate.gesture === state.pendingGesture) {
        state.pendingFrames++;
        if (state.pendingFrames >= this.CONFIRMATION_FRAMES) {
          // Transition confirmed!
          const previousGesture = state.currentGesture;
          const holdDuration = now - state.startTime;

          if (previousGesture !== 'none') {
            this.emitEvent({
              type: 'gesture_end',
              gesture: previousGesture,
              hand,
              confidence: state.confidence,
              holdDuration,
              timestamp: now,
            });
          }

          state.currentGesture = candidate.gesture;
          state.confidence = candidate.confidence;
          state.startTime = now;
          state.lastUpdateTime = now;
          this.lastHoldEmitTime[hand] = now;
          state.pendingFrames = 0;

          if (candidate.gesture !== 'none') {
            this.emitEvent({
              type: 'gesture_start',
              gesture: candidate.gesture,
              hand,
              confidence: candidate.confidence,
              holdDuration: 0,
              timestamp: now,
            });
          }
        }
      } else {
        state.pendingGesture = candidate.gesture;
        state.pendingFrames = 1;
      }
    }

    return {
      gesture: state.currentGesture,
      confidence: state.confidence,
    };
  }

  /**
   * Pure geometric classifier that inspects finger curl, extension, and direction vectors
   */
  public classifyHandGeometry(handData: SingleHandData): {
    gesture: HandGestureType;
    confidence: number;
  } {
    const { fingers, wrist, rawLandmarks } = handData;
    const { thumb, index, middle, ring, pinky } = fingers;

    // Curl values (0 = straight extended, 1 = curled in)
    const tCurl = thumb.curl;
    const iCurl = index.curl;
    const mCurl = middle.curl;
    const rCurl = ring.curl;
    const pCurl = pinky.curl;

    // 1. THUMBS UP CHECK
    // Requirements:
    // - Thumb extended (tCurl < 0.35)
    // - Other 4 fingers curled tight (iCurl > 0.55, mCurl > 0.55, rCurl > 0.55, pCurl > 0.55)
    // - Thumb tip is vertically higher than thumb MCP and wrist (in screen coordinates y is smaller when higher)
    const isThumbPointingUp = thumb.tip.y < thumb.mcp.y - 0.04 && thumb.tip.y < wrist.y - 0.05;
    const fingersCurledForThumbsUp = iCurl > 0.55 && mCurl > 0.55 && rCurl > 0.55 && pCurl > 0.55;

    if (tCurl < 0.35 && fingersCurledForThumbsUp && isThumbPointingUp) {
      const confidence = Math.min(
        1.0,
        (1.0 - tCurl) * 0.4 + ((iCurl + mCurl + rCurl + pCurl) / 4) * 0.6
      );
      return { gesture: 'thumbs_up', confidence };
    }

    // 2. VICTORY / PEACE SIGN CHECK
    // Requirements:
    // - Index & Middle fingers extended (iCurl < 0.32, mCurl < 0.35)
    // - Ring & Pinky curled tight (rCurl > 0.55, pCurl > 0.55)
    // - Noticeable separation between index tip and middle tip (V-shape)
    const dx = index.tip.x - middle.tip.x;
    const dy = index.tip.y - middle.tip.y;
    const tipSeparation = Math.sqrt(dx * dx + dy * dy);
    const ringPinkyCurled = rCurl > 0.55 && pCurl > 0.55;

    if (iCurl < 0.32 && mCurl < 0.35 && ringPinkyCurled && tipSeparation > 0.035) {
      const extScore = (1.0 - (iCurl + mCurl) / 2);
      const curlScore = (rCurl + pCurl) / 2;
      const confidence = Math.min(1.0, extScore * 0.5 + curlScore * 0.5);
      return { gesture: 'victory', confidence };
    }

    // 3. POINTING CHECK
    // Requirements:
    // - Index finger extended straight (iCurl < 0.28)
    // - Middle, Ring, Pinky curled in (mCurl > 0.55, rCurl > 0.55, pCurl > 0.55)
    // - Thumb can be curled or relaxed
    const otherThreeCurled = mCurl > 0.55 && rCurl > 0.55 && pCurl > 0.55;

    if (iCurl < 0.28 && otherThreeCurled && !(tCurl < 0.3 && isThumbPointingUp)) {
      const confidence = Math.min(
        1.0,
        (1.0 - iCurl) * 0.5 + ((mCurl + rCurl + pCurl) / 3) * 0.5
      );
      return { gesture: 'pointing', confidence };
    }

    // 4. FIST CHECK
    // Requirements:
    // - All 4 fingers curled tight (iCurl > 0.65, mCurl > 0.65, rCurl > 0.65, pCurl > 0.65)
    // - Thumb curled or folded over fingers (tCurl > 0.45)
    if (iCurl > 0.65 && mCurl > 0.65 && rCurl > 0.65 && pCurl > 0.65 && tCurl > 0.45) {
      const avgCurl = (iCurl + mCurl + rCurl + pCurl + tCurl) / 5;
      const confidence = Math.min(1.0, (avgCurl - 0.45) / 0.55);
      return { gesture: 'fist', confidence };
    }

    // 5. OPEN PALM CHECK
    // Requirements:
    // - All 4 main fingers extended (iCurl < 0.30, mCurl < 0.30, rCurl < 0.32, pCurl < 0.35)
    // - Thumb extended or relaxed (tCurl < 0.45)
    if (iCurl < 0.30 && mCurl < 0.30 && rCurl < 0.32 && pCurl < 0.35 && tCurl < 0.45) {
      const avgExt = 1.0 - (iCurl + mCurl + rCurl + pCurl + tCurl) / 5;
      const confidence = Math.min(1.0, avgExt * 1.1);
      return { gesture: 'open_palm', confidence };
    }

    return { gesture: 'none', confidence: 0 };
  }

  /**
   * Registers an event listener for gesture transitions and hold events
   */
  public addEventListener(listener: GestureEventListener): () => void {
    this.listeners.add(listener);
    return () => this.removeEventListener(listener);
  }

  /**
   * Unregisters an event listener
   */
  public removeEventListener(listener: GestureEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Internal dispatcher for gesture events
   */
  private emitEvent(event: GestureEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in gesture event listener:', err);
      }
    }
  }

  /**
   * Returns current active gesture for one or both hands
   */
  public getActiveGestures(): { left: HandGestureType; right: HandGestureType } {
    return {
      left: this.handStates.left.currentGesture,
      right: this.handStates.right.currentGesture,
    };
  }

  /**
   * Check if a specific gesture is currently active
   */
  public isGestureActive(gesture: HandGestureType, hand?: HandType): boolean {
    if (hand) {
      return this.handStates[hand].currentGesture === gesture;
    }
    return (
      this.handStates.left.currentGesture === gesture ||
      this.handStates.right.currentGesture === gesture
    );
  }

  /**
   * Returns how long a gesture has been continuously held (in milliseconds)
   */
  public getGestureHoldDuration(gesture: HandGestureType, hand: HandType): number {
    const state = this.handStates[hand];
    if (state.currentGesture === gesture) {
      return performance.now() - state.startTime;
    }
    return 0;
  }

  /**
   * Resets internal gesture states
   */
  public reset(): void {
    this.handStates.left = {
      currentGesture: 'none',
      pendingGesture: 'none',
      pendingFrames: 0,
      confidence: 0,
      startTime: 0,
      lastUpdateTime: 0,
    };
    this.handStates.right = {
      currentGesture: 'none',
      pendingGesture: 'none',
      pendingFrames: 0,
      confidence: 0,
      startTime: 0,
      lastUpdateTime: 0,
    };
  }
}
