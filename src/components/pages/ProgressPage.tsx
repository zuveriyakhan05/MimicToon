import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Sparkles,
  Flame,
  Star,
  Zap,
  Award,
  Clock,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ArrowRight,
  Smile,
  Cloud,
  CloudOff,
  User,
  Medal,
  ChevronRight,
  Crown,
} from 'lucide-react';
import { AppPage } from '../../types';
import { CHARACTERS, getCharacterById } from '../../data/characters';
import { playSoundEffect } from '../../utils/audioEffects';
import { DbProfile, DbUserProgress, DbUserAchievement, DbBestScore, LeaderboardEntry } from '../../types/database';
import { UserSession, authService } from '../../services/authService';
import { progressService, calculateLevelFromXP } from '../../services/progressService';
import { achievementService } from '../../services/achievementService';
import { scoreService } from '../../services/scoreService';

interface ProgressPageProps {
  session: UserSession;
  profile: DbProfile | null;
  progress: DbUserProgress;
  onNavigate: (page: AppPage) => void;
  onOpenProfileModal: () => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  session,
  profile,
  progress,
  onNavigate,
  onOpenProfileModal,
}) => {
  const [activeTab, setActiveTab] = useState<'trophies' | 'leaderboard' | 'best_scores' | 'buddies'>('trophies');
  const [leaderboardMetric, setLeaderboardMetric] = useState<'xp' | 'stars' | 'streak'>('xp');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userAchievements, setUserAchievements] = useState<DbUserAchievement[]>([]);
  const [bestScores, setBestScores] = useState<DbBestScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isCloudActive = authService.isConfigured();
  const levelInfo = calculateLevelFromXP(Number(progress.xp));
  const activeChar = getCharacterById(profile?.selected_character_id || 'bunny');

  // Load data on mount or user change
  useEffect(() => {
    let isMounted = true;
    async function loadProgressDetails() {
      setIsLoading(true);
      try {
        const [achievements, bScores, lBoard] = await Promise.all([
          achievementService.getUserAchievements(session.id),
          scoreService.getAllBestScores(session.id),
          progressService.getLeaderboard(leaderboardMetric),
        ]);

        if (isMounted) {
          setUserAchievements(achievements);
          setBestScores(bScores);
          setLeaderboardData(lBoard);
        }
      } catch (err) {
        console.error('Failed to load progress details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProgressDetails();
    return () => {
      isMounted = false;
    };
  }, [session.id, leaderboardMetric]);

  const allAchievements = achievementService.getAllDefinitions();
  const unlockedSet = new Set(userAchievements.map((a) => a.achievement_id));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('experience')}
            className="p-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-2 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Studio</span>
          </motion.button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>My Trophies & Progress</span>
              <span className="text-2xl">🏆</span>
            </h1>
            <p className="text-sm font-bold text-slate-500">
              Track your motion XP, unlocked badges, streaks, and global rankings!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Cloud Sync Status & Account Trigger */}
          <button
            onClick={onOpenProfileModal}
            className={`px-3.5 py-2.5 rounded-2xl border-2 transition flex items-center gap-2 text-xs font-black shadow-xs ${
              isCloudActive
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {isCloudActive ? (
              <Cloud className="w-4 h-4 text-emerald-600" />
            ) : (
              <CloudOff className="w-4 h-4 text-amber-600" />
            )}
            <div className="text-left leading-tight hidden sm:block">
              <div>{session.isGuest ? 'Guest Player' : profile?.username || session.username}</div>
              <div className="text-[10px] font-bold opacity-75">
                {isCloudActive ? 'Supabase Synced' : 'Local Storage'}
              </div>
            </div>
          </button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playSoundEffect('star');
              onNavigate('copyme');
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-amber-400/30 flex items-center gap-2 transition"
          >
            <span>Play Copy Me 🎮</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Level Banner Card */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-slate-800 text-white shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-amber-500 flex items-center justify-center text-3xl">
              {activeChar.icon || '👑'}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-3 py-0.5 rounded-full border border-amber-400/30">
                Level {levelInfo.level} Cartoon Mimic Master
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mt-1">
                {profile?.display_name || profile?.username || session.username}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-300">Total XP Earned</span>
            <div className="text-3xl font-black text-amber-400 flex items-center gap-1.5 justify-end">
              <Zap className="w-6 h-6 fill-amber-400 text-amber-400" />
              <span>{progress.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-black text-slate-300">
            <span>Next Level Milestone</span>
            <span>
              {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP ({levelInfo.progressPercent}%)
            </span>
          </div>
          <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progressPercent}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full bg-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border-2 border-amber-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase text-amber-700">Stars</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{progress.stars}</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border-2 border-orange-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <Flame className="w-6 h-6 fill-orange-500 text-orange-500" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase text-orange-700">Streak</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{progress.streak_days} Days</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border-2 border-emerald-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase text-emerald-700">Poses Mastered</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{progress.poses_completed}</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border-2 border-purple-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase text-purple-700">Play Time</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{progress.minutes_played} Mins</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Progress Sub-sections */}
      <div className="flex border-b-2 border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-1">
        <button
          onClick={() => {
            playSoundEffect('click');
            setActiveTab('trophies');
          }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'trophies'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-400/30'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Trophies & Badges ({unlockedSet.size}/{allAchievements.length})</span>
        </button>

        <button
          onClick={() => {
            playSoundEffect('click');
            setActiveTab('leaderboard');
          }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-400/30'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Leaderboard</span>
        </button>

        <button
          onClick={() => {
            playSoundEffect('click');
            setActiveTab('best_scores');
          }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'best_scores'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-400/30'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Best Scores ({bestScores.length})</span>
        </button>

        <button
          onClick={() => {
            playSoundEffect('click');
            setActiveTab('buddies');
          }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'buddies'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-400/30'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>My Buddies</span>
        </button>
      </div>

      {/* TAB CONTENT: TROPHIES */}
      {activeTab === 'trophies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAchievements.map((badge) => {
              const isUnlocked = unlockedSet.has(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-5 rounded-3xl border-2 transition-all flex items-start gap-4 ${
                    isUnlocked
                      ? 'bg-white border-amber-200 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 opacity-60'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0 ${
                      isUnlocked
                        ? `bg-gradient-to-tr ${badge.color} text-white`
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isUnlocked ? badge.icon : <Lock className="w-6 h-6 text-slate-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-base font-black text-slate-900 truncate">{badge.title}</h4>
                      {isUnlocked && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 leading-snug">
                      {badge.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        +{badge.xpReward} XP
                      </span>
                      <span className="text-[10px] font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        +{badge.starsReward} ⭐
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>Top Cartoon Mimic Masters</span>
                <span>👑</span>
              </h3>
              <p className="text-xs font-bold text-slate-500">
                Compete with players around the world in motion skills and consistency!
              </p>
            </div>

            {/* Metric Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setLeaderboardMetric('xp')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  leaderboardMetric === 'xp'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Top XP
              </button>
              <button
                onClick={() => setLeaderboardMetric('stars')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  leaderboardMetric === 'stars'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Most Stars
              </button>
              <button
                onClick={() => setLeaderboardMetric('streak')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  leaderboardMetric === 'streak'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Best Streaks
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {leaderboardData.map((entry) => {
              const char = getCharacterById(entry.selectedCharacterId);
              const isCurrentUser = entry.userId === session.id;

              return (
                <div
                  key={entry.userId}
                  className={`py-3.5 px-4 rounded-2xl flex items-center justify-between gap-3 transition ${
                    isCurrentUser ? 'bg-amber-50/80 border-2 border-amber-300 font-black' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                        entry.rank === 1
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : entry.rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : entry.rank === 3
                          ? 'bg-orange-300 text-orange-950'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
                      {char.icon || '🐾'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{entry.displayName}</h4>
                        {isCurrentUser && (
                          <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-800 px-2 py-0.2 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        Level {entry.level} • {char.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {leaderboardMetric === 'xp' && (
                      <div className="text-sm sm:text-base font-black text-amber-600 flex items-center gap-1 justify-end">
                        <Zap className="w-4 h-4 fill-amber-500" />
                        <span>{entry.xp} XP</span>
                      </div>
                    )}
                    {leaderboardMetric === 'stars' && (
                      <div className="text-sm sm:text-base font-black text-amber-500 flex items-center gap-1 justify-end">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span>{entry.stars} Stars</span>
                      </div>
                    )}
                    {leaderboardMetric === 'streak' && (
                      <div className="text-sm sm:text-base font-black text-orange-500 flex items-center gap-1 justify-end">
                        <Flame className="w-4 h-4 fill-orange-500" />
                        <span>{entry.streakDays} Days</span>
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-slate-400 block">
                      {entry.posesCompleted} poses mastered
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BEST SCORES */}
      {activeTab === 'best_scores' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xl font-black text-slate-900">Personal Best Scores</h3>
          {bestScores.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="text-4xl">🎮</div>
              <p className="text-sm font-bold text-slate-500">
                No game scores recorded yet. Jump into Copy Me to set your first high score!
              </p>
              <button
                onClick={() => onNavigate('copyme')}
                className="px-4 py-2 rounded-2xl bg-amber-500 text-white font-black text-xs hover:bg-amber-600 transition shadow-md shadow-amber-400/30"
              >
                Start Copy Me Game
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bestScores.map((score) => {
                const char = getCharacterById(score.character_id);
                return (
                  <div
                    key={score.id || score.challenge_id}
                    className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 flex items-center justify-center text-2xl shadow-xs">
                        {char.icon || '🏆'}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          {score.challenge_id.replace('-', ' ')}
                        </h4>
                        <span className="text-xs font-bold text-slate-500">
                          Buddy: {char.name} • {score.best_accuracy}% accuracy
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-amber-600">{score.best_score} pts</div>
                      <span className="text-[10px] font-bold text-slate-400">Personal Best</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: BUDDIES */}
      {activeTab === 'buddies' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center justify-between">
            <span>Unlocked Cartoon Buddies</span>
            <button
              onClick={() => onNavigate('characters')}
              className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <span>Full Character Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {CHARACTERS.map((char) => {
              const isSelected = (profile?.selected_character_id || 'bunny') === char.id;
              return (
                <div
                  key={char.id}
                  onClick={() => onNavigate('characters')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition text-center space-y-2 group ${
                    isSelected
                      ? 'bg-amber-100/70 border-amber-400 shadow-xs'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-xs group-hover:scale-105 transition"
                    style={{ backgroundColor: `${char.primaryColor}25` }}
                  >
                    {char.icon || '🐾'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{char.name}</h4>
                    <span className="text-[10px] font-bold text-slate-500">{char.species}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
