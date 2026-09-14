import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  Flame,
  Award,
  ArrowLeft,
  Bot,
  Mic,
  Gamepad2,
  Smile,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Avatar3DStage } from '../experience/Avatar3DStage';
import { WebcamTracker } from '../experience/WebcamTracker';
import { AIStatusPanel, AIAnimatedState } from '../experience/AIStatusPanel';
import { CharacterSelector as AvatarCharacterSelector } from '../avatar/CharacterSelector';
import { CompanionStateMachine } from '../companion/CompanionStateMachine';
import { CompanionDialogueEngine } from '../companion/CompanionDialogueEngine';
import { CartoonVoiceProcessor } from '../../utils/CartoonVoiceProcessor';
import {
  CharacterProfile,
  PoseLandmarks,
  AvatarKinematics,
  BodyMotion,
  StudioSettings,
  UserStats,
  VoiceEffect,
  AppPage,
} from '../../types';
import { FaceSignals, AvatarFacePose, HandSignals } from '../../types/avatar';
import { CompanionState, CompanionReactionType } from '../../types/companion';
import { solveKinematics } from '../../utils/poseMath';
import { playSoundEffect } from '../../utils/audioEffects';

interface LiveExperiencePageProps {
  activeCharacter: CharacterProfile;
  onSelectCharacter: (char: CharacterProfile) => void;
  settings: StudioSettings;
  onUpdateSettings: (settings: Partial<StudioSettings>) => void;
  stats: UserStats;
  onAwardStars: (count: number) => void;
  onNavigate: (page: AppPage) => void;
}

