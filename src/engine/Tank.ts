import { TankState, PlayerInput } from '../types/game';
import { TANK_SPEED, TANK_ROTATION_SPEED, TANK_RADIUS, TILE_SIZE, DEFAULT_LIVES_PER_ROUND } from '../config/constants';
import { Arena } from './Arena';
import { pixelToTile } from '../utils/math';

export class Tank {
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  uid: string;
  bulletCooldown: number = 0;
  lives: number = DEFAULT_LIVES_PER_ROUND;
  eliminated: boolean = false;
  invincibilityTimer: number = 0;

  constructor(uid: string, x: number, y: number, angle: number) {
    this.uid = uid;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.alive = true;
  }

  isInvincible(): boolean {
    return this.invincibilityTimer > 0;
  }

  loseLife(): boolean {
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this.eliminated = true;
      return true; // eliminated
    }
    return false; // still has lives
  }

  respawnForNewRound(x: number, y: number, angle: number, lives: number): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.alive = true;
    this.bulletCooldown = 0;
    this.lives = lives;
    this.eliminated = false;
    this.invincibilityTimer = 0;
  }

  update(input: PlayerInput, dt: number, arena: Arena): void {
    if (!this.alive) return;

    // Tick down invincibility
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= dt;
      if (this.invincibilityTimer < 0) this.invincibilityTimer = 0;
    }

    let dx = 0;
    let dy = 0;

    if (input.targetAngle !== undefined) {
      // Touch/joystick: rotate toward target angle and move forward
      const TOUCH_ROTATION_MULT = 3;
      let angleDiff = input.targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      const maxRotation = TANK_ROTATION_SPEED * TOUCH_ROTATION_MULT * dt;
      if (Math.abs(angleDiff) <= maxRotation) {
        this.angle = input.targetAngle;
      } else {
        this.angle += Math.sign(angleDiff) * maxRotation;
      }

      dx = Math.cos(this.angle) * TANK_SPEED * dt;
      dy = Math.sin(this.angle) * TANK_SPEED * dt;
    } else {
      // Keyboard: standard rotation + forward/backward
      if (input.left) this.angle -= TANK_ROTATION_SPEED * dt;
      if (input.right) this.angle += TANK_ROTATION_SPEED * dt;

      if (input.up) {
        dx = Math.cos(this.angle) * TANK_SPEED * dt;
        dy = Math.sin(this.angle) * TANK_SPEED * dt;
      }
      if (input.down) {
        dx = -Math.cos(this.angle) * TANK_SPEED * dt * 0.6; // Slower reverse
        dy = -Math.sin(this.angle) * TANK_SPEED * dt * 0.6;
      }
    }

    // Normalize angle
    while (this.angle > Math.PI) this.angle -= 2 * Math.PI;
    while (this.angle < -Math.PI) this.angle += 2 * Math.PI;

    // Try to move, with wall sliding
    if (dx !== 0 || dy !== 0) {
      const newX = this.x + dx;
      const newY = this.y + dy;

      if (!this.collidesWithArena(newX, newY, arena)) {
        this.x = newX;
        this.y = newY;
      } else if (!this.collidesWithArena(newX, this.y, arena)) {
        // Slide along X
        this.x = newX;
      } else if (!this.collidesWithArena(this.x, newY, arena)) {
        // Slide along Y
        this.y = newY;
      }
    }

    // Update cooldown
    if (this.bulletCooldown > 0) {
      this.bulletCooldown -= dt;
    }
  }

  private collidesWithArena(x: number, y: number, arena: Arena): boolean {
    // Check multiple points around the tank circle
    const checkPoints = [
      { x: x, y: y },
      { x: x + TANK_RADIUS, y: y },
      { x: x - TANK_RADIUS, y: y },
      { x: x, y: y + TANK_RADIUS },
      { x: x, y: y - TANK_RADIUS },
      { x: x + TANK_RADIUS * 0.707, y: y + TANK_RADIUS * 0.707 },
      { x: x - TANK_RADIUS * 0.707, y: y + TANK_RADIUS * 0.707 },
      { x: x + TANK_RADIUS * 0.707, y: y - TANK_RADIUS * 0.707 },
      { x: x - TANK_RADIUS * 0.707, y: y - TANK_RADIUS * 0.707 },
    ];

    for (const pt of checkPoints) {
      const tile = pixelToTile(pt.x, pt.y, TILE_SIZE);
      if (arena.isSolid(tile.col, tile.row)) {
        return true;
      }
    }
    return false;
  }

  getState(): TankState {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      alive: this.alive,
      lives: this.lives,
      eliminated: this.eliminated,
      invincible: this.isInvincible(),
    };
  }

  setState(state: TankState): void {
    this.x = state.x;
    this.y = state.y;
    this.angle = state.angle;
    this.alive = state.alive;
    if (state.lives !== undefined) this.lives = state.lives;
    if (state.eliminated !== undefined) this.eliminated = state.eliminated;
    if (state.invincible !== undefined) {
      // We can't set the exact timer from a boolean, but we can approximate
      this.invincibilityTimer = state.invincible ? 0.1 : 0;
    }
  }

  kill(): void {
    this.alive = false;
  }

  respawn(x: number, y: number, angle: number): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.alive = true;
    this.bulletCooldown = 0;
  }

  getBulletSpawnPoint(): { x: number; y: number } {
    const barrelLength = TANK_RADIUS + 6;
    return {
      x: this.x + Math.cos(this.angle) * barrelLength,
      y: this.y + Math.sin(this.angle) * barrelLength,
    };
  }
}
