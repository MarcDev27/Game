// Cyberware: capacity, installation rules, active AUG abilities and passive implant behaviors.
import { TILE, sign, rectsOverlap } from '../core/util.js';
import { ITEMS, IMPLANT_SLOTS } from '../content/items.js';

const MACHINE_SPRITES = new Set(['bot', 'husk', 'mech', 'drone', 'crawler', 'spider', 'turret', 'sentinel', 'eye', 'caster']);

export function implantList(p) {
  const out = [];
  const im = p.equip.implants || {};
  for (const s of IMPLANT_SLOTS) if (im[s]) out.push(ITEMS[im[s].k]);
  return out;
}

// Capacity grows with max integrity, so exploring for Vital Cores also unlocks more cyberware.
export function capacity(p) { return 4 + Math.max(0, Math.floor((p.maxLife - 100) / 20)); }
export function usedCapacity(p, except = null) {
  let c = 0;
  const im = p.equip.implants || {};
  for (const s of IMPLANT_SLOTS) if (im[s] && s !== except) c += ITEMS[im[s].k].cost || 0;
  return c;
}
export function canInstall(game, p, slotName, it) {
  if (!game.nearbyStations().has('surgery')) return 'Stand near a Surgery Bay (or the Ripperdoc) to install cyberware.';
  if (it && usedCapacity(p, slotName) + (it.cost || 0) > capacity(p)) return `Not enough cyberware capacity (${usedCapacity(p, slotName) + it.cost}/${capacity(p)}). Raise max integrity to expand it.`;
  return null;
}

export function activeImplant(p) {
  const n = p.equip.implants && p.equip.implants.neural;
  return n ? ITEMS[n.k] : null;
}

export function activateAug(game, p) {
  const it = activeImplant(p);
  if (!it || !it.active) return;
  if (p.augCd > 0) { game.fx.text(p.cx, p.y - 6, 'Recharging ' + Math.ceil(p.augCd / 60) + 's', '#8aa0c0'); return; }
  p.augCd = it.cooldown;
  game.audio.play('summon');
  switch (it.active) {
    case 'timedilation':
      game.slowmo = 240; game.notify('Time dilation engaged', '#3dffb0');
      break;
    case 'dronecommand':
      p.addBuff('drone_cmd', 360); p.recalc();
      break;
    case 'overdrive':
      p.addBuff('overdrive', 480); p.recalc();
      game.fx.burst(p.cx, p.cy, '#ff3355', 24, 3);
      break;
    case 'override': {
      let best = null, bd = 340;
      for (const m of game.monsters) {
        if (m.dead || m.def.boss || m.head || m.allied || !MACHINE_SPRITES.has(m.def.sprite)) continue;
        const d = Math.hypot(m.cx - p.cx, m.cy - p.cy);
        if (d < bd) { bd = d; best = m; }
      }
      if (!best) { game.fx.text(p.cx, p.y - 6, 'No machine in range', '#ff8fa8'); p.augCd = 60; return; }
      best.allied = 20 * 60;
      game.fx.burst(best.cx, best.cy, '#9dff3d', 20, 2.5);
      game.notify(best.def.name + ' hijacked!', '#9dff3d');
      break;
    }
  }
}

export function tickImplants(game, p) {
  if (p.augCd > 0) p.augCd--;
  if (p.reviveCd > 0) p.reviveCd--;
  const im = p.equip.implants || {};
  // launcher arm: auto micro-missiles
  if (im.arms && ITEMS[im.arms.k].autoMissile && game.tick % 150 === 0) {
    let tgt = null, bd = 460;
    for (const m of game.monsters) {
      if (m.dead || m.allied || m.def.friendly) continue;
      const d = Math.hypot(m.cx - p.cx, m.cy - p.cy);
      if (d < bd && game.los(p.cx, p.y + 10, m.cx, m.cy)) { bd = d; tgt = m; }
    }
    if (tgt) for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.5;
      game.spawnProjectile('micro_missile', p.cx - p.dir * 6, p.y + 10, Math.cos(a) * 5, Math.sin(a) * 5, Math.round(28 * p.dmgMult('ranged')), 2, 'player', { dmgType: 'ranged' });
    }
  }
  // kinetic legs stomp
  if (p.s.stomp && p.vy > 3 && !p.vehicle) {
    const feet = { x: p.x, y: p.y + p.h - 6, w: p.w, h: 10 };
    for (const m of game.monsters) {
      if (m.dead || m.allied || !rectsOverlap(feet, { x: m.x, y: m.y, w: m.w, h: m.h * 0.5 })) continue;
      game.damageMonster(m, Math.round((20 + p.vy * 6) * p.dmgMult('melee')), 4, sign(m.cx - p.cx) || 1, false, null);
      p.vy = -7; p.jumpsUsed = 0;
      game.fx.burst(p.cx, p.y + p.h, '#3dffb0', 12, 2.5);
      break;
    }
  }
}

export function tryRevive(game, p) {
  const im = p.equip.implants || {};
  if (!im.core || !ITEMS[im.core.k].revive || p.reviveCd > 0) return false;
  p.reviveCd = 5 * 60 * 60;
  p.life = Math.round(p.s.maxLife * 0.5);
  p.immune = 150;
  game.fx.burst(p.cx, p.cy, '#ff3355', 40, 4);
  game.notify('Nano-Heart reboot! Integrity restored.', '#ff5a8a');
  game.audio.play('levelup');
  return true;
}

// Allied (hijacked) machines hunt other monsters.
export function alliedTarget(game, m) {
  let best = null, bd = 600;
  for (const o of game.monsters) {
    if (o === m || o.dead || o.allied || o.def.friendly) continue;
    const d = Math.hypot(o.cx - m.cx, o.cy - m.cy);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

export function alliedContact(game, m) {
  if (game.tick % 20) return;
  for (const o of game.monsters) {
    if (o === m || o.dead || o.allied || o.def.friendly || !rectsOverlap(m, o)) continue;
    game.damageMonster(o, Math.max(10, m.dmg * 2), 4, sign(o.cx - m.cx) || 1, false, null);
  }
}

export const MANTIS = 'mantis_strike';
export function mantisDamage(game) { return 18 + Object.keys(game.world.flags.bosses).length * 7 + (game.world.flags.hardmode ? 20 : 0); }
export { MACHINE_SPRITES };
