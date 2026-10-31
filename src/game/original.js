// Enemies and bosses unique to Neon Strata, built around their own mechanics rather than
// Terraria's: maintenance drones that undo your digging, cloaked stalkers, EMP jamming,
// mimicking supply crates, life-draining tethers, sappers that blow holes in the terrain,
// a Firewall you have to hack, a nanobot swarm that changes shape, an engine that replays
// your own past movements, and a void that swallows all light.
import { TILE, rng, sign, clamp } from '../core/util.js';
import { moveEntity } from './physics.js';
import { TILES } from '../content/tiles.js';
import { addHazard } from './hazards.js';
import { toggleRide } from './vehicles.js';

const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);

function steer(m, tx, ty, accel, max) {
  const dx = tx - m.cx, dy = ty - m.cy, d = Math.hypot(dx, dy) || 1;
  m.vx += (dx / d) * accel; m.vy += (dy / d) * accel;
  const v = Math.hypot(m.vx, m.vy);
  if (v > max) { m.vx *= max / v; m.vy *= max / v; }
}

function shoot(game, m, proj, tx, ty, speed, dmg, spread = 0) {
  const a = Math.atan2(ty - m.cy, tx - m.cx) + rng.float(-spread, spread);
  const mult = game.world.difficulty === 'expert' ? 1.5 : 1;
  return game.spawnProjectile(proj, m.cx, m.cy, Math.cos(a) * speed, Math.sin(a) * speed, Math.round(dmg * mult), 3, 'enemy');
}

function walk(m, game, dir, speed) {
  m.vx += dir * 0.15;
  m.vx = clamp(m.vx, -speed, speed);
  if (m.onGround && m.hitWallLast) m.vy = -6.8;
  m.vy = Math.min(m.vy + 0.35, 10);
  moveEntity(game.world, m, { platforms: true, step: true });
  m.hitWallLast = m.hitWall;
}

// Standing room for a 1-tile-wide body near (tx, ty): returns world coords of the feet or null.
function groundSpot(game, tx, ty, h) {
  const w = game.world, rows = Math.ceil(h / TILE);
  for (let dy = -6; dy <= 8; dy++) {
    const y = ty + dy;
    if (!w.solidAt(tx, y + 1)) continue;
    let clear = true;
    for (let k = 0; k <= rows; k++) if (w.solidAt(tx, y - k)) clear = false;
    if (clear) return { x: tx * TILE + 8, y: (y + 1) * TILE };
  }
  return null;
}

function breakArea(game, cx, cy, r) {
  const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + 1) continue;
    const t = TILES[game.world.get(tx + dx, ty + dy)];
    if (!t || t.tool === 'none' || t.minPick > 65 || t.hp >= 4 || t.container || t.interact || t.furn) continue;
    if (t.biome === 'dungeon' && !game.world.flags.bosses.archon) continue;
    game.breakTile(tx + dx, ty + dy, true);
  }
}

export function jam(game, p, ticks) {
  if (p.s.jamImmune) { game.fx.text(p.cx, p.y - 8, 'Shielded', '#66ccff'); return; }
  p.addBuff('jammed', ticks);
  if (p.vehicle) toggleRide(game, p);
  game.fx.text(p.cx, p.y - 8, 'JAMMED', '#66ccff');
}

