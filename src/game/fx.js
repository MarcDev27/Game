// Particles and floating combat text.
import { rng } from '../core/util.js';

export class FX {
  constructor() { this.parts = []; this.texts = []; }

  spark(x, y, color, vx = rng.float(-1, 1), vy = rng.float(-1.5, 0.5), life = 24, size = 2, glow = true) {
    if (this.parts.length > 900) return;
    this.parts.push({ x, y, vx, vy, color, life, max: life, size, glow, grav: 0.05 });
  }
  burst(x, y, color, n = 10, speed = 2, glow = true, size = 2) {
    for (let i = 0; i < n; i++) {
      const a = rng.float(0, Math.PI * 2), s = rng.float(0.3, 1) * speed;
      this.spark(x, y, color, Math.cos(a) * s, Math.sin(a) * s - 0.5, rng.int(16, 32), size, glow);
    }
  }
  debris(x, y, color, n = 6) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + rng.float(-6, 6), y: y + rng.float(-6, 6), vx: rng.float(-1.5, 1.5), vy: rng.float(-2.5, 0), color, life: 30, max: 30, size: 2, glow: false, grav: 0.18 });
  }
  text(x, y, str, color = '#fff', big = false) {
    if (this.texts.length > 60) this.texts.shift();
    this.texts.push({ x: x + rng.float(-6, 6), y, str: String(str), color, life: 60, big });
  }

  update() {
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.98; p.life--; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.y -= 0.6; t.life--; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  draw(ctx, glowPass) {
    for (const p of this.parts) {
      if (p.glow !== glowPass) continue;
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life / 20);
      ctx.font = `bold ${t.big ? 14 : 10}px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = '#000';
      ctx.fillText(t.str, t.x + 1, t.y + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
