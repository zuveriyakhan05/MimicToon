import { CharacterProfile, ChallengePose } from '../types';

export const CHARACTERS: CharacterProfile[] = [
  {
    id: 'bunny',
    name: 'Bella the Bouncy Bunny',
    species: 'Fluffy Hare',
    tagline: 'Super bouncy bunny with twitchy ears and endless hops!',
    primaryColor: '#10b981', // Cheerful Emerald Mint
    secondaryColor: '#a7f3d0',
    accentColor: '#f59e0b',
    voicePitch: 1.7,
    avatarStyle: 'bunny',
    bio: 'Bella loves following your arm jumps and doing spring-loaded bunny hops! Raise your hands high and watch her floppy ears bounce with joy.',
    favoritePose: 'Bunny Hop High',
    unlocked: true,
    icon: '🐰',
    personality: {
      traits: ['Hop-Happy', 'Curious', 'Gentle', 'Energetic'],
      favoriteActivity: 'Sky-high jumping and ear-wiggling games',
      energyLevel: 'Hyper',
      secretPower: 'Super Spring Hop',
    },
    idleAnimation: {
      type: 'bunny_hop',
      name: 'Bouncy Hop & Ear Twitch',
      description: 'Springy rhythmic hops, gentle ear wiggles, and cute nose twitches.',
      speed: 1.2,
      amplitude: 0.8,
    },
    theme: {
      primary: '#10b981',
      secondary: '#a7f3d0',
      accent: '#f59e0b',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      cardGradient: 'from-emerald-50 via-teal-50/50 to-emerald-50/80 border-emerald-300',
      glowColor: 'rgba(16, 185, 129, 0.45)',
      auraClass: 'ring-emerald-400',
    },
    voiceStyle: {
      styleName: 'Bouncy & Squeaky (1.7x)',
      pitch: 1.7,
      rate: 1.12,
      voiceEffect: 'chipmunk',
      greeting: "Hop hop hop! I'm Bella Bunny! Can you reach as high as my ears?",
      samplePhrases: [
        "Hop hop hop! Let's bounce together into the sky!",
        "Can you jump high like a kangaroo bunny?",
        "Wiggle your nose and give me a big smile!",
      ],
    },
  },
  {
    id: 'bear',
    name: 'Barnaby the Honey Bear',
    species: 'Honey Bear',
    tagline: 'Warm-hearted cuddly bear who loves silly aerobics and honey!',
    primaryColor: '#f59e0b', // Amber/Honey
    secondaryColor: '#fde68a',
    accentColor: '#10b981',
    voicePitch: 1.05,
    avatarStyle: 'bear',
    bio: 'Barnaby is super friendly, loves big warm hugs, and giggles whenever you lean left or right. Can you match his mighty honey-tree stretch?',
    favoritePose: 'Bear Hug Stretch',
    unlocked: true,
    icon: '🐻',
    personality: {
      traits: ['Warm-Hearted', 'Cuddly', 'Patient', 'Cozy'],
      favoriteActivity: 'Big stretching bear hugs and friendly paw waves',
      energyLevel: 'Cozy',
      secretPower: 'Mighty Gentle Bear Hug',
    },
    idleAnimation: {
      type: 'bear_sway',
      name: 'Cozy Honey Sway',
      description: 'Relaxed side-to-side weight shifting, belly wobbles, and slow friendly wave.',
      speed: 0.8,
      amplitude: 0.65,
    },
    theme: {
      primary: '#f59e0b',
      secondary: '#fde68a',
      accent: '#10b981',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      cardGradient: 'from-amber-50 via-yellow-50/50 to-amber-50/80 border-amber-300',
      glowColor: 'rgba(245, 158, 11, 0.45)',
      auraClass: 'ring-amber-400',
    },
    voiceStyle: {
      styleName: 'Warm & Deep (1.05x)',
      pitch: 1.05,
      rate: 0.95,
      voiceEffect: 'normal',
      greeting: "Big bear hugs! I'm Barnaby! Let's stretch our arms high to the honey tree!",
      samplePhrases: [
        "Big bear hugs! You are doing wonderful!",
        "Stretch way up high to reach the golden honey pots!",
        "Give me a big warm wave with both paws!",
      ],
    },
  },
  {
    id: 'fox',
    name: 'Rusty the Clever Fox',
    species: 'Autumn Fox',
    tagline: 'Clever, swift trickster who loves pose puzzles and swift moves!',
    primaryColor: '#ea580c', // Vivid Sunset Fox Orange
    secondaryColor: '#fed7aa',
    accentColor: '#0284c7',
    voicePitch: 1.45,
    avatarStyle: 'fox',
    bio: 'Rusty is swift as an autumn breeze! He loves rapid balancing challenges, sneaking smiles, and swishing his bushy white-tipped tail whenever you nail a move.',
    favoritePose: 'Clever Pounce',
    unlocked: true,
    icon: '🦊',
    personality: {
      traits: ['Clever', 'Swift', 'Playful', 'Observant'],
      favoriteActivity: 'Fast balancing challenges and quick-draw poses',
      energyLevel: 'Playful',
      secretPower: 'Lightning Tail Swish',
    },
    idleAnimation: {
      type: 'fox_swish',
      name: 'Alert Head Tilt & Tail Swish',
      description: 'Perked triangular ears, curious rapid head tilts, and smooth tail swishes.',
      speed: 1.15,
      amplitude: 0.9,
    },
    theme: {
      primary: '#ea580c',
      secondary: '#fed7aa',
      accent: '#0284c7',
      badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
      cardGradient: 'from-orange-50 via-amber-50/50 to-orange-50/80 border-orange-300',
      glowColor: 'rgba(234, 88, 12, 0.45)',
      auraClass: 'ring-orange-400',
    },
    voiceStyle: {
      styleName: 'Swift & Peppy (1.45x)',
      pitch: 1.45,
      rate: 1.15,
      voiceEffect: 'normal',
      greeting: "Paws up! I'm Rusty! Ready to solve super-fast pose challenges with me?",
      samplePhrases: [
        "Paws up! Ready for a quick pose puzzle?",
        "Can your arms balance like an autumn breeze?",
        "Sneak like a clever fox and freeze in that pose!",
      ],
    },
  },
  {
    id: 'cat',
    name: 'Bubbles the Cosmic Cat',
    species: 'Cosmic Feline',
    tagline: 'Graceful cartoon kitty with sparkling whiskers and cute purrs!',
    primaryColor: '#db2777', // Vibrant Pink Rose
    secondaryColor: '#fbcfe8',
    accentColor: '#7c3aed',
    voicePitch: 1.75,
    avatarStyle: 'cat',
    bio: 'Bubbles floats gracefully through space with sparkling whiskers. She tilts her head whenever you tilt yours and curls her tail in sweet cartoon purrs.',
    favoritePose: 'Kitty Paw Stretch',
    unlocked: true,
    icon: '🐱',
    personality: {
      traits: ['Graceful', 'Affectionate', 'Curious', 'Sweet'],
      favoriteActivity: 'Delicate paw dances, cat stretches, and head tilts',
      energyLevel: 'Playful',
      secretPower: 'Purr-fect Head Tilt',
    },
    idleAnimation: {
      type: 'cat_stretch',
      name: 'Graceful Stretch & Tail Curve',
      description: 'Arching back stretch, cute ear flick, head tilt with gentle tail curls.',
      speed: 0.95,
      amplitude: 0.75,
    },
    theme: {
      primary: '#db2777',
      secondary: '#fbcfe8',
      accent: '#7c3aed',
      badgeBg: 'bg-pink-100 text-pink-900 border-pink-300',
      cardGradient: 'from-pink-50 via-rose-50/50 to-pink-50/80 border-pink-300',
      glowColor: 'rgba(219, 39, 119, 0.45)',
      auraClass: 'ring-pink-400',
    },
    voiceStyle: {
      styleName: 'Sweet & Purry (1.75x)',
      pitch: 1.75,
      rate: 1.05,
      voiceEffect: 'baby',
      greeting: "Meow! I'm Bubbles! Can you tilt your head and show me your cute paws?",
      samplePhrases: [
        "Meow meow! Look at my sparkling paws!",
        "Stretch your back like a happy kitty cat!",
        "Tilt your head left and right with me!",
      ],
    },
  },
  {
    id: 'robot',
    name: 'Bolt the Bouncing Robot',
    species: 'Cyber Bot',
    tagline: 'Beep boop! Mechanical pal with glowing antenna and disco beats!',
    primaryColor: '#2563eb', // Electric Cobalt Blue
    secondaryColor: '#93c5fd',
    accentColor: '#eab308',
    voicePitch: 1.25,
    avatarStyle: 'robot',
    bio: 'Bolt is programmed for 100% fun! His glowing antenna bobs along to your gestures, his digital eyes light up when you smile, and he can load custom GLB models on the fly!',
    favoritePose: 'Robot Pop & Lock',
    unlocked: true,
    icon: '🤖',
    modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    modelType: 'glb',
    personality: {
      traits: ['Analytical', 'Upbeat', 'Rhythmic', 'Inventive'],
      favoriteActivity: 'Robot popping & locking, arm-syncing, disco beats',
      energyLevel: 'Hyper',
      secretPower: 'Turbo Gear Sync',
    },
    idleAnimation: {
      type: 'robot_scan',
      name: 'Cyber Scan & Antenna Bob',
      description: 'Stepped robotic micro-ticks, glowing antenna bobbing, and cyber arm angles.',
      speed: 1.3,
      amplitude: 0.7,
    },
    theme: {
      primary: '#2563eb',
      secondary: '#93c5fd',
      accent: '#eab308',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
      cardGradient: 'from-blue-50 via-cyan-50/50 to-blue-50/80 border-blue-300',
      glowColor: 'rgba(37, 99, 235, 0.45)',
      auraClass: 'ring-blue-400',
    },
    voiceStyle: {
      styleName: 'Robotic Vocoder (1.25x)',
      pitch: 1.25,
      rate: 1.2,
      voiceEffect: 'robot',
      greeting: "Beep boop! I am Bolt! Let's activate dance protocol and mirror every move!",
      samplePhrases: [
        "Beep boop! Motion sensors detected 100% awesome energy!",
        "Robot mode activated! Raise both arms to recharge battery!",
        "Calculating fun levels... Result is maximum infinity!",
      ],
    },
  },
];

