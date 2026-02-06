import { BotDifficulty, CpuPlayerConfig } from '../types/game';
import { TankColor, ROUNDS_TO_WIN, DEFAULT_FIRE_RATE, DEFAULT_LIVES_PER_ROUND } from '../config/constants';
import { getCpuUid } from '../bot/BotFactory';
import { CPU_DEFAULT_COLORS, CPU_DIFFICULTY_NAMES } from '../bot/cpuConstants';
import { GameRoom } from '../types/firebase';

const ALL_COLORS: TankColor[] = ['blue', 'red', 'green', 'camo'];

/**
 * Build CpuPlayerConfig entries for the given difficulties, avoiding
 * any colors already in `usedColors`. Mutates `usedColors` by adding
 * the chosen colors. Reusable by both local CPU games and mixed
 * human+CPU challenge flow.
 */
export function buildCpuPlayers(
  difficulties: BotDifficulty[],
  usedColors: Set<TankColor>,
): CpuPlayerConfig[] {
  const cpuPlayers: CpuPlayerConfig[] = [];

  for (let i = 0; i < difficulties.length; i++) {
    const diff = difficulties[i];
    const uid = getCpuUid(diff, i);
    const name = `CPU (${CPU_DIFFICULTY_NAMES[diff]})${difficulties.length > 1 ? ` #${i + 1}` : ''}`;

    // Pick color avoiding conflicts
    let color = CPU_DEFAULT_COLORS[diff];
    if (usedColors.has(color)) {
      color = ALL_COLORS.find(c => !usedColors.has(c)) || 'red';
    }
    usedColors.add(color);

    cpuPlayers.push({ difficulty: diff, uid, name, color });
  }

  return cpuPlayers;
}

/**
 * Build a CPU game config locally — no Firebase involved.
 * Supports 1-2 CPU opponents.
 */
export function buildCpuGameConfig(
  hostUid: string,
  hostName: string,
  hostColor: TankColor,
  difficulties: BotDifficulty[],
  arenaIndex: number,
  fireRate: number = DEFAULT_FIRE_RATE,
  roundsToWin: number = ROUNDS_TO_WIN,
  livesPerRound: number = DEFAULT_LIVES_PER_ROUND,
): { gameId: string; config: GameRoom['config'] } {
  const gameId = `cpu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const usedColors = new Set<TankColor>([hostColor]);
  const cpuPlayers = buildCpuPlayers(difficulties, usedColors);

  // First CPU is the "guest" for backward compat
  const firstCpu = cpuPlayers[0];

  return {
    gameId,
    config: {
      arenaIndex,
      roundsToWin,
      hostUid,
      guestUid: firstCpu.uid,
      hostName,
      guestName: firstCpu.name,
      hostColor,
      guestColor: firstCpu.color,
      cpuDifficulty: firstCpu.difficulty,
      fireRate,
      cpuPlayers,
      livesPerRound,
      createdAt: Date.now(),
    },
  };
}
