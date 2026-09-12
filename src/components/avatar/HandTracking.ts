import { HandLandmarker } from '@mediapipe/tasks-vision';
import {
  HandSignals,
  SingleHandData,
  HandType,
  FingerName,
  FingerState,
  GestureEvent,
} from '../../types/avatar';
import { GestureDetector } from './GestureDetector';
import { getSharedVisionFileset } from '../../utils/visionLoader';

export interface HandTrackingOptions {
  isMirrored?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  onGestureEvent?: (event: GestureEvent) => void;
}

/**
 * Landmark indices for MediaPipe HandLandmarker (21 3D points)
 */
export const HAND_LANDMARK_INDICES = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

/**
 * Hand connections for drawing clean skeleton overlays
 */
export const HAND_CONNECTIONS: [number, number][] = [
  // Palm base
  [0, 1], [1, 2], [2, 5], [5, 9], [9, 13], [13, 17], [17, 0],
  // Thumb
  [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
];

/**
 * HandTracking loads and runs MediaPipe HandLandmarker at 60 FPS.
 * Features:
 * - Detects up to 2 hands (left and right) simultaneously
 * - Accurate left/right hand identification with mirror mode handling
 * - Velocity-adaptive exponential moving average (EMA) landmark smoothing
 * - Anatomical finger curl and spread calculations
 * - 3D palm center, palm normal vector, and wrist Euler rotation
 * - Integrated GestureDetector with clean event emission
 */
export class HandTracking {
  private handLandmarker: any = null;
  private isInitializing = false;
  private isReady = false;
  private isMirrored = true;
  private lastVideoTime = -1;

  // Smoothing buffers: HandType -> Array of 21 smoothed {x, y, z} points
  private smoothedLandmarks: Record<HandType, Array<{ x: number; y: number; z: number }> | null> = {
    left: null,
    right: null,
  };

  // Dedicated gesture detector instance
  public gestureDetector: GestureDetector;

  // Last computed hand signals
  private lastSignals: HandSignals = {
    timestamp: 0,
    leftHand: null,
    rightHand: null,
  };

  constructor(options: HandTrackingOptions = {}) {
    this.isMirrored = options.isMirrored ?? true;
    this.gestureDetector = new GestureDetector();
    if (options.onGestureEvent) {
      this.gestureDetector.addEventListener(options.onGestureEvent);
    }
  }

  /**
   * Initializes the MediaPipe Hand Landmarker model
   */
  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;

    try {
      // 1. Load shared WASM binary fileset
      const vision = await getSharedVisionFileset();

      // 2. Try GPU delegate first for 60fps performance
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuErr) {
        console.warn('HandLandmarker GPU delegate failed, falling back to CPU:', gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe HandLandmarker:', err);
      this.isInitializing = false;
      this.isReady = false;
      return false;
    }
  }

  public setMirrored(mirrored: boolean): void {
    this.isMirrored = mirrored;
  }

  public isModelReady(): boolean {
    return this.isReady && !!this.handLandmarker;
  }

  /**
   * Processes a video frame and produces HandSignals for left & right hands
   */
  public processVideoFrame(video: HTMLVideoElement, timestamp: number): HandSignals {
    if (!this.isReady || !this.handLandmarker || !video || video.readyState < 2) {
      return this.lastSignals;
    }

    // Skip duplicate frames
    if (video.currentTime === this.lastVideoTime) {
      return this.lastSignals;
    }
    this.lastVideoTime = video.currentTime;

    try {
      const results = this.handLandmarker.detectForVideo(video, timestamp);

      if (!results || !results.landmarks || results.landmarks.length === 0) {
        // Reset smoothing when hands are not in view
        this.smoothedLandmarks.left = null;
        this.smoothedLandmarks.right = null;

        // Process empty hands through gesture detector to trigger gesture_end if held
        this.gestureDetector.processHand(null, 'left');
        this.gestureDetector.processHand(null, 'right');

        this.lastSignals = {
          timestamp,
          leftHand: null,
          rightHand: null,
        };
        return this.lastSignals;
      }

      let detectedLeft: SingleHandData | null = null;
      let detectedRight: SingleHandData | null = null;

      for (let i = 0; i < results.landmarks.length; i++) {
        const rawPoints = results.landmarks[i];
        if (!rawPoints || rawPoints.length < 21) continue;

        // Determine handedness with mirror adjustment
        // MediaPipe handedness gives categoryName: "Left" or "Right"
        // Under front-facing mirrored camera, MediaPipe "Right" corresponds to the user's right hand.
        // If not mirrored, Left and Right are inverted.
        const handednessInfo = results.handedness?.[i]?.[0];
        let handCategory: HandType = 'right';

        if (handednessInfo) {
          const rawCat = handednessInfo.categoryName.toLowerCase();
          if (this.isMirrored) {
            // In mirrored selfie mode, MediaPipe's "Left" is the person's left hand
            handCategory = rawCat === 'left' ? 'left' : 'right';
          } else {
            // In un-mirrored mode, invert
            handCategory = rawCat === 'left' ? 'right' : 'left';
          }
        } else {
          // Fallback: use screen X coordinate (left side of mirrored screen is user's left hand)
          handCategory = rawPoints[0].x > 0.5 ? 'right' : 'left';
        }

        const confidence = handednessInfo?.score ?? 0.8;

        // Smooth landmarks with velocity-adaptive EMA
        const smoothed = this.smoothLandmarks(rawPoints, handCategory);

        // Compute finger states and curls
        const fingers = this.computeFingerStates(smoothed, handCategory);

        // Compute palm center and normal vector
        const palmCenter = this.computePalmCenter(smoothed);
        const palmNormal = this.computePalmNormal(smoothed, handCategory);

        // Compute wrist Euler orientation
        const wristRotation = this.computeWristRotation(smoothed, palmNormal);

        // Calculate pinch distance (thumb tip to index tip)
        const thumbTip = smoothed[HAND_LANDMARK_INDICES.THUMB_TIP];
        const indexTip = smoothed[HAND_LANDMARK_INDICES.INDEX_TIP];
        const pinchDistance = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) +
          Math.pow(thumbTip.y - indexTip.y, 2) +
          Math.pow(thumbTip.z - indexTip.z, 2)
        );

        // Is hand raised above chest level? (y < 0.55 in normalized screen coordinates)
        const isRaised = smoothed[HAND_LANDMARK_INDICES.WRIST].y < 0.55;

        // Assemble preliminary SingleHandData
        const handData: SingleHandData = {
          hand: handCategory,
          confidence,
          wrist: { ...smoothed[HAND_LANDMARK_INDICES.WRIST] },
          palmCenter,
          palmNormal,
          wristRotation,
          fingers,
          pinchDistance,
          isRaised,
          gesture: 'none',
          gestureConfidence: 0,
          rawLandmarks: smoothed.map((p) => ({ ...p })),
        };

        // Classify and debounce gesture via GestureDetector
        const gestureResult = this.gestureDetector.processHand(handData, handCategory);
        handData.gesture = gestureResult.gesture;
        handData.gestureConfidence = gestureResult.confidence;

        if (handCategory === 'left') {
          detectedLeft = handData;
        } else {
          detectedRight = handData;
        }
      }

      // If one hand wasn't detected this frame, inform gesture detector
      if (!detectedLeft) {
        this.smoothedLandmarks.left = null;
        this.gestureDetector.processHand(null, 'left');
      }
      if (!detectedRight) {
        this.smoothedLandmarks.right = null;
        this.gestureDetector.processHand(null, 'right');
      }

      this.lastSignals = {
        timestamp,
        leftHand: detectedLeft,
        rightHand: detectedRight,
      };

      return this.lastSignals;
    } catch (err) {
      console.warn('Error processing hand tracking frame:', err);
      return this.lastSignals;
    }
  }

  /**
   * Applies velocity-adaptive Exponential Moving Average to eliminate landmark jitter
   */
  private smoothLandmarks(
    raw: Array<{ x: number; y: number; z: number }>,
    hand: HandType
  ): Array<{ x: number; y: number; z: number }> {
    const prev = this.smoothedLandmarks[hand];
    if (!prev || prev.length !== raw.length) {
      const cloned = raw.map((p) => ({ x: p.x, y: p.y, z: p.z }));
      this.smoothedLandmarks[hand] = cloned;
      return cloned;
    }

    const smoothed: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < raw.length; i++) {
      const pRaw = raw[i];
      const pPrev = prev[i];

      const dist = Math.sqrt(
        Math.pow(pRaw.x - pPrev.x, 2) +
        Math.pow(pRaw.y - pPrev.y, 2) +
        Math.pow(pRaw.z - pPrev.z, 2)
      );

      // Fast motion -> larger alpha (less smoothing, ultra-low latency)
      // Slow/stationary -> smaller alpha (heavy smoothing, rock-solid stability)
      const alpha = Math.min(0.85, Math.max(0.35, dist * 8));

      const sx = pPrev.x * (1 - alpha) + pRaw.x * alpha;
      const sy = pPrev.y * (1 - alpha) + pRaw.y * alpha;
      const sz = pPrev.z * (1 - alpha) + pRaw.z * alpha;

      smoothed.push({ x: sx, y: sy, z: sz });
    }

    this.smoothedLandmarks[hand] = smoothed;
    return smoothed;
  }

  /**
   * Calculates curl (0.0 to 1.0) and extension for all 5 fingers
   */
  private computeFingerStates(
    lm: Array<{ x: number; y: number; z: number }>,
    hand: HandType
  ): Record<FingerName, FingerState> {
    const wrist = lm[HAND_LANDMARK_INDICES.WRIST];

    // Helper: calculate 3D Euclidean distance
    const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
      return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
    };

    // Helper: calculate finger curl based on tip-to-wrist distance compared to MCP-to-wrist
    const calcFingerCurl = (mcpIdx: number, pipIdx: number, dipIdx: number, tipIdx: number): number => {
      const mcp = lm[mcpIdx];
      const pip = lm[pipIdx];
      const tip = lm[tipIdx];

      const tipWristDist = dist(tip, wrist);
      const mcpWristDist = dist(mcp, wrist);
      const fingerLength = dist(mcp, pip) + dist(pip, lm[dipIdx]) + dist(lm[dipIdx], tip);

      // Ratio of tip-to-wrist vs maximum possible extended distance
      const maxExt = mcpWristDist + fingerLength * 0.85;
      const minCurl = mcpWristDist * 0.9;

      const normalized = 1.0 - (tipWristDist - minCurl) / Math.max(0.01, maxExt - minCurl);
      return Math.max(0, Math.min(1, normalized));
    };

    // 1. Index
    const iCurl = calcFingerCurl(
      HAND_LANDMARK_INDICES.INDEX_MCP,
      HAND_LANDMARK_INDICES.INDEX_PIP,
      HAND_LANDMARK_INDICES.INDEX_DIP,
      HAND_LANDMARK_INDICES.INDEX_TIP
    );

    // 2. Middle
    const mCurl = calcFingerCurl(
      HAND_LANDMARK_INDICES.MIDDLE_MCP,
      HAND_LANDMARK_INDICES.MIDDLE_PIP,
      HAND_LANDMARK_INDICES.MIDDLE_DIP,
      HAND_LANDMARK_INDICES.MIDDLE_TIP
    );

    // 3. Ring
    const rCurl = calcFingerCurl(
      HAND_LANDMARK_INDICES.RING_MCP,
      HAND_LANDMARK_INDICES.RING_PIP,
      HAND_LANDMARK_INDICES.RING_DIP,
      HAND_LANDMARK_INDICES.RING_TIP
    );

    // 4. Pinky
    const pCurl = calcFingerCurl(
      HAND_LANDMARK_INDICES.PINKY_MCP,
      HAND_LANDMARK_INDICES.PINKY_PIP,
      HAND_LANDMARK_INDICES.PINKY_DIP,
      HAND_LANDMARK_INDICES.PINKY_TIP
    );

    // 5. Thumb: uses distance to pinky MCP base and IP angle
    const thumbTip = lm[HAND_LANDMARK_INDICES.THUMB_TIP];
    const thumbMcp = lm[HAND_LANDMARK_INDICES.THUMB_MCP];
    const pinkyMcp = lm[HAND_LANDMARK_INDICES.PINKY_MCP];
    const thumbPinkyDist = dist(thumbTip, pinkyMcp);
    const thumbMcpPinkyDist = dist(thumbMcp, pinkyMcp);

    // Thumb is extended when tip is far away from palm and pinky MCP
    const thumbExtendedRatio = thumbPinkyDist / Math.max(0.01, thumbMcpPinkyDist * 1.6);
    const tCurl = Math.max(0, Math.min(1, 1.0 - thumbExtendedRatio));

    return {
      thumb: {
        name: 'thumb',
        curl: tCurl,
        isExtended: tCurl < 0.35,
        tip: { ...thumbTip },
        mcp: { ...thumbMcp },
        pip: { ...lm[HAND_LANDMARK_INDICES.THUMB_IP] },
      },
      index: {
        name: 'index',
        curl: iCurl,
        isExtended: iCurl < 0.32,
        tip: { ...lm[HAND_LANDMARK_INDICES.INDEX_TIP] },
        mcp: { ...lm[HAND_LANDMARK_INDICES.INDEX_MCP] },
        pip: { ...lm[HAND_LANDMARK_INDICES.INDEX_PIP] },
        dip: { ...lm[HAND_LANDMARK_INDICES.INDEX_DIP] },
      },
      middle: {
        name: 'middle',
        curl: mCurl,
        isExtended: mCurl < 0.32,
        tip: { ...lm[HAND_LANDMARK_INDICES.MIDDLE_TIP] },
        mcp: { ...lm[HAND_LANDMARK_INDICES.MIDDLE_MCP] },
        pip: { ...lm[HAND_LANDMARK_INDICES.MIDDLE_PIP] },
        dip: { ...lm[HAND_LANDMARK_INDICES.MIDDLE_DIP] },
      },
      ring: {
        name: 'ring',
        curl: rCurl,
        isExtended: rCurl < 0.35,
        tip: { ...lm[HAND_LANDMARK_INDICES.RING_TIP] },
        mcp: { ...lm[HAND_LANDMARK_INDICES.RING_MCP] },
        pip: { ...lm[HAND_LANDMARK_INDICES.RING_PIP] },
        dip: { ...lm[HAND_LANDMARK_INDICES.RING_DIP] },
      },
      pinky: {
        name: 'pinky',
        curl: pCurl,
        isExtended: pCurl < 0.38,
        tip: { ...lm[HAND_LANDMARK_INDICES.PINKY_TIP] },
        mcp: { ...lm[HAND_LANDMARK_INDICES.PINKY_MCP] },
        pip: { ...lm[HAND_LANDMARK_INDICES.PINKY_PIP] },
        dip: { ...lm[HAND_LANDMARK_INDICES.PINKY_DIP] },
      },
    };
  }

  /**
   * Computes center of the palm from wrist, index MCP, and pinky MCP
   */
  private computePalmCenter(lm: Array<{ x: number; y: number; z: number }>): {
    x: number;
    y: number;
    z: number;
  } {
    const wrist = lm[HAND_LANDMARK_INDICES.WRIST];
    const indexMcp = lm[HAND_LANDMARK_INDICES.INDEX_MCP];
    const pinkyMcp = lm[HAND_LANDMARK_INDICES.PINKY_MCP];
    const middleMcp = lm[HAND_LANDMARK_INDICES.MIDDLE_MCP];

    return {
      x: (wrist.x + indexMcp.x + pinkyMcp.x + middleMcp.x) / 4,
      y: (wrist.y + indexMcp.y + pinkyMcp.y + middleMcp.y) / 4,
      z: (wrist.z + indexMcp.z + pinkyMcp.z + middleMcp.z) / 4,
    };
  }

  /**
   * Computes normal unit vector pointing outward from the palm face
   */
  private computePalmNormal(
    lm: Array<{ x: number; y: number; z: number }>,
    hand: HandType
  ): { x: number; y: number; z: number } {
    const wrist = lm[HAND_LANDMARK_INDICES.WRIST];
    const indexMcp = lm[HAND_LANDMARK_INDICES.INDEX_MCP];
    const pinkyMcp = lm[HAND_LANDMARK_INDICES.PINKY_MCP];

    // Vector along length of palm (wrist to knuckles)
    const v1 = {
      x: indexMcp.x - wrist.x,
      y: indexMcp.y - wrist.y,
      z: indexMcp.z - wrist.z,
    };

    // Vector across width of palm (pinky to index)
    const v2 = {
      x: indexMcp.x - pinkyMcp.x,
      y: indexMcp.y - pinkyMcp.y,
      z: indexMcp.z - pinkyMcp.z,
    };

    // Cross product (v1 x v2)
    let nx = v1.y * v2.z - v1.z * v2.y;
    let ny = v1.z * v2.x - v1.x * v2.z;
    let nz = v1.x * v2.y - v1.y * v2.x;

    if (hand === 'left') {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }

    const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    return {
      x: nx / length,
      y: ny / length,
      z: nz / length,
    };
  }

  /**
   * Computes wrist Euler orientation angles (pitch, yaw, roll)
   */
  private computeWristRotation(
    lm: Array<{ x: number; y: number; z: number }>,
    palmNormal: { x: number; y: number; z: number }
  ): { pitch: number; yaw: number; roll: number } {
    const wrist = lm[HAND_LANDMARK_INDICES.WRIST];
    const middleMcp = lm[HAND_LANDMARK_INDICES.MIDDLE_MCP];

    // Longitudinal direction of the hand
    const dx = middleMcp.x - wrist.x;
    const dy = middleMcp.y - wrist.y;
    const dz = middleMcp.z - wrist.z;

    const yaw = Math.atan2(dx, -dz);
    const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    const roll = Math.atan2(palmNormal.x, palmNormal.y);

    return {
      pitch: Math.max(-1.2, Math.min(1.2, pitch)),
      yaw: Math.max(-1.2, Math.min(1.2, yaw)),
      roll: Math.max(-1.5, Math.min(1.5, roll)),
    };
  }

  /**
   * Cleans up resources
   */
  public dispose(): void {
    if (this.handLandmarker) {
      try {
        this.handLandmarker.close();
      } catch (err) {
        console.warn('Error closing HandLandmarker:', err);
      }
      this.handLandmarker = null;
    }
    this.isReady = false;
    this.isInitializing = false;
    this.smoothedLandmarks.left = null;
    this.smoothedLandmarks.right = null;
    this.gestureDetector.reset();
  }
}
