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
      color: 'bg-[#3B82F6] text-white',
      badgeBorder: 'border-[#BFDBFE] text-[#1D4ED8] bg-[#EFF6FF]',
      icon: Radio,
      badge: 'Listening 👂',
    },
    tracking: {
      title: 'Tracking Your Moves!',
      subtitle: 'Move arms, tilt head & jump!',
      color: 'bg-[#2D8A56] text-white',
      badgeBorder: 'border-[#BFE3CD] text-[#226D43] bg-[#EBF7F0]',
      icon: Activity,
      badge: 'Tracking 🎯',
    },
    speaking: {
      title: 'Buddy is Talking!',
      subtitle: 'Watch your buddy’s mouth move',
      color: 'bg-[#E76F51] text-white',
      badgeBorder: 'border-[#F7CEC3] text-[#C04F34] bg-[#FDF0EB]',
      icon: Volume2,
      badge: 'Speaking 🗣️',
    },
    success: {
      title: 'Great Job! Super Star!',
      subtitle: 'Perfect pose & timing!',
      color: 'bg-[#F2C66D] text-[#23201D]',
      badgeBorder: 'border-[#FBE2A8] text-[#916212] bg-[#FEF7E8]',
      icon: Sparkles,
      badge: 'Success ⭐',
    },
    error: {
      title: 'Can’t See You Yet',
      subtitle: 'Step back into camera view & turn on lights',
      color: 'bg-[#EF4444] text-white',
      badgeBorder: 'border-[#FECACA] text-[#B91C1C] bg-[#FEF2F2]',
      icon: AlertCircle,
      badge: 'Lost Sight 🔍',
    },
    loading: {
      title: 'Warming Up AI Vision...',
      subtitle: 'Getting your cartoon magic ready',
      color: 'bg-[#6366F1] text-white',
      badgeBorder: 'border-[#C7D2FE] text-[#4338CA] bg-[#EEF2FF]',
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
    <div className="flex flex-col gap-3 w-full">
      {/* 1. Main Animated State Banner */}
      <motion.div
        layout
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="relative overflow-hidden rounded-2xl p-4 border border-[#E6DED3] bg-white shadow-product"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              animatedState === 'listening'
                ? { scale: [1, 1.1, 1], rotate: [0, 4, -4, 0] }
                : animatedState === 'speaking'
                ? { y: [0, -2, 0] }
                : animatedState === 'loading'
                ? { rotate: 360 }
                : { scale: [1, 1.04, 1] }
            }
            transition={{
              duration: animatedState === 'loading' ? 1.5 : 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-2xs ${stateConfig.color}`}
          >
            <CurrentStateIcon className="w-5 h-5" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${stateConfig.badgeBorder}`}>
                {stateConfig.badge}
              </span>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-[#22C55E] inline-block"
              />
            </div>
            <h3 className="text-sm font-black text-[#23201D] truncate mt-0.5">
              {stateConfig.title}
            </h3>
            <p className="text-xs font-medium text-[#6C655E] truncate">
              {stateConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Dynamic speech/companion feedback message bubble */}
        {companionMessage && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E6DED3] shadow-2xs flex items-center gap-2 text-xs font-bold text-[#23201D]"
          >
            <span className="text-sm">💬</span>
            <span className="truncate italic">"{companionMessage}"</span>
          </motion.div>
        )}
      </motion.div>

      {/* 2. Score & Streak Dual Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* ⭐ Score Card */}
        <motion.div
          whileHover={{ y: -1 }}
          className="rounded-xl p-3 bg-white border border-[#E6DED3] shadow-product flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-lg bg-[#FEF7E8] border border-[#FBE2A8] flex items-center justify-center text-[#23201D] shadow-2xs">
            <Sparkles className="w-4 h-4 fill-[#F2C66D] text-[#D49826]" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-[#916212]">
              Session Stars
            </div>
            <div className="text-lg font-black text-[#23201D] leading-none mt-0.5">
              {stats.stars + score}
            </div>
          </div>
        </motion.div>

        {/* 🔥 Streak Card */}
        <motion.div
          whileHover={{ y: -1 }}
          className="rounded-xl p-3 bg-white border border-[#E6DED3] shadow-product flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-lg bg-[#FDF0EB] border border-[#F7CEC3] flex items-center justify-center text-[#E76F51] shadow-2xs">
            <Flame className="w-4 h-4 fill-[#E76F51] text-[#E76F51]" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-[#C04F34]">
              Fire Streak
            </div>
            <div className="text-lg font-black text-[#23201D] leading-none mt-0.5">
              {Math.max(stats.streakDays, streakCount)}d 🔥
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. Hardware Status (Camera & Microphone) */}
      <div className="rounded-xl p-3.5 bg-white border border-[#E6DED3] shadow-product space-y-3">
        {/* 🎥 Camera Status */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E6DED3]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isCameraActive ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]' : 'bg-[#F8F4EC] text-[#988F85] border border-[#E6DED3]'
              }`}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#23201D]">Camera Feed</span>
                <span className="w-2 h-2 rounded-full bg-[#22C55E] inline-block animate-pulse" />
              </div>
              <span className="text-[10px] font-bold text-[#988F85]">
                {isCameraActive ? `${cameraFps} FPS • HD 720p` : 'Connecting...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleMirror}
              className={`px-2 py-1 rounded-md text-[10px] font-black border transition cursor-pointer ${
                isMirrored
                  ? 'bg-[#FDF0EB] text-[#C04F34] border-[#F7CEC3]'
                  : 'bg-[#F8F4EC] text-[#6C655E] border-[#E6DED3] hover:bg-white'
              }`}
              title="Mirror Camera Feed"
            >
              Mirror
            </button>
            <button
              onClick={onToggleSkeleton}
              className={`px-2 py-1 rounded-md text-[10px] font-black border transition cursor-pointer ${
                showSkeleton
                  ? 'bg-[#EBF7F0] text-[#226D43] border-[#BFE3CD]'
                  : 'bg-[#F8F4EC] text-[#6C655E] border-[#E6DED3] hover:bg-white'
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
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition shadow-2xs cursor-pointer ${
                isMicActive
                  ? 'bg-[#EBF7F0] text-[#2D8A56] hover:bg-[#DCFCE7] border border-[#BFE3CD]'
                  : 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2] border border-[#FECACA]'
              }`}
              title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#23201D]">Microphone</span>
                {isMicActive && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-[#EBF7F0] text-[#226D43] border border-[#BFE3CD]">
                    Active
                  </span>
                )}
              </div>
              {/* Dynamic Audio Level Bar */}
              <div className="w-24 h-1.5 bg-[#E6DED3] rounded-full overflow-hidden mt-1">
                <motion.div
                  className="h-full bg-[#2D8A56]"
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
              className="text-xs font-bold bg-[#FAF6EE] hover:bg-[#F8F4EC] text-[#23201D] py-1 px-2 rounded-lg border border-[#E6DED3] cursor-pointer outline-hidden"
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
      <div className="rounded-xl p-3.5 bg-white border border-[#E6DED3] shadow-product space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
            <h4 className="text-xs font-black text-[#23201D] uppercase tracking-wider">
              AI Vision Tracking
            </h4>
          </div>
          <span className="text-[10px] font-black text-[#226D43] bg-[#EBF7F0] px-2 py-0.5 rounded-md border border-[#BFE3CD]">
            {isBodyTracked ? 'Optimal' : 'Searching'}
          </span>
        </div>

        {/* Tracking Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Body Pose */}
          <div
            className={`p-2 rounded-lg border transition ${
              isBodyTracked
                ? 'bg-[#EBF7F0] border-[#BFE3CD] text-[#194D31]'
                : 'bg-[#FAF6EE] border-[#E6DED3] text-[#988F85]'
            }`}
          >
            <div className="flex justify-center mb-1">
              <Zap className={`w-3.5 h-3.5 ${isBodyTracked ? 'text-[#2D8A56]' : 'text-[#988F85]'}`} />
            </div>
            <div className="text-[10px] font-black leading-tight">Body Rig</div>
            <div className="text-[10px] font-bold text-[#6C655E] mt-0.5">
              {isBodyTracked ? `${Math.round(bodyConfidence * 100)}%` : '---'}
            </div>
          </div>

          {/* Face & Smile */}
          <div
            className={`p-2 rounded-lg border transition ${
              faceSignals && (faceSignals.isSmiling ?? faceSignals.mouthSmile > 0.4)
                ? 'bg-[#FEF7E8] border-[#FBE2A8] text-[#916212]'
                : faceSignals
                ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                : 'bg-[#FAF6EE] border-[#E6DED3] text-[#988F85]'
            }`}
          >
            <div className="flex justify-center mb-1">
              <Smile
                className={`w-3.5 h-3.5 ${
                  faceSignals && (faceSignals.isSmiling ?? faceSignals.mouthSmile > 0.4) ? 'text-[#D49826]' : faceSignals ? 'text-[#3B82F6]' : 'text-[#988F85]'
                }`}
              />
            </div>
            <div className="text-[10px] font-black leading-tight">Facial Mimic</div>
            <div className="text-[10px] font-bold text-[#6C655E] mt-0.5">
              {faceSignals && (faceSignals.isSmiling ?? faceSignals.mouthSmile > 0.4) ? 'Smiling 😊' : faceSignals ? 'Tracked' : '---'}
            </div>
          </div>

          {/* Hands & Gestures */}
          <div
            className={`p-2 rounded-lg border transition ${
              handSignals?.leftHand || handSignals?.rightHand
                ? 'bg-[#FDF0EB] border-[#F7CEC3] text-[#C04F34]'
                : 'bg-[#FAF6EE] border-[#E6DED3] text-[#988F85]'
            }`}
          >
            <div className="flex justify-center mb-1">
              <Hand
                className={`w-3.5 h-3.5 ${
                  handSignals?.leftHand || handSignals?.rightHand ? 'text-[#E76F51]' : 'text-[#988F85]'
                }`}
              />
            </div>
            <div className="text-[10px] font-black leading-tight">Hands</div>
            <div className="text-[10px] font-bold text-[#6C655E] mt-0.5">
              {handSignals?.leftHand?.gesture || handSignals?.rightHand?.gesture || 'Hands Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Fun Interactive Micro-Actions */}
      {onTriggerQuickAction && (
        <div className="rounded-xl p-3 bg-white border border-[#E6DED3] shadow-product">
          <div className="text-[10px] font-black text-[#23201D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E76F51]" />
            <span>Buddy Quick Reactions</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onTriggerQuickAction('wave')}
              className="py-1.5 px-2 rounded-lg bg-[#FAF6EE] hover:bg-[#F5EFE4] border border-[#E6DED3] text-[#23201D] text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>👋</span>
              <span>Wave</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('cheer')}
              className="py-1.5 px-2 rounded-lg bg-[#FAF6EE] hover:bg-[#F5EFE4] border border-[#E6DED3] text-[#23201D] text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>🎉</span>
              <span>Cheer</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('jump')}
              className="py-1.5 px-2 rounded-lg bg-[#FAF6EE] hover:bg-[#F5EFE4] border border-[#E6DED3] text-[#23201D] text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>🦘</span>
              <span>Jump</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('laugh')}
              className="py-1.5 px-2 rounded-lg bg-[#FAF6EE] hover:bg-[#F5EFE4] border border-[#E6DED3] text-[#23201D] text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>😆</span>
              <span>Laugh</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('joke')}
              className="py-1.5 px-2 rounded-lg bg-[#FAF6EE] hover:bg-[#F5EFE4] border border-[#E6DED3] text-[#23201D] text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>🃏</span>
              <span>Joke</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('compliment')}
              className="py-1.5 px-2 rounded-lg bg-[#FAF6EE] hover:bg-[#F5EFE4] border border-[#E6DED3] text-[#23201D] text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
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
