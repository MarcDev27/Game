// Colonists (town NPCs): arrival conditions, housing validation, wandering, shops and hints.
import { TILE, rng, sign, clamp } from '../core/util.js';
import { TILES, T, LIGHT_R, LIGHT_G, SOLID } from '../content/tiles.js';
import { ITEMS } from '../content/items.js';
import { BOSS_INFO } from '../content/monsters.js';
import { moveEntity } from './physics.js';
import { countItem } from './inventory.js';
import { DOOR_OPEN } from '../world/world.js';

export const COLONISTS = {
  archivist: {
    title: 'Archivist', names: ['Ada', 'Lumen', 'Orrin', 'Vesper', 'Kael'], look: { chassis: '#d8c6ef', suit: '#3a2a4f', visor: '#9dff3d', hair: '#ffffff', style: 3 },
    cond: () => true, noHouse: true,
    lines: ['I archive everything that falls from orbit. Ask me for a hint whenever you are lost.', 'These Strata were a terraforming engine once. Now they are... wild.', 'Tap a crafting station while standing near it to see what it can make.'],
  },
  trader: {
    title: 'Trader', names: ['Mirt', 'Sol', 'Dex', 'Pryce'], look: { chassis: '#e8d0b0', suit: '#8a5a3a', visor: '#ffcc33', hair: '#5a3a2a', style: 0 },
    cond: (g) => g.player.credits >= 1500,
    shop: (g) => ['glowstick', 'cable', 'micro_stim', 'charge_cell', 'kinetic_round', 'seed_pod', 'grenade', 'nano_shuriken', 'recall_inj', 'depth_meter', 'tool_belt', ...(g.world.flags.hardmode ? ['stim_pack', 'magnet_module'] : [])],
    lines: ['Credits talk. Everything else walks.', 'Fresh glowsticks, barely used!', 'I buy anything shiny. At a discount, of course.'],
  },
  medic: {
    title: 'Medic', names: ['Iris', 'Nova', 'Halley'], look: { chassis: '#ffffff', suit: '#e8e8f0', visor: '#ff3355', hair: '#ff5a8a', style: 2 },
    cond: (g) => g.player.maxLife > 100 && g.town.has('trader'),
    service: 'heal',
    lines: ['Hold still. This will only sting a lot.', 'Integrity is not a renewable resource. Well... it is, for a fee.'],
  },
  gunsmith: {
    title: 'Gunsmith', names: ['Brask', 'Colt', 'Ripley'], look: { chassis: '#8a7a6a', suit: '#3a3d46', visor: '#ff8a3d', hair: '#222222', style: 1 },
    cond: (g) => g.player.inv.some((s) => s && (ITEMS[s.k].ammo || ITEMS[s.k].type === 'ammo')),
    shop: (g) => ['kinetic_round', 'cuprite_gun', 'ferrite_gun', 'scatter_cannon', 'grenade', ...(g.world.flags.bosses.overseer ? ['targeting_scope'] : []), ...(g.world.flags.hardmode ? ['rocket_i', 'rocket_launcher', 'neutron_round'] : [])],
    lines: ['Point the shiny end at the angry thing.', 'Kinetic rounds never go out of style.'],
  },
  botanist: {
    title: 'Botanist', names: ['Fern', 'Moss', 'Ivy', 'Sylva'], look: { chassis: '#b4ff4a', suit: '#3a8a2a', visor: '#ffffff', hair: '#7dff5a', style: 2 },
    cond: (g) => Object.keys(g.world.flags.bosses).length > 0,
    shop: (g) => ['seed_pod', 'grass_seeds', 'glowmoss_seeds', 'nano_purifier', 'glowcap', ...(g.world.flags.hardmode ? ['purifier_cannon'] : [])],
    lines: ['The Blight is a self-replicating error. Purify it.', 'Plant seed pods on synthgrass and watch them grow.'],
    hint: (g) => g.world.flags.hardmode ? 'Blight and Prism now spread on their own. My Purifier Cannon can push them back.' : 'There are ' + (g.world.flags.nodesSmashed || 0) + ' Blight Nodes smashed. Every third one wakes the Data Wyrm.',
  },
  engineer: {
    title: 'Engineer', names: ['Gear', 'Tess', 'Bolt', 'Watt'], look: { chassis: '#aeb7c2', suit: '#5a6b8a', visor: '#ffcc33', hair: '#ff8a3d', style: 0 },
    cond: (g) => !!g.world.flags.bosses.archon,
    shop: (g) => ['tinker_station', 'grapple_hook', 'sentry_remote', 'demo_charge', 'radar', 'magnet_module', 'ferrite_remote', ...(g.world.flags.hardmode ? ['rocket_mining'] : [])],
    lines: ['Two accessories are better than one. Combine them at a Tinker Station.', 'The Archon kept me locked up for 300 years. Thanks for that.'],
  },
  hacker: {
    title: 'Hacker', names: ['Null', 'Glitch', 'Cipher', 'Byte'], look: { chassis: '#2a2a3a', suit: '#111118', visor: '#3dff6a', hair: '#3dff6a', style: 1 },
    cond: (g) => g.world.flags.hardmode,
    service: 'reforge',
    shop: (g) => ['spark_wand', 'charge_cell', 'greater_cell', 'energy_band', 'void_band', 'eclipse_lens', 'signal_flare'],
    lines: ['I can rewrite your gear\'s firmware. For a price.', 'Every weapon has a hidden modifier. Mine are better.'],
  },
  smuggler: {
    title: 'Smuggler', names: ['Vex', 'Nyx', 'Rook'], look: { chassis: '#5a4a6a', suit: '#2a1f3a', visor: '#ff3ddc', hair: '#ff3ddc', style: 3 },
    cond: () => false, noHouse: true, traveling: true,
    shop: (g) => g.town.smugglerStock,
    lines: ['Don\'t ask where it came from.', 'One day only. Then I vanish.'],
  },
};

