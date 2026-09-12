import * as THREE from 'three';
import { BodyMotion, PoseLandmarks } from '../../types';
import {
  MappedAvatarPose,
  MotionMapperOptions,
  MotionSmootherOptions,
  FaceSignals,
  AvatarFacePose,
} from '../../types/avatar';
import { MotionMapper } from './MotionMapper';
import { MotionSmoother } from './MotionSmoother';
import { BoneController } from './BoneController';
import { AvatarFaceController } from './AvatarFaceController';

export interface AvatarMotionEngineOptions {
  isMirrored?: boolean;
  smoothingFactor?: number;
  sensitivity?: number;
  confidenceThreshold?: number;
}

/**
 * AvatarMotionEngine orchestrates the entire real-time body tracking pipeline:
 * 
 * [MediaPipe BodyMotion / PoseLandmarks]
 *          │
 *          ▼
 *   MotionMapper (Calculates Avatar 3D coordinates, Quaternions, Mirroring & Joint Limits)
 *          │
 *          ▼
 *   MotionSmoother (Adaptive Slerp, 1-Euro Velocity Filtering, Jitter Elimination)
 *          │
 *          ▼
 *   BoneController (Applies Quaternions & Translations to 3D Bones & Procedural Face)
 *          │
 *          ▼
 *   AvatarFaceController (Maps expressions, blinks, smiles, eyebrows, and head orientation)
 */
export class AvatarMotionEngine {
  private mapper: MotionMapper;
  private smoother: MotionSmoother;
  private boneController: BoneController | null = null;
  private faceController: AvatarFaceController | null = null;

  // Runtime tracking metrics
  private lastPose: MappedAvatarPose | null = null;
  private lastFacePose: AvatarFacePose | null = null;
  private trackingConfidence: number = 0;
  private isTrackingActive: boolean = false;

  constructor(options: AvatarMotionEngineOptions = {}) {
    this.mapper = new MotionMapper({
      isMirrored: options.isMirrored ?? true,
      confidenceThreshold: options.confidenceThreshold ?? 0.45,
      sensitivity: options.sensitivity ?? 1.0,
    });

    this.smoother = new MotionSmoother({
      smoothingAmount: options.smoothingFactor ?? 0.25,
      sensitivity: options.sensitivity ?? 1.0,
    });
  }

  /**
   * Attaches a Three.js 3D character hierarchy (GLTF / SkinnedMesh / Procedural)
   */
  public attachModel(rootObject: THREE.Object3D | null): void {
    if (!rootObject) {
      this.boneController = null;
      this.faceController = null;
      return;
    }
    this.boneController = new BoneController(rootObject);
    this.faceController = new AvatarFaceController(rootObject);
    this.smoother.reset();
    this.mapper.resetCalibration();
  }

  /**
   * Updates configuration at runtime
   */
  public setMirrored(mirrored: boolean): void {
    this.mapper.setMirrored(mirrored);
  }

  public setSmoothing(amount: number): void {
    this.smoother.setSmoothingAmount(amount);
  }

  public setSensitivity(sensitivity: number): void {
    this.mapper.setSensitivity(sensitivity);
    this.smoother.setSensitivity(sensitivity);
  }

  public setConfidenceThreshold(threshold: number): void {
    this.mapper.setConfidenceThreshold(threshold);
  }

  /**
   * Primary frame update method:
   * Maps MediaPipe BodyMotion data into smoothed avatar bone transforms.
   */
  public updateWithMotion(
    motion: BodyMotion | null,
    mouthOpenLevel: number = 0,
    deltaTime: number = 0.016
  ): MappedAvatarPose | null {
    if (!this.boneController) return null;

    // 1. Convert MediaPipe landmarks into raw mapped avatar pose (Quaternions & 3D space)
    const rawPose = this.mapper.mapMotionToAvatarPose(motion, undefined, mouthOpenLevel);

    this.isTrackingActive = rawPose.isDetected;
    this.trackingConfidence = rawPose.confidence;

    // 2. Apply temporal smoothing, slerp interpolation, and jitter reduction
    const smoothedPose = this.smoother.smoothPose(rawPose, deltaTime);
    this.lastPose = smoothedPose;

    // 3. Apply smoothed quaternions and translations directly to the 3D skeleton bones
    this.boneController.applyPose(smoothedPose);

    return smoothedPose;
  }

  /**
   * Updates with raw landmarks
   */
  public updateWithLandmarks(
    landmarks: PoseLandmarks | null,
    mouthOpenLevel: number = 0,
    deltaTime: number = 0.016
  ): MappedAvatarPose | null {
    if (!this.boneController) return null;

    const rawPose = this.mapper.mapMotionToAvatarPose(null, landmarks, mouthOpenLevel);
    const smoothedPose = this.smoother.smoothPose(rawPose, deltaTime);
    this.lastPose = smoothedPose;
    this.boneController.applyPose(smoothedPose);
    return smoothedPose;
  }

  /**
  * Applies facial expressions, blinks, smiles, eyebrows, and speech lip-sync from FaceSignals
  */
  public updateWithFaceSignals(
    signals: FaceSignals | null,
    deltaTime: number = 0.016
  ): AvatarFacePose | null {
    if (!this.faceController) return null;
    const pose = this.faceController.updateFromSignals(signals, deltaTime);
    this.lastFacePose = pose;
    return pose;
  }

  /**
   * Applies pre-mapped AvatarFacePose directly
   */
  public updateWithFacePose(pose: AvatarFacePose, deltaTime: number = 0.016): void {
    if (this.faceController) {
      this.faceController.applyFacePose(pose, deltaTime);
      this.lastFacePose = pose;
    }
  }

  /**
   * Applies procedural facial animation (mouth lip-sync and eye blink)
   */
  public setFacialExpression(mouthOpen: number, eyeBlink: number): void {
    if (this.boneController) {
      this.boneController.applyFaceAnimation(mouthOpen, eyeBlink);
    }
  }

  /**
   * Resets all bones, face features, and filters back to default rest pose
   */
  public reset(): void {
    this.smoother.reset();
    this.mapper.resetCalibration();
    if (this.boneController) {
      this.boneController.resetToRest();
    }
    if (this.faceController) {
      this.faceController.resetToRest();
    }
    this.lastPose = null;
    this.lastFacePose = null;
    this.isTrackingActive = false;
  }

  /**
   * Returns current tracking status for HUD / debugging
   */
  public getTrackingStatus(): {
    isAttached: boolean;
    isTracking: boolean;
    confidence: number;
    bonesCount: number;
    recognizedBones: string[];
  } {
    return {
      isAttached: !!this.boneController,
      isTracking: this.isTrackingActive,
      confidence: this.trackingConfidence,
      bonesCount: this.boneController ? this.boneController.getRecognizedBones().length : 0,
      recognizedBones: this.boneController ? this.boneController.getRecognizedBones() : [],
    };
  }

  public getBoneController(): BoneController | null {
    return this.boneController;
  }

  public getLastPose(): MappedAvatarPose | null {
    return this.lastPose;
  }
}
