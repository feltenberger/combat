import {
  SFX_MASTER_VOLUME,
  GUNSHOT_FREQ_START,
  GUNSHOT_FREQ_END,
  GUNSHOT_DURATION,
  GUNSHOT_VOLUME,
  ROCK_HIT_FREQ,
  ROCK_HIT_DURATION,
  ROCK_HIT_VOLUME,
  WALL_HIT_FREQ,
  WALL_HIT_DURATION,
  WALL_HIT_VOLUME,
  EXPLOSION_TONE_FREQ_START,
  EXPLOSION_TONE_FREQ_END,
  EXPLOSION_NOISE_FREQ,
  EXPLOSION_DURATION,
  EXPLOSION_VOLUME,
  MUSIC_BPM,
  MUSIC_MELODY_VOLUME,
  MUSIC_BASS_VOLUME,
  MUSIC_DRUM_VOLUME,
} from '../config/constants';

export interface SoundPrefs {
  sfxVolume: number;   // 0–100
  sfxMuted: boolean;
  musicVolume: number; // 0–100
  musicMuted: boolean;
}

const LS_SFX_VOL = 'combat-sfx-volume';
const LS_SFX_MUTE = 'combat-sfx-muted';
const LS_MUSIC_VOL = 'combat-music-volume';
const LS_MUSIC_MUTE = 'combat-music-muted';

/** Read persisted sound preferences from localStorage. */
export function loadSoundPrefs(): SoundPrefs {
  return {
    sfxVolume: Number(localStorage.getItem(LS_SFX_VOL) ?? 75),
    sfxMuted: localStorage.getItem(LS_SFX_MUTE) === 'true',
    musicVolume: Number(localStorage.getItem(LS_MUSIC_VOL) ?? 50),
    musicMuted: localStorage.getItem(LS_MUSIC_MUTE) === 'true',
  };
}

