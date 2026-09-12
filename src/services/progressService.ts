import { supabase } from '../lib/supabase';
import { DbUserProgress, LeaderboardEntry } from '../types/database';

const LOCAL_PROGRESS_KEY = 'mimictoon_local_progress';

export function calculateLevelFromXP(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  // Level threshold: Level 1 = 0-250 XP, Level 2 = 250-600 XP, etc. (progressive +150 per level)
  let level = 1;
  let threshold = 250;
  let remainingXp = xp;

  while (remainingXp >= threshold) {
    remainingXp -= threshold;
    level++;
    threshold += 150;
  }

  const progressPercent = Math.min(100, Math.round((remainingXp / threshold) * 100));

  return {
    level,
    currentLevelXp: remainingXp,
    nextLevelXp: threshold,
    progressPercent,
  };
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function computeStreak(lastActiveDate: string, currentStreak: number): number {
  const today = getTodayDateString();
  if (lastActiveDate === today) {
    return Math.max(1, currentStreak);
  }

  const last = new Date(lastActiveDate);
  const now = new Date(today);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return currentStreak + 1;
  } else if (diffDays > 1) {
    return 1;
  }
  return currentStreak;
}

function getLocalProgress(userId: string): DbUserProgress {
  try {
    const saved = localStorage.getItem(`${LOCAL_PROGRESS_KEY}_${userId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (_) {}

  const defaultProgress: DbUserProgress = {
    user_id: userId,
    xp: 280,
    level: 2,
    stars: 12,
    streak_days: 3,
    last_active_date: getTodayDateString(),
    poses_completed: 12,
    minutes_played: 18,
    completed_challenge_ids: ['high-five', 'sky-reach', 'funny-dance'],
    unlocked_character_ids: ['bunny', 'bear', 'fox', 'cat', 'robot'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveLocalProgress(defaultProgress);
  return defaultProgress;
}

function saveLocalProgress(progress: DbUserProgress): void {
  try {
    localStorage.setItem(
      `${LOCAL_PROGRESS_KEY}_${progress.user_id}`,
      JSON.stringify(progress)
    );
  } catch (_) {}
}

export const progressService = {
  async getUserProgress(userId: string): Promise<DbUserProgress> {
    if (supabase) {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        return data as DbUserProgress;
      }

      // If record not found in Supabase yet, initialize it
      const initial: DbUserProgress = {
        user_id: userId,
        xp: 0,
        level: 1,
        stars: 0,
        streak_days: 1,
        last_active_date: getTodayDateString(),
        poses_completed: 0,
        minutes_played: 0,
        completed_challenge_ids: [],
        unlocked_character_ids: ['bunny', 'bear', 'fox', 'cat', 'robot'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase.from('user_progress').insert(initial);
        return initial;
      } catch (_) {}
    }

    return getLocalProgress(userId);
  },

  async recordGameProgress(
    userId: string,
    earned: {
      xp: number;
      stars: number;
      posesCount: number;
      minutes?: number;
      challengeId?: string;
    }
  ): Promise<DbUserProgress> {
    const current = await this.getUserProgress(userId);
    const today = getTodayDateString();
    const updatedStreak = computeStreak(current.last_active_date, current.streak_days);

    const newXp = Number(current.xp) + earned.xp;
    const { level: newLevel } = calculateLevelFromXP(newXp);
    const newStars = current.stars + earned.stars;
    const newPoses = current.poses_completed + earned.posesCount;
    const newMinutes = current.minutes_played + (earned.minutes || 1);

    const completedChallenges = [...(current.completed_challenge_ids || [])];
    if (earned.challengeId && !completedChallenges.includes(earned.challengeId)) {
      completedChallenges.push(earned.challengeId);
    }

    const updatedProgress: DbUserProgress = {
      ...current,
      xp: newXp,
      level: newLevel,
      stars: newStars,
      streak_days: updatedStreak,
      last_active_date: today,
      poses_completed: newPoses,
      minutes_played: newMinutes,
      completed_challenge_ids: completedChallenges,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase
          .from('user_progress')
          .upsert(updatedProgress);
      } catch (err) {
        console.warn('Could not sync progress to Supabase:', err);
      }
    }

    saveLocalProgress(updatedProgress);
    return updatedProgress;
  },

  async getLeaderboard(
    metric: 'xp' | 'stars' | 'streak' = 'xp',
    limit = 10
  ): Promise<LeaderboardEntry[]> {
    if (supabase) {
      try {
        const orderColumn = metric === 'streak' ? 'streak_days' : metric;
        const { data, error } = await supabase
          .from('user_progress')
          .select(`
            user_id,
            xp,
            level,
            stars,
            streak_days,
            poses_completed,
            profiles (
              username,
              display_name,
              selected_character_id
            )
          `)
          .order(orderColumn, { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          return data.map((row: any, index: number) => ({
            rank: index + 1,
            userId: row.user_id,
            username: row.profiles?.username || 'Player',
            displayName: row.profiles?.display_name || row.profiles?.username || 'Player',
            selectedCharacterId: row.profiles?.selected_character_id || 'bunny',
            xp: Number(row.xp),
            level: row.level,
            stars: row.stars,
            streakDays: row.streak_days,
            posesCompleted: row.poses_completed,
          }));
        }
      } catch (e) {
        console.warn('Leaderboard fetch fallback to mock:', e);
      }
    }

    // Default high-spirited leaderboard mock when starting out or offline
    return [
      {
        rank: 1,
        userId: 'p1',
        username: 'BouncyLeo',
        displayName: 'Bouncy Leo',
        selectedCharacterId: 'bunny',
        xp: 1450,
        level: 6,
        stars: 85,
        streakDays: 7,
        posesCompleted: 42,
      },
      {
        rank: 2,
        userId: 'p2',
        username: 'MayaMoves',
        displayName: 'Maya Moves',
        selectedCharacterId: 'fox',
        xp: 1120,
        level: 5,
        stars: 64,
        streakDays: 5,
        posesCompleted: 35,
      },
      {
        rank: 3,
        userId: 'p3',
        username: 'SammyStretch',
        displayName: 'Sammy Stretch',
        selectedCharacterId: 'bear',
        xp: 940,
        level: 4,
        stars: 52,
        streakDays: 4,
        posesCompleted: 28,
      },
      {
        rank: 4,
        userId: 'p4',
        username: 'ZaraZoom',
        displayName: 'Zara Zoom',
        selectedCharacterId: 'robot',
        xp: 780,
        level: 3,
        stars: 40,
        streakDays: 3,
        posesCompleted: 22,
      },
      {
        rank: 5,
        userId: 'p5',
        username: 'TobyTwist',
        displayName: 'Toby Twist',
        selectedCharacterId: 'cat',
        xp: 590,
        level: 3,
        stars: 30,
        streakDays: 2,
        posesCompleted: 17,
      },
    ];
  },
};
