import { Particle } from '../types/game';
import { randomRange, randomColor } from '../utils/math';

export class ParticleSystem {
  particles: Particle[] = [];

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      // Gravity for debris
      if (p.type === 'debris') {
        p.vy += 200 * dt;
      }

      // Slow down smoke
      if (p.type === 'smoke') {
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.size += dt * 10;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnExplosion(x: number, y: number): void {
    const colors = ['#ff6600', '#ff3300', '#ff9900', '#ffcc00'];
    // Fire particles
    for (let i = 0; i < 20; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(50, 200);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.2, 0.6),
        maxLife: 0.6,
        size: randomRange(2, 6),
        color: randomColor(colors),
        type: 'explosion',
      });
    }
    // Smoke
    for (let i = 0; i < 8; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(20, 60);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 1.2),
        maxLife: 1.2,
        size: randomRange(4, 8),
        color: '#666666',
        type: 'smoke',
      });
    }
    // Sparks
    for (let i = 0; i < 10; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(100, 300);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.1, 0.3),
        maxLife: 0.3,
        size: randomRange(1, 3),
        color: '#ffff88',
        type: 'spark',
      });
    }
  }

  spawnRockHit(x: number, y: number): void {
    const colors = ['#8B7355', '#A0926B', '#6B6355'];
    for (let i = 0; i < 6; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(30, 100);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.3, 0.6),
        maxLife: 0.6,
        size: randomRange(2, 5),
        color: randomColor(colors),
        type: 'debris',
      });
    }
  }

  spawnWallSpark(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(50, 150);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.1, 0.2),
        maxLife: 0.2,
        size: randomRange(1, 2),
        color: '#ffff88',
        type: 'spark',
      });
    }
  }

  clear(): void {
    this.particles = [];
  }
}
