import * as THREE from 'three';
import { AvatarRigPose, TestMotionPreset } from '../../types/avatar';
import { AvatarKinematics, BodyMotion } from '../../types';
import { CompanionState, CompanionReactionType } from '../../types/companion';

/**
 * AvatarAnimation engine
 * Computes procedural idle animations, cartoon breathing, eye blinking,
 * and converts BodyMotion / AvatarKinematics into smoothed target rig poses.
 */
export class AvatarAnimation {
  private blinkTimer = 0;
  private nextBlinkInterval = 3.5;
  private isBlinking = false;
  private blinkProgress = 0;

  /**
   * Generates natural character-specific idle animation values
   */
  public computeIdlePose(time: number, characterStyle = 'bunny'): AvatarRigPose {
    // 1. Procedural Blinking
    this.updateBlinking(0.016); // standard frame step

    // Character specific idle dynamics
    if (characterStyle === 'bunny') {
      // Bunny Hop & Twitch: rhythmic springy hopping, alert head bob
      const hop = Math.abs(Math.sin(time * 3.4)) * 0.065;
      const earTwitch = Math.sin(time * 4.5) * 0.04;
      const pawWiggle = Math.cos(time * 3.4) * 0.05;

      return {
        head: { pitch: hop * 0.5 - 0.02, yaw: earTwitch, roll: earTwitch * 0.8 },
        neck: { pitch: hop * 0.25, yaw: 0, roll: 0 },
        spine: { leanX: hop * 0.3, twistY: earTwitch * 0.5, rollZ: 0 },
        hips: { posX: 0, posY: hop, posZ: 0, rotY: earTwitch * 0.2 },
        leftUpperArm: { x: -0.1, y: 0, z: -0.55 + pawWiggle },
        rightUpperArm: { x: -0.1, y: 0, z: 0.55 - pawWiggle },
        leftForearm: { x: 0, y: 0, z: -0.5 },
        rightForearm: { x: 0, y: 0, z: 0.5 },
        leftHand: { x: 0, y: 0, z: 0 },
        rightHand: { x: 0, y: 0, z: 0 },
        leftThigh: { x: hop * 0.4, y: 0, z: 0 },
        rightThigh: { x: hop * 0.4, y: 0, z: 0 },
        leftLowerLeg: { x: -hop * 0.4, y: 0, z: 0 },
        rightLowerLeg: { x: -hop * 0.4, y: 0, z: 0 },
        mouthOpen: 0,
        eyeBlink: this.blinkProgress,
      };
    }

    if (characterStyle === 'bear' || characterStyle === 'bouncy_bear') {
      // Bear Sway: Cozy slow side-to-side weight shifting, relaxed arms
      const sway = Math.sin(time * 0.95) * 0.07;
      const deepBreath = Math.sin(time * 1.8) * 0.04;

      return {
        head: { pitch: deepBreath * 0.5, yaw: sway * 0.6, roll: sway * 0.4 },
        neck: { pitch: deepBreath * 0.2, yaw: sway * 0.3, roll: 0 },
        spine: { leanX: deepBreath * 0.4, twistY: sway * 0.5, rollZ: sway * 0.3 },
        hips: { posX: sway * 0.04, posY: deepBreath * 0.02, posZ: 0, rotY: sway * 0.25 },
        leftUpperArm: { x: sway * 0.4, y: 0, z: -0.28 + deepBreath * 0.02 },
        rightUpperArm: { x: -sway * 0.4, y: 0, z: 0.28 - deepBreath * 0.02 },
        leftForearm: { x: 0, y: 0, z: -0.18 },
        rightForearm: { x: 0, y: 0, z: 0.18 },
        leftHand: { x: 0, y: 0, z: 0 },
        rightHand: { x: 0, y: 0, z: 0 },
        leftThigh: { x: 0, y: 0, z: 0 },
        rightThigh: { x: 0, y: 0, z: 0 },
        leftLowerLeg: { x: 0, y: 0, z: 0 },
        rightLowerLeg: { x: 0, y: 0, z: 0 },
        mouthOpen: 0,
        eyeBlink: this.blinkProgress,
      };
    }

    if (characterStyle === 'fox') {
      // Fox Swish: Alert inquisitive head tilts, active posture
      const alertTilt = Math.sin(time * 1.6) * 0.12;
      const headRoll = Math.cos(time * 1.6) * 0.08;
      const breath = Math.sin(time * 2.4) * 0.03;

      return {
        head: { pitch: breath * 0.3, yaw: alertTilt, roll: headRoll },
        neck: { pitch: breath * 0.15, yaw: alertTilt * 0.5, roll: headRoll * 0.5 },
        spine: { leanX: 0.03, twistY: alertTilt * 0.3, rollZ: headRoll * 0.2 },
        hips: { posX: 0, posY: breath * 0.02, posZ: 0, rotY: alertTilt * 0.1 },
        leftUpperArm: { x: 0.05, y: 0, z: -0.32 },
        rightUpperArm: { x: 0.05, y: 0, z: 0.32 },
        leftForearm: { x: 0, y: 0, z: -0.25 },
        rightForearm: { x: 0, y: 0, z: 0.25 },
        leftHand: { x: 0, y: 0, z: 0 },
        rightHand: { x: 0, y: 0, z: 0 },
        leftThigh: { x: 0, y: 0, z: 0 },
        rightThigh: { x: 0, y: 0, z: 0 },
        leftLowerLeg: { x: 0, y: 0, z: 0 },
        rightLowerLeg: { x: 0, y: 0, z: 0 },
        mouthOpen: 0,
        eyeBlink: this.blinkProgress,
      };
    }

    if (characterStyle === 'cat' || characterStyle === 'space_cat') {
      // Cat Stretch: Smooth arching spine stretch, elegant head tilt
      const stretch = Math.sin(time * 1.1) * 0.05;
      const slowYaw = Math.sin(time * 0.7) * 0.08;

      return {
        head: { pitch: -stretch * 0.4, yaw: slowYaw, roll: slowYaw * 0.6 },
        neck: { pitch: -stretch * 0.2, yaw: slowYaw * 0.5, roll: 0 },
        spine: { leanX: stretch, twistY: slowYaw * 0.3, rollZ: slowYaw * 0.2 },
        hips: { posX: 0, posY: stretch * 0.02, posZ: 0, rotY: slowYaw * 0.1 },
        leftUpperArm: { x: -0.05, y: 0, z: -0.34 },
        rightUpperArm: { x: -0.05, y: 0, z: 0.34 },
        leftForearm: { x: 0, y: 0, z: -0.3 },
        rightForearm: { x: 0, y: 0, z: 0.3 },
        leftHand: { x: 0, y: 0, z: 0 },
        rightHand: { x: 0, y: 0, z: 0 },
        leftThigh: { x: 0, y: 0, z: 0 },
        rightThigh: { x: 0, y: 0, z: 0 },
        leftLowerLeg: { x: 0, y: 0, z: 0 },
        rightLowerLeg: { x: 0, y: 0, z: 0 },
        mouthOpen: 0,
        eyeBlink: this.blinkProgress,
      };
    }

    // Robot / Cyber Bot: Stepped mechanical scanning and crisp angles
    const stepTime = Math.floor(time * 2.5);
    const steppedYaw = (Math.sin(stepTime * 0.8) > 0 ? 0.14 : -0.14) * (stepTime % 3 === 0 ? 0 : 1);
    const pulse = Math.sin(time * 3.0) * 0.015;

    return {
      head: { pitch: pulse, yaw: steppedYaw, roll: 0 },
      neck: { pitch: 0, yaw: steppedYaw * 0.5, roll: 0 },
      spine: { leanX: 0, twistY: steppedYaw * 0.2, rollZ: 0 },
      hips: { posX: 0, posY: pulse, posZ: 0, rotY: 0 },
      leftUpperArm: { x: 0, y: 0, z: -0.38 },
      rightUpperArm: { x: 0, y: 0, z: 0.38 },
      leftForearm: { x: 0, y: 0, z: -0.35 },
      rightForearm: { x: 0, y: 0, z: 0.35 },
      leftHand: { x: 0, y: 0, z: 0 },
      rightHand: { x: 0, y: 0, z: 0 },
      leftThigh: { x: 0, y: 0, z: 0 },
      rightThigh: { x: 0, y: 0, z: 0 },
      leftLowerLeg: { x: 0, y: 0, z: 0 },
      rightLowerLeg: { x: 0, y: 0, z: 0 },
      mouthOpen: 0,
      eyeBlink: 0, // robots keep cyber visor active
    };
  }

