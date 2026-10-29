// Rideable vehicles: hoverbike, flying sky car, drill pod, combat mech and starjumper shuttle.
// While riding, the player's collision box becomes the vehicle's box and the vehicle's
// handling replaces normal walking/jumping physics.
import { TILE, clamp, sign, rectsOverlap } from '../core/util.js';
import { ITEMS, VEHICLES } from '../content/items.js';
import { TILES } from '../content/tiles.js';
import { moveEntity, rectSolid, liquidAt } from './physics.js';
import { LIQ } from '../world/world.js';

export function vehicleDef(p) { return p.vehicle ? VEHICLES[p.vehicle.key] : null; }

export function toggleRide(game, p) {
  const w = game.world;
  if (p.vehicle) {
    // dismount: find room for the on-foot body
    const ox = p.cx - 10;
    for (const dy of [0, -16, -32, 16]) {
      const ny = p.y + p.h - 42 + dy;
      if (!rectSolid(w, ox, ny, 20, 42)) {
        p.x = ox; p.y = ny; p.w = 20; p.h = 42; p.vehicle = null; p.fallStartY = p.y;
        game.fx.burst(p.cx, p.cy, '#2ef2ff', 10, 2); game.audio.play('door'); p.recalc();
        return true;
      }
    }
    game.fx.text(p.cx, p.y - 6, 'No room to exit', '#ffcc33');
    return false;
  }
  const slot = p.equip.vehicle;
  if (!slot) { game.fx.text(p.cx, p.y - 6, 'Equip a vehicle first', '#ffcc33'); return false; }
  const key = ITEMS[slot.k].vehicle, d = VEHICLES[key];
  const nx = p.cx - d.w / 2;
  for (const dy of [0, -16, -32]) {
    const ny = p.y + p.h - d.h + dy;
    if (!rectSolid(w, nx, ny, d.w, d.h)) {
      p.x = nx; p.y = ny; p.w = d.w; p.h = d.h; p.hook = null; p.climbing = false;
      p.vehicle = { key, cd: 0, rams: new Map(), lift: 0 };
      game.fx.burst(p.cx, p.cy, d.color, 14, 2.5); game.audio.play('summon'); p.recalc();
      p.stats.rides = (p.stats.rides || 0) + 1;
      if (key === 'skycar') p.stats.flewCar = true;
      return true;
    }
  }
  game.fx.text(p.cx, p.y - 6, 'Not enough room', '#ffcc33');
  return false;
}

function groundBelow(w, p, max) {
  const tx0 = Math.floor(p.x / TILE), tx1 = Math.floor((p.x + p.w - 1) / TILE);
  const ty = Math.floor((p.y + p.h) / TILE);
  for (let d = 0; d <= max; d++) for (let tx = tx0; tx <= tx1; tx += Math.max(1, tx1 - tx0)) {
    const y = ty + d;
    if (w.solidAt(tx, y) || w.platformAt(tx, y) || (w.inb(tx, y) && w.liq[y * w.w + tx] > 120)) return d;
  }
  return Infinity;
}

