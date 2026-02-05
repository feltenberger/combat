import { BotBrain } from './BotBrain';
import { BotDifficulty } from '../types/game';
import { CPU_BOT_UID_PREFIX } from '../config/constants';
import { EasyBot } from './EasyBot';
import { DefensiveBot } from './DefensiveBot';
import { OffensiveBot } from './OffensiveBot';
import { HardBot } from './HardBot';

export function createBot(difficulty: BotDifficulty): BotBrain {
  switch (difficulty) {
    case 'easy':
      return new EasyBot();
    case 'defensive':
      return new DefensiveBot();
    case 'offensive':
      return new OffensiveBot();
    case 'hard':
      return new HardBot();
  }
}

export function getCpuUid(difficulty: BotDifficulty): string {
  return `${CPU_BOT_UID_PREFIX}${difficulty}`;
}

export function isCpuUid(uid: string): boolean {
  return uid.startsWith(CPU_BOT_UID_PREFIX);
}