  /**
   * Generates synthetic test motion poses for instant visual verification
   */
  public computeTestMotionPose(preset: TestMotionPreset, time: number): AvatarRigPose {
    const base = this.computeIdlePose(time);
    if (preset === 'none' || preset === 'idle') return base;

    const t = time * 3.5;

    switch (preset) {
      case 'wave': {
        const waveAngle = Math.sin(t * 2) * 0.45;
        return {
          ...base,
          head: { pitch: 0, yaw: -0.15, roll: 0.1 },
          rightUpperArm: { x: 0, y: 0, z: 2.2 + waveAngle },
          rightForearm: { x: 0, y: 0, z: 0.8 + waveAngle * 0.5 },
          leftUpperArm: { x: 0, y: 0, z: -0.3 },
          leftForearm: { x: 0, y: 0, z: -0.2 },
        };
      }
      case 'hands_up': {
        const bounce = Math.sin(t * 1.5) * 0.1;
        return {
          ...base,
          head: { pitch: -0.2, yaw: 0, roll: 0 },
          leftUpperArm: { x: 0, y: 0, z: -2.5 + bounce },
          rightUpperArm: { x: 0, y: 0, z: 2.5 - bounce },
          leftForearm: { x: 0, y: 0, z: -0.5 },
          rightForearm: { x: 0, y: 0, z: 0.5 },
          hips: { posX: 0, posY: Math.abs(bounce) * 0.3, posZ: 0, rotY: 0 },
        };
      }
      case 't_pose': {
        return {
          ...base,
          leftUpperArm: { x: 0, y: 0, z: -1.57 }, // -90 deg
          rightUpperArm: { x: 0, y: 0, z: 1.57 },  // +90 deg
          leftForearm: { x: 0, y: 0, z: 0 },
          rightForearm: { x: 0, y: 0, z: 0 },
        };
      }
      case 'squat': {
        const squatProgress = Math.abs(Math.sin(time * 2));
        return {
          ...base,
          hips: { posX: 0, posY: -squatProgress * 0.45, posZ: 0, rotY: 0 },
          leftThigh: { x: squatProgress * 0.6, y: 0, z: -0.2 },
          rightThigh: { x: squatProgress * 0.6, y: 0, z: 0.2 },
          leftLowerLeg: { x: -squatProgress * 0.8, y: 0, z: 0 },
          rightLowerLeg: { x: -squatProgress * 0.8, y: 0, z: 0 },
          leftUpperArm: { x: 0.5, y: 0, z: -0.4 },
          rightUpperArm: { x: 0.5, y: 0, z: 0.4 },
        };
      }
      case 'dance': {
        const beat = Math.sin(t * 2.2);
        const hipSway = Math.cos(t * 2.2);
        return {
          ...base,
          head: { pitch: beat * 0.15, yaw: hipSway * 0.3, roll: beat * 0.15 },
          spine: { leanX: 0, twistY: hipSway * 0.3, rollZ: beat * 0.1 },
          hips: { posX: hipSway * 0.15, posY: Math.abs(beat) * 0.08, posZ: 0, rotY: hipSway * 0.2 },
          leftUpperArm: { x: beat * 0.4, y: 0, z: -1.2 + hipSway * 0.6 },
          rightUpperArm: { x: -beat * 0.4, y: 0, z: 1.2 - hipSway * 0.6 },
          leftForearm: { x: 0, y: 0, z: -0.6 },
          rightForearm: { x: 0, y: 0, z: 0.6 },
        };
      }
      case 'head_tilt': {
        const tilt = Math.sin(t) * 0.45;
        return {
          ...base,
          head: { pitch: 0.1, yaw: tilt * 0.5, roll: tilt },
        };
      }
      default:
        return base;
    }
  }

