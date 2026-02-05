// Canvas & Arena
export const TILE_SIZE = 32;
export const ARENA_COLS = 30;
export const ARENA_ROWS = 20;
export const CANVAS_WIDTH = ARENA_COLS * TILE_SIZE; // 960
export const CANVAS_HEIGHT = ARENA_ROWS * TILE_SIZE; // 640

// Physics
export const PHYSICS_STEP = 1 / 60; // 60 Hz fixed timestep
export const TANK_SPEED = 100; // pixels per second
export const TANK_ROTATION_SPEED = 3; // radians per second
export const TANK_RADIUS = 12;
export const BULLET_SPEED = 250; // pixels per second
export const BULLET_RADIUS = 3;
export const BULLET_LIFETIME = 3; // seconds
export const MAX_BULLETS_PER_PLAYER = 1;
export const BULLET_COOLDOWN = 0.5; // seconds between shots

// Fire Rate Presets
export interface FireRatePreset {
  label: string;
  cooldown: number;
  maxBullets: number;
}

export const FIRE_RATE_PRESETS: FireRatePreset[] = [
  { label: 'Rapid', cooldown: 0.1, maxBullets: 5 },
  { label: 'Fast', cooldown: 0.2, maxBullets: 3 },
  { label: 'Normal', cooldown: 0.35, maxBullets: 2 },
  { label: 'Classic', cooldown: 0.5, maxBullets: 1 },
];

export const DEFAULT_FIRE_RATE = 3; // Classic

// Rocks
export const ROCK_MAX_HP = 3;

// Networking
export const STATE_BROADCAST_RATE = 20; // Hz
export const STATE_BROADCAST_INTERVAL = 1000 / STATE_BROADCAST_RATE;
export const INTERPOLATION_BUFFER_MS = 100;

// Match
export const ROUNDS_TO_WIN = 2;
export const COUNTDOWN_DURATION = 3; // seconds
export const ROUND_OVER_DELAY = 2; // seconds before next round

// Tank Colors
export type TankColor = 'blue' | 'red' | 'green' | 'camo';

export const TANK_COLORS: Record<TankColor, { main: string; dark: string }> = {
  blue: { main: '#4a90d9', dark: '#2d5a8a' },
  red: { main: '#d94a4a', dark: '#8a2d2d' },
  green: { main: '#44aa44', dark: '#2d7a2d' },
  camo: { main: '#4a5a2f', dark: '#6b4f2a' },
};

// Colors
export const COLORS = {
  PLAYER1: '#4a90d9',
  PLAYER2: '#d94a4a',
  PLAYER1_DARK: '#2d5a8a',
  PLAYER2_DARK: '#8a2d2d',
  WALL: '#555555',
  WALL_BORDER: '#333333',
  ROCK_FULL: '#8B7355',
  ROCK_DAMAGED: '#9B8365',
  ROCK_CRITICAL: '#AB9375',
  ROCK_RUBBLE: '#6B6355',
  FLOOR: '#1a1a2e',
  FLOOR_ALT: '#16213e',
  BULLET: '#ffdd44',
  BULLET_GLOW: '#ffff88',
  EXPLOSION: '#ff6600',
  HUD_BG: 'rgba(0, 0, 0, 0.7)',
  HUD_TEXT: '#ffffff',
};

// CPU Bot
export const CPU_BOT_UID_PREFIX = 'cpu-bot-';

// Tile Types
export enum TileType {
  FLOOR = 0,
  WALL = 1,
  ROCK = 2,
  SPAWN_1 = 3,
  SPAWN_2 = 4,
}
