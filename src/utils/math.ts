import { Vec2 } from '../types/game';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  // Normalize to [-PI, PI]
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomColor(colors: string[]): string {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function tileToPixel(col: number, row: number, tileSize: number): Vec2 {
  return {
    x: col * tileSize + tileSize / 2,
    y: row * tileSize + tileSize / 2,
  };
}

export function pixelToTile(x: number, y: number, tileSize: number): { col: number; row: number } {
  return {
    col: Math.floor(x / tileSize),
    row: Math.floor(y / tileSize),
  };
}
