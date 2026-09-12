import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  MessageCircle,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
  Check,
  AlertCircle,
  Play,
  RotateCcw,
  Headphones,
} from 'lucide-react';
import { CartoonVoiceProcessor, VADStatus } from '../../utils/CartoonVoiceProcessor';
import { VoiceVisualizer } from './VoiceVisualizer';
import { playSoundEffect } from '../../utils/audioEffects';
import { VoiceEffect, CharacterProfile } from '../../types';

interface VoiceCartoonizerProps {
  onMouthLevelChange: (level: number) => void;
  activeCharacter: CharacterProfile;
  activeEffect: VoiceEffect;
  onChangeEffect: (effect: VoiceEffect) => void;
  onVoiceReaction: (message: string) => void;
}

export type InteractionMode = 'mimic' | 'chat';

export const VoiceCartoonizer: React.FC<VoiceCartoonizerProps> = ({
  onMouthLevelChange,
  activeCharacter,
  activeEffect,
  onChangeEffect,
  onVoiceReaction,
}) => {
  // Processor Reference
  const processorRef = useRef<CartoonVoiceProcessor | null>(null);
  const recognitionRef = useRef<any>(null);
  const isComponentMounted = useRef(true);

  // Microphone & Permission States
  const [micState, setMicState] = useState<'prompt' | 'active' | 'denied' | 'error'>('prompt');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // VAD & Real-Time Audio States
  const [vadStatus, setVadStatus] = useState<VADStatus>('idle');
  const [currentAudioLevel, setCurrentAudioLevel] = useState<number>(0);

  // Voice Effects & Controls
  const [isEffectsEnabled, setIsEffectsEnabled] = useState<boolean>(true);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('chat');
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [enableLiveMonitoring, setEnableLiveMonitoring] = useState<boolean>(false);

  // Speech Recognition & Transcript Display
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [childTranscript, setChildTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [characterReply, setCharacterReply] = useState<string>('');
  const [isCharacterSpeaking, setIsCharacterSpeaking] = useState<boolean>(false);

  // Cached last recorded audio snippet for instant re-play
  const lastAudioSnippetRef = useRef<Blob | null>(null);

  /**
   * Initialize CartoonVoiceProcessor and Web Speech API
   */
  useEffect(() => {
    isComponentMounted.current = true;

    // Check Web Speech API support gracefully
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      setSpeechSupported(true);
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
            setInterimTranscript(interim);
          }

          if (final) {
            const cleanFinal = final.trim();
            setChildTranscript(cleanFinal);
            setInterimTranscript('');
            handleChildSpeechReceived(cleanFinal);
          }
        };

        rec.onerror = (event: any) => {
          // Non-fatal speech recognition error (e.g. no-speech or network)
          if (event.error !== 'no-speech') {
            console.warn('Speech recognition notice:', event.error);
          }
        };

        rec.onend = () => {
          // Restart recognition if mic is active and character is not speaking
          if (isComponentMounted.current && micState === 'active' && !isMuted && !isCharacterSpeaking) {
            try {
              rec.start();
            } catch (_) {}
          }
        };

        recognitionRef.current = rec;
      } catch (e) {
        console.warn('Web Speech API initialization fallback:', e);
        setSpeechSupported(false);
      }
    } else {
      setSpeechSupported(false);
    }

    return () => {
      isComponentMounted.current = false;
      stopMicrophone();
    };
  }, []);

  /**
   * Gracefully starts microphone and VAD loop
   */
  const startMicrophone = async () => {
    setPermissionError(null);

    try {
      if (!processorRef.current) {
        processorRef.current = new CartoonVoiceProcessor({
          onStatusChange: (status) => {
            if (!isComponentMounted.current) return;
            setVadStatus(status);
          },
          onAudioLevel: (level) => {
            if (!isComponentMounted.current) return;
            setCurrentAudioLevel(level);
            // Drive avatar mouth directly when child speaks in live mode
            if (!isCharacterSpeaking) {
              onMouthLevelChange(level);
            }
          },
          onSpeechStart: () => {
            if (!isComponentMounted.current) return;
            // Clear prior response on new child speech
            setCharacterReply('');
          },
          onSpeechEnd: (audioBlob) => {
            if (!isComponentMounted.current) return;
            if (audioBlob) {
              lastAudioSnippetRef.current = audioBlob;
              // If in parrot mimic mode, play back child voice with cartoon pitch & filter!
              if (interactionMode === 'mimic') {
                triggerParrotMimicPlayback(audioBlob);
              }
            }
          },
        });
      }

      await processorRef.current.startMicrophone();
      setMicState('active');
      setIsMuted(false);
      playSoundEffect('pop');

      // Start Web Speech Recognition if available
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      }
    } catch (err: unknown) {
      console.warn('Microphone permission request error:', err);
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');

      if (isDenied) {
        setMicState('denied');
        setPermissionError(
          'Microphone permission was not allowed. Click the lock or camera icon in your browser URL bar to allow microphone access!'
        );
      } else {
        setMicState('error');
        setPermissionError('Could not start microphone. Make sure your microphone is connected.');
      }
    }
  };

  /**
   * Gracefully stops microphone and releases tracks
   */
  const stopMicrophone = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    if (processorRef.current) {
      processorRef.current.stop();
    }

    setMicState('prompt');
    setIsMuted(false);
    setVadStatus('idle');
    setCurrentAudioLevel(0);
    onMouthLevelChange(0);
    setIsCharacterSpeaking(false);
  }, [onMouthLevelChange]);

  /**
   * Toggle mute / unmute
   */
  const handleToggleMute = () => {
    if (!processorRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    processorRef.current.setMuted(nextMuted);

    if (nextMuted) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      onMouthLevelChange(0);
    } else {
      if (recognitionRef.current && !isCharacterSpeaking) {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      }
    }
    playSoundEffect('pop');
  };

  /**
   * Toggle cartoon effects on / off
   */
  const handleToggleEffects = () => {
    const nextEnabled = !isEffectsEnabled;
    setIsEffectsEnabled(nextEnabled);
    if (processorRef.current) {
      processorRef.current.setEffectsEnabled(nextEnabled);
    }
    playSoundEffect('pop');
  };

  /**
   * Update voice effect
   */
  const handleSelectEffect = (effect: VoiceEffect) => {
    onChangeEffect(effect);
    if (processorRef.current) {
      processorRef.current.applyEffect(effect, isEffectsEnabled);
    }
    playSoundEffect('pop');

    // If we have a cached audio snippet, test it immediately with the new effect!
    if (lastAudioSnippetRef.current && interactionMode === 'mimic') {
      triggerParrotMimicPlayback(lastAudioSnippetRef.current);
    }
  };

  /**
   * Mode A: Parrot Mimic - Replays child's recorded voice with Web Audio pitch adjustment & effects
   */
  const triggerParrotMimicPlayback = async (audioBlob: Blob) => {
    if (!processorRef.current || isSpeakerMuted) return;

    // Pause recognition to prevent acoustic loopback/feedback
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    setIsCharacterSpeaking(true);
    setCharacterReply(`Repeating your voice in ${activeEffect.toUpperCase()} cartoon pitch! 🦜`);
    playSoundEffect('star');

    await processorRef.current.playProcessedSnippet(
      audioBlob,
      isEffectsEnabled ? activeEffect : 'normal',
      activeCharacter,
      (level) => {
        onMouthLevelChange(level);
      }
    );

    setIsCharacterSpeaking(false);
    onMouthLevelChange(0);

    // Resume speech recognition
    if (recognitionRef.current && micState === 'active' && !isMuted) {
      try {
        recognitionRef.current.start();
      } catch (_) {}
    }
  };

  /**
   * Mode B: Buddy Chat - Character responds with contextual dialogue and TTS pitch
   */
  const handleChildSpeechReceived = async (phrase: string) => {
    const lower = phrase.toLowerCase();
    let reply = '';

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = `Hello, best buddy! I am ${activeCharacter.name}! Can you give me a high five or wave?`;
    } else if (lower.includes('dance') || lower.includes('party') || lower.includes('music')) {
      reply = `Dance party time! Shake your shoulders and hop around with me!`;
    } else if (lower.includes('jump') || lower.includes('hop') || lower.includes('bounce')) {
      reply = `Boing boing boing! Look at how high you can jump!`;
    } else if (lower.includes('joke') || lower.includes('funny')) {
      reply = `Why did the teddy bear say no to dessert? Because he was stuffed! Hehehe!`;
    } else if (lower.includes('love') || lower.includes('friend') || lower.includes('best')) {
      reply = `Awww, you are my favorite cartoon adventurer in the galaxy! 💖`;
    } else if (lower.includes('name') || lower.includes('who are you')) {
      reply = `I am ${activeCharacter.name}, the ${activeCharacter.tagline}!`;
    } else {
      reply = `Hehehe, that's awesome! "${phrase}"! Let's strike a funny hero pose together!`;
    }

    setCharacterReply(reply);
    onVoiceReaction(reply);
    playSoundEffect('star');

    // Speak character response if audio is not muted
    if (!isSpeakerMuted && processorRef.current) {
      // Pause speech recognition to avoid picking up the cartoon character's own speaker output
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }

      setIsCharacterSpeaking(true);

      await processorRef.current.speakText(reply, activeCharacter, (level) => {
        onMouthLevelChange(level);
      });

      setIsCharacterSpeaking(false);
      onMouthLevelChange(0);

      // Resume speech recognition after speech concludes
      if (recognitionRef.current && micState === 'active' && !isMuted) {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      }
    }
  };

  /**
   * Helper for quick child prompt chips (works on all devices including non-Speech API)
   */
  const handleQuickPromptClick = (promptText: string) => {
    setChildTranscript(promptText);
    playSoundEffect('pop');
    handleChildSpeechReceived(promptText);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border-3 border-amber-200 shadow-md space-y-4">
      {/* 1. Header with Controls & Mute */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl shadow-xs">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              <span>Cartoon Voice Modulator</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Live Interactive
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Talk into your mic to make {activeCharacter.name.split(' ')[0]} speak & lip-sync!
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {micState === 'active' && (
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                isMuted
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-emerald-600" />}
              <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          )}

          {/* Speaker Mute/Unmute */}
          <button
            onClick={() => {
              setIsSpeakerMuted(!isSpeakerMuted);
              playSoundEffect('pop');
            }}
            className={`p-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
              isSpeakerMuted
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title={isSpeakerMuted ? 'Unmute Cartoon Speaker' : 'Mute Cartoon Speaker'}
          >
            {isSpeakerMuted ? (
              <VolumeX className="w-4 h-4 text-amber-700" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-700" />
            )}
            <span className="hidden sm:inline">{isSpeakerMuted ? 'Muted' : 'Audio On'}</span>
          </button>

          {/* Main Enable/Disable Mic Button */}
          {micState !== 'active' ? (
            <button
              onClick={startMicrophone}
              className="px-4 py-2 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Enable Microphone</span>
            </button>
          ) : (
            <button
              onClick={stopMicrophone}
              className="px-3.5 py-2 rounded-xl font-black text-xs bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>Stop Voice</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Permission Prompt / Denied State */}
      {micState === 'prompt' && (
        <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              Click <strong>Enable Microphone</strong> to let your cartoon buddy hear your voice and talk back!
            </span>
          </div>
          <button
            onClick={startMicrophone}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-xs shrink-0 cursor-pointer"
          >
            Start Now
          </button>
        </div>
      )}

      {permissionError && (
        <div className="p-3 rounded-2xl bg-rose-50 text-rose-900 text-xs font-medium border border-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Microphone Access Notice</p>
            <p className="text-slate-600">{permissionError}</p>
          </div>
        </div>
      )}

      {/* 3. Real-Time Microphone Visualizer & Status HUD */}
      <VoiceVisualizer
        processor={processorRef.current}
        isActive={micState === 'active'}
        isMuted={isMuted}
        vadStatus={vadStatus}
        audioLevel={currentAudioLevel}
        character={activeCharacter}
      />

      {/* 4. Interaction Mode Selector (Parrot Mimic vs. Buddy Chat) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-black">
        <button
          onClick={() => {
            setInteractionMode('chat');
            playSoundEffect('pop');
          }}
          className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            interactionMode === 'chat'
              ? 'bg-white text-amber-900 shadow-xs border border-amber-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Buddy Chat Reaction 💬</span>
        </button>

        <button
          onClick={() => {
            setInteractionMode('mimic');
            playSoundEffect('pop');
          }}
          className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            interactionMode === 'mimic'
              ? 'bg-white text-rose-900 shadow-xs border border-rose-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
          <span>Repeat My Voice 🦜</span>
        </button>
      </div>

      {/* 5. Cartoon Voice Filter Picker with Enable/Disable Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            <span>Cartoon Voice Filters</span>
          </label>

          {/* Enable / Disable Effects Toggle */}
          <button
            onClick={handleToggleEffects}
            className={`px-2.5 py-1 rounded-lg text-xs font-black border transition flex items-center gap-1 cursor-pointer ${
              isEffectsEnabled
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <Check className={`w-3 h-3 ${isEffectsEnabled ? 'opacity-100' : 'opacity-0'}`} />
            <span>{isEffectsEnabled ? 'Effects Enabled' : 'Effects Disabled'}</span>
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {(
            [
              { id: 'chipmunk', label: 'Chipmunk', emoji: '🐿️', desc: 'High Pitch' },
              { id: 'robot', label: 'Robot', emoji: '🤖', desc: 'Metallic Vocoder' },
              { id: 'baby', label: 'Baby', emoji: '👶', desc: 'Sweet Formant' },
              { id: 'echo', label: 'Echo', emoji: '🏔️', desc: 'Mountain Delay' },
              { id: 'normal', label: 'Natural', emoji: '✨', desc: 'Clean Tone' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              disabled={!isEffectsEnabled && filter.id !== 'normal'}
              onClick={() => handleSelectEffect(filter.id)}
              className={`py-2 px-1 rounded-2xl text-center text-xs font-black border transition cursor-pointer ${
                activeEffect === filter.id && isEffectsEnabled
                  ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs ring-2 ring-amber-400/50'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              } ${!isEffectsEnabled && filter.id !== 'normal' ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className="text-xl mb-0.5">{filter.emoji}</div>
              <span className="text-[11px] block truncate font-black">{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6. Live Speech Transcript Display:
          Shows:
          🎤 Listening...
          "Hello!"
          Then:
          🐻 Cartoon character speaks.
      */}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
        {/* Child Spoken Words Box */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-black text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Mic className="w-3.5 h-3.5 text-emerald-600" />
              <span>You said:</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {speechSupported ? 'Web Speech Enabled' : 'Voice Energy VAD'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 text-sm font-bold min-h-[44px] flex items-center shadow-xs">
            {childTranscript ? (
              <span className="text-slate-900">
                &ldquo;<strong className="text-rose-600">{childTranscript}</strong>&rdquo;
              </span>
            ) : interimTranscript ? (
              <span className="text-slate-400 italic">
                &ldquo;{interimTranscript}...&rdquo;
              </span>
            ) : (
              <span className="text-slate-400 italic text-xs font-medium">
                {micState === 'active' && !isMuted
                  ? '🎤 Listening... speak into your microphone!'
                  : 'Turn on your microphone to begin speaking!'}
              </span>
            )}
          </div>
        </div>

        {/* Character Speaks Box */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-black text-slate-500">
            <span className="flex items-center gap-1.5 text-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{activeCharacter.name} responds:</span>
            </span>
            {isCharacterSpeaking && (
              <span className="text-[10px] font-black text-rose-500 uppercase animate-pulse flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                <span>Speaking Now...</span>
              </span>
            )}
          </div>

          <div
            className={`p-3 rounded-xl border text-sm font-bold min-h-[48px] flex items-center transition-all ${
              characterReply
                ? 'bg-amber-50/90 text-amber-950 border-amber-300 shadow-xs ring-1 ring-amber-200'
                : 'bg-white text-slate-400 border-slate-200 text-xs italic font-medium'
            }`}
          >
            {characterReply ? (
              <div className="flex items-start gap-2">
                <span className="text-lg shrink-0 mt-0.5">🐻</span>
                <span className="leading-snug">{characterReply}</span>
              </div>
            ) : (
              <span>Say &ldquo;Hello&rdquo; or click a prompt below to hear {activeCharacter.name.split(' ')[0]} talk!</span>
            )}
          </div>
        </div>

        {/* Quick Kid Speech Prompt Pills */}
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-500">
            ✨ Quick Child Prompts (click to speak):
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { text: 'Hello buddy!', emoji: '👋' },
              { text: "Let's dance!", emoji: '💃' },
              { text: 'Jump high!', emoji: '🐰' },
              { text: 'High five!', emoji: '🖐️' },
              { text: 'Tell me a joke!', emoji: '😂' },
            ].map((prompt) => (
              <button
                key={prompt.text}
                onClick={() => handleQuickPromptClick(prompt.text)}
                className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300 text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>{prompt.emoji}</span>
                <span>{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
