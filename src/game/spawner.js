// Off-screen enemy spawning driven by biome, depth, time of day and events.
import { TILE, clamp } from '../core/util.js';
import { MONSTERS } from '../content/monsters.js';
import { TILES, W } from '../content/tiles.js';

export class Spawner {
  constructor(game) { this.game = game; this.timer = 0; }

  env(tx, ty) {
    const g = this.game, w = g.world;
    const layer = w.layerAt(ty);
    let biome = w.biomeAt(tx);
    const wall = w.getWall(tx, ty);
    if (wall === W.derelict_wall) biome = 'dungeon';
    else if (wall === W.temple_wall) biome = 'temple';
    else if (wall === W.hive_wall) biome = 'jungle';
    else if (layer === 'core') biome = 'core';
    else {
      // local tile majority decides blight / prism / jungle etc. underground
      const counts = {};
      for (let y = ty - 6; y <= ty + 6; y += 2) for (let x = tx - 8; x <= tx + 8; x += 2) { const t = TILES[w.get(x, y)]; if (t && t.biome) counts[t.biome] = (counts[t.biome] || 0) + 1; }
      for (const b of ['blight', 'prism', 'jungle', 'snow', 'desert']) if ((counts[b] || 0) > 10) { biome = b; break; }
    }
    return { biome, layer, night: !w.isDay(), hard: w.flags.hardmode, event: g.events.active };
  }

  candidates(env, inLiquid) {
    const w = this.game.world, list = [];
    const special = ['dungeon', 'temple', 'core'].includes(env.biome) || env.layer === 'space';
    for (const k in MONSTERS) {
      const d = MONSTERS[k];
      for (const r of d.spawn) {
        if (r.event) { if (r.event !== env.event) continue; }
        if (r.water && !inLiquid) continue;
        if (!r.water && inLiquid) continue;
        if (r.hard && !env.hard) continue;
        if (r.pre && env.hard && !r.event) continue;
        if (r.after && !w.flags.bosses[r.after]) continue;
        if (r.time === 'night' && !env.night) continue;
        if (r.time === 'day' && env.night) continue;
        if (r.layers && !r.layers.includes(env.layer)) continue;
        if (special && env.layer !== 'space') { if (!r.biomes || !r.biomes.includes(env.biome)) continue; }
        else if (env.layer === 'space') { if (!r.layers || !r.layers.includes('space')) continue; }
        else if (r.biomes && !r.biomes.includes(env.biome)) continue;
        let wt = r.weight;
        if (r.event && env.event) wt *= 4;
        list.push({ key: k, weight: wt, flying: !d.gravity || d.ai === 'flyer' || d.ai === 'floater' || d.ai === 'worm', ground: r.ground });
        break;
      }
    }
    return list;
  }

  update() {
    const g = this.game, w = g.world, p = g.player;
    if (p.dead) return;
    this.timer++;
    if (this.timer % 20 !== 0) return;
    const ptx = Math.floor(p.cx / TILE), pty = Math.floor(p.cy / TILE);
    const layer = w.layerAt(pty);
    const night = !w.isDay();
    let max = layer === 'surface' ? (night ? 8 : 4) : 8;
    let rate = layer === 'surface' ? (night ? 0.12 : 0.06) : 0.14;
    const ev = g.events.active;
    if (ev === 'redshift') { max *= 2; rate *= 3; }
    if (ev === 'invasion' || ev === 'eclipse') { if (layer === 'surface') { max = 14; rate = 0.6; } }
    if (g.biome === 'dungeon' || g.biome === 'temple') { max += 4; rate *= 1.5; }
    if (g.biome === 'core' || w.flags.hardmode) rate *= 1.3;
    rate *= Math.max(0.1, 1 + p.s.spawnRate);
    max = Math.round(max * Math.max(0.3, 1 + p.s.spawnRate * 0.5));
    if (g.bosses.some((b) => !b.dead)) { rate *= 0.3; max = Math.ceil(max / 2); }
    // towns are safer
    if (layer === 'surface' && g.town.npcs.filter((n) => Math.abs(n.cx - p.cx) < 60 * TILE).length >= 3 && !ev) { rate *= 0.25; max = 2; }
    // early-game grace near the landing site during the day
    if (!night && layer === 'surface' && Math.abs(ptx - w.spawnX) < 60 && !w.flags.bosses.overseer) rate *= 0.5;
    const active = g.monsters.filter((m) => !m.def.boss && !m.head).length;
    if (active >= max || g.rng.next() > rate) return;

    const vw = Math.ceil(g.view.w / TILE), vh = Math.ceil(g.view.h / TILE);
    for (let attempt = 0; attempt < 12; attempt++) {
      const side = g.rng.chance(0.5) ? 1 : -1;
      let tx = ptx + side * (Math.floor(vw / 2) + g.rng.int(3, 22));
      let ty = pty + g.rng.int(-Math.floor(vh / 2) - 8, Math.floor(vh / 2) + 8);
      if (g.rng.chance(0.25)) { tx = ptx + g.rng.int(-vw, vw); ty = pty + side * (Math.floor(vh / 2) + g.rng.int(3, 12)); }
      if (!w.inb(tx, ty) || tx < 5 || tx > w.w - 5 || ty < 5 || ty > w.h - 5) continue;
      if (w.solidAt(tx, ty)) continue;
      const liquid = w.liq[ty * w.w + tx] > 100;
      const env = this.env(tx, ty);
      const cands = this.candidates(env, liquid);
      if (!cands.length) continue;
      const pick = g.rng.weighted(cands);
      const d = MONSTERS[pick.key];
      let sy = ty;
      if (!pick.flying && !liquid) {
        let found = false;
        for (let k = 0; k < 20; k++) { if (w.solidAt(tx, sy + 1)) { found = true; break; } sy++; }
        if (!found) continue;
        const hTiles = Math.ceil(d.h / TILE);
        let clear = true;
        for (let k = 0; k < hTiles; k++) if (w.solidAt(tx, sy - k) || (d.w > 16 && w.solidAt(tx + 1, sy - k))) clear = false;
        if (!clear) continue;
        if (w.liq[sy * w.w + tx] > 100) continue;
      } else if (pick.flying && liquid) continue;
      const x = tx * TILE + 8, y = (sy + 1) * TILE;
      if (d.ai === 'worm') g.spawnWormMonster(pick.key, x, y + 200);
      else g.spawnMonster(pick.key, x, y);
      return;
    }
  }
}
