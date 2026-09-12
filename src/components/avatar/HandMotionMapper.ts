import * as THREE from 'three';
import {
  HandSignals,
  SingleHandData,
  AvatarHandPose,
  AvatarSingleHandPose,
  HandType,
  FingerName,
  HandGestureType,
} from '../../types/avatar';

export interface HandMotionMapperOptions {
  isMirrored?: boolean;
  smoothingFactor?: number; // 0.0 (snappy) to 1.0 (heavy smooth, default 0.3)
}

/**
 * HandMotionMapper maps 2D/3D hand landmark signals and gestures into 3D avatar
 * wrist quaternions and finger articulators.
 * 
 * Features:
 * - Converts palm normal & wrist direction into smooth Three.js Quaternions
 * - Applies iconic cartoon poses for recognized gestures (thumbs up, victory, pointing, fist, open palm)
 * - Temporal Quaternion slerp and curl damping to eliminate high-frequency jitter
 * - Direct driving of humanoid hand bones and cartoon character finger meshes
 */
export class HandMotionMapper {
  private isMirrored: boolean = true;
  private smoothing: number = 0.3;

  // Cached current smoothed poses for left and right hands
  private currentLeftPose: AvatarSingleHandPose;
  private currentRightPose: AvatarSingleHandPose;

  // Temporary math helpers to eliminate GC
  private tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private tempQuat = new THREE.Quaternion();
  private targetQuatLeft = new THREE.Quaternion();
  private targetQuatRight = new THREE.Quaternion();

  constructor(options: HandMotionMapperOptions = {}) {
    this.isMirrored = options.isMirrored ?? true;
    this.smoothing = options.smoothingFactor ?? 0.3;

    this.currentLeftPose = this.createDefaultHandPose('left');
    this.currentRightPose = this.createDefaultHandPose('right');
  }

  private createDefaultHandPose(hand: HandType): AvatarSingleHandPose {
    return {
      wristRotation: new THREE.Quaternion(),
      wristEuler: { x: 0, y: 0, z: 0 },
      fingerCurls: {
        thumb: 0.2,
        index: 0.2,
        middle: 0.2,
        ring: 0.2,
        pinky: 0.2,
      },
      gesture: 'none',
      gestureWeight: 0,
      isRaised: false,
      isDetected: false,
    };
  }

  public setMirrored(mirrored: boolean): void {
    this.isMirrored = mirrored;
  }

  public setSmoothing(smoothing: number): void {
    this.smoothing = THREE.MathUtils.clamp(smoothing, 0.05, 0.9);
  }

  /**
   * Transforms HandSignals into a complete smoothed AvatarHandPose
   */
  public mapHandSignals(signals: HandSignals | null, delta: number = 0.016): AvatarHandPose {
    const timestamp = signals?.timestamp || performance.now();

    // Damping lambda: higher is snappier, lower is smoother
    const lambda = THREE.MathUtils.lerp(35, 8, this.smoothing);

    // Map Left Hand
    this.currentLeftPose = this.mapSingleHand(
      signals?.leftHand || null,
      'left',
      this.currentLeftPose,
      lambda,
      delta
    );

    // Map Right Hand
    this.currentRightPose = this.mapSingleHand(
      signals?.rightHand || null,
      'right',
      this.currentRightPose,
      lambda,
      delta
    );

    return {
      timestamp,
      leftHand: this.currentLeftPose,
      rightHand: this.currentRightPose,
    };
  }

