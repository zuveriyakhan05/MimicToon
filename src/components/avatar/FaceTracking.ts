import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { FaceSignals } from '../../types/avatar';
import { getSharedVisionFileset } from '../../utils/visionLoader';

export interface FaceTrackingOptions {
  isMirrored?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  onFaceSignals?: (signals: FaceSignals) => void;
}

/**
 * Key MediaPipe Face Mesh Landmark indices (from the 468/478 mesh model)
 */
const FACE_LANDMARKS = {
  // Center
  noseTip: 1,
  subnasale: 2,
  noseBridge: 168,
  forehead: 10,
  chin: 152,

  // Mouth
  upperLipTop: 0,
  upperLipBottom: 13,
  lowerLipTop: 14,
  lowerLipBottom: 17,
  mouthLeftCorner: 61,
  mouthRightCorner: 291,

  // Left Eye
  leftEyeOuter: 33,
  leftEyeInner: 133,
  leftEyeTop: 159,
  leftEyeBottom: 145,

  // Right Eye
  rightEyeOuter: 263,
  rightEyeInner: 362,
  rightEyeTop: 386,
  rightEyeBottom: 374,

  // Eyebrows
  leftEyebrowOuter: 70,
  leftEyebrowInner: 107,
  rightEyebrowInner: 336,
  rightEyebrowOuter: 300,

  // Face contours
  leftCheek: 234,
  rightCheek: 454,
};

/**
 * FaceTracking loads and orchestrates the MediaPipe FaceLandmarker model.
 * Extracts facial blendshape coefficients and normalized geometric signals.
 */
export class FaceTracking {
  private faceLandmarker: any = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private isMirrored: boolean = true;
  private lastVideoTime: number = -1;

  // Cached last valid face signals
  private lastSignals: FaceSignals = {
    timestamp: 0,
    isDetected: false,
    confidence: 0,
    mouthOpen: 0,
    mouthSmile: 0,
    mouthFrown: 0,
    mouthPucker: 0,
    browRaise: 0,
    browFurrow: 0,
    blinkLeft: 0,
    blinkRight: 0,
    headRotation: { pitch: 0, yaw: 0, roll: 0 },
    faceDirection: { x: 0, y: 0, z: 1 },
  };

  constructor(options: FaceTrackingOptions = {}) {
    this.isMirrored = options.isMirrored ?? true;
  }

  /**
   * Initializes the MediaPipe Face Landmarker model via CDN
   */
  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;

