import React from 'react';
import { ShieldCheck, Heart, Sparkles, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-amber-200/80 mt-auto py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Kid Safety & Privacy */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">100% Private & Kid-Safe</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                On-Device AI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Webcam video & microphone streams stay inside your browser. No video is ever stored or uploaded.
            </p>
          </div>
        </div>

        {/* Center: Tech tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-500">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">MediaPipe Vision</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">Three.js 3D</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">Web Audio DSP</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">Web Speech API</span>
        </div>

        {/* Right: Made with love */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
          <span>Crafted for playful learners with</span>
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>MimicToon AI</span>
        </div>
      </div>
    </footer>
  );
};
