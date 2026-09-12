import React from 'react';
import { X, Check, Sparkles, Smile } from 'lucide-react';
import { CHARACTERS } from '../../data/characters';
import { CharacterProfile } from '../../types';
import { playSoundEffect } from '../../utils/audioEffects';

interface CharacterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  activeCharacter: CharacterProfile;
  onSelectCharacter: (char: CharacterProfile) => void;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  isOpen,
  onClose,
  activeCharacter,
  onSelectCharacter,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-300 p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl">
              <Smile className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Pick Your Cartoon Buddy</h2>
              <p className="text-xs text-slate-500 font-medium">
                Change who mirrors your dances and speaks with your cartoon voice!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Character Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CHARACTERS.map((char) => {
            const isSelected = activeCharacter.id === char.id;
            return (
              <div
                key={char.id}
                onClick={() => {
                  onSelectCharacter(char);
                  playSoundEffect('star');
                  onClose();
                }}
                className={`p-4 rounded-2xl border-3 cursor-pointer transition flex items-start gap-3.5 relative ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/80 shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl shrink-0">
                  {char.avatarStyle === 'robo_pup' && '🐶'}
                  {char.avatarStyle === 'space_cat' && '🐱'}
                  {char.avatarStyle === 'bouncy_bear' && '🐻'}
                  {char.avatarStyle === 'baby_dragon' && '🐲'}
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 text-base">{char.name}</h3>
                  <div className="text-[11px] font-bold text-amber-700 uppercase">
                    {char.species}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 font-medium">
                    {char.tagline}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
