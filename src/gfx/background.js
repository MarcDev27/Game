// Sky gradient, celestial bodies, stars and parallax silhouettes for each biome / depth.
import { makeCanvas, hash2, lerp, clamp, mix, shade } from '../core/util.js';

const SKY = {
  day: ['#3a7bd5', '#8fd3ff'],
  dusk: ['#2a1f5a', '#ff7a5a'],
  night: ['#05060f', '#14183a'],
  redshift: ['#2a0508', '#7a1020'],
  eclipse: ['#150a00', '#5a2a05'],
};

const BIOME_TINT = {
  plains: ['#1d5a6a', '#2a7a7a', '#3a9a8a'],
  desert: ['#7a3a1f', '#a8582a', '#c87a3a'],
  snow: ['#4a6a8a', '#7a9ab8', '#a8c8e0'],
  jungle: ['#1a3a1a', '#2a5a22', '#3a7a2a'],
  blight: ['#2a2238', '#3f3456', '#584a78'],
  prism: ['#6a4a8a', '#9a6ab8', '#c89ae0'],
  ocean: ['#1d4a7a', '#2a6a9a', '#3a8aba'],
};

export class Background {
  constructor() {
    this.layers = new Map();
    this.stars = [];
    for (let i = 0; i < 220; i++) this.stars.push([hash2(i, 1, 7), hash2(i, 2, 7), hash2(i, 3, 7)]);
  }

