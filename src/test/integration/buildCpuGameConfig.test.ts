import { describe, it, expect } from 'vitest';
import { buildCpuGameConfig, buildCpuPlayers } from '../../firebase/cpuGame';
import { TankColor, ROUNDS_TO_WIN, DEFAULT_FIRE_RATE, DEFAULT_LIVES_PER_ROUND } from '../../config/constants';
import { CPU_DEFAULT_COLORS, CPU_DIFFICULTY_NAMES } from '../../bot/cpuConstants';
import { BotDifficulty } from '../../types/game';

describe('buildCpuGameConfig', () => {
  const difficulties: BotDifficulty[] = ['easy', 'defensive', 'offensive', 'hard'];

  it('returns a gameId starting with "cpu_"', () => {
    const { gameId } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
    expect(gameId).toMatch(/^cpu_/);
  });

  it('returns unique gameIds on successive calls', () => {
    const a = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
    const b = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
    expect(a.gameId).not.toBe(b.gameId);
  });

  it('sets hostUid and hostName from arguments', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['hard'], 2);
    expect(config.hostUid).toBe('uid1');
    expect(config.hostName).toBe('Alice');
  });

  it('sets guestUid to cpu-bot-{difficulty} for single CPU', () => {
    for (const diff of difficulties) {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', [diff], 0);
      expect(config.guestUid).toBe(`cpu-bot-${diff}`);
    }
  });

  it('sets guestName with difficulty label for single CPU', () => {
    for (const diff of difficulties) {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', [diff], 0);
      expect(config.guestName).toBe(`CPU (${CPU_DIFFICULTY_NAMES[diff]})`);
    }
  });

  it('stores arenaIndex and roundsToWin', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 3);
    expect(config.arenaIndex).toBe(3);
    expect(config.roundsToWin).toBe(ROUNDS_TO_WIN);
  });

  it('stores cpuDifficulty in config', () => {
    for (const diff of difficulties) {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', [diff], 0);
      expect(config.cpuDifficulty).toBe(diff);
    }
  });

  it('uses the CPU default color when it differs from host color', () => {
    // Easy default is green, host picks blue — no clash
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
    expect(config.hostColor).toBe('blue');
    expect(config.guestColor).toBe(CPU_DEFAULT_COLORS['easy']); // green
  });

  it('picks an alternate color when host color matches CPU default', () => {
    // Defensive default is blue, host also picks blue — must resolve
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['defensive'], 0);
    expect(config.hostColor).toBe('blue');
    expect(config.guestColor).not.toBe('blue');
  });

  it('never assigns the same color to both players (single CPU)', () => {
    const colors = ['blue', 'red', 'green', 'camo'] as const;
    for (const diff of difficulties) {
      for (const hostColor of colors) {
        const { config } = buildCpuGameConfig('uid1', 'Alice', hostColor, [diff], 0);
        expect(config.guestColor).not.toBe(config.hostColor);
      }
    }
  });

  it('defaults fireRate to DEFAULT_FIRE_RATE when not specified', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
    expect(config.fireRate).toBe(DEFAULT_FIRE_RATE);
  });

  it('stores custom fireRate in config', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0, 0);
    expect(config.fireRate).toBe(0);
  });

  it('defaults roundsToWin to ROUNDS_TO_WIN when not specified', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
    expect(config.roundsToWin).toBe(ROUNDS_TO_WIN);
  });

  it('stores custom roundsToWin in config', () => {
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0, 3, 5);
    expect(config.roundsToWin).toBe(5);
  });

  it('sets a createdAt timestamp', () => {
    const before = Date.now();
    const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
    const after = Date.now();
    expect(config.createdAt).toBeGreaterThanOrEqual(before);
    expect(config.createdAt).toBeLessThanOrEqual(after);
  });

  it('is a pure function — does not import or call any Firebase modules', async () => {
    const result = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.config).toBeDefined();
    expect(result.gameId).toBeDefined();
  });

  // Multi-CPU tests
  describe('multi-CPU support', () => {
    it('creates cpuPlayers array with correct length', () => {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy', 'hard'], 0);
      expect(config.cpuPlayers).toBeDefined();
      expect(config.cpuPlayers!.length).toBe(2);
    });

    it('assigns unique UIDs to each CPU player', () => {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy', 'easy'], 0);
      const uids = config.cpuPlayers!.map(p => p.uid);
      expect(new Set(uids).size).toBe(uids.length);
    });

    it('assigns non-conflicting colors to all players', () => {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy', 'hard'], 0);
      const colors = [config.hostColor, ...config.cpuPlayers!.map(p => p.color)];
      expect(new Set(colors).size).toBe(colors.length);
    });

    it('handles same difficulty for both CPUs without color conflict', () => {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['offensive', 'offensive'], 0);
      const colors = [config.hostColor, ...config.cpuPlayers!.map(p => p.color)];
      expect(new Set(colors).size).toBe(colors.length);
    });

    it('stores livesPerRound in config', () => {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0, DEFAULT_FIRE_RATE, ROUNDS_TO_WIN, 3);
      expect(config.livesPerRound).toBe(3);
    });

    it('defaults livesPerRound to DEFAULT_LIVES_PER_ROUND', () => {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy'], 0);
      expect(config.livesPerRound).toBe(DEFAULT_LIVES_PER_ROUND);
    });

    it('guestUid is first CPU uid for backward compat', () => {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy', 'hard'], 0);
      expect(config.guestUid).toBe(config.cpuPlayers![0].uid);
    });

    it('numbered names for multi-CPU', () => {
      const { config } = buildCpuGameConfig('uid1', 'Alice', 'blue', ['easy', 'hard'], 0);
      expect(config.cpuPlayers![0].name).toContain('#1');
      expect(config.cpuPlayers![1].name).toContain('#2');
    });
  });
});

