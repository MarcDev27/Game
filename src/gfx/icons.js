// 16x16 item icons drawn procedurally from shape templates + palette.
import { makeCanvas, shade } from '../core/util.js';
import { ITEMS } from '../content/items.js';
import { T, W } from '../content/tiles.js';
import { ATLAS, tileIcon } from './textures.js';

const cache = new Map();   // key -> canvas
const urls = new Map();    // key -> dataURL

export function iconCanvas(key) {
  if (cache.has(key)) return cache.get(key);
  const it = ITEMS[key];
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  if (it) drawIcon(ctx, it);
  cache.set(key, c);
  return c;
}

export function iconURL(key) {
  if (urls.has(key)) return urls.get(key);
  const u = iconCanvas(key).toDataURL();
  urls.set(key, u);
  return u;
}

function drawIcon(ctx, it) {
  const ic = it.icon;
  if (ic.tile) {
    const id = T[ic.tile];
    ctx.drawImage(tileIcon(id), 0, 0);
    return;
  }
  if (ic.wall) {
    const id = W[ic.wall];
    ctx.drawImage(ATLAS.walls, 0, id * 16, 16, 16, 2, 2, 12, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(2, 2, 12, 1); ctx.fillRect(2, 13, 12, 1);
    return;
  }
  if (ic.furn) {
    const id = T[ic.furn];
    const sp = ATLAS.furn.get(id);
    if (sp) {
      const s = Math.min(16 / sp.width, 16 / sp.height);
      const w = Math.max(1, Math.round(sp.width * s)), h = Math.max(1, Math.round(sp.height * s));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sp, (16 - w) >> 1, (16 - h) >> 1, w, h);
    }
    return;
  }
  const c = ic.c || '#888', c2 = ic.c2 || shade(c, 0.55), hi = shade(c, 1.35), dk = shade(c, 0.6);
  const R = (col, x, y, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const diag = (col, x0, y0, n, w = 1) => { for (let i = 0; i < n; i++) R(col, x0 + i, y0 - i, w, w); };
  const circle = (cx, cy, r, col) => { ctx.fillStyle = col; for (let y = -r; y <= r; y++) { const h = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(cx - h, cy + y, h * 2, 1); } };
  switch (ic.s) {
    case 'bar': R(dk, 2, 7, 12, 6); R(c, 3, 6, 11, 5); R(hi, 4, 6, 9, 1); R(c2, 3, 11, 11, 1); break;
    case 'pick': diag('#6e5148', 3, 14, 10); diag(shade('#6e5148', 1.3), 3, 13, 9);
      R(c, 4, 2, 4, 2); R(c, 8, 3, 4, 2); R(c, 11, 5, 2, 4); R(c, 12, 8, 2, 4); R(hi, 5, 2, 3, 1); R(c2, 11, 9, 1, 3); R(c2, 4, 4, 3, 1); break;
    case 'drill': diag(c2, 2, 14, 6, 2); R(c, 7, 4, 6, 6); R(hi, 7, 4, 6, 1); R(dk, 12, 4, 1, 6); diag(c, 11, 4, 3); R('#ffffff', 14, 1); R(hi, 13, 2); break;
    case 'cutter': diag('#6e5148', 3, 14, 9); R(c, 9, 2, 5, 5); R(c, 7, 3, 3, 3); R(hi, 10, 2, 3, 1); R(c2, 13, 3, 1, 4); R('#2ef2ff', 11, 4); break;
    case 'knife': diag(c, 6, 10, 7); diag(hi, 6, 9, 6); R('#6e5148', 3, 11, 3, 3); R(c2, 5, 10, 2, 2); break;
    case 'blade': diag(c, 4, 12, 10, 2); diag(hi, 5, 11, 8); R(c2, 2, 11, 4, 2); R(c2, 4, 9, 2, 4); R('#6e5148', 1, 13, 2, 2); R(shade(c, 1.6), 13, 2); break;
    case 'spear': diag('#8a6b55', 1, 14, 11); R(c, 11, 2, 3, 3); R(hi, 13, 1, 2, 2); R(c, 10, 4, 2, 2); break;
    case 'mace': diag('#6e5148', 2, 14, 8); circle(11, 5, 4, c); R(hi, 9, 3, 2, 2); R(c2, 14, 5); R(c2, 11, 1); R(c2, 7, 5); break;
    case 'boomerang': R(c, 3, 3, 4, 3); R(c, 3, 3, 3, 10); R(c, 3, 3, 10, 3); R(hi, 4, 4, 8, 1); R(hi, 4, 4, 1, 8); R(c2, 5, 6, 1, 6); R(c2, 6, 5, 6, 1); break;
    case 'flail': circle(11, 11, 3, c); R(hi, 10, 9); for (let i = 0; i < 6; i++) R('#aeb7c2', 2 + i, 2 + i); R('#6e5148', 1, 1, 2, 2); break;
    case 'glove': R(c, 4, 6, 8, 8); R(c, 4, 3, 2, 4); R(c, 7, 2, 2, 4); R(c, 10, 3, 2, 4); R(hi, 5, 7, 6, 1); R(c2, 4, 12, 8, 2); break;
    case 'pistol': R(c, 3, 5, 10, 3); R(hi, 3, 5, 10, 1); R(c2, 4, 8, 3, 5); R(dk, 7, 8, 2, 2); R('#222', 13, 6); break;
    case 'rifle': R(c, 1, 6, 14, 3); R(hi, 1, 6, 14, 1); R(c2, 1, 9, 4, 3); R(c2, 7, 9, 2, 3); R('#222', 15, 7); R('#2ef2ff', 9, 5, 3, 1); break;
    case 'smg': R(c, 2, 5, 11, 4); R(hi, 2, 5, 11, 1); R(c2, 5, 9, 2, 5); R(c2, 9, 9, 2, 3); R('#222', 13, 6, 2, 1); break;
    case 'shotgun': R(c, 1, 6, 14, 2); R(c2, 1, 8, 9, 2); R(c2, 1, 10, 3, 2); R(hi, 1, 6, 14, 1); break;
    case 'sniper': R(c, 0, 7, 16, 2); R(hi, 0, 7, 16, 1); R(c2, 1, 9, 4, 3); R('#222', 6, 4, 5, 2); R('#ff3355', 10, 4); R(c2, 8, 9, 1, 3); break;
    case 'minigun': R(c, 1, 5, 13, 5); R(hi, 1, 5, 13, 1); R('#222', 14, 6, 2, 1); R('#222', 14, 8, 2, 1); R(c2, 4, 10, 4, 4); break;
    case 'launcher': R(c, 1, 5, 14, 5); R(hi, 1, 5, 14, 1); R('#222', 15, 6, 1, 3); R(c2, 5, 10, 3, 4); R('#ff3355', 2, 6, 2, 3); break;
    case 'raygun': R(c, 3, 5, 9, 4); R(hi, 3, 5, 9, 1); circle(12, 7, 2, c2); R('#ffffff', 13, 6); R(c2, 4, 9, 3, 5); R(hi, 5, 10); break;
    case 'staff': diag('#6e5148', 2, 15, 10); circle(12, 4, 3, c); R('#ffffff', 11, 3); R(c2, 9, 6, 2, 2); break;
    case 'wand': diag(c2, 3, 14, 8); R(c, 10, 3, 4, 4); R('#ffffff', 11, 4); R(hi, 13, 2); R(hi, 9, 2); break;
    case 'tome': R(c2, 3, 2, 10, 12); R(c, 4, 2, 9, 11); R(hi, 4, 2, 9, 1); R('#ffffff', 12, 3, 1, 10); R(shade(c, 1.6), 7, 6, 3, 3); break;
    case 'remote': R('#3a3d46', 5, 3, 6, 11); R(c, 6, 4, 4, 3); R('#ffffff', 7, 5); R(c2, 6, 9, 1, 1); R(c2, 9, 9, 1, 1); R(c2, 6, 11, 4, 1); R('#aeb7c2', 7, 0, 1, 3); break;
    case 'round': R(dk, 6, 5, 4, 9); R(c, 6, 4, 4, 8); R(hi, 7, 2, 2, 3); R('#c9a640', 6, 11, 4, 3); break;
    case 'rocket': R(c, 6, 3, 4, 9); R(hi, 7, 1, 2, 3); R(c2, 4, 10, 2, 4); R(c2, 10, 10, 2, 4); R('#ffcc33', 7, 13, 2, 2); break;
    case 'grenade': circle(8, 9, 5, c); R(hi, 6, 6, 2, 2); R('#aeb7c2', 7, 2, 3, 3); R('#555', 10, 3, 2, 1); break;
    case 'bomb': circle(8, 9, 5, c); R(hi, 5, 6, 2, 2); R(c2, 6, 9, 5, 1); R('#8a6b55', 8, 2, 1, 3); R('#ffcc33', 9, 1); break;
    case 'shuriken': R(c, 7, 2, 2, 12); R(c, 2, 7, 12, 2); R(hi, 7, 2, 1, 5); R(dk, 7, 7, 2, 2); break;
    case 'helmet': R(c, 3, 3, 10, 9); R(hi, 4, 3, 8, 1); R(dk, 3, 11, 10, 2); R('#0e1e24', 5, 7, 6, 3); R(shade(c2, 1.6), 6, 8, 4, 1); break;
    case 'chest': R(c, 2, 3, 12, 10); R(c, 1, 3, 3, 5); R(c, 12, 3, 3, 5); R(hi, 3, 3, 10, 1); R(c2, 7, 4, 2, 8); R(dk, 3, 12, 10, 1); break;
    case 'legs': R(c, 3, 2, 10, 4); R(c, 3, 6, 4, 8); R(c, 9, 6, 4, 8); R(hi, 4, 2, 8, 1); R(c2, 3, 13, 4, 1); R(c2, 9, 13, 4, 1); break;
    case 'boots': R(c, 4, 2, 5, 10); R(c, 4, 10, 9, 4); R(hi, 5, 2, 3, 1); R(c2, 4, 13, 9, 1); R(c2, 9, 11, 3, 1); break;
    case 'wings': R(c, 6, 4, 4, 8); R(c2, 2, 3, 4, 10); R(c2, 10, 3, 4, 10); R(hi, 7, 4, 2, 1); R('#2ef2ff', 3, 5, 2, 6); R('#2ef2ff', 11, 5, 2, 6); R('#ffb12e', 7, 12, 2, 3); break;
    case 'stim': R('#aeb7c2', 6, 1, 4, 3); R(dk, 4, 4, 8, 11); R(c, 5, 6, 6, 8); R(hi, 6, 7, 1, 5); R('#ffffff', 7, 8, 2, 1); R('#ffffff', 7.5 | 0, 7, 1, 3); break;
    case 'cell': R('#3a3d46', 4, 3, 8, 12); R(c, 5, 6, 6, 8); R(hi, 6, 7, 1, 5); R('#aeb7c2', 6, 1, 4, 2); break;
    case 'injector': R('#aeb7c2', 7, 0, 2, 4); R(dk, 5, 4, 6, 9); R(c, 6, 5, 4, 7); R(hi, 6, 6, 1, 4); R('#aeb7c2', 7, 13, 2, 3); break;
    case 'chip': R(dk, 3, 3, 10, 10); R(c, 4, 4, 8, 8); R(c2, 6, 6, 4, 4); for (let i = 4; i < 12; i += 2) { R('#aeb7c2', i, 1, 1, 2); R('#aeb7c2', i, 13, 1, 2); } break;
    case 'gem': circle(8, 8, 5, c); R(hi, 6, 5, 2, 2); break;
    case 'orb': circle(8, 8, 5, c); circle(8, 8, 3, c2); R('#ffffff', 6, 5, 2, 2); break;
    case 'heart': R(c, 2, 4, 5, 5); R(c, 9, 4, 5, 5); R(c, 3, 8, 10, 3); R(c, 5, 11, 6, 2); R(c, 7, 13, 2, 1); R(hi, 3, 5, 2, 2); break;
    case 'star': R(c, 7, 1, 2, 14); R(c, 1, 7, 14, 2); R(c, 4, 4, 8, 8); R(hi, 6, 5, 2, 2); R(c2, 10, 10, 1, 1); break;
    case 'shard': R(c, 7, 2, 3, 12); R(c, 5, 5, 2, 7); R(c, 10, 4, 2, 6); R(hi, 8, 3, 1, 8); R(c2, 5, 11, 2, 2); break;
    case 'scale': R(c, 4, 3, 8, 10); R(c, 5, 12, 6, 2); R(hi, 5, 4, 2, 6); R(c2, 8, 5, 3, 1); R(c2, 8, 8, 3, 1); break;
    case 'gel': R(c, 3, 7, 10, 7); R(c, 5, 5, 6, 2); R(hi, 5, 7, 3, 2); ctx.globalAlpha = 0.5; R('#ffffff', 9, 9, 2, 2); ctx.globalAlpha = 1; R(dk, 3, 13, 10, 1); break;
    case 'lens': circle(8, 8, 6, '#e8e8e8'); circle(8, 8, 4, c); circle(8, 8, 2, '#111'); R(c2, 6, 6, 1, 1); break;
    case 'gear': circle(8, 8, 5, c); circle(8, 8, 2, '#222'); for (const [x, y] of [[7, 1], [7, 13], [1, 7], [13, 7]]) R(c, x, y, 2, 2); R(hi, 5, 5, 2, 1); break;
    case 'core': circle(8, 8, 6, c2); circle(8, 8, 4, c); R('#ffffff', 6, 6, 2, 2); break;
    case 'soul': ctx.globalAlpha = 0.4; circle(8, 8, 6, c); ctx.globalAlpha = 1; circle(8, 8, 3, c); R('#ffffff', 7, 7, 2, 2); break;
    case 'matrix': R(dk, 2, 2, 12, 12); for (let y = 3; y < 13; y += 3) for (let x = 3; x < 13; x += 3) R(c, x, y, 2, 2); R('#ffffff', 6, 6, 2, 2); break;
    case 'fragment': R(c, 6, 1, 4, 3); R(c, 4, 4, 8, 6); R(c, 6, 10, 4, 4); R(hi, 6, 4, 2, 3); R(shade(c, 0.5), 9, 8, 2, 3); break;
    case 'key': circle(5, 5, 3, c); R('#111', 4, 4, 2, 2); R(c, 7, 6, 7, 2); R(c, 11, 8, 1, 3); R(c, 13, 8, 1, 2); R(hi, 4, 2, 2, 1); break;
    case 'hook': R('#aeb7c2', 2, 13, 1, 1); for (let i = 0; i < 7; i++) R('#8a8f99', 2 + i, 13 - i); R(c, 9, 3, 2, 6); R(c, 11, 2, 3, 2); R(c, 7, 2, 2, 2); R(hi, 9, 3, 1, 4); break;
    case 'seed': circle(8, 9, 4, c); R(c2, 7, 2, 2, 4); R(shade(c2, 1.3), 9, 3, 3, 2); R(shade(c, 1.3), 6, 7, 2, 2); break;
    case 'herb': R('#3a8a4a', 7, 7, 2, 8); R('#3a8a4a', 4, 10, 3, 2); R(c, 5, 2, 6, 5); R(shade(c, 1.4), 7, 3, 2, 2); break;
    case 'mushroom': R(c, 3, 4, 10, 5); R(hi, 4, 4, 3, 2); R('#e8e0d0', 6, 9, 4, 5); R('#ffffff', 10, 5, 2, 2); break;
    case 'leaf': R(c, 4, 4, 8, 8); R(c, 6, 2, 4, 2); R(c, 6, 12, 4, 2); R(c2, 7, 3, 2, 12); R(hi, 5, 5, 2, 2); break;
    case 'feather': for (let i = 0; i < 10; i++) R(i % 2 ? c : c2, 3 + i, 13 - i, 3, 2); R('#ffffff', 11, 3); break;
    case 'cable': for (let i = 0; i < 4; i++) { R(c, 3, 3 + i * 3, 10, 2); R(shade(c, 0.7), 3, 4 + i * 3, 10, 1); } break;
    case 'cloth': R(c, 2, 3, 12, 10); R(c2, 2, 6, 12, 1); R(c2, 2, 10, 12, 1); R(hi, 3, 3, 10, 1); break;
    case 'bone': R(c, 4, 7, 8, 2); R(c, 2, 5, 3, 3); R(c, 2, 8, 3, 3); R(c, 11, 5, 3, 3); R(c, 11, 8, 3, 3); R('#ffffff', 5, 7, 5, 1); break;
    case 'needle': for (let i = 0; i < 10; i++) R(i < 3 ? '#ffffff' : c, 3 + i, 12 - i); R(c2, 12, 3, 2, 2); break;
    case 'dust': for (const [x, y] of [[4, 4], [9, 3], [6, 8], [11, 9], [3, 11], [8, 12], [12, 5]]) R(c, x, y, 2, 2); R('#ffffff', 7, 6); break;
    case 'skull': R(c, 3, 2, 10, 9); R(c, 5, 11, 6, 3); R('#111', 5, 5, 2, 3); R('#111', 9, 5, 2, 3); R(c2, 6, 5, 1, 1); R(c2, 10, 5, 1, 1); R(dk, 6, 12, 1, 2); R(dk, 9, 12, 1, 2); break;
    case 'flare': R(c, 6, 4, 4, 10); R(hi, 7, 4, 1, 10); R('#ffcc33', 6, 1, 4, 3); R('#ffffff', 7, 2, 2, 1); break;
    case 'module': R(dk, 3, 4, 10, 9); R(c, 4, 5, 8, 7); R(c2, 6, 7, 4, 3); R('#ffffff', 7, 8); R('#aeb7c2', 6, 1, 4, 3); break;
    case 'shield': R(c, 3, 2, 10, 8); R(c, 4, 10, 8, 2); R(c, 6, 12, 4, 2); R(hi, 4, 3, 8, 1); R(c2, 7, 4, 2, 8); break;
    case 'band': R(c, 3, 5, 10, 6); R('#111', 5, 7, 6, 2); R(hi, 4, 5, 8, 1); R(c2, 7, 4, 2, 1); break;
    case 'meter': R('#3a3d46', 3, 2, 10, 12); R(c, 4, 3, 8, 7); R(c2, 5, 5, 4, 1); R(c2, 5, 7, 6, 1); R('#aeb7c2', 5, 11, 2, 2); R('#ff3355', 9, 11, 2, 2); break;
    case 'scope': R(c, 2, 6, 12, 4); R(hi, 2, 6, 12, 1); circle(3, 8, 2, c2); R('#ffffff', 13, 7); break;
    case 'drone': circle(8, 9, 4, c); R(c2, 3, 4, 10, 1); R('#aeb7c2', 7, 4, 2, 2); R('#ffffff', 7, 8, 2, 2); break;
    case 'magnet': R(c, 3, 3, 3, 9); R(c, 10, 3, 3, 9); R(c, 3, 10, 10, 3); R(c2, 3, 3, 3, 2); R(c2, 10, 3, 3, 2); break;
    case 'emblem': circle(8, 8, 6, c2); circle(8, 8, 4, c); R(shade(c, 1.6), 7, 4, 2, 8); R(shade(c, 1.6), 4, 7, 8, 2); break;
    case 'rod': for (let i = 0; i < 12; i++) R(i < 3 ? '#6e5148' : c, 2 + i, 14 - i); R('#e8e8e8', 14, 2, 1, 9); R('#ff3355', 13, 11, 3, 2); R('#aeb7c2', 4, 11, 2, 2); break;
    case 'grub': for (let i = 0; i < 4; i++) R(i % 2 ? c : dk, 3 + i * 3, 8 + (i % 2), 3, 4); R('#111', 13, 9, 1, 1); break;
    case 'fish': R(c, 3, 6, 9, 5); R(c, 11, 5, 2, 7); R(c, 13, 4, 2, 2); R(c, 13, 11, 2, 2); R(hi, 4, 6, 7, 1); R(dk, 3, 10, 9, 1); R('#111', 5, 7, 1, 1); R(dk, 7, 4, 3, 2); break;
    case 'crate': R(dk, 2, 3, 12, 11); R(c, 3, 4, 10, 9); R(c2, 3, 8, 10, 1); R(c2, 7, 4, 2, 9); R(hi, 3, 4, 10, 1); break;
    case 'bike': R(c2, 1, 8, 13, 3); R(c, 2, 6, 10, 3); R(c, 11, 4, 4, 3); R('#2ef2ff', 2, 12, 4, 1); R('#2ef2ff', 9, 12, 4, 1); R(hi, 3, 6, 6, 1); break;
    case 'car': R(c2, 1, 7, 14, 5); R(c, 2, 6, 12, 4); R('rgba(150,230,255,0.8)', 5, 3, 6, 4); R('#ffb12e', 0, 8, 1, 2); R('#2ef2ff', 3, 12, 3, 1); R('#2ef2ff', 10, 12, 3, 1); break;
    case 'pod': R(c2, 2, 3, 10, 10); R(c, 3, 4, 8, 8); R('#0e1e24', 4, 6, 4, 3); R('#2ef2ff', 5, 7, 2, 1); R('#aeb7c2', 12, 5, 3, 6); R('#aeb7c2', 15, 7, 1, 2); break;
    case 'mech': R(c, 3, 3, 10, 7); R('#0e1e24', 5, 4, 6, 3); R('#2ef2ff', 6, 5, 4, 1); R(dk, 4, 10, 3, 5); R(dk, 9, 10, 3, 5); R('#333', 12, 5, 4, 2); break;
    case 'ship': R(c2, 1, 7, 14, 4); R(c, 3, 6, 11, 3); R('rgba(208,160,255,0.8)', 7, 3, 4, 3); R('#ffffff', 0, 8, 1, 2); R('#2ef2ff', 13, 7, 2, 1); break;
    case 'implant_neural': R('#59616c', 4, 4, 8, 8); R(c, 5, 5, 6, 6); for (let i = 0; i < 4; i++) { R(c, 2, 5 + i * 2, 2, 1); R(c, 12, 5 + i * 2, 2, 1); } R('#ffffff', 7, 7, 2, 2); break;
    case 'implant_optic': circle(8, 8, 6, '#59616c'); circle(8, 8, 4, c); circle(8, 8, 2, '#111'); R('#ffffff', 6, 6, 1, 1); break;
    case 'implant_arms': R('#59616c', 3, 3, 4, 11); R(c, 4, 4, 2, 9); R('#aeb7c2', 7, 10, 6, 3); R(c, 9, 2, 2, 8); break;
    case 'implant_spine': for (let i = 0; i < 6; i++) R(i % 2 ? '#aeb7c2' : c, 6, 1 + i * 2 + i, 4, 2); R(dk, 7, 1, 2, 14); break;
    case 'implant_legs': R('#59616c', 4, 2, 3, 12); R('#59616c', 9, 2, 3, 12); R(c, 4, 7, 3, 2); R(c, 9, 7, 3, 2); R('#aeb7c2', 3, 13, 5, 2); R('#aeb7c2', 8, 13, 5, 2); break;
    case 'implant_core': circle(8, 8, 6, '#59616c'); circle(8, 8, 4, c); R('#ffffff', 7, 7, 2, 2); R(c, 1, 7, 2, 2); R(c, 13, 7, 2, 2); break;
    default: R(c, 3, 3, 10, 10); R(hi, 3, 3, 10, 1);
  }
}
