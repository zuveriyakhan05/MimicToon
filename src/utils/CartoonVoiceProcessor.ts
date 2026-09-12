import { VoiceEffect, CharacterProfile } from '../types';

export type VADStatus = 'idle' | 'listening' | 'speaking' | 'processing' | 'responding';

export interface VADCallbacks {
  onStatusChange?: (status: VADStatus) => void;
  onAudioLevel?: (level: number) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: (audioBlob?: Blob) => void;
}

/**
 * CartoonVoiceProcessor
 * Professional Web Audio API engine providing:
 * 1. Safe microphone capture with echo cancellation & noise suppression
 * 2. Voice Activity Detection (VAD) with adaptive noise threshold
 * 3. Web Audio processing pipeline:
 *    - Real-time pitch adjustment (playback rate & formant filter curves)
 *    - Playful modulation (LFO vibrato/tremolo)
 *    - Mountain echo (Delay + feedback gain)
 *    - Robot vocoder resonance (Bandpass + harmonics)
 * 4. Acoustic feedback prevention (mutes mic input during avatar responses)
 * 5. Visualizer frequency & waveform data extraction for 60fps canvas rendering
 */
export class CartoonVoiceProcessor {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private monitorGain: GainNode | null = null;
  private isEffectsEnabled = true;
  private activeEffect: VoiceEffect = 'chipmunk';
  private isMonitoring = false;
  private isMuted = false;

  // Voice Activity Detection (VAD) State
  private vadStatus: VADStatus = 'idle';
  private callbacks: VADCallbacks = {};
  private noiseFloor = 0.02;
  private speechThreshold = 0.065;
  private consecutiveSpeechFrames = 0;
  private consecutiveSilenceFrames = 0;
  private isSpeaking = false;
  private animFrameId: number | null = null;

  // Audio Snippet Recording for Cartoon Playback
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Active Playback Source (for stopping early if needed)
  private currentPlaybackSource: AudioBufferSourceNode | null = null;
  private isPlaybackActive = false;

  constructor(callbacks?: VADCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Request microphone access gracefully and set up Web Audio processing graph
   */
  public async start(): Promise<MediaStream> {
    return this.startMicrophone();
  }

  public async startMicrophone(): Promise<MediaStream> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Capture microphone with browser-level echo cancellation and noise suppression
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.sourceNode = ctx.createMediaStreamSource(this.stream);

    // Analyser Node for VAD, lip sync mouth animation, and 60fps Visualizer
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.6;

    // Filter Node for cartoon frequency shaping
    this.filterNode = ctx.createBiquadFilter();

    // Echo Delay & Feedback Loop
    this.delayNode = ctx.createDelay();
    this.delayNode.delayTime.value = 0.16;
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.value = 0.3;

    // LFO for Playful Modulation (Vibrato / Wobble)
    this.lfoOsc = ctx.createOscillator();
    this.lfoOsc.type = 'sine';
    this.lfoOsc.frequency.value = 8.0; // 8 Hz cartoon wobble
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 250; // frequency modulation depth

    // Connect LFO to filter frequency for modulation effect
    this.lfoOsc.connect(this.lfoGain);
    this.lfoGain.connect(this.filterNode.frequency);
    try {
      this.lfoOsc.start();
    } catch (_) {}

    // Live speaker monitoring gain (default 0 to prevent acoustic loopback/howling)
    this.monitorGain = ctx.createGain();
    this.monitorGain.gain.value = 0.0;

    // Connect processing chain
    this.sourceNode.connect(this.analyserNode);
    this.sourceNode.connect(this.filterNode);

    // Echo routing
    this.filterNode.connect(this.delayNode);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.feedbackGain.connect(this.monitorGain);

    this.filterNode.connect(this.monitorGain);
    this.monitorGain.connect(ctx.destination);

    // Apply currently active effect settings
    this.applyEffect(this.activeEffect, this.isEffectsEnabled);

    // Setup MediaRecorder for snippet capture
    this.setupMediaRecorder();

    // Start VAD sampling loop
    this.isMuted = false;
    this.updateStatus('listening');
    this.startVADLoop();

    return this.stream;
  }