// Fallback / Alias mapping for backward compatibility
const CHARACTER_ALIASES: Record<string, string> = {
  'pip-pup': 'robot',
  'bubbles-cat': 'cat',
  'barnaby-bear': 'bear',
  'sparky-dragon': 'fox',
};

const STORAGE_KEY_SELECTED = 'mimictoon_selected_character';
const STORAGE_KEY_CUSTOM_MODELS = 'mimictoon_custom_character_models';

/**
 * Gets a character by ID, resolving any legacy aliases
 */
export function getCharacterById(id: string): CharacterProfile {
  const resolvedId = CHARACTER_ALIASES[id] || id;
  const found = CHARACTERS.find((c) => c.id === resolvedId);
  return found || CHARACTERS[0];
}

/**
 * Saves selected character ID to localStorage
 */
export function saveSelectedCharacterId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED, id);
  } catch (_) {}
}

/**
 * Retrieves saved character ID from localStorage, with fallback to default (Bunny)
 */
export function getSavedSelectedCharacterId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SELECTED);
    if (saved) {
      const resolved = CHARACTER_ALIASES[saved] || saved;
      if (CHARACTERS.some((c) => c.id === resolved)) {
        return resolved;
      }
    }
  } catch (_) {}
  return CHARACTERS[0].id;
}