  /**
   * Converts incoming BodyMotion or AvatarKinematics into target AvatarRigPose
   * Blends with subtle breathing and idle gestures for lifelike cartoon animation.
   */
  public computeMotionPose(
    kinematics: AvatarKinematics | null,
    motion: BodyMotion | null,
    time: number,
    mouthLevel = 0
  ): AvatarRigPose {
    const idle = this.computeIdlePose(time);

    if (!kinematics) {
      return {
        ...idle,
        mouthOpen: mouthLevel,
      };
    }

    // 1. Head Pose (mirror perspective)
    const headPitch = kinematics.headPitch * 0.65;
    const headYaw = kinematics.headYaw * 0.85;
    const headRoll = kinematics.headRoll * 0.75;

    // 2. Arm Rotations
    // Mirror: When child raises left hand, character raises their left or mirror arm
    const leftArmZ = -kinematics.leftArmAngle;
    const leftForearmZ = -kinematics.leftForearmAngle * 0.85;

    const rightArmZ = kinematics.rightArmAngle;
    const rightForearmZ = kinematics.rightForearmAngle * 0.85;

    // 3. Torso & Hips
    const crouchOffset = kinematics.isCrouching ? -0.32 : 0;
    const jumpOffset = kinematics.jumpOffset ? kinematics.jumpOffset * 0.5 : 0;
    const hipsPosY = crouchOffset + jumpOffset + idle.hips.posY;

    // 4. Squat leg compensation
    const squatAngle = kinematics.isCrouching ? 0.45 : 0;

    // 5. Mouth opening
    const totalMouth = Math.max(mouthLevel, kinematics.mouthOpen);

    return {
      head: {
        pitch: headPitch,
        yaw: headYaw,
        roll: headRoll,
      },
      neck: {
        pitch: headPitch * 0.35,
        yaw: headYaw * 0.35,
        roll: 0,
      },
      spine: {
        leanX: kinematics.torsoLean * 0.4,
        twistY: kinematics.torsoTwist * 0.5,
        rollZ: kinematics.torsoLean * 0.35,
      },
      hips: {
        posX: 0,
        posY: hipsPosY,
        posZ: 0,
        rotY: kinematics.torsoTwist * 0.25,
      },
      leftUpperArm: {
        x: 0,
        y: 0,
        z: leftArmZ,
      },
      rightUpperArm: {
        x: 0,
        y: 0,
        z: rightArmZ,
      },
      leftForearm: {
        x: 0,
        y: 0,
        z: leftForearmZ,
      },
      rightForearm: {
        x: 0,
        y: 0,
        z: rightForearmZ,
      },
      leftHand: { x: 0, y: 0, z: 0 },
      rightHand: { x: 0, y: 0, z: 0 },
      leftThigh: { x: squatAngle, y: 0, z: -0.1 },
      rightThigh: { x: squatAngle, y: 0, z: 0.1 },
      leftLowerLeg: { x: -squatAngle * 1.2, y: 0, z: 0 },
      rightLowerLeg: { x: -squatAngle * 1.2, y: 0, z: 0 },
      mouthOpen: totalMouth,
      eyeBlink: this.blinkProgress,
    };
  }

