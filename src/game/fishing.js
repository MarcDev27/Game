// Fishing: bobber behavior, bite timing and catch tables.
import { TILE, rng, clamp } from '../core/util.js';
import { ITEMS, FISH } from '../content/items.js';
import { LIQ } from '../world/world.js';
import { addItem } from './inventory.js';

export function fishingPower(p, rod, baitKey) {
  return (rod.fishing || 0) + (baitKey ? ITEMS[baitKey].bait : 0) + (p.s.fishingPower || 0);
}

export function findBait(p) {
  let best = -1;
  for (let i = 0; i < p.inv.length; i++) {
    const s = p.inv[i];
    if (s && ITEMS[s.k].bait && (best < 0 || ITEMS[s.k].bait > ITEMS[p.inv[best].k].bait)) best = i;
  }
  return best;
}

export function updateBobber(b, game) {
  const w = game.world, p = game.player;
  const held = p.held();
  if (p.dead || !held || !held.fishing || Math.hypot(b.cx - p.cx, b.cy - p.cy) > 45 * TILE) { b.dead = true; return; }
  const tx = Math.floor(b.cx / TILE), ty = Math.floor(b.cy / TILE);
  const i = ty * w.w + tx;
  const inLiq = w.inb(tx, ty) && w.liq[i] > 40;
  if (inLiq) {
    const lt = w.liqT[i];
    if (lt === LIQ.plasma && !held.plasmaFishing) { game.fx.burst(b.cx, b.cy, '#ff5a2a', 6, 1.5); b.dead = true; game.fx.text(p.cx, p.y - 6, 'The line melted!', '#ff5a2a'); return; }
    b.vy = Math.max(b.vy - 0.55, -1.2); b.vx *= 0.85;
    b.floating = true; b.liqType = lt;
  } else {
    b.vy = Math.min(b.vy + 0.25, 8);
    if (b.floating && Math.abs(b.vy) < 1) b.vy = 0.3;
  }
  b.x += b.vx;
  if (w.solidAt(Math.floor(b.cx / TILE), ty)) { b.x -= b.vx; b.vx = 0; }
  b.y += b.vy;
  if (w.solidAt(Math.floor(b.cx / TILE), Math.floor(b.cy / TILE))) { b.y -= b.vy; b.vy = 0; b.vx *= 0.5; }
  if (!b.floating) return;
  if (b.wait === undefined) b.wait = newWait(b);
  if (b.bite > 0) {
    b.bite--;
    b.y += Math.sin(b.bite * 0.9) * 1.2;
    if (b.bite === 0) { b.wait = newWait(b); b.pending = null; }
  } else if (--b.wait <= 0) {
    b.bite = 40;
    b.pending = rollCatch(game, b);
    game.audio.play('splash');
    game.fx.burst(b.cx, b.cy, '#9ff4ff', 8, 1.5, false);
    if (p.s.sonar && b.pending) game.fx.text(b.cx, b.y - 10, ITEMS[b.pending].name, game.rarityColor(b.pending));
    else game.fx.text(b.cx, b.y - 10, '!', '#ffffff', true);
  }
}

function newWait(b) { return Math.round(rng.int(100, 520) * (1 - clamp(b.power / 200, 0, 0.65))); }

export function reelIn(game, b) {
  const p = game.player;
  b.dead = true;
  if (!(b.bite > 0) || !b.pending) { game.audio.play('throw'); return; }
  const k = b.pending;
  const left = addItem(p.inv, k, 1);
  if (left) game.dropItem(p.cx, p.cy, k, 1);
  p.discovered.add(k);
  game.fx.text(p.cx, p.y - 8, 'Caught ' + ITEMS[k].name + '!', game.rarityColor(k));
  game.audio.play('pickup');
  p.stats.fish = (p.stats.fish || 0) + 1;
  // consume bait
  const bi = findBait(p);
  if (bi >= 0 && !(p.s.baitSave && rng.chance(p.s.baitSave)) && !rng.chance(b.power / 300)) {
    p.inv[bi].n--; if (p.inv[bi].n <= 0) p.inv[bi] = null;
  }
  if (game.ui) game.ui.dirtyInv = true;
}

