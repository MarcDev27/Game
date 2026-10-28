// Procedural sprites for multi-tile furniture and interactables.
import { makeCanvas, shade } from '../core/util.js';

export function drawFurniture(t, open) {
  const f = t.furn;
  const W = f.w * 16, H = f.h * 16;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const mat = t.mat || { color: t.tint || t.map, accent: '#2ef2ff' };
  const base = mat.color, acc = mat.accent, dark = shade(base, 0.6), light = shade(base, 1.25);
  const R = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const glow = (col, x, y, w, h) => { R(col, x, y, w, h); ctx.globalAlpha = 0.35; R(shade(col, 1.4), x - 1, y - 1, w + 2, h + 2); ctx.globalAlpha = 1; R('#ffffff', x + (w >> 1), y + (h >> 1), 1, 1); };
  switch (f.kind) {
    case 'table':
      R(dark, 0, 4, W, 4); R(base, 0, 3, W, 3); R(light, 0, 3, W, 1);
      R(dark, 4, 8, 3, 24); R(dark, W - 7, 8, 3, 24); R(acc, 6, 5, W - 12, 1);
      break;
    case 'chair':
      R(dark, 2, 2, 3, 30); R(base, 3, 2, 2, 18); R(light, 3, 2, 1, 16);
      R(base, 2, 18, 12, 3); R(light, 2, 18, 12, 1);
      R(dark, 11, 21, 2, 11); R(dark, 3, 21, 2, 11); R(acc, 3, 6, 1, 6);
      break;
    case 'bench':
      R(dark, 0, 3, W, 4); R(base, 0, 2, W, 3); R(light, 0, 2, W, 1);
      R(dark, 2, 7, 3, 9); R(dark, W - 5, 7, 3, 9);
      R(acc, 8, 0, 6, 2); R('#aeb7c2', 20, 0, 4, 2);
      break;
    case 'door':
      if (!open) {
        R(dark, 2, 0, 12, H); R(base, 3, 1, 10, H - 2); R(light, 3, 1, 1, H - 2);
        R(dark, 4, 15, 8, 1); R(dark, 4, 31, 8, 1); R(acc, 10, 22, 2, 4);
        R(acc, 5, 4, 6, 1);
      } else {
        R(dark, 0, 0, 4, H); R(base, 1, 1, 2, H - 2); R(acc, 1, 22, 2, 3);
      }
      break;
    case 'chest':
      R(dark, 0, 6, 32, 26); R(base, 1, 7, 30, 24); R(light, 1, 7, 30, 1);
      R(dark, 0, 4, 32, 10); R(base, 1, 4, 30, 8); R(light, 1, 4, 30, 1);
      R(dark, 1, 13, 30, 2); R(acc, 14, 11, 4, 6); R(shade(acc, 0.6), 15, 14, 2, 2);
      R(shade(acc, 0.8), 1, 20, 30, 1);
      break;
    case 'lamp':
      R(dark, 7, 12, 2, 34); R(dark, 4, 44, 8, 4);
      R(base, 3, 2, 10, 10); R(light, 3, 2, 10, 1);
      glow(acc, 5, 5, 6, 5);
      break;
    case 'bed': {
      R(dark, 0, 12, W, 12); R(base, 1, 13, W - 2, 10);
      R('#26303c', 4, 6, W - 8, 10); R('#9ff4ff', 5, 7, W - 10, 1);
      ctx.globalAlpha = 0.5; R('#2ef2ff', 6, 8, W - 12, 6); ctx.globalAlpha = 1;
      R(light, 2, 4, 10, 4); R(acc, W - 10, 16, 6, 2); R(dark, 2, 24, 4, 8); R(dark, W - 6, 24, 4, 8);
      break;
    }
    case 'smelter':
      R('#3a3d46', 2, 4, W - 4, H - 4); R('#555a66', 3, 5, W - 6, H - 6);
      R('#2a2a30', 12, 12, 24, 14); glow('#ff8a3d', 14, 16, 20, 8);
      R('#6b7380', 0, 2, W, 3); R('#aeb7c2', 6, 0, 6, 3);
      break;
    case 'anvil':
      R('#59616c', 2, 2, 28, 5); R('#aeb7c2', 2, 2, 28, 1); R('#3a3d46', 10, 7, 12, 4); R('#59616c', 6, 11, 20, 5);
      R('#2ef2ff', 14, 3, 4, 1);
      break;
    case 'vat':
      R('#3a3d46', 1, 4, 14, 28); ctx.globalAlpha = 0.8; R('#3dff6a', 3, 10, 10, 20); ctx.globalAlpha = 1;
      R('#9dff3d', 4, 12, 2, 2); R('#ffffff', 9, 20, 1, 1); R('#aeb7c2', 0, 2, 16, 3); R('#aeb7c2', 0, 30, 16, 2);
      break;
    case 'printer':
      R('#4a4f5a', 0, 8, W, 24); R('#6b7380', 0, 8, W, 2); R('#1e2228', 6, 14, W - 12, 8);
      R('#cfd8e0', 8, 16, W - 16, 2); R('#66ccff', W - 10, 26, 4, 2); R('#3a3d46', 4, 0, 6, 8); R('#3a3d46', W - 10, 0, 6, 8);
      break;
    case 'tinker':
      R('#5a6b8a', 0, 10, W, 5); R('#8fa8c8', 0, 10, W, 1); R('#3a4a5a', 3, 15, 4, 17); R('#3a4a5a', W - 7, 15, 4, 17);
      R('#ffcc33', 8, 4, 6, 6); R('#aeb7c2', 20, 2, 3, 8); R('#2ef2ff', 30, 6, 8, 4);
      break;
    case 'forge':
      R('#3a2a4f', 1, 4, W - 2, H - 4); R('#5a3a6f', 2, 5, W - 4, 2);
      glow('#ff3fa4', 12, 14, 24, 10); R('#2a1f3a', 0, 2, W, 3);
      break;
    case 'nanoforge':
      R('#1d2a7a', 1, 4, W - 2, H - 4); R('#5a78ff', 2, 5, W - 4, 2);
      glow('#8fa8ff', 10, 12, 28, 12); R('#aeb7c2', 4, 0, 8, 4); R('#aeb7c2', W - 12, 0, 8, 4);
      break;
    case 'quantum':
      R('#118a5a', 2, 20, W - 4, H - 20); R('#3dffb0', 2, 20, W - 4, 2);
      ctx.globalAlpha = 0.5; R('#3dffb0', 12, 2, 24, 18); ctx.globalAlpha = 1;
      glow('#ffffff', 20, 8, 8, 6); R('#118a5a', 8, 0, 4, 20); R('#118a5a', W - 12, 0, 4, 20);
      break;
    case 'singularity':
      R('#3a2a4f', 4, 30, W - 8, 18); R('#d0a0ff', 4, 30, W - 8, 2);
      for (let r = 14; r > 2; r -= 3) { ctx.globalAlpha = 0.25; ctx.fillStyle = r % 2 ? '#d0a0ff' : '#2ef2ff'; ctx.beginPath(); ctx.arc(24, 16, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; R('#000', 22, 14, 4, 4); R('#ffffff', 23, 15, 1, 1);
      break;
    case 'lathe':
      R('#2a7a8a', 0, 12, W, 20); R('#7ff0ff', 0, 12, W, 2); R('#aeb7c2', 4, 4, 24, 6); glow('#9ff4ff', 12, 18, 8, 6);
      break;
    case 'terminal':
      R('#3a3d46', 2, 0, 28, 22); R('#0e1e24', 4, 2, 24, 16); R('#2ef2ff', 6, 4, 14, 1); R('#2ef2ff', 6, 7, 18, 1); R('#3dff6a', 6, 10, 10, 1); R('#2ef2ff', 6, 13, 16, 1);
      R('#59616c', 12, 22, 8, 6); R('#3a3d46', 6, 28, 20, 4);
      break;
    case 'canister': {
      const col = t.tint || '#7a8a99';
      R(shade(col, 0.55), 6, 6, 20, 26); R(col, 7, 7, 18, 24); R(shade(col, 1.3), 8, 7, 2, 24);
      R(shade(col, 0.4), 6, 14, 20, 2); R(shade(col, 0.4), 6, 24, 20, 2);
      R(shade(col, 0.7), 10, 2, 12, 5); R('#ffcc33', 14, 18, 4, 3);
      break;
    }
    case 'heart':
      ctx.fillStyle = '#ff3355';
      for (const [x, y, w, h] of [[6, 8, 8, 8], [18, 8, 8, 8], [4, 12, 24, 8], [8, 20, 16, 6], [12, 26, 8, 3]]) ctx.fillRect(x, y, w, h);
      R('#ffb0c0', 8, 10, 3, 3); R('#8a1130', 6, 30, 20, 2);
      ctx.globalAlpha = 0.25; R('#ff3355', 0, 4, 32, 28); ctx.globalAlpha = 1;
      break;
    case 'orb':
      ctx.fillStyle = '#5b5770'; ctx.beginPath(); ctx.arc(16, 16, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b06bff'; ctx.beginPath(); ctx.arc(16, 16, 10, 0, Math.PI * 2); ctx.fill();
      R('#ffffff', 11, 10, 3, 3); R('#3a2a4f', 14, 14, 4, 4);
      break;
    case 'larva':
      ctx.fillStyle = '#c29a2a'; ctx.beginPath(); ctx.ellipse(24, 28, 20, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.ellipse(24, 26, 14, 13, 0, 0, Math.PI * 2); ctx.fill();
      for (let y = 18; y < 38; y += 5) R('#8a6a1a', 12, y, 24, 1);
      R('#ffffff', 18, 20, 3, 3);
      break;
    case 'bulb':
      ctx.fillStyle = '#3a8a2a'; ctx.fillRect(14, 20, 4, 12);
      ctx.fillStyle = '#ff5aa8'; ctx.beginPath(); ctx.arc(16, 14, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb0d8'; ctx.beginPath(); ctx.arc(12, 10, 4, 0, Math.PI * 2); ctx.fill();
      R('#8a1150', 10, 18, 12, 2);
      break;
    case 'archon':
      R('#1f2d3d', 0, 4, 32, 44); R('#44607e', 1, 5, 30, 42); R('#0e1e24', 4, 8, 24, 18);
      ctx.globalAlpha = 0.8; R('#66ccff', 6, 10, 20, 14); ctx.globalAlpha = 1;
      R('#ffffff', 10, 14, 4, 4); R('#ffffff', 18, 14, 4, 4); R('#1f2d3d', 11, 15, 2, 2); R('#1f2d3d', 19, 15, 2, 2);
      R('#66ccff', 8, 32, 16, 2); R('#ff3355', 14, 38, 4, 4);
      break;
    case 'altar':
      R('#5a4520', 0, 14, W, 18); R('#8a6a2e', 2, 12, W - 4, 4); R('#ffcc33', 2, 12, W - 4, 1);
      glow('#ffaa22', 20, 4, 8, 8); R('#5a4520', 6, 18, 6, 6); R('#5a4520', W - 12, 18, 6, 6);
      break;
    default:
      R(base, 0, 0, W, H);
  }
  return c;
}
