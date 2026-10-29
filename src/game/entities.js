// Runtime entities: monsters, projectiles and item drops.
import { TILE, rng, clamp, sign, rectsOverlap } from '../core/util.js';
import { MONSTERS } from '../content/monsters.js';
import { PROJ } from '../content/projectiles.js';
import { ITEMS } from '../content/items.js';
import { moveEntity } from './physics.js';
import { addItem, canFit } from './inventory.js';
import { updateBobber } from './fishing.js';

let NEXT_ID = 1;

export class Monster {
  constructor(key, x, y, game) {
    const d = MONSTERS[key];
    this.id = NEXT_ID++;
    this.def = d; this.key = key;
    this.w = d.w; this.h = d.h;
    this.x = x - d.w / 2; this.y = y - d.h;
    this.vx = 0; this.vy = 0; this.dir = rng.chance(0.5) ? 1 : -1;
    const expert = game.world.difficulty === 'expert';
    const mult = expert ? 2 : 1;
    const plr = game.playerCount || 1;
    this.maxHp = Math.round(d.hp * mult * (d.boss ? (expert ? 0.75 : 1) * plr : 1));
    this.hp = this.maxHp;
    this.dmg = Math.round(d.dmg * mult);
    this.defense = d.def;
    this.kbRes = d.kbRes;
    this.ai = {}; this.timer = rng.int(0, 60); this.anim = 0; this.hitFlash = 0;
    this.onGround = false; this.buffs = new Map(); this.dead = false; this.rot = 0; this.phase = 1;
    this.segIndex = 0; this.isTail = false; this.head = null;
    this.contactCd = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
}

export class Projectile {
  constructor(key, x, y, vx, vy, dmg, kb, owner, extra = {}) {
    const d = PROJ[key];
    if (!d) throw new Error('unknown projectile ' + key);
    this.id = NEXT_ID++;
    this.def = d;
    this.w = d.w; this.h = d.h;
    this.x = x - d.w / 2; this.y = y - d.h / 2;
    this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.kb = kb; this.owner = owner;
    this.life = d.life; this.pierce = d.pierce;
    this.hit = new Map();
    this.crit = extra.crit || 0; this.dmgType = extra.dmgType || 'ranged';
    this.onHit = extra.onHit || d.onHit;
    this.color = extra.color || null;
    this.dead = false; this.t = 0; this.returning = false; this.aim = 0; this.cd = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
}

export class Drop {
  constructor(x, y, k, n, p = null) {
    this.id = NEXT_ID++;
    this.k = k; this.n = n; this.p = p;
    this.w = 12; this.h = 12;
    this.x = x - 6; this.y = y - 6;
    this.vx = rng.float(-1.5, 1.5); this.vy = rng.float(-3, -1);
    this.delay = 20; this.life = 60 * 60 * 5; this.dead = false;
  }
}

// ---------------- updates ----------------
export function updateDrop(d, game) {
  const p = game.player;
  d.life--; if (d.life <= 0) { d.dead = true; return; }
  if (d.delay > 0) d.delay--;
  const range = (p.s.magnet ? 14 : 5) * TILE;
  const dx = p.cx - (d.x + 6), dy = p.cy - (d.y + 6), dist = Math.hypot(dx, dy);
  const fits = d.k === 'credits' || canFit(p.inv, d.k, d.n);
  if (!p.dead && d.delay === 0 && dist < range && fits) {
    const sp = d.k === 'credits' || ITEMS[d.k]?.type === 'consumable' && ITEMS[d.k].consume?.heal ? 7 : 5;
    d.vx = dx / dist * sp; d.vy = dy / dist * sp;
    d.x += d.vx; d.y += d.vy;
  } else {
    d.vy = Math.min(d.vy + 0.25, 6);
    d.vx *= 0.94;
    moveEntity(game.world, d, { platforms: true });
  }
  if (!p.dead && d.delay === 0 && dist < 20 && fits) {
    if (d.k === 'memory_shard') { for (let i = 0; i < d.n; i++) game.recoverMemory(); d.dead = true; return; }
    if (d.k === 'credits') { p.credits += d.n; game.fx.text(p.cx, p.y - 4, '+' + d.n + ' cr', '#ffe27a'); game.audio.play('coin'); }
    else {
      const left = addItem(p.inv, d.k, d.n, d.p);
      const got = d.n - left;
      if (got > 0) {
        p.discovered.add(d.k);
        game.fx.text(p.cx, p.y - 4, ITEMS[d.k].name + (got > 1 ? ' (' + got + ')' : ''), game.rarityColor(d.k));
        game.audio.play('pickup');
        game.onPickup(d.k);
      }
      if (left > 0) { d.n = left; return; }
    }
    d.dead = true;
  }
}

function nearestMonster(game, x, y, range, needLOS = false) {
  let best = null, bd = range;
  for (const m of game.monsters) {
    if (m.dead || m.def.friendly) continue;
    const d = Math.hypot(m.cx - x, m.cy - y);
    if (d < bd && (!needLOS || game.los(x, y, m.cx, m.cy))) { bd = d; best = m; }
  }
  return best;
}

export function updateProjectile(p, game) {
  const d = p.def, world = game.world, pl = game.player;
  p.t++;
  if (d.ai !== 'minion' && d.ai !== 'bobber') p.life--;
  if (p.life <= 0) { killProjectile(p, game); return; }
  switch (d.ai) {
    case 'homing': {
      const tgt = p.owner === 'player' ? nearestMonster(game, p.cx, p.cy, 420) : (pl.dead ? null : pl);
      if (tgt) {
        const sp = Math.hypot(p.vx, p.vy) || 6;
        const tx = tgt.cx - p.cx, ty = tgt.cy - p.cy, td = Math.hypot(tx, ty) || 1;
        p.vx += (tx / td * sp - p.vx) * d.homing; p.vy += (ty / td * sp - p.vy) * d.homing;
        const ns = Math.hypot(p.vx, p.vy) || 1; p.vx = p.vx / ns * sp; p.vy = p.vy / ns * sp;
      }
      break;
    }
    case 'boomerang': case 'flail': {
      if (p.t > (d.returnAfter || 25)) p.returning = true;
      if (p.returning) {
        const tx = pl.cx - p.cx, ty = pl.cy - p.cy, td = Math.hypot(tx, ty) || 1;
        const sp = d.ai === 'flail' ? 14 : 12;
        p.vx += (tx / td * sp - p.vx) * 0.25; p.vy += (ty / td * sp - p.vy) * 0.25;
        if (td < 24) { p.dead = true; return; }
      } else if (d.ai === 'flail') p.vy += 0.3;
      break;
    }
    case 'minion': return updateMinion(p, game);
    case 'bobber': return updateBobber(p, game);
    case 'blackhole': {
      if (p.t < 60) break; // flies as a grenade first
      p.vx *= 0.8; p.vy *= 0.8;
      if (p.t === 60) { game.audio.play('roar'); game.camShake = 6; }
      for (const m of game.monsters) {
        if (m.dead || m.allied) continue;
        const dx = p.cx - m.cx, dy = p.cy - m.cy, dd = Math.hypot(dx, dy);
        if (dd > 220) continue;
        if (!m.def.boss) { m.x += dx / (dd || 1) * 3.2; m.y += dy / (dd || 1) * 3.2; }
        if (dd < 40 && p.t % 10 === 0) game.damageMonster(m, p.dmg, 0, 1, false, p);
      }
      for (const d of game.drops) { const dx = p.cx - d.x, dy = p.cy - d.y, dd = Math.hypot(dx, dy); if (dd < 220) { d.x += dx / (dd || 1) * 2; d.y += dy / (dd || 1) * 2; } }
      if (p.t % 2 === 0) { const a = Math.random() * Math.PI * 2; game.fx.spark(p.cx + Math.cos(a) * 60, p.cy + Math.sin(a) * 60, '#d0a0ff', -Math.cos(a) * 3, -Math.sin(a) * 3, 20, 2); }
      return;
    }
    case 'barrier': {
      for (const q of game.projectiles) if (q.owner === 'enemy' && !q.dead && rectsOverlap(p, q)) { q.dead = true; game.fx.burst(q.cx, q.cy, '#2ef2ff', 5, 1.5); }
      for (const m of game.monsters) {
        if (m.dead || m.allied || m.def.boss || !rectsOverlap(p, m)) continue;
        m.vx = (m.cx < p.cx ? -1 : 1) * 4; m.x += m.vx;
        if (p.t % 20 === 0) game.damageMonster(m, p.dmg, 3, Math.sign(m.vx), false, p);
      }
      return;
    }
    case 'sentry': {
      p.vy = Math.min(p.vy + 0.3, 8); p.vx = 0;
      moveEntity(world, p, { platforms: true });
      p.cd--;
      const tgt = nearestMonster(game, p.cx, p.cy, d.sentry.range, true);
      if (tgt) {
        p.aim = Math.atan2(tgt.cy - p.cy, tgt.cx - p.cx);
        if (p.cd <= 0) { p.cd = d.sentry.rate; game.spawnProjectile(d.sentry.shoot, p.cx, p.cy - 4, Math.cos(p.aim) * 11, Math.sin(p.aim) * 11, p.dmg, 1, 'player', { dmgType: 'summon' }); }
      }
      return;
    }
  }
  if (d.gravity) p.vy = Math.min(p.vy + d.gravity, 12);
  // move with tile collision
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy)) / 6));
  for (let s = 0; s < steps; s++) {
    p.x += p.vx / steps;
    if (d.tileCollide && game.projSolid(p)) {
      if (d.bounce) { p.x -= p.vx / steps; p.vx = -p.vx * d.bounce; }
      else if (d.ai === 'boomerang' || d.ai === 'flail') { p.x -= p.vx / steps; p.returning = true; }
      else { p.x -= p.vx / steps * 0.5; killProjectile(p, game); return; }
    }
    p.y += p.vy / steps;
    if (d.tileCollide && game.projSolid(p)) {
      if (d.bounce) { p.y -= p.vy / steps; p.vy = -p.vy * d.bounce; p.vx *= 0.8; }
      else if (d.ai === 'boomerang' || d.ai === 'flail') { p.y -= p.vy / steps; p.returning = true; }
      else { p.y -= p.vy / steps * 0.5; killProjectile(p, game); return; }
    }
  }
  if (d.convert) game.convertArea(Math.floor(p.cx / TILE), Math.floor(p.cy / TILE), 1, d.convert);
  if (d.trail && p.t % 2 === 0) game.fx.spark(p.cx, p.cy, d.trail, -p.vx * 0.1, -p.vy * 0.1, 14, 2);
  // hits
  if (p.dmg <= 0) return;
  if (p.owner === 'player') {
    for (const m of game.monsters) {
      if (m.dead || m.def.friendly) continue;
      if ((p.hit.get(m.id) || 0) > p.t) continue;
      if (!rectsOverlap(p, m)) continue;
      if (d.timedOnly) { killProjectile(p, game); return; }
      p.hit.set(m.id, p.t + (d.ai === 'minion' || d.pierce > 5 ? 12 : 1e9));
      game.damageMonster(m, p.dmg, p.kb, sign(p.vx) || 1, rng.next() * 100 < p.crit, p);
      if (p.onHit && p.onHit.buff) m.buffs.set(p.onHit.buff, p.onHit.time);
      if (d.explode) { killProjectile(p, game); return; }
      p.pierce--;
      if (p.pierce <= 0) { killProjectile(p, game); return; }
    }
  } else if (!pl.dead && rectsOverlap(p, pl)) {
    game.hurtPlayer(p.dmg, p.cx, 3, 'projectile');
    if (p.onHit && p.onHit.buff) pl.addBuff(p.onHit.buff, p.onHit.time);
    killProjectile(p, game);
  }
}

