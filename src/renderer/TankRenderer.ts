import { TankState } from '../types/game';
import { TANK_RADIUS, TANK_COLORS, TankColor } from '../config/constants';

export class TankRenderer {
  render(ctx: CanvasRenderingContext2D, tank: TankState, color: TankColor): void {
    if (!tank.alive) return;

    const colors = TANK_COLORS[color];
    const mainColor = colors.main;
    const darkColor = colors.dark;

    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);

    // Tank body (rounded rectangle-ish)
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    const bw = TANK_RADIUS * 1.6;
    const bh = TANK_RADIUS * 1.2;
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 3);
    ctx.fill();

    // Tracks (darker rectangles on sides)
    ctx.fillStyle = darkColor;
    ctx.fillRect(-bw / 2 - 1, -bh / 2 - 2, bw + 2, 3);
    ctx.fillRect(-bw / 2 - 1, bh / 2 - 1, bw + 2, 3);

    // Track details
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    for (let i = -3; i <= 3; i++) {
      const tx = i * 3;
      ctx.beginPath();
      ctx.moveTo(tx, -bh / 2 - 2);
      ctx.lineTo(tx, -bh / 2 + 1);
      ctx.moveTo(tx, bh / 2 - 1);
      ctx.lineTo(tx, bh / 2 + 2);
      ctx.stroke();
    }

    // Turret (circle on top)
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(0, 0, TANK_RADIUS * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Barrel
    ctx.fillStyle = darkColor;
    ctx.fillRect(TANK_RADIUS * 0.3, -2, TANK_RADIUS * 0.8, 4);

    // Barrel tip
    ctx.fillStyle = '#222222';
    ctx.fillRect(TANK_RADIUS * 0.9, -2.5, 4, 5);

    // Highlight on turret
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(-1, -1, TANK_RADIUS * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderGhost(ctx: CanvasRenderingContext2D, tank: TankState, color: TankColor): void {
    ctx.globalAlpha = 0.3;
    this.render(ctx, tank, color);
    ctx.globalAlpha = 1;
  }
}
