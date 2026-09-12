import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Volume2,
  Check,
  Star,
  Zap,
  Activity,
  Box,
  Layers,
} from 'lucide-react';
import { CharacterProfile } from '../../types';
import { playSoundEffect } from '../../utils/audioEffects';

export interface CharacterCardProps {
  character: CharacterProfile;
  isSelected: boolean;
  isActive?: boolean;
  onSelect: (character: CharacterProfile) => void;
  onPlayVoice?: (character: CharacterProfile) => void;
  onPreviewIdle?: (character: CharacterProfile) => void;
  compact?: boolean;
  showDetails?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected,
  isActive = false,
  onSelect,
  onPlayVoice,
  onPreviewIdle,
  compact = false,
  showDetails = true,
}) => {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const handleVoiceAudition = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSoundEffect('pop');

    if (onPlayVoice) {
      onPlayVoice(character);
      return;
    }

    // Default built-in cartoon voice synthesizer audition
    if ('speechSynthesis' in window) {
      setIsPlayingVoice(true);
      window.speechSynthesis.cancel();

      const text =
        character.voiceStyle?.greeting ||
        `Hi! I'm ${character.name}! Let's play and mimic together!`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = character.voiceStyle?.pitch ?? character.voicePitch ?? 1.4;
      utterance.rate = character.voiceStyle?.rate ?? 1.05;

      utterance.onend = () => setIsPlayingVoice(false);
      utterance.onerror = () => setIsPlayingVoice(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingVoice(true);
      setTimeout(() => setIsPlayingVoice(false), 1200);
    }
  };

  const handlePreviewIdleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSoundEffect('star');
    if (onPreviewIdle) {
      onPreviewIdle(character);
    }
  };

  const handleCardClick = () => {
    playSoundEffect('click');
    onSelect(character);
  };

  const theme = character.theme || {
    primary: character.primaryColor,
    secondary: character.secondaryColor,
    accent: character.accentColor,
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    cardGradient: 'from-amber-50 to-orange-50/80 border-amber-300',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCardClick}
        className={`cursor-pointer rounded-2xl p-3 border-2 transition-all flex items-center justify-between gap-3 ${
          isSelected
            ? `bg-gradient-to-r ${theme.cardGradient} border-amber-400 shadow-md`
            : 'bg-white hover:bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs shrink-0"
            style={{ backgroundColor: `${theme.primary}20` }}
          >
            {character.icon || '🐾'}
          </span>
          <div className="truncate">
            <h4 className="text-sm font-black text-slate-900 truncate">{character.name}</h4>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {character.species}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleVoiceAudition}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 transition"
            title="Hear Voice"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isPlayingVoice ? 'animate-bounce text-amber-600' : ''}`} />
          </button>
          {isSelected && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      onClick={handleCardClick}
      className={`cursor-pointer rounded-3xl p-5 border-3 transition-all relative overflow-hidden flex flex-col justify-between ${
        isSelected
          ? `bg-gradient-to-br ${theme.cardGradient} border-amber-400 shadow-xl shadow-amber-400/20 ring-3 ring-amber-300/40`
          : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-sm'
      }`}
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/60 shrink-0"
              style={{
                backgroundColor: `${theme.primary}18`,
                boxShadow: `0 4px 14px ${theme.primary}25`,
              }}
            >
              {character.icon || '🐾'}
            </span>
            <div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}
              >
                {character.species}
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1 leading-tight">
                {character.name}
              </h3>
            </div>
          </div>

          {/* Selection Badge */}
          {isSelected ? (
            <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-400/40 shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </span>
          ) : (
            isActive && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                Active
              </span>
            )
          )}
        </div>

        {/* Tagline */}
        <p className="text-xs font-bold text-slate-600 leading-relaxed mb-3">
          {character.tagline}
        </p>

        {showDetails && (
          <div className="space-y-2.5 my-3 pt-3 border-t border-slate-100">
            {/* Personality Traits */}
            {character.personality && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Traits:</span>
                </span>
                {character.personality.traits.map((trait, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}

            {/* Idle Animation Badge */}
            {character.idleAnimation && (
              <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <Activity className="w-3 h-3 text-indigo-500" />
                    <span>Idle Move:</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 truncate block">
                    {character.idleAnimation.name}
                  </span>
                </div>
                {onPreviewIdle && (
                  <button
                    type="button"
                    onClick={handlePreviewIdleClick}
                    className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black transition shrink-0"
                    title="Preview this idle motion"
                  >
                    Preview Idle
                  </button>
                )}
              </div>
            )}

            {/* Voice Style & Model Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                <span>Voice: {character.voiceStyle?.styleName || `${character.voicePitch}x`}</span>
              </div>

              {character.modelType === 'glb' || character.modelUrl ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                  <Box className="w-3 h-3 text-sky-500" />
                  <span>GLB Ready</span>
                </span>
              ) : (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-500" />
                  <span>Cartoon 3D Rig</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
        {/* Voice Audition Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={handleVoiceAudition}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-black flex items-center gap-1.5 transition shadow-2xs"
          title="Audition voice lines"
        >
          <Volume2 className={`w-3.5 h-3.5 ${isPlayingVoice ? 'animate-bounce text-amber-600' : 'text-slate-500'}`} />
          <span>{isPlayingVoice ? 'Speaking...' : 'Hear Voice'}</span>
        </motion.button>

        {/* Selection Confirmation Button */}
        <span
          className={`text-xs font-black px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
            isSelected
              ? 'bg-amber-500 text-white shadow-amber-400/30'
              : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Selected ✨</span>
            </>
          ) : (
            <span>Choose Buddy 🐾</span>
          )}
        </span>
      </div>
    </motion.div>
  );
};
