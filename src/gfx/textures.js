// Procedural pixel-art textures for tiles, walls and furniture, baked into atlases at boot.
import { TILES, WALLS, BLOCKY, TREES } from '../content/tiles.js';
import { hexToRgb, hash2, makeCanvas, shade, clamp } from '../core/util.js';
import { drawFurniture } from './furniture.js';

export const ATLAS = { tiles: null, tileRow: null, walls: null, sprites: new Map(), furn: new Map(), canopy: new Map() };
const S = 16;

function buf() { return new Uint8ClampedArray(S * S * 4); }
function setPx(b, x, y, r, g, bl, a = 255) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 4; b[i] = r; b[i + 1] = g; b[i + 2] = bl; b[i + 3] = a;
}
function getPx(b, x, y) { const i = (y * S + x) * 4; return [b[i], b[i + 1], b[i + 2], b[i + 3]]; }
function mulPx(b, x, y, f) { const i = (y * S + x) * 4; b[i] = clamp(b[i] * f, 0, 255); b[i + 1] = clamp(b[i + 1] * f, 0, 255); b[i + 2] = clamp(b[i + 2] * f, 0, 255); }
function liftPx(b, x, y, f) { const i = (y * S + x) * 4; b[i] += (255 - b[i]) * f; b[i + 1] += (255 - b[i + 1]) * f; b[i + 2] += (255 - b[i + 2]) * f; }

