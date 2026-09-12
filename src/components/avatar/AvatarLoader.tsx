import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterProfile } from '../../types';
import { ModelLoadStatus } from '../../types/avatar';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface AvatarLoaderProps {
  character: CharacterProfile;
  modelUrl?: string;
  onModelReady: (root: THREE.Object3D, isCustomModel: boolean) => void;
  onError?: (errorMsg: string) => void;
}

/**
 * Builds the articulated cartoon procedural mesh for our core buddies
 * Ensures every node is tagged with standard humanoid bone names so AvatarRig can control it seamlessly.
 */
export function buildProceduralCartoonCharacter(character: CharacterProfile): THREE.Group {
  const root = new THREE.Group();
  root.name = 'avatar_root';

  const primaryMat = new THREE.MeshStandardMaterial({
    color: character.primaryColor,
    roughness: 0.35,
    metalness: 0.15,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: character.secondaryColor,
    roughness: 0.4,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: character.accentColor,
    roughness: 0.2,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // 1. Hips / Pelvis
  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0, 0);
  root.add(hips);

  // 2. Spine / Torso
  const spine = new THREE.Group();
  spine.name = 'spine';
  hips.add(spine);

  const bodyGeo = new THREE.SphereGeometry(0.55, 32, 32);
  bodyGeo.scale(1, 1.25, 0.9);
  const bodyMesh = new THREE.Mesh(bodyGeo, primaryMat);
  bodyMesh.name = 'body_mesh';
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  spine.add(bodyMesh);

  // Belly patch
  const bellyGeo = new THREE.SphereGeometry(0.38, 24, 24);
  bellyGeo.scale(0.9, 1.1, 0.4);
  const bellyMesh = new THREE.Mesh(bellyGeo, secondaryMat);
  bellyMesh.name = 'belly_mesh';
  bellyMesh.position.set(0, -0.05, 0.42);
  spine.add(bellyMesh);

  // 3. Neck & Head
  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, 0.72, 0);
  spine.add(neck);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.15, 0);
  neck.add(head);

  const headGeo = new THREE.SphereGeometry(0.52, 32, 32);
  headGeo.scale(1.1, 1.0, 1.05);
  const headMesh = new THREE.Mesh(headGeo, primaryMat);
  headMesh.name = 'head_mesh';
  headMesh.castShadow = true;
  head.add(headMesh);

  // Expressive cartoon eyes
  const eyeGeo = new THREE.SphereGeometry(0.14, 24, 24);
  eyeGeo.scale(1, 1.2, 0.7);

  // Left Eye
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.name = 'eye_l';
  leftEyeGroup.position.set(-0.22, 0.08, 0.46);
  const leftEyeWhite = new THREE.Mesh(eyeGeo, whiteMat);
  const pupilGeo = new THREE.SphereGeometry(0.07, 16, 16);
  const leftPupil = new THREE.Mesh(pupilGeo, blackMat);
  leftPupil.name = 'pupil_l';
  leftPupil.position.set(0, 0, 0.08);
  const highlightGeo = new THREE.SphereGeometry(0.025, 12, 12);
  const leftHighlight = new THREE.Mesh(highlightGeo, whiteMat);
  leftHighlight.position.set(-0.02, 0.03, 0.12);
  leftEyeGroup.add(leftEyeWhite, leftPupil, leftHighlight);
  head.add(leftEyeGroup);

  // Right Eye
  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.name = 'eye_r';
  rightEyeGroup.position.set(0.22, 0.08, 0.46);
  const rightEyeWhite = new THREE.Mesh(eyeGeo, whiteMat);
  const rightPupil = new THREE.Mesh(pupilGeo, blackMat);
  rightPupil.name = 'pupil_r';
  rightPupil.position.set(0, 0, 0.08);
  const rightHighlight = new THREE.Mesh(highlightGeo, whiteMat);
  rightHighlight.position.set(-0.02, 0.03, 0.12);
  rightEyeGroup.add(rightEyeWhite, rightPupil, rightHighlight);
  head.add(rightEyeGroup);

  // Expressive cartoon eyebrows (surprised lift, angry furrow, sad tilt)
  const browMat = new THREE.MeshStandardMaterial({
    color: character.secondaryColor,
    roughness: 0.5,
  });
  const browGeo = new THREE.BoxGeometry(0.15, 0.04, 0.04);

  const leftBrow = new THREE.Mesh(browGeo, browMat);
  leftBrow.name = 'eyebrow_l';
  leftBrow.position.set(-0.22, 0.24, 0.48);
  head.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo, browMat);
  rightBrow.name = 'eyebrow_r';
  rightBrow.position.set(0.22, 0.24, 0.48);
  head.add(rightBrow);

  // Cute cartoon cheeks (puffs and blushes when child smiles)
  const cheekMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.65,
  });
  const cheekGeo = new THREE.SphereGeometry(0.08, 16, 16);
  cheekGeo.scale(1.2, 0.7, 0.3);

  const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
  leftCheek.name = 'cheek_l';
  leftCheek.position.set(-0.34, -0.06, 0.46);
  head.add(leftCheek);

  const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
  rightCheek.name = 'cheek_r';
  rightCheek.position.set(0.34, -0.06, 0.46);
  head.add(rightCheek);

  // Animated Mouth
  const mouthGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16, 1, false, 0, Math.PI);
  mouthGeo.rotateX(Math.PI / 2);
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.name = 'mouth';
  mouth.position.set(0, -0.22, 0.5);
  mouth.scale.set(1, 0.3, 1);
  head.add(mouth);

  // Cute Nose
  const noseGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const noseMesh = new THREE.Mesh(noseGeo, accentMat);
  noseMesh.name = 'nose';
  noseMesh.position.set(0, -0.05, 0.54);
  head.add(noseMesh);

  // Character-Specific Features (Ears / Horns / Antenna / Tails)
  const leftEarGroup = new THREE.Group();
  leftEarGroup.name = 'ear_l';
  const rightEarGroup = new THREE.Group();
  rightEarGroup.name = 'ear_r';

  const style = character.avatarStyle || 'bunny';

  if (style === 'bunny') {
    // Bunny: Long perky ears with pink inner lining
    const earGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.72, 16);
    earGeo.scale(1, 1, 0.5);
    const earMeshL = new THREE.Mesh(earGeo, primaryMat);
    earMeshL.rotation.z = 0.25;
    leftEarGroup.position.set(-0.25, 0.65, 0);

    const earInnerGeo = new THREE.CylinderGeometry(0.045, 0.07, 0.62, 16);
    earInnerGeo.scale(1, 1, 0.3);
    const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
    const earInnerL = new THREE.Mesh(earInnerGeo, earInnerMat);
    earInnerL.position.set(0, 0, 0.06);
    earInnerL.rotation.z = 0.25;
    leftEarGroup.add(earMeshL, earInnerL);

    const earMeshR = new THREE.Mesh(earGeo, primaryMat);
    earMeshR.rotation.z = -0.25;
    rightEarGroup.position.set(0.25, 0.65, 0);
    const earInnerR = new THREE.Mesh(earInnerGeo, earInnerMat);
    earInnerR.position.set(0, 0, 0.06);
    earInnerR.rotation.z = -0.25;
    rightEarGroup.add(earMeshR, earInnerR);

    // Cute Buck Teeth
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const teethGeo = new THREE.BoxGeometry(0.045, 0.05, 0.03);
    const toothL = new THREE.Mesh(teethGeo, teethMat);
    toothL.position.set(-0.03, -0.25, 0.52);
    const toothR = new THREE.Mesh(teethGeo, teethMat);
    toothR.position.set(0.03, -0.25, 0.52);
    head.add(toothL, toothR);

    // Fluffy round bunny cotton tail on hips
    const tailGroup = new THREE.Group();
    tailGroup.name = 'tail';
    const tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), whiteMat);
    tailMesh.name = 'tail_mesh';
    tailMesh.position.set(0, 0.1, -0.45);
    tailGroup.add(tailMesh);
    hips.add(tailGroup);
  } else if (style === 'bear' || style === 'bouncy_bear') {
    // Bear: Big round teddy bear ears with gold inner cups
    const earGeo = new THREE.SphereGeometry(0.22, 20, 20);
    const earMeshL = new THREE.Mesh(earGeo, primaryMat);
    leftEarGroup.position.set(-0.45, 0.45, 0);
    const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), secondaryMat);
    innerEar.position.set(0, 0, 0.08);
    leftEarGroup.add(earMeshL, innerEar);

    const earMeshR = new THREE.Mesh(earGeo, primaryMat);
    rightEarGroup.position.set(0.45, 0.45, 0);
    const innerEarR = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), secondaryMat);
    innerEarR.position.set(0, 0, 0.08);
    rightEarGroup.add(earMeshR, innerEarR);

    // Bear Snout / Muzzle
    const snoutGeo = new THREE.SphereGeometry(0.22, 20, 20);
    snoutGeo.scale(1.2, 0.85, 0.8);
    const snoutMesh = new THREE.Mesh(snoutGeo, secondaryMat);
    snoutMesh.position.set(0, -0.1, 0.46);
    head.add(snoutMesh);

    // Round bear tail
    const tailGroup = new THREE.Group();
    tailGroup.name = 'tail';
    const tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), primaryMat);
    tailMesh.name = 'tail_mesh';
    tailMesh.position.set(0, 0.08, -0.42);
    tailGroup.add(tailMesh);
    hips.add(tailGroup);
  } else if (style === 'fox') {
    // Fox: Tall sleek triangular ears with white inner fur tufts
    const earGeo = new THREE.ConeGeometry(0.19, 0.52, 16);
    const earMeshL = new THREE.Mesh(earGeo, primaryMat);
    earMeshL.rotation.z = 0.35;
    leftEarGroup.position.set(-0.35, 0.55, 0);
    const innerTuft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.4, 16), whiteMat);
    innerTuft.rotation.z = 0.35;
    innerTuft.position.set(0, 0, 0.05);
    leftEarGroup.add(earMeshL, innerTuft);

    const earMeshR = new THREE.Mesh(earGeo, primaryMat);
    earMeshR.rotation.z = -0.35;
    rightEarGroup.position.set(0.35, 0.55, 0);
    const innerTuftR = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.4, 16), whiteMat);
    innerTuftR.rotation.z = -0.35;
    innerTuftR.position.set(0, 0, 0.05);
    rightEarGroup.add(earMeshR, innerTuftR);

    // Fox pointed muzzle
    const muzzleGeo = new THREE.ConeGeometry(0.18, 0.42, 16);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, secondaryMat);
    muzzle.position.set(0, -0.12, 0.55);
    head.add(muzzle);

    // Big bushy fox tail with white tip on hips
    const tailGroup = new THREE.Group();
    tailGroup.name = 'tail';
    const tailBodyGeo = new THREE.CylinderGeometry(0.08, 0.22, 0.65, 16);
    tailBodyGeo.rotateX(Math.PI / 3.5);
    const tailBody = new THREE.Mesh(tailBodyGeo, primaryMat);
    tailBody.name = 'tail_mesh';
    tailBody.position.set(0, 0.15, -0.4);

    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), whiteMat);
    tailTip.position.set(0, 0.35, -0.65);
    tailGroup.add(tailBody, tailTip);
    hips.add(tailGroup);
  } else if (style === 'cat' || style === 'space_cat') {
    // Cat: Pointed triangular ears with pink lining
    const earGeo = new THREE.ConeGeometry(0.18, 0.38, 16);
    const earMeshL = new THREE.Mesh(earGeo, primaryMat);
    earMeshL.rotation.z = 0.4;
    leftEarGroup.position.set(-0.35, 0.52, 0.1);
    const innerEarL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 16), secondaryMat);
    innerEarL.rotation.z = 0.4;
    innerEarL.position.set(0, 0, 0.06);
    leftEarGroup.add(earMeshL, innerEarL);

    const earMeshR = new THREE.Mesh(earGeo, primaryMat);
    earMeshR.rotation.z = -0.4;
    rightEarGroup.position.set(0.35, 0.52, 0.1);
    const innerEarR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 16), secondaryMat);
    innerEarR.rotation.z = -0.4;
    innerEarR.position.set(0, 0, 0.06);
    rightEarGroup.add(earMeshR, innerEarR);

    // Cat Whiskers
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const whiskerGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8);
    whiskerGeo.rotateZ(Math.PI / 2);
    const w1 = new THREE.Mesh(whiskerGeo, whiskerMat);
    w1.position.set(-0.35, -0.1, 0.5);
    w1.rotation.y = 0.3;
    const w2 = new THREE.Mesh(whiskerGeo, whiskerMat);
    w2.position.set(0.35, -0.1, 0.5);
    w2.rotation.y = -0.3;
    head.add(w1, w2);

    // Graceful curved cat tail
    const tailGroup = new THREE.Group();
    tailGroup.name = 'tail';
    const catTailGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.6, 16);
    catTailGeo.rotateX(Math.PI / 3);
    const catTail = new THREE.Mesh(catTailGeo, primaryMat);
    catTail.name = 'tail_mesh';
    catTail.position.set(0, 0.15, -0.35);
    tailGroup.add(catTail);
    hips.add(tailGroup);
  } else {
    // Robot / Cyber Bot: Cyber head visor screen, antenna with glowing light ball, and ear bolts
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.8,
    });
    const visorGeo = new THREE.BoxGeometry(0.85, 0.35, 0.1);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.04, 0.5);
    head.add(visor);

    // Side Ear Sensor Bolts
    const boltGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.14, 16);
    boltGeo.rotateZ(Math.PI / 2);
    const boltL = new THREE.Mesh(boltGeo, accentMat);
    boltL.position.set(-0.55, 0.08, 0);
    const boltR = new THREE.Mesh(boltGeo, accentMat);
    boltR.position.set(0.55, 0.08, 0);
    head.add(boltL, boltR);

    // Glowing Cyber Antenna
    const antennaGroup = new THREE.Group();
    antennaGroup.name = 'antenna';
    antennaGroup.position.set(0, 0.55, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), primaryMat);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), tipMat);
    tip.position.set(0, 0.2, 0);
    antennaGroup.add(pole, tip);
    head.add(antennaGroup);

    // Chest power battery gauge
    const gaugeGeo = new THREE.BoxGeometry(0.28, 0.09, 0.04);
    const gaugeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const gauge = new THREE.Mesh(gaugeGeo, gaugeMat);
    gauge.position.set(0, 0.05, 0.52);
    spine.add(gauge);
  }
  head.add(leftEarGroup, rightEarGroup);

  // 4. Arms & Forearms (Left)
  const leftUpperArm = new THREE.Group();
  leftUpperArm.name = 'arm_l';
  leftUpperArm.position.set(-0.55, 0.3, 0);
  spine.add(leftUpperArm);

  const upperArmGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.38, 16);
  upperArmGeo.translate(0, -0.19, 0);
  const upperArmMeshL = new THREE.Mesh(upperArmGeo, primaryMat);
  upperArmMeshL.castShadow = true;
  leftUpperArm.add(upperArmMeshL);

  const leftForearm = new THREE.Group();
  leftForearm.name = 'forearm_l';
  leftForearm.position.set(0, -0.38, 0);
  leftUpperArm.add(leftForearm);

  const forearmGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.38, 16);
  forearmGeo.translate(0, -0.19, 0);
  const forearmMeshL = new THREE.Mesh(forearmGeo, primaryMat);
  forearmMeshL.castShadow = true;
  leftForearm.add(forearmMeshL);

  const leftHand = new THREE.Group();
  leftHand.name = 'hand_l';
  leftHand.position.set(0, -0.42, 0);

  // Palm base
  const palmGeo = new THREE.SphereGeometry(0.14, 16, 16);
  palmGeo.scale(1, 1, 0.85);
  const handMeshL = new THREE.Mesh(palmGeo, accentMat);
  handMeshL.name = 'palm_l';
  handMeshL.castShadow = true;
  leftHand.add(handMeshL);

  // Articulated Thumb (Left)
  const leftThumb = new THREE.Group();
  leftThumb.name = 'thumb_l';
  leftThumb.position.set(0.11, 0.02, 0.04);
  const thumbGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.14, 12);
  thumbGeo.translate(0, 0.07, 0);
  const thumbMeshL = new THREE.Mesh(thumbGeo, accentMat);
  const thumbTipL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), accentMat);
  thumbTipL.position.set(0, 0.14, 0);
  leftThumb.add(thumbMeshL, thumbTipL);
  leftThumb.rotation.z = 0.5; // default angled outward
  leftHand.add(leftThumb);

  // Articulated Index Finger (Left)
  const leftIndex = new THREE.Group();
  leftIndex.name = 'index_l';
  leftIndex.position.set(0.04, -0.11, 0.03);
  const fingerGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.15, 12);
  fingerGeo.translate(0, -0.075, 0);
  const indexMeshL = new THREE.Mesh(fingerGeo, accentMat);
  const indexTipL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), accentMat);
  indexTipL.position.set(0, -0.15, 0);
  leftIndex.add(indexMeshL, indexTipL);
  leftHand.add(leftIndex);

  // Articulated Remaining Fingers Group (Left)
  const leftFingers = new THREE.Group();
  leftFingers.name = 'fingers_l';
  leftFingers.position.set(-0.05, -0.11, 0);
  const fingersMeshL = new THREE.Mesh(fingerGeo, accentMat);
  const fingersTipL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), accentMat);
  fingersTipL.position.set(0, -0.15, 0);
  leftFingers.add(fingersMeshL, fingersTipL);
  leftHand.add(leftFingers);

  leftForearm.add(leftHand);

  // 5. Arms & Forearms (Right)
  const rightUpperArm = new THREE.Group();
  rightUpperArm.name = 'arm_r';
  rightUpperArm.position.set(0.55, 0.3, 0);
  spine.add(rightUpperArm);

  const upperArmMeshR = new THREE.Mesh(upperArmGeo, primaryMat);
  upperArmMeshR.castShadow = true;
  rightUpperArm.add(upperArmMeshR);

  const rightForearm = new THREE.Group();
  rightForearm.name = 'forearm_r';
  rightForearm.position.set(0, -0.38, 0);
  rightUpperArm.add(rightForearm);

  const forearmMeshR = new THREE.Mesh(forearmGeo, primaryMat);
  forearmMeshR.castShadow = true;
  rightForearm.add(forearmMeshR);

  const rightHand = new THREE.Group();
  rightHand.name = 'hand_r';
  rightHand.position.set(0, -0.42, 0);

  // Palm base
  const handMeshR = new THREE.Mesh(palmGeo, accentMat);
  handMeshR.name = 'palm_r';
  handMeshR.castShadow = true;
  rightHand.add(handMeshR);

  // Articulated Thumb (Right)
  const rightThumb = new THREE.Group();
  rightThumb.name = 'thumb_r';
  rightThumb.position.set(-0.11, 0.02, 0.04);
  const thumbMeshR = new THREE.Mesh(thumbGeo, accentMat);
  const thumbTipR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), accentMat);
  thumbTipR.position.set(0, 0.14, 0);
  rightThumb.add(thumbMeshR, thumbTipR);
  rightThumb.rotation.z = -0.5; // default angled outward
  rightHand.add(rightThumb);

  // Articulated Index Finger (Right)
  const rightIndex = new THREE.Group();
  rightIndex.name = 'index_r';
  rightIndex.position.set(-0.04, -0.11, 0.03);
  const indexMeshR = new THREE.Mesh(fingerGeo, accentMat);
  const indexTipR = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), accentMat);
  indexTipR.position.set(0, -0.15, 0);
  rightIndex.add(indexMeshR, indexTipR);
  rightHand.add(rightIndex);

  // Articulated Remaining Fingers Group (Right)
  const rightFingers = new THREE.Group();
  rightFingers.name = 'fingers_r';
  rightFingers.position.set(0.05, -0.11, 0);
  const fingersMeshR = new THREE.Mesh(fingerGeo, accentMat);
  const fingersTipR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), accentMat);
  fingersTipR.position.set(0, -0.15, 0);
  rightFingers.add(fingersMeshR, fingersTipR);
  rightHand.add(rightFingers);

  rightForearm.add(rightHand);

  // 6. Thighs & Feet (Left & Right)
  const leftThigh = new THREE.Group();
  leftThigh.name = 'thigh_l';
  leftThigh.position.set(-0.25, -0.45, 0);
  hips.add(leftThigh);

  const footGeo = new THREE.SphereGeometry(0.2, 16, 16);
  footGeo.scale(1, 0.7, 1.4);
  const footL = new THREE.Mesh(footGeo, accentMat);
  footL.name = 'foot_l';
  footL.position.set(0, -0.15, 0.1);
  footL.castShadow = true;
  leftThigh.add(footL);

  const rightThigh = new THREE.Group();
  rightThigh.name = 'thigh_r';
  rightThigh.position.set(0.25, -0.45, 0);
  hips.add(rightThigh);

  const footR = new THREE.Mesh(footGeo, accentMat);
  footR.name = 'foot_r';
  footR.position.set(0, -0.15, 0.1);
  footR.castShadow = true;
  rightThigh.add(footR);

  return root;
}