/**
 * Saves custom GLB/VRM model URL for a specific character
 */
export function saveCustomModelForCharacter(characterId: string, modelUrl: string | undefined): void {
  try {
    const current = getCustomModelsMap();
    if (modelUrl) {
      current[characterId] = modelUrl;
    } else {
      delete current[characterId];
    }
    localStorage.setItem(STORAGE_KEY_CUSTOM_MODELS, JSON.stringify(current));
  } catch (_) {}
}

/**
 * Gets custom GLB/VRM model URL for a character if previously saved
 */
export function getCustomModelForCharacter(characterId: string): string | undefined {
  try {
    const current = getCustomModelsMap();
    return current[characterId];
  } catch (_) {
    return undefined;
  }
}

function getCustomModelsMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Clean registry helper: Allows adding custom characters dynamically at runtime
 * without modifying the core tracking system.
 */
export function registerNewCharacter(character: CharacterProfile): void {
  const existingIdx = CHARACTERS.findIndex((c) => c.id === character.id);
  if (existingIdx >= 0) {
    CHARACTERS[existingIdx] = character;
  } else {
    CHARACTERS.push(character);
  }
}

export const CHALLENGE_POSES: ChallengePose[] = [
  {
    id: 'hands-up-cheer',
    title: 'Touch the Sky!',
    instruction: 'Raise both of your hands straight up in the air like you just won a gold medal!',
    icon: '🙌',
    targetCondition: (k) => k.isHandsUp,
    durationSeconds: 3,
    points: 100,
  },
  {
    id: 'wave-right',
    title: 'Friendly Wave!',
    instruction: 'Raise your right hand high and wave to your cartoon buddy!',
    icon: '👋',
    targetCondition: (k) => k.isWavingRight || k.isWavingLeft,
    durationSeconds: 3,
    points: 120,
  },
  {
    id: 't-pose-airplane',
    title: 'Soaring Airplane!',
    instruction: 'Hold both arms wide out to your sides like airplane wings!',
    icon: '✈️',
    targetCondition: (k) => Math.abs(k.leftArmAngle) > 1.2 && Math.abs(k.rightArmAngle) > 1.2,
    durationSeconds: 3,
    points: 150,
  },
  {
    id: 'silly-tilt',
    title: 'Curious Head Tilt!',
    instruction: 'Tilt your head to the side like you heard a funny squeaky sound!',
    icon: '🙃',
    targetCondition: (k) => Math.abs(k.headRoll) > 0.25 || Math.abs(k.headYaw) > 0.35,
    durationSeconds: 3,
    points: 130,
  },
  {
    id: 'crouch-jump',
    title: 'Bunny Crouch!',
    instruction: 'Bend your knees and squat down low like a spring ready to bounce!',
    icon: '🐰',
    targetCondition: (k) => k.isCrouching,
    durationSeconds: 3,
    points: 160,
  },
];
