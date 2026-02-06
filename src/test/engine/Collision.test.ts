import { describe, it, expect } from 'vitest';
import { checkBulletTankCollision, checkTankTankCollision, separateTanks } from '../../engine/Collision';
import { Tank } from '../../engine/Tank';
import { Bullet } from '../../engine/Bullet';
import { TANK_RADIUS, BULLET_RADIUS } from '../../config/constants';

describe('Collision', () => {
  describe('checkBulletTankCollision', () => {
    it('detects hit when bullet is within range', () => {
      const bullet = new Bullet('b1', 100, 100, 0, 'p1', 0);
      const tank = new Tank('p2', 100 + TANK_RADIUS, 100, Math.PI);
      expect(checkBulletTankCollision(bullet, tank)).toBe(true);
    });

    it('returns false when bullet is out of range', () => {
      const bullet = new Bullet('b1', 100, 100, 0, 'p1', 0);
      const tank = new Tank('p2', 200, 200, 0);
      expect(checkBulletTankCollision(bullet, tank)).toBe(false);
    });

    it('prevents self-damage', () => {
      const bullet = new Bullet('b1', 100, 100, 0, 'p1', 0);
      const tank = new Tank('p1', 100, 100, 0); // Same owner
      expect(checkBulletTankCollision(bullet, tank)).toBe(false);
    });

    it('returns false when bullet is dead', () => {
      const bullet = new Bullet('b1', 100, 100, 0, 'p1', 0);
      bullet.alive = false;
      const tank = new Tank('p2', 100, 100, 0);
      expect(checkBulletTankCollision(bullet, tank)).toBe(false);
    });

    it('returns false when tank is dead', () => {
      const bullet = new Bullet('b1', 100, 100, 0, 'p1', 0);
      const tank = new Tank('p2', 100, 100, 0);
      tank.kill();
      expect(checkBulletTankCollision(bullet, tank)).toBe(false);
    });

    it('returns false when tank is invincible', () => {
      const bullet = new Bullet('b1', 100, 100, 0, 'p1', 0);
      const tank = new Tank('p2', 100 + TANK_RADIUS, 100, Math.PI);
      tank.invincibilityTimer = 1.0; // invincible
      expect(checkBulletTankCollision(bullet, tank)).toBe(false);
    });

    it('returns true when invincibility has expired', () => {
      const bullet = new Bullet('b1', 100, 100, 0, 'p1', 0);
      const tank = new Tank('p2', 100 + TANK_RADIUS, 100, Math.PI);
      tank.invincibilityTimer = 0; // not invincible
      expect(checkBulletTankCollision(bullet, tank)).toBe(true);
    });
  });

  describe('checkTankTankCollision', () => {
    it('detects overlapping tanks', () => {
      const tank1 = new Tank('p1', 100, 100, 0);
      const tank2 = new Tank('p2', 100 + TANK_RADIUS, 100, 0);
      expect(checkTankTankCollision(tank1, tank2)).toBe(true);
    });

    it('returns false for distant tanks', () => {
      const tank1 = new Tank('p1', 100, 100, 0);
      const tank2 = new Tank('p2', 300, 300, 0);
      expect(checkTankTankCollision(tank1, tank2)).toBe(false);
    });

    it('returns false when either tank is dead', () => {
      const tank1 = new Tank('p1', 100, 100, 0);
      const tank2 = new Tank('p2', 100, 100, 0);
      tank1.kill();
      expect(checkTankTankCollision(tank1, tank2)).toBe(false);
    });
  });

  describe('separateTanks', () => {
    it('pushes overlapping tanks apart', () => {
      const tank1 = new Tank('p1', 100, 100, 0);
      const tank2 = new Tank('p2', 110, 100, 0); // Overlapping
      separateTanks(tank1, tank2);

      const dist = Math.sqrt(
        (tank2.x - tank1.x) ** 2 + (tank2.y - tank1.y) ** 2
      );
      expect(dist).toBeGreaterThanOrEqual(TANK_RADIUS * 2 - 0.1);
    });

    it('does not separate already-distant tanks', () => {
      const tank1 = new Tank('p1', 100, 100, 0);
      const tank2 = new Tank('p2', 200, 200, 0);
      const x1 = tank1.x, y1 = tank1.y;
      const x2 = tank2.x, y2 = tank2.y;
      separateTanks(tank1, tank2);
      expect(tank1.x).toBe(x1);
      expect(tank1.y).toBe(y1);
      expect(tank2.x).toBe(x2);
      expect(tank2.y).toBe(y2);
    });

    it('does not move dead tanks', () => {
      const tank1 = new Tank('p1', 100, 100, 0);
      const tank2 = new Tank('p2', 110, 100, 0);
      tank1.kill();
      const x1 = tank1.x;
      separateTanks(tank1, tank2);
      expect(tank1.x).toBe(x1);
    });
  });
});
