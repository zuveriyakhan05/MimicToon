import { supabase } from '../lib/supabase';
import { DbGameScore, DbBestScore } from '../types/database';

export interface SaveScoreInput {
  userId: string;
  challengeId?: string;
  gameMode?: string;
  characterId: string;
  score: number;
  accuracy: number;
  armAccuracy?: number;
  bodyAccuracy?: number;
  headAccuracy?: number;
  durationSeconds?: number;
  starsEarned?: number;
  xpEarned?: number;
}

const LOCAL_SCORES_KEY = 'mimictoon_local_scores';
const LOCAL_BEST_SCORES_KEY = 'mimictoon_local_best_scores';

function getLocalScores(userId: string): DbGameScore[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_SCORES_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveLocalScore(score: DbGameScore): void {
  try {
    const list = getLocalScores(score.user_id);
    list.unshift(score);
    localStorage.setItem(
      `${LOCAL_SCORES_KEY}_${score.user_id}`,
      JSON.stringify(list.slice(0, 50))
    );
  } catch (_) {}
}

function getLocalBestScores(userId: string): Record<string, DbBestScore> {
  try {
    const raw = localStorage.getItem(`${LOCAL_BEST_SCORES_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

function updateLocalBestScore(bestScore: DbBestScore): void {
  try {
    const dict = getLocalBestScores(bestScore.user_id);
    const existing = dict[bestScore.challenge_id];
    if (!existing || bestScore.best_score > existing.best_score) {
      dict[bestScore.challenge_id] = bestScore;
      localStorage.setItem(
        `${LOCAL_BEST_SCORES_KEY}_${bestScore.user_id}`,
        JSON.stringify(dict)
      );
    }
  } catch (_) {}
}

export const scoreService = {
  /**
   * Saves a game score to the database and updates best score.
   * NOTE: Strictly stores numeric metrics and game metadata.
   * Never stores raw camera footage or microphone recordings.
   */
  async saveGameScore(input: SaveScoreInput): Promise<{
    scoreRecord: DbGameScore;
    isNewBest: boolean;
  }> {
    const challengeId = input.challengeId || 'overall';
    const nowIso = new Date().toISOString();

    const scoreRecord: DbGameScore = {
      id: 'score_' + Math.random().toString(36).substring(2, 9),
      user_id: input.userId,
      challenge_id: challengeId,
      game_mode: input.gameMode || 'copy_me',
      character_id: input.characterId,
      score: Math.round(input.score),
      accuracy: Number(input.accuracy.toFixed(1)),
      arm_accuracy: input.armAccuracy ? Number(input.armAccuracy.toFixed(1)) : null,
      body_accuracy: input.bodyAccuracy ? Number(input.bodyAccuracy.toFixed(1)) : null,
      head_accuracy: input.headAccuracy ? Number(input.headAccuracy.toFixed(1)) : null,
      duration_seconds: input.durationSeconds || 0,
      stars_earned: input.starsEarned || 0,
      xp_earned: input.xpEarned || 0,
      created_at: nowIso,
    };

    let isNewBest = false;

    // Check against existing best score
    const existingBest = await this.getBestScoreForChallenge(input.userId, challengeId);
    if (!existingBest || scoreRecord.score > existingBest.best_score) {
      isNewBest = true;
    }

    const bestScoreRecord: DbBestScore = {
      id: 'best_' + Math.random().toString(36).substring(2, 9),
      user_id: input.userId,
      challenge_id: challengeId,
      best_score: Math.max(scoreRecord.score, existingBest ? existingBest.best_score : 0),
      best_accuracy: Math.max(scoreRecord.accuracy, existingBest ? existingBest.best_accuracy : 0),
      character_id: input.characterId,
      achieved_at: nowIso,
    };

    if (supabase) {
      try {
        // Insert game score
        await supabase.from('game_scores').insert({
          user_id: scoreRecord.user_id,
          challenge_id: scoreRecord.challenge_id,
          game_mode: scoreRecord.game_mode,
          character_id: scoreRecord.character_id,
          score: scoreRecord.score,
          accuracy: scoreRecord.accuracy,
          arm_accuracy: scoreRecord.arm_accuracy,
          body_accuracy: scoreRecord.body_accuracy,
          head_accuracy: scoreRecord.head_accuracy,
          duration_seconds: scoreRecord.duration_seconds,
          stars_earned: scoreRecord.stars_earned,
          xp_earned: scoreRecord.xp_earned,
        });

        // Upsert best score
        if (isNewBest) {
          await supabase.from('best_scores').upsert({
            user_id: bestScoreRecord.user_id,
            challenge_id: bestScoreRecord.challenge_id,
            best_score: bestScoreRecord.best_score,
            best_accuracy: bestScoreRecord.best_accuracy,
            character_id: bestScoreRecord.character_id,
            achieved_at: nowIso,
          });
        }
      } catch (err) {
        console.warn('Could not save score to Supabase:', err);
      }
    }

    // Always update local storage cache
    saveLocalScore(scoreRecord);
    if (isNewBest) {
      updateLocalBestScore(bestScoreRecord);
    }

    return { scoreRecord, isNewBest };
  },

  async getRecentScores(userId: string, limit = 10): Promise<DbGameScore[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('game_scores')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data as DbGameScore[];
        }
      } catch (_) {}
    }

    return getLocalScores(userId).slice(0, limit);
  },

  async getBestScoreForChallenge(
    userId: string,
    challengeId: string
  ): Promise<DbBestScore | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('best_scores')
          .select('*')
          .eq('user_id', userId)
          .eq('challenge_id', challengeId)
          .single();

        if (!error && data) {
          return data as DbBestScore;
        }
      } catch (_) {}
    }

    const dict = getLocalBestScores(userId);
    return dict[challengeId] || null;
  },

  async getAllBestScores(userId: string): Promise<DbBestScore[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('best_scores')
          .select('*')
          .eq('user_id', userId);

        if (!error && data) {
          return data as DbBestScore[];
        }
      } catch (_) {}
    }

    const dict = getLocalBestScores(userId);
    return Object.values(dict);
  },

  async getChallengeLeaderboard(challengeId: string, limit = 10) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('best_scores')
          .select(`
            best_score,
            best_accuracy,
            character_id,
            achieved_at,
            profiles (
              username,
              display_name
            )
          `)
          .eq('challenge_id', challengeId)
          .order('best_score', { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data;
        }
      } catch (_) {}
    }
    return [];
  },
};
