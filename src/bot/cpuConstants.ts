import { TankColor } from '../config/constants';
import { BotDifficulty } from '../types/game';

// Default tank colors for CPU bots
export const CPU_DEFAULT_COLORS: Record<BotDifficulty, TankColor> = {
  easy: 'green',
  defensive: 'blue',
  offensive: 'red',
  hard: 'camo',
};

// Display names for CPU difficulties
export const CPU_DIFFICULTY_NAMES: Record<BotDifficulty, string> = {
  easy: 'Easy',
  defensive: 'Defensive',
  offensive: 'Offensive',
  hard: 'Hard',
};

// --- Easy Bot ---
export const EASY_ROTATION_CHANCE = 0.4; // Only rotate toward player 40% of frames
export const EASY_AIM_TOLERANCE = Math.PI / 6; // ±30°
export const EASY_REACTION_DELAY_MIN = 0.5; // seconds
export const EASY_REACTION_DELAY_MAX = 1.5;
export const EASY_MOVE_CHANCE = 0.6; // Move forward 60% of the time

// --- Defensive Bot ---
export const DEFENSIVE_PREFERRED_DISTANCE = 300; // pixels
export const DEFENSIVE_RETREAT_DISTANCE = 150; // pixels, retreat when closer
export const DEFENSIVE_AIM_TOLERANCE = Math.PI / 12; // ±15°
export const DEFENSIVE_DODGE_CORRIDOR = 40; // pixels, bullet threat detection width
export const DEFENSIVE_COVER_SEARCH_MAX = 8; // max cover positions to evaluate

// --- Offensive Bot ---
export const OFFENSIVE_AIM_TOLERANCE = Math.PI / 8; // ±22.5°
export const OFFENSIVE_FLANK_CHANCE = 0.3; // 30% chance to flank instead of direct approach
export const OFFENSIVE_DODGE_CORRIDOR = 25; // Only dodge extreme close calls
export const OFFENSIVE_ENGAGE_DISTANCE = 200; // Close distance to start firing aggressively

// --- Hard Bot ---
export const HARD_AIM_TOLERANCE = Math.PI / 18; // ±10°
export const HARD_DODGE_CORRIDOR = 50; // pixels
export const HARD_REPOSITION_INTERVAL = 2.0; // seconds between reposition decisions
export const HARD_AGGRESSION_BASE = 0.5; // 0=defensive, 1=aggressive
export const HARD_AGGRESSION_SCORE_WEIGHT = 0.25; // How much score difference affects aggression
