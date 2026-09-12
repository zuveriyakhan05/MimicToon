import React from 'react';
import { X, Layers, Cpu, ShieldCheck, Box, Mic, Database, ArrowRight } from 'lucide-react';
import { Badge } from './Badge';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border-4 border-amber-300 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-800">MimicToon Architecture Blueprint</h2>
                <Badge variant="emerald" size="sm">Client-Side First</Badge>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Real-time AI Vision, Kinematic Rigging & Kid-Safe Audio Processing Pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-6 space-y-6 text-slate-700">
          {/* Visual Dataflow */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5">
            <h3 className="text-xs font-bold tracking-wider uppercase text-amber-800 mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> End-to-End Execution Pipeline (Zero Video Upload)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                <div className="text-xl mb-1">📹</div>
                <div className="font-bold text-slate-800">1. Video Ingestion</div>
                <div className="text-slate-500 mt-1">Local HTML5 Video stream, 30+ FPS, user-permission gated</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                <div className="text-xl mb-1">🧠</div>
                <div className="font-bold text-slate-800">2. MediaPipe Vision</div>
                <div className="text-slate-500 mt-1">WASM on-device pose & landmark detection in real time</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                <div className="text-xl mb-1">📐</div>
                <div className="font-bold text-slate-800">3. Kinematic Solver</div>
                <div className="text-slate-500 mt-1">Angle extraction, EMA lerp smoothing & gesture classification</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                <div className="text-xl mb-1">🧸</div>
                <div className="font-bold text-slate-800">4. Three.js 3D Avatar</div>
                <div className="text-slate-500 mt-1">Interactive rigged cartoon mesh mimicking movement & expressions</div>
              </div>
            </div>
          </div>

          {/* Module Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
                <Box className="w-5 h-5 text-blue-500" />
                <span>3D Graphics & Character Engine</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Powered by Three.js with modular articulated hierarchies. Character nodes (head, ears, torso, left/right arms, hands, feet) receive continuous orientation updates calculated from normalized vector landmarks.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
                <Mic className="w-5 h-5 text-rose-500" />
                <span>Voice & Speech DSP Architecture</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Browser Web Audio API graph connects microphone input to a biquad shaping filter, pitch modulation delay, and real-time RMS analyzer to drive character mouth movement and cartoon sound effects.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>Child Safety & Privacy Standard</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Adheres strictly to COPPA/GDPR-K principles: Webcam frames and audio data are never streamed to remote cloud servers or saved to remote databases. All AI inferences happen in browser memory.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
                <Database className="w-5 h-5 text-purple-500" />
                <span>Database & Authentication Tier</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Designed for seamless Supabase synchronization for player profiles, unlockable stickers, star tallies, and progress streaks while preserving an immediate guest mode for instant zero-friction play.
              </p>
            </div>
          </div>

          {/* Planned Roadmap & Scalability */}
          <div className="bg-slate-100/90 rounded-2xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">
              Next-Step Extensibility Roadmap
            </h4>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-medium">VRM/GLTF Model Loader</span>
              <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-medium">MediaPipe Face Mesh Blendshapes</span>
              <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-medium">Multiplayer Mirror Dance Off</span>
              <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-medium">Custom Voice Cloning / TTS</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-md"
          >
            Got it! Let&apos;s Play
          </button>
        </div>
      </div>
    </div>
  );
};