const SMUGGLER_POOL = ['phase_dash', 'jump_module', 'hydraulic_boots', 'grav_bubble', 'regen_band', 'precision_chip', 'overclock_chip', 'glow_drone', 'ion_boomerang', 'volt_spear', 'grav_flail', 'medkit_core', 'mining_gauntlet', 'gecko_gloves', 'hover_soles', 'lumen_hook', 'trade_terminal', 'circuit_block', 'neon_cyan', 'neon_magenta', 'red_shift_beacon', 'ration_bar'];

export class TownNpc {
  constructor(key, name, x, y) {
    this.key = key; this.def = COLONISTS[key]; this.name = name;
    this.w = 20; this.h = 42; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.dir = 1;
    this.onGround = false; this.anim = 0; this.timer = rng.int(60, 200); this.home = null; this.walk = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
}

export class Town {
  constructor(game) {
    this.game = game; this.npcs = []; this.smugglerStock = [];
    this.timer = 0;
  }

  init() {
    const w = this.game.world;
    for (const s of w.townNpcs || []) {
      const n = new TownNpc(s.key, s.name, s.x, s.y);
      n.home = s.home;
      this.npcs.push(n);
    }
    if (w.flags.smuggler) this.smugglerStock = w.flags.smuggler;
    if (!this.has('archivist')) this.arrive('archivist', null);
  }

  save() {
    this.game.world.townNpcs = this.npcs.filter((n) => !n.def.traveling).map((n) => ({ key: n.key, name: n.name, x: n.x, y: n.y, home: n.home }));
  }

  has(key) { return this.npcs.some((n) => n.key === key); }

  arrive(key, home) {
    const w = this.game.world, d = COLONISTS[key];
    let x, y;
    if (home) { x = home[0] * TILE; y = (home[1] + 2) * TILE - 42 - 0.01; }
    else { x = w.spawnX * TILE + rng.int(-40, 40); y = this.game.findStandY(Math.floor(x / TILE)) * TILE - 43; }
    const n = new TownNpc(key, rng.pick(d.names), x, y);
    n.home = home;
    this.npcs.push(n);
    if (key !== 'archivist') this.game.notify(n.name + ' the ' + d.title + ' has arrived!', '#3dff6a');
    this.save();
    return n;
  }

  onPickup() { /* conditions re-checked periodically */ }

