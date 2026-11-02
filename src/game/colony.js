// The colony as a machine: generators power rooms, turrets and the Orbital Lift; the Security
// override adds turrets or a drone patrol; the Engine's defense grid besieges the colony; and
// the Architect's relays in orbit are captured by holding them while a hack runs.
import { TILE, rng } from '../core/util.js';
import { TILES, T } from '../content/tiles.js';
import { overrideOf, reactorOnline, nextSiegeBoss, nearColony, colonyCenter } from './progress.js';
import { summonBoss } from './bosses.js';

// Generators and turrets are recorded where they are placed and validated lazily.
function tracked(game, list, test) {
  const w = game.world;
  const out = (w.flags[list] || []).filter(([x, y]) => { const t = TILES[w.get(x, y)]; const o = w.origin(x, y); return t && test(t) && o[0] === x && o[1] === y; });
  w.flags[list] = out;
  return out;
}
export function generators(game) { return tracked(game, 'generators', (t) => t.power); }
export function turrets(game) { return tracked(game, 'turrets', (t) => t.turret); }

export function registerFurniture(game, t, ox, oy) {
  const w = game.world;
  if (t.power) (w.flags.generators = w.flags.generators || []).push([ox, oy]);
  if (t.turret) (w.flags.turrets = w.flags.turrets || []).push([ox, oy]);
}

// Is tile (tx, ty) within reach of a generator?
export function poweredAt(game, tx, ty) {
  const w = game.world;
  for (const [x, y] of generators(game)) {
    const t = TILES[w.get(x, y)], f = t.furn;
    if (Math.hypot(tx - (x + f.w / 2), ty - (y + f.h / 2)) <= t.power) return true;
  }
  return false;
}

const hostile = (m) => !m.dead && !m.allied && !m.def.friendly && !m.def.immune && !m.cloak && !(m.ai && (m.ai.dormant || m.ai.inactive));

export function updateColony(game) {
  const w = game.world, p = game.player;
  // ---- turrets
  if (game.tick % 10 === 0) {
    const dmg = 22 + Object.keys(w.flags.bosses).length * 6 + (reactorOnline(w) ? 30 : 0);
    for (const [x, y] of turrets(game)) {
      const key = x + ',' + y;
      const cd = (game.turretCd[key] || 0) - 10;
      game.turretCd[key] = cd;
      if (cd > 0 || Math.abs(x * TILE - p.cx) > 70 * TILE) continue;
      if (!poweredAt(game, x + 1, y + 1)) continue;
      const cx = x * TILE + 16, cy = y * TILE + 12;
      let best = null, bd = 18 * TILE;
      for (const m of game.monsters) { if (!hostile(m)) continue; const d = Math.hypot(m.cx - cx, m.cy - cy); if (d < bd && game.los(cx, cy, m.cx, m.cy)) { bd = d; best = m; } }
      if (!best) continue;
      const a = Math.atan2(best.cy - cy, best.cx - cx);
      game.spawnProjectile('turret_shot', cx, cy, Math.cos(a) * 11, Math.sin(a) * 11, dmg, 2, 'player', { dmgType: 'ranged' });
      game.turretCd[key] = 40;
    }
  }
  // ---- security patrol
  if (overrideOf(w, 'security') === 'patrol' && game.tick % 120 === 5 && !w.flags.patrolDown) {
    const have = game.monsters.filter((m) => m.key === 'patrol_drone').length;
    if (have < 2 && nearColony(game, 120)) {
      const [cx, cy] = colonyCenter(game);
      for (let i = have; i < 2; i++) { const d = game.spawnMonster('patrol_drone', cx * TILE + (i ? 60 : -60), (cy - 6) * TILE, true); d.allied = 1e12; }
    }
  }
  // ---- relay hack in progress
  const h = game.relayHack;
  if (h) {
    const d = Math.hypot(p.cx / TILE - h.x, p.cy / TILE - h.y);
    if (p.dead || d > 70) { game.relayHack = null; game.notify('Relay hack aborted.', '#ff8fa8'); return; }
    if (d < 16) h.t++; else h.t = Math.max(0, h.t - 2);
    if (game.tick % 150 === 0) {
      const sentinel = h.k + '_sentinel';
      if (game.monsters.filter((m) => m.key === sentinel).length < 2) game.spawnMonster(sentinel, (h.x + rng.pick([-1, 1]) * rng.int(14, 24)) * TILE, (h.y - rng.int(4, 10)) * TILE, true);
      for (let i = 0; i < 2; i++) game.spawnMonster(rng.pick(['grav_wisp', 'sky_drone', 'emp_drone']), (h.x + rng.int(-30, 30)) * TILE, (h.y - rng.int(6, 14)) * TILE, true);
    }
    if (h.t >= h.need) {
      w.flags.relays[h.k] = true;
      game.dropItem(h.x * TILE, (h.y - 2) * TILE, 'fragment_' + h.k, rng.int(8, 14));
      const n = Object.keys(w.flags.relays).length;
      game.notify(TILES[T['relay_' + h.k]].name + ' captured (' + n + '/4).' + (n === 4 ? ' The Architect\'s core is exposed!' : ''), '#d0a0ff');
      game.audio.play('levelup');
      game.relayHack = null;
    }
  }
}

