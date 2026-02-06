import { TankColor } from '../config/constants';
import { BotDifficulty, CpuPlayerConfig } from './game';

export interface PresenceData {
  name: string;
  online: boolean;
  lastSeen: number;
  color?: TankColor;
}

export interface ChallengeData {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  status: 'pending' | 'accepted' | 'rejected';
  gameId?: string;
  arenaIndex: number;
  fromColor?: TankColor;
  fireRate?: number;
  roundsToWin?: number;
  livesPerRound?: number;
  cpuPlayers?: CpuPlayerConfig[];
  timestamp: number;
}

export interface GameRoom {
  config: {
    arenaIndex: number;
    roundsToWin: number;
    hostUid: string;
    guestUid: string;
    hostName: string;
    guestName: string;
    hostColor: TankColor;
    guestColor: TankColor;
    createdAt: number;
    cpuDifficulty?: BotDifficulty;
    fireRate?: number;
    cpuPlayers?: CpuPlayerConfig[];
    livesPerRound?: number;
  };
  state?: Record<string, unknown>;
  input?: Record<string, Record<string, unknown>>;
  status: 'waiting' | 'active' | 'finished';
}

export interface MatchRecord {
  gameId: string;
  hostUid: string;
  hostName: string;
  guestUid: string;
  guestName: string;
  winnerUid: string;
  winnerName: string;
  hostScore: number;
  guestScore: number;
  rounds: number;
  arenaIndex: number;
  completedAt: number;
  cpuDifficulty?: BotDifficulty;
  players?: Array<{ uid: string; name: string; score: number; color?: TankColor; isCpu?: boolean }>;
  livesPerRound?: number;
  playerCount?: number;
}

export interface PlayerStats {
  uid: string;
  name: string;
  wins: number;
  losses: number;
  roundsWon: number;
  roundsLost: number;
  lastPlayed: number;
}