// ---------------------------------------------------------------- enemies
export const ORIGINAL_AI = {
  // Heals wounded enemies with a beam, and otherwise rebuilds tunnels the player dug.
  repair(m, game, tgt, slow) {
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    if (a.t % 30 === 1) {
      a.patient = null;
      let worst = 0.98;
      const medic = a.medic && !a.medic.dead ? a.medic : null;
      for (const o of game.monsters) {
        if (o === m || o.dead || o.allied || o.head || o.def.immune || (o.def.boss && o !== medic) || dist(o, m) > 320) continue;
        const f = o.hp / o.maxHp;
        if (f < worst) { worst = f; a.patient = o; }
      }
    }
    let tx, ty;
    const pat = a.patient && !a.patient.dead ? a.patient : null;
    if (pat) { tx = pat.cx; ty = pat.cy - 50; }
    else if (tgt) { const side = m.cx < tgt.cx ? -1 : 1; tx = tgt.cx + side * 150; ty = tgt.cy - 90; }
    else { tx = m.cx + m.dir * 50; ty = m.cy; }
    steer(m, tx, ty, 0.12, m.def.speed * slow);
    m.x += m.vx; m.y += m.vy + Math.sin(m.anim * 0.08) * 0.3;
    m.dir = sign(m.vx) || m.dir;
    a.beam = null;
    if (pat && dist(pat, m) < 140) {
      a.beam = pat;
      if (a.t % 20 === 0) {
        const heal = Math.max(2, Math.round(pat.maxHp * (pat.def.boss ? 0.004 : 0.05)));
        pat.hp = Math.min(pat.maxHp, pat.hp + heal);
        game.fx.text(pat.cx, pat.y - 4, '+' + heal, '#3dff6a');
      }
    } else if (!pat && a.t % 40 === 0 && game.minedLog.length) {
      // put back a tile the player dug out, if nobody is standing in it
      const p = game.player;
      for (let i = game.minedLog.length - 1; i >= 0; i--) {
        const [x, y, id, when] = game.minedLog[i];
        if (game.tick - when < 90 || Math.hypot(x * TILE + 8 - m.cx, y * TILE + 8 - m.cy) > 200) continue;
        game.minedLog.splice(i, 1);
        if (game.world.get(x, y)) continue;
        const r = { x: x * TILE, y: y * TILE, w: TILE, h: TILE };
        const blocked = [p, ...game.monsters].some((o) => !o.dead && o.x < r.x + r.w && o.x + o.w > r.x && o.y < r.y + r.h && o.y + o.h > r.y);
        if (blocked) continue;
        game.world.set(x, y, id, 0);
        a.beamTile = [x * TILE + 8, y * TILE + 8, 12];
        game.fx.burst(x * TILE + 8, y * TILE + 8, '#3dff6a', 8, 1.5);
        break;
      }
    }
    if (a.beamTile && --a.beamTile[2] <= 0) a.beamTile = null;
  },

  // Invisible until close, hit, or seen through Thermal Optics; blinks behind the player.
  stalker(m, game, tgt, slow) {
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    if (a.reveal > 0) a.reveal--;
    const d = tgt ? dist(m, tgt) : 1e9;
    m.cloak = !(d < 72 || m.hitFlash > 0 || a.reveal > 0 || game.player.s.hunter);
    if (!tgt) { walk(m, game, m.dir, m.def.speed * 0.5 * slow); return; }
    m.dir = sign(tgt.cx - m.cx) || m.dir;
    if (a.t % 200 === 0 && d > 110 && d < 700) {
      const behind = -(sign(tgt.vx) || tgt.dir || 1);
      const spot = groundSpot(game, Math.floor((tgt.cx + behind * 56) / TILE), Math.floor((tgt.y + tgt.h) / TILE) - 1, m.h);
      if (spot) {
        game.fx.burst(m.cx, m.cy, '#9ff4e8', 10, 2);
        m.x = spot.x - m.w / 2; m.y = spot.y - m.h - 0.01; m.vx = 0; m.vy = 0;
        a.reveal = 45; a.lunge = 18;
        game.audio.play('dash');
      }
    }
    if (a.lunge > 0) { a.lunge--; if (a.lunge === 0) { m.vx = m.dir * 7; m.vy = -2.5; } }
    walk(m, game, m.dir, m.def.speed * slow * (a.reveal > 0 ? 0.3 : 1));
  },

  // Hovers nearby, charges and releases an EMP that jams vehicles and neural augments.
  emp(m, game, tgt, slow) {
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    if (a.cd > 0) a.cd--;
    const d = tgt ? dist(m, tgt) : 1e9;
    if (tgt) { const side = m.cx < tgt.cx ? -1 : 1; steer(m, tgt.cx + side * 110, tgt.cy - 70, 0.1, m.def.speed * slow * (a.charge ? 0.4 : 1)); }
    m.x += m.vx; m.y += m.vy;
    if (m.def.tileCollide !== false && game.world.solidAt(Math.floor(m.cx / TILE), Math.floor(m.cy / TILE))) { m.x -= m.vx; m.y -= m.vy; m.vx *= -0.5; m.vy *= -0.5; }
    m.dir = sign(m.vx) || m.dir;
    if (tgt && !a.cd && d < 220) a.charge = (a.charge || 0) + 1;
    else if (a.charge) a.charge = Math.max(0, a.charge - 2);
    if (a.charge >= 90) {
      a.charge = 0; a.cd = 240;
      game.fx.burst(m.cx, m.cy, '#66ccff', 30, 5);
      game.audio.play('laser');
      if (d < 160) { jam(game, game.player, 360); game.hurtPlayer(Math.round(m.dmg * 0.8), m.cx, 2, m.def.name); }
    }
  },

  // A supply crate until you get close. Then it bites.
  mimic(m, game, tgt, slow) {
    const a = m.ai;
    if (a.dormant === undefined) a.dormant = true;
    if (a.dormant) {
      m.vx = 0; m.vy = Math.min(m.vy + 0.35, 10);
      moveEntity(game.world, m, { platforms: true });
      if ((tgt && dist(m, tgt) < 56) || m.hp < m.maxHp) {
        a.dormant = false; a.t = 0;
        game.notify('The supply crate was a Cache Mimic!', '#ffcc33');
        game.audio.play('roar');
      }
      return;
    }
    a.t = (a.t || 0) + 1;
    if (m.onGround) {
      m.vx *= 0.75;
      if (a.t % 28 === 0 && tgt) { m.dir = sign(tgt.cx - m.cx) || 1; m.vy = rng.chance(0.3) ? -9 : -6; m.vx = m.dir * m.def.speed * 1.6 * slow; }
    }
    m.vy = Math.min(m.vy + 0.35, 10);
    moveEntity(game.world, m, { platforms: true });
  },

  // Latches a tether onto the player and drains integrity until the line is broken.
  leech(m, game, tgt, slow) {
    const a = m.ai;
    a.t = (a.t || 0) + 1;
    if (a.cd > 0) a.cd--;
    const d = tgt ? dist(m, tgt) : 1e9;
    if (tgt) steer(m, tgt.cx, tgt.cy, 0.05, m.def.speed * slow * (a.tether ? 0.5 : 1));
    m.x += m.vx; m.y += m.vy + Math.sin(m.anim * 0.07) * 0.4;
    m.dir = sign(m.vx) || m.dir;
    if (!a.tether && tgt && !a.cd && d < 100) { a.tether = true; a.hp0 = m.hp; game.audio.play('summon'); }
    if (a.tether) {
      const p = game.player;
      const broke = !tgt || d > 230 || m.hp < a.hp0 - m.maxHp * 0.25 || p.dashCd > 38;
      if (broke) { a.tether = false; a.cd = 150; game.fx.text(m.cx, m.y - 4, 'Tether broken', '#ff8fa8'); return; }
      p.vx += (m.cx - p.cx) / (d || 1) * 0.12;
      if (a.t % 20 === 0 && p.immune <= 0) {
        const drain = Math.max(1, Math.round(m.dmg * 0.25));
        p.life -= drain; m.hp = Math.min(m.maxHp, m.hp + drain);
        game.fx.text(p.cx, p.y - 4, drain, '#ff5a8a');
        if (p.life <= 0) game.killPlayer(m.def.name);
      }
    }
  },

  // Runs at the player, arms a fuse and blows a crater into the terrain.
  sapper(m, game, tgt, slow) {
    const a = m.ai;
    const d = tgt ? dist(m, tgt) : 1e9;
    if (a.fuse) {
      a.fuse++;
      m.vx *= 0.8; m.vy = Math.min(m.vy + 0.35, 10);
      moveEntity(game.world, m, { platforms: true });
      if (a.fuse % 10 === 0) game.audio.play('ui');
      if (a.fuse >= 50) {
        game.explode(m.cx, m.cy, { r: 60 }, m.dmg, 'enemy');
        breakArea(game, m.cx, m.cy, 3);
        game.killMonster(m, true);
      }
      return;
    }
    if (tgt && d < 40) { a.fuse = 1; return; }
    const dir = tgt && d < 340 ? sign(tgt.cx - m.cx) || 1 : m.dir;
    m.dir = dir;
    walk(m, game, dir, m.def.speed * slow * (tgt && d < 340 ? 1.2 : 0.5));
  },
};

