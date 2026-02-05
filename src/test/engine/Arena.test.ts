import { describe, it, expect } from 'vitest';
import { Arena, ARENAS } from '../../engine/Arena';
import { TileType, ROCK_MAX_HP, TILE_SIZE } from '../../config/constants';

describe('Arena', () => {
  it('creates arena with correct index', () => {
    const arena = new Arena(0);
    expect(arena.definition.name).toBe('Open Field');
  });

  it('wraps arena index when out of bounds', () => {
    const arena = new Arena(4); // 4 arenas, so 4 % 4 = 0
    expect(arena.definition.name).toBe('Open Field');
  });

  describe('getTile', () => {
    it('returns WALL for border tiles', () => {
      const arena = new Arena(0);
      expect(arena.getTile(0, 0)).toBe(TileType.WALL);
      expect(arena.getTile(29, 0)).toBe(TileType.WALL);
      expect(arena.getTile(0, 19)).toBe(TileType.WALL);
    });

    it('returns WALL for out-of-bounds positions', () => {
      const arena = new Arena(0);
      expect(arena.getTile(-1, 0)).toBe(TileType.WALL);
      expect(arena.getTile(0, -1)).toBe(TileType.WALL);
      expect(arena.getTile(30, 10)).toBe(TileType.WALL);
      expect(arena.getTile(10, 20)).toBe(TileType.WALL);
    });

    it('returns FLOOR for open areas', () => {
      const arena = new Arena(0);
      // Center of open field should be floor
      expect(arena.getTile(15, 10)).toBe(TileType.FLOOR);
    });
  });

  describe('isSolid', () => {
    it('returns true for walls', () => {
      const arena = new Arena(0);
      expect(arena.isSolid(0, 0)).toBe(true);
    });

    it('returns true for rocks with HP > 0', () => {
      const arena = new Arena(0);
      // Open Field has rocks at (5,5)
      expect(arena.isSolid(5, 5)).toBe(true);
    });

    it('returns false for rocks with 0 HP', () => {
      const arena = new Arena(0);
      // Damage rock to 0
      arena.damageRock(5, 5);
      arena.damageRock(5, 5);
      arena.damageRock(5, 5);
      expect(arena.isSolid(5, 5)).toBe(false);
    });

    it('returns false for floor tiles', () => {
      const arena = new Arena(0);
      expect(arena.isSolid(15, 10)).toBe(false);
    });
  });

  describe('damageRock', () => {
    it('reduces rock HP by 1', () => {
      const arena = new Arena(0);
      const key = '5,5';
      expect(arena.rockHP.get(key)).toBe(ROCK_MAX_HP);
      arena.damageRock(5, 5);
      expect(arena.rockHP.get(key)).toBe(ROCK_MAX_HP - 1);
    });

    it('returns true when rock is damaged', () => {
      const arena = new Arena(0);
      expect(arena.damageRock(5, 5)).toBe(true);
    });

    it('returns false when no rock at position', () => {
      const arena = new Arena(0);
      expect(arena.damageRock(15, 10)).toBe(false);
    });

    it('returns false when rock already at 0 HP', () => {
      const arena = new Arena(0);
      arena.damageRock(5, 5);
      arena.damageRock(5, 5);
      arena.damageRock(5, 5);
      expect(arena.damageRock(5, 5)).toBe(false);
    });
  });

  describe('getSpawnPosition', () => {
    it('returns spawn 1 for player 0 facing east', () => {
      const arena = new Arena(0);
      const spawn = arena.getSpawnPosition(0);
      expect(spawn.angle).toBe(0); // facing right
      expect(spawn.x).toBeGreaterThan(0);
      expect(spawn.y).toBeGreaterThan(0);
    });

    it('returns spawn 2 for player 1 facing west', () => {
      const arena = new Arena(0);
      const spawn = arena.getSpawnPosition(1);
      expect(spawn.angle).toBe(Math.PI); // facing left
    });

    it('spawns at tile center', () => {
      const arena = new Arena(0);
      const spawn = arena.getSpawnPosition(0);
      // Open Field spawn1 is col 3, row 3
      expect(spawn.x).toBe(3 * TILE_SIZE + TILE_SIZE / 2);
      expect(spawn.y).toBe(3 * TILE_SIZE + TILE_SIZE / 2);
    });
  });

  describe('resetRocks', () => {
    it('restores all rocks to full HP', () => {
      const arena = new Arena(0);
      arena.damageRock(5, 5);
      arena.damageRock(5, 5);
      arena.resetRocks();
      expect(arena.rockHP.get('5,5')).toBe(ROCK_MAX_HP);
    });
  });

  describe('getRockHPMap / setRockHPFromMap', () => {
    it('serializes and deserializes rock HP', () => {
      const arena = new Arena(0);
      arena.damageRock(5, 5);
      const map = arena.getRockHPMap();
      expect(map['5,5']).toBe(ROCK_MAX_HP - 1);

      const arena2 = new Arena(0);
      arena2.setRockHPFromMap(map);
      expect(arena2.rockHP.get('5,5')).toBe(ROCK_MAX_HP - 1);
    });
  });

  it('has 4 arenas defined', () => {
    expect(ARENAS.length).toBe(4);
  });
});
