import React from 'react';
import { ShieldCheck, Heart, Sparkles, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-[#E6DED3] mt-auto py-7 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Kid Safety & Privacy */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF7F0] border border-[#BFE3CD] text-[#2D8A56] flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#23201D]">100% Private & Kid-Safe</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EBF7F0] text-[#226D43] border border-[#BFE3CD]">
                On-Device AI
              </span>
            </div>
            <p className="text-xs text-[#6C655E] font-medium mt-0.5">
              Webcam video & microphone streams stay inside your browser. No video is ever stored or uploaded.
            </p>
          </div>
        </div>

        {/* Center: Tech tags */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-[#6C655E]">
          <span className="px-2.5 py-1 rounded-md bg-[#F8F4EC] border border-[#E6DED3]">MediaPipe Vision</span>
          <span className="px-2.5 py-1 rounded-md bg-[#F8F4EC] border border-[#E6DED3]">Three.js 3D</span>
          <span className="px-2.5 py-1 rounded-md bg-[#F8F4EC] border border-[#E6DED3]">Web Audio DSP</span>
          <span className="px-2.5 py-1 rounded-md bg-[#F8F4EC] border border-[#E6DED3]">Web Speech API</span>
        </div>

        {/* Right: Made with love */}
        <div className="flex items-center gap-1.5 text-xs text-[#6C655E] font-bold">
          <span>Crafted for playful learners with</span>
          <Heart className="w-3.5 h-3.5 text-[#E76F51] fill-[#E76F51]" />
          <span className="text-[#23201D]">MimicToon AI</span>
        </div>
      </div>
    </footer>
  );
};
