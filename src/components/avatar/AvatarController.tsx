import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Sliders, Palette, Play, Eye, EyeOff } from 'lucide-react';
import { Avatar } from './Avatar';
import { AvatarEnvironment } from './AvatarEnvironment';
import { AvatarLoader } from './AvatarLoader';
import { CharacterProfile, BodyMotion, AvatarKinematics } from '../../types';
import {
  StageTheme,
  FaceSignals,
  AvatarFacePose,
  HandSignals,
  AvatarHandPose,
  TestMotionPreset,
} from '../../types/avatar';
import { CompanionState, CompanionReactionType } from '../../types/companion';

interface AvatarControllerProps {
  character: CharacterProfile;
  kinematics?: AvatarKinematics | null;
  motion?: BodyMotion | null;
  faceSignals?: FaceSignals | null;
  facePose?: AvatarFacePose | null;
  handSignals?: HandSignals | null;
  handPose?: AvatarHandPose | null;
  mouthOpenLevel?: number;
  themeEnvironment?: StageTheme;
  smoothingFactor?: number;
  movementSensitivity?: number;
  confidenceThreshold?: number;
  isMirrored?: boolean;
  customModelUrl?: string;
  onThemeChange?: (theme: StageTheme) => void;
  onUpdateSettings?: (settings: { smoothingFactor?: number; movementSensitivity?: number }) => void;
  allowTestPresets?: boolean;
  companionState?: CompanionState;
  companionReaction?: CompanionReactionType;
  companionBlend?: number;
  companionMessage?: string;
}

