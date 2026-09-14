import React from 'react';
import { motion } from 'motion/react';
import {
  Sliders,
  Camera,
  Mic,
  Palette,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  Volume2,
  VolumeX,
  Eye,
  Sparkles,
} from 'lucide-react';
import { StudioSettings, VoiceEffect, AppPage } from '../../types';
import { playSoundEffect } from '../../utils/audioEffects';

interface SettingsPageProps {
  settings: StudioSettings;
  onUpdateSettings: (settings: Partial<StudioSettings>) => void;
  onNavigate: (page: AppPage) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onNavigate,
}) => {
  const voiceEffects: { id: VoiceEffect; label: string; icon: string }[] = [
    { id: 'chipmunk', label: 'Chipmunk (High)', icon: '🐿️' },
    { id: 'robot', label: 'Robot (Electronic)', icon: '🤖' },
    { id: 'baby', label: 'Baby Toon (Cute)', icon: '🐣' },
    { id: 'echo', label: 'Echo Chamber', icon: '📢' },
    { id: 'normal', label: 'Natural Voice', icon: '✨' },
  ];

  const themeEnvironments = [
    { id: 'playground', name: 'Sunny Playground', icon: '🎪', desc: 'Bright outdoor fun' },
    { id: 'forest', name: 'Magic Forest', icon: '🌲', desc: 'Sparkling fairy woodland' },
    { id: 'cosmic', name: 'Cosmic Galaxy', icon: '🚀', desc: 'Starry purple space' },
    { id: 'toyroom', name: 'Toy Room', icon: '🧸', desc: 'Cozy playroom' },
  ];

  const handleResetDefaults = () => {
    playSoundEffect('pop');
    onUpdateSettings({
      mirrorCamera: true,
      showSkeletonOverlay: true,
      smoothingFactor: 0.25,
      movementSensitivity: 1.0,
      confidenceThreshold: 0.45,
      activeVoiceEffect: 'chipmunk',
      micSensitivity: 1.0,
      themeEnvironment: 'playground',
      speechRecognitionEnabled: true,
      audioFeedback: true,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('experience')}
            className="p-3 rounded-2xl bg-white border border-[#E6DED3] text-[#23201D] hover:bg-[#F8F4EC] transition shadow-product flex items-center gap-2 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Studio</span>
          </motion.button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#23201D] font-display tracking-tight flex items-center gap-2.5">
              <span>Mimic Studio Settings</span>
              <span className="text-2xl">⚙️</span>
            </h1>
            <p className="text-sm font-medium text-[#6C655E] mt-0.5">
              Customize your camera, cartoon voice, audio chimes, and magic themes!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-2xl bg-white border border-[#E6DED3] text-[#6C655E] hover:text-[#23201D] hover:bg-[#F8F4EC] text-xs font-black transition flex items-center gap-1.5 shadow-product"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Card 1: Camera & Motion Tracking */}
        <div className="p-6 rounded-3xl bg-white border border-[#E6DED3] shadow-product space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E6DED3]/60">
            <div className="w-10 h-10 rounded-2xl bg-[#FDF0EB] text-[#E76F51] border border-[#F7CEC3] flex items-center justify-center shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#23201D] font-display">Camera & Motion Vision</h3>
              <p className="text-xs font-medium text-[#6C655E]">Live AI tracking adjustments</p>
            </div>
          </div>

          {/* Mirror Camera */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-[#23201D]">Mirror Camera View</div>
              <p className="text-xs font-medium text-[#6C655E]">
                Flips the camera like a real mirror for easy mimicking
              </p>
            </div>
            <button
              onClick={() => onUpdateSettings({ mirrorCamera: !settings.mirrorCamera })}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${
                settings.mirrorCamera ? 'bg-[#E76F51]' : 'bg-[#E6DED3]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.mirrorCamera ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Skeleton Overlay */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-[#23201D]">Show Skeleton Tracking Overlay</div>
              <p className="text-xs font-medium text-[#6C655E]">
                Draws colorful joints and bone connections on camera
              </p>
            </div>
            <button
              onClick={() => onUpdateSettings({ showSkeletonOverlay: !settings.showSkeletonOverlay })}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${
                settings.showSkeletonOverlay ? 'bg-[#2D8A56]' : 'bg-[#E6DED3]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.showSkeletonOverlay ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Smoothing Factor Slider */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-black text-[#23201D]">
              <span>Cartoon Smoothing: {Math.round((1 - settings.smoothingFactor) * 100)}%</span>
              <span className="text-[#988F85] font-medium">Higher = Silkier Motion</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.05"
              value={settings.smoothingFactor}
              onChange={(e) => onUpdateSettings({ smoothingFactor: parseFloat(e.target.value) })}
              className="w-full accent-[#E76F51] h-2 bg-[#F4EFE6] rounded-lg cursor-pointer"
            />
          </div>

          {/* Movement Sensitivity Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-black text-[#23201D]">
              <span>Motion Sensitivity: {Math.round(settings.movementSensitivity * 100)}%</span>
              <span className="text-[#988F85] font-medium">Amplifies arm moves</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.1"
              value={settings.movementSensitivity}
              onChange={(e) => onUpdateSettings({ movementSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-[#E76F51] h-2 bg-[#F4EFE6] rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Card 2: Voice & Audio Controls */}
        <div className="p-6 rounded-3xl bg-white border border-[#E6DED3] shadow-product space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E6DED3]/60">
            <div className="w-10 h-10 rounded-2xl bg-[#FEF7E8] text-amber-600 border border-[#FBE2A8] flex items-center justify-center shadow-inner">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#23201D] font-display">Cartoon Voice & Audio FX</h3>
              <p className="text-xs font-medium text-[#6C655E]">Voice modulation & chimes</p>
            </div>
          </div>

          {/* Voice Effect Selection */}
          <div className="space-y-2">
            <div className="text-sm font-black text-[#23201D]">Active Cartoon Voice Pitch</div>
            <div className="grid grid-cols-2 gap-2">
              {voiceEffects.map((fx) => (
                <button
                  key={fx.id}
                  onClick={() => {
                    playSoundEffect('pop');
                    onUpdateSettings({ activeVoiceEffect: fx.id });
                  }}
                  className={`p-2.5 rounded-2xl border text-xs font-black text-left flex items-center gap-2 transition ${
                    settings.activeVoiceEffect === fx.id
                      ? 'bg-[#FDF0EB] text-[#23201D] border-[#E76F51] shadow-xs'
                      : 'bg-white text-[#6C655E] border-[#E6DED3] hover:bg-[#FAF6EE]'
                  }`}
                >
                  <span className="text-base">{fx.icon}</span>
                  <span className="truncate">{fx.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Effects Chimes Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-sm font-black text-[#23201D]">Sound Effects & Fanfares</div>
              <p className="text-xs font-medium text-[#6C655E]">
                Plays cheerful stars and celebration sounds
              </p>
            </div>
            <button
              onClick={() => onUpdateSettings({ audioFeedback: !settings.audioFeedback })}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${
                settings.audioFeedback ? 'bg-[#E76F51]' : 'bg-[#E6DED3]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.audioFeedback ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Speech Recognition Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-[#23201D]">Voice Speech Recognition</div>
              <p className="text-xs font-medium text-[#6C655E]">
                Buddy listens when you talk and answers back
              </p>
            </div>
            <button
              onClick={() => onUpdateSettings({ speechRecognitionEnabled: !settings.speechRecognitionEnabled })}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${
                settings.speechRecognitionEnabled ? 'bg-[#2D8A56]' : 'bg-[#E6DED3]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.speechRecognitionEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card 3: 3D Stage Environment Themes */}
        <div className="p-6 rounded-3xl bg-white border border-[#E6DED3] shadow-product space-y-4 md:col-span-2">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E6DED3]/60">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF6EE] text-[#23201D] border border-[#E6DED3] flex items-center justify-center shadow-inner">
              <Palette className="w-5 h-5 text-[#E76F51]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#23201D] font-display">3D Stage Environment Theme</h3>
              <p className="text-xs font-medium text-[#6C655E]">Pick where your buddy dances</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {themeEnvironments.map((t) => (
              <motion.button
                key={t.id}
                whileHover={{ translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playSoundEffect('pop');
                  onUpdateSettings({ themeEnvironment: t.id as any });
                }}
                className={`p-4 rounded-3xl border text-left transition flex flex-col justify-between ${
                  settings.themeEnvironment === t.id
                    ? 'bg-[#FDF0EB] border-[#E76F51] shadow-product'
                    : 'bg-[#FAF6EE]/50 border-[#E6DED3] hover:bg-[#FAF6EE]'
                }`}
              >
                <div className="text-3xl mb-2">{t.icon}</div>
                <div>
                  <h4 className="text-sm font-black text-[#23201D] font-display">{t.name}</h4>
                  <p className="text-[11px] font-medium text-[#6C655E] mt-0.5">{t.desc}</p>
                </div>
                {settings.themeEnvironment === t.id && (
                  <span className="text-[10px] font-black uppercase text-[#E76F51] bg-[#FDF0EB] border border-[#F7CEC3] px-2.5 py-0.5 rounded-full mt-3 inline-block self-start">
                    Active Theme ✨
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Card 4: 100% Kid Safety & Privacy Guarantee */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#EBF7F0] border border-[#BFE3CD] shadow-product space-y-3 md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D8A56] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1B5736] font-display">100% Private, Safe & On-Device</h3>
              <p className="text-xs font-semibold text-[#2D8A56]">Built for kids, approved by parents</p>
            </div>
          </div>
          <p className="text-xs font-medium text-[#1B5736]/90 leading-relaxed">
            All AI motion tracking, facial expression recognition, and cartoon audio processing happen
            locally right in your web browser. <strong>Zero webcam video or microphone audio is ever recorded,
            saved, or sent to the cloud.</strong>
          </p>
        </div>
      </div>

      {/* Return Action */}
      <div className="pt-2 text-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playSoundEffect('star');
            onNavigate('experience');
          }}
          className="px-8 py-4 rounded-2xl bg-[#E76F51] hover:bg-[#D85D3F] text-white font-black text-base shadow-tactile-coral inline-flex items-center gap-2 transition"
        >
          <Sparkles className="w-5 h-5 fill-white text-amber-100" />
          <span>Save Settings & Return to Studio 🚀</span>
        </motion.button>
      </div>
    </div>
  );
};
