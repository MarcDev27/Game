// Monster behaviors for regular enemies. Bosses live in bosses.js.
import { TILE, rng, sign, clamp } from '../core/util.js';
import { moveEntity, liquidAt, rectSolid } from './physics.js';
import { BOSS_AI } from './bosses.js';
import { alliedTarget, alliedContact } from './implants.js';
import { ORIGINAL_AI, ORIGINAL_BOSS_AI } from './original.js';

function target(game) { return game.player.dead ? null : game.player; }

function shootAt(game, m, tgt, sh, spread = 0) {
  const sx = m.cx, sy = m.cy;
  const a = Math.atan2(tgt.cy - sy, tgt.cx - sx) + rng.float(-spread, spread);
  const dmg = Math.round(sh.dmg * (game.world.difficulty === 'expert' ? 1.6 : 1));
  game.spawnProjectile(sh.proj, sx, sy, Math.cos(a) * sh.speed, Math.sin(a) * sh.speed, dmg, 3, 'enemy');
}

export function updateMonster(m, game) {
  const d = m.def, world = game.world;
  if (m.hitFlash > 0) m.hitFlash--;
  if (m.contactCd > 0) m.contactCd--;
  m.anim++;
  // debuffs
  for (const [k, t] of m.buffs) {
    if (t <= 1) m.buffs.delete(k); else m.buffs.set(k, t - 1);
    if (game.tick % 30 === 0 && (k === 'burn' || k === 'poison' || k === 'shock' || k === 'chill')) {
      const dot = k === 'burn' ? 8 : k === 'shock' ? 6 : 4;
      m.hp -= dot; game.fx.text(m.cx, m.y, dot, '#ff8a3d');
      if (m.hp <= 0) { game.killMonster(m); return; }
    }
  }
  const slow = m.buffs.has('chill') ? 0.6 : m.buffs.has('slow') ? 0.4 : 1;
  let tgt = target(game);
  if (m.allied) {
    m.allied--;
    tgt = alliedTarget(game, m);
    alliedContact(game, m);
    if (m.allied <= 0) { m.allied = 0; game.fx.burst(m.cx, m.cy, '#ff3355', 10, 2); }
  }
  const boss = BOSS_AI[d.ai] || ORIGINAL_BOSS_AI[d.ai];
  if (boss) { boss(m, game, tgt); return; }
  const fn = AI[d.ai] || ORIGINAL_AI[d.ai] || AI.walker;
  fn(m, game, tgt, slow);
}

