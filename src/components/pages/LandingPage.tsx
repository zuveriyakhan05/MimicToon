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
    <div className="space-y-14 pb-16">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Heading & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 space-y-5 text-center lg:text-left"
          >
            <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>Next-Gen Child AI Playground</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% On-Device & Safe</span>
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              Move your body. <br />
              <span className="text-amber-600">
                Watch your cartoon mirror move with you!
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-bold max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Stand in front of your webcam, wave your hands, jump, smile, and speak!
              Your 3D cartoon buddy mimics your exact motions in real time with playful cartoon voices and hilarious reactions.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleStart}
                className="px-8 py-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-105 text-white text-base sm:text-lg font-black shadow-xl shadow-amber-400/40 flex items-center gap-3 transition cursor-pointer"
              >
                <div className="w-9 h-9 rounded-2xl bg-white/25 flex items-center justify-center">
                  <Play className="w-5 h-5 fill-white" />
                </div>
                <span>Start Live Studio Now</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playSoundEffect('pop');
                  onNavigate('copyme');
                }}
                className="px-6 py-4 rounded-3xl bg-white hover:bg-slate-50 text-slate-800 text-base font-black border-2 border-slate-200 shadow-sm flex items-center gap-2 transition cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5 text-amber-500" />
                <span>Play "Copy Me" Game</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playSoundEffect('pop');
                  onNavigate('camera-setup');
                }}
                className="px-5 py-4 rounded-3xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-base font-black border border-amber-200 shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Camera className="w-5 h-5 text-amber-600" />
                <span>Camera Check</span>
              </motion.button>
            </div>

            {/* Quick stats & features pill */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-black text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>60 FPS Real-time Vision</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>Interactive Cartoon Voice</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Stars, Streaks & Trophies</span>
              </span>
            </div>
          </motion.div>

          {/* Right Column: 3D Articulated Avatar Live Hero Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative aspect-4/3 sm:aspect-square w-full rounded-2xl overflow-hidden border border-amber-300 shadow-lg bg-slate-900 min-h-[360px]">
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
                companionReaction="waving"
                companionMessage={`Hi! Wave at me and I'll wave back!`}
              />

              {/* Floating Badge on stage */}
              <div className="absolute top-4 left-4 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-white/80 shadow-md flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-lg">
                  🐾
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">{activeCharacter.name}</h4>
                  <span className="text-[10px] font-bold text-amber-600">3D Articulated Buddy</span>
                </div>
              </div>

              {/* Switch Buddy CTA on Hero */}
              <button
                onClick={() => onNavigate('characters')}
                className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-lg shadow-amber-400/40 transition flex items-center gap-1.5"
              >
                <Smile className="w-4 h-4" />
                <span>Switch Buddy</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Quick Navigation Hub to All Pages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            Interactive AI Playground
          </span>
          <h2 className="text-3xl font-black text-slate-900">Explore MimicToon Modes</h2>
          <p className="text-sm font-bold text-slate-500">
            Everything your child needs to dance, giggle, exercise, and play!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Live Studio */}
          <motion.div
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('experience')}
            className="cursor-pointer p-6 rounded-3xl bg-white border-2 border-amber-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mb-4 shadow-inner">
              🪞
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Live Cartoon Studio</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Full 3-column stage: your webcam, your 3D buddy, and real-time AI status telemetry.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-amber-600">
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 2: Copy Me Game */}
          <motion.div
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('copyme')}
            className="cursor-pointer p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl mb-4 shadow-inner">
              🎮
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-200/80 px-2 py-0.5 rounded-full mb-1 inline-block">
                Hot Game Mode
              </span>
              <h3 className="text-lg font-black text-slate-900">"Copy Me" Challenge</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Your cartoon character shows a move. Can you match the pose and win stars?
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-orange-200/60 flex items-center justify-between text-xs font-black text-orange-700">
              <span>Play Now</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 3: Buddies Selection */}
          <motion.div
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('characters')}
            className="cursor-pointer p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-2xl mb-4 shadow-inner">
              🐾
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Meet The Buddies</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Choose Bunny, Bear, Fox, Cat, or Robot with custom personalities and idle moves!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-700">
              <span>Choose Buddy</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 4: Trophies & Progress */}
          <motion.div
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('progress')}
            className="cursor-pointer p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mb-4 shadow-inner">
              🏆
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Trophies & Badges</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Track stars collected ({stats.stars} ⭐), daily streaks ({stats.streakDays}d 🔥), and level milestones.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-700">
              <span>View Trophies</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Character Showcase Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="p-8 rounded-3xl bg-white border-2 border-amber-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Meet Your 3D Cartoon Friends</h3>
              <p className="text-xs font-bold text-slate-500">
                Click any character to preview their personality, voice, and special moves!
              </p>
            </div>
            <button
              onClick={() => onNavigate('characters')}
              className="px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1.5 transition"
            >
              <span>See Full Roster (5 Pals)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {CHARACTERS.map((char) => {
              const isCurrent = activeCharacter.id === char.id;
              return (
                <div
                  key={char.id}
                  onClick={() => {
                    playSoundEffect('click');
                    onSelectCharacter(char);
                  }}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition text-center space-y-2 ${
                    isCurrent
                      ? 'bg-amber-50 border-amber-400 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-inner"
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
                    <h4 className="text-sm font-black text-slate-900">{char.name}</h4>
                    <span className="text-[11px] font-bold text-amber-700">{char.species}</span>
                    <p className="text-[10px] font-medium text-slate-500 line-clamp-2 mt-0.5">
                      {char.tagline}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full inline-block">
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
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
              🛡️
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-emerald-950">
                100% Private, Safe & On-Device AI
              </h3>
              <p className="text-xs sm:text-sm font-bold text-emerald-800 mt-1 max-w-xl">
                Every frame of motion tracking runs right inside your child's browser using WebAssembly.
                Zero video is recorded, saved, or sent to any server.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="px-5 py-3 rounded-2xl bg-white border-2 border-emerald-300 text-emerald-900 font-black text-xs sm:text-sm shadow-xs hover:bg-emerald-50 transition shrink-0"
          >
            Settings & Safety Details
          </button>
        </div>
      </section>
    </div>
  );
};
