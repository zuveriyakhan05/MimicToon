import React from 'react';
import { Play, Sparkles, Video, Mic, ShieldCheck, Activity, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';
import { CharacterProfile } from '../../types';

interface HeroSectionProps {
  onStartExperience: () => void;
  onExploreCharacters: () => void;
  activeCharacter: CharacterProfile;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartExperience,
  onExploreCharacters,
  activeCharacter,
}) => {
  return (
    <section className="relative overflow-hidden pt-10 pb-16 px-4 sm:px-8">
      {/* Background playful blobs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-amber-200/30 via-rose-200/30 to-blue-200/30 blur-3xl -z-10 rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Headings & CTA */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2">
            <Badge variant="amber" size="md" icon={<Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />}>
              Next-Gen Child AI Playground
            </Badge>
            <Badge variant="emerald" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}>
              100% On-Device AI
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
            Move your body. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
              Watch your cartoon mirror move with you!
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Stand in front of your webcam, wave your hands, jump, make funny faces, and speak! Your 3D cartoon avatar detects your movements in real time and mimics you with playful cartoon voices.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            <button
              onClick={onStartExperience}
              className="w-full sm:w-auto px-8 py-4 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-lg font-black shadow-xl shadow-amber-400/40 flex items-center justify-center gap-3 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-white" />
              </div>
              <span>Start Experience Now</span>
            </button>

            <button
              onClick={onExploreCharacters}
              className="w-full sm:w-auto px-6 py-4 rounded-3xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-base font-bold border-2 border-slate-200/80 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Meet the Characters</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Feature quick checkmarks */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm font-bold text-slate-600 max-w-lg mx-auto lg:mx-0">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-amber-100 text-amber-600 shrink-0">
                <Video className="w-3.5 h-3.5" />
              </div>
              <span>Pose & Hand Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <span>Cartoon Voice Changers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span>Pose Challenge Games</span>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Visual Showcase */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-5 border-4 border-amber-300 shadow-2xl shadow-amber-200/50">
            {/* Top Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-100 text-xs font-black text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-700">Live 3D Character Preview</span>
              </div>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {activeCharacter.species}
              </span>
            </div>

            {/* Character Stage Teaser */}
            <div className="relative my-4 aspect-4/3 rounded-2xl bg-gradient-to-b from-sky-100 via-amber-50 to-amber-100 flex flex-col items-center justify-center p-6 text-center overflow-hidden border border-amber-200">
              <div className="text-7xl mb-3 animate-float select-none">
                {activeCharacter.avatarStyle === 'robo_pup' && '🤖🐶'}
                {activeCharacter.avatarStyle === 'space_cat' && '🐱🚀'}
                {activeCharacter.avatarStyle === 'bouncy_bear' && '🐻🍯'}
                {activeCharacter.avatarStyle === 'baby_dragon' && '🐲✨'}
              </div>

              <div className="font-display font-black text-xl text-slate-800">
                {activeCharacter.name}
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1 max-w-xs">
                &ldquo;{activeCharacter.tagline}&rdquo;
              </p>

              {/* Floating motion markers */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-extrabold text-slate-700 border border-amber-200 shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Wave to say Hi!</span>
              </div>

              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-extrabold text-slate-700 border border-amber-200 shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Head tilt ready</span>
              </div>
            </div>

            {/* Quick interactive action */}
            <div className="pt-2">
              <button
                onClick={onStartExperience}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Step into the Mirror (Launch Studio)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
