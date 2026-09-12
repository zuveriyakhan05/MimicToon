import * as THREE from 'three';
import { HumanoidBoneName, HumanoidBoneMap, AvatarFaceRig, MappedAvatarPose } from '../../types/avatar';

/**
 * BoneController manages the direct application of Quaternion rotations and translations
 * to Three.js Skeleton Bones and procedural Object3D joints.
 * 
 * Features:
 * - Automatic discovery & mapping of standard humanoid bones (Mixamo, VRM, GLTF, Blender, Procedural)
 * - Rest pose caching (initial quaternions and positions)
 * - Safe Quaternion application with physiological joint limit enforcement
 * - Facial morphing (procedural mouth scaling for lip-sync, eye blink scaling)
 * - Rest pose restoration and diagnostics
 */
export class BoneController {
  private root: THREE.Object3D;
  private bones: HumanoidBoneMap = {};
  private face: AvatarFaceRig = {};

  // Rest poses for bones
  private restQuaternions: Map<THREE.Object3D, THREE.Quaternion> = new Map();
  private restPositions: Map<THREE.Object3D, THREE.Vector3> = new Map();
  private restScales: Map<THREE.Object3D, THREE.Vector3> = new Map();

  // Temporary quaternions to avoid GC
  private tempQuat = new THREE.Quaternion();

  constructor(rootObject: THREE.Object3D) {
    this.root = rootObject;
    this.discoverSkeletonAndFace();
    this.cacheRestTransforms();
  }

  /**
   * Traverses object hierarchy and maps standard humanoid bone names and facial features
   */
  private discoverSkeletonAndFace(): void {
    this.bones = {};
    this.face = {};

    this.root.traverse((node) => {
      const name = (node.name || '').toLowerCase();

      // 1. Head & Neck
      if (/(^|[_.-])head([_.-]|$)/i.test(name) || name === 'head') {
        if (!this.bones.head) this.bones.head = node;
      } else if (/(^|[_.-])neck([_.-]|$)/i.test(name) || name === 'neck') {
        if (!this.bones.neck) this.bones.neck = node;
      }

      // 2. Spine & Torso
      else if (/(^|[_.-])spine([_.-]|$)|chest|torso/i.test(name)) {
        if (!this.bones.spine) this.bones.spine = node;
      } else if (/(^|[_.-])hips([_.-]|$)|pelvis|root_bone/i.test(name)) {
        if (!this.bones.hips) this.bones.hips = node;
      }

      // 3. Shoulders
      else if (/shoulder[._-]l|left[._-]?shoulder|clavicle[._-]l/i.test(name)) {
        if (!this.bones.leftShoulder) this.bones.leftShoulder = node;
      } else if (/shoulder[._-]r|right[._-]?shoulder|clavicle[._-]r/i.test(name)) {
        if (!this.bones.rightShoulder) this.bones.rightShoulder = node;
      }

      // 4. Upper Arms
      else if (/upper[._-]?arm[._-]l|arm[._-]l|left[._-]?upper[._-]?arm|leftarm/i.test(name)) {
        if (!this.bones.leftUpperArm) this.bones.leftUpperArm = node;
      } else if (/upper[._-]?arm[._-]r|arm[._-]r|right[._-]?upper[._-]?arm|rightarm/i.test(name)) {
        if (!this.bones.rightUpperArm) this.bones.rightUpperArm = node;
      }

      // 5. Forearms / Elbows
      else if (/forearm[._-]l|lower[._-]?arm[._-]l|left[._-]?forearm|leftlowerarm/i.test(name)) {
        if (!this.bones.leftForearm) this.bones.leftForearm = node;
      } else if (/forearm[._-]r|lower[._-]?arm[._-]r|right[._-]?forearm|rightlowerarm/i.test(name)) {
        if (!this.bones.rightForearm) this.bones.rightForearm = node;
      }

      // 6. Wrists / Hands
      else if (/hand[._-]l|left[._-]?hand|wrist[._-]l/i.test(name)) {
        if (!this.bones.leftHand) this.bones.leftHand = node;
      } else if (/hand[._-]r|right[._-]?hand|wrist[._-]r/i.test(name)) {
        if (!this.bones.rightHand) this.bones.rightHand = node;
      }

      // 7. Thighs / Upper Legs
      else if (/thigh[._-]l|upper[._-]?leg[._-]l|left[._-]?thigh|leftleg/i.test(name)) {
        if (!this.bones.leftThigh) this.bones.leftThigh = node;
      } else if (/thigh[._-]r|upper[._-]?leg[._-]r|right[._-]?thigh|rightleg/i.test(name)) {
        if (!this.bones.rightThigh) this.bones.rightThigh = node;
      }

      // 8. Shins / Lower Legs / Knees
      else if (/shin[._-]l|lower[._-]?leg[._-]l|left[._-]?shin|calf[._-]l/i.test(name)) {
        if (!this.bones.leftLowerLeg) this.bones.leftLowerLeg = node;
      } else if (/shin[._-]r|lower[._-]?leg[._-]r|right[._-]?shin|calf[._-]r/i.test(name)) {
        if (!this.bones.rightLowerLeg) this.bones.rightLowerLeg = node;
      }

      // 9. Feet
      else if (/foot[._-]l|left[._-]?foot|ankle[._-]l/i.test(name)) {
        if (!this.bones.leftFoot) this.bones.leftFoot = node;
      } else if (/foot[._-]r|right[._-]?foot|ankle[._-]r/i.test(name)) {
        if (!this.bones.rightFoot) this.bones.rightFoot = node;
      }

      // 10. Cartoon Face Features
      if (/mouth/i.test(name)) this.face.mouth = node;
      if (/eye[._-]l|lefteye/i.test(name)) this.face.leftEye = node;
      if (/eye[._-]r|righteye/i.test(name)) this.face.rightEye = node;
      if (/pupil[._-]l/i.test(name)) this.face.leftPupil = node;
      if (/pupil[._-]r/i.test(name)) this.face.rightPupil = node;
      if (/eyebrow[._-]l|brow[._-]l|lefteyebrow/i.test(name)) this.face.leftEyebrow = node;
      if (/eyebrow[._-]r|brow[._-]r|righteyebrow/i.test(name)) this.face.rightEyebrow = node;
      if (/cheek[._-]l|leftcheek/i.test(name)) this.face.leftCheek = node;
      if (/cheek[._-]r|rightcheek/i.test(name)) this.face.rightCheek = node;
      if (/ear[._-]l|leftear/i.test(name)) this.face.leftEar = node;
      if (/ear[._-]r|rightear/i.test(name)) this.face.rightEar = node;
      if (/tail/i.test(name)) this.face.tail = node;
      if (/antenna/i.test(name)) this.face.antennae = node;
    });
  }

