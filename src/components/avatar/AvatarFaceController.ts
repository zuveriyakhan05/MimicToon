import * as THREE from 'three';
import {
  AvatarFaceExpressionType,
  AvatarFacePose,
  AvatarFaceRig,
  FaceSignals,
  HumanoidBoneName,
} from '../../types/avatar';
import { FaceExpressionMapper } from './FaceExpressionMapper';

export interface AvatarFaceControllerOptions {
  enableHeadRotation?: boolean;
  enableEyeGaze?: boolean;
  enableMorphTargets?: boolean;
  headRotationMultiplier?: number;
  speechExaggeration?: number;
}

/**
 * Morph target mapping dictionary entry
 */
interface MorphTargetBinding {
  mesh: THREE.Mesh;
  index: number;
}

/**
 * AvatarFaceController applies facial expressions, head rotations, speech lip-sync,
 * and eye blinks onto 3D humanoid rigs and procedural cartoon characters in Three.js.
 * 
 * Works seamlessly with:
 * - Procedural cartoon rigs (Robo Pup, Space Cat, Bouncy Bear, Pixel Dino)
 * - SkinnedMesh GLTF / VRM / Ready Player Me models with ARKit morph targets
 */
export class AvatarFaceController {
  private root: THREE.Object3D | null = null;
  private faceRig: AvatarFaceRig = {};
  private headBone: THREE.Object3D | null = null;
  private neckBone: THREE.Object3D | null = null;

  // Cached rest transforms to prevent drift
  private restPositions: Map<THREE.Object3D, THREE.Vector3> = new Map();
  private restRotations: Map<THREE.Object3D, THREE.Euler> = new Map();
  private restScales: Map<THREE.Object3D, THREE.Vector3> = new Map();
  private restQuaternions: Map<THREE.Object3D, THREE.Quaternion> = new Map();

  // Morph targets for GLTF models
  private morphBindings: Map<string, MorphTargetBinding[]> = new Map();

  // Integrated mapper for one-line signal processing
  private expressionMapper: FaceExpressionMapper;

  // Options
  private enableHeadRotation: boolean;
  private enableEyeGaze: boolean;
  private enableMorphTargets: boolean;
  private headRotationMultiplier: number;
  private speechExaggeration: number;

  // Reusable objects to avoid garbage collection
  private tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private tempQuat = new THREE.Quaternion();

  constructor(
    rootObject?: THREE.Object3D | null,
    options: AvatarFaceControllerOptions = {}
  ) {
    this.enableHeadRotation = options.enableHeadRotation ?? true;
    this.enableEyeGaze = options.enableEyeGaze ?? true;
    this.enableMorphTargets = options.enableMorphTargets ?? true;
    this.headRotationMultiplier = options.headRotationMultiplier ?? 1.0;
    this.speechExaggeration = options.speechExaggeration ?? 1.2;

    this.expressionMapper = new FaceExpressionMapper();

    if (rootObject) {
      this.attachModel(rootObject);
    }
  }

