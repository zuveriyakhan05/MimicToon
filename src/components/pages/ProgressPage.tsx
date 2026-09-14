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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('experience')}
            className="p-3 rounded-2xl bg-white border border-[#E6DED3] text-[#23201D] hover:bg-[#F8F4EC] transition shadow-product flex items-center gap-2 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Studio</span>
          </motion.button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#23201D] font-display tracking-tight flex items-center gap-2.5">
              <span>My Trophies & Progress</span>
              <span className="text-2xl">🏆</span>
            </h1>
            <p className="text-sm font-medium text-[#6C655E] mt-0.5">
              Track your motion XP, unlocked badges, streaks, and global rankings!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Cloud Sync Status & Account Trigger */}
          <button
            onClick={onOpenProfileModal}
            className={`px-3.5 py-2.5 rounded-2xl border transition flex items-center gap-2 text-xs font-black shadow-product ${
              isCloudActive
                ? 'bg-[#EBF7F0] border-[#BFE3CD] text-[#2D8A56] hover:bg-[#DDF0E5]'
                : 'bg-[#FEF7E8] border-[#FBE2A8] text-[#8C6415] hover:bg-[#FDF0EB]'
            }`}
          >
            {isCloudActive ? (
              <Cloud className="w-4 h-4 text-[#2D8A56]" />
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playSoundEffect('star');
              onNavigate('copyme');
            }}
            className="px-5 py-2.5 rounded-2xl bg-[#E76F51] hover:bg-[#D85D3F] text-white font-black text-xs sm:text-sm shadow-tactile-coral flex items-center gap-2 transition"
          >
            <span>Play Copy Me 🎮</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Level Banner Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-[#23201D] text-white shadow-product border border-[#3E3832] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E76F51] flex items-center justify-center text-3xl shadow-inner">
              {activeChar.icon || '👑'}
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-white/90 bg-white/15 px-3 py-1 rounded-full border border-white/20">
                Level {levelInfo.level} Cartoon Mimic Master
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mt-1.5 font-display tracking-tight">
                {profile?.display_name || profile?.username || session.username}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-medium text-white/70">Total XP Earned</span>
            <div className="text-3xl font-black text-white flex items-center gap-1.5 justify-end font-display">
              <Zap className="w-6 h-6 fill-[#E76F51] text-[#E76F51]" />
              <span>{progress.xp} XP</span>
            </div>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-bold text-white/80">
            <span>Next Level Milestone</span>
            <span>
              {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP ({levelInfo.progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3.5 bg-white/10 rounded-full overflow-hidden border border-white/15">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progressPercent}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full bg-[#E76F51] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-[#E6DED3] shadow-product flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF7E8] border border-[#FBE2A8] text-amber-600 flex items-center justify-center shadow-inner">
            <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#988F85]">Stars</div>
            <div className="text-2xl font-black text-[#23201D] mt-0.5 font-display">{progress.stars}</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#E6DED3] shadow-product flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF0EB] border border-[#F7CEC3] text-[#E76F51] flex items-center justify-center shadow-inner">
            <Flame className="w-6 h-6 fill-[#E76F51] text-[#E76F51]" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#988F85]">Streak</div>
            <div className="text-2xl font-black text-[#23201D] mt-0.5 font-display">{progress.streak_days} Days</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#E6DED3] shadow-product flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF7F0] border border-[#BFE3CD] text-[#2D8A56] flex items-center justify-center shadow-inner">
            <Award className="w-6 h-6 text-[#2D8A56]" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#988F85]">Poses Mastered</div>
            <div className="text-2xl font-black text-[#23201D] mt-0.5 font-display">{progress.poses_completed}</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#E6DED3] shadow-product flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F4EFE6] border border-[#E6DED3] text-[#6C655E] flex items-center justify-center shadow-inner">
            <Clock className="w-6 h-6 text-[#6C655E]" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#988F85]">Play Time</div>
            <div className="text-2xl font-black text-[#23201D] mt-0.5 font-display">{progress.minutes_played} Mins</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Progress Sub-sections */}
      <div className="inline-flex p-1.5 bg-[#F4EFE6] border border-[#E6DED3] rounded-2xl gap-1 overflow-x-auto max-w-full">
        <button
          onClick={() => {
            playSoundEffect('click');
            setActiveTab('trophies');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'trophies'
              ? 'bg-white text-[#23201D] shadow-product'
              : 'text-[#6C655E] hover:text-[#23201D]'
          }`}
        >
          <Trophy className="w-4 h-4 text-[#E76F51]" />
          <span>Trophies & Badges ({unlockedSet.size}/{allAchievements.length})</span>
        </button>

        <button
          onClick={() => {
            playSoundEffect('click');
            setActiveTab('leaderboard');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-white text-[#23201D] shadow-product'
              : 'text-[#6C655E] hover:text-[#23201D]'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span>Leaderboard</span>
        </button>

        <button
          onClick={() => {
            playSoundEffect('click');
            setActiveTab('best_scores');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'best_scores'
              ? 'bg-white text-[#23201D] shadow-product'
              : 'text-[#6C655E] hover:text-[#23201D]'
          }`}
        >
          <Zap className="w-4 h-4 text-[#E76F51]" />
          <span>Best Scores ({bestScores.length})</span>
        </button>

        <button
          onClick={() => {
            playSoundEffect('click');
            setActiveTab('buddies');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'buddies'
              ? 'bg-white text-[#23201D] shadow-product'
              : 'text-[#6C655E] hover:text-[#23201D]'
          }`}
        >
          <Smile className="w-4 h-4 text-[#2D8A56]" />
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
                  whileHover={{ translateY: -2 }}
                  className={`p-5 rounded-3xl border transition-all flex items-start gap-4 ${
                    isUnlocked
                      ? 'bg-white border-[#E6DED3] shadow-product'
                      : 'bg-[#FAF6EE]/60 border-[#E6DED3] opacity-60'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                      isUnlocked
                        ? 'bg-[#FEF7E8] border-[#FBE2A8] text-[#23201D] shadow-inner'
                        : 'bg-[#F4EFE6] border-[#E6DED3] text-[#988F85]'
                    }`}
                  >
                    {isUnlocked ? badge.icon : <Lock className="w-6 h-6 text-[#988F85]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-base font-black text-[#23201D] truncate font-display">{badge.title}</h4>
                      {isUnlocked && <CheckCircle2 className="w-4 h-4 text-[#2D8A56] shrink-0" />}
                    </div>
                    <p className="text-xs font-medium text-[#6C655E] mt-0.5 leading-snug">
                      {badge.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="text-[10px] font-black text-[#E76F51] bg-[#FDF0EB] px-2.5 py-0.5 rounded-full border border-[#F7CEC3]">
                        +{badge.xpReward} XP
                      </span>
                      <span className="text-[10px] font-black text-amber-700 bg-[#FEF7E8] px-2.5 py-0.5 rounded-full border border-[#FBE2A8]">
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
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E6DED3] shadow-product space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-[#23201D] font-display flex items-center gap-2">
                <span>Top Cartoon Mimic Masters</span>
                <span>👑</span>
              </h3>
              <p className="text-xs font-medium text-[#6C655E] mt-0.5">
                Compete with players around the world in motion skills and consistency!
              </p>
            </div>

            {/* Metric Selector */}
            <div className="flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl border border-[#E6DED3]">
              <button
                onClick={() => setLeaderboardMetric('xp')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  leaderboardMetric === 'xp'
                    ? 'bg-[#E76F51] text-white shadow-tactile-coral'
                    : 'text-[#6C655E] hover:text-[#23201D]'
                }`}
              >
                Top XP
              </button>
              <button
                onClick={() => setLeaderboardMetric('stars')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  leaderboardMetric === 'stars'
                    ? 'bg-[#E76F51] text-white shadow-tactile-coral'
                    : 'text-[#6C655E] hover:text-[#23201D]'
                }`}
              >
                Most Stars
              </button>
              <button
                onClick={() => setLeaderboardMetric('streak')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  leaderboardMetric === 'streak'
                    ? 'bg-[#E76F51] text-white shadow-tactile-coral'
                    : 'text-[#6C655E] hover:text-[#23201D]'
                }`}
              >
                Best Streaks
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#E6DED3]/60">
            {leaderboardData.map((entry) => {
              const char = getCharacterById(entry.selectedCharacterId);
              const isCurrentUser = entry.userId === session.id;

              return (
                <div
                  key={entry.userId}
                  className={`py-3.5 px-4 rounded-2xl flex items-center justify-between gap-3 transition ${
                    isCurrentUser ? 'bg-[#FDF0EB] border border-[#F7CEC3] font-black' : 'hover:bg-[#FAF6EE]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 border ${
                        entry.rank === 1
                          ? 'bg-[#FEF7E8] border-[#FBE2A8] text-amber-900'
                          : entry.rank === 2
                          ? 'bg-[#F4EFE6] border-[#E6DED3] text-[#23201D]'
                          : entry.rank === 3
                          ? 'bg-[#FDF0EB] border-[#F7CEC3] text-[#E76F51]'
                          : 'bg-[#FAF6EE] border-[#E6DED3] text-[#6C655E]'
                      }`}
                    >
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-[#FAF6EE] border border-[#E6DED3] flex items-center justify-center text-xl shrink-0">
                      {char.icon || '🐾'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[#23201D]">{entry.displayName}</h4>
                        {isCurrentUser && (
                          <span className="text-[10px] font-black uppercase bg-[#E76F51] text-white px-2 py-0.5 rounded-full shadow-xs">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#6C655E]">
                        Level {entry.level} • {char.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {leaderboardMetric === 'xp' && (
                      <div className="text-sm sm:text-base font-black text-[#E76F51] flex items-center gap-1 justify-end font-display">
                        <Zap className="w-4 h-4 fill-[#E76F51]" />
                        <span>{entry.xp} XP</span>
                      </div>
                    )}
                    {leaderboardMetric === 'stars' && (
                      <div className="text-sm sm:text-base font-black text-amber-600 flex items-center gap-1 justify-end font-display">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span>{entry.stars} Stars</span>
                      </div>
                    )}
                    {leaderboardMetric === 'streak' && (
                      <div className="text-sm sm:text-base font-black text-[#E76F51] flex items-center gap-1 justify-end font-display">
                        <Flame className="w-4 h-4 fill-[#E76F51]" />
                        <span>{entry.streakDays} Days</span>
                      </div>
                    )}
                    <span className="text-[11px] font-medium text-[#6C655E] block">
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
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E6DED3] shadow-product space-y-4">
          <h3 className="text-xl font-black text-[#23201D] font-display">Personal Best Scores</h3>
          {bestScores.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="text-4xl">🎮</div>
              <p className="text-sm font-medium text-[#6C655E]">
                No game scores recorded yet. Jump into Copy Me to set your first high score!
              </p>
              <button
                onClick={() => onNavigate('copyme')}
                className="px-5 py-2.5 rounded-2xl bg-[#E76F51] text-white font-black text-xs hover:bg-[#D85D3F] transition shadow-tactile-coral"
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
                    className="p-5 rounded-2xl border border-[#E6DED3] bg-white shadow-product flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#E6DED3] flex items-center justify-center text-2xl shadow-inner">
                        {char.icon || '🏆'}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#23201D] uppercase tracking-wide">
                          {score.challenge_id.replace('-', ' ')}
                        </h4>
                        <span className="text-xs font-medium text-[#6C655E]">
                          Buddy: {char.name} • {score.best_accuracy}% accuracy
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-[#E76F51] font-display">{score.best_score} pts</div>
                      <span className="text-[10px] font-bold text-[#988F85]">Personal Best</span>
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
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E6DED3] shadow-product space-y-4">
          <h3 className="text-lg font-black text-[#23201D] font-display flex items-center justify-between">
            <span>Unlocked Cartoon Buddies</span>
            <button
              onClick={() => onNavigate('characters')}
              className="text-xs font-black text-[#E76F51] hover:text-[#D85D3F] flex items-center gap-1"
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
                  className={`cursor-pointer p-4 rounded-2xl border transition text-center space-y-2 group ${
                    isSelected
                      ? 'bg-[#FDF0EB] border-[#E76F51] shadow-product'
                      : 'border-[#E6DED3] bg-white hover:bg-[#FAF6EE]'
                  }`}
                >
                  <div
                    className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-xs group-hover:scale-105 transition"
                    style={{ backgroundColor: `${char.primaryColor}20` }}
                  >
                    {char.icon || '🐾'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#23201D]">{char.name}</h4>
                    <span className="text-[10px] font-medium text-[#6C655E]">{char.species}</span>
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
