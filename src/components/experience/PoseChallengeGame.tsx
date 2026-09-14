import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Award, Flame, Star, Sparkles, CheckCircle2, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { CHALLENGE_POSES } from '../../data/characters';
import { AvatarKinematics, ChallengePose } from '../../types';
import { playSoundEffect } from '../../utils/audioEffects';

interface PoseChallengeGameProps {
  kinematics: AvatarKinematics;
  onAwardStars: (count: number) => void;
  streakDays: number;
}

export const PoseChallengeGame: React.FC<PoseChallengeGameProps> = ({
  kinematics,
  onAwardStars,
  streakDays,
}) => {
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [score, setScore] = useState(0);
  const [completedInRound, setCompletedInRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const holdStartRef = useRef<number | null>(null);
  const activePose: ChallengePose = CHALLENGE_POSES[currentPoseIndex];

  // Evaluate matching condition in real time
  useEffect(() => {
    if (!isPlaying || !activePose) return;

    const isMatch = activePose.targetCondition(kinematics);

    if (isMatch) {
      if (!isHolding) {
        setIsHolding(true);
        holdStartRef.current = performance.now();
      } else if (holdStartRef.current) {
        const elapsed = (performance.now() - holdStartRef.current) / 1000;
        const required = activePose.durationSeconds || 2.5;
        const progress = Math.min(100, (elapsed / required) * 100);
        setHoldProgress(progress);

        if (progress >= 100) {
          // Pose successfully completed!
          handlePoseSuccess();
        }
      }
    } else {
      if (isHolding) {
        setIsHolding(false);
        holdStartRef.current = null;
        setHoldProgress(0);
      }
    }
  }, [kinematics, isPlaying, isHolding, activePose]);

  const handlePoseSuccess = () => {
    playSoundEffect('fanfare');
    // Launch festive confetti celebration
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
      });
    } catch (_) {}

    const starsEarned = 15;
    onAwardStars(starsEarned);
    setScore((prev) => prev + activePose.points);
    setCompletedInRound((prev) => prev + 1);

    // Reset hold
    setIsHolding(false);
    holdStartRef.current = null;
    setHoldProgress(0);

    // Advance to next pose
    setTimeout(() => {
      setCurrentPoseIndex((prev) => (prev + 1) % CHALLENGE_POSES.length);
      playSoundEffect('star');
    }, 600);
  };

  const skipPose = () => {
    playSoundEffect('pop');
    setCurrentPoseIndex((prev) => (prev + 1) % CHALLENGE_POSES.length);
    setIsHolding(false);
    setHoldProgress(0);
  };

  const restartGame = () => {
    setCurrentPoseIndex(0);
    setScore(0);
    setCompletedInRound(0);
    setIsHolding(false);
    setHoldProgress(0);
    playSoundEffect('pop');
  };

  return (
    <div className="bg-white rounded-3xl p-5 border-3 border-amber-200 shadow-md space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">Pose Challenge Game</h3>
            <p className="text-xs text-slate-500 font-medium">
              Copy the cartoon pose and hold it to score stars!
            </p>
          </div>
        </div>

        {/* Score & Combo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#FEF7E8] border border-[#FBE2A8] px-3 py-1 rounded-full text-xs font-black text-amber-900 shadow-xs">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>{score} pts</span>
          </div>

          <button
            onClick={restartGame}
            className="p-1.5 text-[#988F85] hover:text-[#23201D] hover:bg-[#F4EFE6] rounded-xl transition"
            title="Restart Challenge"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Pose Card */}
      <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E6DED3] shadow-product space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#E6DED3] shadow-xs flex items-center justify-center text-3xl shrink-0 animate-bounce">
            {activePose.icon}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FDF0EB] text-[#E76F51] border border-[#F7CEC3]">
                Challenge #{currentPoseIndex + 1}
              </span>
              <span className="text-xs font-black text-[#E76F51]">+{activePose.points} Points</span>
            </div>
            <h4 className="text-lg font-black text-[#23201D] pt-0.5 font-display">{activePose.title}</h4>
          </div>
        </div>

        <p className="text-xs text-[#6C655E] font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-[#E6DED3]">
          {activePose.instruction}
        </p>

        {/* Hold Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className={isHolding ? 'text-[#2D8A56] font-extrabold' : 'text-[#988F85]'}>
              {isHolding ? '🔥 Great! Keep holding the pose!' : 'Waiting for matching pose...'}
            </span>
            <span className="text-[#23201D]">{Math.round(holdProgress)}%</span>
          </div>

          <div className="h-3.5 bg-white rounded-full overflow-hidden border border-[#E6DED3] p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                isHolding
                  ? 'bg-[#2D8A56]'
                  : 'bg-[#E6DED3]'
              }`}
              style={{ width: `${holdProgress}%` }}
            />
          </div>
        </div>

        {/* Skip button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={skipPose}
            className="text-xs font-bold text-slate-500 hover:text-amber-700 flex items-center gap-1 transition cursor-pointer"
          >
            <span>Try next pose</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
