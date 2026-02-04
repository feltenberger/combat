import { BulletState } from '../types/game';
import { BULLET_RADIUS, COLORS } from '../config/constants';

export class BulletRenderer {
  render(ctx: CanvasRenderingContext2D, bullet: BulletState): void {
    // Glow
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = COLORS.BULLET_GLOW;

    // Trail
    const trailLen = 8;
    const tx = bullet.x - Math.cos(bullet.angle) * trailLen;
    const ty = bullet.y - Math.sin(bullet.angle) * trailLen;
    const gradient = ctx.createLinearGradient(tx, ty, bullet.x, bullet.y);
    gradient.addColorStop(0, 'rgba(255, 221, 68, 0)');
    gradient.addColorStop(1, COLORS.BULLET);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = BULLET_RADIUS * 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(bullet.x, bullet.y);
    ctx.stroke();

    // Bullet body
    ctx.fillStyle = COLORS.BULLET;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, BULLET_RADIUS * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
