// Minimap and full-screen map, built from explored tiles into 64x64 chunk canvases.
import { TILES, WALLS } from '../content/tiles.js';
import { hexToRgb, makeCanvas, TILE } from '../core/util.js';
import { LIQ } from '../world/world.js';

const CH = 64;

export class WorldMap {
  constructor(game) {
    this.game = game;
    this.chunks = new Map();
    const w = game.world;
    this.tileRGB = TILES.map((t) => (t ? hexToRgb(t.map) : [0, 0, 0]));
    this.wallRGB = WALLS.map((t) => (t ? hexToRgb(t.map).map((v) => v * 0.6) : [0, 0, 0]));
    this.zoom = 2; this.ox = 0; this.oy = 0; this.open = false;
    this.skyTop = hexToRgb('#3a7bd5'); this.skyBot = hexToRgb('#8fd3ff');
  }

  chunk(cx, cy, rebuild = false) {
    const key = cy * 4096 + cx;
    let c = this.chunks.get(key);
    if (c && !rebuild) return c;
    const w = this.game.world;
    if (!c) { c = makeCanvas(CH, CH); c.ctx = c.getContext('2d'); c.img = c.ctx.createImageData(CH, CH); this.chunks.set(key, c); }
    const d = c.img.data;
    const L = w.layers;
    for (let j = 0; j < CH; j++) {
      const y = cy * CH + j;
      for (let i = 0; i < CH; i++) {
        const x = cx * CH + i, o = (j * CH + i) * 4;
        if (x >= w.w || y >= w.h || !w.explored[y * w.w + x]) { d[o + 3] = 0; continue; }
        const k = y * w.w + x;
        let rgb;
        const t = w.fg[k];
        if (t) rgb = this.tileRGB[t];
        else if (w.liq[k] > 60) rgb = w.liqT[k] === LIQ.plasma ? [255, 90, 40] : w.liqT[k] === LIQ.gel ? [230, 170, 40] : [40, 110, 210];
        else if (w.wall[k]) rgb = this.wallRGB[w.wall[k]];
        else if (y < L.rock) { const f = y / L.rock; rgb = [this.skyTop[0] + (this.skyBot[0] - this.skyTop[0]) * f, this.skyTop[1] + (this.skyBot[1] - this.skyTop[1]) * f, this.skyTop[2] + (this.skyBot[2] - this.skyTop[2]) * f]; }
        else rgb = y > L.core ? [40, 12, 8] : [20, 16, 14];
        d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
      }
    }
    c.ctx.putImageData(c.img, 0, 0);
    return c;
  }

  flushDirty() {
    const g = this.game;
    if (g.mapDirty.has(-1)) { this.chunks.clear(); g.mapDirty.clear(); return; }
    let n = 0;
    for (const key of g.mapDirty) {
      if (this.chunks.has(key)) this.chunk(key % 4096, Math.floor(key / 4096), true);
      g.mapDirty.delete(key);
      if (++n > 6) break;
    }
  }

  drawMini(canvas) {
    const g = this.game, w = g.world, p = g.player;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, chh = canvas.height;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, chh);
    const scale = 1;
    const ptx = p.cx / TILE, pty = p.cy / TILE;
    const x0 = ptx - cw / 2 / scale, y0 = pty - chh / 2 / scale;
    ctx.imageSmoothingEnabled = false;
    for (let cy = Math.floor(y0 / CH); cy <= Math.floor((y0 + chh) / CH); cy++) for (let cx = Math.floor(x0 / CH); cx <= Math.floor((x0 + cw) / CH); cx++) {
      if (cx < 0 || cy < 0 || cx * CH >= w.w || cy * CH >= w.h) continue;
      ctx.drawImage(this.chunk(cx, cy), Math.round((cx * CH - x0) * scale), Math.round((cy * CH - y0) * scale), CH * scale, CH * scale);
    }
    this.drawMarkers(ctx, x0, y0, scale, 2);
  }

  drawMarkers(ctx, x0, y0, scale, size) {
    const g = this.game, p = g.player;
    for (const n of g.town.npcs) { ctx.fillStyle = '#9dff3d'; ctx.fillRect((n.cx / TILE - x0) * scale - size, (n.cy / TILE - y0) * scale - size, size * 2, size * 2); }
    for (const b of g.bosses) if (!b.dead) { ctx.fillStyle = '#ff3355'; ctx.fillRect((b.cx / TILE - x0) * scale - size * 1.5, (b.cy / TILE - y0) * scale - size * 1.5, size * 3, size * 3); }
    const w = g.world;
    ctx.fillStyle = '#ffcc33'; ctx.fillRect((w.spawnX - x0) * scale - size, (w.spawnY - 2 - y0) * scale - size, size * 2, size * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect((p.cx / TILE - x0) * scale - size, (p.cy / TILE - y0) * scale - size * 1.5, size * 2, size * 3);
    ctx.strokeStyle = '#2ef2ff'; ctx.lineWidth = 1; ctx.strokeRect((p.cx / TILE - x0) * scale - size - 1, (p.cy / TILE - y0) * scale - size * 1.5 - 1, size * 2 + 2, size * 3 + 2);
  }

  drawFull(canvas) {
    const g = this.game, w = g.world;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr), chh = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, cw, chh);
    const scale = this.zoom * dpr;
    const x0 = this.ox - cw / 2 / scale, y0 = this.oy - chh / 2 / scale;
    ctx.imageSmoothingEnabled = false;
    for (let cy = Math.max(0, Math.floor(y0 / CH)); cy <= Math.min(Math.floor(w.h / CH), Math.floor((y0 + chh / scale) / CH)); cy++) {
      for (let cx = Math.max(0, Math.floor(x0 / CH)); cx <= Math.min(Math.floor(w.w / CH), Math.floor((x0 + cw / scale) / CH)); cx++) {
        ctx.drawImage(this.chunk(cx, cy), Math.floor((cx * CH - x0) * scale), Math.floor((cy * CH - y0) * scale), Math.ceil(CH * scale), Math.ceil(CH * scale));
      }
    }
    ctx.strokeStyle = '#2a4a6a'; ctx.strokeRect((0 - x0) * scale, (0 - y0) * scale, w.w * scale, w.h * scale);
    this.drawMarkers(ctx, x0, y0, scale, Math.max(3, 2 * dpr));
    ctx.font = `${12 * dpr}px ui-monospace, Menlo, monospace`; ctx.fillStyle = '#8aa0c0';
    ctx.fillText(`${w.name} — Day ${w.day}`, 10 * dpr, chh - 12 * dpr);
  }

  center() { const p = this.game.player; this.ox = p.cx / TILE; this.oy = p.cy / TILE; }
}