export function rollCatch(game, b) {
  const w = game.world;
  const tx = Math.floor(b.cx / TILE), ty = Math.floor(b.cy / TILE);
  let pool = 0;
  for (let y = ty - 6; y <= ty + 10; y++) for (let x = tx - 12; x <= tx + 12; x++) if (w.inb(x, y) && w.liq[y * w.w + x] > 60) pool++;
  let power = b.power;
  if (pool < 40) power *= 0.5;
  if (pool < 15 && rng.chance(0.6)) return rng.pick(['scrap', 'nanogel', 'bio_worm']);
  const env = game.spawner.env(tx, ty);
  const plasma = b.liqType === LIQ.plasma;
  if (!plasma && rng.chance(0.06 + power / 900)) {
    const r = rng.next() * 100;
    return r < power * 0.08 ? 'titanite_crate' : r < 15 + power * 0.3 ? 'ferrite_crate' : 'supply_crate';
  }
  if (!plasma && rng.chance(0.006 + power / 8000)) return rng.pick(['hydro_fins', 'hover_soles', 'tackle_box', 'angler_band', 'magnet_module']);
  const cands = [];
  for (const [k, , , , rar, where] of FISH) {
    if (plasma !== (where.liquid === 'plasma')) continue;
    if (where.biomes && !where.biomes.includes(env.biome)) continue;
    if (where.layers && !where.layers.includes(env.layer)) continue;
    if (where.minPower && power < where.minPower) continue;
    if (where.hard && !w.flags.hardmode) continue;
    if (where.night && w.isDay()) continue;
    const base = [10, 6, 3, 1.5, 1, 0.7, 0.5][rar] || 0.4;
    cands.push({ k, weight: base * Math.pow(1 + power / 50, rar / 2) });
  }
  if (!cands.length) return plasma ? null : 'coolant_carp';
  return rng.weighted(cands).k;
}

export function openCrate(game, tier) {
  const p = game.player;
  const out = [];
  const pick = (list) => list[Math.floor(rng.next() * list.length)];
  const bars = [['cuprite_bar', 'ferrite_bar'], ['ferrite_bar', 'titanite_bar'], ['titanite_bar', 'lumenite_bar', 'cryonite_bar']][tier - 1];
  out.push([pick(bars), rng.int(4, 10 + tier * 4)]);
  if (rng.chance(0.25 * tier)) out.push([pick(['hydro_fins', 'hover_soles', 'jump_module', 'grav_bubble', 'magnet_module', 'regen_band', 'tackle_box', 'angler_band', 'ion_boomerang', 'grapple_hook']), 1]);
  out.push([pick(['micro_stim', 'stim_pack']), rng.int(2, 5)]);
  if (rng.chance(0.6)) out.push([pick(['bio_worm', 'glow_grub', 'nano_larva']), rng.int(2, 6)]);
  if (rng.chance(0.4)) out.push([pick(Object.keys(ITEMS).filter((k) => k.endsWith('_inj'))), rng.int(1, 3)]);
  if (rng.chance(0.15 * tier)) out.push(['vital_core', 1]);
  if (tier >= 2 && rng.chance(0.3)) out.push(['star_shard', rng.int(2, 5)]);
  for (const [k, n] of out) { const left = addItem(p.inv, k, n, null); if (left) game.dropItem(p.cx, p.cy, k, left); p.discovered.add(k); }
  game.dropCredits(p.cx, p.cy, rng.int(500, 1500) * tier * (w2(game) ? 3 : 1));
  game.notify('Opened: ' + out.map(([k, n]) => ITEMS[k].name + (n > 1 ? ' ×' + n : '')).join(', '), '#ffe27a');
  game.audio.play('chest');
}
const w2 = (g) => g.world.flags.hardmode;
