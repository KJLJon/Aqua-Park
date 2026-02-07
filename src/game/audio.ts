/**
 * AudioManager - Manages game audio using the Web Audio API.
 * Provides placeholder audio generation and settings control.
 * Uses simple oscillator-based sounds as royalty-free placeholders.
 */
import { GameSettings } from './types';

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private settings: GameSettings | null = null;
  private musicOscillator: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private isMusicPlaying = false;

  private constructor() {
    // Defer AudioContext creation until user interaction
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private getContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    return this.audioContext;
  }

  applySettings(settings: GameSettings): void {
    this.settings = settings;
    if (this.musicGain && this.audioContext) {
      const vol = settings.muted ? 0 : settings.masterVolume * settings.musicVolume;
      this.musicGain.gain.setValueAtTime(vol * 0.1, this.audioContext.currentTime);
    }
  }

  playMusic(): void {
    if (this.isMusicPlaying) return;
    const ctx = this.getContext();
    if (!ctx || this.settings?.muted) return;

    try {
      // Create a simple repeating melody using oscillators
      this.musicGain = ctx.createGain();
      const vol = this.settings ? this.settings.masterVolume * this.settings.musicVolume : 0.3;
      this.musicGain.gain.setValueAtTime(vol * 0.1, ctx.currentTime);
      this.musicGain.connect(ctx.destination);

      this.musicOscillator = ctx.createOscillator();
      this.musicOscillator.type = 'sine';
      this.musicOscillator.frequency.setValueAtTime(440, ctx.currentTime);

      // Simple melody pattern
      const notes = [440, 494, 523, 587, 659, 587, 523, 494];
      const duration = 0.3;
      notes.forEach((freq, i) => {
        const time = ctx.currentTime + i * duration;
        this.musicOscillator!.frequency.setValueAtTime(freq, time);
      });

      // Loop the melody
      const totalDuration = notes.length * duration;
      this.musicOscillator.connect(this.musicGain);
      this.musicOscillator.start();

      // Restart melody periodically
      this.scheduleLoop(ctx, notes, duration, totalDuration);

      this.isMusicPlaying = true;
    } catch {
      // Audio not available
    }
  }

  private scheduleLoop(ctx: AudioContext, notes: number[], duration: number, interval: number): void {
    const scheduleNext = () => {
      if (!this.isMusicPlaying || !this.musicOscillator) return;
      notes.forEach((freq, i) => {
        const time = ctx.currentTime + i * duration;
        try {
          this.musicOscillator!.frequency.setValueAtTime(freq, time);
        } catch {
          // Oscillator may have been stopped
        }
      });
      setTimeout(scheduleNext, interval * 1000);
    };
    setTimeout(scheduleNext, interval * 1000);
  }

  stopMusic(): void {
    if (this.musicOscillator) {
      try {
        this.musicOscillator.stop();
      } catch {
        // Already stopped
      }
      this.musicOscillator = null;
    }
    this.isMusicPlaying = false;
  }

  playSfx(type: 'jump' | 'collision' | 'splash' | 'powerup' | 'win' | 'click'): void {
    const ctx = this.getContext();
    if (!ctx || this.settings?.muted) return;

    const vol = this.settings ? this.settings.masterVolume * this.settings.sfxVolume : 0.5;
    if (vol <= 0) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
      gainNode.connect(ctx.destination);
      oscillator.connect(gainNode);

      switch (type) {
        case 'jump':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.2);
          break;

        case 'collision':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.2);
          break;

        case 'splash':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.5);
          break;

        case 'powerup':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
          break;

        case 'win':
          oscillator.type = 'sine';
          const winNotes = [523, 659, 784, 1047];
          winNotes.forEach((freq, i) => {
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
          });
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.8);
          break;

        case 'click':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.05);
          break;
      }
    } catch {
      // Audio not available
    }
  }
}
