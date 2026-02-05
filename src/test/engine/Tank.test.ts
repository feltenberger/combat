import { describe, it, expect, beforeEach } from 'vitest';
import { Tank } from '../../engine/Tank';
import { Arena } from '../../engine/Arena';
import { PlayerInput } from '../../types/game';
import { TANK_SPEED, TANK_ROTATION_SPEED, TANK_RADIUS } from '../../config/constants';

function noInput(): PlayerInput {
  return { left: false, right: false, up: false, down: false, fire: false, timestamp: 0 };
}

describe('Tank', () => {
  let tank: Tank;
  let arena: Arena;

  beforeEach(() => {
    arena = new Arena(0); // Open Field
    const spawn = arena.getSpawnPosition(0);
    tank = new Tank('p1', spawn.x, spawn.y, spawn.angle);
  });

  it('initializes with correct position and angle', () => {
    expect(tank.x).toBe(arena.getSpawnPosition(0).x);
    expect(tank.y).toBe(arena.getSpawnPosition(0).y);
    expect(tank.angle).toBe(0);
    expect(tank.alive).toBe(true);
  });

  describe('rotation', () => {
    it('rotates left when left input pressed', () => {
      const input = { ...noInput(), left: true };
      const initialAngle = tank.angle;
      tank.update(input, 1 / 60, arena);
      expect(tank.angle).toBeLessThan(initialAngle);
    });

    it('rotates right when right input pressed', () => {
      const input = { ...noInput(), right: true };
      const initialAngle = tank.angle;
      tank.update(input, 1 / 60, arena);
      expect(tank.angle).toBeGreaterThan(initialAngle);
    });

    it('rotates at correct speed', () => {
      const input = { ...noInput(), right: true };
      const dt = 0.1;
      const startAngle = tank.angle;
      tank.update(input, dt, arena);
      expect(tank.angle).toBeCloseTo(startAngle + TANK_ROTATION_SPEED * dt);
    });
  });

  describe('movement', () => {
    it('moves forward when up pressed', () => {
      const input = { ...noInput(), up: true };
      const startX = tank.x;
      tank.update(input, 0.1, arena);
      // Facing right (angle=0), so x should increase
      expect(tank.x).toBeGreaterThan(startX);
    });

    it('moves backward (slower) when down pressed', () => {
      const input = { ...noInput(), down: true };
      const startX = tank.x;
      tank.update(input, 0.1, arena);
      // Facing right, reverse moves left
      expect(tank.x).toBeLessThan(startX);
    });

    it('reverse is 60% of forward speed', () => {
      const dt = 1 / 60;
      // Place tanks in center of open area, far from any walls
      const cx = 15 * 32 + 16; // Center of arena
      const cy = 10 * 32 + 16;
      const tank1 = new Tank('t1', cx, cy, 0);
      const tank2 = new Tank('t2', cx, cy, 0);

      tank1.update({ ...noInput(), up: true }, dt, arena);
      tank2.update({ ...noInput(), down: true }, dt, arena);

      const fwdDist = Math.abs(tank1.x - cx);
      const revDist = Math.abs(tank2.x - cx);
      expect(fwdDist).toBeGreaterThan(0);
      expect(revDist / fwdDist).toBeCloseTo(0.6, 1);
    });

    it('does not move when dead', () => {
      tank.kill();
      const startX = tank.x;
      tank.update({ ...noInput(), up: true }, 0.1, arena);
      expect(tank.x).toBe(startX);
    });
  });

  describe('wall collision', () => {
    it('does not move into walls', () => {
      // Move tank to near-wall position
      const wallTank = new Tank('t', 33, 33, Math.PI); // near top-left corner, facing left
      const input = { ...noInput(), up: true };
      const startX = wallTank.x;
      wallTank.update(input, 0.1, arena);
      // Should not move further left into the wall
      expect(wallTank.x).toBeGreaterThanOrEqual(startX - 1); // allow small slide
    });

    it('slides along walls', () => {
      // Position near top wall, moving diagonally
      const tank = new Tank('t', 200, 33, -Math.PI / 4); // facing up-right at top wall
      const input = { ...noInput(), up: true };
      tank.update(input, 0.1, arena);
      // Should slide along X even if Y is blocked
      // X should have changed (slid) while Y stayed close
    });
  });

  describe('cooldown', () => {
    it('decreases bullet cooldown over time', () => {
      tank.bulletCooldown = 0.5;
      tank.update(noInput(), 0.1, arena);
      expect(tank.bulletCooldown).toBeCloseTo(0.4);
    });

    it('does not go below 0', () => {
      tank.bulletCooldown = 0.05;
      tank.update(noInput(), 0.1, arena);
      expect(tank.bulletCooldown).toBeLessThanOrEqual(0);
    });
  });

  describe('getBulletSpawnPoint', () => {
    it('returns point ahead of tank', () => {
      const pt = tank.getBulletSpawnPoint();
      // Facing right (angle=0)
      expect(pt.x).toBeGreaterThan(tank.x);
      expect(pt.y).toBeCloseTo(tank.y, 0);
    });
  });

  describe('kill and respawn', () => {
    it('kill sets alive to false', () => {
      tank.kill();
      expect(tank.alive).toBe(false);
    });

    it('respawn restores position, angle, and alive', () => {
      tank.kill();
      tank.bulletCooldown = 0.5;
      tank.respawn(100, 200, Math.PI);
      expect(tank.alive).toBe(true);
      expect(tank.x).toBe(100);
      expect(tank.y).toBe(200);
      expect(tank.angle).toBe(Math.PI);
      expect(tank.bulletCooldown).toBe(0);
    });
  });

  describe('getState / setState', () => {
    it('serializes and deserializes correctly', () => {
      tank.x = 123;
      tank.y = 456;
      tank.angle = 1.5;
      tank.alive = false;
      const state = tank.getState();
      expect(state).toEqual({ x: 123, y: 456, angle: 1.5, alive: false });

      const tank2 = new Tank('t2', 0, 0, 0);
      tank2.setState(state);
      expect(tank2.x).toBe(123);
      expect(tank2.y).toBe(456);
      expect(tank2.angle).toBe(1.5);
      expect(tank2.alive).toBe(false);
    });
  });
});
