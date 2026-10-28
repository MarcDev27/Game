// Seeded gradient noise (2D Perlin) and 1D value noise for terrain.
import { RNG } from './util.js';

export class Noise {
  constructor(seed) {
    const r = new RNG(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r.next() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.vals[i] = r.next() * 2 - 1;
  }

  // 1D value noise in [-1, 1]
  n1(x) {
    const xi = Math.floor(x), t = x - xi;
    const a = this.vals[this.perm[xi & 255]], b = this.vals[this.perm[(xi + 1) & 255]];
    const s = t * t * (3 - 2 * t);
    return a + (b - a) * s;
  }

  fbm1(x, oct = 4, lac = 2, gain = 0.5) {
    let amp = 1, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += this.n1(x * f) * amp; norm += amp; amp *= gain; f *= lac; }
    return sum / norm;
  }

  // 2D Perlin noise in roughly [-1, 1]
  n2(x, y) {
    const P = this.perm;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const g = (h, dx, dy) => {
      switch (h & 7) {
        case 0: return dx + dy; case 1: return -dx + dy; case 2: return dx - dy; case 3: return -dx - dy;
        case 4: return dx; case 5: return -dx; case 6: return dy; default: return -dy;
      }
    };
    const aa = P[P[X] + Y], ab = P[P[X] + Y + 1], ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
    const x1 = g(aa, xf, yf) + u * (g(ba, xf - 1, yf) - g(aa, xf, yf));
    const x2 = g(ab, xf, yf - 1) + u * (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 0.9;
  }

  fbm2(x, y, oct = 4, lac = 2, gain = 0.5) {
    let amp = 1, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += this.n2(x * f, y * f) * amp; norm += amp; amp *= gain; f *= lac; }
    return sum / norm;
  }
}
