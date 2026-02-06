import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../engine/GameEngine';
import { PlayerInput } from '../../types/game';
import { COUNTDOWN_DURATION, ROUND_OVER_DELAY, ROUNDS_TO_WIN, FIRE_RATE_PRESETS, DEFAULT_FIRE_RATE, DEFAULT_LIVES_PER_ROUND, RESPAWN_INVINCIBILITY_DURATION } from '../../config/constants';

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

  describe('fire rate presets', () => {
    it('defaults to Classic preset (1 bullet, 0.5s cooldown)', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.startMatch();

      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', { ...noInput(), fire: true });
      inputs.set('p2', noInput());

      // Advance past countdown
      eng.update(COUNTDOWN_DURATION + 0.1, inputs);
      // Fire first bullet
      eng.update(0.02, inputs);
      expect(eng.bullets.length).toBe(1);
      // Second fire should be blocked by cooldown (0.5s) and max 1 bullet
      eng.update(0.02, inputs);
      expect(eng.bullets.length).toBe(1);
    });

    it('Rapid preset allows up to 5 bullets with 0.1s cooldown', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN, 0); // Rapid
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.startMatch();

      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', { ...noInput(), fire: true });
      inputs.set('p2', noInput());

      // Advance past countdown
      eng.update(COUNTDOWN_DURATION + 0.1, inputs);

      // Fire multiple bullets with enough cooldown between each
      let bulletsFired = 0;
      for (let i = 0; i < 10; i++) {
        eng.update(0.15, inputs); // > 0.1s cooldown
        bulletsFired = eng.bullets.length;
        if (bulletsFired >= 5) break;
      }
      expect(bulletsFired).toBe(5);
    });

    it('Fast preset allows up to 3 bullets', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN, 1); // Fast
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.startMatch();

      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', { ...noInput(), fire: true });
      inputs.set('p2', noInput());

      eng.update(COUNTDOWN_DURATION + 0.1, inputs);

      let bulletsFired = 0;
      for (let i = 0; i < 10; i++) {
        eng.update(0.25, inputs); // > 0.2s cooldown
        bulletsFired = eng.bullets.length;
        if (bulletsFired >= 3) break;
      }
      expect(bulletsFired).toBe(3);
    });

    it('falls back to Classic for invalid fire rate index', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN, 99);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.startMatch();

      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', { ...noInput(), fire: true });
      inputs.set('p2', noInput());

      eng.update(COUNTDOWN_DURATION + 0.1, inputs);
      eng.update(0.02, inputs);
      expect(eng.bullets.length).toBe(1);
      // Should behave like Classic (max 1 bullet)
      eng.update(0.02, inputs);
      expect(eng.bullets.length).toBe(1);
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

    it('serializes and deserializes lives map', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN, DEFAULT_FIRE_RATE, 3);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.startMatch();

      const state = eng.getState();
      expect(state.lives).toBeDefined();
      expect(state.lives!['p1']).toBe(3);
      expect(state.lives!['p2']).toBe(3);

      const eng2 = new GameEngine(0);
      eng2.addPlayer('p1');
      eng2.addPlayer('p2');
      eng2.applyState(state);
      expect(eng2.tanks.get('p1')!.lives).toBe(3);
    });
  });

  describe('lives system', () => {
    it('initializes tanks with configured livesPerRound', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN, DEFAULT_FIRE_RATE, 3);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      expect(eng.tanks.get('p1')!.lives).toBe(3);
      expect(eng.tanks.get('p2')!.lives).toBe(3);
    });

    it('defaults livesPerRound to DEFAULT_LIVES_PER_ROUND', () => {
      expect(engine.livesPerRound).toBe(DEFAULT_LIVES_PER_ROUND);
    });

    it('resets lives on new round', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN, DEFAULT_FIRE_RATE, 3);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.startMatch();

      // Manually reduce lives
      eng.tanks.get('p1')!.lives = 1;

      // Simulate round over -> next round
      eng.scores.set('p2', 1);
      eng.phase = 'ROUND_OVER';
      eng['roundOverTimer'] = 0.01;
      eng.roundResult = { winner: 'p2', loser: 'p1' };

      const inputs = new Map<string, PlayerInput>();
      inputs.set('p1', noInput());
      inputs.set('p2', noInput());
      eng.update(0.1, inputs);

      // Should be in COUNTDOWN for next round
      expect(eng.phase).toBe('COUNTDOWN');
      // Lives should be reset
      expect(eng.tanks.get('p1')!.lives).toBe(3);
      expect(eng.tanks.get('p1')!.eliminated).toBe(false);
    });
  });

  describe('3-4 player games', () => {
    it('supports 3 players', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.addPlayer('p3');
      expect(eng.tanks.size).toBe(3);
      eng.startMatch();
      expect(eng.phase).toBe('COUNTDOWN');
    });

    it('supports 4 players', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.addPlayer('p3');
      eng.addPlayer('p4');
      expect(eng.tanks.size).toBe(4);
      eng.startMatch();
      expect(eng.phase).toBe('COUNTDOWN');
    });

    it('positions 4 players at distinct spawn points', () => {
      const eng = new GameEngine(0, ROUNDS_TO_WIN);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.addPlayer('p3');
      eng.addPlayer('p4');

      const positions = new Set<string>();
      for (const [, tank] of eng.tanks) {
        positions.add(`${tank.x},${tank.y}`);
      }
      expect(positions.size).toBe(4);
    });
  });

  describe('backward compat with lives=1', () => {
    it('behaves identically to original when livesPerRound=1', () => {
      // With lives=1, first kill should end the round (eliminate immediately)
      const eng = new GameEngine(0, ROUNDS_TO_WIN, DEFAULT_FIRE_RATE, 1);
      eng.addPlayer('p1');
      eng.addPlayer('p2');
      eng.startMatch();

      expect(eng.tanks.get('p1')!.lives).toBe(1);
      expect(eng.tanks.get('p2')!.lives).toBe(1);
    });
  });
});