function vnoise(x, y, seed, scale) {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

// Fill a 16x16 buffer for a given style.
function baseTexture(tex, variant, seed) {
  const b = buf();
  const [r, g, bl] = hexToRgb(tex.c);
  const st = tex.style;
  const h = (x, y, k = 0) => hash2(x + variant * 31, y + k * 17, seed);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let f = 1, a = 255;
    switch (st) {
      case 'soil': {
        f = 0.92 + h(x, y) * 0.16;
        const n = vnoise(x + variant * 16, y, seed, 4);
        f *= 0.9 + n * 0.2;
        if (h(x, y, 1) < 0.06) f *= 0.7;
        if (h(x, y, 2) < 0.04) f *= 1.25;
        break;
      }
      case 'rock': case 'strata': {
        const n = vnoise(x + variant * 16, y, seed, 5);
        f = 0.85 + n * 0.3 + h(x, y) * 0.06;
        if (st === 'strata') f *= 0.9 + Math.sin(y * 0.9 + variant * 2) * 0.1;
        const crack = vnoise(x + variant * 16, y, seed + 9, 3);
        if (Math.abs(crack - 0.5) < 0.035) f *= 0.72;
        break;
      }
      case 'sand': f = 0.93 + h(x, y) * 0.14; if (h(x, y, 3) < 0.05) f *= 1.15; break;
      case 'ice': {
        f = 0.95 + (1 - (x + y) / 30) * 0.12 + h(x, y) * 0.04;
        if ((x + y + variant * 3) % 9 === 0) f *= 1.18;
        break;
      }
      case 'goo': {
        const n = vnoise(x + variant * 16, y, seed, 3);
        f = 0.8 + n * 0.4;
        if (n > 0.72) f *= 1.15;
        break;
      }
      case 'crystal': {
        const k = ((x * 3 + y * 5 + variant * 7) >> 3) % 3;
        f = [0.85, 1.0, 1.18][k] + h(x, y) * 0.04;
        if ((x - y + 16 + variant * 5) % 8 === 0) f *= 1.2;
        break;
      }
      case 'cloud': f = 1 - (y / S) * 0.12 + vnoise(x + variant * 16, y, seed, 4) * 0.08; break;
      case 'hex': {
        const yy = y % 8, xx = (x + (Math.floor(y / 8) % 2) * 4) % 8;
        const edge = yy === 0 || xx === 0;
        f = edge ? 0.7 : 1 + h(x, y) * 0.06 - yy * 0.015;
        break;
      }
      case 'plate': {
        f = 0.96 + h(x, y) * 0.04;
        if (x === 0 || y === 0) f = 1.18;
        if (x === S - 1 || y === S - 1) f = 0.7;
        if (variant === 1 && y === 7) f = 0.72; if (variant === 1 && y === 8) f = 1.12;
        if (variant === 2 && x === 7) f = 0.72; if (variant === 2 && x === 8) f = 1.12;
        if ((x === 2 || x === 13) && (y === 2 || y === 13)) f = 1.35;
        break;
      }
      case 'brick': {
        const row = Math.floor(y / 4);
        const off = (row % 2) * 4 + variant * 2;
        const xx = (x + off) % 8;
        if (y % 4 === 3 || xx === 7) f = 0.62;
        else f = 0.92 + hash2(Math.floor((x + off) / 8), row, seed + variant) * 0.16 + h(x, y) * 0.05 + (y % 4 === 0 ? 0.08 : 0);
        break;
      }
      case 'wood': {
        const row = Math.floor(y / 4);
        if (y % 4 === 3) f = 0.68;
        else {
          f = 0.9 + hash2(row, variant, seed) * 0.15;
          f *= 0.94 + Math.sin(x * 0.7 + row * 3 + hash2(row, 1, seed) * 6) * 0.06;
          if ((x + row * 5 + variant * 3) % 13 === 0) f *= 0.8;
        }
        break;
      }
      case 'glass': {
        const edge = x === 0 || y === 0 || x === S - 1 || y === S - 1;
        a = edge ? 200 : 70;
        f = edge ? 1.15 : 1;
        if (!edge && (x + y === 8 + variant || x + y === 10 + variant)) { a = 170; f = 1.5; }
        break;
      }
      case 'circuit': {
        f = 0.85 + h(x, y) * 0.1;
        break;
      }
      case 'neon': {
        const ex = Math.min(x, y, S - 1 - x, S - 1 - y);
        f = ex === 0 ? 0.55 : ex === 1 ? 0.85 : 1.05 + (ex > 3 ? 0.15 : 0);
        break;
      }
      case 'grid': {
        f = 0.9 + h(x, y) * 0.1;
        if (x === 0 || x === S - 1 || y === 0 || y === S - 1) f = 1.25;
        break;
      }
      case 'ore': {
        const n = vnoise(x + variant * 16, y, seed, 5);
        f = 0.85 + n * 0.3 + h(x, y) * 0.06;
        break;
      }
      default: f = 1;
    }
    setPx(b, x, y, r * f, g * f, bl * f, a);
  }
  // overlays
  if (st === 'circuit' || st === 'grid') {
    const [gr, gg, gb] = hexToRgb(tex.glow || '#2ef2ff');
    if (st === 'circuit') {
      let x = 2 + variant * 3, y = 3;
      for (let k = 0; k < 22; k++) {
        setPx(b, x, y, gr, gg, gb);
        const d = hash2(k, variant, seed) * 4 | 0;
        if (d === 0) x++; else if (d === 1) y++; else if (d === 2) x--; else y--;
        x = clamp(x, 2, 13); y = clamp(y, 2, 13);
      }
      setPx(b, 3, 12, gr, gg, gb); setPx(b, 12, 4, gr, gg, gb);
    } else {
      for (let x = 1; x < S - 1; x++) for (const y of [4, 8, 12]) setPx(b, x, y, gr, gg, gb, (x + y + variant) % 3 ? 255 : 160);
    }
  }
  if (st === 'ore') {
    const [or, og, ob] = hexToRgb(tex.ore);
    const [dr, dg, db] = hexToRgb(tex.oreDark || shade(tex.ore, 0.5));
    const n = 4 + (variant % 2);
    for (let k = 0; k < n; k++) {
      const cx = 2 + Math.floor(hash2(k, variant, seed + 5) * 11), cy = 2 + Math.floor(hash2(k, variant, seed + 6) * 11);
      const pts = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]];
      const m = 3 + Math.floor(hash2(k, variant, seed + 7) * 3);
      for (let p = 0; p < m; p++) setPx(b, cx + pts[p][0], cy + pts[p][1], or, og, ob);
      setPx(b, cx, cy, Math.min(255, or + 60), Math.min(255, og + 60), Math.min(255, ob + 60));
      setPx(b, cx + 1, cy + 2, dr, dg, db); setPx(b, cx + 2, cy + 1, dr, dg, db);
    }
  }
  if (st === 'soil' && !tex.grass) {
    for (let k = 0; k < 2; k++) {
      const cx = 2 + Math.floor(hash2(k, variant, seed + 11) * 11), cy = 2 + Math.floor(hash2(k, variant, seed + 12) * 11);
      mulPx(b, cx, cy, 0.75); mulPx(b, cx + 1, cy, 0.75); liftPx(b, cx, cy - 1, 0.15);
    }
  }
  return b;
}

