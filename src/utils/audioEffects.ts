import { VoiceEffect } from '../types';

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Procedural synthesizers for playful sound effects (no external audio files needed)
 */
export function playSoundEffect(type: 'pop' | 'star' | 'fanfare' | 'woosh' | 'cheer' | 'click') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'pop' || type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'star') {
      // Friendly high ping chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.42);
      });
    } else if (type === 'fanfare') {
      // Victory progression
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.12;
        const dur = idx === notes.length - 1 ? 0.6 : 0.15;
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      });
    } else if (type === 'woosh') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    console.warn('Audio playback not allowed or failed:', err);
  }
}

/**
 * Creates live microphone processor graph with cartoon effects and volume analyzer
 */
export class CartoonVoiceEngine {
  private ctx: AudioContext;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;
  private outputGain: GainNode | null = null;
  private isMuted = false;
  private effect: VoiceEffect = 'chipmunk';

  constructor() {
    this.ctx = getAudioContext();
  }

  public async startMicrophone(): Promise<MediaStream> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    // Filter node for voice frequency shaping
    this.filterNode = this.ctx.createBiquadFilter();
    
    // Echo delay nodes
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.18;
    this.feedbackGain = this.ctx.createGain();
    this.feedbackGain.gain.value = 0.35;

    this.outputGain = this.ctx.createGain();
    // Default output volume (lowered slightly to avoid acoustic feedback in live preview)
    this.outputGain.gain.value = 0.0; // By default muted to prevent speaker feedback, can be enabled by user in settings

    // Wire up basic audio pipeline
    this.source.connect(this.analyser);
    this.source.connect(this.filterNode);
    this.filterNode.connect(this.outputGain);
    
    // Feedback loop for echo
    this.filterNode.connect(this.delayNode);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.feedbackGain.connect(this.outputGain);

    this.outputGain.connect(this.ctx.destination);
    this.applyEffect(this.effect);

    return this.stream;
  }

  public applyEffect(effect: VoiceEffect) {
    this.effect = effect;
    if (!this.filterNode || !this.feedbackGain) return;

    const now = this.ctx.currentTime;
    switch (effect) {
      case 'chipmunk':
        // High-pass + peak boost in high presence
        this.filterNode.type = 'highpass';
        this.filterNode.frequency.setTargetAtTime(1100, now, 0.05);
        this.filterNode.Q.setTargetAtTime(3.0, now, 0.05);
        this.feedbackGain.gain.setTargetAtTime(0.0, now, 0.05);
        break;
      case 'robot':
        // Bandpass robotic telephone effect
        this.filterNode.type = 'bandpass';
        this.filterNode.frequency.setTargetAtTime(900, now, 0.05);
        this.filterNode.Q.setTargetAtTime(8.0, now, 0.05);
        this.feedbackGain.gain.setTargetAtTime(0.15, now, 0.05);
        break;
      case 'baby':
        // Bright bell-like vocal curve
        this.filterNode.type = 'peaking';
        this.filterNode.frequency.setTargetAtTime(1800, now, 0.05);
        this.filterNode.Q.setTargetAtTime(2.0, now, 0.05);
        this.feedbackGain.gain.setTargetAtTime(0.0, now, 0.05);
        break;
      case 'echo':
        this.filterNode.type = 'allpass';
        this.feedbackGain.gain.setTargetAtTime(0.45, now, 0.05);
        break;
      case 'normal':
      default:
        this.filterNode.type = 'allpass';
        this.feedbackGain.gain.setTargetAtTime(0.0, now, 0.05);
        break;
    }
  }

  public setMonitoring(enabled: boolean) {
    if (!this.outputGain) return;
    this.outputGain.gain.setTargetAtTime(enabled ? 0.7 : 0.0, this.ctx.currentTime, 0.05);
  }

  /**
   * Returns normalized RMS volume 0.0 -> 1.0 for avatar lip sync mouth animation
   */
  public getAudioLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / data.length);
    // Amplify slightly for responsive mouth opening
    return Math.min(1, rms * 4.5);
  }

  public stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
  }
}