  /**
   * Internal mapper for an individual hand
   */
  private mapSingleHand(
    data: SingleHandData | null,
    hand: HandType,
    prevPose: AvatarSingleHandPose,
    lambda: number,
    delta: number
  ): AvatarSingleHandPose {
    if (!data || data.confidence < 0.4) {
      // Return to relaxed rest pose smoothly
      const restPose = this.createDefaultHandPose(hand);
      this.dampPose(prevPose, restPose, lambda * 0.5, delta);
      prevPose.isDetected = false;
      return prevPose;
    }

    // 1. Calculate Target Wrist Rotation
    const { pitch, yaw, roll } = data.wristRotation;

    // Coordinate conversion: webcam camera space -> avatar Three.js local space
    // For left hand: invert roll/yaw appropriately
    const signX = 1;
    const signY = hand === 'left' ? -1 : 1;
    const signZ = hand === 'left' ? -1 : 1;

    let targetPitch = pitch * signX * 0.85;
    let targetYaw = yaw * signY * 0.85;
    let targetRoll = roll * signZ * 0.85;

    // Gesture-specific wrist adjustments for iconic cartoon angles
    if (data.gesture === 'thumbs_up') {
      // Tilt wrist slightly up and out so thumbs-up is clearly showcased
      targetPitch = THREE.MathUtils.clamp(targetPitch - 0.2, -0.6, 0.2);
      targetRoll = hand === 'left' ? 0.3 : -0.3;
    } else if (data.gesture === 'pointing') {
      // Aim forward
      targetPitch = 0.1;
    } else if (data.gesture === 'victory') {
      // Tilt slightly toward camera
      targetPitch = -0.15;
    }

    this.tempEuler.set(targetPitch, targetYaw, targetRoll, 'YXZ');
    const targetQuat = hand === 'left' ? this.targetQuatLeft : this.targetQuatRight;
    targetQuat.setFromEuler(this.tempEuler);

    // Slerp wrist rotation
    const slerpFactor = 1.0 - Math.exp(-lambda * delta);
    prevPose.wristRotation.slerp(targetQuat, slerpFactor);
    prevPose.wristEuler = {
      x: targetPitch,
      y: targetYaw,
      z: targetRoll,
    };

    // 2. Compute Target Finger Curls
    const targetCurls = this.computeTargetCurls(data);

    // Damp finger curls
    const fingerNames: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    for (const f of fingerNames) {
      const targetCurl = targetCurls[f];
      const cur = prevPose.fingerCurls[f];
      prevPose.fingerCurls[f] = THREE.MathUtils.damp(cur, targetCurl, lambda, delta);
    }

    prevPose.gesture = data.gesture;
    prevPose.gestureWeight = THREE.MathUtils.damp(
      prevPose.gestureWeight,
      data.gesture !== 'none' ? 1.0 : 0.0,
      lambda,
      delta
    );
    prevPose.isRaised = data.isRaised;
    prevPose.isDetected = true;

    return prevPose;
  }

  /**
   * Computes target finger curls incorporating recognized gestures
   */
  private computeTargetCurls(data: SingleHandData): Record<FingerName, number> {
    const rawFingers = data.fingers;

    // If gesture recognized, apply cartoon-exaggerated canonical curls
    switch (data.gesture) {
      case 'thumbs_up':
        return {
          thumb: 0.0,    // Fully extended straight up!
          index: 0.95,   // Curled tight
          middle: 0.95,  // Curled tight
          ring: 0.95,    // Curled tight
          pinky: 0.95,   // Curled tight
        };

      case 'victory':
        return {
          thumb: 0.8,    // Curled over ring finger
          index: 0.0,    // Extended peace sign V
          middle: 0.0,   // Extended peace sign V
          ring: 0.95,    // Curled tight
          pinky: 0.95,   // Curled tight
        };

      case 'pointing':
        return {
          thumb: 0.6,    // Relaxed against side
          index: 0.0,    // Extended straight ahead
          middle: 0.95,  // Curled tight
          ring: 0.95,    // Curled tight
          pinky: 0.95,   // Curled tight
        };

      case 'fist':
        return {
          thumb: 0.9,    // Folded over knuckles
          index: 0.95,   // Solid fist
          middle: 0.95,  // Solid fist
          ring: 0.95,    // Solid fist
          pinky: 0.95,   // Solid fist
        };

      case 'open_palm':
        return {
          thumb: 0.0,    // Open wide
          index: 0.0,    // Open wide
          middle: 0.0,   // Open wide
          ring: 0.0,     // Open wide
          pinky: 0.0,    // Open wide
        };

      case 'none':
      default:
        // Free tracking from raw finger measurements with slight noise deadband
        return {
          thumb: THREE.MathUtils.clamp(rawFingers.thumb.curl, 0, 1),
          index: THREE.MathUtils.clamp(rawFingers.index.curl, 0, 1),
          middle: THREE.MathUtils.clamp(rawFingers.middle.curl, 0, 1),
          ring: THREE.MathUtils.clamp(rawFingers.ring.curl, 0, 1),
          pinky: THREE.MathUtils.clamp(rawFingers.pinky.curl, 0, 1),
        };
    }
  }

  /**
   * Smoothly damps all properties of a hand pose toward a target
   */
  private dampPose(
    current: AvatarSingleHandPose,
    target: AvatarSingleHandPose,
    lambda: number,
    delta: number
  ): void {
    const slerpFactor = 1.0 - Math.exp(-lambda * delta);
    current.wristRotation.slerp(target.wristRotation, slerpFactor);

    const fingerNames: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    for (const f of fingerNames) {
      current.fingerCurls[f] = THREE.MathUtils.damp(
        current.fingerCurls[f],
        target.fingerCurls[f],
        lambda,
        delta
      );
    }

    current.gestureWeight = THREE.MathUtils.damp(current.gestureWeight, 0, lambda, delta);
    if (current.gestureWeight < 0.05) {
      current.gesture = 'none';
    }
  }

  /**
   * Resets both hands to default rest pose
   */
  public reset(): void {
    this.currentLeftPose = this.createDefaultHandPose('left');
    this.currentRightPose = this.createDefaultHandPose('right');
  }
}
