import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Smile,
  Hand,
  MessageCircle,
  Activity,
  Award,
  Zap,
} from 'lucide-react';
import { CompanionState, CompanionReactionType } from '../../types/companion';
import { CharacterProfile, VoiceEffect } from '../../types';

interface InteractiveCompanionHUDProps {
  character: CharacterProfile;
  currentState: CompanionState;
  currentReaction: CompanionReactionType;
  childTranscript: string;
  interimTranscript: string;
  characterReply: string;
  isListening: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleListening: () => void;
  audioLevel: number;
  speechSupported: boolean;
  onTriggerQuickAction: (actionText: string) => void;
  onTriggerReaction: (reaction: CompanionReactionType) => void;
  activeEffect?: VoiceEffect;
  onChangeEffect?: (effect: VoiceEffect) => void;
}

const STATE_CONFIG: Record<
  CompanionState,
  { label: string; icon: string; bg: string; text: string; description: string }
> = {
  [CompanionState.IDLE]: {
    label: 'IDLE',
    icon: '😴',
    bg: 'bg-slate-100 border-slate-300',
    text: 'text-slate-700',
    description: 'Breathing gently & waiting for you to move or speak',
  },
  [CompanionState.LISTENING]: {
    label: 'LISTENING',
    icon: '👂',
    bg: 'bg-amber-100 border-amber-400',
    text: 'text-amber-800',
    description: 'Listening closely to your voice!',
  },
  [CompanionState.SPEAKING]: {
    label: 'SPEAKING',
    icon: '🗣️',
    bg: 'bg-indigo-100 border-indigo-400',
    text: 'text-indigo-800',
    description: 'Animate mouth and talking with you!',
  },
  [CompanionState.FOLLOWING]: {
    label: 'FOLLOWING',
    icon: '🕺',
    bg: 'bg-emerald-100 border-emerald-400',
    text: 'text-emerald-800',
    description: 'Mirroring your body, head, arms & hands!',
  },
  [CompanionState.EXCITED]: {
    label: 'EXCITED',
    icon: '🤩',
    bg: 'bg-pink-100 border-pink-400',
    text: 'text-pink-800',
    description: 'Jumping up and down with super excitement!',
  },
  [CompanionState.SURPRISED]: {
    label: 'SURPRISED',
    icon: '😲',
    bg: 'bg-purple-100 border-purple-400',
    text: 'text-purple-800',
    description: 'Eyes wide, mouth open in comic cartoon shock!',
  },
  [CompanionState.CELEBRATING]: {
    label: 'CELEBRATING',
    icon: '🎉',
    bg: 'bg-yellow-100 border-yellow-400',
    text: 'text-yellow-800',
    description: 'Cheering, waving and celebrating with you!',
  },
};

