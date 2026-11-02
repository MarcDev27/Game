// Progression of the Strata Engine. Instead of one boss flipping the world into "hard mode",
// the player takes the Engine over piece by piece:
//   Act I   – Reboot: power a colony, hack the Firewall (Clearance 1).
//   Act II  – Overrides: four subsystems in any order; each guardian grants Clearance and a
//             permanent choice between two overrides that change the world.
//   Reactor – at Clearance 3 the Core Warden can be challenged; beating it brings the reactor
//             online (Alert Level 1) and powers the Orbital Lift. The Engine's defense grid
//             (Twin Lancers, Leviathan, Prime Archon) then besieges the colony as Alert rises.
//   Act III – Ascent: the orbital ring, the Precursor Vault and the Architect's four relays.
// `flags.hardmode` is kept as the internal "reactor online" switch so existing content keyed on
// it keeps working.
import { TILE } from '../core/util.js';
import { T, TILES, W, CONVERT } from '../content/tiles.js';

export const SUBSYSTEMS = {
  foundry: {
    name: 'Nanite Foundry', guardian: 'data_wyrm',
    options: {
      purge: { name: 'Purge', desc: 'The Blight can never spread, and fewer Blight creatures appear.' },
      repurpose: { name: 'Repurpose', desc: 'The Blight keeps spreading once the reactor is online, but Blight creatures drop double materials and you command one more drone.' },
    },
  },
  biodome: {
    name: 'Bio-Dome', guardian: 'swarm_mother',
    options: {
      climate: { name: 'Climate Control', desc: 'Saplings and herbs grow three times faster and fewer Overgrowth creatures appear.' },
      treaty: { name: 'Hive Treaty', desc: 'Hornet Drones fight for you instead of against you, and your drones deal 15% more damage.' },
    },
  },
  security: {
    name: 'Security Grid', guardian: 'archon',
    options: {
      turrets: { name: 'Turret Control', desc: 'Unlocks Security Turrets you can build at home. Powered turrets shoot hostile creatures.' },
      patrol: { name: 'Patrol', desc: 'Two security drones guard your colony and come back every dawn if destroyed.' },
    },
  },
  chrono: {
    name: 'Chronometer', guardian: 'echo_engine',
    options: {
      dial: { name: 'Time Dial', desc: 'Unlocks the Time Dial: skip to dawn or dusk whenever you like.' },
      rewind: { name: 'Rewind Beacon', desc: 'When destroyed you keep your credits and respawn at the last Quantum Beacon you used.' },
    },
  },
};
export const ACT2 = ['data_wyrm', 'swarm_mother', 'archon', 'echo_engine'];
export const REACTOR_CLEARANCE = 3;
export const SWITCH_COST = 50000;
// The Engine's defense grid, in the order it dispatches them as the Alert Level rises.
export const SIEGE_BOSSES = ['twin_lancers', 'leviathan', 'prime_archon'];

export function clearance(w) {
  const b = w.flags.bosses;
  return (b.firewall ? 1 : 0) + ACT2.filter((k) => b[k]).length;
}
export const reactorOnline = (w) => !!w.flags.hardmode;
export const overrideOf = (w, sub) => (w.flags.overrides || {})[sub] || null;
export const alertLevel = (w) => (reactorOnline(w) ? w.flags.alert || 1 : 0);

// Existing worlds: a world already in the old hard mode starts with the reactor online.
export function migrateWorld(w) {
  const f = w.flags;
  if (!f.overrides) f.overrides = {};
  if (f.hardmode && !f.alert) f.alert = 1 + SIEGE_BOSSES.filter((k) => f.bosses[k]).length;
  if (!f.relays) f.relays = {};
}

// Recipes can depend on progression: 'reactor', or 'subsystem:option' for a chosen override.
export function recipeUnlocked(w, r) {
  if (!r.req) return true;
  if (r.req === 'reactor') return reactorOnline(w);
  const [sub, opt] = r.req.split(':');
  return overrideOf(w, sub) === opt;
}

export function pendingChoices(w) {
  return Object.keys(SUBSYSTEMS).filter((k) => w.flags.bosses[SUBSYSTEMS[k].guardian] && !overrideOf(w, k));
}

