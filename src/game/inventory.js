// Inventory helpers. Slots hold { k: itemKey, n: count, p?: prefixKey } or null.
import { ITEMS } from '../content/items.js';
import { GROUPS } from '../content/recipes.js';

export const INV_SIZE = 50;
export const HOTBAR = 10;

export function maxStack(k) { const it = ITEMS[k]; return it ? it.stack : 1; }

// Adds items; returns the number that did not fit.
export function addItem(slots, k, n, p = null, from = 0) {
  const ms = maxStack(k);
  if (ms > 1 && !p) {
    for (let i = from; i < slots.length && n > 0; i++) {
      const s = slots[i];
      if (s && s.k === k && !s.p && s.n < ms) { const m = Math.min(n, ms - s.n); s.n += m; n -= m; }
    }
  }
  for (let i = from; i < slots.length && n > 0; i++) {
    if (!slots[i]) { const m = Math.min(n, ms); slots[i] = { k, n: m }; if (p) slots[i].p = p; n -= m; }
  }
  return n;
}

export function canFit(slots, k, n) {
  const ms = maxStack(k);
  for (const s of slots) {
    if (!s) n -= ms;
    else if (s.k === k && !s.p) n -= ms - s.n;
    if (n <= 0) return true;
  }
  return n <= 0;
}

export function countItem(slots, k) {
  const keys = GROUPS[k] || [k];
  let c = 0;
  for (const s of slots) if (s && keys.includes(s.k)) c += s.n;
  return c;
}

export function removeItem(slots, k, n) {
  const keys = GROUPS[k] || [k];
  for (let i = slots.length - 1; i >= 0 && n > 0; i--) {
    const s = slots[i];
    if (s && keys.includes(s.k)) { const m = Math.min(n, s.n); s.n -= m; n -= m; if (s.n <= 0) slots[i] = null; }
  }
  return n <= 0;
}

export function sortInventory(slots, from = HOTBAR) {
  const items = slots.slice(from).filter(Boolean);
  // merge stacks
  const merged = [];
  for (const s of items) {
    const ms = maxStack(s.k);
    const m = merged.find((o) => o.k === s.k && !o.p && !s.p && o.n < ms);
    if (m) { const add = Math.min(ms - m.n, s.n); m.n += add; s.n -= add; if (s.n > 0) merged.push(s); }
    else merged.push(s);
  }
  const order = { weapon: 0, tool: 1, hook: 2, armor: 3, accessory: 4, ammo: 5, consumable: 6, furniture: 7, block: 8, wall: 9, material: 10 };
  merged.sort((a, b) => {
    const A = ITEMS[a.k], B = ITEMS[b.k];
    return (order[A.type] ?? 11) - (order[B.type] ?? 11) || B.rarity - A.rarity || B.value - A.value || A.name.localeCompare(B.name);
  });
  for (let i = from; i < slots.length; i++) slots[i] = merged[i - from] || null;
}
