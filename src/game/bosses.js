// Boss behaviors. Each takes (m, game, target). Multi-part bosses spawn their parts in summonBoss().
import { TILE, rng, sign, clamp } from '../core/util.js';
import { moveEntity } from './physics.js';
import { wormHead } from './ai.js';
import { T } from '../content/tiles.js';
import { LIQ } from '../world/world.js';
import { addHazard } from './hazards.js';
import { summonOriginal, recordHistory, spawnEchoes, sweepBeam } from './original.js';

// ---- signature mechanics that set each boss apart ----

// Overseer: a targeting reticle tracks you, then locks and calls down an orbital strike.
function orbitalStrike(game, tgt, n) {
  for (let k = 0; k < n; k++) addHazard(game, {
    type: 'column', w: 34, warn: 80, life: 18, dmg: 34, color: k ? '#ff8a3d' : '#ff3355', cause: 'Orbital Strike',
    follow: (g, h) => { if (h.t < h.warn - 25) h.x = tgt.cx + (k ? tgt.vx * 28 : 0); },
  });
  game.audio.play('laser');
}

function floorBelow(game, x, y) {
  const tx = Math.floor(x / TILE);
  for (let ty = Math.floor(y / TILE); ty < Math.floor(y / TILE) + 30; ty++) if (game.world.solidAt(tx, ty)) return ty * TILE;
  return null;
}

