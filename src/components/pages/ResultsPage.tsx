import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Sparkles,
  Flame,
  Star,
  RotateCcw,
  ArrowRight,
  Share2,
  Award,
  Zap,
  CheckCircle2,
  Smile,
  Crown,
  Cloud,
} from 'lucide-react';
import { AppPage, GameSessionResult, UserStats } from '../../types';
import { playSoundEffect } from '../../utils/audioEffects';
import { AchievementDefinition } from '../../types/database';
import { authService } from '../../services/authService';

interface ResultsPageProps {
  result: GameSessionResult | null;
  stats: UserStats;
  isNewBest?: boolean;
  newlyUnlocked?: AchievementDefinition[];
  onNavigate: (page: AppPage) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  result,
  stats,
  isNewBest = false,
  newlyUnlocked = [],
  onNavigate,
}) => {
  const isCloudConnected = authService.isConfigured();

  // Fire celebratory confetti on mount
  useEffect(() => {
    playSoundEffect('fanfare');
    const timer = setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#fbbf24'],
      });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const data: GameSessionResult = result || {
    score: 380,
    starsEarned: 12,
    xpEarned: 280,
    streakDays: stats.streakDays,
    posesCompleted: 3,
    armAccuracy: 95,
    bodyAccuracy: 90,
    headAccuracy: 88,
    characterName: 'Bella Bunny',
    characterAvatar: 'bunny',
    feedbackTitle: 'Superstar Mover! 🎉',
    feedbackMessage: 'You matched the poses with amazing speed and precision!',
    date: new Date().toLocaleDateString(),
  };

  const overallAccuracy = Math.round(
    (data.armAccuracy + data.bodyAccuracy + data.headAccuracy) / 3
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      {/* Top Banner Celebration Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative overflow-hidden rounded-3xl p-8 bg-[#E76F51] text-white shadow-tactile-coral border border-[#D85D3F] text-center space-y-4"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 fill-white text-white" />
            <span>Challenge Completed!</span>
          </div>

          {isNewBest && (
            <div className="inline-flex items-center gap-1.5 bg-[#FEF7E8] text-[#23201D] font-black text-xs uppercase px-3.5 py-1.5 rounded-full shadow-sm animate-bounce border border-[#FBE2A8]">
              <Crown className="w-3.5 h-3.5 fill-[#23201D] text-[#23201D]" />
              <span>New Personal Best!</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 bg-black/15 backdrop-blur-xs text-white/95 text-[11px] font-bold px-3 py-1 rounded-full border border-white/20">
            <Cloud className="w-3.5 h-3.5" />
            <span>{isCloudConnected ? 'Synced to Supabase' : 'Saved to Profile'}</span>
          </div>
        </div>

        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}
          className="w-20 h-20 mx-auto rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-4xl shadow-inner"
        >
          🏆
        </motion.div>

        <div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-display">
            {data.feedbackTitle}
          </h1>
          <p className="text-sm sm:text-base font-medium text-white/90 max-w-lg mx-auto mt-2">
            {data.feedbackMessage}
          </p>
        </div>

        {/* Big Score Callout */}
        <div className="inline-block bg-black/20 backdrop-blur-md border border-white/25 px-7 py-3 rounded-2xl shadow-inner">
          <span className="text-xs font-black uppercase tracking-wider text-white/80">
            Final Score
          </span>
          <div className="text-3xl sm:text-4xl font-black mt-0.5 font-display tracking-tight">
            {data.score} <span className="text-xl font-bold text-white/80">pts</span>
          </div>
        </div>
      </motion.div>

      {/* Unlocked Achievements Alert (if any unlocked this round) */}
      {newlyUnlocked && newlyUnlocked.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-[#FEF7E8] text-[#23201D] border border-[#FBE2A8] shadow-product flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6DED3] text-3xl flex items-center justify-center shadow-xs">
              {newlyUnlocked[0].icon}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#E76F51]/10 text-[#E76F51] px-2 py-0.5 rounded-full border border-[#E76F51]/20">
                New Trophy Unlocked!
              </span>
              <h3 className="text-lg font-black text-[#23201D]">{newlyUnlocked[0].title}</h3>
              <p className="text-xs text-[#6C655E] font-medium">{newlyUnlocked[0].description}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black bg-[#E76F51] text-white px-3.5 py-1.5 rounded-full shadow-tactile-coral">
              +{newlyUnlocked[0].xpReward} XP
            </span>
          </div>
        </motion.div>
      )}

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stars */}
        <motion.div
          whileHover={{ translateY: -2 }}
          className="p-5 rounded-3xl bg-white border border-[#E6DED3] shadow-product flex items-center gap-4 transition-all"
        >
          <div className="w-13 h-13 rounded-2xl bg-[#FEF7E8] border border-[#FBE2A8] flex items-center justify-center text-amber-500 shadow-inner">
            <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#988F85]">Stars Earned</span>
            <div className="text-2xl font-black text-[#23201D] mt-0.5 font-display">
              +{data.starsEarned} <span className="text-sm font-bold text-amber-500">⭐</span>
            </div>
          </div>
        </motion.div>

        {/* XP */}
        <motion.div
          whileHover={{ translateY: -2 }}
          className="p-5 rounded-3xl bg-white border border-[#E6DED3] shadow-product flex items-center gap-4 transition-all"
        >
          <div className="w-13 h-13 rounded-2xl bg-[#FDF0EB] border border-[#F7CEC3] flex items-center justify-center text-[#E76F51] shadow-inner">
            <Zap className="w-6 h-6 fill-[#E76F51] text-[#E76F51]" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#988F85]">XP Gained</span>
            <div className="text-2xl font-black text-[#23201D] mt-0.5 font-display">
              +{data.xpEarned} <span className="text-sm font-bold text-[#E76F51]">XP</span>
            </div>
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div
          whileHover={{ translateY: -2 }}
          className="p-5 rounded-3xl bg-white border border-[#E6DED3] shadow-product flex items-center gap-4 transition-all"
        >
          <div className="w-13 h-13 rounded-2xl bg-[#FEF7E8] border border-[#FBE2A8] flex items-center justify-center text-[#E76F51] shadow-inner">
            <Flame className="w-6 h-6 fill-[#E76F51] text-[#E76F51]" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#988F85]">Streak Active</span>
            <div className="text-2xl font-black text-[#23201D] mt-0.5 font-display">
              {data.streakDays} Days <span className="text-sm font-bold text-[#E76F51]">🔥</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Accuracy Breakdown Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E6DED3] shadow-product space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-[#23201D] font-display">Pose Accuracy Breakdown</h3>
            <p className="text-xs font-medium text-[#6C655E] mt-0.5">
              Calculated using live MediaPipe vision landmarks (strictly local, no video stored)
            </p>
          </div>
          <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-[#EBF7F0] text-[#2D8A56] text-xs font-black border border-[#BFE3CD]">
            {overallAccuracy}% Precision
          </div>
        </div>

        <div className="space-y-4">
          {/* Arm Position */}
          <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-[#23201D]">Arm Position (Wrists & Shoulders)</span>
              <span className="text-[#2D8A56]">{data.armAccuracy}%</span>
            </div>
            <div className="w-full h-3 bg-[#F4EFE6] rounded-full overflow-hidden border border-[#E6DED3]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.armAccuracy}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-[#2D8A56] rounded-full"
              />
            </div>
          </div>

          {/* Body Position */}
          <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-[#23201D]">Body & Torso (Lean & Hips)</span>
              <span className="text-[#E76F51]">{data.bodyAccuracy}%</span>
            </div>
            <div className="w-full h-3 bg-[#F4EFE6] rounded-full overflow-hidden border border-[#E6DED3]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.bodyAccuracy}%` }}
                transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
                className="h-full bg-[#E76F51] rounded-full"
              />
            </div>
          </div>

          {/* Head Position */}
          <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-[#23201D]">Head Position (Tilt & Nod)</span>
              <span className="text-[#6C655E]">{data.headAccuracy}%</span>
            </div>
            <div className="w-full h-3 bg-[#F4EFE6] rounded-full overflow-hidden border border-[#E6DED3]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.headAccuracy}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                className="h-full bg-[#6C655E] rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Buddy High Five Quote */}
        <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E6DED3] flex items-center gap-3">
          <span className="text-2xl">🐾</span>
          <p className="text-xs font-bold text-[#23201D] italic">
            "{data.characterName} says: High five, partner! You copied my moves like a real cartoon superhero!"
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playSoundEffect('pop');
            onNavigate('copyme');
          }}
          className="px-6 py-3.5 rounded-2xl bg-[#E76F51] hover:bg-[#D85D3F] text-white font-black text-sm shadow-tactile-coral flex items-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play "Copy Me" Again 🎮</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playSoundEffect('pop');
            onNavigate('progress');
          }}
          className="px-6 py-3.5 rounded-2xl bg-white border border-[#E6DED3] text-[#23201D] hover:bg-[#F8F4EC] font-black text-sm shadow-product flex items-center gap-2 transition"
        >
          <Award className="w-4 h-4 text-[#E76F51]" />
          <span>View Trophy Case & Leaderboard 🏆</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playSoundEffect('pop');
            onNavigate('experience');
          }}
          className="px-6 py-3.5 rounded-2xl bg-[#F4EFE6] hover:bg-[#EBE4D8] border border-[#E6DED3] text-[#6C655E] font-black text-sm flex items-center gap-2 transition"
        >
          <span>Back to Live Studio 🪞</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};