const AI = {
  hopper(m, game, tgt, slow) {
    const d = m.def;
    if (m.onGround) {
      m.vx *= 0.7;
      m.timer++;
      if (m.timer > 50 + (m.id % 40)) {
        m.timer = 0;
        if (tgt && Math.abs(tgt.cx - m.cx) < 600) m.dir = sign(tgt.cx - m.cx) || 1;
        const big = rng.chance(0.3);
        m.vy = -(big ? 7.5 : 5) * (d.speed / 2);
        m.vx = m.dir * (big ? 2.2 : 3) * slow;
      }
    }
    m.vy = Math.min(m.vy + 0.3, 9);
    moveEntity(game.world, m, { platforms: true });
    if (m.hitWall) m.dir = -m.hitWall;
  },

  walker(m, game, tgt, slow) {
    const d = m.def;
    const dist = tgt ? Math.abs(tgt.cx - m.cx) : 1e9;
    if (tgt && dist < 900) m.dir = sign(tgt.cx - m.cx) || m.dir;
    else if (rng.chance(0.005)) m.dir = -m.dir;
    const sp = d.speed * slow;
    m.vx += m.dir * 0.12;
    m.vx = clamp(m.vx, -sp, sp);
    if (m.onGround && m.hitWallLast) { m.vy = -6.8; m.stuck = (m.stuck || 0) + 1; if (m.stuck > 4) { m.dir = -m.dir; m.stuck = 0; } }
    if (m.onGround && tgt && tgt.y + tgt.h < m.y - 40 && dist < 80 && rng.chance(0.03)) m.vy = -7;
    m.vy = Math.min(m.vy + 0.35, 10);
    moveEntity(game.world, m, { platforms: true, step: true });
    m.hitWallLast = m.hitWall;
    if (m.onGround && !m.hitWall) m.stuck = 0;
  },

  shooter(m, game, tgt, slow) {
    const sh = m.def.shoot;
    const dist = tgt ? Math.hypot(tgt.cx - m.cx, tgt.cy - m.cy) : 1e9;
    if (tgt && dist < 420 && game.los(m.cx, m.cy, tgt.cx, tgt.cy)) {
      m.vx *= 0.8; m.dir = sign(tgt.cx - m.cx) || 1;
      m.vy = Math.min(m.vy + 0.35, 10);
      moveEntity(game.world, m, { platforms: true });
      m.timer++;
      if (m.timer >= sh.rate) { m.timer = 0; shootAt(game, m, tgt, sh); }
    } else AI.walker(m, game, tgt, slow);
  },

  charger(m, game, tgt, slow) {
    const d = m.def;
    m.ai.charge = (m.ai.charge || 0) - 1;
    if (tgt && m.ai.charge < -60 && Math.abs(tgt.cx - m.cx) < 300 && Math.abs(tgt.cy - m.cy) < 100) { m.ai.charge = 70; m.dir = sign(tgt.cx - m.cx) || 1; }
    if (m.ai.charge > 0) {
      m.vx = m.dir * d.speed * 1.8 * slow;
      if (m.onGround && m.hitWallLast) m.vy = -7;
      m.vy = Math.min(m.vy + 0.35, 10);
      moveEntity(game.world, m, { platforms: true, step: true });
      m.hitWallLast = m.hitWall;
    } else AI.walker(m, game, tgt, slow * 0.6);
  },

  flyer(m, game, tgt, slow) {
    const d = m.def;
    const sp = d.speed * slow * (tgt && m.key === 'hornet_drone' && tgt.buffs && tgt.buffs.has('marked') ? 1.8 : 1);
    let tx = m.cx + m.dir * 100, ty = m.cy;
    if (tgt) { tx = tgt.cx; ty = tgt.cy - 10; }
    // day: surface flyers that only come out at night retreat upward
    if (d.spawn[0] && d.spawn[0].time === 'night' && game.world.isDay()) ty = m.cy - 400;
    const dx = tx - m.cx, dy = ty - m.cy, dist = Math.hypot(dx, dy) || 1;
    m.vx += (dx / dist) * 0.12; m.vy += (dy / dist) * 0.1 + Math.sin(m.anim * 0.05 + m.id) * 0.03;
    const v = Math.hypot(m.vx, m.vy);
    if (v > sp) { m.vx *= sp / v; m.vy *= sp / v; }
    m.dir = sign(m.vx) || m.dir;
    m.rot = Math.atan2(m.vy, m.vx);
    if (m.def.tileCollide) {
      moveEntity(game.world, m, {});
      if (m.hitWall) m.vx = -m.hitWall * Math.abs(m.vx) * 0.8 - m.hitWall * 1;
      if (m.hitCeil) m.vy = Math.abs(m.vy) * 0.8 + 0.5;
      if (m.onGround) m.vy = -Math.abs(m.vy) * 0.8 - 1;
    } else { m.x += m.vx; m.y += m.vy; }
    const sh = d.shoot;
    if (sh && tgt) {
      m.timer++;
      if (m.timer >= sh.rate && dist < 500 && game.los(m.cx, m.cy, tgt.cx, tgt.cy)) { m.timer = 0; shootAt(game, m, tgt, sh, 0.05); }
    }
  },

  floater(m, game, tgt, slow) {
    const d = m.def;
    const sp = d.speed * slow;
    if (tgt) {
      const dx = tgt.cx - m.cx, dy = tgt.cy - m.cy, dist = Math.hypot(dx, dy) || 1;
      m.vx += (dx / dist) * 0.06; m.vy += (dy / dist) * 0.06;
    }
    const v = Math.hypot(m.vx, m.vy);
    if (v > sp) { m.vx *= sp / v; m.vy *= sp / v; }
    m.x += m.vx; m.y += m.vy + Math.sin(m.anim * 0.06) * 0.3;
    m.dir = sign(m.vx) || m.dir;
  },

  caster(m, game, tgt) {
    const sh = m.def.shoot;
    m.vy = Math.min(m.vy + 0.35, 10); m.vx = 0;
    moveEntity(game.world, m, { platforms: true });
    if (!tgt) return;
    m.dir = sign(tgt.cx - m.cx) || 1;
    m.timer++;
    if (m.timer % sh.rate === 0 && game.los(m.cx, m.cy, tgt.cx, tgt.cy)) shootAt(game, m, tgt, sh);
    if (m.timer > sh.rate * 3) {
      m.timer = 0;
      // teleport near the target
      for (let k = 0; k < 30; k++) {
        const tx = Math.floor(tgt.cx / TILE) + rng.int(-18, 18), ty = Math.floor(tgt.cy / TILE) + rng.int(-10, 10);
        if (Math.abs(tx * TILE - tgt.cx) < 80) continue;
        const w = game.world;
        if (w.solidAt(tx, ty + 1) && !w.solidAt(tx, ty) && !w.solidAt(tx, ty - 1) && !w.solidAt(tx, ty - 2)) {
          game.fx.burst(m.cx, m.cy, m.def.c2, 12, 2);
          m.x = tx * TILE + 8 - m.w / 2; m.y = (ty + 1) * TILE - m.h - 0.01;
          game.fx.burst(m.cx, m.cy, m.def.c2, 12, 2);
          break;
        }
      }
    }
  },

  turret(m, game, tgt) {
    m.vy = Math.min(m.vy + 0.35, 10); m.vx = 0;
    moveEntity(game.world, m, { platforms: true });
    if (!tgt) return;
    const sh = m.def.shoot;
    m.timer++;
    const dist = Math.hypot(tgt.cx - m.cx, tgt.cy - m.cy);
    if (m.timer >= sh.rate && dist < 400 && game.los(m.cx, m.cy, tgt.cx, tgt.cy)) { m.timer = 0; shootAt(game, m, tgt, sh, 0.1); }
  },

  swimmer(m, game, tgt, slow) {
    const liq = liquidAt(game.world, m);
    const d = m.def;
    if (liq >= 0) {
      let tx = m.cx + m.dir * 60, ty = m.cy + Math.sin(m.anim * 0.03) * 30;
      if (tgt && liquidAt(game.world, tgt) >= 0) { tx = tgt.cx; ty = tgt.cy; }
      const dx = tx - m.cx, dy = ty - m.cy, dist = Math.hypot(dx, dy) || 1;
      m.vx += (dx / dist) * 0.15; m.vy += (dy / dist) * 0.15;
      const v = Math.hypot(m.vx, m.vy), sp = d.speed * slow;
      if (v > sp) { m.vx *= sp / v; m.vy *= sp / v; }
      // keep under the surface
      const above = Math.floor((m.y - 2) / TILE), tx0 = Math.floor(m.cx / TILE);
      if (game.world.inb(tx0, above) && game.world.liq[above * game.world.w + tx0] < 40 && m.vy < 0) m.vy = 0.5;
    } else {
      m.vy = Math.min(m.vy + 0.35, 10);
      if (m.onGround) { m.vx *= 0.8; if (rng.chance(0.05)) { m.vy = -3; m.vx = rng.float(-2, 2); } }
    }
    moveEntity(game.world, m, {});
    if (m.hitWall) m.dir = -m.hitWall;
    m.dir = sign(m.vx) || m.dir;
  },

  worm(m, game, tgt, slow) {
    if (m.segIndex > 0) return; // segments are driven by the head
    wormHead(m, game, tgt, slow, m.def.speed, m.def.tileCollide === false && m.def.sprite === 'wyvern');
  },
};

