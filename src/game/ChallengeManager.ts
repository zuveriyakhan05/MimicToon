import { CopyMeChallenge, DifficultyLevel } from './types';

/**
 * ChallengeManager
 * Curates and sequences interactive "Copy Me" poses across Easy, Medium, and Hard tiers.
 * Each challenge contains character dialogue, target angles, MediaPipe landmark rules,
 * and demo kinematics to animate the 3D buddy during the demonstration phase.
 */
export const COPY_ME_CHALLENGES: CopyMeChallenge[] = [
  // --- EASY TIER ---
  {
    id: 'raise_both_hands',
    name: 'Raise Both Hands',
    emoji: '🙌',
    category: 'arms',
    difficulty: 'easy',
    promptText: 'Can you copy me?',
    speechInstruction: 'Reach both hands way up to the sky! Look at me! 🚀',
    successMessage: 'Perfect! Sky high superstar! 🎉',
    points: 100,
    xpReward: 50,
    starsReward: 10,
    baseDurationSeconds: 1.8,
    baseSimilarityThreshold: 72,
    targetAngles: {
      leftArmAngle: 2.4,   // High up
      rightArmAngle: 2.4,  // High up
      leftForearmAngle: 0.1,
      rightForearmAngle: 0.1,
      torsoLean: 0,
      headPitch: -0.1,     // Looking slightly up
    },
    demoKinematics: {
      leftArmAngle: 2.5,
      rightArmAngle: 2.5,
      leftForearmAngle: 0.1,
      rightForearmAngle: 0.1,
      headPitch: -0.15,
      isHandsUp: true,
      mouthOpen: 0.35,
    },
    customMatchCheck: (motion, landmarks) => {
      const leftY = landmarks?.leftWrist?.y ?? motion?.wrists?.left?.y;
      const rightY = landmarks?.rightWrist?.y ?? motion?.wrists?.right?.y;
      const shoulderY = landmarks?.leftShoulder?.y ?? motion?.shoulders?.left?.y;
      if (leftY !== undefined && rightY !== undefined && shoulderY !== undefined) {
        if (leftY < shoulderY && rightY < shoulderY) {
          return { matched: true, bonusScore: 8 };
        }
      }
      return { matched: false, bonusScore: 0, hint: 'Reach both hands higher up! 🚀' };
    },
  },

  {
    id: 'raise_left_hand',
    name: 'Raise Left Hand',
    emoji: '🙋‍♂️',
    category: 'arms',
    difficulty: 'easy',
    promptText: 'Can you copy me?',
    speechInstruction: 'Raise your left hand high and wave to the stars! ⭐',
    successMessage: 'Perfect! What a friendly wave! 🎉',
    points: 80,
    xpReward: 40,
    starsReward: 8,
    baseDurationSeconds: 1.8,
    baseSimilarityThreshold: 70,
    targetAngles: {
      leftArmAngle: 2.3,
      rightArmAngle: 0.2,
      leftForearmAngle: 0.4,
      rightForearmAngle: 0.1,
      torsoLean: 0,
    },
    demoKinematics: {
      leftArmAngle: 2.4,
      rightArmAngle: 0.2,
      leftForearmAngle: 0.5,
      rightForearmAngle: 0.1,
      isWavingLeft: true,
      mouthOpen: 0.4,
    },
  },

  {
    id: 'raise_right_hand',
    name: 'Raise Right Hand',
    emoji: '🙋‍♀️',
    category: 'arms',
    difficulty: 'easy',
    promptText: 'Can you copy me?',
    speechInstruction: 'Raise your right hand up high! Reach for the clouds! ☁️',
    successMessage: 'Perfect! Awesome right arm reach! 🎉',
    points: 80,
    xpReward: 40,
    starsReward: 8,
    baseDurationSeconds: 1.8,
    baseSimilarityThreshold: 70,
    targetAngles: {
      leftArmAngle: 0.2,
      rightArmAngle: 2.3,
      leftForearmAngle: 0.1,
      rightForearmAngle: 0.4,
      torsoLean: 0,
    },
    demoKinematics: {
      leftArmAngle: 0.2,
      rightArmAngle: 2.4,
      leftForearmAngle: 0.1,
      rightForearmAngle: 0.5,
      isWavingRight: true,
      mouthOpen: 0.4,
    },
  },

  {
    id: 'turn_head',
    name: 'Turn Head',
    emoji: '👀',
    category: 'head',
    difficulty: 'easy',
    promptText: 'Can you copy me?',
    speechInstruction: 'Turn your head to the side! Who is over there? 👀',
    successMessage: 'Perfect! Great neck stretch! 🎉',
    points: 75,
    xpReward: 35,
    starsReward: 8,
    baseDurationSeconds: 1.8,
    baseSimilarityThreshold: 70,
    targetAngles: {
      leftArmAngle: 0.3,
      rightArmAngle: 0.3,
      headYaw: 0.45, // Turn sideways
      headPitch: 0,
    },
    demoKinematics: {
      leftArmAngle: 0.3,
      rightArmAngle: 0.3,
      headYaw: 0.55,
      headRoll: 0.05,
      mouthOpen: 0.25,
    },
  },

  // --- MEDIUM TIER ---
  {
    id: 'clap_hands',
    name: 'Clap Hands',
    emoji: '👏',
    category: 'hands',
    difficulty: 'medium',
    promptText: 'Can you copy me?',
    speechInstruction: 'Bring your hands together in front and clap! 👏',
    successMessage: 'Perfect! Give yourself a round of applause! 🎉',
    points: 120,
    xpReward: 60,
    starsReward: 12,
    baseDurationSeconds: 2.0,
    baseSimilarityThreshold: 75,
    targetAngles: {
      leftArmAngle: 0.8,
      rightArmAngle: 0.8,
      leftForearmAngle: 1.2,
      rightForearmAngle: 1.2,
      torsoLean: 0,
    },
    demoKinematics: {
      leftArmAngle: 0.9,
      rightArmAngle: 0.9,
      leftForearmAngle: 1.3,
      rightForearmAngle: 1.3,
      mouthOpen: 0.5,
    },
    customMatchCheck: (motion, landmarks) => {
      const leftWrist = landmarks?.leftWrist ?? motion?.wrists?.left;
      const rightWrist = landmarks?.rightWrist ?? motion?.wrists?.right;
      if (leftWrist && rightWrist) {
        const dx = leftWrist.x - rightWrist.x;
        const dy = leftWrist.y - rightWrist.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Hands close together in front
        if (dist < 0.22) {
          return { matched: true, bonusScore: 15 };
        }
      }
      return { matched: false, bonusScore: 0, hint: 'Bring your hands close together! 👏' };
    },
  },

  {
    id: 'thumbs_up',
    name: 'Thumbs Up',
    emoji: '👍',
    category: 'hands',
    difficulty: 'medium',
    promptText: 'Can you copy me?',
    speechInstruction: 'Show me a big super thumbs up to the camera! 👍',
    successMessage: 'Perfect! Thumbs up champion! 🎉',
    points: 110,
    xpReward: 55,
    starsReward: 12,
    baseDurationSeconds: 2.0,
    baseSimilarityThreshold: 74,
    targetAngles: {
      leftArmAngle: 0.4,
      rightArmAngle: 0.9,
      leftForearmAngle: 0.2,
      rightForearmAngle: 0.9,
      headPitch: 0.1,
    },
    demoKinematics: {
      leftArmAngle: 0.4,
      rightArmAngle: 1.0,
      leftForearmAngle: 0.2,
      rightForearmAngle: 1.0,
      mouthOpen: 0.45,
    },
    customMatchCheck: (_motion, _landmarks, _facePose, handSignals) => {
      const rightG = handSignals?.rightHand?.gesture;
      const leftG = handSignals?.leftHand?.gesture;
      if (rightG === 'thumbs_up' || leftG === 'thumbs_up') {
        return { matched: true, bonusScore: 20 };
      }
      return { matched: false, bonusScore: 0, hint: 'Hold your thumb straight up! 👍' };
    },
  },

  {
    id: 'superhero_pose',
    name: 'Superhero Pose',
    emoji: '🦸',
    category: 'combo',
    difficulty: 'medium',
    promptText: 'Can you copy me?',
    speechInstruction: 'Put hands on your hips and stand tall like a hero! 🦸',
    successMessage: 'Perfect! Defender of the cartoon kingdom! 🎉',
    points: 130,
    xpReward: 65,
    starsReward: 14,
    baseDurationSeconds: 2.0,
    baseSimilarityThreshold: 76,
    targetAngles: {
      leftArmAngle: 0.6,
      rightArmAngle: 0.6,
      leftForearmAngle: 1.4,
      rightForearmAngle: 1.4,
      torsoLean: -0.05,
      headPitch: -0.1,
    },
    demoKinematics: {
      leftArmAngle: 0.7,
      rightArmAngle: 0.7,
      leftForearmAngle: 1.5,
      rightForearmAngle: 1.5,
      headPitch: -0.12,
      mouthOpen: 0.3,
    },
  },

  {
    id: 'airplane_tpose',
    name: 'Airplane Wings',
    emoji: '✈️',
    category: 'arms',
    difficulty: 'medium',
    promptText: 'Can you copy me?',
    speechInstruction: 'Spread your arms straight out wide like airplane wings! ✈️',
    successMessage: 'Perfect! Smooth flying pilot! 🎉',
    points: 125,
    xpReward: 60,
    starsReward: 12,
    baseDurationSeconds: 2.0,
    baseSimilarityThreshold: 75,
    targetAngles: {
      leftArmAngle: 1.57, // 90 degrees out
      rightArmAngle: 1.57,
      leftForearmAngle: 0,
      rightForearmAngle: 0,
      torsoLean: 0,
    },
    demoKinematics: {
      leftArmAngle: 1.57,
      rightArmAngle: 1.57,
      leftForearmAngle: 0,
      rightForearmAngle: 0,
      mouthOpen: 0.4,
    },
  },

  {
    id: 'bend_down',
    name: 'Bend Down',
    emoji: '🦒',
    category: 'body',
    difficulty: 'medium',
    promptText: 'Can you copy me?',
    speechInstruction: 'Bend down towards your knees like a drinking giraffe! 🦒',
    successMessage: 'Perfect! Flexible gymnastics champion! 🎉',
    points: 135,
    xpReward: 70,
    starsReward: 15,
    baseDurationSeconds: 2.2,
    baseSimilarityThreshold: 74,
    targetAngles: {
      leftArmAngle: 0.3,
      rightArmAngle: 0.3,
      leftForearmAngle: 0.2,
      rightForearmAngle: 0.2,
      torsoLean: 0.55, // Strong forward lean
      headPitch: 0.3,
    },
    demoKinematics: {
      leftArmAngle: 0.4,
      rightArmAngle: 0.4,
      leftForearmAngle: 0.3,
      rightForearmAngle: 0.3,
      torsoLean: 0.6,
      headPitch: 0.35,
      isCrouching: true,
      mouthOpen: 0.3,
    },
  },

  // --- HARD TIER ---
  {
    id: 'muscle_flex',
    name: 'Muscle Flex',
    emoji: '💪',
    category: 'combo',
    difficulty: 'hard',
    promptText: 'Can you copy me?',
    speechInstruction: 'Flex both biceps up high! Show your powerhouse strength! 💪',
    successMessage: 'Perfect! Super strong powerhouse! 🎉',
    points: 160,
    xpReward: 80,
    starsReward: 18,
    baseDurationSeconds: 2.4,
    baseSimilarityThreshold: 80,
    targetAngles: {
      leftArmAngle: 1.4,
      rightArmAngle: 1.4,
      leftForearmAngle: 1.55, // 90 degree bicep curl
      rightForearmAngle: 1.55,
      torsoLean: 0,
    },
    demoKinematics: {
      leftArmAngle: 1.45,
      rightArmAngle: 1.45,
      leftForearmAngle: 1.6,
      rightForearmAngle: 1.6,
      mouthOpen: 0.55,
    },
  },

  {
    id: 'disco_point',
    name: 'Disco Star Pose',
    emoji: '🕺',
    category: 'combo',
    difficulty: 'hard',
    promptText: 'Can you copy me?',
    speechInstruction: 'Right hand pointing up high, left hand on hip! Disco time! 🕺',
    successMessage: 'Perfect! Dance floor legend! 🎉',
    points: 180,
    xpReward: 90,
    starsReward: 20,
    baseDurationSeconds: 2.5,
    baseSimilarityThreshold: 82,
    targetAngles: {
      leftArmAngle: 0.5,
      rightArmAngle: 2.5,
      leftForearmAngle: 1.4,
      rightForearmAngle: 0.1,
      torsoLean: 0.2,
      headPitch: -0.15,
    },
    demoKinematics: {
      leftArmAngle: 0.6,
      rightArmAngle: 2.6,
      leftForearmAngle: 1.5,
      rightForearmAngle: 0.1,
      torsoLean: 0.25,
      headPitch: -0.15,
      mouthOpen: 0.5,
    },
  },
];

