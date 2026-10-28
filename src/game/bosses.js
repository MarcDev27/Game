// Boss behaviors. Each takes (m, game, target). Multi-part bosses spawn their parts in summonBoss().
import { TILE, rng, sign, clamp } from '../core/util.js';
import { moveEntity } from './physics.js';
import { wormHead } from './ai.js';

function shoot(game, m, proj, tx, ty, speed, dmg, spread = 0) {
  const a = Math.atan2(ty - m.cy, tx - m.cx) + rng.float(-spread, spread);
  const mult = game.world.difficulty === 'expert' ? 1.5 : 1;
  return game.spawnProjectile(proj, m.cx, m.cy, Math.cos(a) * speed, Math.sin(a) * speed, Math.round(dmg * mult), 3, 'enemy');
}

function steer(m, tx, ty, accel, max) {
  const dx = tx - m.cx, dy = ty - m.cy, d = Math.hypot(dx, dy) || 1;
  m.vx += (dx / d) * accel; m.vy += (dy / d) * accel;
  const v = Math.hypot(m.vx, m.vy);
  if (v > max) { m.vx *= max / v; m.vy *= max / v; }
}

function leave(m, game) {
  m.vy -= 0.4; m.y += m.vy; m.x += m.vx;
  if (m.y < game.player.y - 1600 || m.ai.leaving++ > 300) game.despawnBoss(m);
}

function nightOnly(m, game, tgt) {
  if (!tgt || game.world.isDay()) { m.ai.leaving = m.ai.leaving || 1; leave(m, game); return true; }
  return false;
}

