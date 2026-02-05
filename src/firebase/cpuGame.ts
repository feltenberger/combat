import { BotDifficulty } from '../types/game';
import { TankColor, ROUNDS_TO_WIN, DEFAULT_FIRE_RATE } from '../config/constants';
import { getCpuUid } from '../bot/BotFactory';
import { CPU_DEFAULT_COLORS, CPU_DIFFICULTY_NAMES } from '../bot/cpuConstants';
import { GameRoom } from '../types/firebase';

const ALL_COLORS: TankColor[] = ['blue', 'red', 'green', 'camo'];

/**
 * Build a CPU game config locally — no Firebase involved.
 */
export function buildCpuGameConfig(
  hostUid: string,
  hostName: string,
  hostColor: TankColor,
  difficulty: BotDifficulty,
  arenaIndex: number,
  fireRate: number = DEFAULT_FIRE_RATE,
  roundsToWin: number = ROUNDS_TO_WIN
): { gameId: string; config: GameRoom['config'] } {
  const gameId = `cpu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cpuUid = getCpuUid(difficulty);

  // Pick CPU color, avoiding the player's color
  let guestColor = CPU_DEFAULT_COLORS[difficulty];
  if (guestColor === hostColor) {
    guestColor = ALL_COLORS.find(c => c !== hostColor) || 'red';
  }

  return {
    gameId,
    config: {
      arenaIndex,
      roundsToWin,
      hostUid,
      guestUid: cpuUid,
      hostName,
      guestName: `CPU (${CPU_DIFFICULTY_NAMES[difficulty]})`,
      hostColor,
      guestColor,
      cpuDifficulty: difficulty,
      fireRate,
      createdAt: Date.now(),
    },
  };
}
