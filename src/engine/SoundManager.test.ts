import { describe, it, expect, beforeEach } from 'vitest';
import { SoundManager, loadSoundPrefs, saveSoundPref } from './SoundManager';

describe('loadSoundPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when localStorage is empty', () => {
    const prefs = loadSoundPrefs();
    expect(prefs.sfxVolume).toBe(75);
    expect(prefs.sfxMuted).toBe(false);
    expect(prefs.musicVolume).toBe(50);
    expect(prefs.musicMuted).toBe(false);
  });

  it('reads saved sfxVolume', () => {
    localStorage.setItem('combat-sfx-volume', '30');
    expect(loadSoundPrefs().sfxVolume).toBe(30);
  });

  it('reads saved musicVolume', () => {
    localStorage.setItem('combat-music-volume', '80');
    expect(loadSoundPrefs().musicVolume).toBe(80);
  });

  it('reads saved sfxMuted', () => {
    localStorage.setItem('combat-sfx-muted', 'true');
    expect(loadSoundPrefs().sfxMuted).toBe(true);
  });

  it('reads saved musicMuted', () => {
    localStorage.setItem('combat-music-muted', 'true');
    expect(loadSoundPrefs().musicMuted).toBe(true);
  });

  it('treats non-"true" muted values as false', () => {
    localStorage.setItem('combat-sfx-muted', 'false');
    localStorage.setItem('combat-music-muted', '0');
    const prefs = loadSoundPrefs();
    expect(prefs.sfxMuted).toBe(false);
    expect(prefs.musicMuted).toBe(false);
  });
});

describe('saveSoundPref', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists sfxVolume', () => {
    saveSoundPref('sfxVolume', 42);
    expect(localStorage.getItem('combat-sfx-volume')).toBe('42');
  });

  it('persists musicVolume', () => {
    saveSoundPref('musicVolume', 88);
    expect(localStorage.getItem('combat-music-volume')).toBe('88');
  });

  it('persists sfxMuted', () => {
    saveSoundPref('sfxMuted', true);
    expect(localStorage.getItem('combat-sfx-muted')).toBe('true');
  });

  it('persists musicMuted', () => {
    saveSoundPref('musicMuted', false);
    expect(localStorage.getItem('combat-music-muted')).toBe('false');
  });

  it('roundtrips through loadSoundPrefs', () => {
    saveSoundPref('sfxVolume', 60);
    saveSoundPref('sfxMuted', true);
    saveSoundPref('musicVolume', 25);
    saveSoundPref('musicMuted', false);

    const prefs = loadSoundPrefs();
    expect(prefs).toEqual({
      sfxVolume: 60,
      sfxMuted: true,
      musicVolume: 25,
      musicMuted: false,
    });
  });
});

describe('SoundManager (no AudioContext)', () => {
  // In the test environment (happy-dom), AudioContext is undefined.
  // SoundManager should gracefully no-op in this case.

  it('can be constructed without errors', () => {
    const sm = new SoundManager();
    expect(sm).toBeDefined();
  });

  it('resume() is safe without AudioContext', () => {
    const sm = new SoundManager();
    expect(() => sm.resume()).not.toThrow();
  });

  it('destroy() is safe without AudioContext', () => {
    const sm = new SoundManager();
    sm.resume();
    expect(() => sm.destroy()).not.toThrow();
  });

  it('SFX methods are no-ops without AudioContext', () => {
    const sm = new SoundManager();
    expect(() => sm.playGunshot()).not.toThrow();
    expect(() => sm.playRockHit()).not.toThrow();
    expect(() => sm.playWallHit()).not.toThrow();
    expect(() => sm.playExplosion()).not.toThrow();
  });

  it('music methods are no-ops without AudioContext', () => {
    const sm = new SoundManager();
    expect(() => sm.startMusic()).not.toThrow();
    expect(() => sm.stopMusic()).not.toThrow();
  });

  it('volume methods are no-ops without AudioContext', () => {
    const sm = new SoundManager();
    expect(() => sm.setSfxVolume(50)).not.toThrow();
    expect(() => sm.setMusicVolume(50)).not.toThrow();
  });

  it('applyPrefs is safe without AudioContext', () => {
    const sm = new SoundManager();
    expect(() => sm.applyPrefs({
      sfxVolume: 80,
      sfxMuted: false,
      musicVolume: 40,
      musicMuted: true,
    })).not.toThrow();
  });

  it('resume after destroy is a no-op', () => {
    const sm = new SoundManager();
    sm.destroy();
    expect(() => sm.resume()).not.toThrow();
  });

  it('startMusic sets intent even without AudioContext', () => {
    const sm = new SoundManager();
    sm.startMusic();
    // Calling again should be idempotent (no error)
    sm.startMusic();
    sm.stopMusic();
  });
});

describe('SoundManager with GameEngine (null pattern)', () => {
  it('nullable sound field allows safe optional chaining', () => {
    // This mimics how GameEngine uses `this.sound?.playGunshot()`
    const sound = null as SoundManager | null;
    expect(() => sound?.playGunshot()).not.toThrow();
    expect(() => sound?.playRockHit()).not.toThrow();
    expect(() => sound?.playWallHit()).not.toThrow();
    expect(() => sound?.playExplosion()).not.toThrow();
  });
});