  /**
   * Attaches a 3D model hierarchy, discovers face nodes, bones, and morph targets
   */
  public attachModel(rootObject: THREE.Object3D | null): void {
    this.root = rootObject;
    this.faceRig = {};
    this.headBone = null;
    this.neckBone = null;
    this.restPositions.clear();
    this.restRotations.clear();
    this.restScales.clear();
    this.restQuaternions.clear();
    this.morphBindings.clear();

    if (!rootObject) return;

    // 1. Traverse hierarchy to locate bones, procedural facial parts, and morph targets
    rootObject.traverse((node) => {
      const name = (node.name || '').toLowerCase();

      // Bones
      if (/(^|[_.-])head([_.-]|$)/i.test(name) || name === 'head') {
        if (!this.headBone) this.headBone = node;
      } else if (/(^|[_.-])neck([_.-]|$)/i.test(name) || name === 'neck') {
        if (!this.neckBone) this.neckBone = node;
      }

      // Procedural facial features
      if (/mouth/i.test(name)) this.faceRig.mouth = node;
      if (/eye[._-]l|lefteye/i.test(name)) this.faceRig.leftEye = node;
      if (/eye[._-]r|righteye/i.test(name)) this.faceRig.rightEye = node;
      if (/pupil[._-]l/i.test(name)) this.faceRig.leftPupil = node;
      if (/pupil[._-]r/i.test(name)) this.faceRig.rightPupil = node;
      if (/eyebrow[._-]l|brow[._-]l|lefteyebrow/i.test(name)) this.faceRig.leftEyebrow = node;
      if (/eyebrow[._-]r|brow[._-]r|righteyebrow/i.test(name)) this.faceRig.rightEyebrow = node;
      if (/cheek[._-]l|leftcheek/i.test(name)) this.faceRig.leftCheek = node;
      if (/cheek[._-]r|rightcheek/i.test(name)) this.faceRig.rightCheek = node;
      if (/ear[._-]l|leftear/i.test(name)) this.faceRig.leftEar = node;
      if (/ear[._-]r|rightear/i.test(name)) this.faceRig.rightEar = node;
      if (/antenna/i.test(name)) this.faceRig.antennae = node;

      // Check GLTF Morph Targets
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        for (const [targetName, index] of Object.entries(mesh.morphTargetDictionary)) {
          const lowerTarget = targetName.toLowerCase();
          if (!this.morphBindings.has(lowerTarget)) {
            this.morphBindings.set(lowerTarget, []);
          }
          this.morphBindings.get(lowerTarget)!.push({ mesh, index });
        }
      }
    });

    // 2. Cache rest transformations
    const cacheTransform = (node?: THREE.Object3D | null) => {
      if (!node) return;
      if (!this.restPositions.has(node)) {
        this.restPositions.set(node, node.position.clone());
        this.restRotations.set(node, node.rotation.clone());
        this.restScales.set(node, node.scale.clone());
        this.restQuaternions.set(node, node.quaternion.clone());
      }
    };

