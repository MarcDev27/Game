// Futuristic weapon mechanics that go beyond swing/shoot: continuous beams, charge shots,
// a gravity gun that grabs and throws enemies, wormhole portals and monofilament whips.
import { TILE, sign, clamp, segmentHitsRect, rng } from '../core/util.js';

// Cast a ray from (x,y) toward angle; stops at the first solid tile unless `phase`.
function castRay(game, x, y, ang, maxLen, phase) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let len = 0;
  for (; len < maxLen; len += 6) {
    if (!phase && game.world.solidAt(Math.floor((x + dx * len) / TILE), Math.floor((y + dy * len) / TILE))) break;
  }
  return { x2: x + dx * len, y2: y + dy * len, len };
}

function hitsAlong(game, x1, y1, x2, y2) {
  const out = [];
  for (const m of game.monsters) {
    if (m.dead || m.allied || m.def.friendly) continue;
    if (segmentHitsRect(x1, y1, x2, y2, { x: m.x - 3, y: m.y - 3, w: m.w + 6, h: m.h + 6 })) out.push(m);
  }
  out.sort((a, b) => Math.hypot(a.cx - x1, a.cy - y1) - Math.hypot(b.cx - x1, b.cy - y1));
  return out;
}

function spendEnergy(game, p, cost) {
  const c = Math.max(0, Math.round(cost * (1 + p.s.energyCost)));
  if (p.energy < c) { if (game.tick % 30 === 0) game.fx.text(p.cx, p.y - 6, 'Low energy', '#a46bff'); return false; }
  p.energy -= c;
  return true;
}