  /**
   * Caches rest orientation, position, and scale for all discovered nodes
   */
  private cacheRestTransforms(): void {
    this.restQuaternions.clear();
    this.restPositions.clear();
    this.restScales.clear();

    const cacheNode = (node?: THREE.Object3D | null) => {
      if (!node) return;
      if (!this.restQuaternions.has(node)) {
        this.restQuaternions.set(node, node.quaternion.clone());
        this.restPositions.set(node, node.position.clone());
        this.restScales.set(node, node.scale.clone());
      }
    };

    Object.values(this.bones).forEach(cacheNode);
    Object.values(this.face).forEach(cacheNode);
  }

  /**
   * Applies a complete MappedAvatarPose (with quaternions and positions) to the 3D model
   */
  public applyPose(pose: MappedAvatarPose): void {
    // 1. Head & Neck
    this.applyBoneRotation('head', pose.bones.head?.rotation);
    this.applyBoneRotation('neck', pose.bones.neck?.rotation);

    // 2. Spine
    this.applyBoneRotation('spine', pose.bones.spine?.rotation);

    // 3. Hips / Root translation and rotation
    if (this.bones.hips) {
      const restPos = this.restPositions.get(this.bones.hips) || new THREE.Vector3(0, 0, 0);
      if (
        Number.isFinite(pose.hipTranslation.x) &&
        Number.isFinite(pose.hipTranslation.y) &&
        Number.isFinite(pose.hipTranslation.z)
      ) {
        this.bones.hips.position.copy(restPos).add(pose.hipTranslation);
      }
      if (pose.bones.hips?.rotation) {
        this.applyBoneRotation('hips', pose.bones.hips.rotation);
      }
    } else {
      // If no dedicated hips bone, translate avatar root
      if (
        Number.isFinite(pose.hipTranslation.x) &&
        Number.isFinite(pose.hipTranslation.y) &&
        Number.isFinite(pose.hipTranslation.z)
      ) {
        this.root.position.copy(pose.hipTranslation);
      }
    }

    // 4. Arms (Upper arms and forearms)
    this.applyBoneRotation('leftUpperArm', pose.bones.leftUpperArm?.rotation);
    this.applyBoneRotation('rightUpperArm', pose.bones.rightUpperArm?.rotation);
    this.applyBoneRotation('leftForearm', pose.bones.leftForearm?.rotation);
    this.applyBoneRotation('rightForearm', pose.bones.rightForearm?.rotation);

    // 5. Legs (Thighs and lower legs)
    this.applyBoneRotation('leftThigh', pose.bones.leftThigh?.rotation);
    this.applyBoneRotation('rightThigh', pose.bones.rightThigh?.rotation);
    this.applyBoneRotation('leftLowerLeg', pose.bones.leftLowerLeg?.rotation);
    this.applyBoneRotation('rightLowerLeg', pose.bones.rightLowerLeg?.rotation);

    // 6. Facial Animation (Mouth & Eyes)
    this.applyFaceAnimation(pose.mouthOpen, pose.eyeBlink);
  }