export const BOSS_AI = {
  boss_overseer(m, game, tgt) {
    if (nightOnly(m, game, tgt)) return;
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    if (m.phase === 1 && m.hp < m.maxHp * 0.5) { m.phase = 2; a.mode = 'spin'; a.t = 0; m.defense = 0; m.dmg = Math.round(m.dmg * 1.5); game.audio.play('roar'); }
    if (!a.mode) a.mode = 'hover';
    if (a.mode === 'spin') {
      m.vx *= 0.9; m.vy *= 0.9; m.rot += 0.4; m.x += m.vx; m.y += m.vy;
      if (a.t > 90) { a.mode = 'hover'; a.t = 0; }
      return;
    }
    if (a.mode === 'hover') {
      steer(m, tgt.cx, tgt.cy - 220, 0.25, m.phase === 2 ? 7 : 5);
      m.x += m.vx; m.y += m.vy;
      m.rot = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
      if (a.t % 70 === 0 && m.phase === 1 && game.monsters.filter((x) => x.key === 'sight_drone').length < 6) game.spawnMonster('sight_drone', m.cx, m.cy + 30);
      if (a.t > (m.phase === 2 ? 120 : 220)) { a.mode = 'dash'; a.dashes = m.phase === 2 ? 5 : 3; a.t = 0; }
    } else if (a.mode === 'dash') {
      if (a.t === 1) {
        const ang = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
        const sp = m.phase === 2 ? 12 : 9;
        m.vx = Math.cos(ang) * sp; m.vy = Math.sin(ang) * sp; m.rot = ang;
        game.audio.play('roar');
      }
      m.x += m.vx; m.y += m.vy;
      if (a.t > 45) { m.vx *= 0.9; m.vy *= 0.9; }
      if (a.t > 60) { a.t = 0; a.dashes--; if (a.dashes <= 0) a.mode = 'hover'; }
    }
  },

  boss_sovereign(m, game, tgt) {
    const a = m.ai;
    if (!tgt) { a.leaving = 1; leave(m, game); return; }
    a.t = (a.t || 0) + 1;
    const scale = 0.55 + 0.45 * (m.hp / m.maxHp);
    const nw = Math.round(m.def.w * scale), nh = Math.round(m.def.h * scale);
    if (nw !== m.w) { m.x += (m.w - nw) / 2; m.y += m.h - nh; m.w = nw; m.h = nh; }
    const dist = Math.hypot(tgt.cx - m.cx, tgt.cy - m.cy);
    if (a.tele > 0) {
      a.tele--;
      if (a.tele === 30) { m.x = tgt.cx - m.w / 2; m.y = tgt.y - 300; m.vy = 0; game.fx.burst(m.cx, m.cy, '#4ad9ff', 30, 4); }
      if (a.tele > 30) return;
    }
    if ((dist > 700 || a.stuck > 400) && !a.tele) { a.tele = 60; a.stuck = 0; game.fx.burst(m.cx, m.cy, '#4ad9ff', 30, 4); return; }
    if (m.onGround) {
      m.vx *= 0.8;
      a.stuck = (a.stuck || 0) + 1;
      if (a.t > 40) {
        a.t = 0; a.jumps = (a.jumps || 0) + 1;
        const big = a.jumps % 3 === 0;
        m.vy = big ? -12 : -8; m.vx = sign(tgt.cx - m.cx) * (big ? 4 : 5);
      }
    } else a.stuck = 0;
    m.vy = Math.min(m.vy + 0.35, 12);
    moveEntity(game.world, m, { platforms: true });
  },

  boss_worm(m, game, tgt) {
    if (m.segIndex > 0) {
      if (m.def.laser && tgt && rng.chance(0.002)) shoot(game, m, 'e_laser', tgt.cx, tgt.cy, 7, 30);
      return;
    }
    if (!tgt) { m.vy += 0.5; m.y += m.vy; if (++m.ai.gone > 200) game.despawnBoss(m); m.ai.gone = m.ai.gone || 0; return; }
    if (m.key === 'leviathan' && game.world.isDay()) { m.vy -= 0.3; m.y += m.vy; if (m.y < tgt.y - 2000) game.despawnBoss(m); return; }
    const enraged = m.hp < m.maxHp * 0.3;
    wormHead(m, game, tgt, 1, m.def.speed * (enraged ? 1.3 : 1), false, 0.1);
  },

  boss_swarm(m, game, tgt) {
    if (!tgt) { m.ai.leaving = 1; leave(m, game); return; }
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    a.mode = a.mode || 'dash';
    const rage = m.hp < m.maxHp * 0.5 ? 1.3 : 1;
    if (a.mode === 'dash') {
      if (a.t === 1) { a.side = tgt.cx > m.cx ? 1 : -1; }
      if (a.t < 30) steer(m, tgt.cx - a.side * 300, tgt.cy, 0.6, 9);
      else if (a.t === 30) { m.vx = a.side * 13 * rage; m.vy = (tgt.cy - m.cy) * 0.02; m.dir = a.side; game.audio.play('roar'); }
      else if (a.t > 75) { a.t = 0; a.n = (a.n || 0) + 1; if (a.n >= 3) { a.n = 0; a.mode = rng.chance(0.5) ? 'shoot' : 'spawn'; } }
      m.x += m.vx; m.y += m.vy;
    } else if (a.mode === 'shoot') {
      steer(m, tgt.cx, tgt.cy - 200, 0.3, 6); m.x += m.vx; m.y += m.vy;
      m.dir = sign(tgt.cx - m.cx) || 1;
      if (a.t % 12 === 0) shoot(game, m, 'e_stinger', tgt.cx, tgt.cy, 8, 22, 0.15);
      if (a.t > 160) { a.t = 0; a.mode = 'dash'; }
    } else {
      steer(m, tgt.cx, tgt.cy - 150, 0.3, 5); m.x += m.vx; m.y += m.vy;
      if (a.t % 30 === 0 && game.monsters.filter((x) => x.key === 'hornet_drone').length < 8) game.spawnMonster('hornet_drone', m.cx, m.cy);
      if (a.t > 150) { a.t = 0; a.mode = 'dash'; }
    }
  },

  boss_archon(m, game, tgt) {
    if (nightOnly(m, game, tgt)) return;
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    const handsAlive = game.monsters.some((h) => h.owner === m && !h.dead);
    const prime = m.def.prime;
    if (!a.mode) a.mode = 'follow';
    if (a.mode === 'follow') {
      steer(m, tgt.cx, tgt.cy - 180, 0.2, handsAlive ? 4 : 6);
      m.rot *= 0.9;
      if (a.t % (handsAlive ? 140 : 70) === 0) shoot(game, m, 'e_skull', tgt.cx, tgt.cy, 5, 26);
      if (prime && a.t % 50 === 0) shoot(game, m, 'e_laser', tgt.cx, tgt.cy, 9, 40);
      if (a.t > 480) { a.mode = 'spin'; a.t = 0; game.audio.play('roar'); }
    } else {
      m.rot += 0.35;
      steer(m, tgt.cx, tgt.cy, 0.35, handsAlive ? 5 : 8);
      if (a.t > 240) { a.mode = 'follow'; a.t = 0; }
    }
    m.x += m.vx; m.y += m.vy;
    m.defense = a.mode === 'spin' ? m.def.def * 2 : m.def.def;
  },

  boss_hand(m, game, tgt) {
    const o = m.owner;
    if (!o || o.dead) { game.killMonster(m, true); return; }
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    const side = m.side;
    const isFist = m.key === 'golem_fist_e', isArch = m.def.architect;
    const restX = o.cx + side * (isArch ? 190 : isFist ? 80 : 110), restY = o.cy + (isArch ? 40 : isFist ? 20 : 60);
    const period = isFist ? 150 : isArch ? 200 : 180;
    const phase = (a.t + (side > 0 ? period / 2 : 0)) % period;
    if (!tgt) { steer(m, restX, restY, 0.5, 8); m.x += m.vx; m.y += m.vy; return; }
    if (isArch) {
      steer(m, restX + Math.sin(a.t * 0.02) * 30, restY + Math.cos(a.t * 0.03) * 40, 0.5, 8);
      if (phase === 0 || phase === 40 || phase === 80) shoot(game, m, rng.chance(0.5) ? 'e_beam' : 'e_void', tgt.cx, tgt.cy, 8, 60, 0.05);
    } else if (phase < 30) {
      steer(m, restX, restY - 40, 0.6, 9);
      m.rot = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
    } else if (phase === 30) {
      const ang = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
      const sp = isFist ? 14 : 11;
      m.vx = Math.cos(ang) * sp; m.vy = Math.sin(ang) * sp;
      if (m.def.prime) shoot(game, m, side > 0 ? 'e_laser' : 'e_fireball', tgt.cx, tgt.cy, 8, 40);
    } else if (phase > 70) steer(m, restX, restY, 0.5, 8);
    m.x += m.vx; m.y += m.vy;
    if (phase < 30 || phase > 70) { m.vx *= 0.92; m.vy *= 0.92; }
  },

  boss_warden(m, game, tgt) {
    const a = m.ai;
    if (!tgt) { m.x += m.dir * 4; if (++a.gone > 300) game.despawnBoss(m); a.gone = a.gone || 0; return; }
    a.t = (a.t || 0) + 1;
    const frac = m.hp / m.maxHp;
    const sp = m.def.speed + (1 - frac) * 2.2;
    m.x += m.dir * sp;
    m.y += ((tgt.cy - m.h / 2) - m.y) * 0.04;
    m.y = clamp(m.y, game.world.layers.core * TILE - 40, (game.world.h - 4) * TILE - m.h);
    // player behind the wall gets dragged
    const behind = m.dir > 0 ? tgt.cx < m.x : tgt.cx > m.x + m.w;
    if (behind && game.tick % 20 === 0) { game.hurtPlayer(50, m.cx, 8, 'Core Warden'); tgt.vx = m.dir * 10; }
    if (Math.abs(tgt.cx - m.cx) > 1600) m.x = tgt.cx - m.dir * 900;
    const eyeX = m.dir > 0 ? m.x + m.w - 24 : m.x + 24;
    const rate = Math.max(25, Math.round(80 * frac));
    if (a.t % rate === 0) for (const ey of [0.2, 0.8]) game.spawnProjectile('e_laser', eyeX, m.y + m.h * ey, m.dir * 9, (tgt.cy - (m.y + m.h * ey)) * 0.015, 30, 2, 'enemy');
    if (a.t % 150 === 0 && game.monsters.filter((x) => x.key === 'core_bat').length < 6) game.spawnMonster('core_bat', m.cx + m.dir * 40, m.cy);
  },

  boss_twin(m, game, tgt) {
    if (nightOnly(m, game, tgt)) return;
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    if (m.phase === 1 && m.hp < m.maxHp * 0.4) { m.phase = 2; game.audio.play('roar'); m.defense += 10; }
    const ret = m.key === 'twin_lancer_r';
    if (ret) {
      steer(m, tgt.cx + (m.cx < tgt.cx ? -320 : 320), tgt.cy - 120, 0.3, 8);
      m.x += m.vx; m.y += m.vy;
      m.rot = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
      if (a.t % (m.phase === 2 ? 14 : 45) === 0) shoot(game, m, 'e_laser', tgt.cx, tgt.cy, 10, 40);
    } else {
      a.mode = a.mode || 'hover';
      if (a.mode === 'hover') {
        steer(m, tgt.cx, tgt.cy - 260, 0.35, 8); m.x += m.vx; m.y += m.vy;
        m.rot = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
        if (m.phase === 2 && a.t % 6 === 0) shoot(game, m, 'e_fireball', tgt.cx, tgt.cy, 7, 35, 0.2);
        if (a.t > 140) { a.mode = 'dash'; a.t = 0; a.n = 0; }
      } else {
        if (a.t % 45 === 1) { const ang = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx); m.vx = Math.cos(ang) * 14; m.vy = Math.sin(ang) * 14; m.rot = ang; a.n++; }
        m.x += m.vx; m.y += m.vy; m.vx *= 0.97; m.vy *= 0.97;
        if (a.n > 4 && a.t % 45 === 0) { a.mode = 'hover'; a.t = 0; }
      }
    }
  },

  boss_bloom(m, game, tgt) {
    if (!tgt) { m.ai.leaving = 1; leave(m, game); return; }
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    if (m.phase === 1 && m.hp < m.maxHp * 0.5) { m.phase = 2; game.audio.play('roar'); m.dmg = Math.round(m.dmg * 1.4); }
    const sp = m.phase === 2 ? 4.5 : 2.6;
    steer(m, tgt.cx, tgt.cy, 0.12, sp);
    m.x += m.vx; m.y += m.vy;
    m.rot = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
    if (a.t % (m.phase === 2 ? 25 : 45) === 0) shoot(game, m, 'e_seed', tgt.cx, tgt.cy, 7, 44, 0.1);
    if (m.phase === 2 && a.t % 90 === 0) for (let k = 0; k < 8; k++) { const ang = k / 8 * Math.PI * 2; game.spawnProjectile('e_spike', m.cx, m.cy, Math.cos(ang) * 5, Math.sin(ang) * 5, 50, 3, 'enemy'); }
    if (m.phase === 2 && a.t % 200 === 0 && game.monsters.filter((x) => x.key === 'bloom_thorn').length < 4) game.spawnMonster('bloom_thorn', m.cx, m.cy);
    // stay in the Overgrowth: enrage if the player leaves
    if (game.biome !== 'jungle' && a.t > 120) { m.dmg = m.def.dmg * 3; }
  },

  boss_golem(m, game, tgt) {
    if (!tgt) { m.ai.leaving = 1; game.despawnBoss(m); return; }
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    const fists = game.monsters.some((h) => h.owner === m && !h.dead);
    if (m.phase === 1 && !fists) { m.phase = 2; game.audio.play('roar'); }
    if (m.onGround) {
      m.vx *= 0.8;
      if (a.t % (m.phase === 2 ? 50 : 80) === 0) { m.vy = -10; m.vx = sign(tgt.cx - m.cx) * 4; }
    }
    m.vy = Math.min(m.vy + 0.4, 12);
    moveEntity(game.world, m, { platforms: false });
    if (a.t % (m.phase === 2 ? 30 : 70) === 0) {
      const hx = m.cx, hy = m.y + 15;
      const ang = Math.atan2(tgt.cy - hy, tgt.cx - hx);
      game.spawnProjectile(m.phase === 2 ? 'e_beam' : 'e_fireball', hx, hy, Math.cos(ang) * 8, Math.sin(ang) * 8, 55, 3, 'enemy');
    }
  },

  boss_architect(m, game, tgt) {
    if (!tgt) { m.ai.leaving = 1; leave(m, game); return; }
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    const f = m.hp / m.maxHp;
    const np = f < 0.33 ? 3 : f < 0.66 ? 2 : 1;
    if (np !== m.phase) { m.phase = np; game.audio.play('roar'); game.notify('The Architect is reconfiguring!', '#d0a0ff'); }
    steer(m, tgt.cx, tgt.cy - 260, 0.08, 3 + m.phase);
    m.x += m.vx; m.y += m.vy;
    if (a.t % (110 - m.phase * 20) === 0) for (let k = 0; k < 4 + m.phase * 2; k++) {
      const ang = k / (4 + m.phase * 2) * Math.PI * 2 + a.t * 0.01;
      game.spawnProjectile('e_void', m.cx, m.cy, Math.cos(ang) * 4, Math.sin(ang) * 4, 70, 3, 'enemy');
    }
    if (m.phase >= 2 && a.t % 160 === 80) for (let k = -2; k <= 2; k++) shoot(game, m, 'e_beam', tgt.cx + k * 60, tgt.cy, 10, 80);
    if (m.phase === 3 && a.t % 300 === 0) for (const k of ['flux_sentinel', 'drift_sentinel']) game.spawnMonster(k, tgt.cx + rng.int(-300, 300), tgt.cy - 100);
  },
};

