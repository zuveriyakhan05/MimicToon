import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Trophy,
  Star,
  Flame,
  Zap,
  RotateCcw,
  SkipForward,
  Play,
  Pause,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Eye,
  CheckCircle2,
  Smile,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameEngine } from './GameEngine';
import {
  CopyMeChallenge,
  DifficultyLevel,
  GamePhase,
  ScoreBreakdown,
  GameConfig,
  GameAwards,
} from './types';
import { AvatarKinematics, BodyMotion, CharacterProfile, PoseLandmarks } from '../types';
import { AvatarFacePose, HandSignals } from '../types/avatar';
import { playSoundEffect } from '../utils/audioEffects';

export interface GameUIProps {
  activeCharacter: CharacterProfile;
  kinematics: AvatarKinematics;
  motion: BodyMotion | null;
  landmarks: PoseLandmarks | null;
  facePose: AvatarFacePose | null;
  handSignals: HandSignals | null;
  onAwardStars?: (stars: number) => void;
  onDemoKinematicsChange?: (kinematics: AvatarKinematics | null) => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  activeCharacter,
  kinematics,
  motion,
  landmarks,
  facePose,
  handSignals,
  onAwardStars,
  onDemoKinematicsChange,
}) => {
  const [engine] = useState<GameEngine>(() => new GameEngine('easy'));
  const [phase, setPhase] = useState<GamePhase>('prompt');
  const [challenge, setChallenge] = useState<CopyMeChallenge>(() => engine.getCurrentChallenge());
  const [breakdown, setBreakdown] = useState<ScoreBreakdown>({
    armScore: 0,
    bodyScore: 0,
    headScore: 0,
    overallScore: 0,
    isMatching: false,
    feedbackNote: 'Look at your buddy and copy! 👀',
  });
  const [holdProgress, setHoldProgress] = useState(0);
  const [awards, setAwards] = useState<GameAwards>({
    xp: 0,
    stars: 0,
    streak: 1,
    points: 0,
    roundSuccessCount: 0,
  });
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<GameConfig>(() => engine.getConfig());
  const [isPlaying, setIsPlaying] = useState(true);

  // Success celebration ref
  const celebrationTriggeredRef = useRef(false);

  // Initialize and bind engine callbacks
  useEffect(() => {
    engine.start();

    // Voice announcement through Web Speech API if supported
    const speak = (text: string) => {
      if ('speechSynthesis' in window && config.enableVoicePrompts) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.pitch = activeCharacter.voicePitch || 1.25;
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch (_) {}
      }
    };

    // Update callbacks
    (engine as any).callbacks = {
      onPhaseChange: (newPhase: GamePhase) => {
        setPhase(newPhase);
        if (newPhase === 'success') {
          // Trigger joyful confetti
          try {
            confetti({
              particleCount: 65,
              spread: 70,
              origin: { y: 0.65 },
              colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'],
            });
          } catch (_) {}
        }
      },
      onChallengeChange: (newChallenge: CopyMeChallenge) => {
        setChallenge(newChallenge);
      },
      onScoreUpdate: (newBreakdown: ScoreBreakdown, newHoldProgress: number) => {
        setBreakdown(newBreakdown);
        setHoldProgress(newHoldProgress);
      },
      onSuccess: (_c: CopyMeChallenge, newAwards: GameAwards) => {
        setAwards(newAwards);
        if (onAwardStars) {
          onAwardStars(_c.starsReward);
        }
      },
      onDemoKinematics: (demoKine: AvatarKinematics | null) => {
        if (onDemoKinematicsChange) {
          onDemoKinematicsChange(demoKine);
        }
      },
      onSpeakText: speak,
    };

    return () => {
      engine.pause();
      if (onDemoKinematicsChange) onDemoKinematicsChange(null);
    };
  }, [engine, activeCharacter, onAwardStars, onDemoKinematicsChange, config.enableVoicePrompts]);

  // Continuous animation frame tick loop for real-time scoring
  useEffect(() => {
    let animId: number;

    const tick = () => {
      if (isPlaying) {
        const res = engine.update(motion, landmarks, kinematics, facePose, handSignals);
        setPhase(res.phase);
        setBreakdown(res.breakdown);
        setHoldProgress(res.holdProgress);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [engine, isPlaying, motion, landmarks, kinematics, facePose, handSignals]);

  // Difficulty change handler
  const handleDifficultySelect = (diff: DifficultyLevel) => {
    setDifficulty(diff);
    engine.setDifficulty(diff);
    setConfig(engine.getConfig());
    playSoundEffect('pop');
  };

  // Config sliders update
  const handleUpdateConfig = (newVals: Partial<GameConfig>) => {
    engine.updateConfig(newVals);
    setConfig(engine.getConfig());
  };

  // Skip challenge
  const handleSkip = () => {
    engine.skipChallenge();
    playSoundEffect('pop');
  };

  // Replay demo
  const handleReplayDemo = () => {
    engine.replayDemo();
    playSoundEffect('pop');
  };

  // Toggle pause/play
  const handleTogglePlay = () => {
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      engine.start();
      setIsPlaying(true);
    }
    playSoundEffect('pop');
  };

  // Helper colors for percentage scores
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (score >= 80) return 'text-blue-700 bg-blue-50 border-blue-300';
    if (score >= 70) return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E6DED3] p-4 sm:p-5 shadow-product space-y-4">
      {/* Top Header & Stats Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6DED3] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-[#F8F4EC] border border-[#E6DED3] flex items-center justify-center text-xl shadow-2xs">
            {challenge.emoji}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#23201D]">Copy Me!</h3>
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-[#FDF0EB] text-[#C04F34] border border-[#F7CEC3] capitalize">
                {difficulty}
              </span>
            </div>
            <p className="text-xs font-medium text-[#6C655E]">
              Watch {activeCharacter.name}, then copy the pose!
            </p>
          </div>
        </div>

        {/* Awards Counter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF7E8] border border-[#FBE2A8] text-xs font-bold text-[#23201D] shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-[#D49826]" />
            <span>{awards.points} pts</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF7E8] border border-[#FBE2A8] text-xs font-black text-[#916212] shadow-2xs">
            <Star className="w-3.5 h-3.5 fill-[#F2C66D] text-[#D49826]" />
            <span>+{awards.stars}</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDF0EB] border border-[#F7CEC3] text-xs font-bold text-[#C04F34] shadow-2xs">
            <Flame className="w-3.5 h-3.5 text-[#E76F51] fill-[#E76F51]" />
            <span>{awards.streak} Streak</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F8F4EC] border border-[#E6DED3] text-xs font-bold text-[#23201D] shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-[#E76F51]" />
            <span>{awards.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Primary Character Prompt Banner */}
      <div
        className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-between gap-4 ${
          phase === 'success'
            ? 'bg-[#EBF7F0] border-[#BFE3CD] shadow-product'
            : phase === 'demo'
            ? 'bg-[#FEF7E8] border-[#FBE2A8] shadow-product'
            : phase === 'prompt'
            ? 'bg-[#FDF0EB] border-[#F7CEC3] shadow-product'
            : 'bg-[#F8F4EC] border-[#E6DED3] shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-2xs ${
              phase === 'success'
                ? 'bg-[#2D8A56] text-white animate-bounce'
                : phase === 'demo'
                ? 'bg-[#E76F51] text-white animate-pulse'
                : 'bg-[#23201D] text-white'
            }`}
          >
            {phase === 'success' ? '🎉' : phase === 'demo' ? '👀' : challenge.emoji}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-[#23201D] border border-[#E6DED3]">
                {phase === 'prompt' && 'Step 1: Character says'}
                {phase === 'demo' && 'Step 2: Watch buddy move'}
                {phase === 'observe' && 'Step 3: Your turn to copy!'}
                {phase === 'success' && 'Step 4: Celebration!'}
              </span>
              <span className="text-xs font-black text-[#23201D]">{challenge.name}</span>
            </div>

            <h2 className="text-sm sm:text-base font-black text-[#23201D] mt-0.5">
              {phase === 'prompt' && '“Can you copy me?”'}
              {phase === 'demo' && `“Watch me: ${challenge.name}!”`}
              {phase === 'observe' && challenge.speechInstruction}
              {phase === 'success' && challenge.successMessage}
            </h2>
          </div>
        </div>

        {/* Phase Action Pill */}
        <div className="hidden sm:flex flex-col items-end">
          {phase === 'demo' && (
            <span className="text-xs font-black text-[#C04F34] bg-white px-2.5 py-1 rounded-lg border border-[#F7CEC3]">
              Demonstrating... 👀
            </span>
          )}
          {phase === 'observe' && (
            <span className="text-xs font-black text-[#23201D] bg-white px-2.5 py-1 rounded-lg border border-[#E6DED3]">
              Holding: {Math.round(holdProgress)}%
            </span>
          )}
          {phase === 'success' && (
            <span className="text-xs font-black text-[#226D43] bg-white px-2.5 py-1 rounded-lg border border-[#BFE3CD] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D8A56]" />
              <span>Perfect! +{challenge.points}pts</span>
            </span>
          )}
        </div>
      </div>

      {/* Real-time Pose Similarity Score Cards (0 to 100%) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#23201D] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#E76F51]" />
            <span>AI Real-Time Pose Matching:</span>
          </span>
          <span className="text-xs font-medium text-[#6C655E]">
            Target Match: <strong className="text-[#23201D]">{config.similarityThreshold}%</strong>
          </span>
        </div>

        {/* 4 Score Breakdown Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Arm Position */}
          <div className={`p-2.5 rounded-xl border transition shadow-2xs ${getScoreColor(breakdown.armScore)}`}>
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>🦾 Arm Position</span>
              <span className="font-black text-sm">{breakdown.armScore}%</span>
            </div>
            <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 rounded-full ${getProgressBarColor(breakdown.armScore)}`}
                style={{ width: `${breakdown.armScore}%` }}
              />
            </div>
          </div>

          {/* Body Position */}
          <div className={`p-2.5 rounded-xl border transition shadow-2xs ${getScoreColor(breakdown.bodyScore)}`}>
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>🧍 Body Position</span>
              <span className="font-black text-sm">{breakdown.bodyScore}%</span>
            </div>
            <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 rounded-full ${getProgressBarColor(breakdown.bodyScore)}`}
                style={{ width: `${breakdown.bodyScore}%` }}
              />
            </div>
          </div>

          {/* Head Position */}
          <div className={`p-2.5 rounded-xl border transition shadow-2xs ${getScoreColor(breakdown.headScore)}`}>
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>🗣️ Head Position</span>
              <span className="font-black text-sm">{breakdown.headScore}%</span>
            </div>
            <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 rounded-full ${getProgressBarColor(breakdown.headScore)}`}
                style={{ width: `${breakdown.headScore}%` }}
              />
            </div>
          </div>

          {/* Overall Score */}
          <div
            className={`p-2.5 rounded-xl border transition shadow-2xs ${
              breakdown.isMatching
                ? 'bg-[#EBF7F0] border-[#BFE3CD] text-[#194D31] font-black'
                : 'bg-[#FAF6EE] border-[#E6DED3] text-[#23201D]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>🌟 Overall Score</span>
              <span className="font-black text-base">{breakdown.overallScore}%</span>
            </div>
            <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 rounded-full ${
                  breakdown.isMatching ? 'bg-[#2D8A56]' : 'bg-[#E76F51]'
                }`}
                style={{ width: `${breakdown.overallScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hold Duration Meter */}
      <div className="bg-[#F8F4EC] p-3 rounded-xl border border-[#E6DED3] space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#6C655E] flex items-center gap-1.5">
            <span>Hold Duration Target:</span>
            <span className="text-[#23201D] font-black">{config.completionDuration}s</span>
          </span>
          <span className="font-black text-[#23201D]">
            {breakdown.feedbackNote}
          </span>
        </div>

        <div className="w-full bg-[#E6DED3] rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              holdProgress >= 100
                ? 'bg-[#2D8A56]'
                : holdProgress > 0
                ? 'bg-[#E76F51]'
                : 'bg-transparent'
            }`}
            style={{ width: `${holdProgress}%` }}
          />
        </div>
      </div>

      {/* Interactive Controls & Difficulty Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Difficulty Selectors */}
        <div className="flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl border border-[#E6DED3] text-xs font-bold">
          {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => handleDifficultySelect(level)}
              className={`px-3 py-1 rounded-lg transition capitalize cursor-pointer ${
                difficulty === level
                  ? 'bg-white text-[#23201D] font-black shadow-xs border border-[#DFD6CA]'
                  : 'text-[#6C655E] hover:text-[#23201D] border border-transparent'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReplayDemo}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#E6DED3] text-xs font-bold text-[#23201D] hover:bg-[#F8F4EC] transition shadow-2xs flex items-center gap-1 cursor-pointer"
            title="Watch character demonstrate again"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Replay Demo</span>
          </button>

          <button
            onClick={handleSkip}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1"
            title="Skip to next challenge"
          >
            <SkipForward className="w-3.5 h-3.5 text-slate-500" />
            <span>Skip</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition shadow-2xs ${
              showSettings
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Threshold Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Configurable Thresholds Drawer */}
      {showSettings && (
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3 text-xs">
          <div className="flex items-center justify-between font-black text-amber-900">
            <span>⚙️ Configurable Scoring & Thresholds</span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Similarity Threshold */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Pose Similarity Threshold:</span>
                <span className="text-amber-900 font-black">{config.similarityThreshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                step="2"
                value={config.similarityThreshold}
                onChange={(e) => handleUpdateConfig({ similarityThreshold: Number(e.target.value) })}
                className="w-full accent-amber-600"
              />
            </div>

            {/* Minimum Confidence */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Minimum Confidence:</span>
                <span className="text-amber-900 font-black">{Math.round(config.minConfidence * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.05"
                value={config.minConfidence}
                onChange={(e) => handleUpdateConfig({ minConfidence: Number(e.target.value) })}
                className="w-full accent-amber-600"
              />
            </div>

            {/* Completion Duration */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Completion Duration:</span>
                <span className="text-amber-900 font-black">{config.completionDuration}s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.2"
                value={config.completionDuration}
                onChange={(e) => handleUpdateConfig({ completionDuration: Number(e.target.value) })}
                className="w-full accent-amber-600"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