/** Persist a single sound preference to localStorage. */
export function saveSoundPref(key: keyof SoundPrefs, value: number | boolean): void {
  const lsKey = { sfxVolume: LS_SFX_VOL, sfxMuted: LS_SFX_MUTE, musicVolume: LS_MUSIC_VOL, musicMuted: LS_MUSIC_MUTE }[key];
  localStorage.setItem(lsKey, String(value));
}

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicSchedulerId: ReturnType<typeof setTimeout> | null = null;
  private musicStartTime = 0;
  private musicPlaying = false;
  private destroyed = false;

  /** Lazily create AudioContext — safe to call multiple times. No-op if Web Audio unavailable. */
  resume(): void {
    if (this.destroyed) return;
    if (!this.ctx) {
      if (typeof AudioContext === 'undefined') return;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = SFX_MASTER_VOLUME;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = SFX_MASTER_VOLUME;
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        // Start music if it was requested while context was suspended
        if (this.musicPlaying && this.musicSchedulerId === null && this.ctx) {
          this.musicStartTime = this.ctx.currentTime + 0.05;
          this.scheduleLoop();
        }
      });
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.musicGain = null;
  }

  /** Set SFX gain from 0–100 scale. Pass 0 to mute. */
  setSfxVolume(pct: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = SFX_MASTER_VOLUME * (pct / 100);
    }
  }

  /** Set music gain from 0–100 scale. Pass 0 to mute. */
  setMusicVolume(pct: number): void {
    if (this.musicGain) {
      this.musicGain.gain.value = SFX_MASTER_VOLUME * (pct / 100);
    }
  }

  /** Apply saved prefs (volume + mute state). */
  applyPrefs(prefs: SoundPrefs): void {
    this.setSfxVolume(prefs.sfxMuted ? 0 : prefs.sfxVolume);
    this.setMusicVolume(prefs.musicMuted ? 0 : prefs.musicVolume);
  }

  // ── SFX ──────────────────────────────────────────────────────────────

  /** Short square-wave chirp, 600→100 Hz pitch drop */
  playGunshot(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(GUNSHOT_FREQ_START, now);
    osc.frequency.exponentialRampToValueAtTime(GUNSHOT_FREQ_END, now + GUNSHOT_DURATION);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(GUNSHOT_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + GUNSHOT_DURATION);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + GUNSHOT_DURATION);
  }

  /** Bandpass-filtered white noise at 800 Hz — crunchy rock impact */
  playRockHit(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.playNoiseBurst(now, ROCK_HIT_FREQ, ROCK_HIT_DURATION, ROCK_HIT_VOLUME);
  }

  /** Bandpass-filtered white noise at 300 Hz — dull metallic clang */
  playWallHit(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.playNoiseBurst(now, WALL_HIT_FREQ, WALL_HIT_DURATION, WALL_HIT_VOLUME);
  }

  /** Two-layer explosion: triangle rumble + lowpass noise burst */
  playExplosion(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Layer 1: triangle wave rumble 150→30 Hz
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(EXPLOSION_TONE_FREQ_START, now);
    osc.frequency.exponentialRampToValueAtTime(EXPLOSION_TONE_FREQ_END, now + EXPLOSION_DURATION);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(EXPLOSION_VOLUME, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + EXPLOSION_DURATION);

    osc.connect(oscGain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + EXPLOSION_DURATION);

    // Layer 2: lowpass-filtered noise burst
    const buffer = this.createNoiseBuffer(EXPLOSION_DURATION);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(EXPLOSION_NOISE_FREQ, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + EXPLOSION_DURATION);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(EXPLOSION_VOLUME * 0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + EXPLOSION_DURATION);

    noise.connect(filter).connect(noiseGain).connect(this.masterGain);
    noise.start(now);
    noise.stop(now + EXPLOSION_DURATION);
  }

  // ── Noise helper ─────────────────────────────────────────────────────

  private createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = Math.ceil(sampleRate * duration);
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playNoiseBurst(
    time: number,
    freq: number,
    duration: number,
    volume: number,
  ): void {
    const buffer = this.createNoiseBuffer(duration);
    const noise = this.ctx!.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 2;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter).connect(gain).connect(this.masterGain!);
    noise.start(time);
    noise.stop(time + duration);
  }

  // ── Music ────────────────────────────────────────────────────────────

  /** Start the looping military march. Idempotent. Safe to call before context is ready. */
  startMusic(): void {
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    // If context is running, schedule immediately; otherwise resume() will handle it
    if (this.ctx && this.ctx.state === 'running' && this.musicGain) {
      this.musicStartTime = this.ctx.currentTime + 0.05;
      this.scheduleLoop();
    }
  }

  /** Stop music and cancel pending scheduler. */
  stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicSchedulerId !== null) {
      clearTimeout(this.musicSchedulerId);
      this.musicSchedulerId = null;
    }
  }

  private scheduleLoop(): void {
    if (!this.musicPlaying || !this.ctx || !this.musicGain) return;

    const beatDur = 60 / MUSIC_BPM; // ~0.4286s per beat
    const barDur = beatDur * 4;
    const loopDur = barDur * 4; // 4 bars

    this.scheduleMelody(this.musicStartTime, beatDur);
    this.scheduleBass(this.musicStartTime, beatDur);
    this.scheduleDrums(this.musicStartTime, beatDur);

    // Schedule next iteration before this one ends
    const nextStart = this.musicStartTime + loopDur;
    const now = this.ctx.currentTime;
    const delay = Math.max(0, (nextStart - now - 0.1) * 1000);

    this.musicSchedulerId = setTimeout(() => {
      this.musicStartTime = nextStart;
      this.scheduleLoop();
    }, delay);
  }

  /**
   * Military march melody — 4 bars in C minor.
   * Notes as MIDI-like frequencies. Uses square wave for 8-bit feel.
   */
  private scheduleMelody(start: number, beat: number): void {
    // C minor march motif
    // Bar 1: C4 C4 Eb4 G4  (ascending march)
    // Bar 2: G4 F4 Eb4 D4  (descending response)
    // Bar 3: C4 Eb4 F4 G4  (march up again)
    // Bar 4: Ab4 G4 F4 C4  (resolve down to tonic)
    const notes: [number, number, number][] = [
      // [freq, startBeat, durationBeats]
      // Bar 1
      [261.6, 0, 0.8],    // C4
      [261.6, 1, 0.8],    // C4
      [311.1, 2, 0.8],    // Eb4
      [392.0, 3, 0.8],    // G4
      // Bar 2
      [392.0, 4, 0.8],    // G4
      [349.2, 5, 0.8],    // F4
      [311.1, 6, 0.8],    // Eb4
      [293.7, 7, 0.8],    // D4
      // Bar 3
      [261.6, 8, 0.8],    // C4
      [311.1, 9, 0.8],    // Eb4
      [349.2, 10, 0.8],   // F4
      [392.0, 11, 0.8],   // G4
      // Bar 4
      [415.3, 12, 0.8],   // Ab4
      [392.0, 13, 0.8],   // G4
      [349.2, 14, 0.8],   // F4
      [261.6, 15, 0.8],   // C4
    ];

    for (const [freq, startBeat, durBeats] of notes) {
      this.scheduleNote('square', freq, start + startBeat * beat, durBeats * beat, MUSIC_MELODY_VOLUME);
    }
  }

  /**
   * Bass line — root-fifth pattern on triangle wave.
   * Plays on each beat with alternating root/fifth.
   */
  private scheduleBass(start: number, beat: number): void {
    // C2=65.41, G2=98.0, F2=87.31, Ab2=103.83, D2=73.42, Eb2=77.78
    const pattern: [number, number][] = [
      // Bar 1: Cm
      [65.41, 0], [98.0, 1], [65.41, 2], [98.0, 3],
      // Bar 2: G→Eb→D
      [98.0, 4], [87.31, 5], [77.78, 6], [73.42, 7],
      // Bar 3: Cm→F
      [65.41, 8], [77.78, 9], [87.31, 10], [98.0, 11],
      // Bar 4: Ab→G→F→C
      [103.83, 12], [98.0, 13], [87.31, 14], [65.41, 15],
    ];

    for (const [freq, startBeat] of pattern) {
      this.scheduleNote('triangle', freq, start + startBeat * beat, beat * 0.7, MUSIC_BASS_VOLUME);
    }
  }

  /**
   * Snare-like noise hits on beats 2 and 4 of each bar.
   */
  private scheduleDrums(start: number, beat: number): void {
    if (!this.ctx || !this.musicGain) return;
    // Beats 2, 4 of each bar = beats 1,3,5,7,9,11,13,15
    const snareBeats = [1, 3, 5, 7, 9, 11, 13, 15];

    for (const b of snareBeats) {
      const time = start + b * beat;
      const dur = 0.06;

      const buffer = this.createNoiseBuffer(dur);
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(MUSIC_DRUM_VOLUME, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      noise.connect(filter).connect(gain).connect(this.musicGain);
      noise.start(time);
      noise.stop(time + dur);
    }
  }

  private scheduleNote(
    type: OscillatorType,
    freq: number,
    time: number,
    duration: number,
    volume: number,
  ): void {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.setValueAtTime(volume, time + duration - 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }
}