// Archon: seals the area with a ring of hard-light walls for a while.
function lockdown(game, m, tgt) {
  const w = game.world, cx = Math.floor(tgt.cx / TILE), cy = Math.floor(tgt.cy / TILE), R = 16;
  const cells = [];
  for (let y = cy - R - 1; y <= cy + R + 1; y++) for (let x = cx - R - 1; x <= cx + R + 1; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (Math.abs(d - R) > 0.6 || !w.inb(x, y) || w.get(x, y) || w.liq[y * w.w + x] > 0) continue;
    w.set(x, y, T.lockdown_field, 0); cells.push([x, y]);
  }
  m.ai.lock = cells; m.ai.lockT = m.ai.lt;
  game.notify('LOCKDOWN: the Archon has sealed the area!', '#66ccff');
  game.audio.play('roar');
}
export function clearLockdown(game, m) {
  if (!m.ai || !m.ai.lock) return;
  for (const [x, y] of m.ai.lock) if (game.world.get(x, y) === T.lockdown_field) game.world.set(x, y, 0);
  m.ai.lock = null;
}

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
    a.st = (a.st || 0) + 1;
    if (a.st % 260 === 130 && a.mode !== 'spin') orbitalStrike(game, tgt, m.phase === 2 ? 2 : 1);
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
    if (m.onGround && a.air && a.big) {
      // a heavy landing splashes a puddle of slowing gel
      const w = game.world, fy = Math.floor((m.y + m.h + 2) / TILE) - 1;
      for (let x = Math.floor(m.cx / TILE) - 2; x <= Math.floor(m.cx / TILE) + 2; x++) {
        if (!w.inb(x, fy) || w.solidAt(x, fy) || !w.solidAt(x, fy + 1)) continue;
        const i = fy * w.w + x; if (w.liq[i] && w.liqT[i] !== LIQ.gel) continue;
        w.liq[i] = Math.max(w.liq[i], 120); w.liqT[i] = LIQ.gel;
      }
      game.camShake = 6;
    }
    a.air = !m.onGround;
    if (m.onGround) {
      m.vx *= 0.8;
      a.stuck = (a.stuck || 0) + 1;
      if (a.t > 40) {
        a.t = 0; a.jumps = (a.jumps || 0) + 1;
        const big = a.jumps % 3 === 0;
        a.big = big;
        m.vy = big ? -12 : -8; m.vx = sign(tgt.cx - m.cx) * (big ? 4 : 5);
      }
    } else a.stuck = 0;
    a.sp = (a.sp || 0) + 1;
    if (a.sp % 360 === 0 && game.monsters.filter((x) => x.key === 'gel_cube').length < 4) for (const dx of [-80, 80]) game.spawnMonster('gel_cube', m.cx + dx, m.y);
    // reabsorb gel cubes that touch it
    for (const c of game.monsters) if (c.key === 'gel_cube' && !c.dead && c.x < m.x + m.w && c.x + c.w > m.x && c.y < m.y + m.h && c.y + c.h > m.y) {
      const heal = Math.round(m.maxHp * 0.04);
      m.hp = Math.min(m.maxHp, m.hp + heal);
      game.fx.text(m.cx, m.y - 6, '+' + heal + ' absorbed', '#4ad9ff');
      game.killMonster(c, true);
    }
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
    if (m.key === 'leviathan') {
      const a = m.ai, c = (a.mg = (a.mg || 0) + 1) % 420;
      if (c === 300) game.notify('The Leviathan magnetizes its hull!', '#66ccff');
      if (c >= 300 && c < 400) {
        let near = m, nd = 1e9;
        for (const sg of m.segments || []) { if (sg.dead) continue; const d = Math.hypot(sg.cx - tgt.cx, sg.cy - tgt.cy); if (d < nd) { nd = d; near = sg; } }
        const k = tgt.s.kbImmune ? 0.5 : 1, d = nd || 1;
        tgt.vx += (near.cx - tgt.cx) / d * 0.45 * k; tgt.vy += (near.cy - tgt.cy) / d * 0.3 * k;
        game.magnet = [tgt.cx, tgt.cy, near.cx, near.cy];
      } else game.magnet = null;
    }
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
      if (a.t % 12 === 0) shoot(game, m, a.t % 36 === 0 ? 'e_stinger_mark' : 'e_stinger', tgt.cx, tgt.cy, 8, 22, 0.15);
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
    const hands = game.monsters.filter((h) => h.owner === m && !h.dead);
    const handsAlive = hands.length > 0;
    const prime = m.def.prime;
    a.lt = (a.lt || 0) + 1;
    if (!prime && a.lt % 900 === 400 && !a.lock) lockdown(game, m, tgt);
    if (a.lock && a.lt - a.lockT > 540) clearLockdown(game, m);
    if (prime) {
      // destroyed arms are rebuilt by a repair crew, unless the crew is destroyed first
      a.maxHands = a.maxHands || 4;
      if (hands.length < a.maxHands && !a.rebuild) {
        a.rebuild = 720;
        a.crew = [-1, 1].map((sd) => { const r = game.spawnMonster('repair_drone', m.cx + sd * 60, m.cy + 40, true); r.ai.medic = m; r.maxHp = r.hp = 1200; return r; });
        game.notify('Prime Archon dispatches a repair crew!', '#3dff6a');
      }
      if (a.rebuild > 0 && --a.rebuild === 0) {
        if (a.crew.some((c) => !c.dead)) {
          const have = new Set(hands.map((h) => h.side));
          for (const sd of [-1, 1, -1.6, 1.6]) if (!have.has(sd)) { const h = game.spawnMonster('prime_hand', m.cx + sd * 100, m.cy, true); h.owner = m; h.side = sd; h.hp = Math.round(h.maxHp * 0.5); }
          game.notify('The repair crew rebuilt Prime Archon\'s arms!', '#ff3355');
        } else { a.maxHands = hands.length; game.notify('Repair crew destroyed: the arms stay down.', '#3dff6a'); }
        a.crew = [];
      }
    }
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
    // reactor vents: heat pillars burst from the floor ahead of the wall
    if (a.t % 170 === 85) for (let k = 0; k < (frac < 0.5 ? 4 : 3); k++) {
      const x = tgt.cx + rng.int(-240, 240), fy = floorBelow(game, x, tgt.y);
      if (fy !== null) addHazard(game, { type: 'pillar', x, y: fy, w: 30, h: 180, warn: 70, life: 45, dmg: 50, color: '#ff8a3d', cause: 'Reactor Vent' });
    }
  },

  boss_twin(m, game, tgt) {
    if (nightOnly(m, game, tgt)) return;
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    if (m.phase === 1 && m.hp < m.maxHp * 0.4) { m.phase = 2; game.audio.play('roar'); m.defense += 10; }
    const ret = m.key === 'twin_lancer_r';
    if (ret && !a.link && m.partner && !m.partner.dead) {
      // an energy link between the two lancers: they sweep it across the player
      a.link = addHazard(game, {
        type: 'line', warn: 150, life: 1e9, w: 5, dmg: 45, color: '#ff3ddc', cause: 'Lancer Link',
        follow: (g, h) => { const o = m.partner; if (m.dead || !o || o.dead) return false; h.x1 = m.cx; h.y1 = m.cy; h.x2 = o.cx; h.y2 = o.cy; },
      });
    }
    if (ret) {
      steer(m, tgt.cx + (m.cx < tgt.cx ? -320 : 320), tgt.cy - 120, 0.3, 8);
      m.x += m.vx; m.y += m.vy;
      m.rot = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
      if (a.t % (m.phase === 2 ? 14 : 45) === 0) shoot(game, m, 'e_laser', tgt.cx, tgt.cy, 10, 40);
    } else {
      a.mode = a.mode || 'hover';
      if (a.mode === 'hover') {
        const pr = m.partner && !m.partner.dead ? m.partner : null;
        steer(m, pr ? 2 * tgt.cx - pr.cx : tgt.cx, tgt.cy - 260, 0.35, 8); m.x += m.vx; m.y += m.vy;
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
    a.ct = (a.ct || 0) + 1;
    if (!a.charge && !a.stun && a.ct % 640 === 400) {
      a.charge = 150; a.hp0 = m.hp; m.ai.exposed = true;
      game.notify('The Bloom Titan is drawing in light: damage it to interrupt!', '#fff38a');
    }
    if (a.stun > 0) { a.stun--; m.vx *= 0.9; m.vy *= 0.9; m.x += m.vx; m.y += m.vy; return; }
    if (a.charge > 0) {
      a.charge--; m.vx *= 0.85; m.vy *= 0.85; m.x += m.vx; m.y += m.vy;
      m.rot = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
      if (a.hp0 - m.hp > m.maxHp * 0.05) {
        a.charge = 0; m.ai.exposed = false; a.stun = 120;
        game.notify('Photosynthesis interrupted!', '#3dff6a');
      } else if (a.charge === 0) {
        m.ai.exposed = false;
        const base = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx);
        addHazard(game, {
          type: 'line', warn: 20, life: 90, w: 24, dmg: 80, color: '#fff38a', cause: 'Solar Beam',
          follow: (g, h) => { if (m.dead) return false; const ang = base - 0.7 + 1.4 * h.t / 110; h.x1 = m.cx; h.y1 = m.cy; h.x2 = m.cx + Math.cos(ang) * 800; h.y2 = m.cy + Math.sin(ang) * 800; },
        });
        game.audio.play('laser');
      }
      return;
    }
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
    const cyc = (a.g = (a.g || 0) + 1) % 900;
    const mul = cyc >= 300 && cyc < 540 ? 1.9 : cyc >= 600 && cyc < 840 ? 0.35 : 1;
    if (cyc === 300) game.notify('Gravity crushes down!', '#ffaa22');
    if (cyc === 600) game.notify('Gravity lets go...', '#8fd8ff');
    game.gravField = { mul, until: game.tick + 2 };
    if (m.onGround && a.air) for (const d of [-1, 1]) addHazard(game, { type: 'wave', x: m.cx + d * m.w / 2, y: m.y + m.h, vx: d * 5, warn: 0, life: 150, dmg: 50, color: '#ffaa22', cause: 'Shockwave' });
    a.air = !m.onGround;
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
    // it remixes the Strata's other guardians: the Firewall's scan beam, then the Echo Engine's echoes
    recordHistory(m, game.player);
    a.ang = (a.ang || 0) + 0.009;
    if (m.phase >= 2 && !a.beam) { a.beam = sweepBeam(game, m, 0, '#d0a0ff', m.def.name, 70); game.notify('The Architect runs the Firewall protocol!', '#d0a0ff'); }
    if (m.phase === 3 && !a.echoes) { a.echoes = true; spawnEchoes(game, m, [140, 280]); game.notify('The Architect replays your past!', '#d0a0ff'); }
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
  if (!main) main = summonOriginal(game, key);
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
