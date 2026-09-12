import * as THREE from 'three';
import { HumanoidBoneName, BoneTransform, MappedAvatarPose, MotionSmootherOptions } from '../../types/avatar';

/**
 * MotionSmoother provides adaptive temporal filtering for 3D avatar motion tracking.
 * 
 * Features:
 * - Spherical Linear Interpolation (slerp) for bone Quaternions with antipodal check
 * - Vector3 dampening for translations and hip height adjustments
 * - Adaptive velocity-dependent smoothing (1-Euro filter concept):
 *     * High smoothing when child is holding still (eliminates camera sensor noise/jitter)
 *     * Low smoothing when child is moving quickly (eliminates motion lag for instant responsiveness)
 * - Deadzone / noise-gate threshold to prevent idle micro-jitter
 * - Graceful fallback & decay for unreliable landmarks
 */
export class MotionSmoother {
  private smoothedBones: Map<HumanoidBoneName, BoneTransform> = new Map();
  private smoothedHipPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private smoothedMouth: number = 0;
  private smoothedBlink: number = 0;

  private smoothingAmount: number; // 0.0 to 1.0
  private sensitivity: number;     // 0.5 to 2.0
  private deadzone: number;        // radians / meters cutoff
  private maxAngularVelocity: number; // rad/s
  private lastTimestamp: number = 0;

  // Reusable temporaries to avoid GC pressure
  private tempQuatA = new THREE.Quaternion();
  private tempQuatB = new THREE.Quaternion();
  private tempVecA = new THREE.Vector3();

  constructor(options: MotionSmootherOptions = {}) {
    this.smoothingAmount = THREE.MathUtils.clamp(options.smoothingAmount ?? 0.25, 0.0, 0.95);
    this.sensitivity = THREE.MathUtils.clamp(options.sensitivity ?? 1.0, 0.5, 2.0);
    this.deadzone = options.deadzone ?? 0.004; // ~0.23 degrees
    this.maxAngularVelocity = options.maxAngularVelocity ?? (Math.PI * 4); // max 720 deg/sec
  }

  /**
   * Update smoothing configuration at runtime
   */
  public setSmoothingAmount(amount: number): void {
    this.smoothingAmount = THREE.MathUtils.clamp(amount, 0.0, 0.95);
  }

  public setSensitivity(sensitivity: number): void {
    this.sensitivity = THREE.MathUtils.clamp(sensitivity, 0.5, 2.0);
  }

  public setDeadzone(deadzone: number): void {
    this.deadzone = Math.max(0, deadzone);
  }

  /**
   * Clears accumulated temporal state (called on tracking loss or avatar switch)
   */
  public reset(): void {
    this.smoothedBones.clear();
    this.smoothedHipPos.set(0, 0, 0);
    this.smoothedMouth = 0;
    this.smoothedBlink = 0;
    this.lastTimestamp = 0;
  }