// ---------------------------------------------------------------- bosses
function leave(game, m) {
  m.vy -= 0.3; m.y += m.vy;
  if ((m.ai.gone = (m.ai.gone || 0) + 1) > 240) game.despawnBoss(m);
}

// Records the player's movement for the Echo Engine and the Architect's echoes.
export function recordHistory(m, p) {
  const h = (m.ai.hist = m.ai.hist || []);
  h.push([p.x, p.y, p.dir, p.onGround ? 1 : 0, p.anim || 0]);
  if (h.length > 420) h.shift();
}

export function spawnEchoes(game, m, delays) {
  for (const d of delays) {
    const e = game.spawnMonster('echo_ghost', game.player.cx, game.player.y + game.player.h, true);
    e.owner = m; e.delay = d; e.ai.base = e.dmg;
  }
}

export function sweepBeam(game, m, offset, color, cause, dmg) {
  return addHazard(game, {
    type: 'line', warn: 90, life: 1e9, w: 6, dmg, color, cause,
    follow: (g, h) => {
      if (m.dead) return false;
      const ang = m.ai.ang + offset, L = 560;
      h.x1 = m.cx - Math.cos(ang) * L; h.y1 = m.cy - Math.sin(ang) * L;
      h.x2 = m.cx + Math.cos(ang) * L; h.y2 = m.cy + Math.sin(ang) * L;
    },
  });
}

