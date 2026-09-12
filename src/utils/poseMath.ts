import { Landmark, PoseLandmarks, AvatarKinematics, BodyMotion, JointAngles, Point3D } from '../types';

/**
 * Calculates the angle in radians formed by three 2D/3D points (p1 -> p2 -> p3)
 * where p2 is the vertex (e.g. elbow).
 */
export function calculateAngle(p1: Landmark, p2: Landmark, p3: Landmark): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosTheta);
}

/**
 * Calculates 2D angle in degrees (0 - 180)
 */
export function calculateAngleDeg(p1: Landmark, p2: Landmark, p3: Landmark): number {
  const rad = calculateAngle(p1, p2, p3);
  return Math.round((rad * 180) / Math.PI);
}

/**
 * Calculates 3D angle in degrees considering depth z
 */
export function calculateAngle3D(p1: Landmark, p2: Landmark, p3: Landmark): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: (p1.z || 0) - (p2.z || 0) };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: (p3.z || 0) - (p2.z || 0) };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Extracts key biomechanical joint angles in degrees
 */
export function extractJointAngles(lm: PoseLandmarks): JointAngles {
  const angles: JointAngles = {
    leftElbow: 160,
    rightElbow: 160,
    leftShoulder: 30,
    rightShoulder: 30,
    leftKnee: 175,
    rightKnee: 175,
    leftHip: 170,
    rightHip: 170,
    torsoLean: 0,
    torsoTwist: 0,
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
  };

  // 1. Left Elbow: Left Shoulder -> Left Elbow -> Left Wrist
  if (lm.leftShoulder && lm.leftElbow && lm.leftWrist) {
    angles.leftElbow = Math.round(calculateAngle3D(lm.leftShoulder, lm.leftElbow, lm.leftWrist));
  }

  // 2. Right Elbow: Right Shoulder -> Right Elbow -> Right Wrist
  if (lm.rightShoulder && lm.rightElbow && lm.rightWrist) {
    angles.rightElbow = Math.round(calculateAngle3D(lm.rightShoulder, lm.rightElbow, lm.rightWrist));
  }

  // 3. Left Shoulder: Left Hip -> Left Shoulder -> Left Elbow
  if (lm.leftHip && lm.leftShoulder && lm.leftElbow) {
    angles.leftShoulder = Math.round(calculateAngle3D(lm.leftHip, lm.leftShoulder, lm.leftElbow));
  }

  // 4. Right Shoulder: Right Hip -> Right Shoulder -> Right Elbow
  if (lm.rightHip && lm.rightShoulder && lm.rightElbow) {
    angles.rightShoulder = Math.round(calculateAngle3D(lm.rightHip, lm.rightShoulder, lm.rightElbow));
  }

  // 5. Left Knee: Left Hip -> Left Knee -> Left Ankle
  if (lm.leftHip && lm.leftKnee && lm.leftAnkle) {
    angles.leftKnee = Math.round(calculateAngle3D(lm.leftHip, lm.leftKnee, lm.leftAnkle));
  }

  // 6. Right Knee: Right Hip -> Right Knee -> Right Ankle
  if (lm.rightHip && lm.rightKnee && lm.rightAnkle) {
    angles.rightKnee = Math.round(calculateAngle3D(lm.rightHip, lm.rightKnee, lm.rightAnkle));
  }

  // 7. Left Hip: Left Shoulder -> Left Hip -> Left Knee
  if (lm.leftShoulder && lm.leftHip && lm.leftKnee) {
    angles.leftHip = Math.round(calculateAngle3D(lm.leftShoulder, lm.leftHip, lm.leftKnee));
  }

  // 8. Right Hip: Right Shoulder -> Right Hip -> Right Knee
  if (lm.rightShoulder && lm.rightHip && lm.rightKnee) {
    angles.rightHip = Math.round(calculateAngle3D(lm.rightShoulder, lm.rightHip, lm.rightKnee));
  }

  // 9. Torso Lean & Twist
  if (lm.leftShoulder && lm.rightShoulder && lm.leftHip && lm.rightHip) {
    const shoulderMidX = (lm.leftShoulder.x + lm.rightShoulder.x) / 2;
    const hipMidX = (lm.leftHip.x + lm.rightHip.x) / 2;
    angles.torsoLean = Math.max(-1, Math.min(1, (shoulderMidX - hipMidX) * 2.2));

    const shoulderZDiff = (lm.leftShoulder.z || 0) - (lm.rightShoulder.z || 0);
    angles.torsoTwist = Math.max(-1, Math.min(1, shoulderZDiff * 3.5));
  }

  // 10. Head Pitch, Yaw, Roll
  if (lm.nose && lm.leftShoulder && lm.rightShoulder) {
    const shoulderMidX = (lm.leftShoulder.x + lm.rightShoulder.x) / 2;
    const shoulderMidY = (lm.leftShoulder.y + lm.rightShoulder.y) / 2;
    angles.headYaw = Math.round((lm.nose.x - shoulderMidX) * -120);
    const neckLen = shoulderMidY - lm.nose.y;
    angles.headPitch = Math.round((neckLen - 0.22) * 100);
  }

  if (lm.leftEye && lm.rightEye) {
    const dy = lm.rightEye.y - lm.leftEye.y;
    const dx = lm.rightEye.x - lm.leftEye.x;
    angles.headRoll = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  }

  return angles;
}

