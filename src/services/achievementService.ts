import { supabase } from '../lib/supabase';
import { AchievementDefinition, DbUserAchievement, DbUserProgress, DbGameScore } from '../types/database';

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'first_wave',
    title: 'High Five Hero',
    description: 'Waved your hand and said hello to your 3D cartoon buddy!',
    icon: '👋',
    category: 'general',
    color: 'from-amber-400 to-orange-400',
    xpReward: 100,
    starsReward: 5,
    requirement: { type: 'poses_count', target: 1 },
  },
  {
    id: 'sky_reach',
    title: 'Sky Reacher',
    description: 'Stretched both arms way up to the clouds in Copy Me!',
    icon: '🙌',
    category: 'poses',
    color: 'from-sky-400 to-blue-500',
    xpReward: 120,
    starsReward: 6,
    requirement: { type: 'poses_count', target: 3 },
  },
  {
    id: 'precision_star',
    title: 'Precision Star',
    description: 'Scored 90%+ similarity match in a motion challenge!',
    icon: '🎯',
    category: 'accuracy',
    color: 'from-emerald-400 to-teal-500',
    xpReward: 200,
    starsReward: 10,
    requirement: { type: 'accuracy', target: 90 },
  },
  {
    id: 'jumping_bean',
    title: 'Jumping Bean',
    description: 'Mastered 5 full pose challenges with your cartoon buddy!',
    icon: '🦘',
    category: 'poses',
    color: 'from-purple-400 to-indigo-500',
    xpReward: 250,
    starsReward: 10,
    requirement: { type: 'poses_count', target: 5 },
  },
  {
    id: 'flame_keeper',
    title: 'Flame Keeper',
    description: 'Maintained an active 3-day motion streak!',
    icon: '🔥',
    category: 'streaks',
    color: 'from-orange-500 to-red-500',
    xpReward: 300,
    starsReward: 15,
    requirement: { type: 'streak_days', target: 3 },
  },
  {
    id: 'super_streak',
    title: 'Lightning Streak',
    description: 'Reached a super 7-day daily activity streak!',
    icon: '⚡',
    category: 'streaks',
    color: 'from-amber-400 to-yellow-500',
    xpReward: 500,
    starsReward: 25,
    requirement: { type: 'streak_days', target: 7 },
  },
  {
    id: 'star_collector',
    title: 'Star Hoarder',
    description: 'Collected over 50 shining stars on your mimic journey!',
    icon: '⭐',
    category: 'general',
    color: 'from-yellow-400 to-amber-500',
    xpReward: 350,
    starsReward: 15,
    requirement: { type: 'stars_count', target: 50 },
  },
  {
    id: 'high_scorer',
    title: 'Super Scorer',
    description: 'Scored 400 or more points in a single Copy Me challenge!',
    icon: '🏆',
    category: 'accuracy',
    color: 'from-rose-400 to-pink-600',
    xpReward: 400,
    starsReward: 20,
    requirement: { type: 'score', target: 400 },
  },
  {
    id: 'robot_groove',
    title: 'Cyber Pulse',
    description: 'Danced and mimicked moves with Spark-E Robot!',
    icon: '🤖',
    category: 'characters',
    color: 'from-cyan-400 to-blue-600',
    xpReward: 150,
    starsReward: 8,
    requirement: { type: 'character_play', target: 1, characterId: 'robot' },
  },
];

const LOCAL_ACHIEVEMENTS_KEY = 'mimictoon_local_achievements';

function getLocalAchievements(userId: string): DbUserAchievement[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_ACHIEVEMENTS_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}

  // Default unlocked for onboarding joy
  const defaults: DbUserAchievement[] = [
    {
      id: 'ach_1',
      user_id: userId,
      achievement_id: 'first_wave',
      progress: 100,
      unlocked_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'ach_2',
      user_id: userId,
      achievement_id: 'sky_reach',
      progress: 100,
      unlocked_at: new Date().toISOString(),
    },
  ];

  saveLocalAchievements(userId, defaults);
  return defaults;
}

function saveLocalAchievements(userId: string, list: DbUserAchievement[]): void {
  try {
    localStorage.setItem(`${LOCAL_ACHIEVEMENTS_KEY}_${userId}`, JSON.stringify(list));
  } catch (_) {}
}

export const achievementService = {
  getAllDefinitions(): AchievementDefinition[] {
    return ACHIEVEMENTS_CATALOG;
  },

  async getUserAchievements(userId: string): Promise<DbUserAchievement[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', userId);

        if (!error && data && data.length > 0) {
          return data as DbUserAchievement[];
        }
      } catch (_) {}
    }

    return getLocalAchievements(userId);
  },

  async checkAndUnlockAchievements(
    userId: string,
    context: {
      progress: DbUserProgress;
      latestScore?: DbGameScore;
      selectedCharacterId?: string;
    }
  ): Promise<AchievementDefinition[]> {
    const currentUnlocked = await this.getUserAchievements(userId);
    const unlockedIds = new Set(currentUnlocked.map((a) => a.achievement_id));
    const newlyUnlocked: AchievementDefinition[] = [];

    const nowIso = new Date().toISOString();

    for (const def of ACHIEVEMENTS_CATALOG) {
      if (unlockedIds.has(def.id)) continue;

      let isEarned = false;

      switch (def.requirement.type) {
        case 'poses_count':
          if (context.progress.poses_completed >= def.requirement.target) {
            isEarned = true;
          }
          break;
        case 'streak_days':
          if (context.progress.streak_days >= def.requirement.target) {
            isEarned = true;
          }
          break;
        case 'stars_count':
          if (context.progress.stars >= def.requirement.target) {
            isEarned = true;
          }
          break;
        case 'accuracy':
          if (context.latestScore && context.latestScore.accuracy >= def.requirement.target) {
            isEarned = true;
          }
          break;
        case 'score':
          if (context.latestScore && context.latestScore.score >= def.requirement.target) {
            isEarned = true;
          }
          break;
        case 'character_play':
          if (
            (context.selectedCharacterId === def.requirement.characterId) ||
            (context.latestScore && context.latestScore.character_id === def.requirement.characterId)
          ) {
            isEarned = true;
          }
          break;
      }

      if (isEarned) {
        newlyUnlocked.push(def);
        const achievementRecord: DbUserAchievement = {
          id: 'ach_' + Math.random().toString(36).substring(2, 9),
          user_id: userId,
          achievement_id: def.id,
          progress: 100,
          unlocked_at: nowIso,
        };
        currentUnlocked.push(achievementRecord);

        if (supabase) {
          try {
            await supabase.from('user_achievements').upsert({
              user_id: achievementRecord.user_id,
              achievement_id: achievementRecord.achievement_id,
              progress: 100,
              unlocked_at: nowIso,
            });
          } catch (err) {
            console.warn('Could not sync achievement to Supabase:', err);
          }
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      saveLocalAchievements(userId, currentUnlocked);
    }

    return newlyUnlocked;
  },
};
