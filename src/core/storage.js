// Persistence: IndexedDB for players and worlds (run-length encoded grids), localStorage for settings.
import { TILES, T, WALLS, W } from '../content/tiles.js';
import { World } from '../world/world.js';

const DB_NAME = 'neon-strata';
const VERSION = 1;
let dbp = null;

function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('players')) d.createObjectStore('players', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('worlds')) d.createObjectStore('worlds', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return db().then((d) => new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    const r = fn(s);
    if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}

export const store = {
  put: (s, obj) => tx(s, 'readwrite', (os) => os.put(obj)),
  get: (s, id) => tx(s, 'readonly', (os) => os.get(id)),
  del: (s, id) => tx(s, 'readwrite', (os) => os.delete(id)),
  all: (s) => tx(s, 'readonly', (os) => os.getAll()),
};

export function rle(arr) {
  const out = [];
  let i = 0;
  const n = arr.length;
  while (i < n) {
    const v = arr[i];
    let j = i + 1;
    while (j < n && arr[j] === v && j - i < 65535) j++;
    out.push(v, j - i);
    i = j;
  }
  return Uint16Array.from(out);
}

export function unrle(packed, Type, n) {
  const out = new Type(n);
  let o = 0;
  for (let i = 0; i < packed.length; i += 2) {
    const v = packed[i], c = packed[i + 1];
    out.fill(v, o, o + c);
    o += c;
  }
  return out;
}

export function serializeWorld(w) {
  return {
    id: w.id, name: w.name, w: w.w, h: w.h, seed: w.seed, difficulty: w.difficulty, created: w.created || Date.now(), lastPlayed: Date.now(),
    time: w.time, day: w.day, spawnX: w.spawnX, spawnY: w.spawnY, flags: w.flags, layers: w.layers,
    biomeCol: w.biomeCol, surfaceY: w.surfaceY,
    tileKeys: TILES.map((t) => (t ? t.key : null)), wallKeys: WALLS.map((t) => (t ? t.key : null)),
    fg: rle(w.fg), wall: rle(w.wall), liq: rle(w.liq), liqT: rle(w.liqT), data: rle(w.data), explored: rle(w.explored),
    chests: [...w.chests.entries()], townNpcs: w.townNpcs, dungeon: w.dungeon, temple: w.temple, hive: w.hive, islands: w.islands,
    version: 1,
  };
}

export function deserializeWorld(o) {
  const w = new World(o.w, o.h, o.seed);
  w.id = o.id; w.name = o.name; w.difficulty = o.difficulty; w.created = o.created;
  w.time = o.time; w.day = o.day; w.spawnX = o.spawnX; w.spawnY = o.spawnY; w.flags = o.flags; w.layers = o.layers;
  w.biomeCol = o.biomeCol; w.surfaceY = o.surfaceY;
  const n = o.w * o.h;
  const fg = unrle(o.fg, Uint16Array, n);
  // remap ids in case the registry changed between versions
  const tmap = new Uint16Array(o.tileKeys.length);
  let same = o.tileKeys.length === TILES.length;
  for (let i = 1; i < o.tileKeys.length; i++) { tmap[i] = T[o.tileKeys[i]] || 0; if (tmap[i] !== i) same = false; }
  if (!same) for (let i = 0; i < n; i++) fg[i] = tmap[fg[i]];
  w.fg = fg;
  const wall = unrle(o.wall, Uint8Array, n);
  const wmap = new Uint8Array(o.wallKeys.length);
  let wsame = o.wallKeys.length === WALLS.length;
  for (let i = 1; i < o.wallKeys.length; i++) { wmap[i] = W[o.wallKeys[i]] || 0; if (wmap[i] !== i) wsame = false; }
  if (!wsame) for (let i = 0; i < n; i++) wall[i] = wmap[wall[i]];
  w.wall = wall;
  w.liq = unrle(o.liq, Uint8Array, n); w.liqT = unrle(o.liqT, Uint8Array, n);
  w.data = unrle(o.data, Uint8Array, n); w.explored = unrle(o.explored, Uint8Array, n);
  w.chests = new Map(o.chests || []);
  w.townNpcs = o.townNpcs || []; w.dungeon = o.dungeon; w.temple = o.temple; w.hive = o.hive; w.islands = o.islands;
  return w;
}

const SETTINGS_KEY = 'neon-strata-settings';
export const DEFAULT_SETTINGS = { foldMode: 'auto', foldShift: 0, resolution: 2, sfx: 0.6, music: 0.35, zoom: 1, lightQuality: 2, smoothLight: true, minimap: true, leftHanded: false, showFps: false, autoPause: true, controlScale: 1 };
export function loadSettings() {
  try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch (e) { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } }

export async function requestPersistence() {
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* ignore */ }
}
