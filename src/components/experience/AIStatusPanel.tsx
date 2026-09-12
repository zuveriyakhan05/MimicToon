import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Mic,
  MicOff,
  Activity,
  Sparkles,
  Flame,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  Eye,
  Hand,
  Smile,
  Zap,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { VoiceEffect, UserStats } from '../../types';
import { FaceSignals, HandSignals } from '../../types/avatar';
import { CompanionState, CompanionReactionType } from '../../types/companion';

export type AIAnimatedState = 'listening' | 'tracking' | 'speaking' | 'success' | 'error' | 'loading';

export interface AIStatusPanelProps {
  // Core animated state
  animatedState: AIAnimatedState;
  // Metrics & Hardware
  isCameraActive: boolean;
  cameraFps?: number;
  isMirrored: boolean;
  onToggleMirror: () => void;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  // Audio
  isMicActive: boolean;
  audioLevel: number;
  onToggleMic: () => void;
  activeVoiceEffect: VoiceEffect;
  onChangeVoiceEffect: (effect: VoiceEffect) => void;
  // Tracking
  isBodyTracked: boolean;
  bodyConfidence: number;
  faceSignals: FaceSignals | null;
  handSignals: HandSignals | null;
  // Game & Companion stats
  stats: UserStats;
  score: number;
  streakCount: number;
  companionState?: CompanionState;
  companionReaction?: CompanionReactionType;
  companionMessage?: string;
  onTriggerQuickAction?: (action: 'wave' | 'cheer' | 'laugh' | 'jump' | 'joke' | 'compliment') => void;
}