  smugglerRoll() {
    const g = this.game;
    this.npcs = this.npcs.filter((n) => n.key !== 'smuggler');
    if (g.rng.chance(0.25) && this.npcs.length >= 2) {
      const stock = [];
      while (stock.length < 6) { const k = g.rng.pick(SMUGGLER_POOL); if (!stock.includes(k)) stock.push(k); }
      this.smugglerStock = stock;
      g.world.flags.smuggler = stock;
      this.arrive('smuggler', null);
      g.notify('A Smuggler has docked nearby! (Leaves at dusk)', '#ff3ddc');
    }
  }

  checkArrivals(force = false) {
    const g = this.game;
    for (const key in COLONISTS) {
      const d = COLONISTS[key];
      if (this.has(key) || d.traveling) continue;
      if (!d.cond(g)) continue;
      if (d.noHouse) { this.arrive(key, null); continue; }
      const home = this.findHouse();
      if (home) { this.arrive(key, home); return; }
    }
  }

  // Scan around the player for a valid, unoccupied room anchored on a chair.
  findHouse() {
    const g = this.game, w = g.world, p = g.player;
    const ptx = Math.floor(p.cx / TILE), pty = Math.floor(p.cy / TILE);
    const taken = new Set(this.npcs.filter((n) => n.home).map((n) => n.home[0] + ',' + n.home[1]));
    for (let y = pty - 40; y <= pty + 40; y++) for (let x = ptx - 70; x <= ptx + 70; x++) {
      const t = TILES[w.get(x, y)];
      if (!t || !t.chair) continue;
      const [ox, oy] = w.origin(x, y);
      if (ox !== x || oy !== y) continue;
      if (taken.has(ox + ',' + oy)) continue;
      if (this.validRoom(ox, oy + 1)) return [ox, oy];
    }
    return null;
  }