  /**
   * Internal procedural eye blinking tick
   */
  private updateBlinking(dt: number) {
    this.blinkTimer += dt;

    if (!this.isBlinking && this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.blinkProgress = 0;
      this.nextBlinkInterval = 2.5 + Math.random() * 3.5; // Next blink in 2.5-6s
    }

    if (this.isBlinking) {
      // 150ms blink cycle
      this.blinkProgress += dt * 7.5;
      if (this.blinkProgress >= 1.0) {
        this.blinkProgress = 0;
        this.isBlinking = false;
      }
    }
  }

  /**
   * Computes expressive rig pose based on the interactive Companion State
   * Blends between direct body following, attentive listening, conversational speaking,
   * jumping excitement, comic surprise, and celebratory waves.
   */
  public computeCompanionPose(
    companionState: CompanionState,
    reaction: CompanionReactionType,
    kinematics: AvatarKinematics | null,
    motion: BodyMotion | null,
    time: number,
    mouthLevel = 0,
    blend = 1.0,
    characterStyle = 'bunny'
  ): AvatarRigPose {
    const idle = this.computeIdlePose(time, characterStyle);
    const following = this.computeMotionPose(kinematics, motion, time, mouthLevel);

    let statePose: AvatarRigPose;

    switch (companionState) {
      case CompanionState.IDLE:
        statePose = idle;
        break;

      case CompanionState.LISTENING: {
        // Child is speaking! Attentive head tilt, curious posture, ears perked
        const headPitch = -0.12 + Math.sin(time * 2.5) * 0.04;
        const headYaw = Math.sin(time * 1.8) * 0.08;
        statePose = {
          ...idle,
          head: { pitch: headPitch, yaw: headYaw, roll: 0.06 },
          neck: { pitch: -0.06, yaw: headYaw * 0.5, roll: 0.03 },
          spine: { leanX: -0.05, twistY: headYaw * 0.3, rollZ: 0 },
          leftUpperArm: { x: 0.15, y: 0, z: -0.4 },
          rightUpperArm: { x: 0.15, y: 0, z: 0.4 },
          mouthOpen: 0.05,
        };
        break;
      }

      case CompanionState.SPEAKING: {
        // Character is speaking! Expressive head nodding, mouth open to speech level, arm gestures
        const nod = Math.sin(time * 7) * 0.12;
        const gestureSwing = Math.sin(time * 4.5) * 0.3;
        const speechMouth = Math.max(mouthLevel, 0.25 + Math.abs(Math.sin(time * 11)) * 0.45);
        statePose = {
          ...idle,
          head: { pitch: nod, yaw: Math.sin(time * 3) * 0.08, roll: Math.sin(time * 2) * 0.04 },
          neck: { pitch: nod * 0.5, yaw: 0, roll: 0 },
          spine: { leanX: nod * 0.3, twistY: 0, rollZ: 0 },
          rightUpperArm: { x: 0.3, y: 0, z: 0.7 + gestureSwing },
          rightForearm: { x: 0, y: 0, z: 0.5 },
          leftUpperArm: { x: 0.2, y: 0, z: -0.6 - gestureSwing * 0.5 },
          leftForearm: { x: 0, y: 0, z: -0.4 },
          mouthOpen: speechMouth,
        };
        break;
      }

      case CompanionState.EXCITED: {
        // Child jumped or showed excited energy: bouncy jump, arms up high, joy!
        const hop = Math.abs(Math.sin(time * 9)) * 0.35;
        statePose = {
          ...idle,
          head: { pitch: -0.22, yaw: Math.sin(time * 6) * 0.1, roll: 0 },
          hips: { posX: 0, posY: hop, posZ: 0, rotY: 0 },
          leftUpperArm: { x: 0, y: 0, z: -2.3 + Math.sin(time * 9) * 0.2 },
          rightUpperArm: { x: 0, y: 0, z: 2.3 - Math.sin(time * 9) * 0.2 },
          leftForearm: { x: 0, y: 0, z: -0.5 },
          rightForearm: { x: 0, y: 0, z: 0.5 },
          mouthOpen: Math.max(mouthLevel, 0.65),
        };
        break;
      }

      case CompanionState.SURPRISED: {
        // Child made surprised face or gasped: comic lean back, hands raised, mouth 'O'
        statePose = {
          ...idle,
          head: { pitch: -0.3, yaw: 0, roll: 0 },
          spine: { leanX: 0.2, twistY: 0, rollZ: 0 },
          hips: { posX: 0, posY: 0, posZ: -0.15, rotY: 0 },
          leftUpperArm: { x: 0.35, y: 0, z: -1.3 },
          rightUpperArm: { x: 0.35, y: 0, z: 1.3 },
          leftForearm: { x: 0, y: 0, z: -0.6 },
          rightForearm: { x: 0, y: 0, z: 0.6 },
          mouthOpen: Math.max(mouthLevel, 0.85),
        };
        break;
      }

      case CompanionState.CELEBRATING: {
        // Wave back, cheer, or give thumbs up
        const wave = Math.sin(time * 12) * 0.45;
        const hipSway = Math.sin(time * 4) * 0.12;
        statePose = {
          ...idle,
          head: { pitch: 0, yaw: -0.15, roll: 0.1 },
          hips: { posX: hipSway, posY: Math.abs(Math.sin(time * 8)) * 0.1, posZ: 0, rotY: hipSway * 0.5 },
          rightUpperArm: { x: 0, y: 0, z: 2.3 + wave },
          rightForearm: { x: 0, y: 0, z: 0.8 + wave * 0.4 },
          leftUpperArm: { x: 0, y: 0, z: -1.2 },
          leftForearm: { x: 0, y: 0, z: -0.4 },
          mouthOpen: Math.max(mouthLevel, 0.55),
        };
        break;
      }

      case CompanionState.FOLLOWING:
      default: {
        statePose = following;
        break;
      }
    }

    // Blend smoothly between following pose and reactive pose if blend < 1.0
    if (blend < 0.99 && companionState !== CompanionState.FOLLOWING) {
      const b = blend;
      const ib = 1.0 - b;
      return {
        head: {
          pitch: statePose.head.pitch * b + following.head.pitch * ib,
          yaw: statePose.head.yaw * b + following.head.yaw * ib,
          roll: statePose.head.roll * b + following.head.roll * ib,
        },
        neck: {
          pitch: statePose.neck.pitch * b + following.neck.pitch * ib,
          yaw: statePose.neck.yaw * b + following.neck.yaw * ib,
          roll: statePose.neck.roll * b + following.neck.roll * ib,
        },
        spine: {
          leanX: statePose.spine.leanX * b + following.spine.leanX * ib,
          twistY: statePose.spine.twistY * b + following.spine.twistY * ib,
          rollZ: statePose.spine.rollZ * b + following.spine.rollZ * ib,
        },
        hips: {
          posX: statePose.hips.posX * b + following.hips.posX * ib,
          posY: statePose.hips.posY * b + following.hips.posY * ib,
          posZ: statePose.hips.posZ * b + following.hips.posZ * ib,
          rotY: statePose.hips.rotY * b + following.hips.rotY * ib,
        },
        leftUpperArm: {
          x: statePose.leftUpperArm.x * b + following.leftUpperArm.x * ib,
          y: statePose.leftUpperArm.y * b + following.leftUpperArm.y * ib,
          z: statePose.leftUpperArm.z * b + following.leftUpperArm.z * ib,
        },
        rightUpperArm: {
          x: statePose.rightUpperArm.x * b + following.rightUpperArm.x * ib,
          y: statePose.rightUpperArm.y * b + following.rightUpperArm.y * ib,
          z: statePose.rightUpperArm.z * b + following.rightUpperArm.z * ib,
        },
        leftForearm: {
          x: statePose.leftForearm.x * b + following.leftForearm.x * ib,
          y: statePose.leftForearm.y * b + following.leftForearm.y * ib,
          z: statePose.leftForearm.z * b + following.leftForearm.z * ib,
        },
        rightForearm: {
          x: statePose.rightForearm.x * b + following.rightForearm.x * ib,
          y: statePose.rightForearm.y * b + following.rightForearm.y * ib,
          z: statePose.rightForearm.z * b + following.rightForearm.z * ib,
        },
        leftHand: { x: 0, y: 0, z: 0 },
        rightHand: { x: 0, y: 0, z: 0 },
        leftThigh: statePose.leftThigh,
        rightThigh: statePose.rightThigh,
        leftLowerLeg: statePose.leftLowerLeg,
        rightLowerLeg: statePose.rightLowerLeg,
        mouthOpen: statePose.mouthOpen * b + following.mouthOpen * ib,
        eyeBlink: this.blinkProgress,
      };
    }

    return statePose;
  }
}