export function chooseOverride(game, sub, opt) {
  const w = game.world;
  const before = overrideOf(w, sub);
  if (before === opt) return false;
  if (before) {
    if (game.player.credits < SWITCH_COST) { game.notify('Switching an override costs ' + SWITCH_COST + ' credits.', '#ffcc33'); return false; }
    game.player.credits -= SWITCH_COST;
  }
  w.flags.overrides[sub] = opt;
  game.notify(SUBSYSTEMS[sub].name + ': ' + SUBSYSTEMS[sub].options[opt].name + ' engaged.', '#2ef2ff');
  game.audio.play('levelup');
  applyWorldStats(game);
  return true;
}

// Stats the overrides grant the player, merged in Player.recalc().
export function applyWorldStats(game) {
  const w = game.world, s = {};
  if (overrideOf(w, 'foundry') === 'repurpose') s.minions = 1;
  if (overrideOf(w, 'biodome') === 'treaty') s.summonDmg = 0.15;
  game.player.worldStats = s;
  game.player.recalc();
}

// Why a boss can't be summoned yet (or null when it can).
export function summonBlocked(w, key) {
  if (ACT2.includes(key) && !w.flags.bosses.firewall) return 'The Engine\'s subsystems are sealed. Hack the Firewall first (Intrusion Key).';
  if (key === 'core_warden' && clearance(w) < REACTOR_CLEARANCE) return `The Reactor is locked: Clearance ${clearance(w)}/${REACTOR_CLEARANCE}. Override more subsystems first.`;
  if (key === 'architect' && Object.keys(w.flags.relays || {}).length < 4) return 'The Architect\'s core is shielded by its relays (' + Object.keys(w.flags.relays || {}).length + '/4 captured).';
  return null;
}

// ---------------------------------------------------------------- reactor reboot
export function rebootReactor(game) {
  const w = game.world;
  if (w.flags.hardmode) return;
  w.flags.hardmode = true;
  w.flags.alert = 1;
  w.flags.alertDay = w.day;
  game.notify('The Reactor is back online. The Engine has noticed you: Alert Level 1.', '#ff8a3d');
  game.notify('A Prism Rift has torn open, reactor vents are spewing Neutronium, and the Orbital Lift has power.', '#ff9ee8');
  game.audio.play('event');
  prismRift(game);
  reactorVents(game);
  buildOrbit(game);
  for (const l of w.listeners) l(-1, -1);
}

// One localized rift of Prism crystal instead of world-spanning biome stripes.
function prismRift(game) {
  const w = game.world, rng = game.rng;
  let cx = w.spawnX;
  for (let k = 0; k < 40 && Math.abs(cx - w.spawnX) < 200; k++) cx = rng.int(Math.floor(w.w * 0.12), Math.floor(w.w * 0.88));
  const cy = game.findStandY(cx) + 20, r = 34;
  const map = new Map(CONVERT.prism);
  map.set(T.regolith, T.prismstone); // the rift crystallizes the soil too
  for (let y = cy - r * 2; y <= cy + r; y++) for (let x = cx - r * 2; x <= cx + r * 2; x++) {
    if (!w.inb(x, y)) continue;
    if (((x - cx) / 2) ** 2 + (y - cy) ** 2 > r * r) continue;
    const i = y * w.w + x, to = map.get(w.fg[i]);
    if (to) w.fg[i] = to;
    if (w.wall[i] && w.wall[i] !== W.derelict_wall && w.wall[i] !== W.temple_wall) w.wall[i] = W.prism_wall;
  }
  w.flags.prismRift = [cx, cy];
}

// Neutronium collects around vents just above the Reactor Core.
function reactorVents(game) {
  const w = game.world, rng = game.rng, L = w.layers;
  const n = Math.round(w.w / 140);
  for (let i = 0; i < n; i++) {
    const vx = rng.int(20, w.w - 20), vy = rng.int(L.core - 60, L.core - 8);
    for (let s = 0; s < 6; s++) {
      const x = vx + rng.int(-8, 8), y = vy + rng.int(-6, 6), rr = rng.int(1, 3);
      for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        if (dx * dx + dy * dy > rr * rr || !w.inb(x + dx, y + dy)) continue;
        if (TILES[w.get(x + dx, y + dy)]?.stone || w.get(x + dx, y + dy) === T.basalt) w.set(x + dx, y + dy, T.neutronium_ore, 0);
      }
    }
  }
}

