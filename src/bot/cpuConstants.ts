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
export const EASY_ROTATION_CHANCE = 0.35; // Rotate toward player 35% of frames
export const EASY_AIM_TOLERANCE = Math.PI / 3; // ±60° — very sloppy aiming
export const EASY_AIM_ERROR = Math.PI / 4; // ±45° random error added to aim direction
export const EASY_REACTION_DELAY_MIN = 0.6; // seconds
export const EASY_REACTION_DELAY_MAX = 1.5;
export const EASY_MOVE_CHANCE = 0.55; // Move forward 55% of the time
export const EASY_WANDER_CHANCE = 0.15; // 15% chance to wander randomly instead of engaging
export const EASY_WANDER_DURATION_MIN = 0.8; // seconds
export const EASY_WANDER_DURATION_MAX = 2.0;
export const EASY_FIRE_HESITATION = 0.4; // 40% chance to NOT fire even when aimed

// --- Defensive Bot ---
export const DEFENSIVE_PREFERRED_DISTANCE = 450; // pixels — stay much farther away
export const DEFENSIVE_RETREAT_DISTANCE = 250; // pixels, start retreating much sooner
export const DEFENSIVE_AIM_TOLERANCE = Math.PI / 12; // ±15°
export const DEFENSIVE_DODGE_CORRIDOR = 40; // pixels, bullet threat detection width
export const DEFENSIVE_COVER_SEARCH_MAX = 8; // max cover positions to evaluate
export const DEFENSIVE_FIRE_HESITATION = 0.70; // 70% chance to NOT fire even when aimed
export const DEFENSIVE_CREEP_CHANCE = 0.30; // only move forward 30% of frames
export const DEFENSIVE_FREEZE_CHANCE = 0.12; // per-second chance to freeze in indecision
export const DEFENSIVE_FREEZE_DURATION_MIN = 0.5; // seconds
export const DEFENSIVE_FREEZE_DURATION_MAX = 2.0; // seconds
export const DEFENSIVE_COVER_LINGER_TIME = 3.0; // stay in cover at least 3s before peeking
export const DEFENSIVE_PEEK_DURATION = 1.5; // only expose for 1.5s before retreating back

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
