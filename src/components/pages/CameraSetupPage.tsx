import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Mic,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sun,
  ShieldCheck,
  Volume2,
  RefreshCw,
  Eye,
  Sliders,
  Play,
} from 'lucide-react';
import { WebcamTracker } from '../experience/WebcamTracker';
import { Avatar3DStage } from '../experience/Avatar3DStage';
import { CharacterProfile, AppPage, StudioSettings } from '../../types';
import { BodyMotion, PoseLandmarks } from '../../types';
import { FaceSignals, HandSignals } from '../../types/avatar';
import { playSoundEffect } from '../../utils/audioEffects';

interface CameraSetupPageProps {
  activeCharacter: CharacterProfile;
  settings: StudioSettings;
  onUpdateSettings: (settings: Partial<StudioSettings>) => void;
  onNavigate: (page: AppPage) => void;
}

export const CameraSetupPage: React.FC<CameraSetupPageProps> = ({
  activeCharacter,
  settings,
  onUpdateSettings,
  onNavigate,
}) => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isBodySeen, setIsBodySeen] = useState(false);
  const [isSmilingSeen, setIsSmilingSeen] = useState(false);
  const [isWavingSeen, setIsWavingSeen] = useState(false);
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [micPassedTest, setMicPassedTest] = useState(false);

  // Calibration Motion State
  const [currentMotion, setCurrentMotion] = useState<BodyMotion | null>(null);
  const [faceSignals, setFaceSignals] = useState<FaceSignals | null>(null);
  const [handSignals, setHandSignals] = useState<HandSignals | null>(null);

  // Microphone audio meter
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let animId: number;

    const startMic = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length / 255;
          setMicAudioLevel(avg);
          if (avg > 0.08) {
            setMicPassedTest(true);
          }
          animId = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      } catch (err) {
        console.warn('Microphone setup fallback:', err);
      }
    };

    startMic();
    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioContext) audioContext.close().catch(() => {});
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleMotionDetected = (motion: BodyMotion) => {
    setCurrentMotion(motion);
    setIsCameraReady(true);
    if (motion.confidence > 0.3) {
      setIsBodySeen(true);
    }
    if (motion.kinematics.isWavingLeft || motion.kinematics.isWavingRight) {
      setIsWavingSeen(true);
    }
  };

  const handleFaceSignals = (signals: FaceSignals | null) => {
    setFaceSignals(signals);
    if (signals && (signals.isSmiling ?? signals.mouthSmile > 0.4)) {
      setIsSmilingSeen(true);
    }
  };

  const allChecksReady = isCameraReady && isBodySeen;

  const handleStartExperience = (destination: 'experience' | 'copyme') => {
    playSoundEffect('star');
    onNavigate(destination);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('characters')}
            className="p-2.5 rounded-lg bg-white border border-[#E6DED3] text-[#23201D] hover:bg-[#F8F4EC] transition shadow-2xs flex items-center gap-2 text-xs font-black cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Characters</span>
          </motion.button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#23201D] tracking-tight flex items-center gap-2.5">
              <span>Camera & Magic Check</span>
              <span className="text-2xl">🪄</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#6C655E]">
              Let's make sure your cartoon buddy can see your smiles, waves, and jumps!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStartExperience('copyme')}
            className="px-4 py-2.5 rounded-lg bg-white hover:bg-[#F8F4EC] text-[#23201D] font-extrabold text-xs sm:text-sm border border-[#E6DED3] shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            <span>Play "Copy Me" 🎮</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStartExperience('experience')}
            className="px-5 py-2.5 rounded-lg bg-[#E76F51] hover:bg-[#D85D3F] text-white font-black text-xs sm:text-sm shadow-tactile-coral flex items-center gap-2 transition cursor-pointer"
          >
            <span>Enter Live Studio</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Main Dual Stage (Live Camera Mirror + Buddy Reaction Test) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Live Webcam Mirror with Overlays */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border-2 border-[#E6DED3] shadow-product-lg bg-[#1E1B18]">
            <WebcamTracker
              onMotionDetected={handleMotionDetected}
              onLandmarksDetected={() => {}}
              onFaceSignalsDetected={handleFaceSignals}
              onFacePoseDetected={() => {}}
              onHandSignalsDetected={setHandSignals}
              isMirrored={settings.mirrorCamera}
              onToggleMirror={() => onUpdateSettings({ mirrorCamera: !settings.mirrorCamera })}
              showSkeleton={settings.showSkeletonOverlay}
              onToggleSkeleton={() => onUpdateSettings({ showSkeletonOverlay: !settings.showSkeletonOverlay })}
              smoothingFactor={settings.smoothingFactor}
            />

            {/* Quick Calibration Bar at bottom of camera */}
            <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-black/80 border border-white/15 text-white flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span>Live Feed Active</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateSettings({ mirrorCamera: !settings.mirrorCamera })}
                  className="px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-[11px] transition cursor-pointer"
                >
                  {settings.mirrorCamera ? '🪞 Mirrored' : 'Normal'}
                </button>
                <button
                  onClick={() => onUpdateSettings({ showSkeletonOverlay: !settings.showSkeletonOverlay })}
                  className="px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-[11px] transition cursor-pointer"
                >
                  {settings.showSkeletonOverlay ? '🦴 Skeleton On' : 'Skeleton Off'}
                </button>
              </div>
            </div>
          </div>

          {/* Room Lighting & Distance Friendly Tips */}
          <div className="p-4 rounded-xl bg-[#FEF7E8] border border-[#FBE2A8] shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#F2C66D] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sun className="w-5 h-5" />
            </div>
            <div className="text-xs font-medium text-[#23201D] leading-relaxed">
              <span className="font-black text-[#916212] block">Pro Tip for Best Tracking:</span>
              Sit or stand about 3 to 5 feet away so the camera can see your head, shoulders, and hands easily!
            </div>
          </div>
        </div>

        {/* Right: Interactive Calibration Checklist & Buddy Stage */}
        <div className="lg:col-span-6 space-y-5">
          {/* Buddy Mini Reaction Stage */}
          <div className="relative aspect-16/9 rounded-2xl overflow-hidden border-2 border-[#E6DED3] shadow-product bg-[#1E1B18]">
            <Avatar3DStage
              character={activeCharacter}
              kinematics={
                currentMotion?.kinematics || {
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
                  isWavingRight: isWavingSeen,
                  isHandsUp: false,
                  isCrouching: false,
                  mouthOpen: faceSignals?.mouthOpen || 0,
                  isBlinking: false,
                }
              }
              motion={currentMotion}
              faceSignals={faceSignals}
              facePose={null}
              handSignals={handSignals}
              themeEnvironment="playground"
              mouthOpenLevel={faceSignals?.mouthOpen || 0}
              smoothingFactor={0.2}
              movementSensitivity={settings.movementSensitivity}
              confidenceThreshold={settings.confidenceThreshold}
              isMirrored={settings.mirrorCamera}
              companionReaction={isSmilingSeen ? 'excited' : isWavingSeen ? 'waving' : 'none'}
              companionMessage={
                isWavingSeen
                  ? 'I see your wave! 👋'
                  : isSmilingSeen
                  ? 'Love that smile! 😄'
                  : `Watching you, let's test your moves!`
              }
            />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-white/95 border border-[#E6DED3] text-xs font-black text-[#23201D] flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#E76F51]" />
              <span>{activeCharacter.name} Mirror Check</span>
            </div>
          </div>

          {/* The Magic Checklist Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#E6DED3] shadow-product space-y-4">
            <h3 className="text-base font-black text-[#23201D] flex items-center justify-between">
              <span>Magic Readiness Checklist</span>
              <span className="text-xs font-black text-[#916212] bg-[#FEF7E8] px-2.5 py-1 rounded-md border border-[#FBE2A8]">
                {[isCameraReady, isBodySeen, isWavingSeen, isSmilingSeen, micPassedTest].filter(Boolean).length}/5 Checked
              </span>
            </h3>

            <div className="space-y-2.5">
              {/* Check 1: Camera Connected */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isCameraReady ? 'bg-[#EBF7F0] border-[#BFE3CD]' : 'bg-[#FAF6EE] border-[#E6DED3]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isCameraReady ? 'bg-[#2D8A56] text-white' : 'bg-[#E6DED3] text-[#6C655E]'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#23201D]">Camera Connected</div>
                    <div className="text-[11px] font-medium text-[#6C655E]">
                      {isCameraReady ? 'Webcam video streaming smoothly' : 'Allow browser camera permission'}
                    </div>
                  </div>
                </div>
                {isCameraReady && <CheckCircle2 className="w-5 h-5 text-[#2D8A56]" />}
              </div>

              {/* Check 2: Body Seen */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isBodySeen ? 'bg-[#EBF7F0] border-[#BFE3CD]' : 'bg-[#FAF6EE] border-[#E6DED3]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isBodySeen ? 'bg-[#2D8A56] text-white' : 'bg-[#E6DED3] text-[#6C655E]'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#23201D]">Upper Body Detected</div>
                    <div className="text-[11px] font-medium text-[#6C655E]">
                      {isBodySeen ? 'Shoulders and chest clearly visible' : 'Step back until your chest is visible'}
                    </div>
                  </div>
                </div>
                {isBodySeen && <CheckCircle2 className="w-5 h-5 text-[#2D8A56]" />}
              </div>

              {/* Check 3: Wave Test */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isWavingSeen ? 'bg-[#EBF7F0] border-[#BFE3CD]' : 'bg-[#FAF6EE] border-[#E6DED3]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      isWavingSeen ? 'bg-[#2D8A56] text-white' : 'bg-[#FEF7E8] border border-[#FBE2A8]'
                    }`}
                  >
                    <span>👋</span>
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#23201D]">Wave Your Hand</div>
                    <div className="text-[11px] font-medium text-[#6C655E]">
                      {isWavingSeen ? 'Great wave! Buddy waved back!' : 'Wave your hand at the camera!'}
                    </div>
                  </div>
                </div>
                {isWavingSeen ? (
                  <CheckCircle2 className="w-5 h-5 text-[#2D8A56]" />
                ) : (
                  <span className="text-[10px] font-black uppercase text-[#916212] bg-[#FEF7E8] px-2 py-0.5 rounded-md border border-[#FBE2A8]">
                    Try Waving!
                  </span>
                )}
              </div>

              {/* Check 4: Smile Test */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  isSmilingSeen ? 'bg-[#EBF7F0] border-[#BFE3CD]' : 'bg-[#FAF6EE] border-[#E6DED3]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      isSmilingSeen ? 'bg-[#2D8A56] text-white' : 'bg-[#FEF7E8] border border-[#FBE2A8]'
                    }`}
                  >
                    <span>😄</span>
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#23201D]">Big Bright Smile</div>
                    <div className="text-[11px] font-medium text-[#6C655E]">
                      {isSmilingSeen ? 'Super smile detected!' : 'Show your teeth in a big smile!'}
                    </div>
                  </div>
                </div>
                {isSmilingSeen ? (
                  <CheckCircle2 className="w-5 h-5 text-[#2D8A56]" />
                ) : (
                  <span className="text-[10px] font-black uppercase text-[#916212] bg-[#FEF7E8] px-2 py-0.5 rounded-md border border-[#FBE2A8]">
                    Give a Smile!
                  </span>
                )}
              </div>

              {/* Check 5: Microphone Test */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  micPassedTest ? 'bg-[#EBF7F0] border-[#BFE3CD]' : 'bg-[#FAF6EE] border-[#E6DED3]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      micPassedTest ? 'bg-[#2D8A56] text-white' : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#23201D]">Microphone Audio</div>
                    <div className="text-[11px] font-medium text-[#6C655E]">
                      {micPassedTest ? 'Audio heard loud & clear!' : 'Say "Hello Pip!" into your mic'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-[#E6DED3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2D8A56] transition-all duration-75"
                      style={{ width: `${Math.min(100, micAudioLevel * 300)}%` }}
                    />
                  </div>
                  {micPassedTest && <CheckCircle2 className="w-5 h-5 text-[#2D8A56]" />}
                </div>
              </div>
            </div>

            {/* Ready to go banner */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartExperience('experience')}
                className="w-full py-3.5 rounded-xl bg-[#2D8A56] hover:bg-[#226D43] text-white font-black text-sm sm:text-base shadow-tactile flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-5 h-5 fill-white text-[#BFE3CD]" />
                <span>Looks Perfect! Let's Go to the Studio! 🚀</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