  validRoom(sx, sy) {
    const w = this.game.world;
    const seen = new Set(), stack = [[sx, sy]];
    let light = false, table = false, entrance = false, cells = 0;
    while (stack.length) {
      const [x, y] = stack.pop();
      const k = y * w.w + x;
      if (seen.has(k)) continue;
      seen.add(k);
      if (!w.inb(x, y)) return false;
      const id = w.get(x, y), t = TILES[id];
      if (t && t.door) { entrance = true; continue; }
      if (t && t.platform) { entrance = true; continue; }
      if (t && t.solid) continue;
      cells++;
      if (cells > 750) return false;
      if (!w.getWall(x, y)) return false;
      if (t && (LIGHT_R[id] > 0.3 || LIGHT_G[id] > 0.3)) light = true;
      if (t && t.table) table = true;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return cells >= 50 && light && table && entrance;
  }

  update() {
    const g = this.game, w = g.world;
    this.timer++;
    if (this.timer % 600 === 0) this.checkArrivals();
    // smuggler leaves at dusk
    if (!w.isDay()) this.npcs = this.npcs.filter((n) => n.key !== 'smuggler');
    for (const n of this.npcs) {
      n.timer--;
      const night = !w.isDay();
      if (n.timer <= 0) {
        n.timer = rng.int(90, 300);
        n.walk = rng.chance(0.55) ? (rng.chance(0.5) ? 1 : -1) : 0;
        if (n.home) {
          const hx = n.home[0] * TILE;
          if (night) n.walk = Math.abs(hx - n.x) > 24 ? sign(hx - n.x) : 0;
          else if (Math.abs(hx - n.x) > 12 * TILE) n.walk = sign(hx - n.x);
        }
      }
      // face the player when they are close
      if (Math.abs(g.player.cx - n.cx) < 60 && Math.abs(g.player.cy - n.cy) < 60 && !g.player.dead) { n.walk = 0; n.dir = sign(g.player.cx - n.cx) || n.dir; }
      n.vx = n.walk * 1.1;
      if (n.walk) n.dir = n.walk;
      n.vy = Math.min(n.vy + 0.35, 10);
      moveEntity(w, n, { platforms: true, step: true });
      if (n.hitWall) { n.walk = -n.walk; }
      // don't walk off ledges higher than 3 tiles
      if (n.walk && n.onGround) {
        const ahead = Math.floor((n.cx + n.walk * 14) / TILE), foot = Math.floor((n.y + n.h + 2) / TILE);
        let drop = 0; while (drop < 4 && !w.solidAt(ahead, foot + drop) && !w.platformAt(ahead, foot + drop)) drop++;
        if (drop >= 4) n.walk = -n.walk;
      }
      if (Math.abs(n.vx) > 0.1) n.anim += 0.5;
      // fell out of the world / lost: return home
      if (n.home && (Math.abs(n.x - n.home[0] * TILE) > 80 * TILE || Math.abs(n.y - n.home[1] * TILE) > 50 * TILE)) {
        n.x = n.home[0] * TILE; n.y = (n.home[1] + 2) * TILE - n.h - 0.01;
      }
      if (n.home) {
        const t = TILES[w.get(n.home[0], n.home[1])];
        if (!t || !t.chair) { n.home = null; }
      }
    }
    if (this.timer % 600 === 0) this.save();
  }

  price(k) { const it = ITEMS[k]; return Math.max(1, it.value || 10); }

  hint() {
    const g = this.game, w = g.world, p = g.player;
    const f = w.flags.bosses;
    const have = (k) => countItem(p.inv, k) > 0;
    const stations = new Set();
    for (const s of p.inv) if (s && ITEMS[s.k].place) { const t = TILES[T[ITEMS[s.k].place]]; if (t && t.station) stations.add(t.station); }
    const discovered = (k) => p.discovered.has(k);
    if (!discovered('assembly_bench') && !discovered('fiber')) return 'Chop Lattice Trees with your Scrap Cutter to collect Fiber. Then open Crafting to build an Assembly Bench (10 Fiber).';
    if (!discovered('assembly_bench')) return 'Craft an Assembly Bench from 10 Fiber, place it, and stand near it to unlock more recipes.';
    if (!discovered('smelter')) return 'Mine down to find Ferrocrete and ore veins. A Smelter needs 20 Ferrocrete, 4 Fiber and 3 Glowsticks (Nanogel from slimes + Fiber).';
    if (!discovered('fabricator')) return 'Smelt Ferrite Ore into bars at the Smelter. 5 Ferrite Bars make a Fabricator, where you can build metal tools and armor.';
    if (this.npcs.length < 3 && !w.flags.bosses.overseer) return 'Colonists need housing: an enclosed room (at least 50 tiles) with background walls, a door or platform, a light, a table and a chair.';
    if (p.maxLife < 160 && !f.overseer) return 'Vital Cores glow red deep underground. Smash them with your pick to permanently raise your max integrity.';
    if (!f.gel_sovereign && !f.overseer) return 'You could challenge the Gel Sovereign (craft a Gel Beacon from 30 Nanogel) or the Overseer (Optic Lure from 6 Optic Lenses, at night).';
    if (!f.overseer) return BOSS_INFO.overseer.hint;
    if (!f.data_wyrm) return 'Lumenite Ore from the Overseer makes strong gear. Next, venture into the Blight: ' + BOSS_INFO.data_wyrm.hint;
    if (!f.swarm_mother) return 'Deep in the Overgrowth lies a hive. ' + BOSS_INFO.swarm_mother.hint;
    if (!f.archon) return 'Wyrm Scales + Lumenite make Blight Shell armor. When ready: ' + BOSS_INFO.archon.hint;
    if (!discovered('plasmite_ore')) return 'The Derelict Station holds Access Keys and loot. Then dig to the Reactor Core at the bottom of the world for Plasmite (needs a Cryonite Pick).';
    if (!f.core_warden) return 'Plasmite gear will protect you in the Core. ' + BOSS_INFO.core_warden.hint + ' Build a long bridge first!';
    if (!f.twin_lancers || !f.leviathan || !f.prime_archon) return 'The Singularity has begun. Smash new Neutronium ore with a Plasmite Pick. Mechanical bosses await: Mechanical Optic, Worm Chip and Skull (Photon/Void Cores from Prism/Blight caves).';
    if (!f.bloom_titan) return 'Exalted Alloy from the mechanical bosses unlocks Chronite mining. ' + BOSS_INFO.bloom_titan.hint;
    if (!f.gravity_golem) return 'The Ancient Key opens the Temple door in the Overgrowth caverns. ' + BOSS_INFO.gravity_golem.hint;
    if (!f.architect) return BOSS_INFO.architect.hint + ' Craft a Quantum Assembler and an Architect Sigil.';
    return 'You have defeated the Architect. Craft Singularity gear, collect everything, and build a city worthy of the stars.';
  }
}
