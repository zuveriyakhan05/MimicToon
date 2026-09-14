import React from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Gamepad2,
  Camera,
  Smile,
  Award,
  Sliders,
  Volume2,
  Zap,
  Activity,
} from 'lucide-react';
import { CharacterProfile, AppPage, UserStats } from '../../types';
import { CHARACTERS } from '../../data/characters';
import { Avatar3DStage } from '../experience/Avatar3DStage';
import { playSoundEffect } from '../../utils/audioEffects';

interface LandingPageProps {
  activeCharacter: CharacterProfile;
  onSelectCharacter: (char: CharacterProfile) => void;
  onNavigate: (page: AppPage) => void;
  stats: UserStats;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  activeCharacter,
  onSelectCharacter,
  onNavigate,
  stats,
}) => {
  const handleStart = () => {
    playSoundEffect('star');
    onNavigate('experience');
  };

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Heading & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 space-y-5 text-center lg:text-left"
          >
            <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FEF7E8] text-[#916212] border border-[#FBE2A8] text-xs font-extrabold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 fill-[#F2C66D] text-[#D49826]" />
                <span>Next-Gen Child AI Playground</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EBF7F0] text-[#226D43] border border-[#BFE3CD] text-xs font-extrabold shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D8A56]" />
                <span>100% On-Device & Safe</span>
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#23201D] leading-[1.1] font-display">
              Move your body. <br />
              <span className="text-[#E76F51]">
                Watch your cartoon buddy copy you!
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#6C655E] font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Wave, jump, smile, and speak! Your 3D cartoon pal copies your every move in real time with funny cartoon sounds!
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className="px-7 py-3.5 rounded-xl bg-[#E76F51] hover:bg-[#D85D3F] text-white text-base sm:text-lg font-black shadow-tactile-coral flex items-center gap-3 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-white" />
                </div>
                <span>Start Live Studio Now</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playSoundEffect('pop');
                  onNavigate('copyme');
                }}
                className="px-5 py-3.5 rounded-xl bg-white hover:bg-[#F8F4EC] text-[#23201D] text-base font-extrabold border border-[#E6DED3] shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5 text-[#E76F51]" />
                <span>Play "Copy Me" Game</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playSoundEffect('pop');
                  onNavigate('camera-setup');
                }}
                className="px-5 py-3.5 rounded-xl bg-[#F8F4EC] hover:bg-white text-[#23201D] text-base font-extrabold border border-[#E6DED3] shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Camera className="w-5 h-5 text-[#6C655E]" />
                <span>Camera Check</span>
              </motion.button>
            </div>

            {/* Quick stats & features pill */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs font-bold text-[#6C655E]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2D8A56]" />
                <span>⚡ Live Motion</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                <span>🎤 Cartoon Voice</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F2C66D]" />
                <span>⭐ Win Trophies</span>
              </span>
            </div>
          </motion.div>

          {/* Right Column: 3D Articulated Avatar Live Hero Showcase Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative aspect-4/3 sm:aspect-square w-full rounded-3xl overflow-hidden border-2 border-[#E6DED3] shadow-product-lg bg-[#FAF6EE] min-h-[360px]">
              <Avatar3DStage
                character={activeCharacter}
                kinematics={{
                  headPitch: 0,
                  headYaw: Math.sin(Date.now() / 1200) * 0.2,
                  headRoll: 0,
                  leftArmAngle: 0.7,
                  rightArmAngle: 0.7,
                  leftForearmAngle: 0.4,
                  rightForearmAngle: 0.4,
                  torsoLean: 0,
                  torsoTwist: 0,
                  jumpOffset: 0,
                  isWavingLeft: false,
                  isWavingRight: true,
                  isHandsUp: false,
                  isCrouching: false,
                  mouthOpen: 0.2,
                  isBlinking: false,
                }}
                motion={null}
                faceSignals={null}
                facePose={null}
                handSignals={null}
                themeEnvironment="playground"
                mouthOpenLevel={0.2}
                smoothingFactor={0.2}
                movementSensitivity={1.0}
                confidenceThreshold={0.45}
                isMirrored={false}
                allowTestPresets={false}
                companionReaction="waving"
                companionMessage="Wave at me! 👋"
              />

              {/* Switch Buddy Pill */}
              <button
                onClick={() => onNavigate('characters')}
                className="absolute bottom-3 right-3 z-20 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#23201D] text-xs font-black shadow-product border border-[#E6DED3] transition flex items-center gap-1.5 cursor-pointer"
              >
                <Smile className="w-3.5 h-3.5 text-[#E76F51]" />
                <span>Change Buddy</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Quick Navigation Hub to All Pages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#916212] bg-[#FEF7E8] px-3 py-1 rounded-md border border-[#FBE2A8]">
            Interactive AI Playground
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#23201D]">Explore MimicToon Modes</h2>
          <p className="text-sm font-bold text-[#6C655E]">
            Everything your child needs to dance, giggle, exercise, and play!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Live Studio */}
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('experience')}
            className="cursor-pointer p-6 rounded-2xl bg-white border border-[#E6DED3] shadow-product hover:shadow-product-hover hover:border-[#D6CBC0] transition flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FEF7E8] border border-[#FBE2A8] text-[#23201D] flex items-center justify-center text-2xl mb-4 shadow-2xs">
              🪞
            </div>
            <div>
              <h3 className="text-lg font-black text-[#23201D] font-display">Live Cartoon Studio</h3>
              <p className="text-xs font-medium text-[#6C655E] mt-1 leading-relaxed">
                Dance, jump, and make faces live with your 3D buddy!
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#E6DED3] flex items-center justify-between text-xs font-black text-[#E76F51]">
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 2: Copy Me Game */}
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('copyme')}
            className="cursor-pointer p-6 rounded-2xl bg-[#FDF0EB] border border-[#F7CEC3] shadow-product hover:shadow-product-hover transition flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-[#F7CEC3] text-[#E76F51] flex items-center justify-center text-2xl mb-4 shadow-2xs">
              🎮
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#C04F34] bg-white px-2 py-0.5 rounded-md border border-[#F7CEC3] mb-2 inline-block">
                Hot Game
              </span>
              <h3 className="text-lg font-black text-[#23201D] font-display">"Copy Me" Challenge</h3>
              <p className="text-xs font-medium text-[#6C655E] mt-1 leading-relaxed">
                Match your buddy's secret poses and collect stars!
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#F7CEC3] flex items-center justify-between text-xs font-black text-[#C04F34]">
              <span>Play Now</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 3: Buddies Selection */}
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('characters')}
            className="cursor-pointer p-6 rounded-2xl bg-white border border-[#E6DED3] shadow-product hover:shadow-product-hover hover:border-[#D6CBC0] transition flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F8F4EC] border border-[#E6DED3] text-[#23201D] flex items-center justify-center text-2xl mb-4 shadow-2xs">
              🐾
            </div>
            <div>
              <h3 className="text-lg font-black text-[#23201D] font-display">Meet The Buddies</h3>
              <p className="text-xs font-medium text-[#6C655E] mt-1 leading-relaxed">
                Pick Bunny, Bear, Fox, Cat, or Robot pals!
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#E6DED3] flex items-center justify-between text-xs font-black text-[#23201D]">
              <span>Choose Buddy</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 4: Trophies & Progress */}
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('progress')}
            className="cursor-pointer p-6 rounded-2xl bg-white border border-[#E6DED3] shadow-product hover:shadow-product-hover hover:border-[#D6CBC0] transition flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FEF7E8] border border-[#FBE2A8] text-[#23201D] flex items-center justify-center text-2xl mb-4 shadow-2xs">
              🏆
            </div>
            <div>
              <h3 className="text-lg font-black text-[#23201D] font-display">Trophies & Badges</h3>
              <p className="text-xs font-medium text-[#6C655E] mt-1 leading-relaxed">
                {stats.stars} Stars ⭐ • {stats.streakDays} Day Streak 🔥 • Level up!
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#E6DED3] flex items-center justify-between text-xs font-black text-[#23201D]">
              <span>View Trophies</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Character Showcase Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E6DED3] shadow-product space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-[#23201D] font-display">Meet Your Cartoon Friends</h3>
              <p className="text-xs font-medium text-[#6C655E] mt-0.5">
                Click any buddy to preview their moves and superpowers!
              </p>
            </div>
            <button
              onClick={() => onNavigate('characters')}
              className="px-4 py-2 rounded-lg bg-[#F8F4EC] hover:bg-[#F4EFE6] text-[#23201D] border border-[#E6DED3] text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>See All Buddies</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {CHARACTERS.map((char) => {
              const isCurrent = activeCharacter.id === char.id;
              return (
                <div
                  key={char.id}
                  onClick={() => {
                    playSoundEffect('click');
                    onSelectCharacter(char);
                  }}
                  className={`cursor-pointer p-3.5 rounded-xl border transition text-center space-y-2 ${
                    isCurrent
                      ? 'bg-[#FDF0EB] border-[#E76F51] shadow-xs ring-1 ring-[#E76F51]'
                      : 'bg-[#FAF6EE] border-[#E6DED3] hover:bg-[#F5EFE4] hover:border-[#D6CBC0]'
                  }`}
                >
                  <div
                    className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-3xl shadow-2xs"
                    style={{ backgroundColor: `${char.primaryColor}20` }}
                  >
                    {char.icon || (
                      char.species === 'Bunny' ? '🐰' :
                      char.species === 'Bear' ? '🐻' :
                      char.species === 'Fox' ? '🦊' :
                      char.species === 'Cat' ? '🐱' :
                      char.species === 'Robot' ? '🤖' : '🐾'
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#23201D] font-display">{char.name}</h4>
                    <span className="text-[11px] font-bold text-[#E76F51]">{char.species}</span>
                    <p className="text-[10px] font-medium text-[#6C655E] line-clamp-1 mt-0.5">
                      {char.tagline}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-black uppercase text-[#C04F34] bg-white px-2 py-0.5 rounded-md border border-[#F7CEC3] inline-block">
                      Selected ✨
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Kid Privacy & Parent Peace of Mind */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="p-6 sm:p-7 rounded-2xl bg-[#EBF7F0] border border-[#BFE3CD] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-product">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-xl bg-[#2D8A56] text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
              🛡️
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#194D31] font-display">
                100% Private, Safe & On-Device AI
              </h3>
              <p className="text-xs sm:text-sm font-medium text-[#226D43] mt-1 max-w-xl leading-relaxed">
                Motion tracking runs right inside your browser. Zero camera video or audio is ever recorded, saved, or sent to the cloud.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="px-5 py-2.5 rounded-lg bg-white border border-[#BFE3CD] text-[#226D43] font-black text-xs sm:text-sm shadow-2xs hover:bg-[#F5FBF7] transition shrink-0 cursor-pointer"
          >
            Safety Details
          </button>
        </div>
      </section>
    </div>
  );
};
