import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Sparkles, MessageCircle } from 'lucide-react';
import { CartoonVoiceProcessor, VADStatus } from '../../utils/CartoonVoiceProcessor';
import { CharacterProfile } from '../../types';

interface VoiceVisualizerProps {
  processor: CartoonVoiceProcessor | null;
  isActive: boolean;
  isMuted: boolean;
  vadStatus: VADStatus;
  audioLevel: number;
  character: CharacterProfile;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  processor,
  isActive,
  isMuted,
  vadStatus,
  audioLevel,
  character,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 64;
    const freqData = new Uint8Array(bufferLength);
    const waveData = new Uint8Array(128);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (!isActive || isMuted || !processor) {
        // Idle flat peaceful line
        ctx.beginPath();
        ctx.moveTo(10, height / 2);
        ctx.lineTo(width - 10, height / 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#cbd5e1';
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        animIdRef.current = requestAnimationFrame(render);
        return;
      }

      // Collect real-time audio data
      processor.getFrequencyData(freqData);
      processor.getWaveformData(waveData);

      // 1. Draw Bouncing Cartoon Frequency Bars
      const barCount = 24;
      const barWidth = (width - (barCount + 1) * 3) / barCount;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * (bufferLength / 2));
        const val = freqData[dataIdx] / 255;
        // Apply minimum bounce for cartoon vibrancy
        const barHeight = Math.max(6, val * (height * 0.78) + Math.sin(Date.now() * 0.005 + i) * 3);
        const x = 3 + i * (barWidth + 3);
        const y = centerY - barHeight / 2;

        // Cartoon rainbow gradient based on bar position and character theme
        const barGrad = ctx.createLinearGradient(x, y, x, y + barHeight);
        if (vadStatus === 'speaking') {
          barGrad.addColorStop(0, '#f43f5e'); // Rose
          barGrad.addColorStop(0.5, '#fbbf24'); // Amber
          barGrad.addColorStop(1, '#10b981'); // Emerald
        } else if (vadStatus === 'responding') {
          barGrad.addColorStop(0, character.primaryColor || '#3b82f6');
          barGrad.addColorStop(1, character.accentColor || '#8b5cf6');
        } else {
          barGrad.addColorStop(0, '#38bdf8'); // Sky
          barGrad.addColorStop(1, '#818cf8'); // Indigo
        }

        ctx.fillStyle = barGrad;
        // Rounded bar ends
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }

      // 2. Overlay Smooth Continuous Waveform Line
      ctx.beginPath();
      const sliceWidth = width / waveData.length;
      let waveX = 0;

      for (let i = 0; i < waveData.length; i++) {
        const v = waveData[i] / 128.0;
        const waveY = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(waveX, waveY);
        } else {
          ctx.lineTo(waveX, waveY);
        }
        waveX += sliceWidth;
      }

      ctx.lineWidth = 2.5;
      ctx.strokeStyle =
        vadStatus === 'speaking'
          ? 'rgba(244, 63, 94, 0.85)'
          : vadStatus === 'responding'
          ? 'rgba(124, 58, 237, 0.85)'
          : 'rgba(59, 130, 246, 0.7)';
      ctx.stroke();

      animIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
    };
  }, [processor, isActive, isMuted, vadStatus, character]);

  // Status Chip Badge Config
  const getStatusBadge = () => {
    if (!isActive) {
      return {
        icon: <MicOff className="w-3.5 h-3.5" />,
        text: 'Microphone Inactive',
        bg: 'bg-slate-100 text-slate-600 border-slate-300',
      };
    }
    if (isMuted) {
      return {
        icon: <MicOff className="w-3.5 h-3.5 text-rose-500" />,
        text: 'Microphone Muted',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }
    if (vadStatus === 'speaking') {
      return {
        icon: <Volume2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />,
        text: 'Child Speaking! 🗣️',
        bg: 'bg-rose-100 text-rose-900 border-rose-300 animate-bounce',
      };
    }
    if (vadStatus === 'responding') {
      return {
        icon: <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />,
        text: `${character.name.split(' ')[0]} Speaking! 🐻`,
        bg: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
      };
    }
    return {
      icon: <Mic className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />,
      text: '🎤 Listening...',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    };
  };

  const badge = getStatusBadge();

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200/80 bg-white shadow-xs">
      {/* Top Status HUD */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border transition-all ${badge.bg}`}
        >
          {badge.icon}
          <span>{badge.text}</span>
        </span>

        {/* Level Percentage Indicator */}
        {isActive && !isMuted && (
          <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200">
            Voice: {Math.round(audioLevel * 100)}%
          </span>
        )}
      </div>

      {/* 60FPS Canvas */}
      <canvas
        ref={canvasRef}
        width={360}
        height={72}
        className="w-full h-[72px] block"
      />
    </div>
  );
};
