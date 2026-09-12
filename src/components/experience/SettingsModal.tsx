import React from 'react';
import { X, Sliders, Moon, Sun, Volume2, Video, Sparkles, Check } from 'lucide-react';
import { StudioSettings } from '../../types';
import { playSoundEffect } from '../../utils/audioEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudioSettings;
  onUpdateSettings: (newSettings: Partial<StudioSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-amber-300 p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Experience Settings</h2>
              <p className="text-xs text-slate-500 font-medium">
                Customize camera mirroring, 3D theme, and audio effects
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

        {/* Settings Body */}
        <div className="space-y-4 text-sm">
          {/* 3D Stage Environment Theme */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              3D Stage Environment
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['playground', 'forest', 'cosmic', 'toyroom'] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => {
                    onUpdateSettings({ themeEnvironment: env });
                    playSoundEffect('pop');
                  }}
                  className={`p-2.5 rounded-2xl border-2 text-center text-xs font-black capitalize transition flex flex-col items-center gap-1 ${
                    settings.themeEnvironment === env
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">
                    {env === 'playground' && '🎪'}
                    {env === 'forest' && '🌲'}
                    {env === 'cosmic' && '🪐'}
                    {env === 'toyroom' && '🧸'}
                  </span>
                  <span className="text-[11px] truncate w-full">{env}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Camera Toggles */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Mirror Camera View</span>
                <span className="text-xs text-slate-500">Flips video horizontally like a true mirror</span>
              </div>
              <input
                type="checkbox"
                checked={settings.mirrorCamera}
                onChange={(e) => onUpdateSettings({ mirrorCamera: e.target.checked })}
                className="w-5 h-5 rounded-md accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Skeleton Landmark Overlay</span>
                <span className="text-xs text-slate-500">Displays AI joint tracking bones over webcam</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showSkeletonOverlay}
                onChange={(e) => onUpdateSettings({ showSkeletonOverlay: e.target.checked })}
                className="w-5 h-5 rounded-md accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Playful Sound Effects</span>
                <span className="text-xs text-slate-500">Audio fanfares, pops, and cheer feedback</span>
              </div>
              <input
                type="checkbox"
                checked={settings.audioFeedback}
                onChange={(e) => onUpdateSettings({ audioFeedback: e.target.checked })}
                className="w-5 h-5 rounded-md accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Smoothing Factor */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Motion Smoothing</span>
              <span className="text-xs font-black text-amber-700">
                {Math.round((settings.smoothingFactor ?? 0.25) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.75"
              step="0.05"
              value={settings.smoothingFactor ?? 0.25}
              onChange={(e) => onUpdateSettings({ smoothingFactor: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Snappy (Direct)</span>
              <span>Silky Cartoon</span>
            </div>
          </div>

          {/* Movement Sensitivity */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Movement Sensitivity</span>
                <span className="text-xs text-slate-500">Amplifies child's motions for playful response</span>
              </div>
              <span className="text-xs font-black text-amber-700">
                {(settings.movementSensitivity ?? 1.0).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.8"
              step="0.1"
              value={settings.movementSensitivity ?? 1.0}
              onChange={(e) => onUpdateSettings({ movementSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Gentle (0.6x)</span>
              <span>Normal (1.0x)</span>
              <span>High Energy (1.8x)</span>
            </div>
          </div>

          {/* AI Landmark Confidence Threshold */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">AI Tracking Confidence Cutoff</span>
                <span className="text-xs text-slate-500">Ignores low-confidence obscured body joints</span>
              </div>
              <span className="text-xs font-black text-amber-700">
                {Math.round((settings.confidenceThreshold ?? 0.45) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.25"
              max="0.75"
              step="0.05"
              value={settings.confidenceThreshold ?? 0.45}
              onChange={(e) => onUpdateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Permissive (25%)</span>
              <span>Balanced (45%)</span>
              <span>Strict (75%)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
