import { describe, it, expect, beforeEach } from 'vitest';
import { EasyBot } from '../../bot/EasyBot';
import { BotContext } from '../../bot/BotBrain';
import { Arena } from '../../engine/Arena';
import { GameState } from '../../types/game';

function makeContext(overrides?: Partial<BotContext>): BotContext {
  const state: GameState = {
    phase: 'PLAYING',
    tanks: {
      'cpu-bot-easy': { x: 100, y: 100, angle: 0, alive: true },
      'player1': { x: 400, y: 300, angle: Math.PI, alive: true },
    },
    bullets: [],
    rockHP: {},
    scores: { 'cpu-bot-easy': 0, 'player1': 0 },
    round: 1,
    countdown: 0,
    roundResult: null,
    matchWinner: null,
    timestamp: Date.now(),
  };

  return {
    myUid: 'cpu-bot-easy',
    opponentUid: 'player1',
    gameState: state,
    arena: new Arena(0),
    dt: 1 / 60,
    gameTime: 5,
    ...overrides,
  };
}

describe('EasyBot', () => {
  let bot: EasyBot;

  beforeEach(() => {
    bot = new EasyBot();
  });

  it('has easy difficulty', () => {
    expect(bot.difficulty).toBe('easy');
  });

  it('returns no-op input when in IDLE state (reaction delay)', () => {
    const ctx = makeContext({ dt: 0.01 }); // Small dt, won't exceed delay
    const input = bot.update(ctx);
    // During IDLE, all buttons should be false
    expect(input.up).toBe(false);
    expect(input.fire).toBe(false);
  });

  it('eventually transitions to ENGAGE after reaction delay', () => {
    // Feed many updates to exceed reaction delay
    let hasEngaged = false;
    for (let i = 0; i < 100; i++) {
      const ctx = makeContext({ dt: 0.05, gameTime: i * 0.05 });
      const input = bot.update(ctx);
      if (input.up || input.fire || input.left || input.right) {
        hasEngaged = true;
        break;
      }
    }
    expect(hasEngaged).toBe(true);
  });

  it('returns no-op for dead tank', () => {
    const ctx = makeContext();
    ctx.gameState.tanks['cpu-bot-easy'].alive = false;
    const input = bot.update(ctx);
    expect(input.left).toBe(false);
    expect(input.right).toBe(false);
    expect(input.up).toBe(false);
    expect(input.fire).toBe(false);
  });

  it('returns no-op for dead opponent', () => {
    const ctx = makeContext();
    ctx.gameState.tanks['player1'].alive = false;
    // Force into ENGAGE state first
    for (let i = 0; i < 100; i++) {
      bot.update(makeContext({ dt: 0.05 }));
    }
    const input = bot.update(ctx);
    expect(input.fire).toBe(false);
  });

  it('reset clears state back to IDLE', () => {
    // Advance past idle
    for (let i = 0; i < 100; i++) {
      bot.update(makeContext({ dt: 0.05 }));
    }
    bot.reset();
    // After reset, should be in IDLE again
    const input = bot.update(makeContext({ dt: 0.01 }));
    expect(input.up).toBe(false);
    expect(input.fire).toBe(false);
  });

  it('fires when roughly aimed at opponent', () => {
    // Set bot facing directly at opponent
    const ctx = makeContext();
    ctx.gameState.tanks['cpu-bot-easy'].angle = Math.atan2(300 - 100, 400 - 100);
    // Force past idle
    for (let i = 0; i < 100; i++) {
      bot.update(makeContext({ dt: 0.05 }));
    }
    const input = bot.update(ctx);
    // Should fire since aimed within tolerance
    // Note: depends on rotation chance, so we run multiple times
    let hasFired = false;
    for (let i = 0; i < 20; i++) {
      const r = bot.update(ctx);
      if (r.fire) { hasFired = true; break; }
    }
    expect(hasFired).toBe(true);
  });
});
