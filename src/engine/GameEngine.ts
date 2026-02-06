import { GameState, MatchPhase, PlayerInput, BulletState } from '../types/game';
import { Arena } from './Arena';
import { Tank } from './Tank';
import { Bullet } from './Bullet';
import { ParticleSystem } from './ParticleSystem';
import { checkBulletTankCollision, checkTankTankCollision, separateTanks } from './Collision';
import { SoundManager } from './SoundManager';
import {
  PHYSICS_STEP,
  ROUNDS_TO_WIN,
  COUNTDOWN_DURATION,
  ROUND_OVER_DELAY,
  TILE_SIZE,
  FIRE_RATE_PRESETS,
  DEFAULT_FIRE_RATE,
  DEFAULT_LIVES_PER_ROUND,
  RESPAWN_INVINCIBILITY_DURATION,
} from '../config/constants';

export class GameEngine {
  arena: Arena;
  tanks: Map<string, Tank> = new Map();
  bullets: Bullet[] = [];
  particles: ParticleSystem = new ParticleSystem();
  sound: SoundManager | null = null;
  scores: Map<string, number> = new Map();

  phase: MatchPhase = 'WAITING';
  round: number = 1;
  countdown: number = COUNTDOWN_DURATION;
  roundOverTimer: number = 0;
  roundResult: { winner: string | null; loser: string | null; eliminations?: string[] } | null = null;
  matchWinner: string | null = null;
  roundsToWin: number = ROUNDS_TO_WIN;
  livesPerRound: number = DEFAULT_LIVES_PER_ROUND;

  private accumulator: number = 0;
  gameTime: number = 0;
  private playerOrder: string[] = [];
  private bulletIdCounter: number = 0;
  private bulletCooldownValue: number;
  private maxBulletsPerPlayer: number;

  constructor(arenaIndex: number, roundsToWin: number = ROUNDS_TO_WIN, fireRate: number = DEFAULT_FIRE_RATE, livesPerRound: number = DEFAULT_LIVES_PER_ROUND) {
    this.arena = new Arena(arenaIndex);
    this.roundsToWin = roundsToWin;
    this.livesPerRound = livesPerRound;
    const preset = FIRE_RATE_PRESETS[fireRate] ?? FIRE_RATE_PRESETS[DEFAULT_FIRE_RATE];
    this.bulletCooldownValue = preset.cooldown;
    this.maxBulletsPerPlayer = preset.maxBullets;
  }

  addPlayer(uid: string): void {
    const index = this.playerOrder.length;
    this.playerOrder.push(uid);
    const spawn = this.arena.getSpawnPosition(index);
    const tank = new Tank(uid, spawn.x, spawn.y, spawn.angle);
    tank.lives = this.livesPerRound;
    this.tanks.set(uid, tank);
    this.scores.set(uid, 0);
  }

  startMatch(): void {
    if (this.playerOrder.length < 2) return;
    this.phase = 'COUNTDOWN';
    this.countdown = COUNTDOWN_DURATION;
    this.round = 1;
    this.resetRound();
  }

  private resetRound(): void {
    this.bullets = [];
    this.particles.clear();
    this.roundResult = null;
    this.arena.resetRocks();

    this.playerOrder.forEach((uid, index) => {
      const spawn = this.arena.getSpawnPosition(index);
      const tank = this.tanks.get(uid)!;
      tank.respawnForNewRound(spawn.x, spawn.y, spawn.angle, this.livesPerRound);
    });
  }

  update(dt: number, inputs: Map<string, PlayerInput>): void {
    this.accumulator += dt;

    while (this.accumulator >= PHYSICS_STEP) {
      this.fixedUpdate(PHYSICS_STEP, inputs);
      this.accumulator -= PHYSICS_STEP;
    }

    // Update particles with actual dt for smoothness
    this.particles.update(dt);
  }

  private fixedUpdate(dt: number, inputs: Map<string, PlayerInput>): void {
    this.gameTime += dt;

    switch (this.phase) {
      case 'WAITING':
        break;

      case 'COUNTDOWN':
        this.countdown -= dt;
        if (this.countdown <= 0) {
          this.phase = 'PLAYING';
          this.countdown = 0;
        }
        break;

      case 'PLAYING':
        this.updatePlaying(dt, inputs);
        break;

      case 'ROUND_OVER':
        this.roundOverTimer -= dt;
        if (this.roundOverTimer <= 0) {
          // Check if match is over
          for (const [uid, score] of this.scores.entries()) {
            if (score >= this.roundsToWin) {
              this.phase = 'MATCH_OVER';
              this.matchWinner = uid;
              return;
            }
          }
          // Next round
          this.round++;
          this.resetRound();
          this.phase = 'COUNTDOWN';
          this.countdown = COUNTDOWN_DURATION;
        }
        break;

      case 'MATCH_OVER':
        break;
    }
  }