// Apply exposed-edge shading (mask bits: 1 up, 2 right, 4 down, 8 left).
function applyEdges(src, mask, tex, variant, seed) {
  const b = new Uint8ClampedArray(src);
  const up = mask & 1, rt = mask & 2, dn = mask & 4, lf = mask & 8;
  const glassy = tex.style === 'glass';
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let edge = 99;
    if (up) edge = Math.min(edge, y);
    if (dn) edge = Math.min(edge, S - 1 - y);
    if (lf) edge = Math.min(edge, x);
    if (rt) edge = Math.min(edge, S - 1 - x);
    if (edge === 0 && !glassy) mulPx(b, x, y, 0.42);
    else if (edge === 1 && up && y === 1 && !glassy) liftPx(b, x, y, 0.18);
  }
  // rounded corners
  const cut = (x, y) => { const i = (y * S + x) * 4; b[i + 3] = 0; };
  if (up && lf) { cut(0, 0); cut(1, 0); cut(0, 1); mulPx(b, 1, 1, 0.5); }
  if (up && rt) { cut(15, 0); cut(14, 0); cut(15, 1); mulPx(b, 14, 1, 0.5); }
  if (dn && lf) { cut(0, 15); cut(1, 15); cut(0, 14); mulPx(b, 1, 14, 0.5); }
  if (dn && rt) { cut(15, 15); cut(14, 15); cut(15, 14); mulPx(b, 14, 14, 0.5); }
  if (tex.grass) {
    const [gr, gg, gb] = hexToRgb(tex.grass);
    const paint = (x, y, f) => setPx(b, x, y, Math.min(255, gr * f), Math.min(255, gg * f), Math.min(255, gb * f));
    for (let x = 0; x < S; x++) {
      if (up) {
        const d = 2 + Math.floor(hash2(x, variant, seed + 21) * 3);
        for (let y = 0; y < d; y++) { const i = (y * S + x) * 4; if (b[i + 3]) paint(x, y, y === 0 ? 1.25 : y === d - 1 ? 0.75 : 1); }
      }
      if (dn) {
        const d = 1 + Math.floor(hash2(x, variant, seed + 22) * 2);
        for (let y = S - d; y < S; y++) { const i = (y * S + x) * 4; if (b[i + 3]) paint(x, y, 0.8); }
      }
    }
    for (let y = 0; y < S; y++) {
      if (lf) { const d = 1 + Math.floor(hash2(y, variant, seed + 23) * 2); for (let x = 0; x < d; x++) { const i = (y * S + x) * 4; if (b[i + 3]) paint(x, y, 0.95); } }
      if (rt) { const d = 1 + Math.floor(hash2(y, variant, seed + 24) * 2); for (let x = S - d; x < S; x++) { const i = (y * S + x) * 4; if (b[i + 3]) paint(x, y, 0.95); } }
    }
  }
  return b;
}

function putBuf(ctx, b, x, y) {
  const img = new ImageData(b, S, S);
  ctx.putImageData(img, x, y);
}

function spriteCanvas(w = S, h = S) { const c = makeCanvas(w, h); const ctx = c.getContext('2d'); return [c, ctx]; }

function drawPlatform(ctx, ox, c, mask) {
  const base = c, dark = shade(c, 0.6), light = shade(c, 1.25);
  ctx.fillStyle = base; ctx.fillRect(ox, 0, 16, 4);
  ctx.fillStyle = light; ctx.fillRect(ox, 0, 16, 1);
  ctx.fillStyle = dark; ctx.fillRect(ox, 3, 16, 1);
  ctx.fillStyle = dark;
  if (!(mask & 8)) ctx.fillRect(ox, 0, 1, 4);
  if (!(mask & 2)) ctx.fillRect(ox + 15, 0, 1, 4);
  ctx.fillStyle = shade(c, 0.75);
  ctx.fillRect(ox + 3, 4, 2, 3); ctx.fillRect(ox + 11, 4, 2, 3);
}

