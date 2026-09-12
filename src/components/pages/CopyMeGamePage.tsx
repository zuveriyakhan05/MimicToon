import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import { Avatar3DStage } from '../experience/Avatar3DStage';
import { WebcamTracker } from '../experience/WebcamTracker';
import { GameUI } from '../../game/GameUI';
import {
  CharacterProfile,
  PoseLandmarks,
  AvatarKinematics,
  BodyMotion,
  StudioSettings,
  UserStats,
  AppPage,
  GameSessionResult,
} from '../../types';
import { FaceSignals, AvatarFacePose, HandSignals } from '../../types/avatar';
import { solveKinematics } from '../../utils/poseMath';
import { playSoundEffect } from '../../utils/audioEffects';

interface CopyMeGamePageProps {
  activeCharacter: CharacterProfile;
  settings: StudioSettings;
  onUpdateSettings: (settings: Partial<StudioSettings>) => void;
  stats: UserStats;
  onAwardStars: (count: number) => void;
  onNavigate: (page: AppPage) => void;
  onFinishGameSession: (result: GameSessionResult) => void;
}

export const CopyMeGamePage: React.FC<CopyMeGamePageProps> = React.memo(({
  activeCharacter,
  settings,
  onUpdateSettings,
  stats,
  onAwardStars,
  onNavigate,
  onFinishGameSession,
}) => {
  const [kinematics, setKinematics] = useState<AvatarKinematics>({
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    leftArmAngle: 0.3,
    rightArmAngle: 0.3,
    leftForearmAngle: 0.2,
    rightForearmAngle: 0.2,
    torsoLean: 0,
    torsoTwist: 0,
    jumpOffset: 0,
    isWavingLeft: false,
    isWavingRight: false,
    isHandsUp: false,
    isCrouching: false,
    mouthOpen: 0,
    isBlinking: false,
  });

  const [currentMotion, setCurrentMotion] = useState<BodyMotion | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<PoseLandmarks | null>(null);
  const [currentFaceSignals, setCurrentFaceSignals] = useState<FaceSignals | null>(null);
  const [currentFacePose, setCurrentFacePose] = useState<AvatarFacePose | null>(null);
  const [currentHandSignals, setCurrentHandSignals] = useState<HandSignals | null>(null);
  const [gameDemoKinematics, setGameDemoKinematics] = useState<AvatarKinematics | null>(null);

  const prevKinematicsRef = useRef<AvatarKinematics | null>(null);

  // Tracking callbacks
  const handleMotionDetected = (motion: BodyMotion) => {
    prevKinematicsRef.current = motion.kinematics;
    setKinematics(motion.kinematics);
    setCurrentMotion(motion);
  };

  const handleLandmarksDetected = (landmarks: PoseLandmarks | null) => {
    setCurrentLandmarks(landmarks);
    const solved = solveKinematics(landmarks, prevKinematicsRef.current, settings.smoothingFactor);
    prevKinematicsRef.current = solved;
    setKinematics(solved);
  };

  const handleViewResults = () => {
    playSoundEffect('star');
    const mockSessionResult: GameSessionResult = {
      score: 420,
      starsEarned: 15,
      xpEarned: 350,
      streakDays: stats.streakDays + 1,
      posesCompleted: stats.posesCompleted + 3,
      armAccuracy: 95,
      bodyAccuracy: 91,
      headAccuracy: 88,
      characterName: activeCharacter.name,
      characterAvatar: activeCharacter.id,
      feedbackTitle: 'Outstanding Mimic Master!',
      feedbackMessage: `You matched ${activeCharacter.name}'s moves with 92% average precision!`,
      date: new Date().toLocaleDateString(),
    };
    onFinishGameSession(mockSessionResult);
    onNavigate('results');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('experience')}
            className="p-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-sm flex items-center gap-2 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Studio</span>
          </motion.button>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>"Copy Me" Game Arena</span>
              <span className="text-2xl">🎮</span>
            </h1>
            <p className="text-xs font-bold text-slate-500">
              Watch {activeCharacter.name} demonstrate the move, then strike the matching pose!
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleViewResults}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition"
        >
          <Trophy className="w-4 h-4" />
          <span>Finish & View Results 🏆</span>
        </motion.button>
      </div>

      {/* Main Dual Stage (3D Character Demo + Live Child Vision + Scoring Engine) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Articulated Cartoon Avatar Stage (Demonstrator) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>{activeCharacter.name} (Demonstrator)</span>
            </span>
            <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              {gameDemoKinematics ? 'Demonstrating Move 🎬' : 'Observing You 👁️'}
            </span>
          </div>

          <div className="w-full aspect-4/3 min-h-[380px] sm:min-h-[460px] rounded-2xl overflow-hidden border border-amber-300 shadow-lg bg-slate-900">
            <Avatar3DStage
              character={activeCharacter}
              kinematics={gameDemoKinematics || kinematics}
              motion={currentMotion}
              faceSignals={currentFaceSignals}
              facePose={currentFacePose}
              handSignals={currentHandSignals}
              themeEnvironment={settings.themeEnvironment}
              mouthOpenLevel={0}
              smoothingFactor={settings.smoothingFactor}
              movementSensitivity={settings.movementSensitivity ?? 1.0}
              confidenceThreshold={settings.confidenceThreshold ?? 0.45}
              isMirrored={settings.mirrorCamera}
              companionReaction={gameDemoKinematics ? 'excited' : 'none'}
              companionMessage={
                gameDemoKinematics ? 'Watch carefully! Can you copy me?' : 'Now your turn! Strike the pose!'
              }
            />
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 flex items-center justify-between text-xs font-bold text-slate-600 shadow-sm">
            <span className="flex items-center gap-2 font-black text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Game Rules:</span>
            </span>
            <span>Hold the target pose steady for 2 seconds until the meter fills up! ⭐</span>
          </div>
        </div>

        {/* Right Column: Webcam Vision + Real-time Scoring HUD */}
        <div className="lg:col-span-5 space-y-4">
          {/* Webcam Vision Node */}
          <div className="relative rounded-3xl overflow-hidden border-3 border-slate-200 shadow-md bg-slate-950">
            <WebcamTracker
              onMotionDetected={handleMotionDetected}
              onLandmarksDetected={handleLandmarksDetected}
              onFaceSignalsDetected={setCurrentFaceSignals}
              onFacePoseDetected={setCurrentFacePose}
              onHandSignalsDetected={setCurrentHandSignals}
              isMirrored={settings.mirrorCamera}
              onToggleMirror={() => onUpdateSettings({ mirrorCamera: !settings.mirrorCamera })}
              showSkeleton={settings.showSkeletonOverlay}
              onToggleSkeleton={() => onUpdateSettings({ showSkeletonOverlay: !settings.showSkeletonOverlay })}
              smoothingFactor={settings.smoothingFactor}
            />
          </div>

          {/* Copy Me Game Engine UI */}
          <GameUI
            activeCharacter={activeCharacter}
            kinematics={kinematics}
            motion={currentMotion}
            landmarks={currentLandmarks}
            facePose={currentFacePose}
            handSignals={currentHandSignals}
            onAwardStars={onAwardStars}
            onDemoKinematicsChange={setGameDemoKinematics}
          />
        </div>
      </div>
    </div>
  );
});