// Spawns a boss (and its parts) near the target.
export function summonBoss(game, key) {
  const p = game.player;
  const spawn = (k, x, y) => game.spawnMonster(k, x, y, true);
  let main = null;
  switch (key) {
    case 'overseer': main = spawn('overseer', p.cx + rng.int(-200, 200), p.cy - 500); break;
    case 'gel_sovereign': main = spawn('gel_sovereign', p.cx + 300, p.cy - 400); break;
    case 'data_wyrm': main = spawnWorm(game, 'data_wyrm', p.cx + 600, p.cy + 500); break;
    case 'leviathan': main = spawnWorm(game, 'leviathan', p.cx - 700, p.cy + 600); break;
    case 'swarm_mother': main = spawn('swarm_mother', p.cx + 400, p.cy - 200); break;
    case 'archon':
    case 'prime_archon': {
      main = spawn(key, p.cx, p.cy - 400);
      const hk = key === 'archon' ? 'archon_hand' : 'prime_hand';
      for (const side of [-1, 1]) { const h = spawn(hk, main.cx + side * 100, main.cy); h.owner = main; h.side = side; }
      if (key === 'prime_archon') for (const side of [-1, 1]) { const h = spawn(hk, main.cx + side * 160, main.cy + 40); h.owner = main; h.side = side * 1.6; }
      break;
    }
    case 'core_warden': {
      const dir = p.cx > game.world.w * TILE / 2 ? -1 : 1;
      main = spawn('core_warden', p.cx - dir * 700, p.cy + 180);
      main.dir = dir;
      break;
    }
    case 'twin_lancers': {
      main = spawn('twin_lancer_r', p.cx - 400, p.cy - 400);
      const s2 = spawn('twin_lancer_s', p.cx + 400, p.cy - 400);
      main.partner = s2; s2.partner = main;
      break;
    }
    case 'bloom_titan': main = spawn('bloom_titan', p.cx, p.cy + 300); break;
    case 'gravity_golem': {
      main = spawn('gravity_golem', p.cx + 200, p.cy);
      for (const side of [-1, 1]) { const h = spawn('golem_fist_e', main.cx + side * 80, main.cy); h.owner = main; h.side = side; }
      break;
    }
    case 'architect': {
      main = spawn('architect', p.cx, p.cy - 500);
      for (const side of [-1, 1]) { const h = spawn('architect_hand', main.cx + side * 190, main.cy); h.owner = main; h.side = side; }
      break;
    }
  }
  if (main) {
    game.notify((main.def.name) + ' has awoken!', '#ff5a8a');
    game.audio.play('roar');
  }
  return main;
}

export function spawnWorm(game, key, x, y) {
  const head = game.spawnMonster(key, x, y, true);
  const n = head.def.segments || 10;
  head.segments = [];
  for (let i = 1; i <= n; i++) {
    const s = game.spawnMonster(key, x, y + i * head.h * 0.85, true);
    s.segIndex = i; s.head = head; s.isTail = i === n;
    head.segments.push(s);
  }
  return head;
}