    try {
      // 1. Load shared WASM binary fileset
      const vision = await getSharedVisionFileset();

      // 2. Try GPU delegate first for 60fps inference
      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuErr) {
        console.warn('FaceLandmarker GPU delegate failed, falling back to CPU:', gpuErr);
        // Fallback to CPU delegate
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe FaceLandmarker:', err);
      this.isInitializing = false;
      this.isReady = false;
      return false;
    }
  }

  public setMirrored(mirrored: boolean): void {
    this.isMirrored = mirrored;
  }

  public isLoaded(): boolean {
    return this.isReady;
  }

  /**
   * Process a live HTMLVideoElement frame and extract normalized FaceSignals
   */
  public processVideoFrame(video: HTMLVideoElement, timestamp: number): FaceSignals | null {
    if (!this.isReady || !this.faceLandmarker || video.readyState < 2) {
      return null;
    }

    // Avoid running detection on the same video frame multiple times
    if (video.currentTime === this.lastVideoTime) {
      return this.lastSignals;
    }
    this.lastVideoTime = video.currentTime;

    try {
      const results = this.faceLandmarker.detectForVideo(video, timestamp);

      if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
        this.lastSignals = {
          ...this.lastSignals,
          isDetected: false,
          confidence: 0,
          timestamp,
        };
        return this.lastSignals;
      }

      const landmarks = results.faceLandmarks[0];
      const blendshapesMap: Record<string, number> = {};

      // 1. Extract Blendshapes if available
      if (results.faceBlendshapes && results.faceBlendshapes[0]?.categories) {
        for (const cat of results.faceBlendshapes[0].categories) {
          blendshapesMap[cat.categoryName] = cat.score;
        }
      }

      // 2. Extract Head Rotation from transformation matrix or 3D landmarks
      const headRot = this.calculateHeadRotation(
        results.facialTransformationMatrixes?.[0]?.data,
        landmarks
      );

      // 3. Extract Gaze / Face Direction
      const faceDir = this.calculateFaceDirection(landmarks);

      // 4. Calculate Mouth Open, Smile, Frown
      let mouthOpen = 0;
      let mouthSmile = 0;
      let mouthFrown = 0;
      let mouthPucker = 0;

      if (blendshapesMap['jawOpen'] !== undefined) {
        mouthOpen = Math.min(1.0, (blendshapesMap['jawOpen'] || 0) * 1.35);
        mouthSmile = Math.min(
          1.0,
          ((blendshapesMap['mouthSmileLeft'] || 0) + (blendshapesMap['mouthSmileRight'] || 0)) * 0.75
        );
        mouthFrown = Math.min(
          1.0,
          ((blendshapesMap['mouthFrownLeft'] || 0) + (blendshapesMap['mouthFrownRight'] || 0)) * 0.9
        );
        mouthPucker = blendshapesMap['mouthPucker'] || 0;
      } else {
        // Geometric fallback
        mouthOpen = this.calculateGeometricMouthOpen(landmarks);
        mouthSmile = this.calculateGeometricSmile(landmarks);
        mouthFrown = this.calculateGeometricFrown(landmarks);
      }

      // 5. Eyebrow movements
      let browRaise = 0;
      let browFurrow = 0;

      if (blendshapesMap['browInnerUp'] !== undefined) {
        browRaise = Math.max(
          blendshapesMap['browInnerUp'] || 0,
          ((blendshapesMap['browOuterUpLeft'] || 0) + (blendshapesMap['browOuterUpRight'] || 0)) * 0.5
        );
        browFurrow =
          ((blendshapesMap['browDownLeft'] || 0) + (blendshapesMap['browDownRight'] || 0)) * 0.5;
      } else {
        browRaise = this.calculateGeometricBrowRaise(landmarks);
        browFurrow = this.calculateGeometricBrowFurrow(landmarks);
      }

      // 6. Eye Blinking
      let blinkLeft = 0;
      let blinkRight = 0;

      if (blendshapesMap['eyeBlinkLeft'] !== undefined) {
        blinkLeft = blendshapesMap['eyeBlinkLeft'] || 0;
        blinkRight = blendshapesMap['eyeBlinkRight'] || 0;
      } else {
        const blinks = this.calculateGeometricBlink(landmarks);
        blinkLeft = blinks.left;
        blinkRight = blinks.right;
      }

      // Adjust for webcam mirroring if enabled
      if (this.isMirrored) {
        headRot.yaw = -headRot.yaw;
        headRot.roll = -headRot.roll;
        faceDir.x = -faceDir.x;
        const tempBlink = blinkLeft;
        blinkLeft = blinkRight;
        blinkRight = tempBlink;
      }

      const signals: FaceSignals = {
        timestamp,
        isDetected: true,
        confidence: 0.92,
        mouthOpen: clamp01(mouthOpen),
        mouthSmile: clamp01(mouthSmile),
        mouthFrown: clamp01(mouthFrown),
        mouthPucker: clamp01(mouthPucker),
        browRaise: clamp01(browRaise),
        browFurrow: clamp01(browFurrow),
        blinkLeft: clamp01(blinkLeft),
        blinkRight: clamp01(blinkRight),
        headRotation: headRot,
        faceDirection: faceDir,
        blendshapes: blendshapesMap,
        rawLandmarks: landmarks,
      };

      this.lastSignals = signals;
      return signals;
    } catch (err) {
      console.warn('Error during FaceLandmarker video frame inference:', err);
      return this.lastSignals;
    }
  }

  /**
   * Computes head pitch, yaw, and roll in radians
   */
  private calculateHeadRotation(
    matrixData?: number[],
    landmarks?: Array<{ x: number; y: number; z: number }>
  ): { pitch: number; yaw: number; roll: number } {
    // A. Preferred: If MediaPipe provides the 4x4 facial transformation matrix
    if (matrixData && matrixData.length === 16) {
      // Extract Euler angles from 4x4 rotation matrix
      // Matrix indices:
      // m00(0)  m01(1)  m02(2)  m03(3)
      // m10(4)  m11(5)  m12(6)  m13(7)
      // m20(8)  m21(9)  m22(10) m23(11)
      const m12 = matrixData[6];
      const m22 = matrixData[10];
      const m02 = matrixData[2];
      const m01 = matrixData[1];
      const m00 = matrixData[0];

      let pitch = Math.asin(clamp(m12, -1, 1));
      let yaw = Math.atan2(-m02, m22);
      let roll = Math.atan2(m01, m00);

      return {
        pitch: clamp(pitch, -0.65, 0.65),
        yaw: clamp(yaw, -0.85, 0.85),
        roll: clamp(roll, -0.65, 0.65),
      };
    }

    // B. Geometric calculation fallback from 3D landmarks
    if (!landmarks) return { pitch: 0, yaw: 0, roll: 0 };

    const nose = landmarks[FACE_LANDMARKS.noseTip];
    const bridge = landmarks[FACE_LANDMARKS.noseBridge];
    const forehead = landmarks[FACE_LANDMARKS.forehead];
    const chin = landmarks[FACE_LANDMARKS.chin];
    const leftCheek = landmarks[FACE_LANDMARKS.leftCheek];
    const rightCheek = landmarks[FACE_LANDMARKS.rightCheek];
    const leftEye = landmarks[FACE_LANDMARKS.leftEyeOuter];
    const rightEye = landmarks[FACE_LANDMARKS.rightEyeOuter];

    if (!nose || !bridge || !chin || !leftCheek || !rightCheek) {
      return { pitch: 0, yaw: 0, roll: 0 };
    }

    // Roll: angle between left and right eye in the XY plane
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const roll = Math.atan2(dy, dx);

    // Yaw: asymmetry of nose position between cheeks
    const midCheekX = (leftCheek.x + rightCheek.x) / 2;
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x) || 0.1;
    const yawOffset = (nose.x - midCheekX) / faceWidth;
    const yaw = clamp(yawOffset * 2.2, -0.8, 0.8);

    // Pitch: relative position of nose between forehead and chin
    const faceHeight = Math.abs(chin.y - forehead.y) || 0.1;
    const noseRelativeY = (nose.y - forehead.y) / faceHeight;
    // Normal resting noseRelativeY is approx 0.6
    const pitchOffset = (noseRelativeY - 0.6) / 0.3;
    const pitch = clamp(pitchOffset * 1.5, -0.6, 0.6);

    return { pitch, yaw, roll };
  }

  /**
   * Computes face direction vector for eye pupil gaze tracking
   */
  private calculateFaceDirection(
    landmarks: Array<{ x: number; y: number; z: number }>
  ): { x: number; y: number; z: number } {
    const nose = landmarks[FACE_LANDMARKS.noseTip];
    const leftEye = landmarks[FACE_LANDMARKS.leftEyeInner];
    const rightEye = landmarks[FACE_LANDMARKS.rightEyeInner];

    if (!nose || !leftEye || !rightEye) return { x: 0, y: 0, z: 1 };

    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;

    const gazeX = clamp((nose.x - eyeCenterX) * 6.0, -1.0, 1.0);
    const gazeY = clamp((nose.y - eyeCenterY - 0.05) * 6.0, -1.0, 1.0);

    return { x: gazeX, y: gazeY, z: 1.0 };
  }

  // Geometric fallbacks for mouth, eyes, eyebrows
  private calculateGeometricMouthOpen(landmarks: Array<{ x: number; y: number; z: number }>): number {
    const topLip = landmarks[FACE_LANDMARKS.upperLipBottom];
    const bottomLip = landmarks[FACE_LANDMARKS.lowerLipTop];
    const leftCorner = landmarks[FACE_LANDMARKS.mouthLeftCorner];
    const rightCorner = landmarks[FACE_LANDMARKS.mouthRightCorner];

    if (!topLip || !bottomLip || !leftCorner || !rightCorner) return 0;

    const lipGap = Math.hypot(topLip.x - bottomLip.x, topLip.y - bottomLip.y);
    const mouthWidth = Math.hypot(leftCorner.x - rightCorner.x, leftCorner.y - rightCorner.y) || 0.1;

    const ratio = lipGap / mouthWidth;
    // Resting closed ratio is ~0.05 to 0.10, wide open is ~0.65+
    return clamp01((ratio - 0.08) / 0.5);
  }

  private calculateGeometricSmile(landmarks: Array<{ x: number; y: number; z: number }>): number {
    const topLip = landmarks[FACE_LANDMARKS.upperLipTop];
    const leftCorner = landmarks[FACE_LANDMARKS.mouthLeftCorner];
    const rightCorner = landmarks[FACE_LANDMARKS.mouthRightCorner];
    const leftCheek = landmarks[FACE_LANDMARKS.leftCheek];
    const rightCheek = landmarks[FACE_LANDMARKS.rightCheek];

    if (!topLip || !leftCorner || !rightCorner || !leftCheek || !rightCheek) return 0;

    const cornerAvgY = (leftCorner.y + rightCorner.y) / 2;
    // Smiling elevates mouth corners above the center of the lip
    const elevation = (topLip.y - cornerAvgY) * 12.0;

    const mouthWidth = Math.hypot(leftCorner.x - rightCorner.x, leftCorner.y - rightCorner.y);
    const faceWidth = Math.hypot(leftCheek.x - rightCheek.x, leftCheek.y - rightCheek.y) || 0.1;
    const widthRatio = (mouthWidth / faceWidth - 0.38) * 4.0;

    return clamp01(Math.max(elevation, widthRatio));
  }

  private calculateGeometricFrown(landmarks: Array<{ x: number; y: number; z: number }>): number {
    const bottomLip = landmarks[FACE_LANDMARKS.lowerLipBottom];
    const leftCorner = landmarks[FACE_LANDMARKS.mouthLeftCorner];
    const rightCorner = landmarks[FACE_LANDMARKS.mouthRightCorner];

    if (!bottomLip || !leftCorner || !rightCorner) return 0;

    const cornerAvgY = (leftCorner.y + rightCorner.y) / 2;
    // Frowning pulls mouth corners down relative to lower lip
    const depression = (cornerAvgY - bottomLip.y) * 14.0;
    return clamp01(depression);
  }

  private calculateGeometricBrowRaise(landmarks: Array<{ x: number; y: number; z: number }>): number {
    const leftBrow = landmarks[FACE_LANDMARKS.leftEyebrowInner];
    const rightBrow = landmarks[FACE_LANDMARKS.rightEyebrowInner];
    const leftEye = landmarks[FACE_LANDMARKS.leftEyeTop];
    const rightEye = landmarks[FACE_LANDMARKS.rightEyeTop];

    if (!leftBrow || !rightBrow || !leftEye || !rightEye) return 0;

    const leftDist = leftEye.y - leftBrow.y;
    const rightDist = rightEye.y - rightBrow.y;
    const avgDist = (leftDist + rightDist) / 2;

    // Baseline resting brow distance is ~0.04
    return clamp01((avgDist - 0.042) / 0.035);
  }

  private calculateGeometricBrowFurrow(landmarks: Array<{ x: number; y: number; z: number }>): number {
    const leftBrow = landmarks[FACE_LANDMARKS.leftEyebrowInner];
    const rightBrow = landmarks[FACE_LANDMARKS.rightEyebrowInner];

    if (!leftBrow || !rightBrow) return 0;

    const browDist = Math.hypot(leftBrow.x - rightBrow.x, leftBrow.y - rightBrow.y);
    // When furrowing/scowling, the distance between inner brows contracts
    return clamp01((0.075 - browDist) / 0.03);
  }

  private calculateGeometricBlink(landmarks: Array<{ x: number; y: number; z: number }>): {
    left: number;
    right: number;
  } {
    const leftTop = landmarks[FACE_LANDMARKS.leftEyeTop];
    const leftBottom = landmarks[FACE_LANDMARKS.leftEyeBottom];
    const leftOuter = landmarks[FACE_LANDMARKS.leftEyeOuter];
    const leftInner = landmarks[FACE_LANDMARKS.leftEyeInner];

    const rightTop = landmarks[FACE_LANDMARKS.rightEyeTop];
    const rightBottom = landmarks[FACE_LANDMARKS.rightEyeBottom];
    const rightOuter = landmarks[FACE_LANDMARKS.rightEyeOuter];
    const rightInner = landmarks[FACE_LANDMARKS.rightEyeInner];

    if (!leftTop || !leftBottom || !rightTop || !rightBottom) {
      return { left: 0, right: 0 };
    }

    const leftHeight = Math.hypot(leftTop.x - leftBottom.x, leftTop.y - leftBottom.y);
    const leftWidth = Math.hypot(leftOuter.x - leftInner.x, leftOuter.y - leftInner.y) || 0.05;
    const leftEAR = leftHeight / leftWidth;

    const rightHeight = Math.hypot(rightTop.x - rightBottom.x, rightTop.y - rightBottom.y);
    const rightWidth = Math.hypot(rightOuter.x - rightInner.x, rightOuter.y - rightInner.y) || 0.05;
    const rightEAR = rightHeight / rightWidth;

    // Normal open EAR is ~0.25 - 0.35; closed/blinking is < 0.15
    const blinkL = clamp01((0.20 - leftEAR) / 0.12);
    const blinkR = clamp01((0.20 - rightEAR) / 0.12);

    return { left: blinkL, right: blinkR };
  }

  public getLastSignals(): FaceSignals {
    return this.lastSignals;
  }

  public isModelReady(): boolean {
    return this.isReady;
  }

  public dispose(): void {
    if (this.faceLandmarker) {
      try {
        this.faceLandmarker.close();
      } catch (e) {
        // Ignore cleanup errors
      }
      this.faceLandmarker = null;
    }
    this.isReady = false;
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function clamp01(val: number): number {
  return Math.min(Math.max(val, 0), 1);
}
