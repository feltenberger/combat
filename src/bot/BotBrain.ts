import { PlayerInput, GameState, BotDifficulty } from '../types/game';
import { Arena } from '../engine/Arena';

export interface BotContext {
  myUid: string;
  opponentUid: string;
  allOpponentUids: string[];
  gameState: GameState;
  arena: Arena;
  dt: number;
  gameTime: number;
}

export interface BotBrain {
  readonly difficulty: BotDifficulty;
  update(context: BotContext): PlayerInput;
  reset(): void;
}