/**
 * AvatarLoader manages model loading from external GLTF/GLB URLs
 * with automatic scale normalization, fallback to procedural cartoon character,
 * and clear loading/error feedback.
 */
export const AvatarLoader: React.FC<AvatarLoaderProps> = ({
  character,
  modelUrl,
  onModelReady,
  onError,
}) => {
  const [loadStatus, setLoadStatus] = useState<ModelLoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const targetModelUrl = modelUrl || character.modelUrl;

    // 1. If no custom or preset modelUrl is provided, build procedural character instantly
    if (!targetModelUrl) {
      const proceduralMesh = buildProceduralCartoonCharacter(character);
      setLoadStatus('procedural');
      setErrorMessage(null);
      onModelReady(proceduralMesh, false);
      return;
    }

    // 2. Custom or Preset GLTF/GLB/VRM URL loading
    setLoadStatus('loading');
    setErrorMessage(null);

    const loader = new GLTFLoader();

    loader.load(
      targetModelUrl,
      (gltf) => {
        if (isCancelled) return;

        const scene = gltf.scene;

        // Auto-center and normalize model bounds to fit cartoon stage (~1.8 units tall)
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const targetHeight = 1.8;
        if (size.y > 0) {
          const scaleFactor = targetHeight / size.y;
          scene.scale.setScalar(scaleFactor);
        }

        // Center on floor
        scene.position.x = -center.x * scene.scale.x;
        scene.position.y = -box.min.y * scene.scale.y - 0.7; // align with stage platform
        scene.position.z = -center.z * scene.scale.z;

        // Enable shadows on all child meshes
        scene.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        setLoadStatus('ready');
        onModelReady(scene, true);
      },
      (xhr) => {
        // Progress tracking if needed
      },
      (err) => {
        if (isCancelled) return;
        console.warn('Failed to load 3D GLB/VRM model from URL:', targetModelUrl, err);
        const errMsg = 'Could not load custom 3D model. Falling back to friendly cartoon buddy!';
        setErrorMessage(errMsg);
        setLoadStatus('error');
        if (onError) onError(errMsg);

        // Graceful fallback to procedural cartoon character
        const fallbackMesh = buildProceduralCartoonCharacter(character);
        onModelReady(fallbackMesh, false);
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [modelUrl, character.id, character.modelUrl]);

  if (loadStatus === 'loading') {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xs pointer-events-none">
        <div className="bg-white/95 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border-2 border-amber-300 animate-pulse">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          <span className="text-xs font-black text-slate-700">Warming up 3D cartoon avatar...</span>
        </div>
      </div>
    );
  }

  if (loadStatus === 'error' && errorMessage) {
    return (
      <div className="absolute top-3 inset-x-3 z-20 pointer-events-auto">
        <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-amber-800 hover:text-amber-950 font-black ml-2"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
};