    cacheTransform(this.headBone);
    cacheTransform(this.neckBone);
    Object.values(this.faceRig).forEach(cacheTransform);
  }

  /**
   * Directly updates face from raw FaceSignals via internal FaceExpressionMapper
   */
  public updateFromSignals(signals: FaceSignals | null, deltaTime: number = 0.016): AvatarFacePose {
    const facePose = this.expressionMapper.mapSignalsToFacePose(signals, deltaTime);
    this.applyFacePose(facePose, deltaTime);
    return facePose;
  }

  /**
   * Primary application method:
   * Maps an AvatarFacePose onto procedural face nodes, morph targets, and head bones.
   */
  public applyFacePose(pose: AvatarFacePose, deltaTime: number = 0.016): void {
    if (!this.root) return;

    // 1. Head & Neck Orientation
    if (this.enableHeadRotation && (this.headBone || this.neckBone)) {
      this.applyHeadRotation(pose.headRotation);
    }

    // 2. Procedural Facial Feature Animation
    this.applyProceduralFace(pose);

    // 3. GLTF ARKit Morph Targets (if available on the model)
    if (this.enableMorphTargets && this.morphBindings.size > 0) {
      this.applyMorphTargets(pose);
    }
  }

  /**
   * Applies head pitch, yaw, and roll with safety joint limits
   */
  private applyHeadRotation(rot: { pitch: number; yaw: number; roll: number }): void {
    const mult = this.headRotationMultiplier;

    // Physiological clamping (radians)
    const pitch = THREE.MathUtils.clamp(rot.pitch * mult, -0.6, 0.6);
    const yaw = THREE.MathUtils.clamp(rot.yaw * mult, -0.75, 0.75);
    const roll = THREE.MathUtils.clamp(rot.roll * mult, -0.5, 0.5);

    if (this.headBone) {
      const restQuat = this.restQuaternions.get(this.headBone);
      // Head takes 70% of orientation
      this.tempEuler.set(pitch * 0.7, yaw * 0.7, roll * 0.7, 'YXZ');
      this.tempQuat.setFromEuler(this.tempEuler);

      if (restQuat) {
        this.headBone.quaternion.copy(restQuat).multiply(this.tempQuat);
      } else {
        this.headBone.quaternion.copy(this.tempQuat);
      }
    }

    if (this.neckBone) {
      const restQuat = this.restQuaternions.get(this.neckBone);
      // Neck takes remaining 30% for natural distributed rotation
      this.tempEuler.set(pitch * 0.3, yaw * 0.3, roll * 0.3, 'YXZ');
      this.tempQuat.setFromEuler(this.tempEuler);

      if (restQuat) {
        this.neckBone.quaternion.copy(restQuat).multiply(this.tempQuat);
      } else {
        this.neckBone.quaternion.copy(this.tempQuat);
      }
    }
  }

  /**
   * Animates procedural cartoon face features (mouth, eyes, eyebrows, pupils, ears)
   */
  private applyProceduralFace(pose: AvatarFacePose): void {
    const {
      mouthOpen,
      mouthSmile,
      mouthFrown,
      eyeBlinkLeft,
      eyeBlinkRight,
      eyebrowHeight,
      eyebrowTilt,
      faceDirection,
      dominantExpression,
    } = pose;

    // --- A. MOUTH ANIMATION (Lip-sync speech + Smile / Frown) ---
    if (this.faceRig.mouth) {
      const restScale = this.restScales.get(this.faceRig.mouth) || new THREE.Vector3(1, 1, 1);
      const restPos = this.restPositions.get(this.faceRig.mouth) || new THREE.Vector3(0, 0, 0);

      // Speech vertical mouth opening
      const speechScaleY = THREE.MathUtils.clamp(
        0.2 + mouthOpen * 2.0 * this.speechExaggeration,
        0.18,
        2.5
      );

      // Width scaling: widen for smile (happy), round/contract for surprise or frown
      let widthMult = 1.0;
      if (mouthSmile > 0.2) {
        widthMult += mouthSmile * 0.35; // Happy wide smile
      } else if (dominantExpression === 'surprised') {
        widthMult -= 0.15; // Surprise 'O' shape
      } else if (mouthFrown > 0.3) {
        widthMult -= 0.1;
      }

      this.faceRig.mouth.scale.set(
        restScale.x * widthMult,
        restScale.y * speechScaleY,
        restScale.z
      );

      // Slight jaw drop position
      this.faceRig.mouth.position.y = restPos.y - mouthOpen * 0.04;
    }

    // --- B. EYE BLINKING & SURPRISE SCALING ---
    const isSurprised = dominantExpression === 'surprised';
    const eyeScaleMult = isSurprised ? 1.25 : 1.0;

    // Left Eye
    if (this.faceRig.leftEye) {
      const restScale = this.restScales.get(this.faceRig.leftEye) || new THREE.Vector3(1, 1, 1);
      const restRot = this.restRotations.get(this.faceRig.leftEye) || new THREE.Euler(0, 0, 0);

      // Vertical flatten on blink (minimum 0.08 so geometry doesn't invert)
      const blinkFactor = Math.max(0.08, 1.0 - eyeBlinkLeft * 0.92);
      this.faceRig.leftEye.scale.set(
        restScale.x * eyeScaleMult,
        restScale.y * blinkFactor * eyeScaleMult,
        restScale.z
      );

      // Eye tilt (angry inward slant, sad outward droop)
      if (eyebrowTilt !== 0) {
        this.faceRig.leftEye.rotation.z = restRot.z - eyebrowTilt * 0.18;
      } else {
        this.faceRig.leftEye.rotation.z = restRot.z;
      }
    }

    // Right Eye
    if (this.faceRig.rightEye) {
      const restScale = this.restScales.get(this.faceRig.rightEye) || new THREE.Vector3(1, 1, 1);
      const restRot = this.restRotations.get(this.faceRig.rightEye) || new THREE.Euler(0, 0, 0);

      const blinkFactor = Math.max(0.08, 1.0 - eyeBlinkRight * 0.92);
      this.faceRig.rightEye.scale.set(
        restScale.x * eyeScaleMult,
        restScale.y * blinkFactor * eyeScaleMult,
        restScale.z
      );

      if (eyebrowTilt !== 0) {
        this.faceRig.rightEye.rotation.z = restRot.z + eyebrowTilt * 0.18;
      } else {
        this.faceRig.rightEye.rotation.z = restRot.z;
      }
    }

    // --- C. PUPILS GAZE TRACKING ---
    if (this.enableEyeGaze) {
      const gazeLimitX = 0.035;
      const gazeLimitY = 0.025;

      if (this.faceRig.leftPupil) {
        const restPos = this.restPositions.get(this.faceRig.leftPupil) || new THREE.Vector3(0, 0, 0.08);
        this.faceRig.leftPupil.position.x = restPos.x + faceDirection.x * gazeLimitX;
        this.faceRig.leftPupil.position.y = restPos.y + faceDirection.y * gazeLimitY;
      }
      if (this.faceRig.rightPupil) {
        const restPos = this.restPositions.get(this.faceRig.rightPupil) || new THREE.Vector3(0, 0, 0.08);
        this.faceRig.rightPupil.position.x = restPos.x + faceDirection.x * gazeLimitX;
        this.faceRig.rightPupil.position.y = restPos.y + faceDirection.y * gazeLimitY;
      }
    }

    // --- D. EYEBROWS (Surprised lift, Angry furrow & slant, Sad arch) ---
    if (this.faceRig.leftEyebrow) {
      const restPos = this.restPositions.get(this.faceRig.leftEyebrow) || new THREE.Vector3(0, 0, 0);
      const restRot = this.restRotations.get(this.faceRig.leftEyebrow) || new THREE.Euler(0, 0, 0);

      this.faceRig.leftEyebrow.position.y = restPos.y + eyebrowHeight * 0.06;
      // Inward rotation for angry, outward for sad
      this.faceRig.leftEyebrow.rotation.z = restRot.z - eyebrowTilt * 0.35;
    }
    if (this.faceRig.rightEyebrow) {
      const restPos = this.restPositions.get(this.faceRig.rightEyebrow) || new THREE.Vector3(0, 0, 0);
      const restRot = this.restRotations.get(this.faceRig.rightEyebrow) || new THREE.Euler(0, 0, 0);

      this.faceRig.rightEyebrow.position.y = restPos.y + eyebrowHeight * 0.06;
      this.faceRig.rightEyebrow.rotation.z = restRot.z + eyebrowTilt * 0.35;
    }

    // --- E. CARTOON CHEEKS & EARS EXPRESSIVENESS ---
    if (this.faceRig.leftCheek && this.faceRig.rightCheek) {
      const restScaleL = this.restScales.get(this.faceRig.leftCheek) || new THREE.Vector3(1, 1, 1);
      const restScaleR = this.restScales.get(this.faceRig.rightCheek) || new THREE.Vector3(1, 1, 1);
      // Cheeks puff slightly when smiling
      const cheekMult = 1.0 + mouthSmile * 0.4;
      this.faceRig.leftCheek.scale.set(restScaleL.x * cheekMult, restScaleL.y * cheekMult, restScaleL.z);
      this.faceRig.rightCheek.scale.set(restScaleR.x * cheekMult, restScaleR.y * cheekMult, restScaleR.z);
    }

    // Ear wiggles / perk up
    if (this.faceRig.leftEar && this.faceRig.rightEar) {
      const restRotL = this.restRotations.get(this.faceRig.leftEar) || new THREE.Euler(0, 0, 0);
      const restRotR = this.restRotations.get(this.faceRig.rightEar) || new THREE.Euler(0, 0, 0);

      if (dominantExpression === 'surprised') {
        // Perk up ears
        this.faceRig.leftEar.rotation.z = restRotL.z + 0.15;
        this.faceRig.rightEar.rotation.z = restRotR.z - 0.15;
      } else if (dominantExpression === 'sad' || dominantExpression === 'angry') {
        // Droop ears
        this.faceRig.leftEar.rotation.z = restRotL.z - 0.18;
        this.faceRig.rightEar.rotation.z = restRotR.z + 0.18;
      } else {
        this.faceRig.leftEar.rotation.z = restRotL.z;
        this.faceRig.rightEar.rotation.z = restRotR.z;
      }
    }
  }

  /**
   * Applies ARKit blendshapes to GLTF meshes with morph target dictionaries
   */
  private applyMorphTargets(pose: AvatarFacePose): void {
    const setMorph = (targetKeywords: string[], value: number) => {
      for (const kw of targetKeywords) {
        const bindings = this.morphBindings.get(kw.toLowerCase());
        if (bindings) {
          for (const { mesh, index } of bindings) {
            if (mesh.morphTargetInfluences) {
              mesh.morphTargetInfluences[index] = THREE.MathUtils.clamp(value, 0, 1);
            }
          }
        }
      }
    };

    // Mouth
    setMorph(['jawopen', 'mouthopen', 'mouth_open'], pose.mouthOpen);
    setMorph(['mouthsmileleft', 'mouth_smile_l', 'smile_l'], pose.mouthSmile);
    setMorph(['mouthsmileright', 'mouth_smile_r', 'smile_r'], pose.mouthSmile);
    setMorph(['mouthfrownleft', 'mouth_frown_l', 'frown_l'], pose.mouthFrown);
    setMorph(['mouthfrownright', 'mouth_frown_r', 'frown_r'], pose.mouthFrown);

    // Eyes
    setMorph(['eyeblinkleft', 'blink_l', 'eye_blink_l'], pose.eyeBlinkLeft);
    setMorph(['eyeblinkright', 'blink_r', 'eye_blink_r'], pose.eyeBlinkRight);

    // Eyebrows
    const browUp = Math.max(0, pose.eyebrowHeight);
    const browDown = Math.max(0, -pose.eyebrowHeight);
    setMorph(['browinnerup', 'brow_up', 'eyebrow_raise'], browUp);
    setMorph(['browdownleft', 'browdownright', 'brow_down'], browDown);

    // Surprise wide eyes
    if (pose.dominantExpression === 'surprised') {
      setMorph(['eyewideleft', 'eyewideright', 'eye_wide'], 0.8);
    }
  }

  /**
   * Restores all face nodes and morph targets back to resting state
   */
  public resetToRest(): void {
    for (const [node, pos] of this.restPositions.entries()) {
      node.position.copy(pos);
    }
    for (const [node, rot] of this.restRotations.entries()) {
      node.rotation.copy(rot);
    }
    for (const [node, scale] of this.restScales.entries()) {
      node.scale.copy(scale);
    }
    for (const [node, quat] of this.restQuaternions.entries()) {
      node.quaternion.copy(quat);
    }

    // Reset all morph target influences
    for (const bindings of this.morphBindings.values()) {
      for (const { mesh, index } of bindings) {
        if (mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[index] = 0;
        }
      }
    }

    this.expressionMapper.reset();
  }

  public getFaceRig(): AvatarFaceRig {
    return this.faceRig;
  }

  public hasMorphTargets(): boolean {
    return this.morphBindings.size > 0;
  }

  public getExpressionMapper(): FaceExpressionMapper {
    return this.expressionMapper;
  }
}