// Called every tick while a tech item is selected. Returns nothing; manages its own state.
export function updateTech(game, p, it, slot, useHeld, aim) {
  const tech = it.tech;
  const hx = p.cx + p.dir * 6, hy = p.y + 16;
  const ang = Math.atan2(aim.y - hy, aim.x - hx);
  p.dir = useHeld ? (aim.x >= p.cx ? 1 : -1) : p.dir;
  p.techFx = null;
  const pressed = useHeld && !p.techHeld;
  const released = !useHeld && p.techHeld;
  p.techHeld = useHeld;
  if (p.techCd > 0) p.techCd--;
  const dmg = () => p.itemDamage(slot);

  switch (tech.kind) {
    case 'beam': {
      if (!useHeld) break;
      const ray = castRay(game, hx, hy, ang, tech.range * TILE, false);
      const targets = hitsAlong(game, hx, hy, ray.x2, ray.y2).slice(0, tech.pierce || 1);
      let end = ray;
      if (targets.length && (tech.pierce || 1) === 1) { const t = targets[0]; end = { x2: t.cx, y2: t.cy }; }
      p.techFx = { type: 'beam', x1: hx, y1: hy, x2: end.x2, y2: end.y2, color: tech.color, w: tech.width || 2 };
      p.useAngle = ang; p.useKey = it.key; p.useStyle = 'shoot'; p.useTimer = 2; p.useTotal = 2;
      if (p.techCd === 0) {
        if (!spendEnergy(game, p, it.energyCost)) { p.techFx = null; break; }
        p.techCd = tech.rate;
        for (const m of targets) {
          game.damageMonster(m, dmg(), 1, sign(m.cx - p.cx) || 1, rng.next() * 100 < p.itemCrit(slot), { dmgType: it.dmgType });
          if (tech.pull && !m.def.boss) { m.vx += (p.cx - m.cx) / 60; m.vy += (p.cy - m.cy) / 60; }
        }
        if (game.tick % 8 === 0) game.audio.play('laser');
        game.fx.spark(end.x2, end.y2, tech.color, rng.float(-1, 1), rng.float(-1, 1), 12, 2);
      }
      break;
    }
    case 'charge': {
      if (useHeld && p.techCd === 0) {
        p.charge = Math.min(tech.max, (p.charge || 0) + 1);
        p.techFx = { type: 'charge', x: hx + Math.cos(ang) * 14, y: hy + Math.sin(ang) * 14, k: p.charge / tech.max, color: tech.color };
        p.useAngle = ang; p.useKey = it.key; p.useStyle = 'shoot'; p.useTimer = 2; p.useTotal = 2;
        if (p.charge === tech.max && game.tick % 10 === 0) game.fx.spark(hx, hy, tech.color);
      } else if (released && p.charge > 4) {
        const k = p.charge / tech.max;
        p.charge = 0;
        if (!spendEnergy(game, p, it.energyCost)) break;
        const full = k >= 1;
        const sp = tech.speed;
        const pr = game.spawnProjectile(full ? tech.fullProj : tech.proj, hx + Math.cos(ang) * 14, hy + Math.sin(ang) * 14, Math.cos(ang) * sp, Math.sin(ang) * sp,
          Math.round(dmg() * (0.25 + 1.75 * k * k)), 6 * k, 'player', { dmgType: it.dmgType, crit: p.itemCrit(slot) + (full ? 20 : 0) });
        pr.pierce += Math.floor(k * 4);
        game.audio.play(full ? 'rocket' : 'shoot');
        game.camShake = full ? 6 : 2;
        p.techCd = tech.cooldown || 10;
      } else if (!useHeld) p.charge = 0;
      break;
    }
    case 'grab': {
      const g = p.grabbed;
      if (useHeld) {
        if (!g || g.dead) {
          // grab the nearest non-boss monster near the aim point, within range of the player
          let best = null, bd = 90;
          for (const m of game.monsters) {
            if (m.dead || m.def.boss || m.head || m.allied) continue;
            if (Math.hypot(m.cx - p.cx, m.cy - p.cy) > tech.range * TILE) continue;
            const d = Math.hypot(m.cx - aim.x, m.cy - aim.y);
            if (d < bd) { bd = d; best = m; }
          }
          if (best && spendEnergy(game, p, it.energyCost)) { p.grabbed = best; best.grabbed = true; game.audio.play('summon'); }
          // also tug loose items toward the player
          for (const d of game.drops) if (Math.hypot(d.x - aim.x, d.y - aim.y) < 80) { d.x += (p.cx - d.x) * 0.08; d.y += (p.cy - d.y) * 0.08; }
        } else {
          const max = 130;
          let tx = aim.x, ty = aim.y;
          const dd = Math.hypot(tx - hx, ty - hy);
          if (dd > max) { tx = hx + (tx - hx) / dd * max; ty = hy + (ty - hy) / dd * max; }
          g.vx = (tx - g.cx) * 0.25; g.vy = (ty - g.cy) * 0.25;
          g.x += g.vx; g.y += g.vy;
          if (game.world.solidAt(Math.floor(g.cx / TILE), Math.floor(g.cy / TILE))) { g.x -= g.vx; g.y -= g.vy; }
          p.techFx = { type: 'tether', x1: hx, y1: hy, x2: g.cx, y2: g.cy, color: tech.color };
          p.useAngle = ang; p.useKey = it.key; p.useStyle = 'shoot'; p.useTimer = 2; p.useTotal = 2;
          if (game.tick % 60 === 0 && !spendEnergy(game, p, it.energyCost)) release(game, p, ang, 0, 0);
        }
      } else if (g) {
        release(game, p, ang, tech.throwSpeed, dmg());
      }
      break;
    }
    case 'portal': {
      if (!pressed || p.techCd > 0) break;
      const tx = Math.floor(aim.x / TILE), ty = Math.floor(aim.y / TILE);
      const w = game.world;
      if (Math.hypot(aim.x - p.cx, aim.y - p.cy) > tech.range * TILE) { game.fx.text(p.cx, p.y - 6, 'Out of range', '#ffcc33'); break; }
      if (w.solidAt(tx, ty) || w.solidAt(tx, ty + 1) || w.solidAt(tx, ty - 1)) { game.fx.text(p.cx, p.y - 6, 'Needs open space', '#ffcc33'); break; }
      if (!spendEnergy(game, p, it.energyCost)) break;
      const list = (p.portals[w.id] = p.portals[w.id] || []);
      list.push([tx * TILE + 8, ty * TILE + 8]);
      while (list.length > 2) list.shift();
      game.fx.burst(tx * TILE + 8, ty * TILE + 8, list.length === 1 ? '#ff8a3d' : '#66ccff', 20, 3);
      game.audio.play('summon');
      p.techCd = 20;
      break;
    }
    case 'whip': {
      if (!useHeld || p.techCd > 0) { if (p.whipFx > 0) { p.whipFx--; p.techFx = p.lastWhip; } break; }
      const ray = castRay(game, hx, hy, ang, tech.reach, false);
      for (const m of hitsAlong(game, hx, hy, ray.x2, ray.y2)) {
        game.damageMonster(m, dmg(), p.itemKnock(slot), sign(m.cx - p.cx) || 1, rng.next() * 100 < p.itemCrit(slot), null);
        if (it.onHit) m.buffs.set(it.onHit.buff, it.onHit.time);
      }
      // filaments cut plants along the way
      for (let k = 0; k <= ray.len; k += 12) {
        const x = Math.floor((hx + Math.cos(ang) * k) / TILE), y = Math.floor((hy + Math.sin(ang) * k) / TILE);
        const id = game.world.get(x, y);
        if (id && game.isCuttable(id)) game.breakTile(x, y, true);
      }
      p.lastWhip = { type: 'whip', x1: hx, y1: hy, x2: ray.x2, y2: ray.y2, color: tech.color };
      p.techFx = p.lastWhip; p.whipFx = 6;
      p.techCd = p.itemUseTime(slot);
      p.useAngle = ang; p.useKey = it.key; p.useStyle = 'shoot'; p.useTimer = 6; p.useTotal = 6;
      game.audio.play('swing');
      break;
    }
  }
}

