// Procedural world generation, in passes (yields between passes so the UI can show progress).
import { RNG, clamp, lerp, smoothstep, nextFrame } from '../core/util.js';
import { Noise } from '../core/noise.js';
import { World, BIOME, LIQ } from './world.js';
import { T, W as WL, TILES, HERBS } from '../content/tiles.js';
import { fillChest } from '../content/loot.js';

export const WORLD_SIZES = {
  small: { w: 2400, h: 900, label: 'Small' },
  medium: { w: 3600, h: 1200, label: 'Medium' },
  large: { w: 4800, h: 1500, label: 'Large' },
};

const NATURAL = new Set(['regolith', 'synthgrass', 'ferrocrete', 'silica', 'rustsand', 'rustrock', 'frost', 'cryoice', 'biogel', 'glowmoss',
  'graymass', 'grayturf', 'graysand', 'basalt', 'slag', 'prismstone', 'prismturf', 'prismsand'].map((k) => T[k]));

export async function generateWorld(opts, onProgress = () => {}) {
  const { w, h } = WORLD_SIZES[opts.size] || WORLD_SIZES.medium;
  const seed = opts.seed >>> 0;
  const world = new World(w, h, seed);
  world.name = opts.name || 'New World';
  world.difficulty = opts.difficulty || 'normal';
  world.setLayers();
  const g = new Gen(world, seed);
  const passes = [
    ['Mapping strata', () => g.layout()],
    ['Pouring regolith', () => g.terrain(0, 0.5)],
    ['Compressing bedrock', () => g.terrain(0.5, 1)],
    ['Igniting the Reactor Core', () => g.core()],
    ['Boring tunnels', () => g.tunnels()],
    ['Flooding the coolant seas', () => g.oceans()],
    ['Seeding the Blight', () => g.blight()],
    ['Depositing ores', () => g.ores()],
    ['Wrecking the Derelict Station', () => g.dungeon()],
    ['Growing the Overgrowth hive', () => g.hive()],
    ['Burying the Ancient Temple', () => g.temple()],
    ['Launching orbital islands', () => g.skyIslands()],
    ['Abandoning habitats', () => g.cabins()],
    ['Ruining the Core', () => g.coreRuins()],
    ['Pooling liquids', () => g.liquids()],
    ['Spreading synthgrass', () => g.grass()],
    ['Planting lattice trees', () => g.plants()],
    ['Scattering supply canisters', () => g.scatter()],
    ['Finding a landing site', () => g.spawn()],
  ];
  for (let i = 0; i < passes.length; i++) {
    onProgress(passes[i][0], i / passes.length);
    await nextFrame();
    passes[i][1]();
  }
  onProgress('Done', 1);
  return world;
}

class Gen {
  constructor(world, seed) {
    this.w = world; this.rng = new RNG(seed);
    this.n1 = new Noise(seed); this.n2 = new Noise(seed + 101); this.n3 = new Noise(seed + 202); this.n4 = new Noise(seed + 303);
    this.W = world.w; this.H = world.h; this.L = world.layers;
  }
  id(x, y) { return this.w.fg[y * this.W + x]; }
  put(x, y, t) { if (x >= 0 && y >= 0 && x < this.W && y < this.H) { const i = y * this.W + x; this.w.fg[i] = t; this.w.data[i] = 0; } }
  putWall(x, y, wl) { if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.w.wall[y * this.W + x] = wl; }
  solid(x, y) { if (x < 0 || y < 0 || x >= this.W || y >= this.H) return true; const t = TILES[this.id(x, y)]; return !!(t && t.solid && !t.platform); }
  air(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H && this.id(x, y) === 0; }
  mx(nx) { return this.snowLeft ? nx : 1 - nx; }