  private setupMediaRecorder(): void {
    if (!this.stream) return;
    try {
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.recordedChunks = [];
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd(audioBlob);
        }
      };
    } catch (e) {
      console.warn('MediaRecorder setup note:', e);
    }
  }

  /**
   * Continuous Voice Activity Detection (VAD) loop running on requestAnimationFrame
   */
  private startVADLoop(): void {
    const loop = () => {
      if (this.isMuted || !this.analyserNode) {
        if (this.callbacks.onAudioLevel) this.callbacks.onAudioLevel(0);
        this.animFrameId = requestAnimationFrame(loop);
        return;
      }

      // If character is currently speaking/playing audio, pause mic VAD to prevent echo loopback
      if (this.isPlaybackActive) {
        this.animFrameId = requestAnimationFrame(loop);
        return;
      }

      const level = this.getAudioLevel();
      if (this.callbacks.onAudioLevel) {
        this.callbacks.onAudioLevel(level);
      }

      // Adaptive noise floor tracking
      if (level < this.noiseFloor) {
        this.noiseFloor = this.noiseFloor * 0.95 + level * 0.05;
      } else {
        this.noiseFloor = this.noiseFloor * 0.999 + level * 0.001;
      }
      const activeThreshold = Math.max(this.speechThreshold, this.noiseFloor * 2.5);

      // Voice Activity State Machine
      if (level > activeThreshold) {
        this.consecutiveSpeechFrames++;
        this.consecutiveSilenceFrames = 0;

        if (this.consecutiveSpeechFrames >= 3 && !this.isSpeaking) {
          this.isSpeaking = true;
          this.updateStatus('speaking');
          if (this.callbacks.onSpeechStart) {
            this.callbacks.onSpeechStart();
          }

          // Start capturing audio snippet for cartoon playback
          if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
            this.recordedChunks = [];
            try {
              this.mediaRecorder.start();
            } catch (_) {}
          }
        }
      } else {
        this.consecutiveSilenceFrames++;
        this.consecutiveSpeechFrames = 0;

        // After ~750ms of continuous silence (approx 45 frames at 60fps), consider utterance ended
        if (this.consecutiveSilenceFrames >= 45 && this.isSpeaking) {
          this.isSpeaking = false;
          this.updateStatus('processing');

          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            try {
              this.mediaRecorder.stop();
            } catch (_) {}
          } else {
            if (this.callbacks.onSpeechEnd) {
              this.callbacks.onSpeechEnd();
            }
          }
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateStatus(status: VADStatus): void {
    this.vadStatus = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  /**
   * Returns current VAD status
   */
  public getStatus(): VADStatus {
    return this.vadStatus;
  }

  /**
   * Set status externally (e.g. when character starts or finishes speaking)
   */
  public setStatus(status: VADStatus): void {
    this.updateStatus(status);
  }

  /**
   * Get instantaneous audio level (0.0 to 1.0)
   */
  public getAudioLevel(): number {
    if (!this.analyserNode) return 0;
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / data.length);
    // Scale for responsive cartoon mouth movement
    return Math.min(1, rms * 4.8);
  }

  /**
   * Extracts waveform time-domain data for 60fps canvas visualizer
   */
  public getWaveformData(dataArray: Uint8Array): void {
    if (!this.analyserNode) return;
    this.analyserNode.getByteTimeDomainData(dataArray);
  }

  /**
   * Extracts frequency spectrum data for visualizer bars
   */
  public getFrequencyData(dataArray: Uint8Array): void {
    if (!this.analyserNode) return;
    this.analyserNode.getByteFrequencyData(dataArray);
  }

  /**
   * Configure Web Audio processing pipeline based on chosen effect
   */
  public applyEffect(effect: VoiceEffect, enabled = true): void {
    this.activeEffect = effect;
    this.isEffectsEnabled = enabled;

    if (!this.filterNode || !this.feedbackGain || !this.lfoGain || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (!enabled || effect === 'normal') {
      this.filterNode.type = 'allpass';
      this.filterNode.frequency.setTargetAtTime(1000, now, 0.05);
      this.filterNode.Q.setTargetAtTime(1, now, 0.05);
      this.feedbackGain.gain.setTargetAtTime(0.0, now, 0.05);
      this.lfoGain.gain.setTargetAtTime(0.0, now, 0.05);
      return;
    }

    switch (effect) {
      case 'chipmunk':
        // High-pass with boost in child resonance band
        this.filterNode.type = 'highpass';
        this.filterNode.frequency.setTargetAtTime(1200, now, 0.05);
        this.filterNode.Q.setTargetAtTime(3.2, now, 0.05);
        this.feedbackGain.gain.setTargetAtTime(0.0, now, 0.05);
        this.lfoGain.gain.setTargetAtTime(80, now, 0.05); // subtle playful wobble
        break;

      case 'robot':
        // Narrow resonant bandpass comb
        this.filterNode.type = 'bandpass';
        this.filterNode.frequency.setTargetAtTime(950, now, 0.05);
        this.filterNode.Q.setTargetAtTime(8.5, now, 0.05);
        this.feedbackGain.gain.setTargetAtTime(0.2, now, 0.05);
        this.lfoGain.gain.setTargetAtTime(0.0, now, 0.05);
        break;

      case 'baby':
        // Sweet bell curve emphasizing bright vocal formants
        this.filterNode.type = 'peaking';
        this.filterNode.frequency.setTargetAtTime(1900, now, 0.05);
        this.filterNode.Q.setTargetAtTime(2.2, now, 0.05);
        this.filterNode.gain.setTargetAtTime(8.0, now, 0.05);
        this.feedbackGain.gain.setTargetAtTime(0.0, now, 0.05);
        this.lfoGain.gain.setTargetAtTime(50, now, 0.05);
        break;

      case 'echo':
        // Rich spatial cartoon echo
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setTargetAtTime(3200, now, 0.05);
        this.feedbackGain.gain.setTargetAtTime(0.42, now, 0.05);
        this.lfoGain.gain.setTargetAtTime(0.0, now, 0.05);
        break;

      default:
        this.filterNode.type = 'allpass';
        this.feedbackGain.gain.setTargetAtTime(0.0, now, 0.05);
        this.lfoGain.gain.setTargetAtTime(0.0, now, 0.05);
        break;
    }
  }

  /**
   * Toggle cartoon voice effects on or off
   */
  public setEffectsEnabled(enabled: boolean): void {
    this.applyEffect(this.activeEffect, enabled);
  }

  public getEffectsEnabled(): boolean {
    return this.isEffectsEnabled;
  }

  /**
   * Mute / Unmute microphone input
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (muted) {
      this.updateStatus('idle');
      if (this.callbacks.onAudioLevel) this.callbacks.onAudioLevel(0);
    } else {
      this.updateStatus('listening');
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Speaker monitoring (hear processed voice in real-time)
   */
  public setMonitoring(enabled: boolean): void {
    this.isMonitoring = enabled;
    if (!this.monitorGain || !this.ctx) return;
    this.monitorGain.gain.setTargetAtTime(enabled ? 0.65 : 0.0, this.ctx.currentTime, 0.05);
  }

  public getMonitoring(): boolean {
    return this.isMonitoring;
  }

  /**
   * Plays back child's recorded voice with genuine Web Audio pitch adjustment & effects
   * Returns a promise that resolves when playback finishes.
   * During playback, onMouthLevel drives the avatar's mouth lip-sync!
   */
  public async playProcessedSnippet(
    audioBlob: Blob,
    effect: VoiceEffect,
    character: CharacterProfile,
    onMouthLevel?: (level: number) => void
  ): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.isPlaybackActive = true;
    this.updateStatus('responding');

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Stop any existing playback
      if (this.currentPlaybackSource) {
        try {
          this.currentPlaybackSource.stop();
        } catch (_) {}
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      this.currentPlaybackSource = source;

      // Determine pitch adjustment factor based on character & effect
      let pitchFactor = character.voicePitch || 1.15;
      if (effect === 'chipmunk') pitchFactor = 1.45;
      else if (effect === 'robot') pitchFactor = 0.92;
      else if (effect === 'baby') pitchFactor = 1.35;
      else if (effect === 'echo') pitchFactor = 1.05;
      else if (effect === 'normal') pitchFactor = 1.0;

      // Apply pitch via Web Audio playbackRate
      source.playbackRate.value = pitchFactor;

      // Playback Analyser for avatar lip-sync mouth animation
      const playbackAnalyser = ctx.createAnalyser();
      playbackAnalyser.fftSize = 128;

      // Playback Filter & Echo Chain
      const playbackFilter = ctx.createBiquadFilter();
      const playbackGain = ctx.createGain();
      playbackGain.gain.value = 0.9;

      if (effect === 'robot') {
        playbackFilter.type = 'bandpass';
        playbackFilter.frequency.value = 1000;
        playbackFilter.Q.value = 6.0;
      } else if (effect === 'chipmunk') {
        playbackFilter.type = 'highpass';
        playbackFilter.frequency.value = 600;
      } else {
        playbackFilter.type = 'allpass';
      }

      source.connect(playbackFilter);
      playbackFilter.connect(playbackAnalyser);
      playbackAnalyser.connect(playbackGain);
      playbackGain.connect(ctx.destination);

      // Echo support for playback if echo effect is active
      if (effect === 'echo') {
        const delay = ctx.createDelay();
        delay.delayTime.value = 0.2;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.35;
        playbackFilter.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        feedback.connect(playbackGain);
      }

      // Drive lip sync animation during playback
      let lipSyncAnimId: number | null = null;
      const animateLipSync = () => {
        if (!this.isPlaybackActive) return;
        const data = new Uint8Array(playbackAnalyser.frequencyBinCount);
        playbackAnalyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const val = (data[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(1, rms * 5.0);
        if (onMouthLevel) onMouthLevel(level);

        lipSyncAnimId = requestAnimationFrame(animateLipSync);
      };
      lipSyncAnimId = requestAnimationFrame(animateLipSync);

      await new Promise<void>((resolve) => {
        source.onended = () => {
          if (lipSyncAnimId) cancelAnimationFrame(lipSyncAnimId);
          if (onMouthLevel) onMouthLevel(0);
          resolve();
        };
        source.start(0);
      });
    } catch (err) {
      console.warn('Processed playback error:', err);
    } finally {
      this.isPlaybackActive = false;
      this.currentPlaybackSource = null;
      this.updateStatus('listening');
      if (onMouthLevel) onMouthLevel(0);
    }
  }

  /**
   * Speak via SpeechSynthesis with avatar mouth lip sync and character voice pitch
   */
  public speakText(
    text: string,
    character: CharacterProfile,
    onMouthLevel?: (level: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      this.isPlaybackActive = true;
      this.updateStatus('responding');

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = character.voicePitch; // High cheerful pitch
        utterance.rate = 1.1;

        let mouthAnimId: number | null = null;
        const startLipSync = () => {
          let step = 0;
          const loop = () => {
            if (!this.isPlaybackActive) return;
            step += 0.25;
            // Fun rhythmic cartoon mouth bounce
            const mouthLevel = Math.max(0.1, (Math.sin(step) * 0.5 + 0.5) * 0.85);
            if (onMouthLevel) onMouthLevel(mouthLevel);
            mouthAnimId = requestAnimationFrame(loop);
          };
          mouthAnimId = requestAnimationFrame(loop);
        };

        utterance.onstart = () => {
          startLipSync();
        };

        utterance.onend = () => {
          if (mouthAnimId) cancelAnimationFrame(mouthAnimId);
          if (onMouthLevel) onMouthLevel(0);
          this.isPlaybackActive = false;
          this.updateStatus('listening');
          resolve();
        };

        utterance.onerror = () => {
          if (mouthAnimId) cancelAnimationFrame(mouthAnimId);
          if (onMouthLevel) onMouthLevel(0);
          this.isPlaybackActive = false;
          this.updateStatus('listening');
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (_) {
        this.isPlaybackActive = false;
        this.updateStatus('listening');
        resolve();
      }
    });
  }

  /**
   * Clean up all microphone streams, AudioContext nodes, and animation frames
   */
  public stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.currentPlaybackSource) {
      try {
        this.currentPlaybackSource.stop();
      } catch (_) {}
      this.currentPlaybackSource = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try { this.analyserNode.disconnect(); } catch (_) {}
      this.analyserNode = null;
    }

    if (this.filterNode) {
      try { this.filterNode.disconnect(); } catch (_) {}
      this.filterNode = null;
    }

    if (this.delayNode) {
      try { this.delayNode.disconnect(); } catch (_) {}
      this.delayNode = null;
    }

    if (this.feedbackGain) {
      try { this.feedbackGain.disconnect(); } catch (_) {}
      this.feedbackGain = null;
    }

    if (this.lfoGain) {
      try { this.lfoGain.disconnect(); } catch (_) {}
      this.lfoGain = null;
    }

    if (this.monitorGain) {
      try { this.monitorGain.disconnect(); } catch (_) {}
      this.monitorGain = null;
    }

    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
      } catch (_) {}
      try { this.lfoOsc.disconnect(); } catch (_) {}
      this.lfoOsc = null;
    }

    this.isSpeaking = false;
    this.isPlaybackActive = false;
    this.updateStatus('idle');
  }

  /**
   * Completely disposes audio context and all nodes
   */
  public dispose(): void {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch (_) {}
      this.ctx = null;
    }
  }
}