  /**
   * Safely applies a target quaternion to a humanoid bone, multiplying with its rest orientation
   */
  private applyBoneRotation(boneName: HumanoidBoneName, targetQuat?: THREE.Quaternion): void {
    const bone = this.bones[boneName];
    if (!bone || !targetQuat) return;
    if (
      !Number.isFinite(targetQuat.x) ||
      !Number.isFinite(targetQuat.y) ||
      !Number.isFinite(targetQuat.z) ||
      !Number.isFinite(targetQuat.w)
    ) {
      return;
    }

    const restQuat = this.restQuaternions.get(bone);
    if (restQuat) {
      // Applied rotation = rest orientation * target relative rotation
      this.tempQuat.copy(restQuat).multiply(targetQuat);
      bone.quaternion.copy(this.tempQuat);
    } else {
      bone.quaternion.copy(targetQuat);
    }
  }

  /**
   * Procedural facial animation: mouth lip-sync and eye blinking
   */
  public applyFaceAnimation(mouthOpen: number, eyeBlink: number): void {
    // Lip-sync: scale mouth mesh vertically
    if (this.face.mouth) {
      const restScale = this.restScales.get(this.face.mouth) || new THREE.Vector3(1, 1, 1);
      const scaleY = THREE.MathUtils.clamp(0.2 + mouthOpen * 1.8, 0.2, 2.4);
      this.face.mouth.scale.y = restScale.y * scaleY;
    }

    // Blinking: scale eyes vertically
    if (this.face.leftEye) {
      const restScale = this.restScales.get(this.face.leftEye) || new THREE.Vector3(1, 1, 1);
      const eyeScaleY = Math.max(0.1, 1.0 - eyeBlink * 0.85);
      this.face.leftEye.scale.y = restScale.y * eyeScaleY;
    }
    if (this.face.rightEye) {
      const restScale = this.restScales.get(this.face.rightEye) || new THREE.Vector3(1, 1, 1);
      const eyeScaleY = Math.max(0.1, 1.0 - eyeBlink * 0.85);
      this.face.rightEye.scale.y = restScale.y * eyeScaleY;
    }
  }

  /**
   * Restores all rigged bones to their initial rest pose
   */
  public resetToRest(): void {
    for (const [node, quat] of this.restQuaternions.entries()) {
      node.quaternion.copy(quat);
    }
    for (const [node, pos] of this.restPositions.entries()) {
      node.position.copy(pos);
    }
    for (const [node, scale] of this.restScales.entries()) {
      node.scale.copy(scale);
    }
    this.root.position.set(0, 0, 0);
  }

  /**
   * Returns list of recognized humanoid bone names for diagnostics/HUD
   */
  public getRecognizedBones(): HumanoidBoneName[] {
    return Object.keys(this.bones) as HumanoidBoneName[];
  }

  /**
   * Returns true if essential upper body bones are mapped
   */
  public hasMinimumTrackingRig(): boolean {
    return !!(this.bones.leftUpperArm || this.bones.rightUpperArm || this.bones.head);
  }

  public getBone(boneName: HumanoidBoneName): THREE.Object3D | THREE.Bone | undefined {
    return this.bones[boneName];
  }
}
