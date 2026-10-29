// Draws the world, entities and colored lighting onto the main canvas.
import { TILE, hash2, makeCanvas, clamp, rgba, shade } from '../core/util.js';
import { TILES, BLOCKY, OPAQUE, SOLID, T } from '../content/tiles.js';
import { ITEMS } from '../content/items.js';
import { ATLAS } from './textures.js';
import { Background } from './background.js';
import { drawHumanoid, drawArm, drawHeldItem, drawMonster, drawMonsterGlow, drawProjectile, drawVehicle } from './sprites.js';
import { VEHICLES } from '../content/items.js';
import { iconCanvas } from './icons.js';
import { LIQ, DOOR_OPEN } from '../world/world.js';

const LIQ_COLORS = { [LIQ.water]: [40, 140, 230], [LIQ.plasma]: [255, 90, 40], [LIQ.gel]: [230, 170, 40] };
const MARGIN = 14;
const _shades = new Map();
const shadeCache = (c) => { if (!_shades.has(c)) _shades.set(c, shade(c, 1.3)); return _shades.get(c); };
const CHUNK = 32;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.bg = new Background();
    this.lightCanvas = makeCanvas(1, 1);
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.lightImg = null;
    this.scale = 2; this.dpr = 1; this.cssW = 0; this.cssH = 0;
    this.smoothLight = true;
  }

  resize(cssW, cssH, dpr, zoomPref = 1) {
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    this.canvas.width = Math.round(cssW * dpr); this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + 'px'; this.canvas.style.height = cssH + 'px';
    const short = Math.min(cssW, cssH) * dpr;
    const target = Math.max(24, Math.min(cssW, cssH) / 22) / zoomPref;
    this.scale = Math.max(1, Math.round(short / (target * TILE)));
    this.ctx.imageSmoothingEnabled = false;
  }

  attach(w) {
    if (this.world === w) return;
    this.world = w;
    this.chunks = new Map();
    w.listeners.push((x, y) => {
      if (x < 0) { this.chunks.clear(); return; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const c = this.chunks.get((((y + dy) >> 5) << 12) + ((x + dx) >> 5));
        if (c) c.dirty = true;
      }
    });
  }

  chunk(w, cx, cy) {
    const key = (cy << 12) + cx;
    let c = this.chunks.get(key);
    if (c && !c.dirty) { c.used = this.frameNo; return c.canvas; }
    if (!c) { c = { canvas: makeCanvas(CHUNK * TILE, CHUNK * TILE) }; this.chunks.set(key, c); }
    c.dirty = false; c.used = this.frameNo;
    const ctx = c.canvas.getContext('2d');
    ctx.clearRect(0, 0, CHUNK * TILE, CHUNK * TILE);
    const fg = w.fg, wall = w.wall, W = w.w;
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    const x1 = Math.min(W, x0 + CHUNK), y1 = Math.min(w.h, y0 + CHUNK);
    const wallAtlas = ATLAS.walls, atlas = ATLAS.tiles, rows = ATLAS.tileRow;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * W + x, wl = wall[i];
      if (!wl || OPAQUE[fg[i]]) continue;
      ctx.drawImage(wallAtlas, ((x * 7 + y * 13) % 3) * TILE, wl * TILE, TILE, TILE, (x - x0) * TILE, (y - y0) * TILE, TILE, TILE);
    }
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * W + x, id = fg[i];
      if (!id) continue;
      const t = TILES[id];
      if (t.furn || t.tree) continue;
      const px = (x - x0) * TILE, py = (y - y0) * TILE;
      const row = rows[id];
      if (row >= 0) {
        let mask = 0;
        if (y > 0 && !BLOCKY[fg[i - W]]) mask |= 1;
        if (x < W - 1 && !BLOCKY[fg[i + 1]]) mask |= 2;
        if (y < w.h - 1 && !BLOCKY[fg[i + W]]) mask |= 4;
        if (x > 0 && !BLOCKY[fg[i - 1]]) mask |= 8;
        const v = ((x * 3 + y * 7) ^ (x >> 2)) % 3;
        ctx.drawImage(atlas, (mask * 3 + v) * TILE, row * TILE, TILE, TILE, px, py, TILE, TILE);
      } else if (t.platform) {
        const m = (SOLID[fg[i - 1]] === 2 || BLOCKY[fg[i - 1]] ? 1 : 0) | (SOLID[fg[i + 1]] === 2 || BLOCKY[fg[i + 1]] ? 2 : 0);
        ctx.drawImage(ATLAS.sprites.get(id), m * TILE, 0, TILE, TILE, px, py, TILE, TILE);
      } else {
        const sp = ATLAS.sprites.get(id);
        if (!sp) continue;
        if (t.mount === 'any' && !w.solidAt(x, y + 1) && (w.solidAt(x - 1, y) || w.solidAt(x + 1, y))) {
          ctx.save(); ctx.translate(px + 8, py + 8); ctx.rotate(w.solidAt(x - 1, y) ? 0.35 : -0.35); ctx.drawImage(sp, -8, -8); ctx.restore();
        } else ctx.drawImage(sp, px, py);
      }
    }
    return c.canvas;
  }

  evictChunks() {
    this.frameNo = (this.frameNo || 0) + 1;
    if (this.chunks.size < 40) return;
    for (const [k, c] of this.chunks) if (this.frameNo - c.used > 120) this.chunks.delete(k);
  }

  // world px visible
  viewSize() { return { w: this.canvas.width / this.scale, h: this.canvas.height / this.scale }; }

  screenToWorld(game, sx, sy) {
    const k = this.dpr / this.scale;
    return { x: Math.round(game.cam.x * this.scale) / this.scale + sx * k, y: Math.round(game.cam.y * this.scale) / this.scale + sy * k };
  }

  render(game, aim, settings) {
    const ctx = this.ctx, w = game.world, p = game.player;
    const S = this.scale;
    const vw = this.canvas.width, vh = this.canvas.height;
    let camX = Math.round(game.cam.x * S) / S, camY = Math.round(game.cam.y * S) / S;
    if (game.camShake > 0) { camX += (Math.random() - 0.5) * game.camShake / S * 2; camY += (Math.random() - 0.5) * game.camShake / S * 2; game.camShake *= 0.85; if (game.camShake < 0.5) game.camShake = 0; }
    const viewW = vw / S, viewH = vh / S;
    const tx0 = Math.floor(camX / TILE) - 1, ty0 = Math.floor(camY / TILE) - 1;
    const tx1 = Math.ceil((camX + viewW) / TILE) + 1, ty1 = Math.ceil((camY + viewH) / TILE) + 1;

    // ---- lighting (computed first so we can skip dark tiles) ----
    const ambient = this.ambient(game);
    const lights = this.collectLights(game);
    const lx0 = tx0 - MARGIN, ly0 = ty0 - MARGIN, lw = tx1 - tx0 + MARGIN * 2, lh = ty1 - ty0 + MARGIN * 2;
    game.lighting.compute(lx0, ly0, lw, lh, lights, ambient, w.layers.rock, settings.lightQuality || 2);

    // ---- background ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const depthTiles = (camY + viewH / 2) / TILE - w.layers.surface;
    const bgBiome = game.biome === 'core' ? 'blight' : ['dungeon', 'temple', 'hive'].includes(game.biome) ? 'plains' : game.biome;
    this.bg.draw(ctx, vw, vh, { x: camX * S, y: camY * S, yOff: (w.layers.surface * TILE - camY) * S * 0.2 }, w, bgBiome, game.events.active, depthTiles, game.layer === 'core');

    ctx.setTransform(S, 0, 0, S, -camX * S, -camY * S);
    ctx.imageSmoothingEnabled = false;
    const fg = w.fg, wall = w.wall, data = w.data, W = w.w;
    const L = game.lighting;
    const darkCut = p.s.nightVision ? -1 : 0.015;

    // ---- static walls + tiles from cached chunks ----
    this.attach(w);
    const CPX = CHUNK * TILE;
    for (let cy = Math.max(0, Math.floor(ty0 / CHUNK)); cy <= Math.min(Math.floor((w.h - 1) / CHUNK), Math.floor(ty1 / CHUNK)); cy++) {
      for (let cx = Math.max(0, Math.floor(tx0 / CHUNK)); cx <= Math.min(Math.floor((W - 1) / CHUNK), Math.floor(tx1 / CHUNK)); cx++) {
        ctx.drawImage(this.chunk(w, cx, cy), cx * CPX, cy * CPX);
      }
    }
    this.evictChunks();

    // ---- dynamic tiles: trees and furniture ----
    const canopies = [];
    const furn = [];
    for (let y = Math.max(0, ty0); y < Math.min(w.h, ty1); y++) {
      for (let x = Math.max(0, tx0 - 3); x < Math.min(W, tx1 + 3); x++) {
        const i = y * W + x, id = fg[i];
        if (!id) continue;
        const t = TILES[id];
        if (t.furn) { furn.push(x, y); continue; }
        if (!t.tree) continue;
        if (x >= tx0 && x < tx1) this.drawTree(ctx, w, x, y, id, data[i]);
        if (data[i] & 4) canopies.push(x, y, id);
      }
    }
    // furniture (each origin drawn once)
    const origins = new Set();
    for (let k = 0; k < furn.length; k += 2) { const [ox, oy] = w.origin(furn[k], furn[k + 1]); origins.add(oy * W + ox); }
    for (const o of origins) this.drawFurniture(ctx, w, o % W, Math.floor(o / W));
    // canopies
    for (let k = 0; k < canopies.length; k += 3) {
      const x = canopies[k], y = canopies[k + 1], t = TILES[canopies[k + 2]];
      const img = ATLAS.canopy.get(t.tree.key);
      if (img) ctx.drawImage(img, x * TILE + 8 - 40, y * TILE + 16 - 72);
    }
    // mining cracks
    for (const [k, e] of game.tileDmg) {
      if (k >= 1e9) continue;
      const x = k % W, y = Math.floor(k / W);
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      const t = TILES[fg[k]];
      if (!t) continue;
      const frac = clamp(e.dmg / (100 * (t.tree ? 2.2 : t.hp)), 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const n = Math.ceil(frac * 6);
      for (let c = 0; c < n; c++) {
        const hx = Math.floor(hash2(x, y, c) * 12), hy = Math.floor(hash2(y, x, c) * 12);
        ctx.fillRect(x * TILE + 2 + hx, y * TILE + 2 + hy, 3, 1); ctx.fillRect(x * TILE + 3 + hx, y * TILE + 2 + hy, 1, 3);
      }
    }

    // ---- entities ----
    for (const d of game.drops) {
      if (d.x < camX - 32 || d.x > camX + viewW + 32 || d.y < camY - 32 || d.y > camY + viewH + 32) continue;
      const bob = Math.sin((game.tick + d.id * 7) * 0.08) * 1.5;
      if (d.k === 'credits') {
        ctx.fillStyle = '#ffe27a'; ctx.fillRect(d.x + 3, d.y + 4 + bob, 6, 6); ctx.fillStyle = '#c9a640'; ctx.fillRect(d.x + 3, d.y + 9 + bob, 6, 1);
      } else ctx.drawImage(iconCanvas(d.k), d.x - 2, d.y - 2 + bob, 16, 16);
    }
    for (const n of game.town.npcs) {
      drawHumanoid(ctx, { ...n, flying: false }, n.def.look, {}, game.tick);
      drawArm(ctx, n, n.def.look, {}, Math.sin(n.anim * 0.35) * 0.5);
    }
    for (const m of game.monsters) {
      if (m.x + m.w < camX - 64 || m.x > camX + viewW + 64 || m.y + m.h < camY - 64 || m.y > camY + viewH + 64) continue;
      if (m.key === 'core_warden') { drawMonster(ctx, m, game.tick, p); continue; }
      drawMonster(ctx, m, game.tick, p.dead ? null : p);
    }
    if (!p.dead) this.drawPlayer(ctx, game, p);
    // fishing lines and bobbers (drawn in the lit pass)
    for (const pr of game.projectiles) if (pr.def.ai === 'bobber') {
      ctx.strokeStyle = 'rgba(230,240,255,0.7)'; ctx.lineWidth = 0.75; ctx.beginPath(); ctx.moveTo(p.cx + p.dir * 14, p.y + 4);
      ctx.quadraticCurveTo((p.cx + pr.cx) / 2, Math.max(p.y, pr.cy) + 20, pr.cx, pr.cy - 3); ctx.stroke();
      drawProjectile(ctx, pr, game.tick);
    }
    // hook chain
    if (p.hook) {
      ctx.strokeStyle = '#aeb7c2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.cx, p.y + 18); ctx.lineTo(p.hook.x, p.hook.y); ctx.stroke();
      ctx.fillStyle = '#d8dde4'; ctx.fillRect(p.hook.x - 3, p.hook.y - 3, 6, 6);
    }
    game.fx.draw(ctx, false);

    // ---- liquids ----
    for (let y = Math.max(0, ty0); y < Math.min(w.h, ty1); y++) {
      for (let x = Math.max(0, tx0); x < Math.min(W, tx1); x++) {
        const i = y * W + x, a = w.liq[i];
        if (!a) continue;
        const c = LIQ_COLORS[w.liqT[i]];
        const full = y > 0 && w.liq[i - W] > 0;
        const h = full ? TILE : Math.max(2, Math.round(a / 255 * TILE));
        const alpha = w.liqT[i] === LIQ.water ? 0.55 : 0.85;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
        ctx.fillRect(x * TILE, y * TILE + TILE - h, TILE, h);
        if (!full) { ctx.fillStyle = `rgba(${Math.min(255, c[0] + 80)},${Math.min(255, c[1] + 80)},${Math.min(255, c[2] + 60)},0.8)`; ctx.fillRect(x * TILE, y * TILE + TILE - h, TILE, 1); }
      }
    }

    // ---- lighting overlay ----
    this.drawLight(ctx, game, lx0, ly0, lw, lh, p.s.nightVision);

    // ---- glow pass (unaffected by darkness) ----
    ctx.globalCompositeOperation = 'lighter';
    for (const pr of game.projectiles) {
      if (pr.def.ai === 'bobber') continue;
      if (pr.x < camX - 64 || pr.x > camX + viewW + 64 || pr.y < camY - 64 || pr.y > camY + viewH + 64) continue;
      drawProjectile(ctx, pr, game.tick);
    }
    game.fx.draw(ctx, true);
    this.drawTech(ctx, game, p);
    for (const m of game.monsters) if (m.def.light || m.def.boss) drawMonsterGlow(ctx, m);
    for (const d of game.drops) if (d.star || d.k === 'star_shard') { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff38a'; ctx.fillRect(d.x - 2, d.y - 2, 16, 16); ctx.globalAlpha = 1; }
    if (p.s.scanner) this.drawScanner(ctx, w, tx0, ty0, tx1, ty1, game.tick);
    ctx.globalCompositeOperation = 'source-over';
    for (const m of game.monsters) if (m.allied) { ctx.strokeStyle = 'rgba(157,255,61,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(m.x - 2, m.y - 2, m.w + 4, m.h + 4); }
    if (p.s.hunter) for (const m of game.monsters) { ctx.strokeStyle = 'rgba(255,138,61,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(m.x - 1, m.y - 1, m.w + 2, m.h + 2); }

    // ---- overlays: cursor, health bars, texts ----
    if (aim && aim.show && !p.dead) this.drawCursor(ctx, game, aim);
    for (const m of game.monsters) {
      if (m.def.boss || m.head || m.hp >= m.maxHp || m.def.friendly) continue;
      const bw = Math.max(16, m.w);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.cx - bw / 2, m.y + m.h + 3, bw, 3);
      ctx.fillStyle = m.hp / m.maxHp > 0.5 ? '#3dff6a' : m.hp / m.maxHp > 0.25 ? '#ffcc33' : '#ff3355';
      ctx.fillRect(m.cx - bw / 2, m.y + m.h + 3, bw * Math.max(0, m.hp / m.maxHp), 3);
    }
    for (const n of game.town.npcs) {
      if (Math.abs(n.cx - p.cx) < 140 && Math.abs(n.cy - p.cy) < 100) {
        ctx.font = 'bold 8px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#000'; ctx.fillText(n.name, n.cx + 1, n.y - 5);
        ctx.fillStyle = '#9dff3d'; ctx.fillText(n.name, n.cx, n.y - 6);
      }
    }
    game.fx.drawTexts(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (p.immune > 0 && p.hurtTimer > 290) { ctx.fillStyle = 'rgba(255,40,60,0.15)'; ctx.fillRect(0, 0, vw, vh); }
    if (game.slowmo > 0) { ctx.fillStyle = 'rgba(61,255,176,0.08)'; ctx.fillRect(0, 0, vw, vh); ctx.strokeStyle = 'rgba(61,255,176,0.35)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, vw - 6, vh - 6); }
    if (p.buffs.has('overdrive')) { ctx.strokeStyle = 'rgba(255,51,85,0.35)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, vw - 6, vh - 6); }
  }

  drawTech(ctx, game, p) {
    const fx = p.techFx, t = game.tick;
    if (fx) {
      if (fx.type === 'beam' || fx.type === 'whip' || fx.type === 'tether') {
        const jitter = fx.type === 'tether' ? 3 : 0;
        ctx.strokeStyle = rgba(fx.color, 0.35); ctx.lineWidth = (fx.w || 1.5) * 3;
        ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1);
        if (fx.type === 'whip') ctx.quadraticCurveTo((fx.x1 + fx.x2) / 2, (fx.y1 + fx.y2) / 2 - 18, fx.x2, fx.y2); else ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
        ctx.strokeStyle = fx.color; ctx.lineWidth = fx.w || 1;
        ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1);
        if (fx.type === 'whip') ctx.quadraticCurveTo((fx.x1 + fx.x2) / 2, (fx.y1 + fx.y2) / 2 - 18, fx.x2, fx.y2);
        else for (let k = 1; k <= 8; k++) ctx.lineTo(fx.x1 + (fx.x2 - fx.x1) * k / 8 + (k < 8 ? (Math.random() - 0.5) * jitter : 0), fx.y1 + (fx.y2 - fx.y1) * k / 8 + (k < 8 ? (Math.random() - 0.5) * jitter : 0));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); if (fx.type === 'beam') ctx.stroke();
      } else if (fx.type === 'charge') {
        const r = 3 + fx.k * 9;
        ctx.fillStyle = rgba(fx.color, 0.3); ctx.beginPath(); ctx.arc(fx.x, fx.y, r * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = fx.k >= 1 && (t >> 2) % 2 ? '#ffffff' : fx.color; ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // wormholes
    const list = p.portals && p.portals[game.world.id];
    if (list) list.forEach(([x, y], i) => {
      const col = i === 0 ? '#ff8a3d' : '#66ccff';
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = rgba(col, 0.9 - k * 0.2); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, 10 - k * 2, 22 - k * 4, 0, t * 0.1 + k, t * 0.1 + k + Math.PI * 1.6); ctx.stroke();
      }
      ctx.fillStyle = rgba(col, 0.25); ctx.beginPath(); ctx.ellipse(x, y, 10, 22, 0, 0, Math.PI * 2); ctx.fill();
    });
  }

  ambient(game) {
    const w = game.world, t = w.time / 3600;
    let k;
    if (t >= 6 && t < 18) k = 1;
    else if (t >= 4.5 && t < 6) k = 0.35 + (t - 4.5) / 1.5 * 0.65;
    else if (t >= 18 && t < 19.5) k = 1 - (t - 18) / 1.5 * 0.65;
    else k = 0.35;
    let r = k, g = k, b = k;
    if (k < 1) { r = k * 0.8 + (1 - k) * 0.1; g = k * 0.85 + (1 - k) * 0.12; b = k + (1 - k) * 0.25; }
    const ev = game.events.active;
    if (ev === 'redshift' && k < 0.9) { r = Math.max(r, 0.45); g *= 0.6; b *= 0.6; }
    if (ev === 'eclipse' && k > 0.5) { r = 0.4; g = 0.3; b = 0.2; }
    if (game.layer === 'space') { r = Math.max(r, 0.5); g = Math.max(g, 0.5); b = Math.max(b, 0.6); }
    return [r, g, b];
  }

  collectLights(game) {
    const out = [];
    const p = game.player;
    const add = (x, y, r, g, b) => out.push({ x: Math.floor(x / TILE), y: Math.floor(y / TILE), r, g, b });
    if (!p.dead) {
      const held = p.held();
      if (held && held.place && TILES[T[held.place]]?.light) { const l = TILES[T[held.place]].light; add(p.cx + p.dir * 10, p.y + 14, l[0], l[1], l[2]); }
      if (p.s.light) add(p.cx, p.y - 8, 0.85, 0.85, 0.75);
      add(p.cx, p.cy, 0.3, 0.33, 0.38);
      if (p.flying) add(p.cx, p.y + p.h, 0.5, 0.3, 0.1);
    }
    for (const pr of game.projectiles) if (pr.def.light) add(pr.cx, pr.cy, pr.def.light[0], pr.def.light[1], pr.def.light[2]);
    for (const m of game.monsters) if (m.def.light) add(m.cx, m.cy, m.def.light[0], m.def.light[1], m.def.light[2]);
    for (const d of game.drops) if (d.k === 'star_shard') add(d.x + 6, d.y + 6, 0.5, 0.5, 0.2);
    return out;
  }

  drawLight(ctx, game, x0, y0, w, h, nv) {
    const L = game.lighting;
    if (this.lightCanvas.width !== w || this.lightCanvas.height !== h) {
      this.lightCanvas.width = w; this.lightCanvas.height = h;
      this.lightImg = this.lightCtx.createImageData(w, h);
    }
    const img = this.lightImg, d = img.data;
    const R = L.R, G = L.G, B = L.B;
    const floor = nv ? 0.28 : 0;
    const explored = game.world.explored, WW = game.world.w, HH = game.world.h;
    const markExplore = game.tick % 10 === 0;
    for (let j = 0; j < h; j++) {
      const wy = y0 + j;
      for (let i = 0; i < w; i++) {
        const k = j * w + i, o = k * 4;
        const r = Math.max(R[k], floor), g = Math.max(G[k], floor), b = Math.max(B[k], floor);
        d[o] = r >= 1 ? 255 : r * 255; d[o + 1] = g >= 1 ? 255 : g * 255; d[o + 2] = b >= 1 ? 255 : b * 255; d[o + 3] = 255;
        if (markExplore && (r > 0.1 || g > 0.1 || b > 0.1)) {
          const wx = x0 + i;
          if (wx >= 0 && wy >= 0 && wx < WW && wy < HH) {
            const ei = wy * WW + wx;
            if (!explored[ei]) { explored[ei] = 1; game.mapDirty.add((wy >> 6) * 4096 + (wx >> 6)); }
          }
        }
      }
    }
    this.lightCtx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = this.smoothLight;
    ctx.drawImage(this.lightCanvas, x0 * TILE - 8 + 8, y0 * TILE - 8 + 8, w * TILE, h * TILE);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  drawTree(ctx, w, x, y, id, d) {
    const sp = ATLAS.sprites.get(id);
    ctx.drawImage(sp, x * TILE, y * TILE);
    const t = TILES[id].tree;
    if (!TILES[w.get(x, y + 1)]?.tree) {
      ctx.fillStyle = TILES[id].tex.c;
      ctx.fillRect(x * TILE - 2, y * TILE + 12, 20, 4);
      ctx.fillRect(x * TILE + 1, y * TILE + 10, 14, 2);
    }
    const blob = (cx, cy) => {
      ctx.fillStyle = t.leaf2; ctx.beginPath(); ctx.arc(cx, cy + 1, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.leaf; ctx.beginPath(); ctx.arc(cx - 1, cy - 1, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shadeCache(t.leaf); ctx.fillRect(cx - 4, cy - 4, 3, 2);
    };
    if (d & 1) { ctx.fillStyle = TILES[id].tex.c; ctx.fillRect(x * TILE - 6, y * TILE + 7, 9, 3); blob(x * TILE - 8, y * TILE + 4); }
    if (d & 2) { ctx.fillStyle = TILES[id].tex.c; ctx.fillRect(x * TILE + 13, y * TILE + 7, 9, 3); blob(x * TILE + 24, y * TILE + 4); }
  }

  drawFurniture(ctx, w, ox, oy) {
    const id = w.get(ox, oy), t = TILES[id];
    if (!t || !t.furn) return;
    const open = t.door && (w.data[oy * w.w + ox] & DOOR_OPEN);
    const sp = ATLAS.furn.get(open ? id + 100000 : id);
    if (sp) ctx.drawImage(sp, ox * TILE, oy * TILE);
  }

  drawScanner(ctx, w, tx0, ty0, tx1, ty1, tick) {
    for (let y = Math.max(0, ty0); y < Math.min(w.h, ty1); y++) for (let x = Math.max(0, tx0); x < Math.min(w.w, tx1); x++) {
      const t = TILES[w.fg[y * w.w + x]];
      if (t && (t.ore || t.container || t.smash)) {
        ctx.globalAlpha = 0.35 + Math.sin(tick * 0.1 + x + y) * 0.15;
        ctx.fillStyle = t.map; ctx.fillRect(x * TILE + 2, y * TILE + 2, 12, 12);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx, game, p) {
    if (p.immune > 0 && (game.tick >> 2) % 2 === 0 && p.hurtTimer > 250) ctx.globalAlpha = 0.5;
    const gear = p.gearColors();
    if (p.vehicle) { drawVehicle(ctx, p, p.vehicle.key, VEHICLES[p.vehicle.key], p.look, gear, game.tick); ctx.globalAlpha = 1; return; }
    drawHumanoid(ctx, p, p.look, gear, game.tick);
    const it = p.useKey ? ITEMS[p.useKey] : null;
    let armAng = Math.sin(p.anim * 0.35) * 0.5 * (p.dir);
    if (it) {
      const prog = 1 - p.useTimer / p.useTotal;
      if (it.useStyle === 'swing') {
        const sa = p.swingAngle !== undefined ? p.swingAngle : p.useAngle;
        const a = -2.2 + 3.2 * Math.min(1, prog * 1.3);
        const ang = p.dir > 0 ? a : Math.PI - a;
        armAng = ang - Math.PI / 2;
        drawHeldItem(ctx, p, it.key, ang + Math.PI / 4 * p.dir + (p.dir > 0 ? 0 : 0), 'swing');
      } else if (it.useStyle === 'thrust') {
        armAng = p.useAngle - Math.PI / 2;
        drawHeldItem(ctx, p, it.key, p.useAngle, 'shoot');
      } else if (it.useStyle === 'shoot' || it.useStyle === 'throw') {
        const a = Math.atan2(p.aimY - (p.y + 16), p.aimX - p.cx);
        armAng = a - Math.PI / 2;
        if (it.useStyle === 'shoot') drawHeldItem(ctx, p, it.key, a, 'shoot');
      } else if (it.useStyle === 'consume') armAng = -2.5 * p.dir;
    } else if (p.holdTime > 0) armAng = -2.8 * p.dir;
    drawArm(ctx, p, p.look, gear, armAng);
    ctx.globalAlpha = 1;
  }

  drawCursor(ctx, game, aim) {
    const p = game.player;
    const it = p.held();
    if (!it) return;
    const tx = Math.floor(aim.x / TILE), ty = Math.floor(aim.y / TILE);
    if (it.pick || it.axe || it.hammer) {
      const tgt = game.toolTarget(p, it, tx, ty);
      if (tgt) {
        ctx.strokeStyle = 'rgba(255,240,150,0.9)'; ctx.lineWidth = 1;
        ctx.strokeRect(tgt.x * TILE + 0.5, tgt.y * TILE + 0.5, TILE - 1, TILE - 1);
      }
    } else if (it.place || it.placeWall) {
      const ok = p.inReach(tx, ty, it);
      ctx.strokeStyle = ok ? 'rgba(46,242,255,0.8)' : 'rgba(255,51,85,0.6)';
      const f = it.place && TILES[T[it.place]].furn;
      if (f) ctx.strokeRect((tx - Math.floor((f.w - 1) / 2)) * TILE + 0.5, (ty - f.h + 1) * TILE + 0.5, f.w * TILE - 1, f.h * TILE - 1);
      else ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }
}
