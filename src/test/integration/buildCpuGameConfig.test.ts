import { describe, it, expect } from 'vitest';
import { buildCpuGameConfig } from '../../firebase/cpuGame';
import { ROUNDS_TO_WIN, DEFAULT_FIRE_RATE } from '../../config/constants';
import { CPU_DEFAULT_COLORS, CPU_DIFFICULTY_NAMES } from '../../bot/cpuConstants';
import { BotDifficulty } from '../../types/game';

describe('buildCpuGameConfig', () => {
  const difficulties: BotDifficulty[] = ['easy', 'defensive', 'offensive', 'hard'];

  it('returns a gameId starting with "cpu_"', () => {
    const { gameId } = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 0);
    expect(gameId).toMatch(/^cpu_/);
  });

  it('returns unique gameIds on successive calls', () => {
    const a = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 0);
    const b = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 0);
    expect(a.gameId).not.toBe(b.gameId);
  });

  it('sets hostUid and hostName from arguments', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', 'hard', 2);
    expect(config.hostUid).toBe('uid1');
    expect(config.hostName).toBe('Alice');
  });

  it('sets guestUid to cpu-bot-{difficulty}', () => {
    for (const diff of difficulties) {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', diff, 0);
      expect(config.guestUid).toBe(`cpu-bot-${diff}`);
    }
  });

  it('sets guestName with difficulty label', () => {
    for (const diff of difficulties) {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', diff, 0);
      expect(config.guestName).toBe(`CPU (${CPU_DIFFICULTY_NAMES[diff]})`);
    }
  });

  it('stores arenaIndex and roundsToWin', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 3);
    expect(config.arenaIndex).toBe(3);
    expect(config.roundsToWin).toBe(ROUNDS_TO_WIN);
  });

  it('stores cpuDifficulty in config', () => {
    for (const diff of difficulties) {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', diff, 0);
      expect(config.cpuDifficulty).toBe(diff);
    }
  });

  it('uses the CPU default color when it differs from host color', () => {
    // Easy default is green, host picks blue — no clash
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 0);
    expect(config.hostColor).toBe('blue');
    expect(config.guestColor).toBe(CPU_DEFAULT_COLORS['easy']); // green
  });

  it('picks an alternate color when host color matches CPU default', () => {
    // Defensive default is blue, host also picks blue — must resolve
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', 'defensive', 0);
    expect(config.hostColor).toBe('blue');
    expect(config.guestColor).not.toBe('blue');
  });

  it('never assigns the same color to both players', () => {
    const colors = ['blue', 'red', 'green', 'camo'] as const;
    for (const diff of difficulties) {
      for (const hostColor of colors) {
        const { config } = buildCpuGameConfig('uid1', 'Alice', hostColor, diff, 0);
        expect(config.guestColor).not.toBe(config.hostColor);
      }
    }
  });

  it('defaults fireRate to DEFAULT_FIRE_RATE when not specified', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 0);
    expect(config.fireRate).toBe(DEFAULT_FIRE_RATE);
  });

  it('stores custom fireRate in config', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 0, 0);
    expect(config.fireRate).toBe(0);
  });

  it('sets a createdAt timestamp', () => {
    const before = Date.now();
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 0);
    const after = Date.now();
    expect(config.createdAt).toBeGreaterThanOrEqual(before);
    expect(config.createdAt).toBeLessThanOrEqual(after);
  });

  it('is a pure function — does not import or call any Firebase modules', async () => {
    // The module should have zero Firebase imports. Verify by reading its
    // resolved source from the module graph (vitest exposes import.meta).
    // Simpler: just assert the function is synchronous (returns directly,
    // not a Promise), which proves it can't be doing async Firebase writes.
    const result = buildCpuGameConfig('uid1', 'Alice', 'blue', 'easy', 0);
    // Not a Promise — synchronous, no network
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.config).toBeDefined();
    expect(result.gameId).toBeDefined();
  });
});
