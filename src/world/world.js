// World storage: tile/wall/liquid grids plus containers and progression flags.
import { TILES, SOLID, T } from '../content/tiles.js';

export const BIOME = { plains: 0, desert: 1, snow: 2, jungle: 3, blight: 4, ocean: 5, prism: 6 };
export const BIOME_NAMES = ['plains', 'desert', 'snow', 'jungle', 'blight', 'ocean', 'prism'];
export const LIQ = { water: 0, plasma: 1, gel: 2 };

export const DOOR_OPEN = 0x80;

export class World {
  constructor(w, h, seed) {
    this.w = w; this.h = h; this.seed = seed >>> 0;
    const n = w * h;
    this.fg = new Uint16Array(n);
    this.wall = new Uint8Array(n);
    this.liq = new Uint8Array(n);      // liquid amount 0..255
    this.liqT = new Uint8Array(n);     // liquid type
    this.data = new Uint8Array(n);     // per-tile state: furniture offsets, door open bit, tree part
    this.explored = new Uint8Array(n);
    this.biomeCol = new Uint8Array(w);
    this.surfaceY = new Int16Array(w);
    this.chests = new Map();           // origin index -> { items: [], locked?: itemKey }
    this.flags = { hardmode: false, bosses: {}, events: {}, invasionsDone: 0, nodesSmashed: 0 };
    this.time = 7.5 * 3600;            // seconds of the in-game day
    this.day = 1;
    this.spawnX = w >> 1; this.spawnY = 100;
    this.name = 'World';
    this.difficulty = 'normal';
    this.layers = null;
    this.listeners = [];
    this.townNpcs = [];
    this.dungeon = null;
    this.temple = null;
  }

  setLayers() {
    const h = this.h;
    const surfaceBase = Math.floor(h * 0.26);
    this.layers = {
      space: Math.floor(h * 0.08),
      surface: surfaceBase,
      rock: surfaceBase + Math.floor(h * 0.08),
      cavern: Math.floor(h * 0.48),
      core: h - Math.floor(h * 0.15),
    };
  }

  idx(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.inb(x, y) ? this.fg[y * this.w + x] : 0; }
  getWall(x, y) { return this.inb(x, y) ? this.wall[y * this.w + x] : 0; }
  def(x, y) { return TILES[this.get(x, y)]; }

  solidAt(x, y) {
    if (x < 0 || x >= this.w || y >= this.h) return true;
    if (y < 0) return false;
    const i = y * this.w + x, s = SOLID[this.fg[i]];
    if (s === 1) return true;
    if (s === 3) return (this.data[i] & DOOR_OPEN) === 0;
    return false;
  }
  platformAt(x, y) {
    if (!this.inb(x, y)) return false;
    return SOLID[this.fg[y * this.w + x]] === 2;
  }

  set(x, y, id, data = 0) {
    if (!this.inb(x, y)) return;
    const i = y * this.w + x;
    this.fg[i] = id;
    this.data[i] = data;
    if (id && TILES[id].solid && !TILES[id].platform) this.liq[i] = 0;
    for (const l of this.listeners) l(x, y);
  }
  setWall(x, y, id) {
    if (!this.inb(x, y)) return;
    this.wall[y * this.w + x] = id;
    for (const l of this.listeners) l(x, y);
  }

  // Multi-tile furniture: data encodes offset from origin (dx low nibble, dy bits 4-6).
  origin(x, y) {
    const i = y * this.w + x, d = this.data[i];
    return [x - (d & 15), y - ((d >> 4) & 7)];
  }
  placeFurniture(x, y, id) {
    const f = TILES[id].furn;
    for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) this.set(x + dx, y + dy, id, dx | (dy << 4));
    if (TILES[id].container) {
      const key = this.idx(x, y);
      if (!this.chests.has(key)) this.chests.set(key, { items: new Array(40).fill(null), locked: TILES[id].locked || null });
    }
  }
  removeFurniture(x, y) {
    const id = this.get(x, y);
    const f = TILES[id].furn;
    const [ox, oy] = this.origin(x, y);
    for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) if (this.get(ox + dx, oy + dy) === id) this.set(ox + dx, oy + dy, 0, 0);
    return [ox, oy];
  }

  isAir(x, y) { return this.inb(x, y) && this.fg[y * this.w + x] === 0; }

  // Biome at column, accounting for deep layers.
  biomeAt(x) { return BIOME_NAMES[this.biomeCol[Math.max(0, Math.min(this.w - 1, x))]]; }

  layerAt(y) {
    const L = this.layers;
    if (y < L.space) return 'space';
    if (y < L.rock) return 'surface';
    if (y < L.cavern) return 'underground';
    if (y < L.core) return 'cavern';
    return 'core';
  }

  isDay() { return this.time >= 4.5 * 3600 && this.time < 19.5 * 3600; }

  findSurface(x) {
    for (let y = 0; y < this.h; y++) if (this.solidAt(x, y) || this.liq[y * this.w + x] > 0) return y;
    return this.h - 1;
  }

  countTile(id) {
    let c = 0; const fg = this.fg;
    for (let i = 0; i < fg.length; i++) if (fg[i] === id) c++;
    return c;
  }
}

export const TILE_ID = T;
