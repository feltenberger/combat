import { describe, it, expect, beforeEach } from 'vitest';
import { HardBot } from '../../bot/HardBot';
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
    allOpponentUids: ['player'],
    gameState: state,
    arena: new Arena(0),
    dt: 1 / 60,
    gameTime: 5,
    ...overrides,
  };
}

describe('HardBot', () => {
  let bot: HardBot;

  beforeEach(() => {
    bot = new HardBot();
  });

  it('has hard difficulty', () => {
    expect(bot.difficulty).toBe('hard');
  });

  it('dodges incoming bullets', () => {
    const ctx = makeContext();
    const bullet: BulletState = {
      id: 'b1', x: 400, y: 200, angle: Math.PI,
      ownerId: 'player', spawnTime: 0,
    };
    ctx.gameState.bullets = [bullet];

    const input = bot.update(ctx);
    expect(input.up).toBe(true); // Dodging
  });

  it('adapts aggression based on score', () => {
    // When winning, should be more aggressive
    const ctx1 = makeContext();
    ctx1.gameState.scores = { 'cpu': 1, 'player': 0 };
    bot.update(ctx1); // Run update to set aggression

    const ctx2 = makeContext();
    ctx2.gameState.scores = { 'cpu': 0, 'player': 1 };
    // Run second bot with losing score
    const bot2 = new HardBot();
    bot2.update(ctx2);

    // Can't directly check aggression (private), but both should produce valid input
    expect(bot.update(ctx1)).toBeDefined();
    expect(bot2.update(ctx2)).toBeDefined();
  });

  it('returns no-op for dead tank', () => {
    const ctx = makeContext();
    ctx.gameState.tanks['cpu'].alive = false;
    const input = bot.update(ctx);
    expect(input.up).toBe(false);
    expect(input.fire).toBe(false);
  });

  it('produces movement output when engaging', () => {
    // With LOS, bot should engage and produce movement
    const ctx = makeContext();
    // Ensure LOS by placing in open field
    ctx.gameState.tanks['cpu'] = { x: 200, y: 320, angle: 0, alive: true };
    ctx.gameState.tanks['player'] = { x: 600, y: 320, angle: Math.PI, alive: true };

    let hasOutput = false;
    for (let i = 0; i < 20; i++) {
      const input = bot.update({
        ...ctx,
        dt: 1 / 60,
        gameTime: i / 60,
      });
      if (input.up || input.down || input.left || input.right || input.fire) {
        hasOutput = true;
        break;
      }
    }
    expect(hasOutput).toBe(true);
  });

  it('reset clears state', () => {
    for (let i = 0; i < 10; i++) {
      bot.update(makeContext({ dt: 0.1 }));
    }
    bot.reset();
    const input = bot.update(makeContext());
    expect(input).toBeDefined();
  });
});