// The orbital ring: a hub with the lift landing and a beacon, four Architect relays, a shipyard,
// and asteroid fields carrying Chronite and Aetherium.
export function buildOrbit(game) {
  const w = game.world, rng = game.rng;
  if (w.flags.orbit) return;
  const ry = Math.max(14, Math.floor(w.h * 0.035));
  const deck = (x0, x1, y) => { for (let x = x0; x <= x1; x++) if (w.inb(x, y)) { w.set(x, y, T.station_deck, 0); for (let yy = y - 7; yy < y; yy++) if (w.inb(x, yy) && !w.get(x, yy)) w.wall[yy * w.w + x] = W.station_wall; } };
  const place = (key, x, y) => { const t = TILES[T[key]]; const f = t.furn; const ox = x - Math.floor((f.w - 1) / 2), oy = y - f.h; w.placeFurniture(ox, oy, T[key]); return [ox, oy]; };
  const hubX = Math.floor(w.w / 2);
  deck(hubX - 22, hubX + 22, ry);
  const lift = place('lift_platform', hubX - 6, ry);
  const beacon = place('quantum_beacon', hubX + 6, ry);
  w.flags.beacons = w.flags.beacons || []; w.flags.beacons.push(beacon);
  const relays = {};
  const kinds = ['flux', 'volt', 'nova', 'drift'];
  kinds.forEach((k, i) => {
    const x = Math.floor(w.w * (0.1 + i * 0.27)), y = ry + rng.int(-4, 6);
    deck(x - 9, x + 9, y);
    relays[k] = place('relay_' + k, x, y);
  });
  const yardX = Math.floor(w.w * 0.62);
  deck(yardX - 14, yardX + 14, ry + 3);
  // asteroids
  const n = Math.round(w.w / 120);
  for (let i = 0; i < n; i++) {
    const ax = rng.int(30, w.w - 30), ay = rng.int(ry + 10, Math.floor(w.h * 0.075)), r = rng.int(3, 7);
    if (Math.abs(ax - hubX) < 30) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r - 2; dx <= r + 2; dx++) {
      const x = ax + dx, y = ay + dy;
      if (!w.inb(x, y) || w.get(x, y) || (dx / 1.3) ** 2 + dy * dy > r * r) continue;
      const ore = rng.next();
      w.set(x, y, ore < 0.16 ? T.chronite_ore : ore < 0.26 ? T.aetherium_ore : T.basalt, 0);
    }
  }
  w.flags.orbit = { hub: [hubX, ry], lift, relays, yard: [yardX, ry + 3], y: ry };
  game.notify('An orbital ring has lit up high above the Strata.', '#66ccff');
}

// ---------------------------------------------------------------- Alert Level and sieges
// The defense grid besieges the colony at night once the Alert Level allows it.
export function nextSiegeBoss(w) {
  if (!reactorOnline(w)) return null;
  const done = SIEGE_BOSSES.filter((k) => w.flags.bosses[k]).length;
  return SIEGE_BOSSES.find((k) => !w.flags.bosses[k]) && done < 3 ? SIEGE_BOSSES.find((k) => !w.flags.bosses[k]) : null;
}

export function colonyCenter(game) {
  const homes = game.town.npcs.filter((n) => n.home);
  if (!homes.length) return [game.world.spawnX, game.findStandY(game.world.spawnX)];
  return [Math.round(homes.reduce((a, n) => a + n.home[0], 0) / homes.length), Math.round(homes.reduce((a, n) => a + n.home[1], 0) / homes.length)];
}

export function nearColony(game, range = 90) {
  const [cx, cy] = colonyCenter(game), p = game.player;
  return Math.abs(p.cx / TILE - cx) < range && Math.abs(p.cy / TILE - cy) < 60;
}

export function onBossDefeated(game, key) {
  const w = game.world;
  if (SIEGE_BOSSES.includes(key) && reactorOnline(w)) {
    const lvl = 1 + SIEGE_BOSSES.filter((k) => w.flags.bosses[k]).length;
    if (lvl > (w.flags.alert || 1)) {
      w.flags.alert = Math.min(4, lvl);
      w.flags.alertDay = w.day;
      game.notify('Defense unit destroyed. The Engine escalates: Alert Level ' + w.flags.alert + '.', '#ff8a3d');
    }
  }
  if (key === 'firewall') game.notify('Clearance 1: the Engine\'s subsystems are open to you, and the Data Network is online.', '#2ef2ff');
  if (ACT2.includes(key)) {
    const c = clearance(w);
    game.notify(`Clearance ${c}.` + (c === REACTOR_CLEARANCE ? ' The Reactor can now be challenged.' : ''), '#2ef2ff');
  }
}
