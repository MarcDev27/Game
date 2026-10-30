// Smart aiming for the on-screen USE button, so every item works without tapping the world.
// `drag` is the direction the USE button is dragged in and `move` the movement stick direction
// ({x, y}, up to unit length, or null). Tools and blocks follow either one; weapons only follow
// a drag and otherwise lock onto the nearest enemy. Returns a world-space aim point.
import { TILE } from '../core/util.js';
import { TILES, T } from '../content/tiles.js';
import { ITEMS } from '../content/items.js';

const center = (x, y) => ({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });

// Nearest enemy, favoring the side the player faces. With `aheadOnly` (melee while walking),
// enemies behind are ignored so the player never spins around mid-stride.
function nearestEnemy(game, p, maxDist, aheadOnly = false) {
  let best = null, bs = Infinity;
  for (const m of game.monsters) {
    if (m.dead || m.def.friendly || m.allied || m.grabbed) continue;
    const d = Math.hypot(m.cx - p.cx, m.cy - p.cy);
    if (d > maxDist) continue;
    const behind = (m.cx - p.cx) * p.dir < -6;
    if (behind && aheadOnly) continue;
    const score = d + (behind ? maxDist * 0.6 : 0);
    if (score < bs) { bs = score; best = m; }
  }
  return best;
}

// Tiles directly in front of / below / above the player's body, nearest first.
function bodyScan(p, d, reach, from = 1) {
  const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 1) / TILE);
  const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h - 1) / TILE);
  const out = [];
  if (Math.abs(d.y) > Math.abs(d.x) * 1.2) {
    const mid = Math.floor(p.cx / TILE);
    const cols = [mid, ...[c0, c1].filter((c) => c !== mid)];
    for (let k = from; k <= reach; k++) for (const c of cols) out.push([c, d.y > 0 ? r1 + k : r0 - k]);
  } else {
    const dir = d.x >= 0 ? 1 : -1;
    for (let k = from; k <= reach; k++) for (let r = r1; r >= r0; r--) out.push([dir > 0 ? c1 + k : c0 - k, r]);
  }
  return out;
}

export function smartAim(game, p, drag, move) {
  const slot = p.inv[p.sel];
  const it = slot && ITEMS[slot.k];
  const isTool = it && (it.pick || it.axe || it.hammer || it.place || it.placeWall || it.seedGrass);
  const steer = drag || (isTool ? move : null);
  const face = { x: p.dir, y: 0 };
  const d = steer || face;
  const hand = { x: p.cx, y: p.y + 16 };
  const along = (dist) => ({ x: hand.x + d.x * dist, y: hand.y + d.y * dist });
  const w = game.world;

  if (!it) {
    const m = !steer && nearestEnemy(game, p, 60, !!(move && Math.abs(move.x) > 0.3));
    return m ? { x: m.cx, y: m.cy } : along(40);
  }
  const reach = p.reachTiles(it);

  if (it.pick || it.axe || it.hammer) {
    const hit = (x, y) => { const t = game.toolTarget(p, it, x, y); return t && t.x === x && t.y === y; };
    if (it.axe && !it.pick && !steer) {
      // Nearest tree trunk (or plant), preferring the side the player faces.
      let best = null, bs = 1e9;
      const px = Math.floor(p.cx / TILE), py = Math.floor(p.cy / TILE);
      for (let y = py - reach; y <= py + reach; y++) for (let x = px - reach - 1; x <= px + reach + 1; x++) {
        if (!w.inb(x, y)) continue;
        const t = TILES[w.get(x, y)];
        if (!t || !(t.tree || t.cut) || !hit(x, y)) continue;
        const s = Math.abs(x - px) + Math.abs(y - py) * 0.6 + ((x - px) * p.dir < 0 ? 4 : 0) + (t.tree ? 0 : 3);
        if (s < bs) { bs = s; best = [x, y]; }
      }
      if (best) return center(best[0], best[1]);
    }
    const diagonal = steer && Math.abs(steer.x) > 0.35 && Math.abs(steer.y) > 0.35;
    if (!diagonal) {
      for (const [x, y] of bodyScan(p, d, reach + 1, it.hammer && !it.pick ? 0 : 1)) if (hit(x, y)) return center(x, y);
    }
    return along(reach * TILE);
  }

  if (it.placeWall) {
    let best = null, bd = 1e9;
    const px = p.cx / TILE, py = p.cy / TILE;
    for (let y = Math.floor(py - reach); y <= py + reach; y++) for (let x = Math.floor(px - reach); x <= px + reach; x++) {
      if (!w.inb(x, y) || w.getWall(x, y) || !p.inReach(x, y, it)) continue;
      const dd = Math.hypot(x + 0.5 - px - d.x * 2, y + 0.5 - py - d.y * 2);
      if (dd < bd) { bd = dd; best = [x, y]; }
    }
    return best ? center(best[0], best[1]) : along(TILE);
  }

  if (it.place || it.seedGrass) {
    const t = it.place && TILES[T[it.place]];
    if (t && t.furn) {
      const f = t.furn, k = Math.floor((f.w - 1) / 2);
      const feet = Math.floor((p.y + p.h - 1) / TILE);
      const x = p.dir > 0 ? Math.floor((p.x + p.w - 1) / TILE) + 1 + k : Math.floor(p.x / TILE) - 1 - (f.w - 1 - k);
      return center(x, feet);
    }
    if (it.seedGrass) {
      for (const [x, y] of bodyScan(p, { x: d.x, y: 1 }, 2)) if (w.solidAt(x, y)) return center(x, y);
      return along(TILE);
    }
    const ok = (x, y) => p.inReach(x, y, it) && game.canPlaceBlockAt(x, y, it);
    const feet = Math.floor((p.y + p.h - 1) / TILE);
    if (!steer || Math.abs(d.x) >= Math.abs(d.y)) {
      // Walking forward: bridge a gap first, otherwise build in front of the feet.
      const dirx = d.x >= 0 ? 1 : -1;
      const col0 = dirx > 0 ? Math.floor((p.x + p.w - 1) / TILE) : Math.floor(p.x / TILE);
      for (let k = 1; k <= reach; k++) {
        const x = col0 + dirx * k;
        if (ok(x, feet + 1)) return center(x, feet + 1);
        for (let y = feet; y >= Math.floor(p.y / TILE); y--) if (ok(x, y)) return center(x, y);
      }
    } else {
      for (const [x, y] of bodyScan(p, d, reach)) if (ok(x, y)) return center(x, y);
    }
    return along(TILE * 2);
  }

  // Weapons, tech, fishing and everything else: steer to aim, or lock onto the nearest enemy.
  const tech = it.tech;
  const dist = tech && tech.kind === 'portal' ? Math.min(tech.range, 12) * TILE : tech && tech.kind === 'grab' ? 110 : 220;
  if (!steer && !it.fishing && !(tech && tech.kind === 'portal')) {
    const melee = it.useStyle === 'swing' || it.useStyle === 'thrust';
    const walking = move && Math.abs(move.x) > 0.3;
    const m = nearestEnemy(game, p, melee ? 140 : 520, melee && walking);
    if (m) return { x: m.cx, y: m.cy };
  }
  if (it.fishing && !steer) return { x: hand.x + p.dir * 120, y: hand.y - 60 };
  return along(dist);
}