describe('buildCpuPlayers', () => {
  it('returns CpuPlayerConfig array with correct length', () => {
    const usedColors = new Set<TankColor>(['blue']);
    const result = buildCpuPlayers(['easy'], usedColors);
    expect(result.length).toBe(1);
    expect(result[0].difficulty).toBe('easy');
  });

  it('avoids colors already in usedColors', () => {
    // Defensive default is blue; blue already used
    const usedColors = new Set<TankColor>(['blue']);
    const result = buildCpuPlayers(['defensive'], usedColors);
    expect(result[0].color).not.toBe('blue');
  });

  it('mutates usedColors by adding chosen colors', () => {
    const usedColors = new Set<TankColor>(['blue']);
    const result = buildCpuPlayers(['easy'], usedColors);
    expect(usedColors.has(result[0].color)).toBe(true);
    expect(usedColors.size).toBe(2);
  });

  it('handles multiple CPUs without color conflicts', () => {
    const usedColors = new Set<TankColor>(['blue']);
    const result = buildCpuPlayers(['easy', 'hard'], usedColors);
    const allColors = ['blue', ...result.map(p => p.color)];
    expect(new Set(allColors).size).toBe(allColors.length);
  });

  it('assigns unique UIDs for same-difficulty CPUs', () => {
    const usedColors = new Set<TankColor>(['blue']);
    const result = buildCpuPlayers(['easy', 'easy'], usedColors);
    expect(result[0].uid).not.toBe(result[1].uid);
  });

  it('uses default color when available', () => {
    const usedColors = new Set<TankColor>(['blue']);
    const result = buildCpuPlayers(['easy'], usedColors);
    expect(result[0].color).toBe(CPU_DEFAULT_COLORS['easy']); // green
  });

  it('can be used independently of buildCpuGameConfig', () => {
    // Simulate challenge flow: host=red, guest will pick later, add 1 CPU
    const usedColors = new Set<TankColor>(['red']);
    const cpuPlayers = buildCpuPlayers(['hard'], usedColors);
    expect(cpuPlayers.length).toBe(1);
    expect(cpuPlayers[0].color).not.toBe('red');
  });
});
