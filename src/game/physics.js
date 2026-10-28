// Axis-separated AABB vs tile collision with auto step-up and one-way platforms.
import { TILE } from '../core/util.js';
import { LIQ } from '../world/world.js';

export function rectSolid(world, x, y, w, h) {
  const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + w - 0.01) / TILE);
  const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + h - 0.01) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (world.solidAt(tx, ty)) return true;
  return false;
}

// Moves e by its velocity. Sets e.onGround, e.hitWall, e.hitCeil. opts: { platforms, step, drop }
export function moveEntity(world, e, opts = {}) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy)) / 7));
  const dx = e.vx / steps, dy = e.vy / steps;
  e.onGround = false; e.hitWall = 0; e.hitCeil = false;
  for (let s = 0; s < steps; s++) {
    // X axis
    if (dx !== 0) {
      const nx = e.x + dx, ox = e.x;
      if (rectSolid(world, nx, e.y, e.w, e.h)) {
        let stepped = false;
        if (opts.step && e.wasGround) {
          for (const up of [4, 8, 12, 16]) {
            if (!rectSolid(world, nx, e.y - up, e.w, e.h)) { e.y -= up; e.x = nx; stepped = true; e.stepOffset = (e.stepOffset || 0) + up; break; }
          }
        }
        if (!stepped) {
          if (dx > 0) e.x = Math.floor((nx + e.w) / TILE) * TILE - e.w - 0.001;
          else e.x = Math.floor(nx / TILE + 1) * TILE + 0.001;
          if (rectSolid(world, e.x, e.y, e.w, e.h)) e.x = ox;
          e.hitWall = dx > 0 ? 1 : -1;
          e.vx = 0;
        }
      } else e.x = nx;
    }
    // Y axis
    if (dy !== 0) {
      const ny = e.y + dy, oy = e.y;
      if (dy > 0) {
        const bottomOld = e.y + e.h, bottomNew = ny + e.h;
        let land = rectSolid(world, e.x, ny, e.w, e.h);
        let platY = -1;
        if (!land && opts.platforms && !opts.drop) {
          const tyOld = Math.floor((bottomOld - 0.01) / TILE), tyNew = Math.floor((bottomNew - 0.01) / TILE);
          if (tyNew > tyOld || bottomOld <= tyNew * TILE + 0.01) {
            const tx0 = Math.floor(e.x / TILE), tx1 = Math.floor((e.x + e.w - 0.01) / TILE);
            for (let tx = tx0; tx <= tx1; tx++) if (world.platformAt(tx, tyNew) && bottomOld <= tyNew * TILE + 0.5) { platY = tyNew * TILE; break; }
          }
        }
        if (land) {
          e.y = Math.floor(bottomNew / TILE) * TILE - e.h - 0.001;
          if (rectSolid(world, e.x, e.y, e.w, e.h)) e.y = oy;
          e.onGround = true; e.vy = 0;
        } else if (platY >= 0) {
          e.y = platY - e.h - 0.001; e.onGround = true; e.vy = 0;
        } else e.y = ny;
      } else {
        if (rectSolid(world, e.x, ny, e.w, e.h)) {
          e.y = Math.floor(ny / TILE + 1) * TILE + 0.001;
          if (rectSolid(world, e.x, e.y, e.w, e.h)) e.y = oy;
          e.hitCeil = true; e.vy = 0;
        } else e.y = ny;
      }
    }
  }
  // ground probe (standing still)
  if (!e.onGround && e.vy >= 0) {
    if (rectSolid(world, e.x, e.y + 1, e.w, e.h)) e.onGround = true;
    else if (opts.platforms && !opts.drop) {
      const ty = Math.floor((e.y + e.h + 1) / TILE);
      if (Math.abs(ty * TILE - (e.y + e.h)) < 1.5) {
        const tx0 = Math.floor(e.x / TILE), tx1 = Math.floor((e.x + e.w - 0.01) / TILE);
        for (let tx = tx0; tx <= tx1; tx++) if (world.platformAt(tx, ty)) { e.onGround = true; break; }
      }
    }
  }
  e.wasGround = e.onGround;
}

// Fraction of the entity's box submerged and the dominant liquid type.
export function liquidAt(world, e) {
  const tx0 = Math.floor(e.x / TILE), tx1 = Math.floor((e.x + e.w) / TILE);
  const ty0 = Math.floor((e.y + e.h * 0.4) / TILE), ty1 = Math.floor((e.y + e.h - 1) / TILE);
  let best = -1, amt = 0;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (!world.inb(tx, ty)) continue;
    const i = ty * world.w + tx;
    if (world.liq[i] > 60) { amt++; if (best < 0 || world.liqT[i] === LIQ.plasma) best = world.liqT[i]; }
  }
  return amt ? best : -1;
}