export const AvatarController: React.FC<AvatarControllerProps> = React.memo(({
  character,
  kinematics,
  motion,
  faceSignals,
  facePose,
  handSignals,
  handPose,
  mouthOpenLevel = 0,
  themeEnvironment = 'playground',
  smoothingFactor = 0.25,
  movementSensitivity = 1.0,
  confidenceThreshold = 0.45,
  isMirrored = true,
  customModelUrl,
  onThemeChange,
  onUpdateSettings,
  allowTestPresets = true,
  companionState,
  companionReaction,
  companionBlend,
  companionMessage = '',
}) => {
  const [modelObject, setModelObject] = useState<THREE.Object3D | null>(null);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [testPreset, setTestPreset] = useState<TestMotionPreset>('none');
  const [currentTheme, setCurrentTheme] = useState<StageTheme>(themeEnvironment);
  const [showControls, setShowControls] = useState(false);
  const [localSensitivity, setLocalSensitivity] = useState(movementSensitivity);
  const [localSmoothing, setLocalSmoothing] = useState(smoothingFactor);

  // Clean companion message: remove asterisk actions like *waves back excitedly!*
  const cleanCompanionMessage = useMemo(() => {
    if (!companionMessage) return '';
    return companionMessage.replace(/\*[^*]+\*/g, '').trim();
  }, [companionMessage]);

  // Determine single, prioritized active gesture/reaction for clean child feedback (no overlap)
  const activeActionBadge = useMemo(() => {
    if (mouthOpenLevel > 0.2) {
      return { icon: '🗣️', label: 'Talking!', bg: 'bg-[#E76F51]', text: 'text-white' };
    }
    if (kinematics?.isWavingRight || kinematics?.isWavingLeft || testPreset === 'wave') {
      return { icon: '👋', label: 'Waving!', bg: 'bg-[#3B82F6]', text: 'text-white' };
    }
    if (kinematics?.isHandsUp || testPreset === 'hands_up') {
      return { icon: '🙌', label: 'Hands Up!', bg: 'bg-[#2D8A56]', text: 'text-white' };
    }
    if (kinematics?.isCrouching || testPreset === 'squat') {
      return { icon: '🦘', label: 'Hop!', bg: 'bg-[#F2C66D]', text: 'text-[#23201D]' };
    }
    if (testPreset === 'dance') {
      return { icon: '💃', label: 'Dance Party!', bg: 'bg-[#E76F51]', text: 'text-white' };
    }
    if (handSignals?.rightHand && handSignals.rightHand.gesture !== 'none') {
      const g = handSignals.rightHand.gesture;
      const label = g === 'thumbs_up' ? 'Thumbs Up!' : g === 'victory' ? 'Peace!' : g === 'open_palm' ? 'High Five!' : g === 'pointing' ? 'Pointing!' : 'Super Fist!';
      const icon = g === 'thumbs_up' ? '👍' : g === 'victory' ? '✌️' : g === 'open_palm' ? '🖐️' : g === 'pointing' ? '👉' : '✊';
      return { icon, label, bg: 'bg-[#EBF7F0]', text: 'text-[#2D8A56]' };
    }
    if (facePose?.isDetected && facePose.dominantExpression !== 'neutral') {
      const exp = facePose.dominantExpression;
      const label = exp === 'happy' ? 'Happy Smile!' : exp === 'surprised' ? 'Surprised!' : exp === 'blink' ? 'Wink!' : 'Fun Face!';
      const icon = exp === 'happy' ? '😄' : exp === 'surprised' ? '😲' : exp === 'blink' ? '😉' : '😜';
      return { icon, label, bg: 'bg-[#FEF7E8]', text: 'text-[#916212]' };
    }
    return null;
  }, [mouthOpenLevel, kinematics, testPreset, handSignals, facePose]);

  // Sync external theme changes
  const activeTheme = onThemeChange ? themeEnvironment : currentTheme;

  const handleSelectTheme = (theme: StageTheme) => {
    setCurrentTheme(theme);
    if (onThemeChange) onThemeChange(theme);
  };

  // Background styling based on theme
  const backgroundClasses: Record<StageTheme, string> = {
    playground: 'bg-gradient-to-b from-sky-200 via-amber-50 to-orange-100',
    forest: 'bg-gradient-to-b from-emerald-100 via-amber-50 to-emerald-200/60',
    cosmic: 'bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-950 text-white',
    toyroom: 'bg-gradient-to-b from-amber-100 via-rose-50 to-amber-200',
    studio: 'bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200',
    transparent: 'bg-transparent',
  };

  return (
    <div
      className={`relative w-full h-full min-h-[380px] sm:min-h-[440px] rounded-3xl overflow-hidden shadow-product flex flex-col transition-colors duration-500 ${
        backgroundClasses[activeTheme]
      }`}
    >
      {/* 1. Model Loader Component with progress and fallback */}
      <AvatarLoader
        character={character}
        modelUrl={customModelUrl}
        onModelReady={(root, isCustom) => {
          setModelObject(root);
          setIsCustomModel(isCustom);
        }}
        onError={(err) => console.warn('AvatarLoader error:', err)}
      />

      {/* 2. Top Bar Header */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Status Pill */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-[#E6DED3] shadow-xs text-xs font-black text-[#23201D]">
          <span
            className={`w-2 h-2 rounded-full ${
              motion?.isDetected ? 'bg-[#2D8A56] animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{motion?.isDetected ? 'Live' : 'Ready'}</span>
          <span className="text-[#E6DED3]">|</span>
          <span className="text-[#E76F51]">
            {isCustomModel ? 'Custom' : character.name}
          </span>
          {testPreset !== 'none' && (
            <span className="bg-[#FEF7E8] text-amber-900 border border-[#FBE2A8] px-2 py-0.2 rounded-full text-[10px] font-black">
              {testPreset}
            </span>
          )}
        </div>

        {/* Settings Toggle (Only shown when allowTestPresets is enabled) */}
        {allowTestPresets && (
          <div className="pointer-events-auto">
            <button
              onClick={() => setShowControls((prev) => !prev)}
              className="bg-white/90 backdrop-blur-md hover:bg-white text-[#6C655E] hover:text-[#23201D] p-1.5 rounded-full border border-[#E6DED3] shadow-xs text-xs font-black transition-all flex items-center justify-center cursor-pointer"
              title="3D Theme Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-[#E76F51]" />
            </button>
          </div>
        )}
      </div>

      {/* Expandable Theme & Test Presets Drawer */}
      {showControls && (
        <div className="absolute top-16 right-4 z-30 w-72 bg-white/95 backdrop-blur-md border-2 border-amber-200 rounded-3xl p-3.5 shadow-xl space-y-3.5 animate-in fade-in zoom-in-95 max-h-[80vh] overflow-y-auto">
          {/* Stage Themes */}
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span>3D Environment</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['playground', 'forest', 'cosmic', 'toyroom', 'studio', 'transparent'] as StageTheme[]).map(
                (theme) => (
                  <button
                    key={theme}
                    onClick={() => handleSelectTheme(theme)}
                    className={`px-2 py-1.5 rounded-xl text-[10px] font-black capitalize transition-all border ${
                      activeTheme === theme
                        ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    {theme}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Quick Tracking Controls */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              <span>Motion Controls</span>
            </div>

            {/* Sensitivity */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black text-slate-600">
                <span>Sensitivity</span>
                <span className="text-amber-700">{localSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.1"
                value={localSensitivity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLocalSensitivity(val);
                  if (onUpdateSettings) onUpdateSettings({ movementSensitivity: val });
                }}
                className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Smoothing */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black text-slate-600">
                <span>Smoothing</span>
                <span className="text-amber-700">{Math.round(localSmoothing * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.75"
                step="0.05"
                value={localSmoothing}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLocalSmoothing(val);
                  if (onUpdateSettings) onUpdateSettings({ smoothingFactor: val });
                }}
                className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Test Motion Presets */}
          {allowTestPresets && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Play className="w-3.5 h-3.5 text-amber-500" />
                <span>Test Motion Presets</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'none', label: 'Live Tracking 🎯' },
                    { id: 'idle', label: 'Idle Breathe' },
                    { id: 'wave', label: 'Wave 👋' },
                    { id: 'hands_up', label: 'Hands Up 🙌' },
                    { id: 'squat', label: 'Squat 🐰' },
                    { id: 'dance', label: 'Dance 💃' },
                    { id: 't_pose', label: 'T-Pose 🧍' },
                    { id: 'head_tilt', label: 'Head Tilt 🙃' },
                  ] as { id: TestMotionPreset; label: string }[]
                ).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setTestPreset(preset.id)}
                    className={`px-2 py-1.5 rounded-xl text-[10px] font-bold text-left truncate transition-all border ${
                      testPreset === preset.id
                        ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Main React Three Fiber Canvas Scene */}
      <div className="w-full flex-1 touch-none">
        <Canvas
          shadows
          dpr={[1, Math.min(1.5, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)]}
          camera={{ position: [0, 0.65, 4.3], fov: 42 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            stencil: false,
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
        >
          {/* Environment, platform & lights */}
          <AvatarEnvironment theme={activeTheme} />

          {/* R3F Animated Cartoon Avatar with smoothed Quaternion IK rig, Face Expressions, Hand Gestures & Companion State */}
          <Avatar
            modelObject={modelObject}
            characterStyle={character.avatarStyle}
            kinematics={kinematics}
            motion={motion}
            faceSignals={faceSignals}
            facePose={facePose}
            handSignals={handSignals}
            handPose={handPose}
            testPreset={testPreset}
            mouthOpenLevel={mouthOpenLevel}
            smoothingFactor={localSmoothing}
            movementSensitivity={localSensitivity}
            confidenceThreshold={confidenceThreshold}
            isMirrored={isMirrored}
            companionState={companionState}
            companionReaction={companionReaction}
            companionBlend={companionBlend}
          />
        </Canvas>

        {/* Dynamic Cartoon Companion Speech Bubble (Clear of head & ears) */}
        {cleanCompanionMessage && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 max-w-xs px-4 py-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-product border-2 border-[#E76F51] text-[#23201D] text-xs sm:text-sm font-black text-center pointer-events-none flex items-center justify-center gap-2 animate-bounce-subtle">
            <span className="text-base shrink-0">
              {companionReaction === 'waving' ? '👋' : companionReaction === 'jumping' ? '🦘' : companionReaction === 'cheering' ? '🎉' : '💬'}
            </span>
            <span className="leading-snug">{cleanCompanionMessage}</span>
          </div>
        )}
      </div>

      {/* 5. Single Prioritized Fun Action Badge (Zero Overlap) */}
      {activeActionBadge && (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <span className={`${activeActionBadge.bg} ${activeActionBadge.text} px-3.5 py-1.5 rounded-full text-xs font-black shadow-product flex items-center gap-1.5 animate-bounce-subtle border border-black/10`}>
            <span className="text-sm">{activeActionBadge.icon}</span>
            <span>{activeActionBadge.label}</span>
          </span>
        </div>
      )}
    </div>
  );
});