function drawSimple(t) {
  const tex = t.tex, c = tex.c;
  const [cv, ctx] = spriteCanvas();
  switch (tex.style) {
    case 'torch': {
      ctx.fillStyle = '#6b7380'; ctx.fillRect(7, 7, 2, 8);
      ctx.fillStyle = '#aeb7c2'; ctx.fillRect(7, 7, 1, 8);
      ctx.fillStyle = c; ctx.fillRect(6, 2, 4, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(7, 3, 2, 3);
      break;
    }
    case 'cable': {
      ctx.fillStyle = shade(c, 0.7); ctx.fillRect(7, 0, 3, 16);
      ctx.fillStyle = c; ctx.fillRect(7, 0, 2, 16);
      ctx.fillStyle = shade(c, 1.3); for (let y = 1; y < 16; y += 4) ctx.fillRect(7, y, 2, 1);
      break;
    }
    case 'grassblade': {
      ctx.fillStyle = c;
      for (let k = 0; k < 5; k++) {
        const x = 2 + k * 3, hgt = 4 + ((k * 7 + 3) % 6);
        ctx.fillRect(x, 16 - hgt, 1, hgt);
        ctx.fillRect(x + (k % 2 ? 1 : -1), 16 - hgt + 1, 1, 2);
      }
      ctx.fillStyle = shade(c, 1.3); ctx.fillRect(5, 9, 1, 2); ctx.fillRect(11, 8, 1, 2);
      break;
    }
    case 'herb': {
      ctx.fillStyle = '#3a8a4a'; ctx.fillRect(7, 8, 2, 8); ctx.fillRect(4, 11, 3, 2); ctx.fillRect(9, 10, 3, 2);
      ctx.fillStyle = c; ctx.fillRect(5, 3, 6, 5); ctx.fillStyle = shade(c, 1.4); ctx.fillRect(7, 4, 2, 2);
      ctx.fillStyle = shade(c, 0.7); ctx.fillRect(5, 7, 6, 1);
      break;
    }
    case 'sapling': {
      ctx.fillStyle = '#8a6b55'; ctx.fillRect(7, 8, 2, 8);
      ctx.fillStyle = c; ctx.fillRect(4, 5, 4, 3); ctx.fillRect(8, 3, 4, 4);
      break;
    }
    case 'web': {
      ctx.strokeStyle = 'rgba(220,230,240,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, 16); ctx.moveTo(16, 0); ctx.lineTo(0, 16); ctx.moveTo(8, 0); ctx.lineTo(8, 16); ctx.moveTo(0, 8); ctx.lineTo(16, 8); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,230,240,0.45)'; ctx.strokeRect(3.5, 3.5, 9, 9);
      break;
    }
    case 'trunk': {
      const dark = shade(c, 0.65), light = shade(c, 1.2);
      ctx.fillStyle = c; ctx.fillRect(3, 0, 10, 16);
      ctx.fillStyle = dark; ctx.fillRect(3, 0, 1, 16); ctx.fillRect(12, 0, 1, 16);
      ctx.fillRect(6, 2, 1, 5); ctx.fillRect(9, 8, 1, 6);
      ctx.fillStyle = light; ctx.fillRect(4, 0, 1, 16); ctx.fillRect(7, 10, 1, 3);
      const tr = t.tree;
      if (tr) { ctx.fillStyle = tr.leaf; ctx.globalAlpha = 0.6; ctx.fillRect(10, 4, 1, 3); ctx.fillRect(5, 12, 1, 2); ctx.globalAlpha = 1; }
      break;
    }
    default:
      ctx.fillStyle = c || '#f0f'; ctx.fillRect(2, 2, 12, 12);
  }
  return cv;
}

function drawCanopy(tr) {
  const isPalm = tr.key === 'rustpalm', isPine = tr.key === 'cryopine';
  const W = 80, H = 80;
  const [cv, ctx] = spriteCanvas(W, H);
  const leaf = tr.leaf, l2 = tr.leaf2, l3 = shade(tr.leaf, 1.25);
  const blob = (x, y, r, col) => {
    ctx.fillStyle = col;
    for (let yy = -r; yy <= r; yy++) {
      const half = Math.round(Math.sqrt(r * r - yy * yy));
      ctx.fillRect(x - half, y + yy, half * 2, 1);
    }
  };
  if (isPalm) {
    ctx.fillStyle = l2;
    for (let k = 0; k < 6; k++) {
      const ang = Math.PI + (k / 5) * Math.PI;
      for (let s = 0; s < 26; s++) {
        const x = 40 + Math.cos(ang) * s, y = 56 + Math.sin(ang) * s * 0.6 + (s * s) / 60;
        ctx.fillStyle = s % 4 === 0 ? l3 : s < 13 ? leaf : l2;
        ctx.fillRect(Math.round(x), Math.round(y), 3, 2);
      }
    }
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(37, 54, 6, 5);
  } else if (isPine) {
    for (let k = 0; k < 5; k++) {
      const y = 18 + k * 11, half = 8 + k * 5;
      for (let yy = 0; yy < 12; yy++) {
        const hh = Math.round((yy / 12) * half);
        ctx.fillStyle = yy < 2 ? l3 : yy > 9 ? l2 : leaf;
        ctx.fillRect(40 - hh, y + yy, hh * 2, 1);
      }
    }
  } else {
    blob(40, 48, 22, l2);
    blob(30, 40, 16, leaf); blob(50, 40, 16, leaf); blob(40, 30, 17, leaf);
    blob(34, 30, 8, l3); blob(48, 26, 6, l3);
    // neon fruit/data nodes
    ctx.fillStyle = shade(leaf, 1.6);
    for (const [x, y] of [[26, 44], [52, 38], [40, 22], [46, 50]]) ctx.fillRect(x, y, 2, 2);
  }
  return cv;
}

export function buildAtlases() {
  const blockIds = [];
  for (let i = 1; i < TILES.length; i++) if (BLOCKY[i] || (TILES[i].tex && TILES[i].tex.style === 'glass')) blockIds.push(i);
  ATLAS.tileRow = new Int16Array(TILES.length).fill(-1);
  const cols = 16 * 3;
  const atlas = makeCanvas(cols * S, blockIds.length * S);
  const actx = atlas.getContext('2d');
  blockIds.forEach((id, row) => {
    ATLAS.tileRow[id] = row;
    const t = TILES[id];
    for (let v = 0; v < 3; v++) {
      const base = baseTexture(t.tex, v, id * 13 + 7);
      for (let mask = 0; mask < 16; mask++) putBuf(actx, applyEdges(base, mask, t.tex, v, id), (mask * 3 + v) * S, row * S);
    }
  });
  ATLAS.tiles = atlas;

  // walls: 3 variants each, darker
  const wallAtlas = makeCanvas(3 * S, WALLS.length * S);
  const wctx = wallAtlas.getContext('2d');
  for (let i = 1; i < WALLS.length; i++) {
    const wd = WALLS[i];
    const tex = { style: wd.tex.style || 'soil', c: wd.tex.c, glow: '#1a6a7a' };
    for (let v = 0; v < 3; v++) {
      const b = baseTexture(tex, v, i * 7 + 3);
      for (let k = 0; k < b.length; k += 4) { b[k] *= 0.82; b[k + 1] *= 0.82; b[k + 2] *= 0.82; if (tex.style !== 'glass') b[k + 3] = 255; }
      putBuf(wctx, b, v * S, i * S);
    }
  }
  ATLAS.walls = wallAtlas;

  // simple non-block sprites, platforms, furniture
  for (let i = 1; i < TILES.length; i++) {
    const t = TILES[i];
    if (ATLAS.tileRow[i] >= 0) continue;
    if (t.platform) {
      const [cv, ctx] = spriteCanvas(S * 4, S);
      for (let m = 0; m < 4; m++) drawPlatform(ctx, m * S, t.tex.c, (m & 1 ? 8 : 0) | (m & 2 ? 2 : 0));
      ATLAS.sprites.set(i, cv);
    } else if (t.furn) {
      ATLAS.furn.set(i, drawFurniture(t, false));
      if (t.door) ATLAS.furn.set(i + 100000, drawFurniture(t, true));
    } else {
      ATLAS.sprites.set(i, drawSimple(t));
    }
  }
  for (const tr of TREES) ATLAS.canopy.set(tr.key, drawCanopy(tr));
}

// Render a single block icon (for item icons) from the atlas.
export function tileIcon(id) {
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const row = ATLAS.tileRow[id];
  if (row >= 0) ctx.drawImage(ATLAS.tiles, (15 * 3) * S, row * S, S, S, 0, 0, S, S);
  else if (ATLAS.sprites.has(id)) {
    const sp = ATLAS.sprites.get(id);
    ctx.drawImage(sp, 0, 0, S, S, 0, 0, S, S);
  }
  return c;
}