/**
 * Creates a clean, structured BodyMotion data object containing tracked points,
 * calculated joint angles, detected gestures, and smoothed avatar kinematics.
 */
export function createBodyMotion(
  landmarks: PoseLandmarks | null,
  prevKinematics: AvatarKinematics | null = null,
  smoothing = 0.25,
  timestamp = performance.now()
): BodyMotion {
  const defaultPoint: Point3D = { x: 0.5, y: 0.5, z: 0, visibility: 0 };

  if (!landmarks) {
    return {
      timestamp,
      confidence: 0,
      isDetected: false,
      head: {
        nose: defaultPoint,
        pitch: 0,
        yaw: 0,
        roll: 0,
      },
      shoulders: {
        left: defaultPoint,
        right: defaultPoint,
        center: defaultPoint,
        width: 0.2,
      },
      elbows: {
        left: defaultPoint,
        right: defaultPoint,
      },
      wrists: {
        left: defaultPoint,
        right: defaultPoint,
      },
      hips: {
        left: defaultPoint,
        right: defaultPoint,
        center: defaultPoint,
      },
      knees: {
        left: defaultPoint,
        right: defaultPoint,
      },
      ankles: {
        left: defaultPoint,
        right: defaultPoint,
      },
      angles: {
        leftElbow: 160,
        rightElbow: 160,
        leftShoulder: 30,
        rightShoulder: 30,
        leftKnee: 175,
        rightKnee: 175,
        leftHip: 170,
        rightHip: 170,
        torsoLean: 0,
        torsoTwist: 0,
        headPitch: 0,
        headYaw: 0,
        headRoll: 0,
      },
      gestures: {
        isHandsUp: false,
        isWavingLeft: false,
        isWavingRight: false,
        isCrouching: false,
        isTpose: false,
      },
      kinematics: solveKinematics(null, prevKinematics, smoothing),
    };
  }

  const kinematics = solveKinematics(landmarks, prevKinematics, smoothing);
  const angles = extractJointAngles(landmarks);

  const leftShoulder = landmarks.leftShoulder || defaultPoint;
  const rightShoulder = landmarks.rightShoulder || defaultPoint;
  const leftHip = landmarks.leftHip || defaultPoint;
  const rightHip = landmarks.rightHip || defaultPoint;

  const shoulderCenter: Point3D = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2,
  };

  const hipCenter: Point3D = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: ((leftHip.z || 0) + (rightHip.z || 0)) / 2,
  };

  const shoulderWidth = Math.sqrt(
    Math.pow(rightShoulder.x - leftShoulder.x, 2) + Math.pow(rightShoulder.y - leftShoulder.y, 2)
  );

  // Gesture evaluation
  const leftWrist = landmarks.leftWrist;
  const rightWrist = landmarks.rightWrist;
  const isHandsUp = Boolean(
    leftWrist &&
    rightWrist &&
    leftShoulder &&
    rightShoulder &&
    leftWrist.y < leftShoulder.y &&
    rightWrist.y < rightShoulder.y
  );

  const isWavingLeft = Boolean(leftWrist && leftShoulder && leftWrist.y < leftShoulder.y - 0.1);
  const isWavingRight = Boolean(rightWrist && rightShoulder && rightWrist.y < rightShoulder.y - 0.1);

  // T-pose: shoulders ~ 75-115 deg, elbows ~ 140-180 deg
  const isTpose = Boolean(
    angles.leftShoulder >= 70 &&
    angles.leftShoulder <= 120 &&
    angles.rightShoulder >= 70 &&
    angles.rightShoulder <= 120 &&
    angles.leftElbow >= 140 &&
    angles.rightElbow >= 140
  );

  const isCrouching = kinematics.isCrouching;

  return {
    timestamp,
    confidence: landmarks.nose?.visibility ?? 0.9,
    isDetected: true,
    head: {
      nose: landmarks.nose || defaultPoint,
      leftEye: landmarks.leftEye,
      rightEye: landmarks.rightEye,
      leftEar: landmarks.leftEar,
      rightEar: landmarks.rightEar,
      pitch: angles.headPitch,
      yaw: angles.headYaw,
      roll: angles.headRoll,
    },
    shoulders: {
      left: leftShoulder,
      right: rightShoulder,
      center: shoulderCenter,
      width: shoulderWidth,
    },
    elbows: {
      left: landmarks.leftElbow || defaultPoint,
      right: landmarks.rightElbow || defaultPoint,
    },
    wrists: {
      left: leftWrist || defaultPoint,
      right: rightWrist || defaultPoint,
    },
    hips: {
      left: leftHip,
      right: rightHip,
      center: hipCenter,
    },
    knees: {
      left: landmarks.leftKnee || defaultPoint,
      right: landmarks.rightKnee || defaultPoint,
    },
    ankles: {
      left: landmarks.leftAnkle || defaultPoint,
      right: landmarks.rightAnkle || defaultPoint,
    },
    angles,
    gestures: {
      isHandsUp,
      isWavingLeft,
      isWavingRight,
      isCrouching,
      isTpose,
    },
    kinematics,
    rawLandmarks: landmarks.rawLandmarks,
  };
}

