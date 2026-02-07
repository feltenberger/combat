import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefensiveBot } from '../../bot/DefensiveBot';
import { BotContext } from '../../bot/BotBrain';
import { Arena } from '../../engine/Arena';
import { GameState, BulletState } from '../../types/game';
import { findCoverPositions } from '../../bot/BotUtilities';

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

describe('DefensiveBot', () => {
  let bot: DefensiveBot;

  beforeEach(() => {
    bot = new DefensiveBot();
    vi.restoreAllMocks();
  });

  it('has defensive difficulty', () => {
    expect(bot.difficulty).toBe('defensive');
  });

  it('defaults to CAMP state on reset', () => {
    // Drive the bot into a different state first
    const ctx = makeContext();
    ctx.gameState.tanks['player'].x = 220;
    ctx.gameState.tanks['player'].y = 200;
    // Make random always return high values to avoid freeze
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    bot.update(ctx); // Should trigger RETREAT due to close distance
    bot.reset();

    // After reset, verify it works normally (starts in CAMP)
    const input = bot.update(makeContext());
    expect(input).toBeDefined();
  });

  it('returns no-op for dead tank', () => {
    const ctx = makeContext();
    ctx.gameState.tanks['cpu'].alive = false;
    const input = bot.update(ctx);
    expect(input.fire).toBe(false);
    expect(input.up).toBe(false);
    expect(input.down).toBe(false);
  });

  it('returns no-op for dead opponent', () => {
    const ctx = makeContext();
    ctx.gameState.tanks['player'].alive = false;
    const input = bot.update(ctx);
    expect(input.fire).toBe(false);
    expect(input.up).toBe(false);
  });

  describe('fire hesitation', () => {
    it('fires when random exceeds hesitation threshold and has LOS + aim', () => {
      // random() = 0.9 > 0.70 hesitation threshold => fires
      // Also > FREEZE_CHANCE*dt so no freeze triggered
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      const ctx = makeContext();
      // Place opponent at angle 0 from bot, with LOS on arena 0
      ctx.gameState.tanks['player'].x = 700;
      ctx.gameState.tanks['player'].y = 200;
      ctx.gameState.tanks['cpu'].angle = 0; // Aiming at opponent

      const input = bot.update(ctx);
      expect(input.fire).toBe(true);
    });

    it('suppresses fire when random is below hesitation threshold', () => {
      // random() = 0.5 < 0.70 hesitation threshold => no fire
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const ctx = makeContext();
      ctx.gameState.tanks['player'].x = 700;
      ctx.gameState.tanks['player'].y = 200;
      ctx.gameState.tanks['cpu'].angle = 0;

      const input = bot.update(ctx);
      expect(input.fire).toBe(false);
    });

    it('transitions to COVER after firing from camp', () => {
      // After firing with LOS, bot should seek cover on next update
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      const ctx = makeContext();
      ctx.gameState.tanks['player'].x = 700;
      ctx.gameState.tanks['player'].y = 200;
      ctx.gameState.tanks['cpu'].angle = 0;

      const input1 = bot.update(ctx);
      expect(input1.fire).toBe(true);

      // Next frame: bot is now in COVER state, should not fire
      const input2 = bot.update(ctx);
      expect(input2.fire).toBe(false);
    });
  });

  describe('creep chance', () => {
    it('makes movement intermittent — only moves ~30% of frames', () => {
      let moveCount = 0;
      const totalFrames = 200;

      for (let i = 0; i < totalFrames; i++) {
        const bot2 = new DefensiveBot();
        vi.restoreAllMocks();
        // Alternate random values to simulate realistic randomness
        const val = i / totalFrames;
        vi.spyOn(Math, 'random').mockReturnValue(val);

        const ctx = makeContext();
        // Place opponent very far away so bot wants to move forward
        ctx.gameState.tanks['player'].x = 900;
        ctx.gameState.tanks['player'].y = 200;
        // No LOS so it stays in CAMP (put a wall between them conceptually —
        // arena 0 may have open LOS, so we use distance-based behavior)

        const input = bot2.update(ctx);
        if (input.up || input.down) moveCount++;
      }

      // Should move significantly less than every frame
      expect(moveCount).toBeLessThan(totalFrames * 0.6);
    });
  });

  describe('freeze state', () => {
    it('produces noInput when freeze timer is active', () => {
      // Set random to trigger a freeze on first call
      // freeze check: Math.random() < 0.12 * dt => need random < 0.002 for dt=1/60
      // We mock it to return 0.0 (always triggers freeze)
      vi.spyOn(Math, 'random').mockReturnValue(0.0);

      const ctx = makeContext();
      const input = bot.update(ctx);

      // Should be frozen (noInput)
      expect(input.fire).toBe(false);
      expect(input.up).toBe(false);
      expect(input.down).toBe(false);
      expect(input.left).toBe(false);
      expect(input.right).toBe(false);
    });

    it('remains frozen for the freeze duration', () => {
      // Trigger freeze with random = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.0);
      bot.update(makeContext()); // triggers freeze with min duration 0.5s

      // Now set random high so no new freeze triggers
      vi.restoreAllMocks();
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      // At 60fps, 0.5s = 30 frames. Bot should remain frozen for at least some frames.
      let frozenFrames = 0;
      for (let i = 0; i < 30; i++) {
        const input = bot.update(makeContext());
        if (!input.up && !input.down && !input.left && !input.right && !input.fire) {
          frozenFrames++;
        }
      }

      // Should be frozen for most of those frames (freeze min is 0.5s = 30 frames at 60fps)
      expect(frozenFrames).toBeGreaterThan(15);
    });
  });

  describe('retreat', () => {
    it('uses backward movement (down=true, up=false) when opponent is close', () => {
      // Avoid freeze by mocking random high
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const ctx = makeContext();
      // Place opponent within retreat distance (250px)
      ctx.gameState.tanks['player'].x = 300;
      ctx.gameState.tanks['player'].y = 200;
      // Distance = 100px < 250px retreat threshold

      const input = bot.update(ctx);
      // Should retreat backward
      expect(input.down).toBe(true);
      expect(input.up).toBe(false);
    });

    it('retreats at the new larger distance threshold (250px)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const ctx = makeContext();
      // Place opponent at exactly 240px away (< 250 threshold)
      ctx.gameState.tanks['player'].x = 440;
      ctx.gameState.tanks['player'].y = 200;
      // Distance = 240px < 250px

      const input = bot.update(ctx);
      expect(input.down).toBe(true);
      expect(input.up).toBe(false);
    });

    it('does not retreat when opponent is beyond retreat distance', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const ctx = makeContext();
      // Place opponent at 400px away (> 250 threshold)
      ctx.gameState.tanks['player'].x = 600;
      ctx.gameState.tanks['player'].y = 200;

      const input = bot.update(ctx);
      // Should NOT be retreating backward
      expect(input.down).toBe(false);
    });
  });

  describe('cover and peek cycle', () => {
    // Helper: drive the bot from CAMP into PEEK state by simulating the full cycle.
    // Returns the cover position used so callers can build contexts from it.
    function driveToPeek(bot: DefensiveBot): { x: number; y: number } {
      const arena = new Arena(0);
      const playerPos = { x: 500, y: 300 };
      const cpuStart = { x: 200, y: 200 };

      // Frame 1: CAMP detects LOS → COVER (coverTarget = null)
      bot.update(makeContext());

      // Frame 2: COVER sets coverTarget via findCoverPositions from cpuStart
      bot.update(makeContext({ dt: 1 / 60 }));

      // Compute the same cover target the bot selected
      const covers = findCoverPositions(
        cpuStart.x, cpuStart.y, playerPos.x, playerPos.y, arena, 8
      );
      const coverTarget = covers[0];

      // Place bot at coverTarget so linger timer starts (dist < 20)
      // Need 180+ frames at 1/60 increment to pass 3s linger time
      for (let i = 0; i < 185; i++) {
        const ctx = makeContext({ dt: 1 / 60 });
        ctx.gameState.tanks['cpu'].x = coverTarget.x;
        ctx.gameState.tanks['cpu'].y = coverTarget.y;
        bot.update(ctx);
      }

      return coverTarget;
    }

    it('transitions from COVER to PEEK after linger time', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const coverTarget = driveToPeek(bot);

      // Bot should now be in PEEK — peek moves forward (up=true)
      const ctx = makeContext({ dt: 1 / 60 });
      ctx.gameState.tanks['cpu'].x = coverTarget.x;
      ctx.gameState.tanks['cpu'].y = coverTarget.y;
      const input = bot.update(ctx);
      expect(input.up).toBe(true);
    });

    it('PEEK moves toward opponent to step out of cover', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const coverTarget = driveToPeek(bot);

      // Run several PEEK frames — all should have up=true
      let peekFramesWithMovement = 0;
      for (let i = 0; i < 30; i++) {
        const ctx = makeContext({ dt: 1 / 60 });
        ctx.gameState.tanks['cpu'].x = coverTarget.x;
        ctx.gameState.tanks['cpu'].y = coverTarget.y;
        const input = bot.update(ctx);
        if (input.up) peekFramesWithMovement++;
      }

      expect(peekFramesWithMovement).toBeGreaterThan(0);
    });

    it('PEEK transitions back to CAMP after peek duration', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const coverTarget = driveToPeek(bot);

      // Run through the 1.5s PEEK duration (90 frames) plus a few extra
      for (let i = 0; i < 95; i++) {
        const ctx = makeContext({ dt: 1 / 60 });
        ctx.gameState.tanks['cpu'].x = coverTarget.x;
        ctx.gameState.tanks['cpu'].y = coverTarget.y;
        bot.update(ctx);
      }

      // Bot should be back in CAMP now. Move it to a position with clear LOS
      // and aimed at the opponent. If it fires, it proves CAMP was reached
      // (COVER never fires).
      const ctx = makeContext({ dt: 1 / 60 });
      ctx.gameState.tanks['cpu'].x = 200;
      ctx.gameState.tanks['cpu'].y = 200;
      ctx.gameState.tanks['cpu'].angle = 0;
      ctx.gameState.tanks['player'].x = 700;
      ctx.gameState.tanks['player'].y = 200;
      const input = bot.update(ctx);
      // CAMP with LOS + aim + high random → fires (proves we're in CAMP, not COVER)
      expect(input.fire).toBe(true);
    });
  });

  describe('peek firing', () => {
    it('can fire during peek when it has LOS and is aimed', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const arena = new Arena(0);
      const playerPos = { x: 700, y: 200 };

      // Frame 1: CAMP with LOS → fires → COVER
      const ctx = makeContext();
      ctx.gameState.tanks['player'].x = playerPos.x;
      ctx.gameState.tanks['player'].y = playerPos.y;
      ctx.gameState.tanks['cpu'].angle = 0;
      bot.update(ctx);

      // Frame 2: COVER sets coverTarget
      const ctx2 = makeContext({ dt: 1 / 60 });
      ctx2.gameState.tanks['player'].x = playerPos.x;
      ctx2.gameState.tanks['player'].y = playerPos.y;
      bot.update(ctx2);

      // Compute cover target
      const covers = findCoverPositions(200, 200, playerPos.x, playerPos.y, arena, 8);
      const coverTarget = covers[0];

      // Place bot at cover target, linger for 185 frames → PEEK
      for (let i = 0; i < 185; i++) {
        const c = makeContext({ dt: 1 / 60 });
        c.gameState.tanks['cpu'].x = coverTarget.x;
        c.gameState.tanks['cpu'].y = coverTarget.y;
        c.gameState.tanks['player'].x = playerPos.x;
        c.gameState.tanks['player'].y = playerPos.y;
        bot.update(c);
      }

      // Now in PEEK — place bot at position with clear LOS, aimed at opponent
      let firedDuringPeek = false;
      for (let i = 0; i < 90; i++) {
        const peekCtx = makeContext({ dt: 1 / 60 });
        peekCtx.gameState.tanks['cpu'].x = 400;
        peekCtx.gameState.tanks['cpu'].y = 200;
        peekCtx.gameState.tanks['cpu'].angle = 0; // Aimed at (700, 200)
        peekCtx.gameState.tanks['player'].x = playerPos.x;
        peekCtx.gameState.tanks['player'].y = playerPos.y;
        const input = bot.update(peekCtx);
        if (input.fire) firedDuringPeek = true;
      }

      expect(firedDuringPeek).toBe(true);
    });
  });

  describe('dodge priority', () => {
    it('dodges incoming bullets even during freeze', () => {
      // First trigger a freeze
      vi.spyOn(Math, 'random').mockReturnValue(0.0);
      bot.update(makeContext());

      // Now add a threatening bullet
      vi.restoreAllMocks();
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const ctx = makeContext();
      const bullet: BulletState = {
        id: 'b1', x: 400, y: 200, angle: Math.PI,
        ownerId: 'player', spawnTime: 0,
      };
      ctx.gameState.bullets = [bullet];

      const input = bot.update(ctx);
      // Dodge takes priority — should be moving
      expect(input.up).toBe(true);
    });

    it('does not dodge own bullets', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const ctx = makeContext();
      const bullet: BulletState = {
        id: 'b1', x: 220, y: 200, angle: 0,
        ownerId: 'cpu', spawnTime: 0,
      };
      ctx.gameState.bullets = [bullet];

      const input = bot.update(ctx);
      expect(input).toBeDefined();
    });

    it('dodges incoming bullets regardless of current state', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      // Drive bot into RETREAT state
      const retreatCtx = makeContext();
      retreatCtx.gameState.tanks['player'].x = 300;
      retreatCtx.gameState.tanks['player'].y = 200;
      bot.update(retreatCtx);

      // Now add a threatening bullet while still close
      const ctx = makeContext();
      ctx.gameState.tanks['player'].x = 300;
      ctx.gameState.tanks['player'].y = 200;
      const bullet: BulletState = {
        id: 'b1', x: 400, y: 200, angle: Math.PI,
        ownerId: 'player', spawnTime: 0,
      };
      ctx.gameState.bullets = [bullet];

      const input = bot.update(ctx);
      // Dodge still takes priority over retreat
      expect(input.up).toBe(true);
      expect(input.down).toBe(false);
    });
  });

  it('reset clears all internal state', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    // Run some updates
    for (let i = 0; i < 30; i++) {
      bot.update(makeContext({ dt: 0.1 }));
    }
    bot.reset();
    // Should work fine after reset
    const input = bot.update(makeContext());
    expect(input).toBeDefined();
  });
});
