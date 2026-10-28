// Cellular liquid simulation run in a window around the player.
import { SOLID, T } from '../content/tiles.js';
import { LIQ, DOOR_OPEN } from './world.js';

export class Liquids {
  constructor(world) { this.world = world; this.tick = 0; }

  blocked(i) {
    const w = this.world, s = SOLID[w.fg[i]];
    if (s === 1) return true;
    if (s === 3) return (w.data[i] & DOOR_OPEN) === 0;
    return false;
  }

  update(cx, cy, rw = 90, rh = 60) {
    const w = this.world, W = w.w, H = w.h, liq = w.liq, lt = w.liqT;
    this.tick++;
    const x0 = Math.max(1, cx - rw), x1 = Math.min(W - 2, cx + rw);
    const y0 = Math.max(1, cy - rh), y1 = Math.min(H - 2, cy + rh);
    const dir = this.tick & 1;
    const changed = [];
    for (let y = y1; y >= y0; y--) {
      for (let s = 0; s <= x1 - x0; s++) {
        const x = dir ? x0 + s : x1 - s;
        const i = y * W + x;
        let a = liq[i];
        if (!a) continue;
        const type = lt[i];
        if (type === LIQ.plasma && (this.tick % 3)) continue;
        if (type === LIQ.gel && (this.tick % 2)) continue;
        if (this.blocked(i)) { liq[i] = 0; continue; }
        // fall
        const bi = i + W;
        if (!this.blocked(bi)) {
          if (liq[bi] && lt[bi] !== type) { this.react(x, y + 1, changed); liq[i] = 0; continue; }
          const space = 255 - liq[bi];
          if (space > 0) {
            const m = Math.min(a, space);
            liq[bi] += m; lt[bi] = type; a -= m; liq[i] = a;
            if (!a) continue;
          }
        }
        // spread sideways
        const li = i - 1, ri = i + 1;
        const lOk = !this.blocked(li), rOk = !this.blocked(ri);
        if (lOk && liq[li] && lt[li] !== type) { this.react(x - 1, y, changed); continue; }
        if (rOk && liq[ri] && lt[ri] !== type) { this.react(x + 1, y, changed); continue; }
        if (lOk && rOk) {
          const tot = a + liq[li] + liq[ri];
          const avg = Math.floor(tot / 3);
          if (Math.abs(liq[li] - a) > 1 || Math.abs(liq[ri] - a) > 1) {
            liq[li] = avg; liq[ri] = avg; liq[i] = tot - avg * 2;
            lt[li] = type; lt[ri] = type;
          }
        } else if (lOk || rOk) {
          const ni = lOk ? li : ri;
          if (Math.abs(liq[ni] - a) > 1) {
            const tot = a + liq[ni];
            liq[ni] = tot >> 1; liq[i] = tot - (tot >> 1); lt[ni] = type;
          }
        }
        if (liq[i] < 3 && this.blocked(bi)) liq[i] = 0;
      }
    }
    for (const [x, y] of changed) w.set(x, y, T.vitrislag);
  }

  react(x, y, changed) {
    const w = this.world, i = y * w.w + x;
    w.liq[i] = 0;
    changed.push([x, y]);
  }
}