  layout() {
    const { W, H, L, rng, w } = this;
    this.snowLeft = rng.chance(0.5);
    const px = (nx) => Math.floor(this.mx(nx) * W);
    const zones = [];
    const zone = (biome, c, half) => zones.push({ biome, a: px(c) - Math.floor(half * W), b: px(c) + Math.floor(half * W) });
    this.desertRight = rng.chance(0.5);
    const desertC = this.desertRight ? 0.62 : 0.38;
    zone(BIOME.blight, 0.165, 0.03);
    zone(BIOME.snow, 0.275, 0.045);
    zone(BIOME.desert, desertC, 0.0375);
    if (W >= 3600) zone(BIOME.blight, this.desertRight ? 0.39 : 0.61, 0.028);
    zone(BIOME.jungle, 0.78, 0.06);
    this.zones = zones;
    const oceanW = Math.floor(W * 0.055);
    this.oceanW = oceanW;
    for (let x = 0; x < W; x++) w.biomeCol[x] = BIOME.plains;
    for (const z of zones) for (let x = Math.max(0, Math.min(z.a, z.b)); x <= Math.min(W - 1, Math.max(z.a, z.b)); x++) w.biomeCol[x] = z.biome;
    for (let x = 0; x < oceanW; x++) { w.biomeCol[x] = BIOME.ocean; w.biomeCol[W - 1 - x] = BIOME.ocean; }
    this.dungeonX = px(0.09);
    this.jungleC = px(0.78);

    // heightmap
    const raw = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      const b = w.biomeCol[x];
      let v = this.n1.fbm1(x / 160, 4) * 22 + this.n1.fbm1(x / 37 + 100, 3) * 6;
      if (b === BIOME.desert) v = v * 0.4 + Math.abs(Math.sin(x / 17)) * 5 - 4;
      else if (b === BIOME.snow) v = v * 1.35 - 6;
      else if (b === BIOME.jungle) v = v * 0.8 + this.n2.n1(x / 9) * 4 + 4;
      else if (b === BIOME.blight) v = v + this.n2.n1(x / 6) * 3;
      raw[x] = v;
    }
    const sm = new Float32Array(W);
    const R = 12;
    for (let x = 0; x < W; x++) {
      let s = 0, c = 0;
      for (let k = -R; k <= R; k++) { const xx = clamp(x + k, 0, W - 1); s += raw[xx]; c++; }
      sm[x] = s / c;
    }
    this.waterLevel = L.surface + 4;
    for (let x = 0; x < W; x++) {
      let y = L.surface + sm[x];
      const d = Math.min(x, W - 1 - x);
      if (d < oceanW + 40) {
        const t = smoothstep(clamp(1 - (d - 0) / (oceanW + 40), 0, 1));
        y = lerp(y, L.surface + 42, t);
      }
      w.surfaceY[x] = Math.round(y);
    }
    // vertical wobble used for wavy underground biome edges
    this.shift = new Int16Array(H);
    for (let y = 0; y < H; y++) this.shift[y] = Math.round(this.n3.fbm1(y / 45, 3) * 16);
  }

  biomeAt(x, y) { return this.w.biomeCol[clamp(x + this.shift[y], 0, this.W - 1)]; }

  terrain(f0, f1) {
    const { W, H, L, w } = this;
    const x0 = Math.floor(W * f0), x1 = Math.floor(W * f1);
    const fg = w.fg, wall = w.wall;
    for (let x = x0; x < x1; x++) {
      const surf = w.surfaceY[x];
      const rockY = Math.max(surf + 8, L.rock + Math.round(this.n2.n1(x / 50) * 8));
      const sandDepth = 10 + Math.round(this.n2.n1(x / 30 + 50) * 4);
      for (let y = surf; y < L.core + 20; y++) {
        const b = this.biomeAt(x, y);
        const depth = y - surf;
        let t;
        if (b === BIOME.desert && y < L.cavern + 40) {
          t = depth < sandDepth ? T.rustsand : (this.n4.n2(x / 14, y / 14) > 0.35 ? T.rustsand : T.rustrock);
        } else if (b === BIOME.snow) {
          if (depth < 5) t = T.frost;
          else t = this.n4.n2(x / 16, y / 16) > 0.1 ? T.cryoice : (y < rockY ? T.frost : T.ferrocrete);
        } else if (b === BIOME.jungle) {
          t = this.n4.n2(x / 18, y / 18) > 0.45 ? T.ferrocrete : T.biogel;
        } else if (b === BIOME.ocean) {
          t = depth < 30 ? T.silica : T.ferrocrete;
        } else {
          if (y < rockY) t = this.n4.n2(x / 11, y / 11) > 0.55 ? T.ferrocrete : T.regolith;
          else t = this.n4.n2(x / 13, y / 13) > 0.62 && y < L.cavern ? T.regolith : T.ferrocrete;
        }
        if (y > L.cavern && t === T.ferrocrete) {
          const k = (y - L.cavern) / (L.core - L.cavern);
          if (this.n2.n2(x / 40, y / 40) > 0.35 - k * 0.9) t = T.basalt;
        }
        if (y > rockY && b !== BIOME.ocean && this.n4.n2(x / 9 + 300, y / 9) > 0.62 && y < L.cavern) t = T.silica;
        // caves
        let cave = false;
        if (depth > 10 && y < L.core + 10) {
          const lay = y < L.rock ? 0 : y < L.cavern ? 1 : 2;
          const big = this.n2.fbm2(x / 80, y / 46, 3);
          const thr = [0.55, 0.42, 0.34][lay];
          const fade = clamp((depth - 10) / 25, 0, 1);
          if (big > thr + (1 - fade) * 0.3) cave = true;
          const sp = Math.abs(this.n3.n2(x / 55, y / 30));
          const wid = [0.02, 0.035, 0.05][lay] * fade;
          if (sp < wid) cave = true;
          if (b === BIOME.jungle && this.n1.fbm2(x / 30, y / 20, 2) > 0.38 && depth > 20) cave = true;
        }
        const i = y * W + x;
        fg[i] = cave ? 0 : t;
        if (depth > 3) wall[i] = this.wallFor(b, y, rockY);
      }
    }
  }

  wallFor(b, y, rockY) {
    const L = this.L;
    if (b === BIOME.desert) return WL.rustrock_wall;
    if (b === BIOME.snow) return WL.frost_wall;
    if (b === BIOME.jungle) return y < rockY ? WL.biogel_wall : WL.jungle_wall;
    if (y < rockY) return WL.regolith_wall;
    if (y < L.cavern) return WL.ferrocrete_wall;
    return WL.basalt_wall;
  }

  core() {
    const { W, H, L, w } = this;
    const fg = w.fg, wall = w.wall;
    for (let x = 0; x < W; x++) {
      const ceil = L.core + 18 + Math.round(this.n1.fbm1(x / 60 + 7, 3) * 10);
      const floor = H - 48 + Math.round(this.n2.fbm1(x / 50 + 3, 3) * 12);
      for (let y = L.core; y < H; y++) {
        const i = y * W + x;
        let t = 0;
        if (y < ceil || y >= floor) t = T.slag;
        else if (this.n3.fbm2(x / 30, y / 18, 2) > 0.42) t = T.slag;
        if (y < L.core + 20 && fg[i] === 0 && y < ceil) t = 0; // let cavern caves pierce the ceiling a little
        if (y >= H - 3) t = T.basalt;
        if (t && y > ceil - 6 && y < ceil && this.n4.n2(x / 6, y / 6) > 0.5) t = T.vitrislag;
        fg[i] = t;
        wall[i] = t ? WL.slag_wall : 0;
        if (!t && y >= H - 40) { w.liq[i] = 255; w.liqT[i] = LIQ.plasma; }
      }
      this.coreFloor = this.coreFloor || new Int16Array(W);
      this.coreFloor[x] = floor;
    }
  }

  carveCircle(cx, cy, r, keepWall = true) {
    const R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = Math.round(cx + dx), y = Math.round(cy + dy);
      if (x < 1 || y < 1 || x >= this.W - 1 || y >= this.H - 3) continue;
      if (!NATURAL.has(this.id(x, y)) && this.id(x, y) !== 0) continue;
      this.put(x, y, 0);
      if (!keepWall) this.putWall(x, y, 0);
    }
  }

  tunnels() {
    const { W, H, L, rng } = this;
    const count = Math.floor(W / 140);
    for (let i = 0; i < count; i++) {
      let x = rng.int(this.oceanW + 30, W - this.oceanW - 30);
      if (Math.abs(x - W / 2) < 40) continue;
      let y = this.w.surfaceY[x] - 2;
      let ang = Math.PI / 2 + rng.float(-0.7, 0.7);
      const len = rng.int(60, 160);
      for (let s = 0; s < len; s++) {
        const r = 1.6 + this.n1.n1(s / 10 + i * 7) * 0.8 + (s < 8 ? 0.6 : 0);
        this.carveCircle(x, y, r, s > 6);
        ang += rng.float(-0.25, 0.25);
        ang = clamp(ang, 0.4, Math.PI - 0.4);
        x += Math.cos(ang) * 1.4; y += Math.sin(ang) * 1.4;
        if (y > L.cavern) break;
      }
    }
    // extra winding underground worms
    const worms = Math.floor((W * H) / 30000);
    for (let i = 0; i < worms; i++) {
      let x = rng.int(20, W - 20), y = rng.int(L.rock, L.core - 10);
      let ang = rng.float(0, Math.PI * 2);
      const len = rng.int(30, 120);
      const rad = rng.float(1.4, 3.6);
      for (let s = 0; s < len; s++) {
        this.carveCircle(x, y, rad + this.n2.n1(s / 8 + i) * 1.2);
        ang += rng.float(-0.35, 0.35);
        x += Math.cos(ang) * 1.5; y += Math.sin(ang) * 1.1;
        if (x < 5 || x > W - 5 || y < L.rock || y > L.core) break;
      }
    }
  }

  oceans() {
    const { W, w } = this;
    for (let x = 0; x < W; x++) {
      if (w.biomeCol[x] !== BIOME.ocean && Math.min(x, W - 1 - x) > this.oceanW + 40) continue;
      const surf = w.surfaceY[x];
      for (let y = this.waterLevel; y < surf; y++) {
        const i = y * W + x; w.liq[i] = 255; w.liqT[i] = LIQ.water;
      }
      // beach sand replaces the top layers near the shore
      for (let y = surf; y < surf + 20; y++) if (this.id(x, y) && NATURAL.has(this.id(x, y))) this.put(x, y, T.silica);
    }
  }

  blight() {
    const { W, H, L, w, rng } = this;
    for (const z of this.zones) {
      if (z.biome !== BIOME.blight) continue;
      const a = Math.min(z.a, z.b), b = Math.max(z.a, z.b);
      for (let x = a - 20; x <= b + 20; x++) {
        if (x < 0 || x >= W) continue;
        for (let y = w.surfaceY[x]; y < L.cavern + 60; y++) {
          const bx = x + this.shift[y];
          if (bx < a || bx > b) continue;
          const i = y * W + x, t = w.fg[i];
          if (t === T.ferrocrete || t === T.basalt) w.fg[i] = T.graymass;
          else if (t === T.silica || t === T.rustsand) w.fg[i] = T.graysand;
          if (w.wall[i]) w.wall[i] = WL.blight_wall;
        }
      }
      // chasms with Blight Nodes at the bottom
      const n = Math.max(2, Math.floor((b - a) / 45));
      for (let c = 0; c < n; c++) {
        let x = Math.floor(lerp(a + 15, b - 15, (c + 0.5) / n)) + rng.int(-6, 6);
        let y = w.surfaceY[x] - 3;
        const depth = rng.int(70, 140);
        const wid = rng.int(3, 5);
        for (let s = 0; s < depth; s++) {
          x += Math.round(this.n4.n1(s / 12 + c * 5) * 1.4);
          for (let dx = -wid - 3; dx <= wid + 3; dx++) {
            const xx = x + dx, yy = y + s;
            if (xx < 0 || xx >= W) continue;
            if (Math.abs(dx) <= wid) { this.put(xx, yy, 0); if (s > 4) this.putWall(xx, yy, WL.blight_wall); }
            else if (this.id(xx, yy)) this.put(xx, yy, T.graymass);
          }
        }
        const cy = y + depth + 4;
        for (let dy = -6; dy <= 6; dy++) for (let dx = -7; dx <= 7; dx++) {
          const xx = x + dx, yy = cy + dy;
          if (dx * dx / 49 + dy * dy / 36 <= 1) { this.put(xx, yy, 0); this.putWall(xx, yy, WL.blight_wall); }
          else if (dx * dx / 100 + dy * dy / 81 <= 1 && this.id(xx, yy)) this.put(xx, yy, T.graymass);
        }
        this.w.placeFurniture(x - 1, cy - 1, T.blight_node);
      }
    }
  }

  vein(oreId, x, y, rMin, rMax, steps, host = NATURAL) {
    const rng = this.rng;
    for (let s = 0; s < steps; s++) {
      const r = rng.float(rMin, rMax);
      const R = Math.ceil(r);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > r * r + rng.float(-0.5, 0.5)) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= this.W || yy >= this.H) continue;
        if (host.has(this.id(xx, yy))) this.put(xx, yy, oreId);
      }
      x += rng.int(-2, 2); y += rng.int(-1, 1);
    }
  }

  ores() {
    const { W, H, L, w, rng } = this;
    const M = (W * H) / 1e6;
    const place = (key, perM, yMin, yMax, rMin, rMax, filter) => {
      const n = Math.floor(perM * M);
      const id = T[key + '_ore'] || T[key];
      for (let i = 0, tries = 0; i < n && tries < n * 20; tries++) {
        const x = rng.int(5, W - 5), y = rng.int(yMin, yMax);
        if (filter && !filter(x, y)) continue;
        if (!NATURAL.has(this.id(x, y))) continue;
        this.vein(id, x, y, rMin, rMax, rng.int(3, 7));
        i++;
      }
    };
    place('cuprite', 170, L.surface - 20, L.cavern, 1, 2.2);
    place('ferrite', 150, L.surface, L.cavern + 80, 1, 2.2);
    place('titanite', 105, L.rock, L.core - 10, 1, 2);
    const blightCol = (x, y) => this.biomeAt(x, y) === BIOME.blight;
    place('lumenite', 70, L.surface, L.core - 10, 1, 2, blightCol);
    place('lumenite', 4, L.cavern, L.core - 10, 0.8, 1.6);
    place('cryonite', 60, L.rock, L.core - 10, 1, 2, (x, y) => this.biomeAt(x, y) === BIOME.snow);
    place('plasmite', 120, L.core, H - 5, 1, 2.4, (x, y) => this.id(x, y) === T.slag);
    place('starshard_ore', 8, L.cavern, L.core - 10, 0.6, 1.2);
  }

  // ---------- Derelict Station (dungeon) ----------
  dungeon() {
    const { W, H, L, w, rng } = this;
    const x0 = this.dungeonX;
    const hull = rng.chance(0.5) ? T.derelict_hull : T.derelict_hull_g;
    const surf = w.surfaceY[x0];
    const segs = [];
    const rooms = [];
    // entrance hall
    const ent = { x: x0 - 14, y: surf - 16, w: 28, h: 14 };
    rooms.push(ent);
    let cx = x0, cy = surf - 4;
    const maxY = Math.min(L.core - 30, L.cavern + Math.floor(H * 0.12));
    const minX = Math.max(this.oceanW + 10, x0 - 200), maxX = Math.min(W - 20, x0 + 200);
    segs.push({ x: cx - 2, y: cy, w: 5, h: 40 }); cy += 40;
    let steps = 0;
    while (steps++ < 40) {
      const r = rng.next();
      if (r < 0.4 && cy < maxY - 30) {
        const len = rng.int(15, 35);
        segs.push({ x: cx - 2, y: cy, w: 5, h: len }); cy += len;
      } else {
        const dir = (cx - minX < 40) ? 1 : (maxX - cx < 40) ? -1 : rng.chance(0.5) ? 1 : -1;
        const len = rng.int(25, 60);
        const nx = clamp(cx + dir * len, minX + 10, maxX - 10);
        segs.push({ x: Math.min(cx, nx) - 2, y: cy - 2, w: Math.abs(nx - cx) + 5, h: 6 });
        cx = nx;
      }
      if (rng.chance(0.45)) {
        const rw = rng.int(16, 30), rh = rng.int(9, 15);
        rooms.push({ x: cx - (rw >> 1), y: cy - rh + 3, w: rw, h: rh, chest: true });
      }
    }
    const th = 4;
    for (const s of [...segs, ...rooms]) {
      for (let y = s.y - th; y < s.y + s.h + th; y++) for (let x = s.x - th; x < s.x + s.w + th; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        this.put(x, y, hull); this.putWall(x, y, WL.derelict_wall);
        const i = y * W + x; w.liq[i] = 0;
      }
    }
    for (const s of [...segs, ...rooms]) {
      for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) { this.put(x, y, 0); this.putWall(x, y, WL.derelict_wall); }
    }
    // entrance doorway & a clear path from outside
    for (let y = ent.y + ent.h - 5; y < ent.y + ent.h; y++) for (let x = ent.x - th - 1; x < ent.x; x++) { this.put(x, y, 0); }
    // platforms in shafts
    for (const s of segs) if (s.h > s.w) for (let y = s.y + 8; y < s.y + s.h - 2; y += 9) for (let x = s.x; x < s.x + s.w; x++) this.put(x, y, T.hull_platform);
    // decorations
    let keyPlaced = false;
    for (const r of rooms) {
      const fy = r.y + r.h - 1;
      for (let x = r.x + 2; x < r.x + r.w - 2; x += rng.int(6, 10)) this.put(x, r.y + 2, T.glowstick_cyan);
      if (r.chest) {
        const cxr = r.x + rng.int(2, r.w - 4);
        if (this.air(cxr, fy - 1) && this.air(cxr + 1, fy - 1) && this.air(cxr, fy) && this.air(cxr + 1, fy)) {
          const locked = rng.chance(0.5);
          this.w.placeFurniture(cxr, fy - 1, locked ? T.derelict_chest : T.cache_chest);
          const ch = w.chests.get(w.idx(cxr, fy - 1));
          fillChest(ch, 'derelict', 0.6, rng);
          if (locked && !keyPlaced) { ch.items[ch.items.findIndex((v) => !v)] = { k: 'core_key', n: 1 }; keyPlaced = true; }
        }
        if (rng.chance(0.5)) {
          for (let x = r.x + 4; x < r.x + r.w - 4; x++) if (this.solid(x, fy + 1) && rng.chance(0.4)) this.put(x, fy + 1, T.laser_grid);
        }
        for (let k = 0; k < 3; k++) {
          const px = r.x + rng.int(1, r.w - 3);
          if (this.air(px, fy - 1) && this.air(px + 1, fy - 1) && this.air(px, fy) && this.air(px + 1, fy)) this.w.placeFurniture(px, fy - 1, T.canister_derelict);
        }
      }
    }
    // laser grids along some corridor ceilings
    for (const s of segs) if (s.w > s.h && rng.chance(0.4)) for (let x = s.x + 3; x < s.x + s.w - 3; x++) if (rng.chance(0.5)) this.put(x, s.y - 1, T.laser_grid);
    // archon terminal outside the entrance
    const tx = ent.x - th - 5;
    let ty = surf - 1;
    for (let y = ent.y; y < H - 1; y++) if (this.solid(tx, y + 1) || this.solid(tx + 1, y + 1)) { ty = y; break; }
    for (let y = ty - 2; y <= ty; y++) for (let x = tx; x < tx + 2; x++) this.put(x, y, 0);
    this.w.placeFurniture(tx, ty - 2, T.archon_terminal);
    w.dungeon = { x: x0, y: ent.y, terminal: [tx, ty - 2], minX, maxX, maxY: cy + 20 };
  }

  hive() {
    const { W, H, L, w, rng } = this;
    const cx = this.jungleC + rng.int(-60, 60), cy = rng.int(L.rock + 30, L.cavern - 20);
    const rx = rng.int(24, 32), ry = rng.int(16, 22);
    for (let dy = -ry - 5; dy <= ry + 5; dy++) for (let dx = -rx - 5; dx <= rx + 5; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const e = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      const n = this.n4.n2(x / 6, y / 6) * 0.15;
      if (e <= 0.7 + n) { this.put(x, y, 0); this.putWall(x, y, WL.hive_wall); if (dy > ry * 0.3) { w.liq[y * W + x] = 255; w.liqT[y * W + x] = LIQ.gel; } }
      else if (e <= 1.15 + n) { this.put(x, y, T.swarmcomb); this.putWall(x, y, WL.hive_wall); }
    }
    // pedestal + pod
    for (let dx = -3; dx <= 3; dx++) for (let dy = 0; dy < 3; dy++) { this.put(cx + dx, cy + 2 + dy, T.swarmcomb); w.liq[(cy + 2 + dy) * W + cx + dx] = 0; }
    for (let dx = -2; dx <= 2; dx++) for (let dy = -3; dy < 2; dy++) { this.put(cx + dx, cy + dy, 0); w.liq[(cy + dy) * W + cx + dx] = 0; }
    this.w.placeFurniture(cx - 1, cy - 1, T.hive_pod);
    w.hive = { x: cx, y: cy };
  }

  temple() {
    const { W, H, L, w, rng } = this;
    const cw = 14, ch = 10;
    const nx = W >= 4800 ? 9 : W >= 3600 ? 8 : 6, ny = W >= 3600 ? 6 : 5;
    const tw = nx * cw + 2, thh = ny * ch + 2;
    const cx = this.jungleC + rng.int(-40, 40), cy = clamp(Math.floor((L.cavern + L.core) / 2), L.cavern, L.core - thh - 10);
    const x0 = clamp(cx - (tw >> 1), 10, W - tw - 10), y0 = cy - (thh >> 1);
    for (let y = y0 - 4; y < y0 + thh + 4; y++) for (let x = x0 - 4; x < x0 + tw + 4; x++) { this.put(x, y, T.temple_brick); this.putWall(x, y, WL.temple_wall); w.liq[y * W + x] = 0; }
    // maze via DFS
    const visited = new Uint8Array(nx * ny);
    const stack = [[0, ny >> 1]];
    visited[(ny >> 1) * nx] = 1;
    const order = [];
    const open = (gx, gy) => {
      const rx = x0 + 1 + gx * cw, ry = y0 + 1 + gy * ch;
      for (let y = ry + 1; y < ry + ch - 1; y++) for (let x = rx + 1; x < rx + cw - 1; x++) this.put(x, y, 0);
    };
    open(0, ny >> 1);
    while (stack.length) {
      const [gx, gy] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [gx + a, gy + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < nx && b < ny && !visited[b * nx + a]);
      if (!nb.length) { stack.pop(); continue; }
      const [ax, ay] = rng.pick(nb);
      visited[ay * nx + ax] = 1;
      open(ax, ay);
      order.push([ax, ay]);
      // passage
      const rx = x0 + 1 + gx * cw, ry = y0 + 1 + gy * ch;
      if (ax !== gx) {
        const px = ax > gx ? rx + cw - 1 : rx;
        for (let y = ry + ch - 5; y < ry + ch - 1; y++) for (let x = px - 1; x <= px + 1; x++) this.put(x, y, 0);
      } else {
        const py = ay > gy ? ry + ch - 1 : ry;
        for (let y = py - 1; y <= py + 1; y++) for (let x = rx + 5; x < rx + 9; x++) this.put(x, y, 0);
        for (let y = py - 1; y <= py + 1; y += 2) for (let x = rx + 5; x < rx + 9; x++) this.put(x, y, T.hull_platform);
      }
      stack.push([ax, ay]);
    }
    // entrance on the left side, mid height
    const ey = y0 + 1 + (ny >> 1) * ch + ch - 4;
    for (let x = x0 - 6; x <= x0 + 1; x++) for (let y = ey - 2; y <= ey; y++) this.put(x, y, 0);
    this.w.placeFurniture(x0 - 1, ey - 2, T.temple_door);
    for (let x = x0 - 30; x < x0 - 6; x++) for (let y = ey - 3; y <= ey; y++) this.carveCircle(x, y, 1.5);
    // altar in the last carved cell
    const [lx, ly] = order[order.length - 1] || [nx - 1, ny >> 1];
    const ax = x0 + 1 + lx * cw + 5, ay = y0 + 1 + ly * ch + ch - 4;
    this.w.placeFurniture(ax, ay, T.temple_altar);
    // spikes & chests
    for (const [gx, gy] of order) {
      const rx = x0 + 1 + gx * cw, ry = y0 + 1 + gy * ch;
      if (rng.chance(0.3)) for (let x = rx + 2; x < rx + cw - 2; x++) if (this.solid(x, ry + ch - 1)) this.put(x, ry + ch - 1, T.temple_spikes);
      if (rng.chance(0.15) && !(gx === lx && gy === ly)) {
        this.w.placeFurniture(rx + 3, ry + ch - 3, T.cache_chest);
        fillChest(w.chests.get(w.idx(rx + 3, ry + ch - 3)), 'temple', 0.9, rng);
      }
      if (rng.chance(0.6)) this.put(rx + 2, ry + 2, T.plasma_torch);
    }
    w.temple = { x: x0, y: y0, w: tw, h: thh, altar: [ax, ay] };
  }

  skyIslands() {
    const { W, H, L, w, rng } = this;
    const n = W >= 4800 ? 7 : W >= 3600 ? 5 : 3;
    w.islands = [];
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(lerp(W * 0.12, W * 0.88, (i + 0.5) / n)) + rng.int(-60, 60);
      if (Math.abs(cx - W / 2) < 80) continue;
      const cy = rng.int(Math.floor(H * 0.05), Math.floor(H * 0.1));
      const rw = rng.int(18, 28), rh = rng.int(7, 11);
      for (let dx = -rw; dx <= rw; dx++) {
        const top = cy - Math.round(Math.sqrt(1 - (dx * dx) / (rw * rw)) * 3 + this.n2.n1(dx / 5 + i * 9) * 1.5);
        const bot = cy + Math.round(Math.sqrt(1 - (dx * dx) / (rw * rw)) * rh);
        for (let y = top; y <= bot; y++) {
          const x = cx + dx;
          this.put(x, y, y - top < 3 ? (y === top ? T.synthgrass : T.regolith) : T.aerogel);
          if (y > top + 2 && Math.abs(dx) < rw - 3) this.putWall(x, y, WL.regolith_wall);
        }
      }
      // little hab
      const hx = cx - 4, hy = cy - 3;
      for (let x = hx; x < hx + 10; x++) for (let y = hy - 6; y < hy; y++) {
        const edge = x === hx || x === hx + 9 || y === hy - 6;
        this.put(x, y, edge ? T.fiber_block : 0);
        this.putWall(x, y, WL.fiber_wall);
      }
      for (let y = hy - 3; y < hy; y++) { this.put(hx, y, 0); this.put(hx + 9, y, 0); }
      this.w.placeFurniture(hx, hy - 3, T.fiber_door);
      this.w.placeFurniture(hx + 4, hy - 2, T.cache_chest);
      fillChest(w.chests.get(w.idx(hx + 4, hy - 2)), 'sky', 0.3, rng);
      this.put(hx + 2, hy - 4, T.glowstick);
      for (let k = 0; k < 3; k++) this.vein(T.starshard_ore, cx + rng.int(-rw + 4, rw - 4), cy + rng.int(2, rh - 2), 0.6, 1.2, 2, new Set([T.aerogel]));
      w.islands.push({ x: cx, y: cy });
    }
  }

  cabins() {
    const { W, H, L, w, rng } = this;
    const n = Math.floor((W * H) / 110000);
    for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) {
      const x = rng.int(this.oceanW + 20, W - this.oceanW - 40), y = rng.int(L.rock + 10, L.core - 20);
      const b = this.biomeAt(x, y);
      if (w.dungeon && x > w.dungeon.minX - 20 && x < w.dungeon.maxX + 20 && y < w.dungeon.maxY + 10) continue;
      if (w.temple && x > w.temple.x - 30 && x < w.temple.x + w.temple.w + 10 && y > w.temple.y - 30 && y < w.temple.y + w.temple.h + 10) continue;
      const cw = rng.int(12, 18), ch = rng.int(6, 8);
      const mat = b === BIOME.snow ? [T.cryo_brick, WL.cryowood_wall, 'snow'] : b === BIOME.jungle ? [T.glowwood_block, WL.glowwood_wall, 'jungle']
        : b === BIOME.desert ? [T.rustrock_brick, WL.rustwood_wall, 'desert'] : rng.chance(0.5) ? [T.ferrocrete_brick, WL.ferrocrete_brick_wall, 'cave'] : [T.fiber_block, WL.fiber_wall, 'cave'];
      for (let yy = y; yy < y + ch; yy++) for (let xx = x; xx < x + cw; xx++) {
        const edge = yy === y || yy === y + ch - 1 || xx === x || xx === x + cw - 1;
        this.put(xx, yy, edge ? mat[0] : 0);
        this.putWall(xx, yy, mat[1]);
        w.liq[yy * W + xx] = 0;
      }
      for (let yy = y + ch - 4; yy < y + ch - 1; yy++) { this.put(x, yy, 0); this.put(x + cw - 1, yy, 0); }
      this.w.placeFurniture(x + 2 + rng.int(0, cw - 6), y + ch - 3, T.cache_chest);
      const key = [...w.chests.keys()].pop();
      fillChest(w.chests.get(key), mat[2], (y - L.rock) / (L.core - L.rock), rng);
      this.put(x + 1, y + 1, b === BIOME.snow ? T.cryo_torch : T.glowstick);
      this.put(x + cw - 2, y + 1, T.glowstick);
      i++;
    }
  }

  coreRuins() {
    const { W, H, L, w, rng } = this;
    const n = Math.floor(W / 260);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(lerp(W * 0.08, W * 0.92, (i + 0.5) / n)) + rng.int(-30, 30);
      let fy = 0;
      for (let y = L.core + 25; y < H - 10; y++) if (this.solid(x, y) && this.air(x, y - 1)) { fy = y; break; }
      if (!fy) continue;
      const bw = rng.int(18, 28), bh = rng.int(9, 13);
      const by = fy - bh;
      if (w.liq[(fy - 1) * W + x] && w.liqT[(fy - 1) * W + x] === LIQ.plasma && fy > H - 42) continue;
      for (let yy = by; yy <= fy; yy++) for (let xx = x; xx < x + bw; xx++) {
        const edge = yy === by || yy === fy || xx === x || xx === x + bw - 1;
        this.put(xx, yy, edge ? T.vitri_brick : 0);
        this.putWall(xx, yy, WL.slag_wall);
        w.liq[yy * W + xx] = 0;
      }
      for (let yy = fy - 4; yy < fy; yy++) { this.put(x, yy, 0); this.put(x + bw - 1, yy, 0); }
      const mid = by + Math.floor(bh / 2);
      for (let xx = x + 1; xx < x + bw - 1; xx++) this.put(xx, mid, T.slagstone_platform);
      this.w.placeFurniture(x + 2, fy - 2, T.core_chest);
      fillChest(w.chests.get(w.idx(x + 2, fy - 2)), 'core', 1, rng);
      if (rng.chance(0.5)) this.w.placeFurniture(x + bw - 5, fy - 2, T.plasma_forge);
      this.put(x + 2, by + 2, T.plasma_torch); this.put(x + bw - 3, by + 2, T.plasma_torch);
    }
  }

  fillBasin(x, y, type, max) {
    const { W, H, w } = this;
    if (!this.air(x, y)) return;
    while (y < H - 2 && this.air(x, y + 1) && !w.liq[(y + 1) * W + x]) y++;
    let filled = 0;
    for (let lv = y; lv > y - 25 && filled < max; lv--) {
      if (!this.air(x, lv)) break;
      let l = x, r = x;
      while (l - 1 > 0 && !this.solid(l - 1, lv)) l--;
      while (r + 1 < W - 1 && !this.solid(r + 1, lv)) r++;
      if (r - l > 70) break;
      let ok = true;
      for (let i = l; i <= r; i++) if (!this.solid(i, lv + 1) && !w.liq[(lv + 1) * W + i]) { ok = false; break; }
      if (!ok) break;
      for (let i = l; i <= r; i++) { const k = lv * W + i; if (!this.id(i, lv) || !TILES[this.id(i, lv)].solid) { w.liq[k] = 255; w.liqT[k] = type; filled++; } }
    }
  }

  liquids() {
    const { W, H, L, rng } = this;
    const n = Math.floor((W * H) / 22000);
    for (let i = 0; i < n; i++) {
      const x = rng.int(10, W - 10), y = rng.int(L.rock, L.core - 5);
      const deep = y > (L.cavern + L.core) / 2;
      const type = deep && rng.chance(0.35) ? LIQ.plasma : LIQ.water;
      this.fillBasin(x, y, type, rng.int(30, 400));
    }
  }

  grass() {
    const { W, H, L, w } = this;
    const fg = w.fg;
    const exposed = (x, y) => this.air(x - 1, y) || this.air(x + 1, y) || this.air(x, y - 1) || this.air(x, y + 1);
    for (let x = 1; x < W - 1; x++) {
      const b = w.biomeCol[x];
      for (let y = Math.max(1, w.surfaceY[x] - 40); y < L.core; y++) {
        const i = y * W + x, t = fg[i];
        if (t === T.regolith && y < L.rock + 10 && exposed(x, y) && !w.liq[i - W]) {
          fg[i] = this.biomeAt(x, y) === BIOME.blight ? T.grayturf : T.synthgrass;
        } else if (t === T.biogel && exposed(x, y)) fg[i] = T.glowmoss;
      }
      if (b === BIOME.blight) for (let y = 0; y < L.rock; y++) { const i = y * W + x; if (fg[i] === T.synthgrass) fg[i] = T.grayturf; }
    }
  }

  growTree(x, y, typeKey, height) {
    // y = ground tile; tree grows upward from y-1
    const id = T['tree_' + typeKey];
    for (let k = 1; k <= height; k++) if (!this.air(x, y - k)) return false;
    for (let k = 1; k <= height; k++) {
      let d = 0;
      if (k === height) d = 4;
      else if (k > 2 && k < height - 1) { if (this.rng.chance(0.15)) d |= 1; if (this.rng.chance(0.15)) d |= 2; }
      this.put(x, y - k, id); this.w.data[(y - k) * this.W + x] = d;
    }
    return true;
  }

  plants() {
    const { W, H, L, w, rng } = this;
    const TREE_FOR = { [T.synthgrass]: 'lattice', [T.glowmoss]: 'glowtree', [T.grayturf]: 'blighttree', [T.frost]: 'cryopine', [T.rustsand]: 'rustpalm' };
    const HERB_ON = new Map();
    for (const hb of HERBS) for (const on of hb.on) { if (!HERB_ON.has(T[on])) HERB_ON.set(T[on], []); HERB_ON.get(T[on]).push(T['herb_' + hb.key]); }
    const GRASS_ON = { [T.synthgrass]: T.tallgrass, [T.glowmoss]: T.tallgrass_j, [T.grayturf]: T.tallgrass_b, [T.rustsand]: T.dead_shrub, [T.frost]: T.frost_shrub };
    let nextTree = 0;
    for (let x = this.oceanW + 4; x < W - this.oceanW - 4; x++) {
      const y = w.surfaceY[x] - 2 < 0 ? 0 : (() => { for (let yy = w.surfaceY[x] - 30; yy < H; yy++) if (this.solid(x, yy)) return yy; return H - 1; })();
      const t = this.id(x, y);
      if (w.liq[(y - 1) * W + x]) continue;
      if (x >= nextTree && TREE_FOR[t] && this.air(x, y - 1)) {
        const tk = TREE_FOR[t];
        const hgt = tk === 'glowtree' ? rng.int(10, 20) : tk === 'rustpalm' ? rng.int(7, 12) : rng.int(6, 14);
        const sideOk = this.solid(x - 1, y) || this.solid(x + 1, y);
        if (sideOk && Math.abs(x - W / 2) > 3 && (tk !== 'rustpalm' || rng.chance(0.25)) && this.growTree(x, y, tk, hgt)) {
          nextTree = x + (tk === 'glowtree' ? rng.int(3, 6) : rng.int(4, 10));
          continue;
        }
      }
      if (this.air(x, y - 1)) {
        if (rng.chance(0.03) && HERB_ON.has(t)) this.put(x, y - 1, rng.pick(HERB_ON.get(t)));
        else if (GRASS_ON[t] && rng.chance(t === T.rustsand || t === T.frost ? 0.08 : 0.5)) this.put(x, y - 1, GRASS_ON[t]);
      }
    }
    // underground flora
    const n = Math.floor((W * H) / 900);
    for (let i = 0; i < n; i++) {
      const x = rng.int(2, W - 2), y = rng.int(L.rock, H - 4);
      const t = this.id(x, y);
      if (!t || !this.air(x, y - 1) || w.liq[(y - 1) * W + x]) continue;
      if (t === T.glowmoss && rng.chance(0.5)) this.put(x, y - 1, rng.chance(0.15) ? T.herb_junglevine : T.tallgrass_j);
      else if (HERB_ON.has(t) && rng.chance(0.08)) this.put(x, y - 1, rng.pick(HERB_ON.get(t)));
      else if (t === T.glowmoss && rng.chance(0.03) && this.air(x, y - 2)) this.growTree(x, y, 'glowtree', rng.int(5, 9));
    }
    // nanowebs near cave ceilings
    const webs = Math.floor((W * H) / 12000);
    for (let i = 0; i < webs; i++) {
      const x = rng.int(2, W - 2), y = rng.int(L.rock, L.core - 5);
      if (!this.air(x, y) || !w.wall[y * W + x]) continue;
      let cy = y; while (cy > L.rock && this.air(x, cy - 1)) cy--;
      if (y - cy > 12) continue;
      for (let k = 0; k < 10; k++) {
        const xx = x + rng.int(-3, 3), yy = cy + rng.int(0, 3);
        if (this.air(xx, yy) && !w.liq[yy * W + xx]) this.put(xx, yy, T.nanoweb);
      }
    }
  }

  floorSpot(x, y, wTiles, hTiles) {
    const { H } = this;
    while (y < H - 3 && this.air(x, y + 1)) y++;
    if (!this.air(x, y)) return -1;
    for (let dx = 0; dx < wTiles; dx++) {
      if (!this.solid(x + dx, y + 1)) return -1;
      for (let dy = 0; dy < hTiles; dy++) if (!this.air(x + dx, y - dy) || this.w.liq[(y - dy) * this.W + x + dx]) return -1;
    }
    return y - hTiles + 1;
  }

  scatter() {
    const { W, H, L, w, rng } = this;
    const n = Math.floor((W * H) / 3500);
    for (let i = 0; i < n; i++) {
      const x = rng.int(4, W - 6), y = rng.int(L.rock - 10, H - 6);
      if (!this.air(x, y)) continue;
      const fy = this.floorSpot(x, y, 2, 2);
      if (fy < 0) continue;
      const b = this.biomeAt(x, fy);
      const id = fy >= L.core ? T.canister_core : b === BIOME.snow ? T.canister_ice : b === BIOME.jungle ? T.canister_jungle : T.canister;
      this.w.placeFurniture(x, fy, id);
    }
    const hearts = Math.max(18, Math.floor((W * H) / 75000));
    for (let i = 0, tries = 0; i < hearts && tries < hearts * 200; tries++) {
      const x = rng.int(20, W - 20), y = rng.int(L.rock + 20, L.core - 10);
      if (!this.air(x, y)) continue;
      const fy = this.floorSpot(x, y, 2, 2);
      if (fy < 0) continue;
      this.w.placeFurniture(x, fy, T.vital_core);
      i++;
    }
  }

  spawn() {
    const { W, w } = this;
    const x = W >> 1;
    let y = 0;
    for (let yy = 0; yy < this.H; yy++) if (this.solid(x, yy) || this.solid(x + 1, yy)) { y = yy; break; }
    for (let dx = -4; dx <= 4; dx++) for (let dy = 1; dy < 20; dy++) {
      const t = TILES[this.id(x + dx, y - dy)];
      if (t && !t.solid) this.put(x + dx, y - dy, 0);
    }
    w.spawnX = x; w.spawnY = y;
  }
}