function release(game, p, ang, speed, damage) {
  const g = p.grabbed;
  p.grabbed = null;
  if (!g || g.dead) return;
  g.grabbed = false;
  g.vx = Math.cos(ang) * speed; g.vy = Math.sin(ang) * speed;
  g.thrown = speed ? 45 : 0; g.throwDmg = damage; g.thrownHits = new Set();
  if (speed) game.audio.play('throw');
}

// Thrown monsters become projectiles that hurt whatever they hit (including themselves on walls).
export function updateThrown(game, m) {
  m.thrown--;
  m.x += m.vx; m.y += m.vy; m.vy += 0.3;
  const w = game.world;
  let hitWall = false;
  if (w.solidAt(Math.floor(m.cx / TILE), Math.floor(m.cy / TILE))) { m.x -= m.vx; m.y -= m.vy; hitWall = true; }
  for (const o of game.monsters) {
    if (o === m || o.dead || o.allied || m.thrownHits.has(o.id)) continue;
    if (o.x < m.x + m.w && o.x + o.w > m.x && o.y < m.y + m.h && o.y + o.h > m.y) {
      m.thrownHits.add(o.id);
      game.damageMonster(o, m.throwDmg, 8, sign(m.vx) || 1, false, null);
      game.camShake = 4;
    }
  }
  if (hitWall && Math.hypot(m.vx, m.vy) > 4) {
    game.damageMonster(m, Math.round(m.throwDmg * 0.8), 0, 1, false, null);
    game.fx.burst(m.cx, m.cy, '#aeb7c2', 10, 2, false);
    m.thrown = 0; m.vx = 0; m.vy = 0;
  }
}

// Step into one portal, come out of the other.
export function checkPortals(game, p) {
  if (p.portalCd > 0) { p.portalCd--; return; }
  const list = p.portals && p.portals[game.world.id];
  if (!list || list.length < 2 || p.dead) return;
  for (let i = 0; i < 2; i++) {
    const [x, y] = list[i];
    if (Math.abs(p.cx - x) < 14 && Math.abs(p.cy - y) < 26) {
      const [ox, oy] = list[1 - i];
      p.x = ox - p.w / 2; p.y = oy - p.h / 2; p.fallStartY = p.y; p.hook = null;
      p.portalCd = 50;
      game.fx.burst(ox, oy, '#66ccff', 24, 3);
      game.audio.play('dash');
      return;
    }
  }
}