export const ORIGINAL_BOSS_AI = {
  // The Firewall: invulnerable until all four ports are hacked by standing next to them.
  // Sweeping scan beams guard the ring; hacked ports turn their guns on the core.
  boss_firewall(m, game, tgt) {
    const a = m.ai;
    if (!tgt) { leave(game, m); return; }
    a.t = (a.t || 0) + 1;
    a.ang = (a.ang || 0) + (m.phase === 2 ? 0.011 : 0.007);
    if (m.phase === 1 && m.hp < m.maxHp * 0.5) { m.phase = 2; game.audio.play('roar'); game.notify('The Firewall escalates its scans!', '#ff3355'); a.beams.push(sweepBeam(game, m, Math.PI / 2, '#ff3355', m.def.name, 34)); }
    if (!a.beams) a.beams = [sweepBeam(game, m, 0, '#ff3355', m.def.name, 30)];
    steer(m, tgt.cx, tgt.cy - 150, 0.03, 1.2);
    m.x += m.vx; m.y += m.vy;
    const nodes = game.monsters.filter((n) => n.owner === m && !n.dead);
    const hostile = nodes.filter((n) => !n.ai.breached);
    if (a.open > 0) {
      a.open--;
      if (a.open === 0) { for (const n of nodes) { n.ai.breached = false; n.ai.hack = 0; } game.notify('The Firewall rebooted its ports.', '#ff3355'); }
    } else if (nodes.length && !hostile.length) {
      a.open = m.phase === 2 ? 480 : 600;
      game.notify('Firewall breached! Its core is exposed.', '#3dff6a');
      game.audio.play('levelup');
    }
    m.ai.shielded = !(a.open > 0);
    if (a.t % (m.phase === 2 ? 60 : 90) === 0) for (let k = -1; k <= 1; k++) shoot(game, m, 'e_bolt', tgt.cx + k * 60, tgt.cy, 5, 22);
  },

  boss_fwnode(m, game, tgt) {
    const o = m.owner;
    if (!o || o.dead) { game.killMonster(m, true); return; }
    const a = m.ai;
    if (a.base === undefined) a.base = 0;
    const ang = a.base + (o.ai.t || 0) * 0.006, r = 160;
    m.x = o.cx + Math.cos(ang) * r - m.w / 2; m.y = o.cy + Math.sin(ang) * r - m.h / 2;
    const p = game.player;
    if (!a.breached) {
      if (tgt && Math.hypot(p.cx - m.cx, p.cy - m.cy) < 60) {
        a.hack = (a.hack || 0) + 1;
        if (a.hack % 15 === 0) game.audio.play('ui');
        if (a.hack >= 150) { a.breached = true; game.fx.burst(m.cx, m.cy, '#3dff6a', 20, 3); game.fx.text(m.cx, m.y - 6, 'PORT HACKED', '#3dff6a'); game.audio.play('summon'); }
      } else a.hack = Math.max(0, (a.hack || 0) - 0.5);
    } else if (o.ai.open > 0 && game.tick % 30 === (m.id % 30)) {
      const s = Math.atan2(o.cy - m.cy, o.cx - m.cx);
      game.spawnProjectile('fw_shot', m.cx, m.cy, Math.cos(s) * 9, Math.sin(s) * 9, 60, 0, 'player', { dmgType: 'energy' });
    }
  },

  // The Echo Engine: replays where the player was seconds ago as damaging echoes, and in
  // its last phase rewinds its own damage unless the Time Anchor is destroyed in time.
  boss_echo(m, game, tgt) {
    const a = m.ai;
    if (!tgt) { leave(game, m); return; }
    a.t = (a.t || 0) + 1;
    recordHistory(m, game.player);
    const f = m.hp / m.maxHp;
    const np = f < 0.3 ? 3 : f < 0.65 ? 2 : 1;
    if (!a.echoes) { a.echoes = 1; spawnEchoes(game, m, [150]); }
    while (np > m.phase) {
      m.phase++; game.audio.play('roar');
      if (m.phase === 2) { spawnEchoes(game, m, [270]); game.notify('The Echo Engine replays more of your past!', '#3dffb0'); }
      if (m.phase === 3) { spawnEchoes(game, m, [390]); game.notify('The Echo Engine is bending time!', '#3dffb0'); }
    }
    if (a.stun > 0) { a.stun--; m.vx *= 0.9; m.vy *= 0.9; m.x += m.vx; m.y += m.vy; m.defense = 0; return; }
    m.defense = m.def.def;
    a.ang = (a.ang || 0) + 0.012;
    steer(m, tgt.cx + Math.cos(a.ang) * 260, tgt.cy + Math.sin(a.ang) * 120 - 100, 0.2, m.def.speed);
    m.x += m.vx; m.y += m.vy;
    m.rot += 0.03;
    if (a.t % 75 === 0) for (let k = -1; k <= 1; k++) shoot(game, m, 'e_chrono', tgt.cx, tgt.cy, 4.5, 26, 0.25 * k);
    // Rewind: heal back the damage taken in the last 5 seconds unless the anchor breaks.
    if (a.t % 30 === 0) { (a.hpLog = a.hpLog || []).push(m.hp); if (a.hpLog.length > 10) a.hpLog.shift(); }
    if (m.phase === 3) {
      if (!a.cast && a.t % 600 === 0) {
        const p = game.player;
        a.cast = 150; a.castHp = (a.hpLog && a.hpLog[0]) || m.hp;
        const an = game.spawnMonster('echo_anchor', p.cx + rng.pick([-1, 1]) * rng.int(120, 220), p.cy - rng.int(40, 140), true);
        an.owner = m; a.anchor = an;
        game.notify('Destroy the Time Anchor before the Echo Engine rewinds!', '#ffcc33');
      }
      if (a.cast > 0 && --a.cast === 0) {
        if (a.anchor && !a.anchor.dead) {
          a.anchor.dead = true;
          if (a.castHp > m.hp) { game.fx.text(m.cx, m.y - 10, '+' + Math.round(a.castHp - m.hp), '#3dffb0'); m.hp = a.castHp; }
          game.notify('The Echo Engine rewound time!', '#3dffb0');
        }
        a.anchor = null;
      } else if (a.cast > 0 && a.anchor && a.anchor.dead) {
        a.cast = 0; a.anchor = null; a.stun = 150;
        game.notify('Rewind interrupted! The Echo Engine is exposed.', '#3dff6a');
      }
    }
  },

  boss_echoghost(m, game) {
    const o = m.owner;
    if (!o || o.dead) { game.killMonster(m, true); return; }
    const h = o.ai.hist || [];
    const i = h.length - 1 - m.delay;
    if (i < 0) { m.ai.inactive = true; m.dmg = 0; return; }
    const [x, y, dir, onGround, anim] = h[i];
    m.x = x; m.y = y; m.dir = dir; m.onGround = !!onGround; m.anim = anim;
    m.ai.inactive = false;
    m.dmg = m.ai.base || m.def.dmg;
  },

  boss_anchor(m, game) {
    const o = m.owner;
    if (!o || o.dead) { game.killMonster(m, true); return; }
    m.y += Math.sin(m.anim * 0.06) * 0.4;
    m.rot = (m.rot || 0) + 0.08;
  },

  // Legion: forty units sharing one mind. They re-form into a swarm, a sweeping blade,
  // closing walls, a shrinking ring and a lance — faster the fewer of them are left.
  boss_legion(m, game, tgt) {
    const a = m.ai;
    const bots = game.monsters.filter((b) => b.owner === m && !b.dead);
    if (!bots.length) { m.ai.shielded = false; game.killMonster(m); return; }
    if (!tgt) { for (const b of bots) b.vy -= 0.3; leave(game, m); return; }
    a.t = (a.t || 0) + 1;
    const modes = ['swarm', 'blade', 'walls', 'ring', 'lance'];
    if (!a.mode || a.mt <= 0) {
      a.k = ((a.k === undefined ? -1 : a.k) + 1) % modes.length;
      a.mode = modes[a.k]; a.mt = a.mode === 'lance' ? 240 : 330;
      a.px = tgt.cx; a.py = tgt.cy; a.side = rng.pick([-1, 1]); a.gap = rng.float(0, Math.PI * 2);
      a.holes = [rng.int(0, 3), rng.int(0, 3)];
      game.fx.text(m.cx, m.y - 10, a.mode.toUpperCase(), '#ff3355');
    }
    a.mt--;
    const n = bots.length, spd = 3.5 + 6 * (1 - n / 40);
    const el = (a.mode === 'lance' ? 240 : 330) - a.mt;
    let cx = a.px, cy = a.py;
    if (a.mode === 'swarm') { cx = tgt.cx; cy = tgt.cy; }
    if (a.mode === 'blade') { cx = a.px + a.side * 170; cy = a.py - 20; }
    if (a.mode === 'lance') {
      const cyc = el % 80;
      if (cyc === 0) { a.lx = m.cx; a.ly = m.cy; const s = Math.atan2(tgt.cy - m.cy, tgt.cx - m.cx); a.lvx = Math.cos(s) * 13; a.lvy = Math.sin(s) * 13; }
      if (cyc < 30) { steer(m, tgt.cx - a.side * 260, tgt.cy - 60, 0.6, 8); m.x += m.vx; m.y += m.vy; }
      else { m.x += a.lvx; m.y += a.lvy; }
      cx = m.cx; cy = m.cy;
    } else { steer(m, cx, cy - 60, 0.4, 6); m.x += m.vx; m.y += m.vy; }
    bots.forEach((b, i) => {
      let tx = cx, ty = cy;
      switch (a.mode) {
        case 'swarm': { const ang = i / n * Math.PI * 2 + a.t * 0.03; const r = 80 + 40 * Math.sin(a.t * 0.05 + i); tx = cx + Math.cos(ang) * r; ty = cy + Math.sin(ang) * r; break; }
        case 'blade': { const ang = a.t * 0.035 * a.side; const off = (i - n / 2) * 11; tx = cx + Math.cos(ang) * off; ty = cy + Math.sin(ang) * off; break; }
        case 'walls': {
          const gap = Math.max(26, 260 - el * 1.1), half = i % 2, j = Math.floor(i / 2), rows = Math.ceil(n / 2);
          const hole = a.holes[half], row = Math.floor(j / Math.max(1, rows / 5));
          tx = cx + (half ? gap : -gap); ty = cy - 110 + (j / rows) * 200 + (row === hole ? 26 : 0);
          break;
        }
        case 'ring': {
          const r = el < 200 ? 230 - el : 30 + (el - 200) * 1.5;
          const ang = a.gap + (i + 3) / (n + 3) * Math.PI * 2;
          tx = cx + Math.cos(ang) * r; ty = cy + Math.sin(ang) * r;
          break;
        }
        case 'lance': { const back = (i % 10) * 12, row = Math.floor(i / 10) - 1.5; const s = Math.atan2(a.lvy || 0, a.lvx || 1); tx = cx - Math.cos(s) * back - Math.sin(s) * row * 10; ty = cy - Math.sin(s) * back + Math.cos(s) * row * 10; break; }
      }
      b.tx = tx; b.ty = ty; b.spd = a.mode === 'lance' ? 16 : spd;
    });
  },

  boss_legionbot(m, game) {
    const o = m.owner;
    if (!o || o.dead) { game.killMonster(m, true); return; }
    if (m.tx === undefined) return;
    steer(m, m.tx, m.ty, 0.9, m.spd || 5);
    m.x += m.vx; m.y += m.vy;
    m.rot = Math.atan2(m.vy, m.vx);
  },

  // Blackout: smothers every light around it. Its own flare orbs are the only light left.
  boss_blackout(m, game, tgt) {
    const a = m.ai;
    if (!tgt) { leave(game, m); return; }
    a.t = (a.t || 0) + 1;
    if (m.phase === 1 && m.hp < m.maxHp * 0.5) { m.phase = 2; game.audio.play('roar'); game.notify('Blackout deepens...', '#b06bff'); }
    game.darkField = { x: m.cx / TILE, y: m.cy / TILE, r: m.phase === 2 ? 48 : 38 };
    if (a.fade > 0) {
      // slip away into the dark and resurface behind the player
      a.fade--; m.cloak = true;
      if (a.fade === 0) { m.x = tgt.cx - (sign(tgt.vx) || tgt.dir || 1) * 280 - m.w / 2; m.y = tgt.cy - 140 - m.h / 2; m.cloak = false; game.fx.burst(m.cx, m.cy, '#b06bff', 30, 4); }
      return;
    }
    steer(m, tgt.cx, tgt.cy - 160, 0.08, m.def.speed + m.phase);
    m.x += m.vx; m.y += m.vy;
    if (a.t % 100 === 0) for (let k = 0; k < 6 + m.phase * 2; k++) {
      const s = k / (6 + m.phase * 2) * Math.PI * 2 + a.t;
      game.spawnProjectile('e_lumen', m.cx, m.cy, Math.cos(s) * 3, Math.sin(s) * 3, 60, 3, 'enemy');
    }
    if (a.t % 360 === 180) { a.fade = 60; game.fx.burst(m.cx, m.cy, '#1a1030', 20, 2); }
    if (m.phase === 2 && a.t % 240 === 0 && game.monsters.filter((x) => x.key === 'phase_stalker').length < 3) {
      const st = game.spawnMonster('phase_stalker', tgt.cx + rng.pick([-1, 1]) * 200, tgt.cy, true);
      st.maxHp = st.hp = 900; st.dmg = 70;
    }
  },
};

// Spawns one of the original bosses and its parts near the player.
export function summonOriginal(game, key) {
  const p = game.player;
  const spawn = (k, x, y) => game.spawnMonster(k, x, y, true);
  switch (key) {
    case 'firewall': {
      const m = spawn('firewall', p.cx, p.cy - 150);
      for (let i = 0; i < 4; i++) { const n = spawn('fw_node', m.cx, m.cy); n.owner = m; n.ai.base = i * Math.PI / 2; }
      m.ai.shielded = true;
      return m;
    }
    case 'echo_engine': return spawn('echo_engine', p.cx + 320, p.cy - 220);
    case 'legion': {
      const m = spawn('legion', p.cx, p.cy - 300);
      for (let i = 0; i < 40; i++) { const b = spawn('legion_bot', m.cx + rng.int(-60, 60), m.cy + rng.int(-60, 60)); b.owner = m; }
      return m;
    }
    case 'blackout': return spawn('blackout', p.cx - 260, p.cy - 220);
  }
  return null;
}
