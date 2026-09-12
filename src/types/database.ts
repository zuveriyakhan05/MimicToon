export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: DbProfile;
        Insert: Omit<DbProfile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbProfile, 'id'>>;
      };
      user_progress: {
        Row: DbUserProgress;
        Insert: Omit<DbUserProgress, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbUserProgress, 'user_id'>>;
      };
      game_scores: {
        Row: DbGameScore;
        Insert: Omit<DbGameScore, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DbGameScore, 'id'>>;
      };
      best_scores: {
        Row: DbBestScore;
        Insert: Omit<DbBestScore, 'id' | 'achieved_at'> & {
          id?: string;
          achieved_at?: string;
        };
        Update: Partial<Omit<DbBestScore, 'id'>>;
      };
      user_achievements: {
        Row: DbUserAchievement;
        Insert: Omit<DbUserAchievement, 'id' | 'unlocked_at'> & {
          id?: string;
          unlocked_at?: string;
        };
        Update: Partial<Omit<DbUserAchievement, 'id'>>;
      };
    };
    Views: {
      leaderboard_xp_view: {
        Row: {
          user_id: string;
          username: string;
          display_name: string | null;
          selected_character_id: string;
          xp: number;
          level: number;
          stars: number;
          streak_days: number;
          poses_completed: number;
        };
      };
    };
  };
}

export interface DbProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  selected_character_id: string;
  custom_model_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserProgress {
  user_id: string;
  xp: number;
  level: number;
  stars: number;
  streak_days: number;
  last_active_date: string; // YYYY-MM-DD
  poses_completed: number;
  minutes_played: number;
  completed_challenge_ids: string[];
  unlocked_character_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface DbGameScore {
  id: string;
  user_id: string;
  challenge_id: string | null;
  game_mode: string; // 'copy_me' | 'free_play' | 'pose_match'
  character_id: string;
  score: number;
  accuracy: number;
  arm_accuracy: number | null;
  body_accuracy: number | null;
  head_accuracy: number | null;
  duration_seconds: number;
  stars_earned: number;
  xp_earned: number;
  created_at: string;
}

export interface DbBestScore {
  id: string;
  user_id: string;
  challenge_id: string;
  best_score: number;
  best_accuracy: number;
  character_id: string;
  achieved_at: string;
}

export interface DbUserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  unlocked_at: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'general' | 'poses' | 'streaks' | 'accuracy' | 'characters';
  color: string;
  xpReward: number;
  starsReward: number;
  requirement: {
    type: 'poses_count' | 'streak_days' | 'score' | 'accuracy' | 'character_play' | 'stars_count';
    target: number;
    characterId?: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  selectedCharacterId: string;
  xp: number;
  level: number;
  stars: number;
  streakDays: number;
  posesCompleted: number;
  bestScore?: number;
}
