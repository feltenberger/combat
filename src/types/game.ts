export interface Vec2 {
  x: number;
  y: number;
}

export interface TankState {
  x: number;
  y: number;
  angle: number; // radians
  alive: boolean;
}

export interface BulletState {
  id: string;
  x: number;
  y: number;
  angle: number;
  ownerId: string;
  spawnTime: number;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  timestamp: number;
  targetAngle?: number; // Touch/joystick: desired facing direction (radians)
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'explosion' | 'smoke' | 'spark' | 'debris';
}

export type MatchPhase =
  | 'WAITING'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'ROUND_OVER'
  | 'MATCH_OVER';

export interface RoundResult {
  winner: string | null; // uid of winner, null for draw
  loser: string | null;
}

export interface GameState {
  phase: MatchPhase;
  tanks: Record<string, TankState>;
  bullets: BulletState[];
  rockHP: Record<string, number>; // "col,row" -> hp
  scores: Record<string, number>;
  round: number;
  countdown: number;
  roundResult: RoundResult | null;
  matchWinner: string | null;
  timestamp: number;
}

import { TankColor } from '../config/constants';

export type BotDifficulty = 'easy' | 'defensive' | 'offensive' | 'hard';

export interface GameConfig {
  arenaIndex: number;
  roundsToWin: number;
  hostUid: string;
  guestUid: string;
  hostName: string;
  guestName: string;
  hostColor: TankColor;
  guestColor: TankColor;
  cpuDifficulty?: BotDifficulty;
  fireRate?: number;
}
