import { describe, it, expect } from 'vitest';
import { TANK_COLORS, TankColor } from './constants';

describe('TANK_COLORS', () => {
  const expectedKeys: TankColor[] = ['blue', 'red', 'green', 'camo'];

  it('has all 4 color keys', () => {
    expect(Object.keys(TANK_COLORS)).toEqual(expect.arrayContaining(expectedKeys));
    expect(Object.keys(TANK_COLORS)).toHaveLength(4);
  });

  it.each(expectedKeys)('"%s" has main and dark properties', (key) => {
    expect(TANK_COLORS[key]).toHaveProperty('main');
    expect(TANK_COLORS[key]).toHaveProperty('dark');
    expect(TANK_COLORS[key].main).toMatch(/^#[0-9a-f]{6}$/i);
    expect(TANK_COLORS[key].dark).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