/**
 * Linear interpolation helper
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Maps landmarks into cartoon-friendly avatar kinematic parameters.
 */
export function solveKinematics(
  landmarks: PoseLandmarks | null,
  prevKinematics: AvatarKinematics | null,
  smoothing = 0.25
): AvatarKinematics {
  const defaultKinematics: AvatarKinematics = {
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    leftArmAngle: 0.3,
    rightArmAngle: 0.3,
    leftForearmAngle: 0.2,
    rightForearmAngle: 0.2,
    torsoLean: 0,
    torsoTwist: 0,
    jumpOffset: 0,
    isWavingLeft: false,
    isWavingRight: false,
    isHandsUp: false,
    isCrouching: false,
    mouthOpen: 0,
    isBlinking: false,
  };

  if (!landmarks) {
    if (prevKinematics) return prevKinematics;
    return defaultKinematics;
  }

  const {
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
  } = landmarks;

  const target: AvatarKinematics = { ...defaultKinematics };

  // 1. Head orientation calculation
  if (nose && leftShoulder && rightShoulder) {
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

    // Head Yaw: how far nose is offset from shoulder mid horizontally
    target.headYaw = (nose.x - shoulderMidX) * -2.8;

    // Head Pitch: nose distance to shoulder vertical line
    const neckLen = shoulderMidY - nose.y;
    target.headPitch = (neckLen - 0.22) * 2.2;
  }

  if (leftEye && rightEye) {
    // Head Roll: tilt of line connecting eyes
    const dy = rightEye.y - leftEye.y;
    const dx = rightEye.x - leftEye.x;
    target.headRoll = Math.atan2(dy, dx);
  }

  // 2. Left Arm & Elbow
  if (leftShoulder && leftElbow && leftWrist) {
    // Angle from shoulder down to elbow
    const dx = leftElbow.x - leftShoulder.x;
    const dy = leftElbow.y - leftShoulder.y;
    // Normalized angle where 0 is down
    target.leftArmAngle = Math.atan2(dx, dy);

    // Forearm flex angle
    const elbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    target.leftForearmAngle = Math.max(0, Math.PI - elbowAngle);

    // Is left hand raised high?
    if (leftWrist.y < leftShoulder.y - 0.1) {
      target.isWavingLeft = true;
    }
  }

  // 3. Right Arm & Elbow
  if (rightShoulder && rightElbow && rightWrist) {
    const dx = rightElbow.x - rightShoulder.x;
    const dy = rightElbow.y - rightShoulder.y;
    target.rightArmAngle = Math.atan2(dx, dy);

    const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    target.rightForearmAngle = Math.max(0, Math.PI - elbowAngle);

    if (rightWrist.y < rightShoulder.y - 0.1) {
      target.isWavingRight = true;
    }
  }

  // 4. Hands up gesture
  if (
    leftWrist &&
    rightWrist &&
    leftShoulder &&
    rightShoulder &&
    leftWrist.y < leftShoulder.y &&
    rightWrist.y < rightShoulder.y
  ) {
    target.isHandsUp = true;
  }

  // 5. Torso lean & crouch
  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

    target.torsoLean = (shoulderCenter.x - hipCenter.x) * 1.8;

    // Detect crouching if hips drop significantly towards knees
    if (leftKnee && rightKnee) {
      const kneeCenterY = (leftKnee.y + rightKnee.y) / 2;
      const hipToKneeDist = kneeCenterY - hipCenter.y;
      if (hipToKneeDist < 0.18) {
        target.isCrouching = true;
      }
    }
  }

  // 6. Smooth the output using EMA
  if (!prevKinematics) {
    return target;
  }

  return {
    headPitch: lerp(prevKinematics.headPitch, target.headPitch, smoothing),
    headYaw: lerp(prevKinematics.headYaw, target.headYaw, smoothing),
    headRoll: lerp(prevKinematics.headRoll, target.headRoll, smoothing),
    leftArmAngle: lerp(prevKinematics.leftArmAngle, target.leftArmAngle, smoothing),
    rightArmAngle: lerp(prevKinematics.rightArmAngle, target.rightArmAngle, smoothing),
    leftForearmAngle: lerp(prevKinematics.leftForearmAngle, target.leftForearmAngle, smoothing),
    rightForearmAngle: lerp(prevKinematics.rightForearmAngle, target.rightForearmAngle, smoothing),
    torsoLean: lerp(prevKinematics.torsoLean, target.torsoLean, smoothing),
    torsoTwist: lerp(prevKinematics.torsoTwist, target.torsoTwist, smoothing),
    jumpOffset: lerp(prevKinematics.jumpOffset, target.jumpOffset, smoothing),
    isWavingLeft: target.isWavingLeft,
    isWavingRight: target.isWavingRight,
    isHandsUp: target.isHandsUp,
    isCrouching: target.isCrouching,
    mouthOpen: lerp(prevKinematics.mouthOpen, target.mouthOpen, 0.4),
    isBlinking: target.isBlinking,
  };
}