/**
 * ChallengeManager Class
 * Handles challenge selection, difficulty filtering, progression, and random selection.
 */
export class ChallengeManager {
  private challenges: CopyMeChallenge[];
  private currentIndex = 0;
  private currentDifficulty: DifficultyLevel = 'easy';

  constructor(initialDifficulty: DifficultyLevel = 'easy') {
    this.currentDifficulty = initialDifficulty;
    this.challenges = this.getFilteredChallenges(initialDifficulty);
  }

  public setDifficulty(difficulty: DifficultyLevel): void {
    this.currentDifficulty = difficulty;
    this.challenges = this.getFilteredChallenges(difficulty);
    this.currentIndex = 0;
  }

  public getDifficulty(): DifficultyLevel {
    return this.currentDifficulty;
  }

  private getFilteredChallenges(difficulty: DifficultyLevel): CopyMeChallenge[] {
    const list = COPY_ME_CHALLENGES.filter((c) => c.difficulty === difficulty);
    return list.length > 0 ? list : COPY_ME_CHALLENGES;
  }

  public getCurrentChallenge(): CopyMeChallenge {
    if (this.challenges.length === 0) {
      return COPY_ME_CHALLENGES[0];
    }
    return this.challenges[this.currentIndex % this.challenges.length];
  }

  public nextChallenge(): CopyMeChallenge {
    if (this.challenges.length === 0) return COPY_ME_CHALLENGES[0];
    this.currentIndex = (this.currentIndex + 1) % this.challenges.length;
    return this.getCurrentChallenge();
  }

  public previousChallenge(): CopyMeChallenge {
    if (this.challenges.length === 0) return COPY_ME_CHALLENGES[0];
    this.currentIndex = (this.currentIndex - 1 + this.challenges.length) % this.challenges.length;
    return this.getCurrentChallenge();
  }

  public getAllInDifficulty(): CopyMeChallenge[] {
    return [...this.challenges];
  }

  public getTotalInDifficulty(): number {
    return this.challenges.length;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }
}
