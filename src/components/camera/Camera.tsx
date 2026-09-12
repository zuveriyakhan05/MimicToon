import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera as CameraIcon,
  CameraOff,
  RefreshCw,
  Eye,
  EyeOff,
  FlipHorizontal,
  Sparkles,
  AlertCircle,
  Activity,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Smile,
} from 'lucide-react';
import {
  BodyMotion,
  PoseLandmarks,
  Landmark,
  CameraStatus,
  AvatarKinematics,
  PerformanceMetrics,
} from '../../types';
import { FaceSignals, AvatarFacePose, AvatarFaceExpressionType, HandSignals } from '../../types/avatar';
import { FaceTracking } from '../avatar/FaceTracking';
import { FaceExpressionMapper } from '../avatar/FaceExpressionMapper';
import { HandTracking } from '../avatar/HandTracking';
import { createBodyMotion } from '../../utils/poseMath';
import { getSharedVisionFileset } from '../../utils/visionLoader';
import { PerformanceMonitor } from '../common/PerformanceMonitor';

export interface CameraProps {
  /** Callback fired on every detected frame with structured body motion data */
  onMotionDetected?: (motion: BodyMotion) => void;
  /** Callback fired with normalized landmarks for legacy components */
  onLandmarksDetected?: (landmarks: PoseLandmarks | null) => void;
  /** Callback fired with extracted real-time facial signals */
  onFaceSignalsDetected?: (signals: FaceSignals | null) => void;
  /** Callback fired with smoothed avatar facial pose */
  onFacePoseDetected?: (pose: AvatarFacePose) => void;
  /** Callback fired with real-time hand signals and gestures */
  onHandSignalsDetected?: (signals: HandSignals | null) => void;
  /** Callback fired with real-time performance metrics (FPS, Latency, Inference time) */
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  /** Whether the webcam feed is mirrored horizontally (default true) */
  isMirrored?: boolean;
  /** Callback to toggle mirror mode */
  onToggleMirror?: () => void;
  /** Whether the landmark skeleton is rendered over the video */
  showSkeleton?: boolean;
  /** Callback to toggle skeleton visibility */
  onToggleSkeleton?: () => void;
  /** Optional custom CSS class name */
  className?: string;
  /** Motion smoothing factor (0.1 = snappy, 0.4 = smooth cartoon) */
  smoothingFactor?: number;
  /** Allow fallback to interactive motion simulator if camera is unavailable */
  allowSimulatorFallback?: boolean;
  /** Auto start camera on mount if permission was previously granted */
  autoStart?: boolean;
  /** Show live joint angles HUD overlay */
  showAngleHUD?: boolean;
}

/**
 * Reusable Camera Component
 * Integrates client-side MediaPipe PoseLandmarker inference with zero server streaming,
 * high-performance RAF loop, custom error diagnostics, and clean BodyMotion output.
 */
