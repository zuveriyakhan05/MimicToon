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

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleCardClick}
        className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between gap-3 ${
          isSelected
            ? 'bg-[#FDF0EB] border-[#E76F51] shadow-2xs'
            : 'bg-white hover:bg-[#F8F4EC] border-[#E6DED3]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-2xs shrink-0 border border-[#E6DED3]"
            style={{ backgroundColor: `${character.primaryColor}15` }}
          >
            {character.icon || '🐾'}
          </span>
          <div className="truncate">
            <h4 className="text-sm font-black text-[#23201D] truncate">{character.name}</h4>
            <span className="text-[10px] font-bold text-[#6C655E] uppercase tracking-wider block">
              {character.species}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleVoiceAudition}
            className="p-1.5 rounded-lg bg-[#F8F4EC] hover:bg-[#FDF0EB] text-[#6C655E] hover:text-[#E76F51] transition cursor-pointer"
            title="Hear Voice"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isPlayingVoice ? 'animate-bounce text-[#E76F51]' : ''}`} />
          </button>
          {isSelected && (
            <span className="w-5 h-5 rounded-full bg-[#E76F51] text-white flex items-center justify-center shadow-2xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleCardClick}
      className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden flex flex-col justify-between ${
        isSelected
          ? 'bg-[#FDF0EB] border-2 border-[#E76F51] shadow-product ring-2 ring-[#F7CEC3]'
          : 'bg-white hover:bg-[#FAF6EE] border-[#E6DED3] hover:border-[#D6CBC0] shadow-product'
      }`}
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span
              className="w-13 h-13 rounded-xl flex items-center justify-center text-3xl shadow-2xs border border-[#E6DED3] shrink-0"
              style={{
                backgroundColor: `${character.primaryColor}15`,
              }}
            >
              {character.icon || '🐾'}
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F8F4EC] text-[#23201D] border border-[#E6DED3] inline-block">
                {character.species}
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#23201D] mt-1 leading-tight">
                {character.name}
              </h3>
            </div>
          </div>

          {/* Selection Badge */}
          {isSelected ? (
            <span className="w-7 h-7 rounded-full bg-[#E76F51] text-white flex items-center justify-center shadow-tactile-coral shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          ) : (
            isActive && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#F8F4EC] text-[#6C655E] border border-[#E6DED3] shrink-0">
                Active
              </span>
            )
          )}
        </div>

        {/* Tagline */}
        <p className="text-xs font-medium text-[#6C655E] leading-relaxed mb-3">
          {character.tagline}
        </p>

        {showDetails && (
          <div className="space-y-2.5 my-3 pt-3 border-t border-[#E6DED3]">
            {/* Personality Traits */}
            {character.personality && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#988F85] mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#E76F51]" />
                  <span>Traits:</span>
                </span>
                {character.personality.traits.map((trait, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#E6DED3] text-[#23201D] shadow-2xs"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}

            {/* Idle Animation Badge */}
            {character.idleAnimation && (
              <div className="p-2 rounded-xl bg-white border border-[#E6DED3] flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[10px] font-black text-[#988F85] uppercase tracking-wider">
                    <Activity className="w-3 h-3 text-[#E76F51]" />
                    <span>Idle Move:</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#23201D] truncate block">
                    {character.idleAnimation.name}
                  </span>
                </div>
                {onPreviewIdle && (
                  <button
                    type="button"
                    onClick={handlePreviewIdleClick}
                    className="px-2 py-1 rounded-md bg-[#F8F4EC] hover:bg-[#F4EFE6] text-[#23201D] text-[10px] font-black border border-[#E6DED3] transition shrink-0 cursor-pointer"
                    title="Preview this idle motion"
                  >
                    Preview Idle
                  </button>
                )}
              </div>
            )}

            {/* Voice Style & Model Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#23201D]">
                <span className="w-2 h-2 rounded-full bg-[#E76F51]" />
                <span>Voice: {character.voiceStyle?.styleName || `${character.voicePitch}x`}</span>
              </div>

              {character.modelType === 'glb' || character.modelUrl ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FEF7E8] text-[#916212] border border-[#FBE2A8] flex items-center gap-1">
                  <Box className="w-3 h-3 text-[#D49826]" />
                  <span>GLB Ready</span>
                </span>
              ) : (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#EBF7F0] text-[#226D43] border border-[#BFE3CD] flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#2D8A56]" />
                  <span>Cartoon 3D Rig</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="mt-3 pt-3 border-t border-[#E6DED3] flex items-center justify-between gap-2">
        {/* Voice Audition Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleVoiceAudition}
          className="px-3 py-1.5 rounded-lg bg-[#F8F4EC] hover:bg-[#F4EFE6] text-[#23201D] text-xs font-extrabold border border-[#E6DED3] flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
          title="Audition voice lines"
        >
          <Volume2 className={`w-3.5 h-3.5 ${isPlayingVoice ? 'animate-bounce text-[#E76F51]' : 'text-[#6C655E]'}`} />
          <span>{isPlayingVoice ? 'Speaking...' : 'Hear Voice'}</span>
        </motion.button>

        {/* Selection Confirmation Button */}
        <span
          className={`text-xs font-black px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs ${
            isSelected
              ? 'bg-[#E76F51] text-white shadow-tactile-coral'
              : 'bg-white hover:bg-[#F8F4EC] text-[#23201D] border border-[#E6DED3]'
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