export const LiveExperiencePage: React.FC<LiveExperiencePageProps> = ({
  activeCharacter,
  onSelectCharacter,
  settings,
  onUpdateSettings,
  stats,
  onAwardStars,
  onNavigate,
}) => {
  // Kinematics & Tracking
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
  const [mouthOpenLevel, setMouthOpenLevel] = useState<number>(0);

  // Audio & Voice States
  const [isMicActive, setIsMicActive] = useState<boolean>(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isCharacterSpeaking, setIsCharacterSpeaking] = useState<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isChildSpeakingRef = useRef<boolean>(false);
  const [characterReply, setCharacterReply] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Companion State Machine
  const [companionState, setCompanionState] = useState<CompanionState>(CompanionState.IDLE);
  const [companionReaction, setCompanionReaction] = useState<CompanionReactionType>('none');
  const [companionBlend, setCompanionBlend] = useState<number>(1.0);
  const [companionMessage, setCompanionMessage] = useState<string>('');

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customModelUrl, setCustomModelUrl] = useState<string | undefined>(undefined);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [lastSuccessTime, setLastSuccessTime] = useState<number>(0);
  const lastScoreTimeRef = useRef<number>(0);
  const prevKinematicsRef = useRef<AvatarKinematics | null>(null);

  // Companion State Machine Instance
  const companionStateMachine = useMemo(() => {
    return new CompanionStateMachine(activeCharacter, {
      onReaction: (event) => {
        setCompanionReaction(event.reaction);
        setCompanionMessage(event.message);
      },
    });
  }, []);

  useEffect(() => {
    companionStateMachine.setCharacter(activeCharacter);
  }, [activeCharacter, companionStateMachine]);

  useEffect(() => {
    isSpeakingRef.current = isCharacterSpeaking;
  }, [isCharacterSpeaking]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec && settings.speechRecognitionEnabled) {
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          if (interim) {
            isChildSpeakingRef.current = true;
          }

          if (final) {
            const clean = final.trim();
            isChildSpeakingRef.current = false;
            handleChildSpeech(clean);
          }
        };

        rec.onerror = () => {};
        rec.onend = () => {
          if (isMicActive && !isSpeakingRef.current) {
            try {
              rec.start();
            } catch (_) {}
          }
        };

        if (isMicActive) {
          try {
            rec.start();
          } catch (_) {}
        }
        recognitionRef.current = rec;
      } catch (err) {
        console.warn('Speech recognition fallback:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [isMicActive, settings.speechRecognitionEnabled]);

  // Microphone Audio Level Tracker
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let animId: number;

    const initAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        let lastAudioThrottle = 0;
        const loop = () => {
          if (!analyser) return;
          const now = performance.now();
          if (now - lastAudioThrottle >= 100) {
            lastAudioThrottle = now;
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / data.length / 255;
            setAudioLevel(avg);
          }
          animId = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.warn('Audio metering fallback:', e);
      }
    };

    initAudio();
    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioContext) audioContext.close().catch(() => {});
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Continuous Companion Update Tick Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const res = companionStateMachine.update({
        time: now / 1000,
        delta,
        kinematics,
        motion: currentMotion,
        facePose: currentFacePose,
        handSignals: currentHandSignals,
        isChildSpeaking: isChildSpeakingRef.current,
        isCharacterSpeaking: isSpeakingRef.current,
        mouthOpenLevel,
      });

      setCompanionState(res.state);
      setCompanionReaction(res.reaction);
      setCompanionBlend(res.blend);
      setCompanionMessage(companionStateMachine.getCurrentMessage());

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [companionStateMachine, kinematics, currentMotion, currentFacePose, currentHandSignals, mouthOpenLevel]);

  // Handle child speech with intelligent cartoon dialogue
  const handleChildSpeech = (speech: string) => {
    companionStateMachine.handleSpeechInput(speech);
    const reply = CompanionDialogueEngine.generateResponse(speech, activeCharacter);
    setCharacterReply(reply);
    setCompanionMessage(reply);
    speakCartoonDialogue(reply);
  };

  const speakCartoonDialogue = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = activeCharacter.voicePitch || 1.4;
    utterance.rate = 1.05;

    let mouthInterval: any = null;
    utterance.onstart = () => {
      setIsCharacterSpeaking(true);
      mouthInterval = setInterval(() => {
        setMouthOpenLevel(0.3 + Math.random() * 0.7);
      }, 90);
    };

    const cleanup = () => {
      setIsCharacterSpeaking(false);
      if (mouthInterval) clearInterval(mouthInterval);
      setMouthOpenLevel(0);
    };

    utterance.onend = cleanup;
    utterance.onerror = cleanup;
    window.speechSynthesis.speak(utterance);
  };

  // Tracking Callbacks
  const handleMotionDetected = (motion: BodyMotion) => {
    prevKinematicsRef.current = motion.kinematics;
    setKinematics(motion.kinematics);
    setCurrentMotion(motion);

    // Reward points for active poses like waving or jumping (rate limited to once per 1.5s)
    if (motion.kinematics.isWavingLeft || motion.kinematics.isWavingRight || motion.kinematics.jumpOffset > 0.08) {
      const now = Date.now();
      if (now - lastScoreTimeRef.current > 1500) {
        lastScoreTimeRef.current = now;
        setSessionScore((s) => s + 2);
      }
    }
  };

  const handleLandmarksDetected = (landmarks: PoseLandmarks | null) => {
    setCurrentLandmarks(landmarks);
    const solved = solveKinematics(landmarks, prevKinematicsRef.current, settings.smoothingFactor);
    prevKinematicsRef.current = solved;
    setKinematics(solved);
  };

  const handleFaceSignalsDetected = (signals: FaceSignals | null) => {
    setCurrentFaceSignals(signals);
    if (signals && !isSpeakingRef.current) {
      setMouthOpenLevel(signals.mouthOpen);
    }
    if (signals && (signals.isSmiling ?? signals.mouthSmile > 0.4) && Date.now() - lastSuccessTime > 4000) {
      setLastSuccessTime(Date.now());
      onAwardStars(1);
      setSessionScore((s) => s + 5);
      playSoundEffect('star');
    }
  };

  const handleFacePoseDetected = (pose: AvatarFacePose) => {
    setCurrentFacePose(pose);
    if (pose.isDetected && !isSpeakingRef.current) {
      setMouthOpenLevel(pose.mouthOpen);
    }
  };

  const handleTriggerQuickAction = (action: 'wave' | 'cheer' | 'laugh' | 'jump' | 'joke' | 'compliment') => {
    playSoundEffect('pop');
    let msg = '';
    switch (action) {
      case 'wave':
        msg = `Hi superhero! I'm waving right back at you! 👋`;
        setCompanionReaction('waving');
        break;
      case 'cheer':
        msg = `Hooray! You are doing absolutely amazing! 🎉`;
        setCompanionReaction('cheering');
        break;
      case 'laugh':
        msg = `Hahaha! That tickles! You're hilarious! 😆`;
        setCompanionReaction('laughing');
        break;
      case 'jump':
        msg = `Wheee! Let's jump to the moon! 🦘`;
        setCompanionReaction('excited');
        break;
      case 'joke':
        msg = `What do you call a sleeping dinosaur? A dino-snore! 🦖💤`;
        setCompanionReaction('laughing');
        break;
      case 'compliment':
        msg = `You've got the best smile in the whole universe! 🌟`;
        setCompanionReaction('excited');
        break;
    }
    setCompanionMessage(msg);
    setCharacterReply(msg);
    speakCartoonDialogue(msg);
  };

  // Derive Animated State for AI Status Panel
  const animatedState: AIAnimatedState = useMemo(() => {
    if (!currentMotion && !currentFaceSignals) return 'loading';
    if (currentMotion && currentMotion.confidence < 0.2) return 'error';
    if (isCharacterSpeaking) return 'speaking';
    if (Date.now() - lastSuccessTime < 2500) return 'success';
    if (audioLevel > 0.08 || isChildSpeakingRef.current) return 'listening';
    return 'tracking';
  }, [currentMotion, currentFaceSignals, isCharacterSpeaking, lastSuccessTime, audioLevel]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('landing')}
            className="p-2.5 rounded-lg bg-white border border-[#E6DED3] text-[#23201D] hover:bg-[#F8F4EC] transition shadow-2xs flex items-center gap-2 text-xs font-black cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </motion.button>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#23201D] tracking-tight flex items-center gap-2">
              <span>Live Cartoon Mirror</span>
              <span className="text-xl">🪞</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#6C655E]">
              Move your arms, tilt your head, and talk — {activeCharacter.name} mimics you in real time!
            </p>
          </div>
        </div>

        {/* Quick Mode Jumpers & Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('copyme')}
            className="px-4 py-2 rounded-lg bg-[#E76F51] hover:bg-[#D85D3F] text-white font-black text-xs sm:text-sm shadow-tactile-coral flex items-center gap-1.5 transition cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Copy Me Game! 🎮</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('characters')}
            className="px-3.5 py-2 rounded-lg bg-white border border-[#E6DED3] hover:bg-[#F8F4EC] text-[#23201D] font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Smile className="w-4 h-4 text-[#E76F51]" />
            <span className="hidden sm:inline">Change Buddy</span>
          </motion.button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white border border-[#E6DED3] text-[#6C655E] hover:text-[#23201D] hover:bg-[#F8F4EC] transition shadow-2xs cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 
        3-COLUMN LIVE EXPERIENCE LAYOUT:
        LEFT: Webcam / child (md:col-span-4 lg:col-span-4)
        CENTER: Cartoon avatar (md:col-span-4 lg:col-span-5)
        RIGHT: AI status (md:col-span-4 lg:col-span-3)
      */}
      <div className="live-experience-grid grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-5 items-start">
        {/* ================= COLUMN 1 (LEFT): WEBCAM / CHILD ================= */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-[#23201D] flex items-center gap-1.5">
              <span>🎥 You (Child Feed)</span>
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            </span>
            <span className="text-[11px] font-bold text-[#6C655E]">Live AI Vision</span>
          </div>

          <div className="relative rounded-2xl overflow-hidden border-2 border-[#E6DED3] shadow-product-lg bg-[#1E1B18]">
            <WebcamTracker
              onMotionDetected={handleMotionDetected}
              onLandmarksDetected={handleLandmarksDetected}
              onFaceSignalsDetected={handleFaceSignalsDetected}
              onFacePoseDetected={handleFacePoseDetected}
              onHandSignalsDetected={setCurrentHandSignals}
              isMirrored={settings.mirrorCamera}
              onToggleMirror={() => onUpdateSettings({ mirrorCamera: !settings.mirrorCamera })}
              showSkeleton={settings.showSkeletonOverlay}
              onToggleSkeleton={() => onUpdateSettings({ showSkeletonOverlay: !settings.showSkeletonOverlay })}
              smoothingFactor={settings.smoothingFactor}
            />
          </div>

          {/* Vision Telemetry Bar */}
          <div className="p-3 rounded-xl bg-white border border-[#E6DED3] shadow-product flex items-center justify-between text-xs font-bold text-[#6C655E]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-[#23201D]">Pose: {currentMotion ? 'Locked' : 'Searching'}</span>
            </div>
            <span>Confidence: {Math.round((currentMotion?.confidence || 0) * 100)}%</span>
          </div>
        </div>

        {/* ================= COLUMN 2 (CENTER): CARTOON AVATAR ================= */}
        <div className="md:col-span-4 lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-[#23201D] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E76F51]" />
              <span>{activeCharacter.name} (3D Articulated)</span>
            </span>
            <span className="text-[11px] font-black text-[#C04F34] bg-[#FDF0EB] border border-[#F7CEC3] px-2 py-0.5 rounded-md">
              Real-time Mimic
            </span>
          </div>

          <div className="w-full aspect-4/3 min-h-[380px] sm:min-h-[440px] rounded-2xl overflow-hidden border-2 border-[#E6DED3] shadow-product-lg bg-[#1E1B18]">
            <Avatar3DStage
              character={activeCharacter}
              kinematics={kinematics}
              motion={currentMotion}
              faceSignals={currentFaceSignals}
              facePose={currentFacePose}
              handSignals={currentHandSignals}
              themeEnvironment={settings.themeEnvironment}
              mouthOpenLevel={mouthOpenLevel}
              smoothingFactor={settings.smoothingFactor}
              movementSensitivity={settings.movementSensitivity ?? 1.0}
              confidenceThreshold={settings.confidenceThreshold ?? 0.45}
              isMirrored={settings.mirrorCamera}
              customModelUrl={customModelUrl}
              onThemeChange={(theme) => onUpdateSettings({ themeEnvironment: theme as any })}
              onUpdateSettings={onUpdateSettings}
              companionState={companionState}
              companionReaction={companionReaction}
              companionBlend={companionBlend}
              companionMessage={companionMessage}
            />
          </div>

          {/* Quick Character Picker Strip */}
          <div className="bg-white p-3 rounded-2xl border border-[#E6DED3] shadow-product">
            <AvatarCharacterSelector
              selectedCharacter={activeCharacter}
              onSelectCharacter={onSelectCharacter}
              customModelUrl={customModelUrl}
              onSelectCustomModel={setCustomModelUrl}
            />
          </div>
        </div>

        {/* ================= COLUMN 3 (RIGHT): AI STATUS ================= */}
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <AIStatusPanel
            animatedState={animatedState}
            isCameraActive={true}
            cameraFps={60}
            isMirrored={settings.mirrorCamera}
            onToggleMirror={() => onUpdateSettings({ mirrorCamera: !settings.mirrorCamera })}
            showSkeleton={settings.showSkeletonOverlay}
            onToggleSkeleton={() => onUpdateSettings({ showSkeletonOverlay: !settings.showSkeletonOverlay })}
            isMicActive={isMicActive}
            audioLevel={audioLevel}
            onToggleMic={() => setIsMicActive(!isMicActive)}
            activeVoiceEffect={settings.activeVoiceEffect}
            onChangeVoiceEffect={(fx) => onUpdateSettings({ activeVoiceEffect: fx })}
            isBodyTracked={Boolean(currentMotion && currentMotion.confidence > 0.25)}
            bodyConfidence={currentMotion?.confidence || 0}
            faceSignals={currentFaceSignals}
            handSignals={currentHandSignals}
            stats={stats}
            score={sessionScore}
            streakCount={stats.streakDays}
            companionState={companionState}
            companionReaction={companionReaction}
            companionMessage={companionMessage}
            onTriggerQuickAction={handleTriggerQuickAction}
          />
        </div>
      </div>
    </div>
  );
};
