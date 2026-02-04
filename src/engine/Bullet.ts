import { BulletState } from '../types/game';
import { BULLET_SPEED, BULLET_LIFETIME, BULLET_RADIUS, TILE_SIZE } from '../config/constants';
import { Arena } from './Arena';
import { pixelToTile } from '../utils/math';

export class Bullet {
  id: string;
  x: number;
  y: number;
  angle: number;
  ownerId: string;
  spawnTime: number;
  alive: boolean = true;

  constructor(id: string, x: number, y: number, angle: number, ownerId: string, time: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.ownerId = ownerId;
    this.spawnTime = time;
  }

  update(dt: number, gameTime: number, arena: Arena): { hitWall: boolean; hitRock: { col: number; row: number } | null } {
    if (!this.alive) return { hitWall: false, hitRock: null };

    // Check lifetime
    if (gameTime - this.spawnTime > BULLET_LIFETIME) {
      this.alive = false;
      return { hitWall: false, hitRock: null };
    }

    // Move
    this.x += Math.cos(this.angle) * BULLET_SPEED * dt;
    this.y += Math.sin(this.angle) * BULLET_SPEED * dt;

    // Check wall/rock collision
    const tile = pixelToTile(this.x, this.y, TILE_SIZE);

    if (arena.getTile(tile.col, tile.row) === 1) {
      // Hit indestructible wall
      this.alive = false;
      return { hitWall: true, hitRock: null };
    }

    if (arena.isSolid(tile.col, tile.row)) {
      // Hit rock
      arena.damageRock(tile.col, tile.row);
      this.alive = false;
      return { hitWall: false, hitRock: { col: tile.col, row: tile.row } };
    }

    return { hitWall: false, hitRock: null };
  }

  getState(): BulletState {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      ownerId: this.ownerId,
      spawnTime: this.spawnTime,
    };
  }
}
