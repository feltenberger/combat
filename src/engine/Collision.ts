import { Tank } from './Tank';
import { Bullet } from './Bullet';
import { TANK_RADIUS, BULLET_RADIUS } from '../config/constants';
import { distance } from '../utils/math';

export function checkBulletTankCollision(bullet: Bullet, tank: Tank): boolean {
  if (!bullet.alive || !tank.alive) return false;
  // Don't hit your own tank
  if (bullet.ownerId === tank.uid) return false;
  // Don't hit invincible tanks
  if (tank.isInvincible()) return false;

  const dist = distance(
    { x: bullet.x, y: bullet.y },
    { x: tank.x, y: tank.y }
  );

  return dist < TANK_RADIUS + BULLET_RADIUS;
}

export function checkTankTankCollision(tank1: Tank, tank2: Tank): boolean {
  if (!tank1.alive || !tank2.alive) return false;
  const dist = distance(
    { x: tank1.x, y: tank1.y },
    { x: tank2.x, y: tank2.y }
  );
  return dist < TANK_RADIUS * 2;
}

export function separateTanks(tank1: Tank, tank2: Tank): void {
  if (!tank1.alive || !tank2.alive) return;
  const dx = tank2.x - tank1.x;
  const dy = tank2.y - tank1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0 || dist >= TANK_RADIUS * 2) return;

  const overlap = TANK_RADIUS * 2 - dist;
  const nx = dx / dist;
  const ny = dy / dist;
  tank1.x -= nx * overlap * 0.5;
  tank1.y -= ny * overlap * 0.5;
  tank2.x += nx * overlap * 0.5;
  tank2.y += ny * overlap * 0.5;
}
