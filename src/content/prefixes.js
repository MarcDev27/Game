// Random modifiers rolled onto crafted / looted weapons and accessories (reforgeable).
export const PREFIXES = {
  // weapons
  mythic: { name: 'Mythic', kind: 'weapon', dmg: 0.15, speed: 0.1, crit: 5, kb: 0.15, w: 1 },
  overclocked: { name: 'Overclocked', kind: 'weapon', dmg: 0.12, speed: 0.08, crit: 3, w: 2 },
  volatile: { name: 'Volatile', kind: 'weapon', dmg: 0.15, crit: 5, speed: -0.08, w: 3 },
  calibrated: { name: 'Calibrated', kind: 'weapon', dmg: 0.05, crit: 5, w: 4 },
  rapid: { name: 'Rapid', kind: 'weapon', speed: 0.15, w: 4 },
  powered: { name: 'Powered', kind: 'weapon', dmg: 0.1, w: 5 },
  heavy: { name: 'Heavy', kind: 'weapon', dmg: 0.05, kb: 0.25, speed: -0.05, w: 4 },
  precise: { name: 'Precise', kind: 'weapon', dmg: 0.05, crit: 3, w: 4 },
  light: { name: 'Light', kind: 'weapon', speed: 0.08, kb: -0.1, w: 4 },
  glitched: { name: 'Glitched', kind: 'weapon', dmg: -0.15, speed: -0.1, w: 3 },
  prototype: { name: 'Prototype', kind: 'weapon', dmg: -0.1, crit: -3, w: 3 },
  sluggish: { name: 'Sluggish', kind: 'weapon', speed: -0.15, w: 3 },
  damaged: { name: 'Damaged', kind: 'weapon', dmg: -0.15, w: 3 },
  // accessories
  plated: { name: 'Plated', kind: 'acc', def: 1, w: 4 },
  reinforced: { name: 'Reinforced', kind: 'acc', def: 2, w: 3 },
  fortified: { name: 'Fortified', kind: 'acc', def: 3, w: 2 },
  bastion: { name: 'Bastion', kind: 'acc', def: 4, w: 1 },
  tuned: { name: 'Tuned', kind: 'acc', crit: 2, w: 3 },
  lucky: { name: 'Lucky', kind: 'acc', crit: 4, w: 1 },
  amped: { name: 'Amped', kind: 'acc', dmg: 0.02, w: 3 },
  overcharged: { name: 'Overcharged', kind: 'acc', dmg: 0.04, w: 1 },
  agile: { name: 'Agile', kind: 'acc', move: 0.04, w: 2 },
  capacious: { name: 'Capacious', kind: 'acc', energy: 20, w: 2 },
};

export function prefixValueMult(p) {
  if (!p) return 1;
  const d = PREFIXES[p];
  let q = (d.dmg || 0) * 2 + (d.speed || 0) * 2 + (d.crit || 0) * 0.04 + (d.kb || 0) * 0.5 + (d.def || 0) * 0.1 + (d.move || 0) * 2 + (d.energy || 0) * 0.005;
  return Math.max(0.3, (1 + q) * (1 + q));
}

export function rollPrefix(item, rng, allowNegative = true) {
  let kind = null;
  if (item.type === 'weapon' && item.damage > 0) kind = 'weapon';
  else if (item.type === 'tool' && item.damage > 0) kind = 'weapon';
  else if (item.type === 'accessory') kind = 'acc';
  if (!kind) return null;
  if (rng.next() < 0.2) return null;
  const list = Object.entries(PREFIXES).filter(([, d]) => d.kind === kind && (allowNegative || ((d.dmg || 0) >= 0 && (d.speed || 0) >= 0)));
  let tot = 0; for (const [, d] of list) tot += d.w;
  let r = rng.next() * tot;
  for (const [k, d] of list) { r -= d.w; if (r <= 0) return k; }
  return list[0][0];
}
