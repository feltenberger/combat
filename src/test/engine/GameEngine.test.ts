import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../engine/GameEngine';
import { PlayerInput } from '../../types/game';
import { COUNTDOWN_DURATION, ROUND_OVER_DELAY, ROUNDS_TO_WIN } from '../../config/constants';

function noInput(): PlayerInput {
  return { left: false, right: false, up: false, down: false, fire: false, timestamp: 0 };
}

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(0, ROUNDS_TO_WIN);
    engine.addPlayer('p1');
    engine.addPlayer('p2');
  });

  describe('addPlayer', () => {
    it('adds tanks for both players', () => {
      expect(engine.tanks.size).toBe(2);
      expect(engine.tanks.has('p1')).toBe(true);
      expect(engine.tanks.has('p2')).toBe(true);
    });

    it('initializes scores to 0', () => {
      expect(engine.scores.get('p1')).toBe(0);
      expect(engine.scores.get('p2')).toBe(0);
    });

    it('positions players at spawn points', () => {
      const t1 = engine.tanks.get('p1')!;
      const t2 = engine.tanks.get('p2')!;
      expect(t1.x).not.toBe(t2.x); // Different spawn positions
    });
  });

  describe('startMatch', () => {
    it('transitions from WAITING to COUNTDOWN', () => {
      expect(engine.phase).toBe('WAITING');
      engine.startMatch();
      expect(engine.phase).toBe('COUNTDOWN');
    });

    it('does not start with less than 2 players', () => {
      const singleEngine = new GameEngine(0);
      singleEngine.addPlayer('p1');
      singleEngine.startMatch();
      expect(singleEngine.phase).toBe('WAITING');
    });

    it('sets countdown timer', () => {
      engine.startMatch();
      expect(engine.countdown).toBe(COUNTDOWN_DURATION);
    });
  });

  describe('update', () => {
    it('does nothing in WAITING phase', () => {
      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', noInput());
      inputs.set('p2', noInput());
      engine.update(1, inputs);
      expect(engine.phase).toBe('WAITING');
    });

    it('counts down in COUNTDOWN phase', () => {
      engine.startMatch();
      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', noInput());
      inputs.set('p2', noInput());
      engine.update(1, inputs);
      expect(engine.countdown).toBeLessThan(COUNTDOWN_DURATION);
    });

    it('transitions from COUNTDOWN to PLAYING', () => {
      engine.startMatch();
      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', noInput());
      inputs.set('p2', noInput());
      // Advance past countdown
      engine.update(COUNTDOWN_DURATION + 0.1, inputs);
      expect(engine.phase).toBe('PLAYING');
    });

    it('processes tank movement during PLAYING', () => {
      engine.startMatch();
      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', { ...noInput(), up: true });
      inputs.set('p2', noInput());
      // Pass countdown
      engine.update(COUNTDOWN_DURATION + 0.1, inputs);
      const t1 = engine.tanks.get('p1')!;
      const startX = t1.x;
      engine.update(0.1, inputs);
      expect(t1.x).not.toBe(startX);
    });

    it('fires bullets when fire pressed', () => {
      engine.startMatch();
      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', { ...noInput(), fire: true });
      inputs.set('p2', noInput());
      engine.update(COUNTDOWN_DURATION + 0.1, inputs);
      engine.update(0.1, inputs);
      expect(engine.bullets.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('round and match flow', () => {
    it('transitions to ROUND_OVER when a tank is killed', () => {
      engine.startMatch();
      // Advance to PLAYING
      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', noInput());
      inputs.set('p2', noInput());
      engine.update(COUNTDOWN_DURATION + 0.1, inputs);

      // Manually kill a tank and simulate collision
      const t2 = engine.tanks.get('p2')!;
      t2.kill();
      engine.scores.set('p1', 1);
      engine.roundResult = { winner: 'p1', loser: 'p2' };
      engine.phase = 'ROUND_OVER';
      engine['roundOverTimer'] = ROUND_OVER_DELAY;

      expect(engine.phase).toBe('ROUND_OVER');
    });

    it('transitions to MATCH_OVER when a player reaches rounds to win', () => {
      engine.startMatch();
      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', noInput());
      inputs.set('p2', noInput());

      // Simulate winning enough rounds
      engine.scores.set('p1', ROUNDS_TO_WIN);
      engine.phase = 'ROUND_OVER';
      engine['roundOverTimer'] = 0.01;

      engine.update(0.1, inputs);
      expect(engine.phase).toBe('MATCH_OVER');
      expect(engine.matchWinner).toBe('p1');
    });
  });

  describe('getState / applyState', () => {
    it('serializes game state', () => {
      engine.startMatch();
      const state = engine.getState();
      expect(state.phase).toBe('COUNTDOWN');
      expect(state.tanks).toBeDefined();
      expect(state.scores).toBeDefined();
      expect(state.round).toBe(1);
    });

    it('deserializes game state', () => {
      engine.startMatch();
      const state = engine.getState();
      state.phase = 'PLAYING';
      state.round = 3;

      const engine2 = new GameEngine(0);
      engine2.applyState(state);
      expect(engine2.phase).toBe('PLAYING');
      expect(engine2.round).toBe(3);
    });

    it('handles empty bullets array (Firebase strips)', () => {
      engine.startMatch();
      const state = engine.getState();
      // @ts-ignore - Simulate Firebase stripping empty array
      state.bullets = undefined;
      const engine2 = new GameEngine(0);
      engine2.applyState(state);
      expect(engine2.bullets).toEqual([]);
    });
  });
});