  // Build a tall silhouette strip for parallax (cached per biome/layer).
  layer(biome, depth) {
    const key = biome + depth;
    if (this.layers.has(key)) return this.layers.get(key);
    const W = 1024, H = 256;
    const c = makeCanvas(W, H), ctx = c.getContext('2d');
    const col = (BIOME_TINT[biome] || BIOME_TINT.plains)[depth];
    ctx.fillStyle = col;
    const seed = depth * 13 + biome.length;
    if (depth === 0) {
      // distant megastructure skyline
      for (let x = 0; x < W;) {
        const bw = 12 + Math.floor(hash2(x, seed, 1) * 40);
        const bh = 60 + Math.floor(hash2(x, seed, 2) * 150);
        ctx.fillRect(x, H - bh, bw, bh);
        if (hash2(x, seed, 3) > 0.6) ctx.fillRect(x + (bw >> 1) - 1, H - bh - 30, 2, 30);
        ctx.fillStyle = shade(col, 1.35);
        for (let wy = H - bh + 6; wy < H - 4; wy += 7) for (let wx = x + 3; wx < x + bw - 3; wx += 5) if (hash2(wx, wy, seed) > 0.72) ctx.fillRect(wx, wy, 2, 2);
        ctx.fillStyle = col;
        x += bw + Math.floor(hash2(x, seed, 4) * 10);
      }
    } else {
      // rolling hills / dunes / spires
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const t = x / W * Math.PI * 2;
        let y = H * 0.55 + Math.sin(t * (2 + depth) + seed) * 28 + Math.sin(t * 7 + seed * 2) * 10;
        if (biome === 'snow' || biome === 'blight') y -= Math.abs(Math.sin(t * 9 + seed)) * 40;
        if (biome === 'desert') y = H * 0.62 + Math.sin(t * 3 + seed) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      // trees / pylons on the ridge
      ctx.fillStyle = shade(col, 0.8);
      for (let x = 0; x < W; x += 9) {
        if (hash2(x, seed, 9) > 0.55) continue;
        const t = x / W * Math.PI * 2;
        let y = H * 0.55 + Math.sin(t * (2 + depth) + seed) * 28 + Math.sin(t * 7 + seed * 2) * 10;
        if (biome === 'desert') continue;
        const th = 10 + hash2(x, seed, 8) * 18;
        ctx.fillRect(x, y - th, 3, th);
        ctx.beginPath(); ctx.arc(x + 1, y - th, 5 + hash2(x, seed, 7) * 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    this.layers.set(key, c);
    return c;
  }

  skyColors(world, event) {
    const t = world.time / 3600; // hours
    let top, bot;
    const dayK = clamp((t < 12 ? (t - 4.5) : (19.5 - t)) / 1.5, 0, 1);
    const duskK = (t > 4 && t < 6.5) || (t > 18 && t < 20.5) ? 1 - Math.abs(((t < 12 ? 5.25 : 19.25) - t) / 1.25) : 0;
    top = mix(SKY.night[0], SKY.day[0], dayK); bot = mix(SKY.night[1], SKY.day[1], dayK);
    if (duskK > 0) { top = mix(top, SKY.dusk[0], clamp(duskK, 0, 1) * 0.6); bot = mix(bot, SKY.dusk[1], clamp(duskK, 0, 1) * 0.7); }
    if (event === 'redshift' && dayK < 0.5) { top = mix(top, SKY.redshift[0], 0.8); bot = mix(bot, SKY.redshift[1], 0.8); }
    if (event === 'eclipse' && dayK > 0.5) { top = SKY.eclipse[0]; bot = SKY.eclipse[1]; }
    return { top, bot, dayK };
  }

  draw(ctx, vw, vh, cam, world, biome, event, depthTiles = 0, inCore = false) {
    const { top, bot, dayK } = this.skyColors(world, event);
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
    // stars
    if (dayK < 0.8) {
      ctx.globalAlpha = (1 - dayK) * 0.9;
      for (const [sx, sy, sb] of this.stars) {
        const x = ((sx * vw * 1.3 - cam.x * 0.02) % vw + vw) % vw, y = sy * vh * 0.7;
        ctx.fillStyle = sb > 0.8 ? '#9ff4ff' : '#ffffff';
        const s = sb > 0.92 ? 2 : 1;
        ctx.fillRect(x | 0, y | 0, s, s);
      }
      ctx.globalAlpha = 1;
    }
    // sun / moons
    const t = world.time / 3600;
    if (t >= 4.5 && t < 19.5) {
      const k = (t - 4.5) / 15;
      const x = lerp(-0.05, 1.05, k) * vw, y = vh * 0.6 - Math.sin(k * Math.PI) * vh * 0.5;
      ctx.fillStyle = event === 'eclipse' ? '#110800' : '#fff3c0';
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.25; ctx.fillStyle = event === 'eclipse' ? '#ffb12e' : '#fff3c0';
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else {
      const nt = t >= 19.5 ? t - 19.5 : t + 4.5;
      const k = nt / 9;
      const x = lerp(-0.05, 1.05, k) * vw, y = vh * 0.6 - Math.sin(k * Math.PI) * vh * 0.5;
      ctx.fillStyle = event === 'redshift' ? '#ff5a5a' : '#d8e4ff';
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9aa8d0'; ctx.beginPath(); ctx.arc(x + 4, y - 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b0a0ff'; ctx.beginPath(); ctx.arc(x - 40, y + 20, 6, 0, Math.PI * 2); ctx.fill();
    }
    // ring arc of the orbital megastructure
    ctx.globalAlpha = 0.18 + dayK * 0.12;
    ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(vw * 0.5, vh * 1.1, vw * 0.9, vh * 0.75, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.globalAlpha = 1;

    // parallax silhouettes, fading out underground
    const surf = clamp(1 - (depthTiles - 8) / 30, 0, 1);
    if (surf > 0) {
      for (let d = 0; d < 3; d++) {
        const img = this.layer(biome, d);
        const par = [0.08, 0.16, 0.28][d];
        const scale = Math.max(1, vh / 300);
        const iw = img.width * scale, ih = img.height * scale;
        const ox = -((cam.x * par) % iw + iw) % iw;
        const oy = vh - ih * 0.85 + (cam.yOff || 0) * par * 0.5 + d * 10 * scale;
        ctx.globalAlpha = surf * (0.55 + 0.45 * dayK + 0.2);
        for (let x = ox; x < vw; x += iw) ctx.drawImage(img, x, oy, iw, ih);
      }
      ctx.globalAlpha = 1;
    }
    // underground backdrop
    if (depthTiles > 12) {
      const a = clamp((depthTiles - 12) / 25, 0, 1);
      ctx.globalAlpha = a;
      const deep = inCore;
      const mid = depthTiles > (world.layers.cavern - world.layers.surface);
      ctx.fillStyle = deep ? '#2a0f0a' : mid ? '#14161c' : '#1e1814';
      ctx.fillRect(0, 0, vw, vh);
      ctx.fillStyle = deep ? '#3a1510' : mid ? '#1c1f27' : '#2a221c';
      const s = 48;
      const ox = -((cam.x * 0.5) % s + s) % s, oy = -((cam.y * 0.5) % s + s) % s;
      for (let y = oy; y < vh; y += s) for (let x = ox; x < vw; x += s) {
        const hx = Math.floor((x - ox + cam.x * 0.5) / s), hy = Math.floor((y - oy + cam.y * 0.5) / s);
        if (hash2(hx, hy, 3) > 0.5) ctx.fillRect(x, y, s - 4, s - 4);
      }
      ctx.globalAlpha = 1;
    }
  }
}
