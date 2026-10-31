// Telegraphed area attacks used by bosses: strikes, beams, shockwaves and pillars.
// Every hazard warns first (thin, flickering outline) and only hurts once it is active,
// so each attack can be read and dodged.
//   column: vertical strike at x            { x, w }
//   line:   beam segment                    { x1, y1, x2, y2, w }
//   wave:   shockwave running along a floor { x, y, vx }
//   pillar: column rising from the floor    { x, y, w, h }
// Common fields: warn (ticks before it hurts), life (ticks it hurts for), dmg, color, cause,
// follow(game, h) — optional per-tick update that moves the hazard (return false to remove it).
import { TILE } from '../core/util.js';

export function addHazard(game, h) {
  const hz = Object.assign({ warn: 60, life: 30, dmg: 30, color: '#ff3355', w: 16, t: 0, cause: 'a hazard' }, h);
  game.hazards.push(hz);
  return hz;
}

function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function hits(h, p) {
  switch (h.type) {
    case 'column': return Math.abs(p.cx - h.x) < h.w / 2 + p.w / 2;
    case 'line': return segDist(p.cx, p.cy, h.x1, h.y1, h.x2, h.y2) < h.w / 2 + 8;
    case 'wave': return Math.abs(p.cx - h.x) < 14 && p.y + p.h > h.y - 18 && p.y < h.y;
    case 'pillar': return Math.abs(p.cx - h.x) < h.w / 2 + p.w / 2 && p.y + p.h > h.y - h.h && p.y < h.y;
  }
  return false;
}

export function updateHazards(game) {
  const p = game.player;
  for (const h of game.hazards) {
    h.t++;
    if (h.follow && h.follow(game, h) === false) { h.done = true; continue; }
    if (h.type === 'wave') {
      h.x += h.vx;
      // shockwaves follow the floor and die at walls or ledges
      const tx = Math.floor(h.x / TILE), ty = Math.floor((h.y - 4) / TILE);
      if (game.world.solidAt(tx, ty) || !game.world.solidAt(tx, ty + 1)) h.done = true;
    }
    if (h.t > h.warn + h.life) { h.done = true; continue; }
    if (h.t > h.warn && !p.dead && hits(h, p)) game.hurtPlayer(h.dmg, h.x !== undefined ? h.x : (h.x1 + h.x2) / 2, 5, h.cause);
  }
  game.hazards = game.hazards.filter((h) => !h.done);
}

// Drawn in the additive glow pass, so hazards read clearly even in the dark.
export function drawHazards(ctx, game) {
  for (const h of game.hazards) {
    const active = h.t > h.warn;
    const k = active ? 1 - (h.t - h.warn) / h.life * 0.5 : 0.25 + 0.25 * Math.abs(Math.sin(h.t * 0.25));
    ctx.globalAlpha = Math.max(0.1, k);
    ctx.fillStyle = h.color; ctx.strokeStyle = h.color;
    const top = game.cam.y - 40, bottom = game.cam.y + game.view.h + 40;
    switch (h.type) {
      case 'column': {
        const w = active ? h.w : 2;
        ctx.fillRect(h.x - w / 2, top, w, bottom - top);
        if (!active) { ctx.lineWidth = 1; ctx.strokeRect(h.x - h.w / 2, game.player.cy - 14, h.w, 28); }
        break;
      }
      case 'line':
        ctx.lineWidth = active ? h.w : 1;
        ctx.beginPath(); ctx.moveTo(h.x1, h.y1); ctx.lineTo(h.x2, h.y2); ctx.stroke();
        if (active) { ctx.globalAlpha *= 0.4; ctx.lineWidth = h.w * 2.5; ctx.stroke(); }
        break;
      case 'wave':
        ctx.fillRect(h.x - 6, h.y - (active ? 18 : 6), 12, active ? 18 : 6);
        break;
      case 'pillar': {
        const ph = active ? h.h : 6;
        ctx.fillRect(h.x - h.w / 2, h.y - ph, h.w, ph);
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}
