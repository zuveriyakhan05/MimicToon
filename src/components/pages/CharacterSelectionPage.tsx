import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Check,
  Star,
  Activity,
  Heart,
  Box,
  Layers,
  Camera,
  RefreshCw,
} from 'lucide-react';
import {
  CHARACTERS,
  saveCustomModelForCharacter,
} from '../../data/characters';
import { CharacterProfile, AppPage } from '../../types';
import { Avatar3DStage } from '../experience/Avatar3DStage';
import { CharacterCard } from '../avatar/CharacterCard';
import { playSoundEffect } from '../../utils/audioEffects';

interface CharacterSelectionPageProps {
  activeCharacter: CharacterProfile;
  onSelectCharacter: (char: CharacterProfile) => void;
  onNavigate: (page: AppPage) => void;
}

export const CharacterSelectionPage: React.FC<CharacterSelectionPageProps> = ({
  activeCharacter,
  onSelectCharacter,
  onNavigate,
}) => {
  const [previewChar, setPreviewChar] = useState<CharacterProfile>(activeCharacter);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [previewIdleActive, setPreviewIdleActive] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'hyper' | 'cozy' | 'playful'>('all');
  const [showCustomModelModal, setShowCustomModelModal] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');

  const playVoiceSample = (char: CharacterProfile) => {
    playSoundEffect('pop');
    setIsPlayingVoice(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text =
        char.voiceStyle?.greeting ||
        `Hi there! I am ${char.name}! Let's play and mimic together!`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = char.voiceStyle?.pitch ?? char.voicePitch ?? 1.4;
      utterance.rate = char.voiceStyle?.rate ?? 1.05;
      utterance.onend = () => setIsPlayingVoice(false);
      utterance.onerror = () => setIsPlayingVoice(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingVoice(false), 1200);
    }
  };

  const handleSelect = (char: CharacterProfile) => {
    setPreviewChar(char);
    onSelectCharacter(char);
    playSoundEffect('click');
  };

  const handlePreviewIdle = (char: CharacterProfile) => {
    setPreviewChar(char);
    setPreviewIdleActive(true);
    setTimeout(() => setPreviewIdleActive(false), 3500);
  };

  const handleConfirmAndPlay = () => {
    playSoundEffect('star');
    onSelectCharacter(previewChar);
    onNavigate('camera-setup');
  };

  const handleApplyCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customModelInput.trim()) return;

    saveCustomModelForCharacter(previewChar.id, customModelInput.trim());
    const updatedChar: CharacterProfile = {
      ...previewChar,
      modelUrl: customModelInput.trim(),
      modelType: 'glb',
    };
    setPreviewChar(updatedChar);
    onSelectCharacter(updatedChar);
    setShowCustomModelModal(false);
    setCustomModelInput('');
    playSoundEffect('star');
  };

  const handleResetToProcedural = () => {
    saveCustomModelForCharacter(previewChar.id, undefined);
    const updatedChar: CharacterProfile = {
      ...previewChar,
      modelUrl: undefined,
      modelType: 'procedural',
    };
    setPreviewChar(updatedChar);
    onSelectCharacter(updatedChar);
    setShowCustomModelModal(false);
    playSoundEffect('pop');
  };

  const filteredCharacters = CHARACTERS.filter((char) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'hyper') return char.personality?.energyLevel === 'Hyper';
    if (filterCategory === 'cozy') return char.personality?.energyLevel === 'Cozy';
    if (filterCategory === 'playful') return char.personality?.energyLevel === 'Playful';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('landing')}
            className="p-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-2 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </motion.button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Choose Your Buddy</span>
              <span className="text-2xl">🐾</span>
            </h1>
            <p className="text-sm font-bold text-slate-500">
              Pick your favourite cartoon character to mirror your moves in 3D!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleConfirmAndPlay}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white font-black text-sm sm:text-base shadow-lg shadow-amber-400/30 flex items-center gap-2 hover:brightness-105 transition"
          >
            <span>Play with {previewChar.name.split(' ')[0]}</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Vibe:</span>
        </span>
        {[
          { id: 'all', label: 'All 5 Buddies 🌟' },
          { id: 'hyper', label: 'Hyper & Bouncy ⚡ (Bunny, Robot)' },
          { id: 'cozy', label: 'Cozy & Hugs 🍯 (Bear)' },
          { id: 'playful', label: 'Clever & Sweet 🦊 (Fox, Cat)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              playSoundEffect('click');
              setFilterCategory(tab.id as any);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              filterCategory === tab.id
                ? 'bg-amber-500 text-white shadow-md shadow-amber-400/30'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Showcase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 3D Live Interactive Stage Preview */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="relative aspect-4/3 rounded-3xl overflow-hidden border-4 border-amber-300/80 shadow-xl bg-slate-900 min-h-[380px]">
            <Avatar3DStage
              character={previewChar}
              modelUrl={previewChar.modelUrl}
              kinematics={{
                headPitch: previewIdleActive ? Math.sin(Date.now() / 300) * 0.15 : 0,
                headYaw: previewIdleActive
                  ? Math.cos(Date.now() / 400) * 0.25
                  : Math.sin(Date.now() / 1000) * 0.15,
                headRoll: previewIdleActive ? Math.sin(Date.now() / 350) * 0.1 : 0,
                leftArmAngle: previewIdleActive ? 0.9 : 0.6,
                rightArmAngle: previewIdleActive ? 0.9 : 0.6,
                leftForearmAngle: previewIdleActive ? 0.6 : 0.3,
                rightForearmAngle: previewIdleActive ? 0.6 : 0.3,
                torsoLean: 0,
                torsoTwist: 0,
                jumpOffset: previewIdleActive ? Math.abs(Math.sin(Date.now() / 250)) * 0.1 : 0,
                isWavingLeft: false,
                isWavingRight: !previewIdleActive,
                isHandsUp: previewIdleActive,
                isCrouching: false,
                mouthOpen: isPlayingVoice ? 0.8 : 0,
                isBlinking: false,
              }}
              motion={null}
              faceSignals={null}
              facePose={null}
              handSignals={null}
              themeEnvironment="playground"
              mouthOpenLevel={isPlayingVoice ? 0.8 : 0}
              smoothingFactor={0.2}
              movementSensitivity={1.0}
              confidenceThreshold={0.45}
              isMirrored={false}
              companionReaction={isPlayingVoice ? 'excited' : previewIdleActive ? 'cheering' : 'waving'}
              companionMessage={`Hi! I'm ${previewChar.name}!`}
            />

            {/* Stage Controls Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePreviewIdle(previewChar)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 backdrop-blur-md shadow-md transition ${
                  previewIdleActive
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-white/90 hover:bg-white text-slate-700'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>{previewIdleActive ? 'Playing Idle Move...' : 'Test Idle'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCustomModelModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 text-xs font-black flex items-center gap-1.5 backdrop-blur-md shadow-md transition"
                title="GLB / VRM Model Options"
              >
                <Box className="w-3.5 h-3.5 text-sky-500" />
                <span>Model</span>
              </button>
            </div>

            {/* Floating Buddy Info Pill */}
            <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-white/80 shadow-md flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    {previewChar.species}
                  </span>
                  {previewChar.modelUrl && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                      GLB 3D Model
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <span>{previewChar.name}</span>
                  <span>{previewChar.icon}</span>
                </h3>
              </div>

              {/* Voice Sample Tester */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => playVoiceSample(previewChar)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-400/30 transition"
              >
                <Volume2 className={`w-4 h-4 ${isPlayingVoice ? 'animate-bounce' : ''}`} />
                <span>{isPlayingVoice ? 'Talking...' : 'Hear Voice'}</span>
              </motion.button>
            </div>
          </div>

          {/* Character Bio & Personality Card */}
          <div className="p-5 rounded-3xl bg-white border-2 border-amber-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Personality & Superpower</span>
              </h4>
              {previewChar.personality?.energyLevel && (
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  Energy: {previewChar.personality.energyLevel}
                </span>
              )}
            </div>

            <p className="text-sm font-bold text-slate-600 leading-relaxed">
              {previewChar.bio}
            </p>

            {previewChar.personality && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                  <span>
                    <strong>Secret Power:</strong> {previewChar.personality.secretPower}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-400 shrink-0" />
                  <span>
                    <strong>Loves:</strong> {previewChar.personality.favoriteActivity}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>Favorite Pose: {previewChar.favoritePose}</span>
              </span>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Voice: {previewChar.voiceStyle?.styleName || `${previewChar.voicePitch}x`}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Character Grid Selection Cards using Reusable CharacterCard */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Select Buddy</span>
              <span className="text-xs text-slate-400 font-bold">({filteredCharacters.length} available)</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">Click any buddy to inspect & apply</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredCharacters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                isSelected={previewChar.id === char.id}
                isActive={activeCharacter.id === char.id}
                onSelect={handleSelect}
                onPlayVoice={playVoiceSample}
                onPreviewIdle={handlePreviewIdle}
                showDetails={true}
              />
            ))}
          </div>

          {/* Big Action CTA Panel */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white shadow-xl shadow-amber-400/20 space-y-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Ready to Dance & Play?
              </span>
              <h3 className="text-2xl font-black mt-2">
                Let's set up your camera with {previewChar.name}!
              </h3>
              <p className="text-xs font-bold text-white/90 mt-1">
                We'll make sure your arms, head, and microphone are tracked with magic precision.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleConfirmAndPlay}
                className="px-6 py-3 rounded-2xl bg-white text-slate-900 font-black text-sm shadow-md flex items-center gap-2 hover:bg-amber-50 transition"
              >
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Next: Camera Setup</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onSelectCharacter(previewChar);
                  onNavigate('experience');
                }}
                className="px-5 py-3 rounded-2xl bg-black/20 hover:bg-black/30 text-white font-black text-sm transition"
              >
                <span>Jump Straight to Studio 🚀</span>
              </motion.button>
            </div>
          </div>

          {/* Architecture Extensibility Callout for Teachers / Developers */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 flex items-start gap-3">
            <Layers className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-black text-indigo-950">Decoupled 3D Motion Architecture</p>
              <p className="font-medium text-indigo-800 leading-relaxed">
                All characters share the universal bone mapping system. You can connect custom GLTF/GLB or VRM humanoid rigs anytime without altering motion tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom 3D Model Modal */}
      <AnimatePresence>
        {showCustomModelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowCustomModelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-sky-500" />
                  <h3 className="text-lg font-black text-slate-900">
                    3D Model Settings for {previewChar.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomModelModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                You can link an external GLB or VRM humanoid avatar file. If not specified or if loading fails, MimicToon will automatically fall back to the stylized cartoon 3D rig.
              </p>

              <form onSubmit={handleApplyCustomModel} className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    GLB / VRM Model URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/character.glb"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:outline-hidden text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResetToProcedural}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset to Cartoon Rig</span>
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-400/30 flex items-center gap-1.5 transition"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Apply Model</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
