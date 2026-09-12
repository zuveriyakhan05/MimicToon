import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap, Cpu, Clock, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PerformanceMetrics } from '../../types';

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  className?: string;
  isCompact?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  metrics,
  className = '',
  isCompact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const fps = Math.round(metrics.fps);
  const latency = Math.round(metrics.trackingLatencyMs);
  const inference = Math.round(metrics.inferenceTimeMs);
  const poseTime = metrics.poseTimeMs ? Math.round(metrics.poseTimeMs) : null;
  const faceTime = metrics.faceTimeMs ? Math.round(metrics.faceTimeMs) : null;
  const handTime = metrics.handTimeMs ? Math.round(metrics.handTimeMs) : null;

  // Visual status color
  const statusColor =
    fps >= 48
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      : fps >= 28
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      : 'bg-rose-500/20 text-rose-400 border-rose-500/40';

  const dotColor = fps >= 48 ? 'bg-emerald-400' : fps >= 28 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className={`relative z-30 font-mono select-none ${className}`}>
      {/* Pill Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border backdrop-blur-md transition shadow-sm text-[11px] font-bold ${statusColor}`}
        title="Click to view real-time latency and inference breakdown"
      >
        <span className={`w-2 h-2 rounded-full animate-pulse ${dotColor}`} />
        <span className="font-black tracking-tight">{fps} FPS</span>
        <span className="text-white/40">|</span>
        <span className="flex items-center gap-1 text-slate-300">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{latency}ms</span>
        </span>
        <span className="text-white/40">|</span>
        <span className="flex items-center gap-1 text-slate-300">
          <Zap className="w-3 h-3 text-sky-400" />
          <span>{inference}ms AI</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-white/60 ml-0.5" />
        ) : (
          <ChevronDown className="w-3 h-3 text-white/60 ml-0.5" />
        )}
      </button>

      {/* Expanded Metrics Details Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-64 p-3 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-lg text-slate-200 text-xs space-y-2.5"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-sans font-black text-white text-[12px]">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Performance Inspector</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                  metrics.qualityTier === 'optimal'
                    ? 'bg-emerald-500/30 text-emerald-300'
                    : metrics.qualityTier === 'good'
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'bg-rose-500/30 text-rose-300'
                }`}
              >
                {metrics.qualityTier}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Frame Rate:</span>
                <span className="font-bold text-white">{fps} FPS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tracking Latency:</span>
                <span className="font-bold text-amber-300">{latency} ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Inference:</span>
                <span className="font-bold text-sky-300">{inference} ms</span>
              </div>

              {/* Breakdown */}
              <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>• Pose Landmarker:</span>
                  <span className="text-slate-300 font-mono">{poseTime !== null ? `${poseTime} ms` : 'Active'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• Face Landmarker:</span>
                  <span className="text-slate-300 font-mono">{faceTime !== null ? `${faceTime} ms` : '15-30 Hz'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• Hand Landmarker:</span>
                  <span className="text-slate-300 font-mono">{handTime !== null ? `${handTime} ms` : '15-30 Hz'}</span>
                </div>
              </div>

              {/* Optimizations Active */}
              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5 font-sans">
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Interleaved AI inference</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Hardware GPU delegate active</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Shared WASM fileset</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