  /**
   * Filters and smooths a raw mapped pose.
   * Returns a complete MappedAvatarPose with stabilized quaternions and positions.
   */
  public smoothPose(rawPose: MappedAvatarPose, dt: number): MappedAvatarPose {
    const effectiveDt = Math.max(0.001, Math.min(dt > 0 ? dt : 0.016, 0.1)); // clamp dt [1ms - 100ms]
    
    // Adaptive lambda base: higher smoothingAmount => lower lambda (smoother)
    // Range: smoothing 0.0 -> lambda 45 (snappy), smoothing 0.9 -> lambda 5 (ultra smooth)
    const baseLambda = THREE.MathUtils.lerp(42, 6, this.smoothingAmount) * this.sensitivity;

    const smoothedPoseBones: Partial<Record<HumanoidBoneName, BoneTransform>> = {};

    // Process each bone transform in the incoming pose
    for (const [key, rawTransform] of Object.entries(rawPose.bones)) {
      const boneName = key as HumanoidBoneName;
      if (!rawTransform) continue;

      let current = this.smoothedBones.get(boneName);
      if (!current) {
        // Initialize state on first appearance
        current = {
          rotation: rawTransform.rotation.clone(),
          position: rawTransform.position.clone(),
          confidence: rawTransform.confidence,
          isReliable: rawTransform.isReliable,
        };
        this.smoothedBones.set(boneName, current);
        smoothedPoseBones[boneName] = {
          rotation: current.rotation.clone(),
          position: current.position.clone(),
          confidence: current.confidence,
          isReliable: current.isReliable,
        };
        continue;
      }

      // If landmark is unreliable, decay towards identity/rest or gently hold
      if (!rawTransform.isReliable) {
        // Slowly damp towards identity if confidence dropped to zero
        const decayAlpha = 1.0 - Math.exp(-2.0 * effectiveDt);
        this.tempQuatA.set(0, 0, 0, 1);
        current.rotation.slerp(this.tempQuatA, decayAlpha);
        current.confidence = THREE.MathUtils.lerp(current.confidence, 0, decayAlpha);
        current.isReliable = false;

        smoothedPoseBones[boneName] = {
          rotation: current.rotation.clone(),
          position: current.position.clone(),
          confidence: current.confidence,
          isReliable: false,
        };
        continue;
      }

      // 1. Angular difference (geodesic distance on SO(3))
      this.tempQuatB.copy(rawTransform.rotation);
      if (
        !Number.isFinite(this.tempQuatB.x) ||
        !Number.isFinite(this.tempQuatB.y) ||
        !Number.isFinite(this.tempQuatB.z) ||
        !Number.isFinite(this.tempQuatB.w)
      ) {
        this.tempQuatB.set(0, 0, 0, 1);
      }
      
      // Antipodal alignment: ensure shortest path on 4D hypersphere
      let dot = current.rotation.dot(this.tempQuatB);
      if (!Number.isFinite(dot)) {
        dot = 1.0;
      }
      if (dot < 0) {
        this.tempQuatB.x = -this.tempQuatB.x;
        this.tempQuatB.y = -this.tempQuatB.y;
        this.tempQuatB.z = -this.tempQuatB.z;
        this.tempQuatB.w = -this.tempQuatB.w;
        dot = -dot;
      }

      // Clamp dot to prevent NaN in acos
      const clampedDot = Math.min(1.0, Math.max(-1.0, dot));
      const angularDistance = 2.0 * Math.acos(clampedDot); // in radians

      // Deadzone filtering: if movement is tiny, suppress camera sensor jitter
      if (angularDistance < this.deadzone) {
        smoothedPoseBones[boneName] = {
          rotation: current.rotation.clone(),
          position: current.position.clone(),
          confidence: rawTransform.confidence,
          isReliable: true,
        };
        continue;
      }

      // 2. Velocity-adaptive smoothing (1-Euro style):
      // When angular velocity is high, increase lambda so the avatar follows immediately
      const angularVelocity = angularDistance / effectiveDt;
      const velocityBoost = Math.min(3.5, 1.0 + Math.pow(angularVelocity * 0.4, 1.2));
      const dynamicLambda = baseLambda * velocityBoost;

      // Exponential smoothing factor alpha = 1 - e^(-lambda * dt)
      let alpha = 1.0 - Math.exp(-dynamicLambda * effectiveDt);
      alpha = THREE.MathUtils.clamp(alpha, 0.05, 1.0);

      // Spherical linear interpolation towards target rotation
      current.rotation.slerp(this.tempQuatB, alpha);
      current.rotation.normalize();

      // Position smoothing (Vector3)
      this.tempVecA.copy(rawTransform.position);
      const posDist = current.position.distanceTo(this.tempVecA);
      if (posDist > 0.001) {
        const posAlpha = 1.0 - Math.exp(-dynamicLambda * effectiveDt);
        current.position.lerp(this.tempVecA, posAlpha);
      }

      current.confidence = rawTransform.confidence;
      current.isReliable = true;

      smoothedPoseBones[boneName] = {
        rotation: current.rotation.clone(),
        position: current.position.clone(),
        confidence: current.confidence,
        isReliable: true,
      };
    }

    // 3. Smooth hip translation (jump / squat / sway)
    const hipAlpha = 1.0 - Math.exp(-baseLambda * 1.2 * effectiveDt);
    this.smoothedHipPos.lerp(rawPose.hipTranslation, hipAlpha);

    // 4. Smooth facial morphs (mouth & eyes)
    const faceAlpha = 1.0 - Math.exp(-20 * effectiveDt);
    this.smoothedMouth = THREE.MathUtils.lerp(this.smoothedMouth, rawPose.mouthOpen, faceAlpha);
    this.smoothedBlink = THREE.MathUtils.lerp(this.smoothedBlink, rawPose.eyeBlink, faceAlpha);

    return {
      timestamp: rawPose.timestamp,
      confidence: rawPose.confidence,
      isDetected: rawPose.isDetected,
      bones: smoothedPoseBones,
      hipTranslation: this.smoothedHipPos.clone(),
      mouthOpen: this.smoothedMouth,
      eyeBlink: this.smoothedBlink,
    };
  }
}