export function startRelayHack(game, k, ox, oy) {
  const w = game.world;
  if (w.flags.relays[k]) { game.notify('This relay already answers to you.', '#d0a0ff'); return; }
  if (!w.flags.bosses.gravity_golem) { game.notify('The relay rejects your credentials. The Precursor Vault holds what it needs.', '#d0a0ff'); return; }
  if (game.relayHack) return;
  game.relayHack = { k, x: ox + 1.5, y: oy + 2, t: 0, need: 1800 };
  game.notify('Hacking the relay: stay close for 30 seconds while its defenders arrive!', '#d0a0ff');
  game.audio.play('event');
}

// ---- sieges: at dusk the defense grid attacks the colony once the Alert Level calls for it
export function trySiege(game) {
  const w = game.world, ev = game.events;
  const boss = nextSiegeBoss(w);
  if (!boss || ev.active || game.bosses.some((b) => !b.dead)) return false;
  if (w.day - (w.flags.alertDay || 0) < 2 || !nearColony(game)) return false;
  return startSiege(game, boss);
}

export function startSiege(game, boss) {
  game.events.active = 'siege';
  game.notify('ENGINE SIEGE: the defense grid is attacking your colony!', '#ff3355');
  game.audio.play('event');
  summonBoss(game, boss);
  return true;
}

// Time Dial: jump to the next dawn or dusk.
export function useTimeDial(game) {
  const w = game.world;
  if (game.bosses.some((b) => !b.dead)) { game.notify('The dial won\'t turn while a guardian is awake.', '#3dffb0'); return; }
  w.time = w.isDay() ? 19.5 * 3600 + 60 : 4.5 * 3600 + 60;
  if (!w.isDay()) { /* dusk */ } else w.day++;
  game.notify(w.isDay() ? 'The Time Dial turns to dawn.' : 'The Time Dial turns to dusk.', '#3dffb0');
  game.audio.play('summon');
}

// Orbital Lift: needs power, carries you between the surface and the orbital ring.
export function useLift(game, t, ox, oy) {
  const w = game.world, o = w.flags.orbit;
  if (t.key === 'orbital_lift') {
    if (!reactorOnline(w) || !o) { game.notify('The lift has no power from the Reactor yet.', '#66ccff'); return; }
    if (!poweredAt(game, ox + 1, oy + 2)) { game.notify('The Orbital Lift needs a generator nearby.', '#66ccff'); return; }
    w.flags.lastLift = [ox + 1, oy + 4];
    game.teleportTo(o.lift[0] + 1, o.lift[1] + 4);
    game.notify('Orbital ring reached.', '#66ccff');
  } else {
    const back = w.flags.lastLift || [w.spawnX, game.findStandY(w.spawnX)];
    game.teleportTo(back[0], back[1]);
  }
}
