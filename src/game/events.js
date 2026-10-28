// Day/night cycle, world events (Red Shift, Drone Invasion, Solar Flare), star showers,
// orbital drops and the transition into the Singularity (hardmode).
import { TILE, clamp } from '../core/util.js';
import { T, W, TILES, CONVERT } from '../content/tiles.js';
import { Drop } from './entities.js';
import { summonBoss } from './bosses.js';

export class Events {
  constructor(game) {
    this.game = game;
    const f = game.world.flags.events;
    this.active = f.active || null;
    this.invasion = f.invasion || null;
    this.wasDay = game.world.isDay();
  }

  save() { const f = this.game.world.flags.events; f.active = this.active; f.invasion = this.invasion; }

  update() {
    const g = this.game, w = g.world;
    w.time += 1;
    if (w.time >= 86400) { w.time -= 86400; }
    const day = w.isDay();
    if (day !== this.wasDay) {
      this.wasDay = day;
      if (day) this.onDawn(); else this.onDusk();
    }
    // falling star shards at night
    if (!day && g.tick % 360 === 0 && g.rng.chance(0.55)) this.fallStar();
    if (day && g.tick % 600 === 0) for (const d of g.drops) if (d.star && d.vy === 0) d.dead = true;
    if (this.active === 'invasion' && g.tick % 120 === 0 && this.invasion) {
      if (Math.abs(g.player.cy / TILE - w.layers.surface) > 80) { /* far below, invasion waits */ }
    }
    if (g.tick % 60 === 0) this.save();
  }

  onDusk() {
    const g = this.game, w = g.world, p = g.player;
    if (this.active === 'eclipse') { this.active = null; g.notify('The Solar Flare subsides.', '#ffb12e'); }
    if (w.flags.meteorPending || (w.flags.bosses.data_wyrm && g.rng.chance(1 / 30))) { w.flags.meteorPending = false; this.orbitalDrop(); }
    if (!this.active && p.maxLife > 120 && g.rng.chance(1 / 9)) {
      this.active = 'redshift';
      g.notify('A Red Shift is rising...', '#ff2244'); g.audio.play('event');
    }
  }

  onDawn() {
    const g = this.game, w = g.world;
    w.day++;
    if (this.active === 'redshift') { this.active = null; }
    g.town.checkArrivals(true);
    g.town.smugglerRoll();
    if (!this.active && w.flags.bosses.overseer && !w.flags.invasionsDone && g.rng.chance(1 / 3)) this.trigger('invasion_drones');
    if (!this.active && w.flags.hardmode && (w.flags.bosses.twin_lancers || w.flags.bosses.leviathan || w.flags.bosses.prime_archon) && g.rng.chance(1 / 18)) this.trigger('event_eclipse');
  }

  trigger(key) {
    const g = this.game, w = g.world;
    if (this.active && this.active !== 'redshift') return false;
    if (key === 'invasion_drones') {
      const need = 60 + Math.floor(g.player.maxLife / 10);
      this.active = 'invasion';
      this.invasion = { need, done: 0 };
      g.notify('A Drone Invasion is approaching from the ' + (g.rng.chance(0.5) ? 'east' : 'west') + '!', '#ff3355');
      g.audio.play('event');
      return true;
    }
    if (key === 'event_redshift') {
      if (w.isDay()) { g.notify('Only works at night.', '#ffcc33'); return false; }
      this.active = 'redshift'; g.notify('The Red Shift is rising...', '#ff2244'); g.audio.play('event'); return true;
    }
    if (key === 'event_eclipse') {
      if (!w.isDay()) { g.notify('Only works during the day.', '#ffcc33'); return false; }
      this.active = 'eclipse'; g.notify('A Solar Flare is happening!', '#ffb12e'); g.audio.play('event'); return true;
    }
    return false;
  }

  invaderKilled(n) {
    const g = this.game;
    if (this.active !== 'invasion' || !this.invasion) return;
    this.invasion.done += n;
    if (this.invasion.done >= this.invasion.need) {
      this.active = null; this.invasion = null;
      g.world.flags.invasionsDone = (g.world.flags.invasionsDone || 0) + 1;
      g.notify('The Drone Invasion has been repelled!', '#3dff6a');
      g.audio.play('levelup');
      g.dropItem(g.player.cx, g.player.cy - 40, g.rng.pick(['rocket_boots', 'kinetic_shield', 'targeting_scope', 'tinker_station']), 1);
      g.town.checkArrivals(true);
    }
  }