export function wormHead(m, game, tgt, slow, speed, flying, turn = 0.12) {
  const world = game.world;
  const tx = Math.floor(m.cx / TILE), ty = Math.floor(m.cy / TILE);
  const inGround = flying || rectSolid(world, m.x - 8, m.y - 8, m.w + 16, m.h + 16) || world.wall[clamp(ty, 0, world.h - 1) * world.w + clamp(tx, 0, world.w - 1)] > 0 && m.def.boss;
  const sp = speed * slow;
  if (tgt) {
    const dx = tgt.cx - m.cx, dy = tgt.cy - m.cy, dist = Math.hypot(dx, dy) || 1;
    if (inGround) {
      m.vx += (dx / dist) * sp * turn; m.vy += (dy / dist) * sp * turn;
      const v = Math.hypot(m.vx, m.vy);
      if (v > sp) { m.vx *= sp / v; m.vy *= sp / v; }
    } else {
      m.vy = Math.min(m.vy + 0.25, sp * 1.3);
      m.vx += sign(dx) * 0.05;
    }
  }
  m.x += m.vx; m.y += m.vy;
  m.rot = Math.atan2(m.vy, m.vx);
  if (!game.world.inb(Math.floor(m.cx / TILE), Math.floor(m.cy / TILE))) { m.vy -= 0.5; }
  // drag segments
  let prev = m;
  for (const s of m.segments || []) {
    if (s.dead) continue;
    const dx = prev.cx - s.cx, dy = prev.cy - s.cy, d = Math.hypot(dx, dy) || 1;
    const segLen = Math.max(s.w, s.h) * 0.85;
    s.x += dx - (dx / d) * segLen; s.y += dy - (dy / d) * segLen;
    s.rot = Math.atan2(dy, dx);
    s.vx = m.vx; s.vy = m.vy;
    prev = s;
  }
  if (inGround && game.tick % 8 === 0 && !flying) game.fx.debris(m.cx, m.cy, '#6e5148', 1);
}
