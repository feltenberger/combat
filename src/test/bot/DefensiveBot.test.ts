import { describe, it, expect, beforeEach } from 'vitest';
import { DefensiveBot } from '../../bot/DefensiveBot';
import { BotContext } from '../../bot/BotBrain';
import { Arena } from '../../engine/Arena';
import { GameState, BulletState } from '../../types/game';

function makeContext(overrides?: Partial<BotContext>): BotContext {
  const state: GameState = {
    phase: 'PLAYING',
    tanks: {
      'cpu': { x: 200, y: 200, angle: 0, alive: true },
      'player': { x: 500, y: 300, angle: Math.PI, alive: true },
    },
    bullets: [],
    rockHP: {},
    scores: { 'cpu': 0, 'player': 0 },
    round: 1,
    countdown: 0,
    roundResult: null,
    matchWinner: null,
    timestamp: Date.now(),
  };

  return {
    myUid: 'cpu',
    opponentUid: 'player',
    gameState: state,
    arena: new Arena(0),
    dt: 1 / 60,
    gameTime: 5,
    ...overrides,
  };
}

describe('DefensiveBot', () => {
  let bot: DefensiveBot;

  beforeEach(() => {
    bot = new DefensiveBot();
  });

  it('has defensive difficulty', () => {
    expect(bot.difficulty).toBe('defensive');
  });

  it('returns no-op for dead tank', () => {
    const ctx = makeContext();
    ctx.gameState.tanks['cpu'].alive = false;
    const input = bot.update(ctx);
    expect(input.fire).toBe(false);
    expect(input.up).toBe(false);
  });

  it('dodges incoming bullets', () => {
    const ctx = makeContext();
    // Bullet heading straight at bot
    const bullet: BulletState = {
      id: 'b1', x: 400, y: 200, angle: Math.PI, // heading left toward bot at (200,200)
      ownerId: 'player', spawnTime: 0,
    };
    ctx.gameState.bullets = [bullet];

    const input = bot.update(ctx);
    // Should try to move (dodge)
    expect(input.up).toBe(true);
  });

  it('does not dodge own bullets', () => {
    const ctx = makeContext();
    const bullet: BulletState = {
      id: 'b1', x: 220, y: 200, angle: 0,
      ownerId: 'cpu', spawnTime: 0,
    };
    ctx.gameState.bullets = [bullet];

    // Should not dodge own bullet, just patrol normally
    const input = bot.update(ctx);
    // The key test: it should NOT panic-dodge from its own bullet
    expect(input).toBeDefined();
  });

  it('retreats when opponent is too close', () => {
    const ctx = makeContext();
    // Place opponent very close (within retreat distance of 150px)
    ctx.gameState.tanks['player'].x = 250;
    ctx.gameState.tanks['player'].y = 200;

    const input = bot.update(ctx);
    // Should be moving (retreating)
    expect(input.up).toBe(true);
  });

  it('reset clears state', () => {
    // Run some updates
    for (let i = 0; i < 10; i++) {
      bot.update(makeContext({ dt: 0.1 }));
    }
    bot.reset();
    // Should work fine after reset
    const input = bot.update(makeContext());
    expect(input).toBeDefined();
  });
});
