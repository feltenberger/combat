import { Arena } from '../engine/Arena';
import { TileType, TILE_SIZE, ARENA_COLS, ARENA_ROWS, COLORS, ROCK_MAX_HP } from '../config/constants';

export class ArenaRenderer {
  private floorPattern: CanvasPattern | null = null;

  render(ctx: CanvasRenderingContext2D, arena: Arena): void {
    // Draw floor
    for (let row = 0; row < ARENA_ROWS; row++) {
      for (let col = 0; col < ARENA_COLS; col++) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const tile = arena.definition.tiles[row][col];

        // Floor (checkerboard)
        ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.FLOOR : COLORS.FLOOR_ALT;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        if (tile === TileType.WALL) {
          this.drawWall(ctx, x, y);
        } else if (tile === TileType.ROCK) {
          const hp = arena.rockHP.get(`${col},${row}`) ?? 0;
          this.drawRock(ctx, x, y, hp);
        }
      }
    }
  }

  private drawWall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Main wall
    ctx.fillStyle = COLORS.WALL;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Border/bevel effect
    ctx.fillStyle = '#666666';
    ctx.fillRect(x, y, TILE_SIZE, 2);
    ctx.fillRect(x, y, 2, TILE_SIZE);

    ctx.fillStyle = COLORS.WALL_BORDER;
    ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
    ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);

    // Cross-hatch detail
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE / 2, y + 4);
    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 4);
    ctx.moveTo(x + 4, y + TILE_SIZE / 2);
    ctx.lineTo(x + TILE_SIZE - 4, y + TILE_SIZE / 2);
    ctx.stroke();
  }

  private drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number): void {
    if (hp <= 0) {
      // Rubble
      ctx.fillStyle = (Math.floor(x / TILE_SIZE) + Math.floor(y / TILE_SIZE)) % 2 === 0
        ? COLORS.FLOOR : COLORS.FLOOR_ALT;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      ctx.fillStyle = COLORS.ROCK_RUBBLE;
      ctx.globalAlpha = 0.4;
      // Small rubble pieces
      for (let i = 0; i < 4; i++) {
        const rx = x + 4 + (i % 2) * 14 + Math.sin(x + i) * 3;
        const ry = y + 4 + Math.floor(i / 2) * 14 + Math.cos(y + i) * 3;
        ctx.fillRect(rx, ry, 6, 5);
      }
      ctx.globalAlpha = 1;
      return;
    }

    // Determine color based on HP
    let color: string;
    if (hp === ROCK_MAX_HP) {
      color = COLORS.ROCK_FULL;
    } else if (hp === 2) {
      color = COLORS.ROCK_DAMAGED;
    } else {
      color = COLORS.ROCK_CRITICAL;
    }

    // Main rock body
    ctx.fillStyle = color;
    const inset = 2;
    ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);

    // Cracks based on damage
    if (hp < ROCK_MAX_HP) {
      ctx.strokeStyle = '#4a3a2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Crack pattern
      ctx.moveTo(x + TILE_SIZE / 2, y + inset);
      ctx.lineTo(x + TILE_SIZE / 2 + 3, y + TILE_SIZE / 2);
      if (hp === 1) {
        ctx.lineTo(x + TILE_SIZE - inset, y + TILE_SIZE / 2 + 4);
        ctx.moveTo(x + TILE_SIZE / 2 + 3, y + TILE_SIZE / 2);
        ctx.lineTo(x + inset + 4, y + TILE_SIZE - inset);
      }
      ctx.stroke();
    }

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, 3);
  }
}