  private updatePlaying(dt: number, inputs: Map<string, PlayerInput>): void {
    // Update tanks (skip eliminated)
    for (const [uid, tank] of this.tanks.entries()) {
      if (tank.eliminated) continue;
      const input = inputs.get(uid) || {
        left: false, right: false, up: false, down: false, fire: false, timestamp: 0,
      };
      tank.update(input, dt, this.arena);

      // Handle firing
      if (input.fire && tank.alive && tank.bulletCooldown <= 0) {
        const bulletCount = this.bullets.filter(b => b.ownerId === uid && b.alive).length;
        if (bulletCount < this.maxBulletsPerPlayer) {
          const spawnPt = tank.getBulletSpawnPoint();
          const bullet = new Bullet(
            `${uid}_${this.bulletIdCounter++}`,
            spawnPt.x,
            spawnPt.y,
            tank.angle,
            uid,
            this.gameTime
          );
          this.bullets.push(bullet);
          this.sound?.playGunshot();
          tank.bulletCooldown = this.bulletCooldownValue;
        }
      }
    }

    // Separate overlapping tanks
    const tankList = Array.from(this.tanks.values());
    for (let i = 0; i < tankList.length; i++) {
      for (let j = i + 1; j < tankList.length; j++) {
        if (checkTankTankCollision(tankList[i], tankList[j])) {
          separateTanks(tankList[i], tankList[j]);
        }
      }
    }

    // Update bullets
    for (const bullet of this.bullets) {
      const result = bullet.update(dt, this.gameTime, this.arena);
      if (result.hitWall) {
        this.particles.spawnWallSpark(bullet.x, bullet.y);
        this.sound?.playWallHit();
      }
      if (result.hitRock) {
        const rx = result.hitRock.col * TILE_SIZE + TILE_SIZE / 2;
        const ry = result.hitRock.row * TILE_SIZE + TILE_SIZE / 2;
        this.particles.spawnRockHit(rx, ry);
        this.sound?.playRockHit();
      }
    }

    // Check bullet-tank collisions
    let killHappened = false;
    for (const bullet of this.bullets) {
      if (!bullet.alive || killHappened) continue;
      for (const [uid, tank] of this.tanks.entries()) {
        if (checkBulletTankCollision(bullet, tank)) {
          bullet.alive = false;
          tank.kill();
          this.particles.spawnExplosion(tank.x, tank.y);
          this.sound?.playExplosion();

          const shooter = bullet.ownerId;
          const eliminated = tank.loseLife();

          if (!eliminated) {
            // Respawn with invincibility
            const playerIndex = this.playerOrder.indexOf(uid);
            const spawn = this.arena.getSpawnPosition(playerIndex);
            tank.respawn(spawn.x, spawn.y, spawn.angle);
            tank.invincibilityTimer = RESPAWN_INVINCIBILITY_DURATION;
          }

          // Count alive (non-eliminated) players
          const alivePlayers = this.playerOrder.filter(pUid => {
            const t = this.tanks.get(pUid);
            return t && !t.eliminated;
          });

          if (alivePlayers.length <= 1) {
            // Round over — last man standing wins
            const winner = alivePlayers[0] || null;
            const eliminatedUids = this.playerOrder.filter(pUid => {
              const t = this.tanks.get(pUid);
              return t && t.eliminated;
            });

            if (winner) {
              this.scores.set(winner, (this.scores.get(winner) || 0) + 1);
            }

            // For backward compat, set loser to the last eliminated player (uid)
            // In 2-player mode this matches old behavior exactly
            this.roundResult = {
              winner,
              loser: uid,
              eliminations: eliminatedUids,
            };
            this.phase = 'ROUND_OVER';
            this.roundOverTimer = ROUND_OVER_DELAY;
            killHappened = true;
            break;
          } else {
            // In multi-lives mode, award a point to the shooter for each kill
            // only if round isn't over (don't double-count the final kill)
            // Actually - points only on round win, not per kill, to keep scoring simple
          }

          killHappened = true;
          break;
        }
      }
    }

    // Remove dead bullets
    this.bullets = this.bullets.filter(b => b.alive);
  }

  getState(): GameState {
    const tanks: Record<string, import('../types/game').TankState> = {};
    for (const [uid, tank] of this.tanks.entries()) {
      tanks[uid] = tank.getState();
    }

    const scores: Record<string, number> = {};
    for (const [uid, score] of this.scores.entries()) {
      scores[uid] = score;
    }

    const lives: Record<string, number> = {};
    for (const [uid, tank] of this.tanks.entries()) {
      lives[uid] = tank.lives;
    }

    return {
      phase: this.phase,
      tanks,
      bullets: this.bullets.filter(b => b.alive).map(b => b.getState()),
      rockHP: this.arena.getRockHPMap(),
      scores,
      round: this.round,
      countdown: this.countdown,
      roundResult: this.roundResult,
      matchWinner: this.matchWinner,
      timestamp: Date.now(),
      lives,
    };
  }

  applyState(state: GameState): void {
    this.phase = state.phase;
    this.round = state.round;
    this.countdown = state.countdown;
    this.roundResult = state.roundResult;
    this.matchWinner = state.matchWinner;

    // Update tanks
    if (state.tanks) {
      for (const [uid, tankState] of Object.entries(state.tanks)) {
        let tank = this.tanks.get(uid);
        if (!tank) {
          tank = new Tank(uid, tankState.x, tankState.y, tankState.angle);
          this.tanks.set(uid, tank);
          if (!this.playerOrder.includes(uid)) this.playerOrder.push(uid);
          if (!this.scores.has(uid)) this.scores.set(uid, 0);
        }
        tank.setState(tankState);
      }
    }

    // Update bullets (Firebase strips empty arrays)
    const bullets = Array.isArray(state.bullets) ? state.bullets : [];
    this.bullets = bullets.map(bs => {
      const b = new Bullet(bs.id, bs.x, bs.y, bs.angle, bs.ownerId, bs.spawnTime);
      return b;
    });

    // Update scores
    if (state.scores) {
      for (const [uid, score] of Object.entries(state.scores)) {
        this.scores.set(uid, score);
      }
    }

    // Update rock HP
    if (state.rockHP) {
      this.arena.setRockHPFromMap(state.rockHP);
    }

    // Update lives
    if (state.lives) {
      for (const [uid, livesCount] of Object.entries(state.lives)) {
        const tank = this.tanks.get(uid);
        if (tank) tank.lives = livesCount;
      }
    }
  }
}