export const Camera: React.FC<CameraProps> = React.memo(({
  onMotionDetected,
  onLandmarksDetected,
  onFaceSignalsDetected,
  onFacePoseDetected,
  onHandSignalsDetected,
  onPerformanceUpdate,
  isMirrored = true,
  onToggleMirror,
  showSkeleton = true,
  onToggleSkeleton,
  className = '',
  smoothingFactor = 0.25,
  allowSimulatorFallback = true,
  autoStart = false,
  showAngleHUD: initialShowAngleHUD = true,
}) => {
  // DOM References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const cameraRequestIdRef = useRef(0);

  // Processing & MediaPipe Engine References (kept OUT of React state for 60fps performance)
  const poseLandmarkerRef = useRef<any>(null);
  const faceTrackingRef = useRef<FaceTracking | null>(null);
  const faceMapperRef = useRef<FaceExpressionMapper | null>(null);
  const handTrackingRef = useRef<HandTracking | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const prevKinematicsRef = useRef<AvatarKinematics | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const onMotionRef = useRef(onMotionDetected);
  const onLandmarksRef = useRef(onLandmarksDetected);
  const onFaceSignalsRef = useRef(onFaceSignalsDetected);
  const onFacePoseRef = useRef(onFacePoseDetected);
  const onHandSignalsRef = useRef(onHandSignalsDetected);
  const onPerformanceRef = useRef(onPerformanceUpdate);
  const smoothingRef = useRef(smoothingFactor);
  const showSkeletonRef = useRef(showSkeleton);
  const isMirroredRef = useRef(isMirrored);

  // Keep callback refs updated without re-running effects
  useEffect(() => {
    onMotionRef.current = onMotionDetected;
    onLandmarksRef.current = onLandmarksDetected;
    onFaceSignalsRef.current = onFaceSignalsDetected;
    onFacePoseRef.current = onFacePoseDetected;
    onHandSignalsRef.current = onHandSignalsDetected;
    onPerformanceRef.current = onPerformanceUpdate;
    smoothingRef.current = smoothingFactor;
    showSkeletonRef.current = showSkeleton;
    isMirroredRef.current = isMirrored;
    if (faceTrackingRef.current) {
      faceTrackingRef.current.setMirrored(isMirrored);
    }
    if (handTrackingRef.current) {
      handTrackingRef.current.setMirrored(isMirrored);
    }
  });

  // UI States
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [simPoseType, setSimPoseType] = useState<'wave' | 'hands_up' | 'tilt' | 'dance' | 'crouch'>('wave');
  const [fps, setFps] = useState<number>(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    trackingLatencyMs: 0,
    inferenceTimeMs: 0,
    qualityTier: 'optimal',
  });
  const [detectedExpression, setDetectedExpression] = useState<AvatarFaceExpressionType>('neutral');
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(false);
  const [showAngleHUD, setShowAngleHUD] = useState<boolean>(initialShowAngleHUD);
  const [latestAngles, setLatestAngles] = useState<{
    lElbow: number;
    rElbow: number;
    lShoulder: number;
    rShoulder: number;
    lKnee: number;
    rKnee: number;
  }>({
    lElbow: 160,
    rElbow: 160,
    lShoulder: 30,
    rShoulder: 30,
    lKnee: 175,
    rKnee: 175,
  });

  // Simulator phase reference for synthesis
  const simPhaseRef = useRef<number>(0);

  /**
   * Diagnostic check for browser camera capability and secure context
   */
  const checkBrowserSupport = (): { supported: boolean; reason?: string } => {
    if (typeof window === 'undefined') return { supported: false, reason: 'SSR environment' };

    // MediaDevices check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        reason: 'Your web browser does not support the camera MediaDevices API. Please update to a modern browser like Chrome, Edge, or Safari.',
      };
    }

    // Context security check (getUserMedia requires HTTPS or localhost)
    const isLocalhost = Boolean(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('.local')
    );

    if (!window.isSecureContext && !isLocalhost) {
      return {
        supported: false,
        reason: 'Camera access requires a secure connection (HTTPS).',
      };
    }

    return { supported: true };
  };

  /**
   * Initialize MediaPipe PoseLandmarker
   * Model files are loaded from Google's official MediaPipe task storage:
   * - WASM: https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm
   * - Task Model: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
   */
  const initPoseLandmarker = async (): Promise<boolean> => {
    if (poseLandmarkerRef.current) return true;

    try {
      setLoadingStage('Loading MediaPipe Vision engine...');
      const vision = await import('@mediapipe/tasks-vision');

      // 1. FilesetResolver loads the WebAssembly binary runtime files via shared loader
      const wasmFileset = await getSharedVisionFileset();

      setLoadingStage('Downloading AI Pose Landmarker model (~5.5MB)...');
      // 2. PoseLandmarker creates the GPU/WASM accelerated model instance
      const landmarker = await vision.PoseLandmarker.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseLandmarkerRef.current = landmarker;
      return true;
    } catch (err: unknown) {
      console.warn('Failed to load MediaPipe from primary CDN/GPU delegate, attempting CPU fallback:', err);
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const wasmFileset = await getSharedVisionFileset();
        const landmarker = await vision.PoseLandmarker.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        poseLandmarkerRef.current = landmarker;
        return true;
      } catch (fallbackErr) {
        console.error('All MediaPipe load attempts failed:', fallbackErr);
        return false;
      }
    }
  };

  /**
   * Initializes real-time MediaPipe FaceLandmarker and HandLandmarker for expressions, lip sync, and gestures
   */
  const initFaceTracking = async () => {
    try {
      if (!faceTrackingRef.current) {
        faceTrackingRef.current = new FaceTracking({ isMirrored: isMirroredRef.current });
      }
      if (!faceMapperRef.current) {
        faceMapperRef.current = new FaceExpressionMapper();
      }
      if (!faceTrackingRef.current.isModelReady()) {
        await faceTrackingRef.current.initialize();
      }

      if (!handTrackingRef.current) {
        handTrackingRef.current = new HandTracking({ isMirrored: isMirroredRef.current });
      }
      if (!handTrackingRef.current.isModelReady()) {
        await handTrackingRef.current.initialize();
      }
    } catch (err) {
      console.warn('Face/Hand tracking initialization notice:', err);
    }
  };

  /**
   * Request webcam stream from user
   */
  const startCamera = async () => {
    // Check compatibility first
    const support = checkBrowserSupport();
    if (!support.supported) {
      setCameraStatus('unsupported');
      setErrorMessage(support.reason || 'Webcam unsupported.');
      return;
    }

    setCameraStatus('requesting');
    setErrorMessage(null);
    setLoadingStage('Requesting camera permission...');
    const requestId = ++cameraRequestIdRef.current;

    try {
      // Surface a previously blocked permission immediately instead of waiting forever
      // for a browser prompt that will not appear.
      if (navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permission.state === 'denied') {
            setCameraStatus('permission_denied');
            setErrorMessage(
              'Camera access is blocked for this site. Click the camera icon beside the address bar, allow Camera, then retry.'
            );
            return;
          }
        } catch (_) {
          // Some browsers do not expose camera permission state.
        }
      }

      // 1. Get webcam stream
      const cameraRequest = navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });
      cameraRequest.then((lateStream) => {
        if (requestId !== cameraRequestIdRef.current) {
          lateStream.getTracks().forEach((track) => track.stop());
        }
      }).catch(() => {});
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(
          () => reject(new DOMException('Camera permission request timed out.', 'AbortError')),
          15000
        );
      });
      const stream = await Promise.race([cameraRequest, timeout]);

      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // 2. Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 3. Load MediaPipe AI models (Pose + Face)
      const modelReady = await initPoseLandmarker();
      if (!modelReady) {
        setCameraStatus('error');
        setErrorMessage(
          'The camera is connected, but the body-tracking model could not be loaded. Check your internet connection and retry.'
        );
        return;
      }

      // Initialize FaceLandmarker concurrently (non-blocking)
      initFaceTracking();

      setCameraStatus('ready');
      setIsSimulated(false);
      startInferenceLoop();
    } catch (err: any) {
      console.warn('Webcam start exception:', err);
      const errorName = err?.name || '';
      const errText = err instanceof Error ? err.message : String(err);

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setCameraStatus('permission_denied');
        setErrorMessage(
          'Camera permission was denied. Please click the lock or camera icon in your browser address bar to allow camera access.'
        );
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setCameraStatus('not_found');
        setErrorMessage('No camera device was detected on your computer.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setCameraStatus('error');
        setErrorMessage('Your camera is currently in use by another application or video call.');
      } else if (errorName === 'AbortError') {
        setCameraStatus('error');
        setErrorMessage(
          'The browser did not respond to the camera request. Click the camera icon beside the address bar, allow access, and retry.'
        );
      } else {
        setCameraStatus('error');
        setErrorMessage(errText || 'Could not start webcam.');
      }
    }
  };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  /**
   * Stop webcam tracks and cancel RAF loop
   */
  const stopCamera = useCallback(() => {
    cameraRequestIdRef.current += 1;
    isRunningRef.current = false;

    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (faceTrackingRef.current) {
      faceTrackingRef.current.dispose();
      faceTrackingRef.current = null;
    }

    if (handTrackingRef.current) {
      handTrackingRef.current.dispose();
      handTrackingRef.current = null;
    }

    if (poseLandmarkerRef.current) {
      try {
        poseLandmarkerRef.current.close();
      } catch (_) {}
      poseLandmarkerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    clearCanvas();
  }, [clearCanvas]);

  /**
   * Real-time MediaPipe inference loop
   * Runs via requestAnimationFrame and avoids React re-renders for max FPS.
   * Uses interleaved inference to alternate secondary trackers (face vs hand)
   * which cuts compute load in half while maintaining stable 60 FPS output.
   */
  const startInferenceLoop = () => {
    isRunningRef.current = true;

    let frameCounter = 0;
    let lastFpsTimestamp = performance.now();
    let hudThrottleTimestamp = performance.now();
    let perfThrottleTimestamp = performance.now();
    let inferenceTick = 0;
    let lastPoseTime = 0;
    let lastFaceTime = 0;
    let lastHandTime = 0;
    let consecutiveEmptyFrames = 0;

    const loop = () => {
      if (!isRunningRef.current) return;

      const video = videoRef.current;
      const landmarker = poseLandmarkerRef.current;

      if (video && landmarker && video.readyState >= 2) {
        // Optimization: Only run inference when video frame has advanced
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          inferenceTick++;
          const frameStart = performance.now();
          const timestamp = frameStart;

          // 1. Primary: MediaPipe Pose Video Detection (runs on every incoming video frame)
          const poseStart = performance.now();
          const results = landmarker.detectForVideo(video, frameStart);
          lastPoseTime = performance.now() - poseStart;

          // 2. Interleaved: Alternate Face and Hand tracking on consecutive frames
          // Even frames: Face Landmarker (blendshapes, expression detection, lip sync)
          if (inferenceTick % 2 === 0) {
            if (faceTrackingRef.current && faceTrackingRef.current.isModelReady()) {
              const fStart = performance.now();
              const faceSignals = faceTrackingRef.current.processVideoFrame(video, frameStart);
              lastFaceTime = performance.now() - fStart;

              if (onFaceSignalsRef.current) {
                onFaceSignalsRef.current(faceSignals);
              }
              if (faceMapperRef.current) {
                const facePose = faceMapperRef.current.mapSignalsToFacePose(faceSignals);
                if (onFacePoseRef.current) {
                  onFacePoseRef.current(facePose);
                }
                if (frameStart - hudThrottleTimestamp >= 120) {
                  hudThrottleTimestamp = frameStart;
                  setIsFaceDetected(facePose.isDetected);
                  if (facePose.isDetected) {
                    setDetectedExpression(facePose.dominantExpression);
                  }
                }
              }
            }
          } else {
            // Odd frames: Hand Landmarker (finger curl, gestures, wrist rotation)
            if (handTrackingRef.current && handTrackingRef.current.isModelReady()) {
              const hStart = performance.now();
              const handSignals = handTrackingRef.current.processVideoFrame(video, frameStart);
              lastHandTime = performance.now() - hStart;

              if (onHandSignalsRef.current) {
                onHandSignalsRef.current(handSignals);
              }
            }
          }

          const totalInferenceTime = performance.now() - frameStart;
          const trackingLatency = Math.max(1, totalInferenceTime + 6);

          // 3. Compute FPS
          frameCounter++;
          if (frameStart - lastFpsTimestamp >= 1000) {
            const currentFps = frameCounter;
            setFps(currentFps);
            frameCounter = 0;
            lastFpsTimestamp = frameStart;
          }

          // 4. Performance Metrics Dispatch (throttled to 250ms for minimal React state overhead)
          if (frameStart - perfThrottleTimestamp >= 250) {
            perfThrottleTimestamp = frameStart;
            const currentFps = frameCounter > 0 ? Math.round(frameCounter * (1000 / Math.max(1, frameStart - lastFpsTimestamp))) : 60;
            const metrics: PerformanceMetrics = {
              fps: currentFps,
              trackingLatencyMs: Math.round(trackingLatency),
              inferenceTimeMs: Math.round(totalInferenceTime),
              poseTimeMs: Math.round(lastPoseTime),
              faceTimeMs: Math.round(lastFaceTime),
              handTimeMs: Math.round(lastHandTime),
              qualityTier: currentFps >= 48 ? 'optimal' : currentFps >= 28 ? 'good' : 'low',
            };
            setPerformanceMetrics(metrics);
            if (onPerformanceRef.current) {
              onPerformanceRef.current(metrics);
            }
          }

          // 4. Process Pose Landmark Results
          if (results && results.landmarks && results.landmarks[0]) {
            consecutiveEmptyFrames = 0;
            const raw = results.landmarks[0];
            const landmarks: PoseLandmarks = {
              nose: raw[0],
              leftEye: raw[2],
              rightEye: raw[5],
              leftEar: raw[7],
              rightEar: raw[8],
              leftShoulder: raw[11],
              rightShoulder: raw[12],
              leftElbow: raw[13],
              rightElbow: raw[14],
              leftWrist: raw[15],
              rightWrist: raw[16],
              leftHip: raw[23],
              rightHip: raw[24],
              leftKnee: raw[25],
              rightKnee: raw[26],
              leftAnkle: raw[27],
              rightAnkle: raw[28],
              rawLandmarks: raw,
            };

            // 5. Construct high-level BodyMotion data object
            const motion = createBodyMotion(
              landmarks,
              prevKinematicsRef.current,
              smoothingRef.current,
              timestamp
            );
            prevKinematicsRef.current = motion.kinematics;

            // Notify consumers
            if (onMotionRef.current) onMotionRef.current(motion);
            if (onLandmarksRef.current) onLandmarksRef.current(landmarks);

            // 6. Draw Skeleton Visualization onto Canvas
            drawLandmarks(landmarks);

            // 7. Throttled UI Angles HUD update (10 times/sec, not 60)
            if (timestamp - hudThrottleTimestamp >= 100) {
              hudThrottleTimestamp = timestamp;
              setLatestAngles({
                lElbow: motion.angles.leftElbow,
                rElbow: motion.angles.rightElbow,
                lShoulder: motion.angles.leftShoulder,
                rShoulder: motion.angles.rightShoulder,
                lKnee: motion.angles.leftKnee,
                rKnee: motion.angles.rightKnee,
              });
            }
          } else {
            clearCanvas();
            consecutiveEmptyFrames++;
            // When tracking is lost or child moves out of camera frame, transition gracefully to rest pose
            if (consecutiveEmptyFrames === 6) {
              const lostMotion = createBodyMotion(
                null,
                prevKinematicsRef.current,
                smoothingRef.current,
                timestamp
              );
              if (onMotionRef.current) onMotionRef.current(lostMotion);
              if (onLandmarksRef.current) onLandmarksRef.current(null);
              if (onFaceSignalsRef.current) onFaceSignalsRef.current(null);
              if (onHandSignalsRef.current) onHandSignalsRef.current(null);
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  /**
   * Switch to Synthetic Motion Simulator
   * Allows kids/users to test avatar mirroring and poses even if webcam is not permitted
   */
  const startSimulator = () => {
    stopCamera();
    setCameraStatus('ready');
    setIsSimulated(true);
    setErrorMessage(null);
    isRunningRef.current = true;

    let frameCounter = 0;
    let lastFpsTimestamp = performance.now();
    let hudThrottleTimestamp = performance.now();

    const simLoop = () => {
      if (!isRunningRef.current) return;

      const now = performance.now();
      frameCounter++;
      if (now - lastFpsTimestamp >= 1000) {
        setFps(frameCounter);
        frameCounter = 0;
        lastFpsTimestamp = now;
      }

      simPhaseRef.current += 0.055;
      const landmarks = generateSimulatedLandmarks(simPhaseRef.current, simPoseType);
      const motion = createBodyMotion(
        landmarks,
        prevKinematicsRef.current,
        smoothingRef.current,
        now
      );
      prevKinematicsRef.current = motion.kinematics;

      if (onMotionRef.current) onMotionRef.current(motion);
      if (onLandmarksRef.current) onLandmarksRef.current(landmarks);

      // Synthesize matching face expressions for simulator
      if (onFacePoseRef.current) {
        let simExp: AvatarFaceExpressionType = 'neutral';
        let smile = 0;
        let mouth = 0;
        let blink = 0;
        let brow = 0;
        if (simPoseType === 'wave') {
          simExp = 'happy';
          smile = 0.85;
          brow = 0.25;
        } else if (simPoseType === 'hands_up') {
          simExp = 'surprised';
          mouth = 0.75;
          brow = 0.65;
        } else if (simPoseType === 'dance') {
          simExp = 'happy';
          smile = 0.95;
          blink = Math.sin(now * 0.005) > 0.6 ? 1 : 0;
        } else if (simPoseType === 'crouch') {
          simExp = 'surprised';
          mouth = 0.4;
          brow = 0.4;
        } else if (simPoseType === 'tilt') {
          simExp = 'happy';
          smile = 0.5;
        }

        const expressionWeights: Record<AvatarFaceExpressionType, number> = {
          neutral: 0,
          happy: 0,
          surprised: 0,
          sad: 0,
          angry: 0,
          blink: 0,
        };
        expressionWeights[simExp] = 0.9;
        if (blink > 0.5) expressionWeights.blink = 1.0;

        const simPose: AvatarFacePose = {
          timestamp: now,
          isDetected: true,
          confidence: 0.9,
          dominantExpression: simExp,
          expressionWeights,
          mouthOpen: mouth,
          mouthSmile: smile,
          mouthFrown: 0,
          eyeBlinkLeft: blink,
          eyeBlinkRight: blink,
          eyebrowHeight: brow,
          eyebrowTilt: 0,
          headRotation: {
            pitch: 0,
            yaw: Math.sin(simPhaseRef.current * 0.5) * 0.15,
            roll: simPoseType === 'tilt' ? Math.sin(simPhaseRef.current) * 0.2 : 0,
          },
          faceDirection: {
            x: Math.sin(simPhaseRef.current * 0.5) * 0.2,
            y: 0,
          },
        };
        onFacePoseRef.current(simPose);
      }

      drawLandmarks(landmarks);

      if (now - hudThrottleTimestamp >= 100) {
        hudThrottleTimestamp = now;
        setLatestAngles({
          lElbow: motion.angles.leftElbow,
          rElbow: motion.angles.rightElbow,
          lShoulder: motion.angles.leftShoulder,
          rShoulder: motion.angles.rightShoulder,
          lKnee: motion.angles.leftKnee,
          rKnee: motion.angles.rightKnee,
        });
      }

      animFrameIdRef.current = requestAnimationFrame(simLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(simLoop);
  };

  /**
   * Generates anatomically coherent simulated landmarks
   */
  const generateSimulatedLandmarks = (phase: number, type: string): PoseLandmarks => {
    const isWaving = type === 'wave';
    const isHandsUp = type === 'hands_up';
    const isTilt = type === 'tilt';
    const isCrouch = type === 'crouch';

    const headTilt = isTilt ? Math.sin(phase) * 0.14 : Math.sin(phase * 0.7) * 0.03;
    const crouchOffset = isCrouch ? Math.abs(Math.sin(phase * 0.8)) * 0.14 : 0;

    const nose: Landmark = { x: 0.5 + headTilt, y: 0.25 + crouchOffset, z: 0 };
    const leftEye: Landmark = { x: 0.47 + headTilt, y: 0.23 + crouchOffset, z: 0 };
    const rightEye: Landmark = { x: 0.53 + headTilt, y: 0.23 + crouchOffset, z: 0 };
    const leftShoulder: Landmark = { x: 0.38, y: 0.38 + crouchOffset, z: 0 };
    const rightShoulder: Landmark = { x: 0.62, y: 0.38 + crouchOffset, z: 0 };

    let leftElbow: Landmark;
    let leftWrist: Landmark;
    let rightElbow: Landmark;
    let rightWrist: Landmark;

    if (isHandsUp) {
      leftElbow = { x: 0.32, y: 0.22 + crouchOffset, z: 0 };
      leftWrist = { x: 0.30, y: 0.10 + Math.sin(phase * 2) * 0.03 + crouchOffset, z: 0 };
      rightElbow = { x: 0.68, y: 0.22 + crouchOffset, z: 0 };
      rightWrist = { x: 0.70, y: 0.10 + Math.cos(phase * 2) * 0.03 + crouchOffset, z: 0 };
    } else if (isWaving) {
      rightElbow = { x: 0.72, y: 0.30 + crouchOffset, z: 0 };
      rightWrist = { x: 0.76 + Math.sin(phase * 4) * 0.08, y: 0.16 + crouchOffset, z: 0 };
      leftElbow = { x: 0.35, y: 0.55 + crouchOffset, z: 0 };
      leftWrist = { x: 0.35, y: 0.70 + crouchOffset, z: 0 };
    } else {
      const armSwing = Math.sin(phase * 1.5) * 0.24;
      leftElbow = { x: 0.28, y: 0.40 - armSwing + crouchOffset, z: 0 };
      leftWrist = { x: 0.18, y: 0.38 - armSwing * 1.5 + crouchOffset, z: 0 };
      rightElbow = { x: 0.72, y: 0.40 + armSwing + crouchOffset, z: 0 };
      rightWrist = { x: 0.82, y: 0.38 + armSwing * 1.5 + crouchOffset, z: 0 };
    }

    const leftHip: Landmark = { x: 0.42, y: 0.65 + crouchOffset * 0.7, z: 0 };
    const rightHip: Landmark = { x: 0.58, y: 0.65 + crouchOffset * 0.7, z: 0 };
    const leftKnee: Landmark = { x: 0.40, y: 0.82 + crouchOffset * 0.3, z: 0 };
    const rightKnee: Landmark = { x: 0.60, y: 0.82 + crouchOffset * 0.3, z: 0 };
    const leftAnkle: Landmark = { x: 0.39, y: 0.94 + crouchOffset * 0.1, z: 0 };
    const rightAnkle: Landmark = { x: 0.61, y: 0.94 + crouchOffset * 0.1, z: 0 };

    return {
      nose,
      leftEye,
      rightEye,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
    };
  };

  /**
   * Draw high-contrast neon skeleton debug visualization onto canvas
   */
  const drawLandmarks = (lm: PoseLandmarks) => {
    const canvas = canvasRef.current;
    if (!canvas || !showSkeletonRef.current) {
      clearCanvas();
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    // Anatomical bone connections (head, shoulders, elbows, wrists, spine, hips, knees, ankles)
    const connections: [Landmark | undefined, Landmark | undefined][] = [
      // Head & Neck
      [lm.nose, lm.leftShoulder],
      [lm.nose, lm.rightShoulder],
      // Shoulders
      [lm.leftShoulder, lm.rightShoulder],
      // Arms & Wrists
      [lm.leftShoulder, lm.leftElbow],
      [lm.leftElbow, lm.leftWrist],
      [lm.rightShoulder, lm.rightElbow],
      [lm.rightElbow, lm.rightWrist],
      // Torso & Hips
      [lm.leftShoulder, lm.leftHip],
      [lm.rightShoulder, lm.rightHip],
      [lm.leftHip, lm.rightHip],
      // Legs & Knees & Ankles
      [lm.leftHip, lm.leftKnee],
      [lm.leftKnee, lm.leftAnkle],
      [lm.rightHip, lm.rightKnee],
      [lm.rightKnee, lm.rightAnkle],
    ];

    // 1. Draw glowing bones
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#22c55e'; // Vibrant neon green
    ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
    ctx.shadowBlur = 10;

    connections.forEach(([p1, p2]) => {
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    });

    // 2. Draw colorful joint landmarks
    const keyJoints = [
      { pt: lm.nose, color: '#f59e0b', r: 8 }, // Amber Head
      { pt: lm.leftShoulder, color: '#06b6d4', r: 6 }, // Cyan
      { pt: lm.rightShoulder, color: '#06b6d4', r: 6 },
      { pt: lm.leftElbow, color: '#8b5cf6', r: 6 }, // Purple
      { pt: lm.rightElbow, color: '#8b5cf6', r: 6 },
      { pt: lm.leftWrist, color: '#fbbf24', r: 7 }, // Gold Hands
      { pt: lm.rightWrist, color: '#fbbf24', r: 7 },
      { pt: lm.leftHip, color: '#06b6d4', r: 6 },
      { pt: lm.rightHip, color: '#06b6d4', r: 6 },
      { pt: lm.leftKnee, color: '#ec4899', r: 6 }, // Pink Knees
      { pt: lm.rightKnee, color: '#ec4899', r: 6 },
      { pt: lm.leftAnkle, color: '#10b981', r: 6 }, // Emerald Ankles
      { pt: lm.rightAnkle, color: '#10b981', r: 6 },
    ];

    ctx.shadowBlur = 4;
    keyJoints.forEach(({ pt, color, r }) => {
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart, stopCamera]);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden bg-slate-900 border-4 border-amber-300 shadow-xl flex flex-col items-center justify-center min-h-[320px] sm:min-h-[380px] ${className}`}
    >
      {/* Real-time HTML5 Camera Video Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''} ${
          !isSimulated && (cameraStatus === 'ready' || (cameraStatus === 'error' && streamRef.current))
            ? 'block'
            : 'hidden'
        }`}
      />

      {/* High-Performance Canvas for Landmark Skeleton Visualization */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className={`absolute inset-0 w-full h-full pointer-events-none ${
          isMirrored ? 'scale-x-[-1]' : ''
        } ${showSkeleton ? 'block' : 'hidden'}`}
      />

      {/* Simulated Mode Background Stage */}
      {isSimulated && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-5xl mb-2 animate-bounce">🤖</div>
          <h3 className="text-white font-black text-lg">Interactive Motion Simulator</h3>
          <p className="text-xs text-indigo-200 mt-1 max-w-xs">
            Synthesizing body motion poses using client kinematics so you can test cartoon mimicry with or without a webcam!
          </p>

          {/* Quick Pose Synthesizer Buttons */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {(['wave', 'hands_up', 'tilt', 'dance', 'crouch'] as const).map((pose) => (
              <button
                key={pose}
                onClick={() => setSimPoseType(pose)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  simPoseType === pose
                    ? 'bg-amber-400 text-amber-950 shadow-md font-black scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {pose === 'wave' && '👋 Wave'}
                {pose === 'hands_up' && '🙌 Hands Up'}
                {pose === 'tilt' && '🙃 Tilt'}
                {pose === 'dance' && '🕺 Dance'}
                {pose === 'crouch' && '🐰 Crouch'}
              </button>
            ))}
          </div>

          <button
            onClick={startCamera}
            className="mt-5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition"
          >
            <CameraIcon className="w-4 h-4" />
            <span>Switch to Real Webcam</span>
          </button>
        </div>
      )}

      {/* Permission Request / Idle Screen */}
      {(cameraStatus === 'idle' || cameraStatus === 'requesting') && !isSimulated && (
        <div className="p-6 text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border-2 border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto text-3xl shadow-lg">
            <CameraIcon className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">Enable Camera Body Tracker</h3>
            <p className="text-xs text-slate-300 mt-1">
              Stand back so your shoulders and hands are visible. All computer vision runs 100% locally in your browser.
            </p>
          </div>

          {cameraStatus === 'requesting' ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs font-semibold flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
              <span>{loadingStage || 'Connecting to webcam & AI model...'}</span>
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              <button
                onClick={startCamera}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CameraIcon className="w-4 h-4" />
                <span>Allow & Start Camera</span>
              </button>

              {allowSimulatorFallback && (
                <button
                  onClick={startSimulator}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Or Play in Simulator Mode (No Camera)</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Private: Video never leaves your computer</span>
          </div>
        </div>
      )}

      {/* Permission Denied, Not Found, or Error Screen */}
      {(cameraStatus === 'permission_denied' ||
        cameraStatus === 'not_found' ||
        cameraStatus === 'unsupported' ||
        cameraStatus === 'error') &&
        !isSimulated && (
          <div className="p-6 text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto text-3xl">
              <CameraOff className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                {cameraStatus === 'permission_denied'
                  ? 'Camera Permission Blocked'
                  : cameraStatus === 'not_found'
                  ? 'Camera Not Found'
                  : cameraStatus === 'unsupported'
                  ? 'Browser Not Supported'
                  : 'Camera Problem'}
              </h3>
              <p className="text-xs text-rose-200 mt-1.5 leading-relaxed">
                {errorMessage || 'Unable to access your video stream.'}
              </p>
            </div>

            {cameraStatus === 'permission_denied' && (
              <div className="bg-slate-800/90 rounded-2xl p-3 text-left text-[11px] text-slate-300 space-y-1.5 border border-slate-700">
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <span>How to fix in 5 seconds:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Look at the top address bar in your browser</li>
                  <li>Click the 🔒 lock or camera icon</li>
                  <li>Toggle Camera to <strong>Allow</strong></li>
                  <li>Click Retry below</li>
                </ol>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={startCamera}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Camera Connection</span>
              </button>

              {allowSimulatorFallback && (
                <button
                  onClick={startSimulator}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Continue in Simulator Mode</span>
                </button>
              )}
            </div>
          </div>
        )}

      {/* Floating Status & Camera Controls Toolbar */}
      {cameraStatus === 'ready' && (
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto z-10">
          <PerformanceMonitor metrics={performanceMetrics} />

          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-full border border-slate-700 text-white">
            <button
              onClick={() => setShowAngleHUD(!showAngleHUD)}
              className={`p-1.5 rounded-full transition text-xs ${
                showAngleHUD ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title={showAngleHUD ? 'Hide Joint Angles' : 'Show Joint Angles'}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onToggleSkeleton}
              className={`p-1.5 rounded-full transition text-xs ${
                showSkeleton ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title={showSkeleton ? 'Hide Skeleton Overlay' : 'Show Skeleton Overlay'}
            >
              {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onToggleMirror}
              className={`p-1.5 rounded-full transition text-xs ${
                isMirrored ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="Flip Horizontal Mirror"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            {!isSimulated && allowSimulatorFallback && (
              <button
                onClick={startSimulator}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 transition text-xs"
                title="Switch to Motion Simulator"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Real-Time Facial Expression Badge */}
      {cameraStatus === 'ready' && (isFaceDetected || isSimulated) && (
        <div className="absolute top-14 left-3 pointer-events-none z-10">
          <div className="bg-amber-400/95 text-amber-950 font-black text-[11px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-amber-300 backdrop-blur-xs">
            <Smile className="w-3.5 h-3.5 text-amber-900" />
            <span>
              {detectedExpression === 'happy'
                ? 'Happy Smile'
                : detectedExpression === 'surprised'
                ? 'Surprised'
                : detectedExpression === 'angry'
                ? 'Angry'
                : detectedExpression === 'sad'
                ? 'Sad Pout'
                : detectedExpression === 'blink'
                ? 'Winking'
                : 'Face Active'}
            </span>
          </div>
        </div>
      )}

      {/* Real-Time Joint Angles HUD Overlay (Subtle, floating at bottom) */}
      {cameraStatus === 'ready' && showAngleHUD && (
        <div className="absolute bottom-2.5 inset-x-3 pointer-events-none z-10">
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-2xl px-3 py-1.5 flex items-center justify-between text-[10px] sm:text-xs text-slate-200">
            <div className="flex items-center gap-1 font-extrabold text-amber-400">
              <Activity className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Live Angles:</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 font-mono font-bold">
              <span title="Left Elbow Angle">
                L.Elbow: <strong className="text-cyan-300">{latestAngles.lElbow}°</strong>
              </span>
              <span title="Right Elbow Angle">
                R.Elbow: <strong className="text-cyan-300">{latestAngles.rElbow}°</strong>
              </span>
              <span title="Left Shoulder Angle">
                L.Shldr: <strong className="text-emerald-300">{latestAngles.lShoulder}°</strong>
              </span>
              <span title="Right Shoulder Angle">
                R.Shldr: <strong className="text-emerald-300">{latestAngles.rShoulder}°</strong>
              </span>
              <span title="Left Knee Angle" className="hidden sm:inline">
                L.Knee: <strong className="text-pink-300">{latestAngles.lKnee}°</strong>
              </span>
              <span title="Right Knee Angle" className="hidden sm:inline">
                R.Knee: <strong className="text-pink-300">{latestAngles.rKnee}°</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
