import React from 'react';
import { Sparkles, Check, Play } from 'lucide-react';
import { CHARACTERS } from '../../data/characters';
import { CharacterProfile } from '../../types';
import { Badge } from '../common/Badge';

interface CharacterShowcaseProps {
  activeCharacter: CharacterProfile;
  onSelectCharacter: (char: CharacterProfile) => void;
  onStartExperience: () => void;
}

export const CharacterShowcase: React.FC<CharacterShowcaseProps> = ({
  activeCharacter,
  onSelectCharacter,
  onStartExperience,
}) => {
  return (
    <section id="characters" className="py-16 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="purple" size="md">Meet the Cast</Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            Choose Your Cartoon Buddy
          </h2>
          <p className="text-slate-600 font-medium text-base">
            Each character has their own personality, vocal pitch profile, and favorite signature dance moves.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CHARACTERS.map((char) => {
            const isSelected = activeCharacter.id === char.id;
            return (
              <div
                key={char.id}
                onClick={() => onSelectCharacter(char)}
                className={`group relative rounded-3xl p-6 border-3 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/70 shadow-xl scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-md'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-amber-500 text-white rounded-full p-1 shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                <div>
                  {/* Character Avatar Icon */}
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-slate-100 border-2 border-slate-200/80 flex items-center justify-center text-5xl mb-4 group-hover:scale-110 transition-transform shadow-xs">
                    {char.avatarStyle === 'robo_pup' && '🐶'}
                    {char.avatarStyle === 'space_cat' && '🐱'}
                    {char.avatarStyle === 'bouncy_bear' && '🐻'}
                    {char.avatarStyle === 'baby_dragon' && '🐲'}
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black text-slate-800">{char.name}</h3>
                    <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      {char.species}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 font-medium leading-relaxed">
                    {char.bio}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                    <span>Signature Pose:</span>
                    <span className="text-amber-700 font-extrabold">{char.favoritePose}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCharacter(char);
                      onStartExperience();
                    }}
                    className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isSelected ? 'Play with ' + char.name.split(' ')[0] : 'Choose & Play'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
