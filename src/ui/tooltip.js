// Human-readable item descriptions.
import { ITEMS, ARMOR_SETS } from '../content/items.js';
import { PREFIXES, prefixValueMult } from '../content/prefixes.js';
import { RARITY_COLORS } from '../content/materials.js';
import { BUFFS } from '../content/buffs.js';
import { formatCredits } from '../core/util.js';
import { VEHICLES, IMPLANT_SLOT_NAMES } from '../content/items.js';

const STAT_TEXT = {
  defense: (v) => `+${v} defense`, allDmg: (v) => `+${Math.round(v * 100)}% damage`, meleeDmg: (v) => `+${Math.round(v * 100)}% melee damage`,
  rangedDmg: (v) => `+${Math.round(v * 100)}% ranged damage`, energyDmg: (v) => `+${Math.round(v * 100)}% energy damage`, summonDmg: (v) => `+${Math.round(v * 100)}% summon damage`,
  crit: (v) => `+${v}% critical chance`, meleeSpeed: (v) => `+${Math.round(v * 100)}% melee speed`, moveSpeed: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% movement speed`,
  runSpeed: () => 'Run much faster', jumpBoost: () => 'Jump higher', doubleJump: () => 'Double jump', flight: (v) => `Flight time ${(v / 60).toFixed(1)}s`,
  flightSpeed: () => null, rocket: () => 'Rocket flight (hold jump)', noFall: () => 'No fall damage', kbImmune: () => 'Immune to knockback',
  lifeRegen: (v) => `+${v} integrity regeneration`, energyRegen: () => 'Faster energy regeneration', maxEnergy: (v) => `+${v} max energy`,
  energyCost: (v) => `${Math.round(v * 100)}% energy cost`, minions: (v) => `+${v} drone slot${v > 1 ? 's' : ''}`, mineSpeed: (v) => `+${Math.round(v * 100)}% mining speed`,
  reach: (v) => `+${v} reach`, magnet: () => 'Larger pickup range', light: () => 'Provides light', dash: () => 'Enables dashing', wallClimb: () => 'Wall slide & wall jump',
  waterWalk: () => 'Walk on liquids', swim: () => 'Swim freely', plasmaWard: () => '7s of plasma immunity', coldImmune: () => 'Immune to Chill', burnImmune: () => 'Immune to Plasma Burn',
  thorns: (v) => `Reflects ${Math.round(v * 100)}% contact damage`, lifesteal: (v) => `Siphons ${Math.round(v * 100)}% of damage dealt`, dodge: (v) => `${Math.round(v * 100)}% dodge chance`,
  damageReduce: (v) => `${Math.round(v * 100)}% damage reduction`, berserk: () => 'Up to +30% damage at low integrity', immuneTime: () => 'Longer invulnerability', stimCooldown: () => '25% shorter stim cooldown',
  swarmRetaliate: () => 'Releases hornets when damaged', meleeKnock: () => 'Increased melee knockback', plasmaResist: () => 'Plasma resistance', maxLifePct: (v) => `+${Math.round(v * 100)}% max integrity`,
};

export function statLines(st) {
  const out = [];
  for (const k in st) {
    if (k.startsWith('info_')) { out.push('Shows ' + ({ depth: 'depth', time: 'time', pos: 'position', radar: 'nearby hostiles', ore: 'nearby ore', dps: 'damage per second' }[k.slice(5)] || k)); continue; }
    const f = STAT_TEXT[k];
    const s = f ? f(st[k]) : null;
    if (s) out.push(s);
  }
  return out;
}

function speedWord(t) {
  return t <= 8 ? 'Insanely fast' : t <= 15 ? 'Very fast' : t <= 20 ? 'Fast' : t <= 25 ? 'Average' : t <= 30 ? 'Slow' : t <= 40 ? 'Very slow' : 'Extremely slow';
}

export function itemTooltip(slot, player, extra = {}) {
  if (!slot) return '';
  const it = ITEMS[slot.k];
  if (!it) return '';
  const p = slot.p ? PREFIXES[slot.p] : null;
  const name = (p ? p.name + ' ' : '') + it.name;
  const col = RARITY_COLORS[it.rarity] || '#fff';
  let h = `<div class="nm" style="color:${col}">${name}${slot.n > 1 ? ` (${slot.n})` : ''}</div>`;
  const L = [];
  if (it.damage) {
    const dmg = player ? player.itemDamage(slot) : it.damage;
    L.push(`<span class="st">${dmg} ${it.dmgType || 'melee'} damage</span>`);
    if (player) L.push(`${player.itemCrit(slot)}% critical chance`);
    L.push(speedWord(player ? player.itemUseTime(slot) : it.useTime) + ' speed');
  }
  if (it.pick) L.push(`<span class="st">${it.pick}% pick power</span>`);
  if (it.axe) L.push(`<span class="st">${it.axe}% cutting power</span>`);
  if (it.hammer) L.push(`<span class="st">${it.hammer}% hammer power</span>`);
  if (it.energyCost) L.push(`Uses ${it.energyCost} energy`);
  if (it.ammo) L.push(`Uses ${it.ammo === 'round' ? 'rounds' : 'rockets'}`);
  if (it.type === 'ammo') L.push(`<span class="st">${it.ammoDmg} ranged damage</span>`, 'Ammunition');
  if (it.summonMinion) L.push(it.sentry ? 'Deploys a sentry' : 'Summons a drone');
  if (it.defense) L.push(`<span class="st">${it.defense} defense</span>`);
  if (it.type === 'armor' && it.stats) L.push(...statLines(it.stats));
  if (it.type === 'accessory') L.push(...statLines(it.stats || {}));
  if (it.type === 'hook') L.push(`Reach ${it.hookRange} tiles`);
  if (it.type === 'implant') { L.push(`<span class="st">${IMPLANT_SLOT_NAMES[it.slot]} implant · ${it.cost} capacity</span>`); L.push(...statLines(it.stats || {})); }
  if (it.type === 'vehicle') { const v = VEHICLES[it.vehicle]; L.push('<span class="st">Vehicle · equip, then RIDE (R)</span>'); L.push(...statLines(v.stats)); if (v.gun) L.push(`Cannon: ${v.gun.dmg} damage`); }
  if (it.consume) {
    const c = it.consume;
    if (c.heal) L.push(`<span class="bonus">Restores ${c.heal} integrity</span>`);
    if (c.energy) L.push(`<span class="bonus">Restores ${c.energy} energy</span>`);
    if (c.buff) L.push(`<span class="bonus">${BUFFS[c.buff].name}: ${BUFFS[c.buff].desc}</span>`, `${Math.round(c.time / 3600)} minute duration`);
  }
  if (it.place || it.placeWall) L.push('Can be placed');
  if (p) {
    const pl = [];
    if (p.dmg) pl.push(`${p.dmg > 0 ? '+' : ''}${Math.round(p.dmg * 100)}% damage`);
    if (p.speed) pl.push(`${p.speed > 0 ? '+' : ''}${Math.round(p.speed * 100)}% speed`);
    if (p.crit) pl.push(`${p.crit > 0 ? '+' : ''}${p.crit}% crit`);
    if (p.kb) pl.push(`${p.kb > 0 ? '+' : ''}${Math.round(p.kb * 100)}% knockback`);
    if (p.def) pl.push(`+${p.def} defense`);
    if (p.move) pl.push(`+${Math.round(p.move * 100)}% move speed`);
    if (p.energy) pl.push(`+${p.energy} max energy`);
    const bad = (p.dmg || 0) < 0 || (p.speed || 0) < 0 || (p.crit || 0) < 0;
    L.push(`<span class="${bad ? 'warn' : 'bonus'}">${pl.join(', ')}</span>`);
  }
  if (it.type === 'armor' && it.set && player) {
    const set = ARMOR_SETS[it.set];
    if (set && player.s.setBonus === it.set) L.push(`<span class="bonus">Set bonus: ${set.text}</span>`);
    else if (set) L.push(`<span style="color:#667">Set bonus: ${set.text}</span>`);
  }
  if (it.tip) L.push(`<i>${it.tip}</i>`);
  const sell = Math.floor((it.value || 0) * prefixValueMult(slot.p) / 5) * (slot.n || 1);
  if (extra.buy) L.push(`<span style="color:#ffe27a">Buy: ${formatCredits(extra.buy)} cr</span>`);
  else if (sell > 0) L.push(`<span style="color:#998a50">Sell: ${formatCredits(sell)} cr</span>`);
  h += L.join('\n');
  return h;
}

export function sellPrice(slot) {
  const it = ITEMS[slot.k];
  return Math.floor((it.value || 0) * prefixValueMult(slot.p) / 5) * slot.n;
}
