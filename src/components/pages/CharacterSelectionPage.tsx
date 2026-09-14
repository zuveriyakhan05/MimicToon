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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('landing')}
            className="p-2.5 rounded-lg bg-white border border-[#E6DED3] text-[#23201D] hover:bg-[#F8F4EC] transition shadow-2xs flex items-center gap-2 text-xs font-black cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </motion.button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#23201D] tracking-tight flex items-center gap-2.5">
              <span>Choose Your Buddy</span>
              <span className="text-2xl">🐾</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#6C655E]">
              Pick your favourite cartoon character to mirror your moves in 3D!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirmAndPlay}
            className="px-5 py-2.5 rounded-lg bg-[#E76F51] hover:bg-[#D85D3F] text-white font-black text-xs sm:text-sm shadow-tactile-coral flex items-center gap-2 transition cursor-pointer"
          >
            <span>Play with {previewChar.name.split(' ')[0]}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Filter Tabs as Segmented Control */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <span className="text-xs font-black uppercase tracking-wider text-[#988F85] mr-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#E76F51]" />
          <span>Vibe:</span>
        </span>
        <div className="inline-flex flex-wrap items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl border border-[#E6DED3]">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                filterCategory === tab.id
                  ? 'bg-white text-[#23201D] shadow-xs border border-[#DFD6CA]'
                  : 'text-[#6C655E] hover:text-[#23201D] hover:bg-white/60 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Showcase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 3D Live Interactive Stage Preview */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="relative aspect-4/3 rounded-2xl overflow-hidden border-2 border-[#E6DED3] shadow-product-lg bg-[#1E1B18] min-h-[380px]">
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
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePreviewIdle(previewChar)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer ${
                  previewIdleActive
                    ? 'bg-[#E76F51] text-white'
                    : 'bg-white/95 hover:bg-white text-[#23201D] border border-[#E6DED3]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#E76F51]" />
                <span>{previewIdleActive ? 'Playing Idle Move...' : 'Test Idle'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCustomModelModal(true)}
                className="px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-[#23201D] border border-[#E6DED3] text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="GLB / VRM Model Options"
              >
                <Box className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Model</span>
              </button>
            </div>

            {/* Floating Buddy Info Pill */}
            <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-white/95 border border-[#E6DED3] shadow-product flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#23201D] bg-[#F8F4EC] px-2 py-0.5 rounded-md border border-[#E6DED3]">
                    {previewChar.species}
                  </span>
                  {previewChar.modelUrl && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1D4ED8] bg-[#EFF6FF] px-2 py-0.5 rounded-md border border-[#BFDBFE]">
                      GLB 3D Model
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-[#23201D] mt-0.5 flex items-center gap-1.5">
                  <span>{previewChar.name}</span>
                  <span>{previewChar.icon}</span>
                </h3>
              </div>

              {/* Voice Sample Tester */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => playVoiceSample(previewChar)}
                className="px-3 py-1.5 rounded-lg bg-[#E76F51] hover:bg-[#D85D3F] text-white text-xs font-black flex items-center gap-1.5 shadow-tactile-coral transition cursor-pointer"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPlayingVoice ? 'animate-bounce' : ''}`} />
                <span>{isPlayingVoice ? 'Talking...' : 'Hear Voice'}</span>
              </motion.button>
            </div>
          </div>

          {/* Character Bio & Personality Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E6DED3] shadow-product space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#23201D] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E76F51]" />
                <span>Personality & Superpower</span>
              </h4>
              {previewChar.personality?.energyLevel && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#FDF0EB] text-[#C04F34] border border-[#F7CEC3]">
                  Energy: {previewChar.personality.energyLevel}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-medium text-[#6C655E] leading-relaxed">
              {previewChar.bio}
            </p>

            {previewChar.personality && (
              <div className="space-y-1.5 pt-2 border-t border-[#E6DED3]">
                <div className="flex items-center gap-2 text-xs text-[#23201D]">
                  <Star className="w-3.5 h-3.5 text-[#F2C66D] fill-[#F2C66D] shrink-0" />
                  <span>
                    <strong>Secret Power:</strong> {previewChar.personality.secretPower}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#23201D]">
                  <Heart className="w-3.5 h-3.5 text-[#E76F51] fill-[#E76F51] shrink-0" />
                  <span>
                    <strong>Loves:</strong> {previewChar.personality.favoriteActivity}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold px-3 py-1 rounded-md bg-[#FEF7E8] text-[#916212] border border-[#FBE2A8] flex items-center gap-1">
                <Star className="w-3 h-3 fill-[#F2C66D] text-[#D49826]" />
                <span>Favorite Pose: {previewChar.favoritePose}</span>
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-md bg-[#F8F4EC] text-[#23201D] border border-[#E6DED3] flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-[#6C655E]" />
                <span>Voice: {previewChar.voiceStyle?.styleName || `${previewChar.voicePitch}x`}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Character Grid Selection Cards using Reusable CharacterCard */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#23201D] uppercase tracking-wider flex items-center gap-1.5">
              <span>Select Buddy</span>
              <span className="text-xs text-[#988F85] font-normal">({filteredCharacters.length} available)</span>
            </h3>
            <span className="text-xs text-[#6C655E]">Click any buddy to inspect & apply</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
          <div className="p-6 rounded-2xl bg-[#E76F51] text-white shadow-tactile-coral space-y-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md">
                Ready to Dance & Play?
              </span>
              <h3 className="text-xl font-black mt-2">
                Let's set up your camera with {previewChar.name}!
              </h3>
              <p className="text-xs font-medium text-white/90 mt-1">
                We'll make sure your arms, head, and microphone are tracked with magic precision.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirmAndPlay}
                className="px-5 py-2.5 rounded-lg bg-white text-[#23201D] font-black text-xs sm:text-sm shadow-2xs hover:bg-[#FAF6EE] transition flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#E76F51]" />
                <span>Next: Camera Setup</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onSelectCharacter(previewChar);
                  onNavigate('experience');
                }}
                className="px-4 py-2.5 rounded-lg bg-black/20 hover:bg-black/30 text-white font-black text-xs sm:text-sm transition cursor-pointer"
              >
                <span>Jump Straight to Studio 🚀</span>
              </motion.button>
            </div>
          </div>

          {/* Architecture Extensibility Callout for Teachers / Developers */}
          <div className="p-4 rounded-xl bg-[#F8F4EC] border border-[#E6DED3] text-[#23201D] flex items-start gap-3">
            <Layers className="w-5 h-5 text-[#6C655E] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-extrabold text-[#23201D]">Decoupled 3D Motion Architecture</p>
              <p className="text-[#6C655E] font-medium leading-relaxed">
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowCustomModelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-product-lg border border-[#E6DED3] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E6DED3] pb-3">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-[#3B82F6]" />
                  <h3 className="text-base sm:text-lg font-black text-[#23201D]">
                    3D Model Settings for {previewChar.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomModelModal(false)}
                  className="p-1 rounded-md text-[#988F85] hover:text-[#23201D] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs font-medium text-[#6C655E] leading-relaxed">
                You can link an external GLB or VRM humanoid avatar file. If not specified or if loading fails, MimicToon will automatically fall back to the stylized cartoon 3D rig.
              </p>

              <form onSubmit={handleApplyCustomModel} className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-[#23201D] uppercase tracking-wider mb-1">
                    GLB / VRM Model URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/character.glb"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#E6DED3] focus:border-[#E76F51] focus:outline-hidden text-xs font-bold text-[#23201D] bg-[#FAF6EE]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResetToProcedural}
                    className="px-4 py-2 rounded-lg bg-[#F8F4EC] hover:bg-[#F4EFE6] text-[#23201D] text-xs font-black border border-[#E6DED3] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset to Cartoon Rig</span>
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#E76F51] hover:bg-[#D85D3F] text-white text-xs font-black shadow-tactile-coral flex items-center gap-1.5 transition cursor-pointer"
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