  fallStar() {
    const g = this.game, w = g.world, p = g.player;
    if (p.cy / TILE > w.layers.rock) return;
    const x = p.cx + g.rng.int(-900, 900);
    const d = new Drop(x, Math.max(0, p.cy - 700), 'star_shard', 1);
    d.vx = g.rng.float(-1, 1); d.vy = 4; d.star = true; d.delay = 0;
    g.drops.push(d);
  }

  orbitalDrop() {
    const g = this.game, w = g.world;
    let tx;
    for (let k = 0; k < 50; k++) {
      tx = g.rng.int(Math.floor(w.w * 0.1), Math.floor(w.w * 0.9));
      if (Math.abs(tx - w.spawnX) > 150) break;
    }
    const sy = g.findStandY(tx);
    const r = 9;
    for (let dy = -r; dy <= r + 4; dy++) for (let dx = -r - 4; dx <= r + 4; dx++) {
      const x = tx + dx, y = sy + dy, d = Math.hypot(dx, dy * 1.3);
      if (!w.inb(x, y)) continue;
      const t = TILES[w.get(x, y)];
      if (t && (t.tool === 'none' || t.biome === 'dungeon' || t.biome === 'temple')) continue;
      if (d < r * 0.75 && dy < 3) w.set(x, y, 0);
      else if (d < r + 2 && dy >= -2) w.set(x, y, T.xenometal_ore);
    }
    g.notify('An Orbital Drop has crashed to the ' + (tx < g.player.cx / TILE ? 'west' : 'east') + '!', '#ff6a3d');
    g.audio.play('explode');
  }

  startHardmode() {
    const g = this.game, w = g.world;
    w.flags.hardmode = true;
    g.notify('The Singularity has awakened!', '#d0a0ff');
    g.notify('Prism and Blight surge across the Strata. New ores crystallize in the deep.', '#ff9ee8');
    g.audio.play('event');
    // two diagonal biome stripes
    const L = w.layers;
    const cx = Math.floor(w.w / 2);
    for (const [mode, x0, dir] of [['prism', cx - Math.floor(w.w * 0.12), -1], ['blight', cx + Math.floor(w.w * 0.12), 1]]) {
      const map = CONVERT[mode];
      const width = Math.floor(w.w * 0.035);
      for (let y = 0; y < L.core; y++) {
        const xs = x0 + Math.floor((y - L.surface) * 0.35 * dir);
        for (let x = xs - width; x <= xs + width; x++) {
          if (!w.inb(x, y)) continue;
          const i = y * w.w + x, to = map.get(w.fg[i]);
          if (to) w.fg[i] = to;
          if (w.wall[i] && w.wall[i] !== W.derelict_wall && w.wall[i] !== W.temple_wall) w.wall[i] = mode === 'prism' ? W.prism_wall : W.blight_wall;
        }
      }
    }
    // new ores
    const hosts = new Set([T.ferrocrete, T.basalt, T.graymass, T.prismstone, T.cryoice, T.biogel, T.rustrock]);
    const vein = (id, count, y0, y1, r) => {
      for (let i = 0; i < count; i++) {
        let x = g.rng.int(10, w.w - 10), y = g.rng.int(y0, y1);
        for (let s = 0; s < g.rng.int(3, 6); s++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue;
            const xx = x + dx, yy = y + dy;
            if (w.inb(xx, yy) && hosts.has(w.fg[yy * w.w + xx])) w.fg[yy * w.w + xx] = id;
          }
          x += g.rng.int(-2, 2); y += g.rng.int(-1, 1);
        }
      }
    };
    const M = (w.w * w.h) / 1e6;
    vein(T.neutronium_ore, Math.floor(90 * M), L.rock, L.core - 5, 2);
    vein(T.chronite_ore, Math.floor(70 * M), L.cavern - 40, L.core - 5, 2);
    vein(T.aetherium_ore, Math.floor(50 * M), L.cavern, L.core - 5, 1);
    for (const l of w.listeners) l(-1, -1);
  }
}

export { summonBoss };
