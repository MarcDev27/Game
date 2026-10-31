// Colored flood-fill lighting computed over the visible region each frame (separable max-decay sweeps).
import { OPAQUE, LIGHT_R, LIGHT_G, LIGHT_B } from '../content/tiles.js';
import { LIQ } from './world.js';

export class Lighting {
  constructor(world) {
    this.world = world;
    this.R = new Float32Array(0); this.G = new Float32Array(0); this.B = new Float32Array(0); this.D = new Float32Array(0);
    this.x0 = 0; this.y0 = 0; this.w = 0; this.h = 0;
  }

  ensure(n) {
    if (this.R.length < n) { this.R = new Float32Array(n); this.G = new Float32Array(n); this.B = new Float32Array(n); this.D = new Float32Array(n); }
  }

  compute(x0, y0, w, h, lights, amb, skyLimit, quality = 2, dark = null) {
    const world = this.world, W = world.w, H = world.h;
    const fg = world.fg, wall = world.wall, liq = world.liq, liqT = world.liqT;
    this.x0 = x0; this.y0 = y0; this.w = w; this.h = h;
    const n = w * h;
    this.ensure(n);
    const R = this.R, G = this.G, B = this.B, D = this.D;
    for (let j = 0; j < h; j++) {
      const y = y0 + j;
      for (let i = 0; i < w; i++) {
        const k = j * w + i, x = x0 + i;
        if (x < 0 || y < 0 || x >= W || y >= H) { R[k] = G[k] = B[k] = 0; D[k] = 0.5; continue; }
        const idx = y * W + x, t = fg[idx];
        let r = LIGHT_R[t], g = LIGHT_G[t], b = LIGHT_B[t];
        const op = OPAQUE[t];
        const l = liq[idx];
        if (l) {
          const lt = liqT[idx];
          if (lt === LIQ.plasma) { if (r < 0.9) r = 0.9; if (g < 0.4) g = 0.4; if (b < 0.25) b = 0.25; }
          else if (lt === LIQ.gel) { if (r < 0.15) r = 0.15; if (g < 0.1) g = 0.1; }
        }
        if (!op && wall[idx] === 0 && y < skyLimit) { if (r < amb[0]) r = amb[0]; if (g < amb[1]) g = amb[1]; if (b < amb[2]) b = amb[2]; }
        // Blackout's field smothers tile lights and daylight around it
        if (dark && (x - dark.x) * (x - dark.x) + (y - dark.y) * (y - dark.y) < dark.r * dark.r) r = g = b = 0;
        R[k] = r; G[k] = g; B[k] = b;
        D[k] = op ? 0.66 : (l > 100 && liqT[idx] === LIQ.water ? 0.8 : 0.875);
      }
    }
    for (const L of lights) {
      if (dark && !L.keep && (L.x - dark.x) * (L.x - dark.x) + (L.y - dark.y) * (L.y - dark.y) < dark.r * dark.r) continue;
      const i = L.x - x0, j = L.y - y0;
      if (i < 0 || j < 0 || i >= w || j >= h) continue;
      const k = j * w + i;
      if (R[k] < L.r) R[k] = L.r; if (G[k] < L.g) G[k] = L.g; if (B[k] < L.b) B[k] = L.b;
    }
    for (let pass = 0; pass < quality; pass++) {
      for (let j = 0; j < h; j++) {
        const o = j * w;
        for (let i = 1; i < w; i++) {
          const k = o + i, d = D[k];
          let v = R[k - 1] * d; if (v > R[k]) R[k] = v;
          v = G[k - 1] * d; if (v > G[k]) G[k] = v;
          v = B[k - 1] * d; if (v > B[k]) B[k] = v;
        }
        for (let i = w - 2; i >= 0; i--) {
          const k = o + i, d = D[k];
          let v = R[k + 1] * d; if (v > R[k]) R[k] = v;
          v = G[k + 1] * d; if (v > G[k]) G[k] = v;
          v = B[k + 1] * d; if (v > B[k]) B[k] = v;
        }
      }
      for (let i = 0; i < w; i++) {
        for (let j = 1; j < h; j++) {
          const k = j * w + i, d = D[k];
          let v = R[k - w] * d; if (v > R[k]) R[k] = v;
          v = G[k - w] * d; if (v > G[k]) G[k] = v;
          v = B[k - w] * d; if (v > B[k]) B[k] = v;
        }
        for (let j = h - 2; j >= 0; j--) {
          const k = j * w + i, d = D[k];
          let v = R[k + w] * d; if (v > R[k]) R[k] = v;
          v = G[k + w] * d; if (v > G[k]) G[k] = v;
          v = B[k + w] * d; if (v > B[k]) B[k] = v;
        }
      }
    }
  }

  // Brightness (0..1+) at a tile, or 0 outside the computed region.
  at(tx, ty) {
    const i = tx - this.x0, j = ty - this.y0;
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return 0;
    const k = j * this.w + i;
    return Math.max(this.R[k], this.G[k], this.B[k]);
  }
}