export const AIStatusPanel: React.FC<AIStatusPanelProps> = ({
  animatedState,
  isCameraActive,
  cameraFps = 60,
  isMirrored,
  onToggleMirror,
  showSkeleton,
  onToggleSkeleton,
  isMicActive,
  audioLevel,
  onToggleMic,
  activeVoiceEffect,
  onChangeVoiceEffect,
  isBodyTracked,
  bodyConfidence,
  faceSignals,
  handSignals,
  stats,
  score,
  streakCount,
  companionState,
  companionReaction,
  companionMessage,
  onTriggerQuickAction,
}) => {
  // Config for current animated state badge
  const stateConfig = {
    listening: {
      title: 'Listening to You!',
      subtitle: 'Speak or giggle into your mic',
      color: 'bg-sky-500 text-white shadow-sky-300/50',
      bgGlow: 'from-sky-50 to-blue-100/60 border-sky-200',
      icon: Radio,
      badge: 'Listening 👂',
    },
    tracking: {
      title: 'Tracking Your Moves!',
      subtitle: 'Move arms, tilt head & jump!',
      color: 'bg-emerald-500 text-white shadow-emerald-300/50',
      bgGlow: 'from-emerald-50 to-teal-100/60 border-emerald-200',
      icon: Activity,
      badge: 'Tracking 🎯',
    },
    speaking: {
      title: 'Buddy is Talking!',
      subtitle: 'Watch your buddy’s mouth move',
      color: 'bg-violet-500 text-white shadow-violet-300/50',
      bgGlow: 'from-violet-50 to-purple-100/60 border-violet-200',
      icon: Volume2,
      badge: 'Speaking 🗣️',
    },
    success: {
      title: 'Great Job! Super Star!',
      subtitle: 'Perfect pose & timing!',
      color: 'bg-amber-500 text-white shadow-amber-300/50',
      bgGlow: 'from-amber-50 to-yellow-100/60 border-amber-200',
      icon: Sparkles,
      badge: 'Success ⭐',
    },
    error: {
      title: 'Can’t See You Yet',
      subtitle: 'Step back into camera view & turn on lights',
      color: 'bg-rose-500 text-white shadow-rose-300/50',
      bgGlow: 'from-rose-50 to-red-100/60 border-rose-200',
      icon: AlertCircle,
      badge: 'Lost Sight 🔍',
    },
    loading: {
      title: 'Warming Up AI Vision...',
      subtitle: 'Getting your cartoon magic ready',
      color: 'bg-indigo-500 text-white shadow-indigo-300/50',
      bgGlow: 'from-indigo-50 to-blue-100/60 border-indigo-200',
      icon: Loader2,
      badge: 'Loading 🚀',
    },
  }[animatedState];

  const CurrentStateIcon = stateConfig.icon;

  const effects: { id: VoiceEffect; label: string; icon: string }[] = [
    { id: 'chipmunk', label: 'Chipmunk', icon: '🐿️' },
    { id: 'robot', label: 'Robot', icon: '🤖' },
    { id: 'baby', label: 'Baby', icon: '🐣' },
    { id: 'echo', label: 'Echo', icon: '📢' },
    { id: 'normal', label: 'Natural', icon: '✨' },
  ];

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* 1. Main Animated State Banner */}
      <motion.div
        layout
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`relative overflow-hidden rounded-2xl p-4 border bg-white ${stateConfig.bgGlow} shadow-sm`}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              animatedState === 'listening'
                ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
                : animatedState === 'speaking'
                ? { y: [0, -3, 0] }
                : animatedState === 'loading'
                ? { rotate: 360 }
                : { scale: [1, 1.05, 1] }
            }
            transition={{
              duration: animatedState === 'loading' ? 1.5 : 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${stateConfig.color}`}
          >
            <CurrentStateIcon className="w-6 h-6" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-slate-800 shadow-xs border border-slate-200/60">
                {stateConfig.badge}
              </span>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
              />
            </div>
            <h3 className="text-base font-black text-slate-900 truncate mt-0.5">
              {stateConfig.title}
            </h3>
            <p className="text-xs font-bold text-slate-600 truncate">
              {stateConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Dynamic speech/companion feedback message bubble */}
        {companionMessage && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2.5 rounded-2xl bg-white/95 border border-amber-200/80 shadow-xs flex items-center gap-2 text-xs font-black text-amber-950"
          >
            <span className="text-base">💬</span>
            <span className="truncate italic">"{companionMessage}"</span>
          </motion.div>
        )}
      </motion.div>

      {/* 2. Score & Streak Dual Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* ⭐ Score Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-xl p-3 bg-white border border-amber-200/90 shadow-sm flex items-center gap-2.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
            <Sparkles className="w-5 h-5 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              Session Stars
            </div>
            <div className="text-xl font-black text-slate-900 leading-none mt-0.5">
              {stats.stars + score}
            </div>
          </div>
        </motion.div>

        {/* 🔥 Streak Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-xl p-3 bg-white border border-orange-200/90 shadow-sm flex items-center gap-2.5"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
            <Flame className="w-5 h-5 fill-orange-500 text-orange-500" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-orange-700">
              Fire Streak
            </div>
            <div className="text-xl font-black text-slate-900 leading-none mt-0.5">
              {Math.max(stats.streakDays, streakCount)}d 🔥
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. Hardware Status (Camera & Microphone) */}
      <div className="rounded-2xl p-3.5 bg-white border border-slate-200 shadow-sm space-y-3">
        {/* 🎥 Camera Status */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isCameraActive ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-800">Camera Feed</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {isCameraActive ? `${cameraFps} FPS • HD 720p` : 'Connecting...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleMirror}
              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition ${
                isMirrored
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Mirror Camera Feed"
            >
              Mirror
            </button>
            <button
              onClick={onToggleSkeleton}
              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition ${
                showSkeleton
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Show Skeleton Overlay"
            >
              Skeleton
            </button>
          </div>
        </div>

        {/* 🎤 Microphone Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onToggleMic}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition shadow-xs ${
                isMicActive
                  ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                  : 'bg-rose-100 text-rose-500 hover:bg-rose-200'
              }`}
              title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-800">Microphone</span>
                {isMicActive && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700">
                    Active
                  </span>
                )}
              </div>
              {/* Dynamic Audio Level Bar */}
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200/80">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-amber-400"
                  animate={{ width: `${Math.min(100, Math.max(5, audioLevel * 100))}%` }}
                  transition={{ duration: 0.08 }}
                />
              </div>
            </div>
          </div>

          {/* Voice Pitch Selector */}
          <div className="flex items-center gap-1">
            <select
              value={activeVoiceEffect}
              onChange={(e) => onChangeVoiceEffect(e.target.value as VoiceEffect)}
              className="text-xs font-black bg-slate-100 hover:bg-slate-200/80 text-slate-700 py-1 px-2 rounded-xl border border-slate-200 cursor-pointer outline-hidden"
            >
              {effects.map((fx) => (
                <option key={fx.id} value={fx.id}>
                  {fx.icon} {fx.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. 🟢 AI Tracking Status Nodes */}
      <div className="rounded-3xl p-3.5 bg-white/90 backdrop-blur-md border-2 border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              AI Vision Tracking
            </h4>
          </div>
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {isBodyTracked ? 'Optimal' : 'Searching'}
          </span>
        </div>

        {/* Tracking Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Body Pose */}
          <div
            className={`p-2 rounded-2xl border transition ${
              isBodyTracked
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex justify-center mb-1">
              <Zap className={`w-4 h-4 ${isBodyTracked ? 'text-emerald-500' : 'text-slate-300'}`} />
            </div>
            <div className="text-[11px] font-black leading-tight">Body Rig</div>
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
              {isBodyTracked ? `${Math.round(bodyConfidence * 100)}%` : '---'}
            </div>
          </div>

          {/* Face & Smile */}
          <div
            className={`p-2 rounded-2xl border transition ${
              faceSignals && (faceSignals.isSmiling ?? faceSignals.mouthSmile > 0.4)
                ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                : faceSignals
                ? 'bg-sky-50/70 border-sky-200 text-sky-900'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex justify-center mb-1">
              <Smile
                className={`w-4 h-4 ${
                  faceSignals && (faceSignals.isSmiling ?? faceSignals.mouthSmile > 0.4) ? 'text-amber-500' : faceSignals ? 'text-sky-500' : 'text-slate-300'
                }`}
              />
            </div>
            <div className="text-[11px] font-black leading-tight">Facial Mimic</div>
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
              {faceSignals && (faceSignals.isSmiling ?? faceSignals.mouthSmile > 0.4) ? 'Smiling 😊' : faceSignals ? 'Tracked' : '---'}
            </div>
          </div>

          {/* Hands & Gestures */}
          <div
            className={`p-2 rounded-2xl border transition ${
              handSignals?.leftHand || handSignals?.rightHand
                ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex justify-center mb-1">
              <Hand
                className={`w-4 h-4 ${
                  handSignals?.leftHand || handSignals?.rightHand ? 'text-purple-500' : 'text-slate-300'
                }`}
              />
            </div>
            <div className="text-[11px] font-black leading-tight">Hands</div>
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
              {handSignals?.leftHand?.gesture || handSignals?.rightHand?.gesture || 'Hands Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Fun Interactive Micro-Actions */}
      {onTriggerQuickAction && (
        <div className="rounded-3xl p-3.5 bg-gradient-to-r from-amber-100/70 via-orange-50/60 to-rose-100/70 border-2 border-amber-200/80 shadow-xs">
          <div className="text-[11px] font-black text-amber-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>Buddy Quick Reactions</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onTriggerQuickAction('wave')}
              className="py-1.5 px-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-slate-800 text-xs font-extrabold shadow-xs transition active:scale-95 flex items-center justify-center gap-1"
            >
              <span>👋</span>
              <span>Wave</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('cheer')}
              className="py-1.5 px-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-slate-800 text-xs font-extrabold shadow-xs transition active:scale-95 flex items-center justify-center gap-1"
            >
              <span>🎉</span>
              <span>Cheer</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('jump')}
              className="py-1.5 px-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-slate-800 text-xs font-extrabold shadow-xs transition active:scale-95 flex items-center justify-center gap-1"
            >
              <span>🦘</span>
              <span>Jump</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('laugh')}
              className="py-1.5 px-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-slate-800 text-xs font-extrabold shadow-xs transition active:scale-95 flex items-center justify-center gap-1"
            >
              <span>😆</span>
              <span>Laugh</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('joke')}
              className="py-1.5 px-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-slate-800 text-xs font-extrabold shadow-xs transition active:scale-95 flex items-center justify-center gap-1"
            >
              <span>🃏</span>
              <span>Joke</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('compliment')}
              className="py-1.5 px-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-slate-800 text-xs font-extrabold shadow-xs transition active:scale-95 flex items-center justify-center gap-1"
            >
              <span>💖</span>
              <span>Praise</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