// Returns true when the vehicle handled item use itself (mech / shuttle guns).
export function updateVehicle(game, p, inp, aim, useHeld) {
  const w = game.world, v = p.vehicle, d = VEHICLES[v.key];
  const mx = inp.mx, my = inp.my;
  if (v.cd > 0) v.cd--;
  const space = p.y / TILE < w.layers.space;
  const liquid = liquidAt(w, p);
  let drop = false;
  switch (d.mode) {
    case 'hover': {
      p.vx += mx * 0.35; p.vx *= mx ? 0.985 : 0.95;
      p.vx = clamp(p.vx, -d.speed, d.speed);
      const gap = groundBelow(w, p, 3);
      if (gap <= 2) { p.vy += (gap < 1 ? -0.6 : -0.15); if (inp.jumpPressed) { p.vy = -7.5; game.audio.play('jump2'); } }
      p.vy = Math.min(p.vy + (space ? 0.18 : 0.4), 9);
      if (gap <= 1 && p.vy > 0) p.vy *= 0.5;
      drop = inp.down;
      break;
    }
    case 'fly': {
      const gap = d.antigrav ? groundBelow(w, p, d.antigrav) : 0;
      const lift = (!d.antigrav || gap <= d.antigrav) && !(d.antigrav && space);
      p.vx += mx * 0.32; p.vy += (my || (inp.jump ? -1 : 0)) * 0.32;
      p.vx *= mx ? 0.99 : 0.94; p.vy *= (my || inp.jump) ? 0.99 : 0.92;
      if (!lift) { p.vy += 0.35; if (game.tick % 40 === 0) game.fx.text(p.cx, p.y - 6, 'Antigrav field lost', '#ff8fa8'); }
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > d.speed) { p.vx *= d.speed / sp; p.vy *= d.speed / sp; }
      if (game.tick % 3 === 0) game.fx.spark(p.cx - p.dir * d.w * 0.45, p.y + p.h - 4, d.color, -p.dir, 1, 16, 2);
      break;
    }
    case 'drill': {
      p.vx = mx * d.speed; p.vy = my ? my * d.speed : Math.min(p.vy + 0.4, 6);
      if (inp.jump) p.vy = -d.speed;
      if (mx || my || inp.jump) {
        const dx = sign(mx) * 6, dy = inp.jump ? -6 : sign(my) * 6 + (my ? 0 : 2);
        drillArea(game, p, p.x + dx, p.y + dy, d.drill);
      }
      break;
    }
    case 'walk': {
      p.vx += mx * 0.3; p.vx *= mx ? 0.96 : 0.8;
      p.vx = clamp(p.vx, -d.speed, d.speed);
      if (inp.jumpPressed && p.onGround) { p.vy = -d.jump; game.audio.play('jump'); v.airborne = true; }
      p.vy = Math.min(p.vy + (space ? 0.2 : 0.45), 12);
      if (liquid >= 0) { p.vx *= 0.9; p.vy = Math.min(p.vy, 3); }
      drop = inp.down;
      break;
    }
  }
  if (mx) p.dir = sign(mx);
  const preVy = p.vy;
  const wasAir = !p.onGround;
  moveEntity(w, p, { platforms: d.mode !== 'fly', step: d.mode === 'hover' || d.mode === 'walk', drop });
  p.x = clamp(p.x, TILE * 2, (w.w - 2) * TILE - p.w);
  if (p.y < 0) { p.y = 0; p.vy = Math.max(0, p.vy); }
  p.fallStartY = p.y;
  // mech stomp
  if (d.mode === 'walk' && wasAir && p.onGround && preVy > 6) {
    game.camShake = 8; game.audio.play('explode');
    for (const m of game.monsters) if (!m.dead && Math.abs(m.cx - p.cx) < 80 && Math.abs(m.cy - (p.y + p.h)) < 50) game.damageMonster(m, Math.round(preVy * 9 * p.dmgMult('melee')), 8, sign(m.cx - p.cx) || 1, false, null);
    game.fx.burst(p.cx, p.y + p.h, '#aeb7c2', 20, 3, false);
  }
  // ramming
  const speed = Math.hypot(p.vx, p.vy);
  if (d.ram && speed > 5) {
    for (const m of game.monsters) {
      if (m.dead || m.def.friendly || m.allied || !rectsOverlap(p, m)) continue;
      if ((v.rams.get(m.id) || 0) > game.tick) continue;
      v.rams.set(m.id, game.tick + 30);
      game.damageMonster(m, Math.round(d.ram * speed / 6 * p.dmgMult('melee')), 9, sign(p.vx) || 1, false, null);
    }
  }
  // drill contact damage
  if (d.mode === 'drill') for (const m of game.monsters) if (!m.dead && rectsOverlap(p, m) && (v.rams.get(m.id) || 0) <= game.tick) { v.rams.set(m.id, game.tick + 12); game.damageMonster(m, Math.round(25 * p.dmgMult('melee')), 3, sign(m.cx - p.cx) || 1, false, null); }
  // plasma
  if (liquid === LIQ.plasma && !p.s.plasmaImmune) { game.hurtPlayer(60, p.cx, 0, 'plasma'); }
  // vehicle guns
  if (d.gun && useHeld && !(game.ui && game.ui.blocking())) {
    if (v.cd === 0) {
      v.cd = d.gun.cd;
      const a = Math.atan2(aim.y - p.cy, aim.x - p.cx);
      p.dir = aim.x >= p.cx ? 1 : -1;
      game.spawnProjectile(d.gun.proj, p.cx + Math.cos(a) * 20, p.cy - 6 + Math.sin(a) * 20, Math.cos(a) * d.gun.speed, Math.sin(a) * d.gun.speed, Math.round(d.gun.dmg * p.dmgMult('ranged')), 5, 'player', { dmgType: 'ranged', crit: 6 });
      game.audio.play('rocket');
    }
    return true;
  }
  return !!d.gun;
}

function drillArea(game, p, x, y, power) {
  const w = game.world;
  const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + p.w - 1) / TILE);
  const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + p.h - 1) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const id = w.get(tx, ty);
    if (!id) continue;
    const t = TILES[id];
    if (!t.solid || t.tool === 'none' || t.minPick > power || t.interact || t.container) continue;
    if (t.biome === 'dungeon' && !w.flags.bosses.archon) continue;
    if (t.biome === 'temple' && !w.flags.bosses.gravity_golem) continue;
    const k = ty * w.w + tx;
    const e = game.tileDmg.get(k) || { dmg: 0, t: 0 };
    e.dmg += power * 0.22; e.t = game.tick;
    if (e.dmg >= 100 * t.hp) { game.tileDmg.delete(k); game.breakTile(tx, ty, true); p.stats.mined++; }
    else game.tileDmg.set(k, e);
    if (game.tick % 6 === 0) { game.fx.debris(tx * TILE + 8, ty * TILE + 8, t.map, 1); game.audio.play('dig'); }
  }
}
