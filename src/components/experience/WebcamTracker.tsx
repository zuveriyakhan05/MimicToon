import React from 'react';
import { Camera } from '../camera/Camera';
import { PoseLandmarks, BodyMotion, PerformanceMetrics } from '../../types';
import { FaceSignals, AvatarFacePose, HandSignals } from '../../types/avatar';

interface WebcamTrackerProps {
  onLandmarksDetected?: (landmarks: PoseLandmarks | null) => void;
  onMotionDetected?: (motion: BodyMotion) => void;
  onFaceSignalsDetected?: (signals: FaceSignals | null) => void;
  onFacePoseDetected?: (pose: AvatarFacePose) => void;
  onHandSignalsDetected?: (signals: HandSignals | null) => void;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  isMirrored: boolean;
  onToggleMirror: () => void;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  smoothingFactor?: number;
}

export const WebcamTracker: React.FC<WebcamTrackerProps> = React.memo(({
  onLandmarksDetected,
  onMotionDetected,
  onFaceSignalsDetected,
  onFacePoseDetected,
  onHandSignalsDetected,
  onPerformanceUpdate,
  isMirrored,
  onToggleMirror,
  showSkeleton,
  onToggleSkeleton,
  smoothingFactor = 0.25,
}) => {
  return (
    <Camera
      onLandmarksDetected={onLandmarksDetected}
      onMotionDetected={onMotionDetected}
      onFaceSignalsDetected={onFaceSignalsDetected}
      onFacePoseDetected={onFacePoseDetected}
      onHandSignalsDetected={onHandSignalsDetected}
      onPerformanceUpdate={onPerformanceUpdate}
      isMirrored={isMirrored}
      onToggleMirror={onToggleMirror}
      showSkeleton={showSkeleton}
      onToggleSkeleton={onToggleSkeleton}
      smoothingFactor={smoothingFactor}
      allowSimulatorFallback={true}
    />
  );
});

