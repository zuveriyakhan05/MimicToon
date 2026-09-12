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
        className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow-2xl shadow-amber-400/30 text-center space-y-4"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 fill-white text-white" />
            <span>Challenge Completed!</span>
          </div>

          {isNewBest && (
            <div className="inline-flex items-center gap-1.5 bg-yellow-300 text-yellow-950 font-black text-xs uppercase px-3 py-1.5 rounded-full shadow-sm animate-bounce">
              <Crown className="w-3.5 h-3.5 fill-yellow-950" />
              <span>New Personal Best!</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1 bg-black/20 backdrop-blur-xs text-white/90 text-[11px] font-bold px-3 py-1 rounded-full">
            <Cloud className="w-3 h-3" />
            <span>{isCloudConnected ? 'Synced to Supabase' : 'Saved to Profile'}</span>
          </div>
        </div>

        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
          className="w-20 h-20 mx-auto rounded-3xl bg-white/25 backdrop-blur-md border-2 border-white/50 flex items-center justify-center text-4xl shadow-lg"
        >
          🏆
        </motion.div>

        <div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            {data.feedbackTitle}
          </h1>
          <p className="text-sm sm:text-base font-bold text-white/90 max-w-lg mx-auto mt-2">
            {data.feedbackMessage}
          </p>
        </div>

        {/* Big Score Callout */}
        <div className="inline-block bg-black/20 backdrop-blur-md border border-white/30 px-6 py-2.5 rounded-2xl">
          <span className="text-xs font-black uppercase tracking-wider text-amber-200">
            Final Score
          </span>
          <div className="text-3xl sm:text-4xl font-black mt-0.5">
            {data.score} <span className="text-xl font-bold text-amber-200">pts</span>
          </div>
        </div>
      </motion.div>

      {/* Unlocked Achievements Alert (if any unlocked this round) */}
      {newlyUnlocked && newlyUnlocked.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white text-3xl flex items-center justify-center shadow-xs">
              {newlyUnlocked[0].icon}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                New Trophy Unlocked!
              </span>
              <h3 className="text-lg font-black">{newlyUnlocked[0].title}</h3>
              <p className="text-xs text-white/90 font-bold">{newlyUnlocked[0].description}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black bg-white text-amber-700 px-3 py-1 rounded-full shadow-xs">
              +{newlyUnlocked[0].xpReward} XP
            </span>
          </div>
        </motion.div>
      )}

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stars */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="p-5 rounded-3xl bg-white border-2 border-amber-200 shadow-xs flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500 shadow-inner">
            <Star className="w-7 h-7 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-amber-700">Stars Earned</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              +{data.starsEarned} <span className="text-sm font-bold text-amber-600">⭐</span>
            </div>
          </div>
        </motion.div>

        {/* XP */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="p-5 rounded-3xl bg-white border-2 border-blue-200 shadow-xs flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 shadow-inner">
            <Zap className="w-7 h-7 fill-blue-500 text-blue-500" />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-blue-700">XP Gained</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              +{data.xpEarned} <span className="text-sm font-bold text-blue-600">XP</span>
            </div>
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="p-5 rounded-3xl bg-white border-2 border-orange-200 shadow-xs flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 shadow-inner">
            <Flame className="w-7 h-7 fill-orange-500 text-orange-500" />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-orange-700">Streak Active</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {data.streakDays} Days <span className="text-sm font-bold text-orange-500">🔥</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Accuracy Breakdown Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Pose Accuracy Breakdown</h3>
            <p className="text-xs font-bold text-slate-500">
              Calculated using live MediaPipe vision landmarks (strictly local, no video stored)
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-100 text-emerald-800 text-sm font-black border border-emerald-300">
            {overallAccuracy}% Precision
          </div>
        </div>

        <div className="space-y-4">
          {/* Arm Position */}
          <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-slate-700">Arm Position (Wrists & Shoulders)</span>
              <span className="text-emerald-600">{data.armAccuracy}%</span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.armAccuracy}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
              />
            </div>
          </div>

          {/* Body Position */}
          <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-slate-700">Body & Torso (Lean & Hips)</span>
              <span className="text-blue-600">{data.bodyAccuracy}%</span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.bodyAccuracy}%` }}
                transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
              />
            </div>
          </div>

          {/* Head Position */}
          <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-slate-700">Head Position (Tilt & Nod)</span>
              <span className="text-purple-600">{data.headAccuracy}%</span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.headAccuracy}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-400 to-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Buddy High Five Quote */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <span className="text-2xl">🐾</span>
          <p className="text-xs font-bold text-amber-950 italic">
            "{data.characterName} says: High five, partner! You copied my moves like a real cartoon superhero!"
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            playSoundEffect('pop');
            onNavigate('copyme');
          }}
          className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-lg shadow-amber-400/30 flex items-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play "Copy Me" Again 🎮</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            playSoundEffect('pop');
            onNavigate('progress');
          }}
          className="px-6 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50 font-black text-sm shadow-xs flex items-center gap-2 transition"
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>View Trophy Case & Leaderboard 🏆</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            playSoundEffect('pop');
            onNavigate('experience');
          }}
          className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center gap-2 transition"
        >
          <span>Back to Live Studio 🪞</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};