function updateMinion(p, game) {
  const pl = game.player, d = p.def.minion;
  p.cd--;
  const tgt = nearestMonster(game, pl.cx, pl.cy, 640);
  let tx, ty;
  if (tgt) {
    if (d.contact) { tx = tgt.cx; ty = tgt.cy; }
    else { tx = tgt.cx + Math.cos(p.t * 0.03 + p.id) * 90; ty = tgt.cy - 70 + Math.sin(p.t * 0.05) * 20; }
    if (!d.contact && p.cd <= 0 && game.los(p.cx, p.cy, tgt.cx, tgt.cy)) {
      p.cd = d.rate;
      const a = Math.atan2(tgt.cy - p.cy, tgt.cx - p.cx);
      game.spawnProjectile(d.shoot, p.cx, p.cy, Math.cos(a) * 10, Math.sin(a) * 10, p.dmg, 1, 'player', { dmgType: 'summon' });
    }
  } else {
    const idx = game.projectiles.filter((q) => q.def.ai === 'minion').indexOf(p);
    tx = pl.cx - pl.dir * (30 + idx * 18); ty = pl.y - 20 + Math.sin(p.t * 0.06 + idx) * 6;
  }
  const dx = tx - p.cx, dy = ty - p.cy, dist = Math.hypot(dx, dy);
  if (dist > 1600) { p.x = pl.cx; p.y = pl.y; }
  const sp = Math.min(d.speed + dist / 60, d.speed * 2.5);
  p.vx += ((dx / (dist || 1)) * sp - p.vx) * 0.08;
  p.vy += ((dy / (dist || 1)) * sp - p.vy) * 0.08;
  p.x += p.vx; p.y += p.vy;
  if (d.contact) {
    for (const m of game.monsters) {
      if (m.dead || (p.hit.get(m.id) || 0) > p.t || !rectsOverlap(p, m)) continue;
      p.hit.set(m.id, p.t + 15);
      game.damageMonster(m, p.dmg, p.kb, sign(p.vx) || 1, false, p);
    }
  }
}

export function killProjectile(p, game) {
  if (p.dead) return;
  p.dead = true;
  const d = p.def;
  if (d.explode) game.explode(p.cx, p.cy, d.explode, p.dmg, p.owner, p);
  else if (d.sprite !== 'dust') game.fx.burst(p.cx, p.cy, p.color || d.color, 4, 1.5);
}
