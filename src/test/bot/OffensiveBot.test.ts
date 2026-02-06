import { describe, it, expect, beforeEach } from 'vitest';
import { OffensiveBot } from '../../bot/OffensiveBot';
import { BotContext } from '../../bot/BotBrain';
import { Arena } from '../../engine/Arena';
import { GameState } from '../../types/game';

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
    allOpponentUids: ['player'],
    gameState: state,
    arena: new Arena(0),
    dt: 1 / 60,
    gameTime: 5,
    ...overrides,
  };
}

describe('OffensiveBot', () => {
  let bot: OffensiveBot;

  beforeEach(() => {
    bot = new OffensiveBot();
  });

  it('has offensive difficulty', () => {
    expect(bot.difficulty).toBe('offensive');
  });

  it('moves forward aggressively toward opponent', () => {
    const ctx = makeContext();
    const input = bot.update(ctx);
    // Should be moving forward
    expect(input.up).toBe(true);
  });

  it('fires when aimed at opponent', () => {
    const ctx = makeContext();
    // Aim directly at opponent
    const angle = Math.atan2(300 - 200, 500 - 200);
    ctx.gameState.tanks['cpu'].angle = angle;

    const input = bot.update(ctx);
    expect(input.fire).toBe(true);
  });

  it('does not fire when not aimed', () => {
    const ctx = makeContext();
    // Aim away from opponent
    ctx.gameState.tanks['cpu'].angle = Math.PI; // facing left, opponent is right

    const input = bot.update(ctx);
    expect(input.fire).toBe(false);
  });

  it('returns no-op for dead tank', () => {
    const ctx = makeContext();
    ctx.gameState.tanks['cpu'].alive = false;
    const input = bot.update(ctx);
    expect(input.up).toBe(false);
  });

  it('attacks aggressively when close', () => {
    const ctx = makeContext();
    // Place opponent within engage distance
    ctx.gameState.tanks['player'].x = 350;
    ctx.gameState.tanks['player'].y = 200;
    ctx.gameState.tanks['cpu'].angle = 0; // facing right toward opponent

    const input = bot.update(ctx);
    expect(input.up).toBe(true); // Still moving forward aggressively
  });

  it('reset clears state', () => {
    for (let i = 0; i < 10; i++) {
      bot.update(makeContext());
    }
    bot.reset();
    const input = bot.update(makeContext());
    expect(input).toBeDefined();
  });
});
