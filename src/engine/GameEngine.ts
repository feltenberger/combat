import { GameState, MatchPhase, PlayerInput, BulletState } from '../types/game';
import { Arena } from './Arena';
import { Tank } from './Tank';
import { Bullet } from './Bullet';
import { ParticleSystem } from './ParticleSystem';
import { checkBulletTankCollision, checkTankTankCollision, separateTanks } from './Collision';
import {
  PHYSICS_STEP,
  ROUNDS_TO_WIN,
  COUNTDOWN_DURATION,
  ROUND_OVER_DELAY,
  TILE_SIZE,
  FIRE_RATE_PRESETS,
  DEFAULT_FIRE_RATE,
} from '../config/constants';

export class GameEngine {
  arena: Arena;
  tanks: Map<string, Tank> = new Map();
  bullets: Bullet[] = [];
  particles: ParticleSystem = new ParticleSystem();
  scores: Map<string, number> = new Map();

  phase: MatchPhase = 'WAITING';
  round: number = 1;
  countdown: number = COUNTDOWN_DURATION;
  roundOverTimer: number = 0;
  roundResult: { winner: string | null; loser: string | null } | null = null;
  matchWinner: string | null = null;
  roundsToWin: number = ROUNDS_TO_WIN;

  private accumulator: number = 0;
  private gameTime: number = 0;
  private playerOrder: string[] = [];
  private bulletIdCounter: number = 0;
  private bulletCooldownValue: number;
  private maxBulletsPerPlayer: number;

  constructor(arenaIndex: number, roundsToWin: number = ROUNDS_TO_WIN, fireRate: number = DEFAULT_FIRE_RATE) {
    this.arena = new Arena(arenaIndex);
    this.roundsToWin = roundsToWin;
    const preset = FIRE_RATE_PRESETS[fireRate] ?? FIRE_RATE_PRESETS[DEFAULT_FIRE_RATE];
    this.bulletCooldownValue = preset.cooldown;
    this.maxBulletsPerPlayer = preset.maxBullets;
  }

  addPlayer(uid: string): void {
    const index = this.playerOrder.length;
    this.playerOrder.push(uid);
    const spawn = this.arena.getSpawnPosition(index);
    const tank = new Tank(uid, spawn.x, spawn.y, spawn.angle);
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
      tank.respawn(spawn.x, spawn.y, spawn.angle);
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
    // Update tanks
    for (const [uid, tank] of this.tanks.entries()) {
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
      }
      if (result.hitRock) {
        const rx = result.hitRock.col * TILE_SIZE + TILE_SIZE / 2;
        const ry = result.hitRock.row * TILE_SIZE + TILE_SIZE / 2;
        this.particles.spawnRockHit(rx, ry);
      }
    }

    // Check bullet-tank collisions
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;
      for (const [uid, tank] of this.tanks.entries()) {
        if (checkBulletTankCollision(bullet, tank)) {
          bullet.alive = false;
          tank.kill();
          this.particles.spawnExplosion(tank.x, tank.y);

          // Round over
          const winner = bullet.ownerId;
          const loser = uid;
          this.scores.set(winner, (this.scores.get(winner) || 0) + 1);
          this.roundResult = { winner, loser };
          this.phase = 'ROUND_OVER';
          this.roundOverTimer = ROUND_OVER_DELAY;
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
  }
}