export const InteractiveCompanionHUD: React.FC<InteractiveCompanionHUDProps> = ({
  character,
  currentState,
  currentReaction,
  childTranscript,
  interimTranscript,
  characterReply,
  isListening,
  isMuted,
  onToggleMute,
  onToggleListening,
  audioLevel,
  speechSupported,
  onTriggerQuickAction,
  onTriggerReaction,
  activeEffect = 'chipmunk',
  onChangeEffect,
}) => {
  const activeStateInfo = STATE_CONFIG[currentState] || STATE_CONFIG[CompanionState.IDLE];

  return (
    <div id="interactive-companion-hud" className="w-full space-y-3">
      {/* 1. State Machine Status Ribbon */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border-2 border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Active State Badge */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border-2 ${activeStateInfo.bg}`}
          >
            {activeStateInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Companion State:
              </span>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full border ${activeStateInfo.bg} ${activeStateInfo.text}`}
              >
                {activeStateInfo.label}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 truncate max-w-xs sm:max-w-md">
              {activeStateInfo.description}
            </p>
          </div>
        </div>

        {/* State Machine Dots Flow */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {Object.entries(STATE_CONFIG).map(([stateKey, config]) => {
            const isActive = currentState === stateKey;
            return (
              <button
                key={stateKey}
                onClick={() => {
                  if (stateKey === CompanionState.EXCITED) onTriggerReaction('excited');
                  else if (stateKey === CompanionState.SURPRISED) onTriggerReaction('surprised');
                  else if (stateKey === CompanionState.CELEBRATING) onTriggerReaction('cheering');
                  else if (stateKey === CompanionState.IDLE) onTriggerReaction('none');
                }}
                title={config.description}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all border ${
                  isActive
                    ? `${config.bg} ${config.text} scale-105 shadow-xs font-black ring-2 ring-amber-400/50`
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span>{config.icon}</span>
                <span className="hidden sm:inline">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Real-Time Conversation & Speech Transcript Box */}
      <div className="bg-white rounded-2xl p-4 border-2 border-amber-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <MessageCircle className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-black text-slate-800">
              Interactive Cartoon Conversation
            </h3>
          </div>

          {/* Voice Controls */}
          <div className="flex items-center gap-2">
            {/* Audio level meter */}
            {isListening && !isMuted && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-xl border border-amber-200">
                <Activity className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <div className="w-16 h-2 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-amber-400 to-emerald-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.round(audioLevel * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Mic Toggle Button */}
            <button
              id="companion-mic-toggle-btn"
              onClick={onToggleListening}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs border ${
                isListening
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 animate-bounce" />
                  <span>Listening...</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Turn On Mic</span>
                </>
              )}
            </button>

            {/* Mute Button */}
            <button
              id="companion-mute-btn"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`p-1.5 rounded-xl text-xs transition-all border ${
                isMuted
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Conversation Transcript Feed */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
          {/* Child line */}
          <div className="flex items-start gap-2">
            <span className="font-black text-sky-600 bg-sky-100 px-2 py-0.5 rounded-md shrink-0">
              🎤 Child:
            </span>
            <div className="text-slate-800 font-semibold italic">
              {interimTranscript ? (
                <span className="text-slate-500 animate-pulse font-normal">
                  "{interimTranscript}..."
                </span>
              ) : childTranscript ? (
                <span>"{childTranscript}"</span>
              ) : isListening ? (
                <span className="text-slate-400 font-normal">
                  Speak into the mic or tap a reaction below...
                </span>
              ) : (
                <span className="text-slate-400 font-normal">
                  Click "Turn On Mic" or choose a prompt to chat!
                </span>
              )}
            </div>
          </div>

          {/* Character line */}
          <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
            <span className="font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
              🐻 {character.name}:
            </span>
            <div className="text-slate-800 font-bold">
              {characterReply ? (
                <span className="text-amber-900">{characterReply}</span>
              ) : (
                <span className="text-slate-400 font-normal">
                  Ready to copy your moves and talk back! 👋
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Child-Friendly Quick Interaction Prompts */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Quick Child Prompts (Tap to say & interact):
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onTriggerQuickAction('Hello!')}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <span>👋</span>
              <span>Say "Hello!"</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('Look how high I can jump!')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <span>🦘</span>
              <span>"Jump with me!"</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('Tell me a funny joke!')}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <span>😂</span>
              <span>"Tell me a joke!"</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('Dance party time!')}
              className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <span>💃</span>
              <span>"Dance party!"</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('Hooray, we did it!')}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <span>🎉</span>
              <span>"Cheer for me!"</span>
            </button>
            <button
              onClick={() => onTriggerQuickAction('Wow, look at that!')}
              className="px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <span>😲</span>
              <span>"Surprise!"</span>
            </button>
          </div>
        </div>

        {/* Fun Character Reactions (Excited, Laughing, Surprised, Cheering, Waving) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Fun Reactions:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onTriggerReaction('waving')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                currentReaction === 'waving'
                  ? 'bg-sky-500 text-white border-sky-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              👋 Wave
            </button>
            <button
              onClick={() => onTriggerReaction('excited')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                currentReaction === 'excited' || currentReaction === 'jumping'
                  ? 'bg-pink-500 text-white border-pink-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              🤩 Excited
            </button>
            <button
              onClick={() => onTriggerReaction('laughing')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                currentReaction === 'laughing'
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              😂 Laughing
            </button>
            <button
              onClick={() => onTriggerReaction('surprised')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                currentReaction === 'surprised'
                  ? 'bg-purple-500 text-white border-purple-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              😲 Surprised
            </button>
            <button
              onClick={() => onTriggerReaction('cheering')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                currentReaction === 'cheering'
                  ? 'bg-yellow-500 text-white border-yellow-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              🎉 Cheering
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
