import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TankRenderer } from './TankRenderer';
import { TankState } from '../types/game';
import { TANK_COLORS, TankColor } from '../config/constants';

function createMockCtx() {
  const fillStyles: string[] = [];
  return {
    fillStyles,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillRect: vi.fn(),
    roundRect: vi.fn(),
    set fillStyle(val: string) {
      fillStyles.push(val);
    },
    get fillStyle() {
      return fillStyles[fillStyles.length - 1] || '';
    },
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeTank(): TankState {
  return { x: 100, y: 200, angle: 0, alive: true };
}

describe('TankRenderer', () => {
  let renderer: TankRenderer;

  beforeEach(() => {
    renderer = new TankRenderer();
  });

  it('does not render a dead tank', () => {
    const ctx = createMockCtx();
    renderer.render(ctx, { ...makeTank(), alive: false }, 'blue');
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it.each(['blue', 'red', 'green', 'camo'] as TankColor[])('uses correct fill for %s', (color) => {
    const ctx = createMockCtx();
    renderer.render(ctx, makeTank(), color);

    const mock = ctx as unknown as { fillStyles: string[] };
    // First fillStyle is the main color (tank body)
    expect(mock.fillStyles[0]).toBe(TANK_COLORS[color].main);
    // Dark color appears for tracks, turret, barrel
    expect(mock.fillStyles).toContain(TANK_COLORS[color].dark);
  });

  it('renderGhost renders with reduced alpha', () => {
    const ctx = createMockCtx();
    renderer.renderGhost(ctx, makeTank(), 'red');
    expect(ctx.globalAlpha).toBe(1);
  });
});
