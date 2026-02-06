import { GameState } from '../types/game';
import { GameEngine } from '../engine/GameEngine';
import { ArenaRenderer } from './ArenaRenderer';
import { TankRenderer } from './TankRenderer';
import { BulletRenderer } from './BulletRenderer';
import { ParticleRenderer } from './ParticleRenderer';
import { HUDRenderer, HUDPlayerInfo } from './HUDRenderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TankColor, RESPAWN_BLINK_RATE, DEFAULT_LIVES_PER_ROUND } from '../config/constants';

export class Renderer {
  private arenaRenderer = new ArenaRenderer();
  private tankRenderer = new TankRenderer();
  private bulletRenderer = new BulletRenderer();
  private particleRenderer = new ParticleRenderer();
  private hudRenderer = new HUDRenderer();

  render(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    playerOrder: string[],
    playerNames: Record<string, string>,
    disconnected: boolean = false,
    playerColors: Record<string, TankColor> = {},
  ): void {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Arena (floor, walls, rocks)
    this.arenaRenderer.render(ctx, engine.arena);

    // Bullets
    for (const bullet of engine.bullets) {
      if (bullet.alive) {
        this.bulletRenderer.render(ctx, bullet.getState());
      }
    }

    // Tanks
    for (let i = 0; i < playerOrder.length; i++) {
      const uid = playerOrder[i];
      const tank = engine.tanks.get(uid);
      if (tank) {
        const color = playerColors[uid] || (i === 0 ? 'blue' : 'red');
        const state = tank.getState();

        if (!state.alive && !tank.eliminated) {
          // Dead but not eliminated — don't render (will respawn)
          continue;
        }

        if (tank.eliminated) {
          // Eliminated — don't render
          continue;
        }

        if (tank.isInvincible()) {
          // Blink effect using game time
          const blinkOn = Math.floor(engine.gameTime * RESPAWN_BLINK_RATE * 2) % 2 === 0;
          if (blinkOn) {
            this.tankRenderer.render(ctx, state, color);
          } else {
            this.tankRenderer.renderGhost(ctx, state, color);
          }
        } else {
          this.tankRenderer.render(ctx, state, color);
        }
      }
    }

    // Particles (on top)
    this.particleRenderer.render(ctx, engine.particles.particles);

    // HUD
    const isMultiPlayer = playerOrder.length > 2;
    const livesPerRound = engine.livesPerRound;
    const showLives = livesPerRound > 1 || isMultiPlayer;

    if (isMultiPlayer || showLives) {
      // Build player info for N-player HUD
      const players: HUDPlayerInfo[] = playerOrder.map(uid => {
        const tank = engine.tanks.get(uid);
        return {
          name: playerNames[uid] || 'Unknown',
          score: engine.scores.get(uid) || 0,
          lives: tank?.lives ?? livesPerRound,
          color: playerColors[uid] || 'blue',
          eliminated: tank?.eliminated ?? false,
        };
      });

      this.hudRenderer.renderNPlayers(ctx, players, engine.round, engine.roundsToWin, livesPerRound);
    } else {
      // Classic 2-player HUD
      const p1 = playerOrder[0] || '';
      const p2 = playerOrder[1] || '';
      const p1Color = playerColors[p1] || 'blue';
      const p2Color = playerColors[p2] || 'red';
      this.hudRenderer.render(
        ctx,
        playerNames[p1] || 'Player 1',
        playerNames[p2] || 'Player 2',
        engine.scores.get(p1) || 0,
        engine.scores.get(p2) || 0,
        engine.round,
        engine.roundsToWin,
        p1Color,
        p2Color,
      );
    }

    // Overlays based on phase
    if (disconnected) {
      this.hudRenderer.renderDisconnect(ctx, CANVAS_HEIGHT);
    } else {
      switch (engine.phase) {
        case 'WAITING':
          this.hudRenderer.renderWaiting(ctx, CANVAS_HEIGHT);
          break;
        case 'COUNTDOWN':
          this.hudRenderer.renderCountdown(ctx, engine.countdown, CANVAS_HEIGHT);
          break;
        case 'ROUND_OVER':
          {
            const winnerUid = engine.roundResult?.winner || null;
            const winnerName = winnerUid ? (playerNames[winnerUid] || 'Unknown') : null;
            this.hudRenderer.renderRoundOver(ctx, CANVAS_HEIGHT, winnerName);
          }
          break;
        case 'MATCH_OVER':
          {
            const matchWinnerName = engine.matchWinner
              ? (playerNames[engine.matchWinner] || 'Unknown')
              : 'Unknown';

            if (isMultiPlayer) {
              const players: HUDPlayerInfo[] = playerOrder.map(uid => {
                const tank = engine.tanks.get(uid);
                return {
                  name: playerNames[uid] || 'Unknown',
                  score: engine.scores.get(uid) || 0,
                  lives: tank?.lives ?? 0,
                  color: playerColors[uid] || 'blue',
                  eliminated: tank?.eliminated ?? true,
                };
              });
              this.hudRenderer.renderMatchOverNPlayers(ctx, CANVAS_HEIGHT, matchWinnerName, players);
            } else {
              const p1 = playerOrder[0] || '';
              const p2 = playerOrder[1] || '';
              this.hudRenderer.renderMatchOver(
                ctx,
                CANVAS_HEIGHT,
                matchWinnerName,
                playerNames[p1] || 'Player 1',
                playerNames[p2] || 'Player 2',
                engine.scores.get(p1) || 0,
                engine.scores.get(p2) || 0,
              );
            }
          }
          break;
      }
    }
  }
}
