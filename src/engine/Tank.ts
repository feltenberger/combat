import { TankState, PlayerInput } from '../types/game';
import { TANK_SPEED, TANK_ROTATION_SPEED, TANK_RADIUS, TILE_SIZE } from '../config/constants';
import { Arena } from './Arena';
import { pixelToTile } from '../utils/math';

export class Tank {
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  uid: string;
  bulletCooldown: number = 0;

  constructor(uid: string, x: number, y: number, angle: number) {
    this.uid = uid;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.alive = true;
  }

  update(input: PlayerInput, dt: number, arena: Arena): void {
    if (!this.alive) return;

    // Rotation
    if (input.left) this.angle -= TANK_ROTATION_SPEED * dt;
    if (input.right) this.angle += TANK_ROTATION_SPEED * dt;

    // Normalize angle
    while (this.angle > Math.PI) this.angle -= 2 * Math.PI;
    while (this.angle < -Math.PI) this.angle += 2 * Math.PI;

    // Movement
    let dx = 0;
    let dy = 0;
    if (input.up) {
      dx = Math.cos(this.angle) * TANK_SPEED * dt;
      dy = Math.sin(this.angle) * TANK_SPEED * dt;
    }
    if (input.down) {
      dx = -Math.cos(this.angle) * TANK_SPEED * dt * 0.6; // Slower reverse
      dy = -Math.sin(this.angle) * TANK_SPEED * dt * 0.6;
    }

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
    };
  }

  setState(state: TankState): void {
    this.x = state.x;
    this.y = state.y;
    this.angle = state.angle;
    this.alive = state.alive;
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
