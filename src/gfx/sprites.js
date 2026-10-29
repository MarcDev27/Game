// Procedural sprites for the player, town NPCs, monsters, bosses and projectiles.
import { shade, rgba } from '../core/util.js';
import { iconCanvas } from './icons.js';
import { ITEMS } from '../content/items.js';

const R = (ctx, col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

// ---------------- humanoids (player + town NPCs) ----------------
export function drawHumanoid(ctx, e, look, gear, t) {
  // e: x,y,w,h, dir, anim (walk phase), onGround, vy, useAnim {angle}, flying
  const x = Math.round(e.x + e.w / 2), y = Math.round(e.y);
  const dir = e.dir;
  ctx.save();
  ctx.translate(x, y);
  if (dir < 0) ctx.scale(-1, 1);
  const chassis = look.chassis || '#c8d0da';
  const suit = gear.body || look.suit || '#2a3a4f';
  const legsC = gear.legs || ((gear.imp && gear.imp.legs) ? '#8a8f99' : shade(look.suit || '#2a3a4f', 0.8));
  const helm = gear.head || null;
  const imp = gear.imp || {};
  const visor = imp.optic ? imp.optic.c : (look.visor || '#2ef2ff');
  const walk = e.onGround && Math.abs(e.vx) > 0.2 ? Math.sin(e.anim * 0.35) : 0;
  const air = !e.onGround;
  // jetpack
  if (gear.wings) {
    R(ctx, shade(gear.wings, 0.6), -9, 12, 5, 14); R(ctx, gear.wings, -8, 13, 3, 12);
    if (e.flying) {
      const f = 4 + ((t >> 1) % 4);
      R(ctx, '#ffb12e', -8, 26, 3, f); R(ctx, '#ffffff', -7, 26, 1, f - 2);
    }
  }
  // back arm
  const armSwing = air ? -0.6 : walk * 0.6;
  // legs
  const l1 = air ? -3 : Math.round(walk * 4), l2 = air ? 2 : -Math.round(walk * 4);
  R(ctx, shade(legsC, 0.7), -4 + l2, 28, 5, 13);
  R(ctx, '#1a1f28', -4 + l2, 40, 6, 2);
  R(ctx, legsC, -2 + l1, 28, 5, 13);
  R(ctx, '#1a1f28', -2 + l1, 40, 6, 2);
  R(ctx, shade(legsC, 1.3), -1 + l1, 29, 1, 9);
  if (imp.spine) { R(ctx, '#59616c', -8, 13, 2, 16); R(ctx, imp.spine.c, -8, 15, 2, 1); R(ctx, imp.spine.c, -8, 20, 2, 1); R(ctx, imp.spine.c, -8, 25, 2, 1); }
  if (imp.legs) { R(ctx, imp.legs.c, -3 + l2, 33, 3, 1); R(ctx, imp.legs.c, -1 + l1, 33, 3, 1); }
  // torso
  R(ctx, suit, -5, 14, 11, 15);
  R(ctx, shade(suit, 1.25), -4, 14, 9, 2);
  R(ctx, shade(suit, 0.7), -5, 27, 11, 2);
  R(ctx, visor, 1, 18, 3, 1);
  if (!gear.body) { R(ctx, shade(chassis, 0.85), -2, 15, 4, 2); }
  if (imp.core) { R(ctx, imp.core.c, -2, 19, 3, 3); R(ctx, '#ffffff', -1, 20, 1, 1); }
  if (imp.arms && imp.arms.k === 'launcher_arm') { R(ctx, '#59616c', -8, 10, 7, 5); R(ctx, imp.arms.c, -7, 11, 2, 3); }
  // head
  const hy = 2;
  R(ctx, chassis, -5, hy, 11, 12);
  R(ctx, shade(chassis, 1.15), -4, hy, 9, 2);
  R(ctx, shade(chassis, 0.75), -5, hy + 10, 11, 2);
  // visor band
  R(ctx, '#0e1e24', -1, hy + 4, 8, 4);
  R(ctx, visor, 0, hy + 5, 6, 2);
  R(ctx, '#ffffff', 4, hy + 5, 1, 1);
  // crest / hair
  const hair = look.hair || '#ff3ddc';
  switch (look.style || 0) {
    case 0: R(ctx, hair, -6, hy - 2, 9, 3); R(ctx, hair, -6, hy, 3, 6); break;
    case 1: R(ctx, hair, -3, hy - 4, 3, 5); R(ctx, hair, -6, hy - 2, 3, 3); break;
    case 2: R(ctx, hair, -6, hy - 1, 12, 2); R(ctx, hair, -7, hy, 2, 10); break;
    case 3: R(ctx, '#aeb7c2', -1, hy - 5, 1, 5); R(ctx, hair, -2, hy - 7, 3, 2); break;
    default: break;
  }
  if (helm) {
    R(ctx, helm, -6, hy - 2, 13, 9); R(ctx, shade(helm, 1.3), -5, hy - 2, 11, 2); R(ctx, shade(helm, 0.7), -6, hy + 6, 2, 6);
    R(ctx, '#0e1e24', -1, hy + 4, 8, 4); R(ctx, visor, 0, hy + 5, 6, 2);
  }
  ctx.restore();
  return armSwing;
}

export function drawArm(ctx, e, look, gear, angle) {
  const x = Math.round(e.x + e.w / 2), y = Math.round(e.y);
  ctx.save();
  ctx.translate(x + e.dir * 1, y + 16);
  ctx.rotate(angle);
  const suit = gear.body || look.suit || '#2a3a4f';
  const arms = gear.imp && gear.imp.arms;
  if (arms && arms.k === 'gorilla_arms') { R(ctx, '#59616c', -3, 0, 6, 11); R(ctx, '#aeb7c2', -3, 9, 6, 4); R(ctx, '#ffcc33', -1, 4, 2, 2); }
  else { R(ctx, shade(suit, 0.85), -2, 0, 4, 11); R(ctx, look.chassis || '#c8d0da', -2, 10, 4, 3); }
  if (arms && arms.k === 'mantis_blades') { R(ctx, '#ff6a3d', 1, 2, 2, 14); R(ctx, '#ffd0b0', 2, 3, 1, 12); }
  ctx.restore();
}

// Rideable vehicles. The pilot is drawn seated, then the vehicle body in front.
export function drawVehicle(ctx, p, key, d, look, gear, t) {
  const c = d.color, c2 = d.c2;
  ctx.save();
  ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y));
  if (p.dir < 0) ctx.scale(-1, 1);
  const pilot = (sx, sy) => drawHumanoid(ctx, { x: sx - 10, y: sy, w: 20, h: 42, dir: 1, anim: 0, onGround: true, vx: 0, vy: 0 }, look, gear, t);
  const flick = (t >> 1) % 2;
  switch (key) {
    case 'hoverbike':
      pilot(-3, -20);
      R(ctx, c2, -19, 8, 36, 9); R(ctx, c, -17, 6, 28, 5); R(ctx, shade(c, 1.4), -15, 6, 20, 1);
      R(ctx, c, 9, 2, 10, 6); R(ctx, '#ffffff', 17, 3, 2, 2); R(ctx, c2, 6, -6, 3, 9);
      ctx.globalAlpha = flick ? 0.9 : 0.6; R(ctx, '#2ef2ff', -15, 18, 10, 3); R(ctx, '#2ef2ff', 5, 18, 10, 3); ctx.globalAlpha = 1;
      break;
    case 'skycar':
      pilot(2, -22);
      R(ctx, c2, -27, 6, 54, 16); R(ctx, c, -25, 4, 48, 11); R(ctx, shade(c, 1.35), -23, 4, 40, 2);
      R(ctx, c, 18, 8, 9, 7); R(ctx, '#fff3c0', 25, 9, 2, 3);
      ctx.fillStyle = 'rgba(150,230,255,0.35)'; ctx.fillRect(-8, -12, 22, 17); R(ctx, 'rgba(255,255,255,0.5)', -6, -11, 2, 8);
      R(ctx, c2, -27, 18, 12, 4); R(ctx, c2, 14, 18, 12, 4);
      ctx.globalAlpha = 0.8; R(ctx, flick ? '#ffb12e' : '#ff6a3d', -33, 9, 6, 6); ctx.globalAlpha = 1;
      R(ctx, '#2ef2ff', -20, 21, 6, 2); R(ctx, '#2ef2ff', 18, 21, 6, 2);
      break;
    case 'drillpod': {
      R(ctx, c2, -15, 1, 30, 28); R(ctx, c, -13, 3, 24, 23); R(ctx, shade(c, 1.3), -12, 3, 20, 2);
      R(ctx, '#0e1e24', -7, 7, 12, 8); R(ctx, look.visor || '#2ef2ff', -5, 9, 8, 3);
      const sp = (t >> 1) % 3;
      ctx.fillStyle = '#aeb7c2'; ctx.beginPath(); ctx.moveTo(14, 4); ctx.lineTo(24, 15); ctx.lineTo(14, 26); ctx.fill();
      R(ctx, '#59616c', 15, 8 + sp * 3, 6, 2); R(ctx, '#59616c', 15, 16 + sp * 2, 4, 2);
      R(ctx, '#3a3d46', -13, 25, 24, 4); for (let k = 0; k < 4; k++) R(ctx, '#aeb7c2', -12 + k * 7 + (t >> 2) % 3, 26, 3, 2);
      break;
    }
    case 'mech': {
      const walk = Math.abs(p.vx) > 0.2 && p.onGround ? Math.sin(t * 0.25) * 4 : 0;
      R(ctx, shade(c, 0.6), -14 + walk, 36, 8, 22); R(ctx, shade(c, 0.6), 6 - walk, 36, 8, 22);
      R(ctx, '#222', -16 + walk, 55, 12, 3); R(ctx, '#222', 4 - walk, 55, 12, 3);
      R(ctx, c, -18, 12, 36, 26); R(ctx, shade(c, 1.25), -18, 12, 36, 3);
      R(ctx, '#0e1e24', -8, 16, 16, 9); R(ctx, look.visor || '#2ef2ff', -6, 19, 12, 3);
      R(ctx, c2, -4, 30, 8, 3);
      R(ctx, shade(c, 0.8), 14, 18, 10, 8); R(ctx, '#333', 22, 20, 12, 4); R(ctx, c2, 32, 20, 2, 4);
      R(ctx, shade(c, 0.8), -24, 16, 8, 14);
      break;
    }
    case 'starjumper':
      pilot(4, -18);
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-29, 22); ctx.lineTo(-20, 4); ctx.lineTo(18, 2); ctx.lineTo(31, 14); ctx.lineTo(18, 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-24, 18); ctx.lineTo(-17, 7); ctx.lineTo(16, 5); ctx.lineTo(26, 14); ctx.lineTo(16, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(208,160,255,0.35)'; ctx.fillRect(-4, -8, 20, 14);
      R(ctx, '#2ef2ff', 20, 12, 4, 2);
      ctx.globalAlpha = 0.85; R(ctx, flick ? '#d0a0ff' : '#ffffff', -36, 10, 9, 6); ctx.globalAlpha = 1;
      R(ctx, c2, -14, 22, 16, 3);
      break;
  }
  ctx.restore();
}

export function drawHeldItem(ctx, e, key, angle, style) {
  const it = ITEMS[key];
  if (!it) return;
  const ic = iconCanvas(key);
  const x = Math.round(e.x + e.w / 2), y = Math.round(e.y + 16);
  ctx.save();
  ctx.translate(x + e.dir, y);
  ctx.rotate(angle);
  if (style === 'shoot' || style === 'hold') {
    if (e.dir < 0) ctx.scale(1, -1);
    ctx.drawImage(ic, 2, -8, 16, 16);
  } else {
    const s = it.size ? Math.max(16, Math.min(32, it.size * 0.7)) : 16;
    ctx.rotate(-Math.PI / 4 * (e.dir < 0 ? -1 : 1));
    if (e.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(ic, 6, -6 - s, s, s);
  }
  ctx.restore();
}

// ---------------- monsters ----------------
function eye(ctx, x, y, r, iris, look) {
  ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(x + look[0] * r * 0.35, y + look[1] * r * 0.35, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x + look[0] * r * 0.45, y + look[1] * r * 0.45, r * 0.25, 0, Math.PI * 2); ctx.fill();
}

export function drawMonster(ctx, m, t, target) {
  const d = m.def;
  const c = d.color, c2 = d.c2;
  const x = m.x, y = m.y, w = m.w, h = m.h;
  const cx = x + w / 2, cy = y + h / 2;
  const flash = m.hitFlash > 0;
  const look = target ? [Math.sign(target.x - cx), Math.sign(target.y - cy) * 0.6] : [m.dir, 0];
  ctx.save();
  if (flash) ctx.globalAlpha = 0.6;
  switch (d.sprite) {
    case 'slime': {
      const squash = m.onGround ? 1 : 0.85;
      const sh = h * squash, sy = y + h - sh;
      ctx.globalAlpha = flash ? 0.5 : 0.85;
      R(ctx, c, x + 2, sy + 2, w - 4, sh - 2); R(ctx, c, x, sy + 5, w, sh - 7);
      ctx.globalAlpha = 1;
      R(ctx, shade(c, 1.4), x + 4, sy + 4, 4, 3);
      R(ctx, shade(c, 0.5), x + 2, y + h - 2, w - 4, 2);
      const core = d.boss ? 10 : 4;
      R(ctx, '#ffffff', cx - core / 2 + m.dir * 2, sy + sh * 0.4, core, core);
      R(ctx, shade(c, 0.3), cx - core / 4 + m.dir * 3, sy + sh * 0.4 + core / 4, core / 2, core / 2);
      if (d.boss) { R(ctx, '#ffcc33', cx - 14, sy - 8, 28, 6); for (let k = 0; k < 4; k++) R(ctx, '#ffcc33', cx - 14 + k * 8, sy - 14, 4, 6); R(ctx, '#ff3355', cx - 2, sy - 7, 4, 4); }
      break;
    }
    case 'eye': {
      const r = Math.min(w, h) / 2;
      ctx.translate(cx, cy); ctx.rotate(m.rot || 0);
      R(ctx, shade(c, 0.6), -r - 4, -3, 6, 6);
      ctx.fillStyle = shade(c, 0.7); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(r * 0.4, 0, r * 0.38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(r * 0.4 - 1, -2, 3, 3);
      // armor plates
      ctx.strokeStyle = shade(c, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 1, Math.PI * 0.7, Math.PI * 1.3); ctx.stroke();
      if (m.phase === 2) { ctx.fillStyle = '#aeb7c2'; for (let k = -2; k <= 2; k++) ctx.fillRect(r * 0.6, k * 5 - 1, 6, 2); }
      break;
    }
    case 'bot': case 'husk': case 'mech': case 'caster': case 'sentinel': case 'imp': {
      const walk = Math.sin(m.anim * 0.3) * (m.onGround ? 3 : 0);
      ctx.translate(cx, y); if (m.dir < 0) ctx.scale(-1, 1);
      const hw = w / 2;
      R(ctx, shade(c, 0.6), -hw + 3 - walk * 0.5, h - 14, 5, 14); R(ctx, c, hw - 8 + walk * 0.5, h - 14, 5, 14);
      R(ctx, c, -hw + 2, 12, w - 4, h - 25);
      R(ctx, shade(c, 1.2), -hw + 2, 12, w - 4, 2);
      R(ctx, c, -hw + 4, 0, w - 8, 12);
      R(ctx, '#111', -1, 4, hw - 1, 4); R(ctx, c2, 0, 5, hw - 3, 2);
      if (d.sprite === 'caster' || d.sprite === 'sentinel') { R(ctx, shade(c, 0.7), -hw, 14, w, h - 20); R(ctx, c2, -2, 18, 4, 8); }
      if (d.sprite === 'imp') { R(ctx, c2, -hw + 2, -4, 3, 5); R(ctx, c2, hw - 5, -4, 3, 5); }
      if (d.sprite === 'mech') { R(ctx, shade(c, 0.8), -hw - 2, 12, 5, 8); R(ctx, shade(c, 0.8), hw - 3, 12, 5, 8); R(ctx, c2, -3, 18, 6, 4); }
      R(ctx, shade(c, 0.8), hw - 6, 14 + walk, 4, 12);
      break;
    }
    case 'crawler': case 'spider': {
      ctx.translate(cx, cy); if (m.dir < 0) ctx.scale(-1, 1);
      const k = Math.sin(m.anim * 0.5) * 2;
      ctx.fillStyle = shade(c, 0.6);
      for (let i = -2; i <= 2; i++) { ctx.fillRect(i * 5 - 1, h / 2 - 6 + (i % 2 ? k : -k), 2, 6); }
      R(ctx, c, -w / 2 + 2, -h / 2 + 4, w - 4, h - 8);
      R(ctx, shade(c, 1.25), -w / 2 + 4, -h / 2 + 4, w - 10, 2);
      R(ctx, c2, w / 2 - 7, -h / 2 + 6, 3, 3); R(ctx, c2, w / 2 - 11, -h / 2 + 6, 2, 2);
      if (d.sprite === 'crawler') { R(ctx, shade(c, 0.8), -w / 2 - 2, -h / 2, 6, 3); R(ctx, c2, -w / 2 - 4, -h / 2 - 3, 3, 3); }
      break;
    }
    case 'drone': {
      const bob = Math.sin(t * 0.15 + m.id) * 1.5;
      R(ctx, shade(c, 0.6), x, y + 2 + bob, w, 3);
      const spin = (t >> 1) % 2 ? w : w * 0.4;
      R(ctx, '#aeb7c2', cx - spin / 2, y + bob, spin, 2);
      R(ctx, c, x + 3, y + 5 + bob, w - 6, h - 7);
      R(ctx, shade(c, 1.3), x + 4, y + 5 + bob, w - 8, 2);
      R(ctx, '#111', cx - 4 + m.dir * 2, y + h / 2 + bob, 8, 4); R(ctx, c2, cx - 2 + m.dir * 3, y + h / 2 + 1 + bob, 4, 2);
      break;
    }
    case 'bat': case 'bug': {
      const flap = Math.sin(t * 0.6 + m.id) > 0;
      ctx.fillStyle = shade(c, 0.7);
      if (flap) { ctx.fillRect(x - 4, y + 2, w / 2, 4); ctx.fillRect(cx + 4, y + 2, w / 2, 4); }
      else { ctx.fillRect(x - 2, y + 6, w / 2, 6); ctx.fillRect(cx + 2, y + 6, w / 2, 6); }
      R(ctx, c, cx - 6, y + 3, 12, h - 4);
      R(ctx, c2, cx - 4 + m.dir * 2, y + 6, 3, 3); R(ctx, c2, cx + 1 + m.dir * 2, y + 6, 3, 3);
      if (d.sprite === 'bug') { R(ctx, c2, cx - 6, y + h - 6, 12, 2); R(ctx, '#333', cx + m.dir * 6, y + h - 3, 2, 4); }
      break;
    }
    case 'pod': {
      const open = Math.sin(t * 0.1 + m.id) > 0.3;
      R(ctx, shade(c, 0.6), cx - 2, y + h * 0.5, 4, h * 0.5);
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, y + h * 0.4, w * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(cx, y + h * 0.4, open ? w * 0.28 : w * 0.12, 0, Math.PI * 2); ctx.fill();
      R(ctx, '#ffffff', cx - 2, y + h * 0.35, 2, 2);
      break;
    }
    case 'worm': case 'mechworm': case 'wyvern': {
      const r = w / 2;
      ctx.translate(cx, cy); ctx.rotate(m.rot || 0);
      const isHead = m.segIndex === 0, isTail = m.isTail;
      ctx.fillStyle = shade(c, 0.6); ctx.fillRect(-r, -r, w, h);
      ctx.fillStyle = c; ctx.fillRect(-r + 2, -r + 2, w - 4, h - 4);
      ctx.fillStyle = shade(c, 1.3); ctx.fillRect(-r + 2, -r + 2, w - 4, 2);
      if (d.sprite === 'mechworm') { ctx.fillStyle = c2; ctx.fillRect(-2, -2, 4, 4); }
      if (d.sprite === 'wyvern' && !isHead && !isTail && m.segIndex % 4 === 2) { ctx.fillStyle = c2; ctx.fillRect(-r, -r - 8, w, 6); ctx.fillRect(-r, r + 2, w, 6); }
      if (isHead) { ctx.fillStyle = c2; ctx.fillRect(r - 6, -r + 3, 4, 4); ctx.fillRect(r - 6, r - 7, 4, 4); ctx.fillStyle = '#ddd'; ctx.fillRect(r, -r + 2, 5, 3); ctx.fillRect(r, r - 5, 5, 3); }
      if (isTail) { ctx.fillStyle = shade(c, 0.5); ctx.fillRect(-r - 6, -3, 8, 6); }
      break;
    }
    case 'jelly': {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, y + h * 0.35, w / 2, Math.PI, 0); ctx.fill();
      ctx.fillRect(x, y + h * 0.35, w, 3);
      ctx.globalAlpha = 1;
      for (let k = 0; k < 4; k++) R(ctx, c2, x + 3 + k * 5, y + h * 0.4, 1, 8 + Math.sin(t * 0.2 + k) * 3);
      break;
    }
    case 'fish': {
      ctx.translate(cx, cy); if (m.dir < 0) ctx.scale(-1, 1);
      R(ctx, c, -w / 2, -h / 2 + 4, w - 8, h - 8);
      R(ctx, shade(c, 1.3), -w / 2 + 4, -h / 2 + 4, w - 16, 2);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 - 10, -10); ctx.lineTo(-w / 2 - 10, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, -h / 2 + 4); ctx.lineTo(4, -h / 2 - 6); ctx.lineTo(10, -h / 2 + 4); ctx.fill();
      R(ctx, c2, w / 2 - 16, -4, 4, 3);
      break;
    }
    case 'wisp': {
      const p = 1 + Math.sin(t * 0.2 + m.id) * 0.15;
      ctx.globalAlpha = 0.35; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, w * 0.6 * p, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, w * 0.35, 0, Math.PI * 2); ctx.fill();
      R(ctx, c2, cx - 2, cy - 2, 4, 4);
      break;
    }
    case 'wraith': case 'skull': {
      const bob = Math.sin(t * 0.12 + m.id) * 2;
      ctx.globalAlpha = flash ? 0.4 : 0.75;
      if (d.sprite === 'wraith') {
        ctx.fillStyle = c; ctx.fillRect(x + 2, y + 10 + bob, w - 4, h - 16);
        for (let k = 0; k < 4; k++) ctx.fillRect(x + 2 + k * (w - 4) / 4, y + h - 6 + bob + (k % 2) * 3, (w - 4) / 4 - 1, 6);
      }
      ctx.globalAlpha = 1;
      R(ctx, shade(c, 1.2), cx - 7, y + bob, 14, 12);
      R(ctx, '#111', cx - 5, y + 4 + bob, 4, 4); R(ctx, '#111', cx + 1, y + 4 + bob, 4, 4);
      R(ctx, c2, cx - 4, y + 5 + bob, 2, 2); R(ctx, c2, cx + 2, y + 5 + bob, 2, 2);
      break;
    }
    case 'demon': {
      const flap = Math.sin(t * 0.3 + m.id) * 6;
      ctx.fillStyle = shade(c, 0.7);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x - 8, y + flap); ctx.lineTo(x, cy + 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x + w + 8, y + flap); ctx.lineTo(x + w, cy + 8); ctx.fill();
      R(ctx, c, cx - 10, y + 6, 20, h - 8); R(ctx, c2, cx - 6, y + 10, 4, 3); R(ctx, c2, cx + 2, y + 10, 4, 3);
      R(ctx, shade(c, 0.6), cx - 10, y, 4, 6); R(ctx, shade(c, 0.6), cx + 6, y, 4, 6);
      break;
    }
    case 'charger': {
      ctx.translate(cx, cy); if (m.dir < 0) ctx.scale(-1, 1);
      const k = Math.sin(m.anim * 0.5) * 3;
      R(ctx, shade(c, 0.7), -w / 2 + 4, h / 2 - 10 + k, 4, 10); R(ctx, shade(c, 0.7), w / 2 - 10, h / 2 - 10 - k, 4, 10);
      R(ctx, c, -w / 2 + 2, -h / 2 + 6, w - 10, h - 14);
      R(ctx, c, w / 2 - 14, -h / 2, 12, 12);
      R(ctx, c2, w / 2 - 2, -h / 2 - 8, 2, 10);
      R(ctx, c2, -w / 2, -h / 2 + 4, 6, 4);
      R(ctx, '#111', w / 2 - 6, -h / 2 + 3, 3, 3);
      break;
    }
    default:
      drawBossSprite(ctx, m, t, look);
  }
  ctx.restore();
  // hunter / boss eyes glow handled by drawMonsterGlow
}

function drawBossSprite(ctx, m, t, look) {
  const d = m.def, c = d.color, c2 = d.c2;
  const x = m.x, y = m.y, w = m.w, h = m.h, cx = x + w / 2, cy = y + h / 2;
  switch (d.sprite) {
    case 'queen': {
      const flap = Math.sin(t * 0.8) * 8;
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#e8f6ff';
      ctx.beginPath(); ctx.ellipse(cx - 10, y + 10 + flap * 0.3, 24, 12, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 10, y + 10 - flap * 0.3, 24, 12, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      R(ctx, c, x + 10, y + 16, w - 20, h - 24);
      for (let k = 0; k < 4; k++) R(ctx, '#333', x + 14 + k * 14, y + 18, 6, h - 28);
      R(ctx, c, cx + m.dir * 24 - 10, y + 10, 20, 18);
      R(ctx, c2, cx + m.dir * 28 - 3, y + 14, 6, 6);
      R(ctx, '#ffcc33', cx - m.dir * 36, cy + 8, 8, 4);
      break;
    }
    case 'archon': {
      ctx.translate(cx, cy); ctx.rotate(m.rot || 0);
      const r = w / 2;
      R(ctx, shade(c, 0.4), -r, -r, w, h);
      R(ctx, d.prime ? '#59616c' : '#1f2d3d', -r + 3, -r + 3, w - 6, h - 6);
      R(ctx, c, -r + 6, -r + 6, w - 12, 8);
      eye(ctx, -r * 0.4, -r * 0.1, 9, c2, look); eye(ctx, r * 0.4, -r * 0.1, 9, c2, look);
      R(ctx, c, -r * 0.5, r * 0.4, r, 6);
      for (let k = -3; k <= 3; k++) R(ctx, '#ddd', k * 6 - 2, r * 0.4 + 6, 4, 6);
      break;
    }
    case 'hand': case 'fist': case 'ahand': {
      ctx.translate(cx, cy); ctx.rotate(m.rot || 0);
      const r = w / 2;
      R(ctx, shade(c, 0.5), -r, -r, w, h);
      R(ctx, c, -r + 3, -r + 3, w - 6, h - 6);
      for (let k = 0; k < 4; k++) R(ctx, shade(c, 0.7), -r + 4 + k * (w - 8) / 4, -r - 6, (w - 8) / 4 - 2, 8);
      R(ctx, c2, -4, -4, 8, 8);
      if (d.prime) { R(ctx, '#ff3355', -r + 4, r - 8, w - 8, 3); }
      break;
    }
    case 'warden': {
      // wall: drawn by boss code in segments; here the body slab
      R(ctx, shade(c, 0.5), x, y, w, h);
      for (let yy = y; yy < y + h; yy += 24) { R(ctx, c, x + 4, yy + 2, w - 8, 20); R(ctx, shade(c2, 0.6), x + 8, yy + 10, w - 16, 3); }
      for (const ey of [0.2, 0.8]) {
        const ex = m.dir > 0 ? x + w - 24 : x + 24, eyY = y + h * ey;
        eye(ctx, ex, eyY, 18, c2, look);
      }
      R(ctx, '#111', m.dir > 0 ? x + w - 40 : x + 10, cy - 20, 30, 40);
      for (let k = 0; k < 5; k++) R(ctx, '#ddd', m.dir > 0 ? x + w - 38 : x + 12, cy - 18 + k * 8, 26, 3);
      break;
    }
    case 'bloom': {
      const pulse = Math.sin(t * 0.1) * 3;
      ctx.fillStyle = shade(c2, 0.7);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + t * 0.01; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, 16, 8, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, 34 + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(c, 1.3); ctx.beginPath(); ctx.arc(cx - 10, cy - 10, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a0a1a'; ctx.beginPath(); ctx.arc(cx + Math.cos(m.rot || 0) * 14, cy + Math.sin(m.rot || 0) * 14, m.phase === 2 ? 16 : 10, 0, Math.PI * 2); ctx.fill();
      if (m.phase === 2) for (let k = 0; k < 6; k++) R(ctx, '#ffffff', cx + Math.cos(m.rot || 0) * 14 - 10 + k * 4, cy + Math.sin(m.rot || 0) * 14 - 2, 2, 4);
      break;
    }
    case 'golem': {
      R(ctx, shade(c, 0.5), x, y + 30, w, h - 30);
      R(ctx, c, x + 4, y + 34, w - 8, h - 38);
      for (let k = 0; k < 3; k++) R(ctx, c2, x + 16 + k * 28, y + 60, 16, 4);
      R(ctx, shade(c, 0.7), cx - 26, y, 52, 36);
      R(ctx, c, cx - 22, y + 4, 44, 28);
      R(ctx, m.phase === 2 ? '#ff3355' : c2, cx - 16, y + 12, 10, 6); R(ctx, m.phase === 2 ? '#ff3355' : c2, cx + 6, y + 12, 10, 6);
      break;
    }
    case 'architect': {
      const bob = Math.sin(t * 0.03) * 6;
      ctx.globalAlpha = 0.25; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy + bob, w * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      R(ctx, '#1a1030', cx - 40, y + 50 + bob, 80, h - 50);
      R(ctx, c, cx - 36, y + 54 + bob, 72, 6);
      for (let k = 0; k < 5; k++) R(ctx, shade(c2, 0.7), cx - 30 + k * 14, y + 70 + bob, 6, h - 80);
      ctx.fillStyle = '#2a1a4a'; ctx.beginPath(); ctx.arc(cx, y + 30 + bob, 34, 0, Math.PI * 2); ctx.fill();
      eye(ctx, cx, y + 30 + bob, m.phase >= 2 ? 22 : 16, m.phase >= 3 ? '#ff3355' : c2, look);
      R(ctx, c, cx - 46, y + 4 + bob, 8, 26); R(ctx, c, cx + 38, y + 4 + bob, 8, 26);
      break;
    }
    default:
      R(ctx, c, x, y, w, h);
  }
}

export function drawMonsterGlow(ctx, m) {
  const d = m.def;
  if (!d.light && !d.boss) return;
  const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = d.c2 || d.color;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(m.w, m.h) * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------- projectiles ----------------
export function drawProjectile(ctx, p, t) {
  const d = p.def, c = p.color || d.color;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const ang = Math.atan2(p.vy, p.vx);
  ctx.save();
  ctx.translate(cx, cy);
  switch (d.sprite) {
    case 'bullet':
      ctx.rotate(ang); ctx.fillStyle = rgba(c, 0.35); ctx.fillRect(-10, -1.5, 10, 3);
      ctx.fillStyle = c; ctx.fillRect(-3, -1.5, 6, 3); ctx.fillStyle = '#fff'; ctx.fillRect(0, -0.5, 3, 1); break;
    case 'laser':
      ctx.rotate(ang); ctx.fillStyle = rgba(c, 0.4); ctx.fillRect(-p.w, -p.h / 2 - 1, p.w * 2, p.h + 2);
      ctx.fillStyle = c; ctx.fillRect(-p.w / 2 - 4, -p.h / 2, p.w + 4, p.h); ctx.fillStyle = '#fff'; ctx.fillRect(-p.w / 2, -0.5, p.w, 1); break;
    case 'orb': case 'star':
      if (d.ai === 'blackhole' && p.t >= 60) {
        ctx.rotate(t * 0.15);
        for (let r = 40; r > 8; r -= 8) { ctx.globalAlpha = 0.18; ctx.fillStyle = r % 16 ? '#d0a0ff' : '#2ef2ff'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
        break;
      }
      ctx.fillStyle = rgba(c, 0.3); ctx.beginPath(); ctx.arc(0, 0, p.w * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, p.w * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-1.5, -1.5, 3, 3);
      if (d.sprite === 'star') { ctx.rotate(t * 0.2); ctx.fillStyle = c; ctx.fillRect(-p.w * 0.8, -1, p.w * 1.6, 2); ctx.fillRect(-1, -p.w * 0.8, 2, p.w * 1.6); }
      break;
    case 'rocket':
      ctx.rotate(ang); ctx.fillStyle = '#aeb7c2'; ctx.fillRect(-6, -3, 10, 6); ctx.fillStyle = c; ctx.fillRect(4, -2, 3, 4);
      ctx.fillStyle = '#ffb12e'; ctx.fillRect(-10, -2, 4, 4); break;
    case 'grenade': case 'bomb': case 'rock':
      ctx.rotate(t * 0.2); ctx.fillStyle = shade(c, 0.6); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = c; ctx.fillRect(-p.w / 2 + 1, -p.h / 2 + 1, p.w - 2, p.h - 2);
      if (d.sprite === 'bomb' && (t >> 3) % 2) { ctx.fillStyle = '#ff3355'; ctx.fillRect(-1, -p.h / 2 - 2, 2, 2); }
      break;
    case 'shuriken':
      ctx.rotate(t * 0.5); ctx.fillStyle = c; ctx.fillRect(-5, -1, 10, 2); ctx.fillRect(-1, -5, 2, 10); ctx.fillStyle = '#fff'; ctx.fillRect(-1, -1, 2, 2); break;
    case 'boomerang': case 'flail':
      ctx.rotate(t * 0.4); ctx.fillStyle = c; ctx.fillRect(-p.w / 2, -2, p.w, 4); ctx.fillRect(-2, -p.h / 2, 4, p.h);
      ctx.fillStyle = shade(c, 1.4); ctx.fillRect(-2, -2, 4, 4); break;
    case 'wave':
      ctx.rotate(ang); ctx.globalAlpha = 0.8; ctx.strokeStyle = c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-p.w * 0.3, 0, p.w * 0.6, -1.1, 1.1); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); break;
    case 'bee': case 'needle':
      ctx.rotate(ang); ctx.fillStyle = c; ctx.fillRect(-3, -2, 6, 4); ctx.fillStyle = '#222'; ctx.fillRect(-1, -2, 1, 4); break;
    case 'dust':
      ctx.globalAlpha = Math.max(0, p.life / 50); ctx.fillStyle = c;
      for (let k = 0; k < 5; k++) ctx.fillRect(Math.sin(k * 7 + t * 0.1) * 6, Math.cos(k * 5 + t * 0.1) * 6, 2, 2); break;
    case 'minion': case 'minion_bug': {
      const bob = Math.sin(t * 0.2 + p.id) * 2;
      if (p.vx < 0) ctx.scale(-1, 1);
      ctx.fillStyle = shade(c, 0.6); ctx.fillRect(-p.w / 2, -p.h / 2 + bob, p.w, p.h);
      ctx.fillStyle = c; ctx.fillRect(-p.w / 2 + 1, -p.h / 2 + 1 + bob, p.w - 2, p.h - 4);
      ctx.fillStyle = '#111'; ctx.fillRect(0, -2 + bob, p.w / 2 - 1, 4); ctx.fillStyle = '#fff'; ctx.fillRect(2, -1 + bob, 2, 2);
      ctx.fillStyle = '#aeb7c2'; ctx.fillRect(-p.w / 2, -p.h / 2 - 2 + bob, (t >> 1) % 2 ? p.w : p.w / 2, 1);
      break;
    }
    case 'sentry':
      ctx.fillStyle = '#59616c'; ctx.fillRect(-8, 0, 16, 10); ctx.fillStyle = c; ctx.fillRect(-6, -8, 12, 9);
      ctx.rotate(p.aim || 0); ctx.fillStyle = '#333'; ctx.fillRect(0, -2, 12, 4); break;
    case 'barrier': {
      const a = 0.45 + Math.sin(t * 0.3) * 0.15;
      ctx.fillStyle = `rgba(46,242,255,${a})`; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -p.h / 2, 2, p.h);
      ctx.fillStyle = '#59616c'; ctx.fillRect(-p.w / 2 - 1, p.h / 2 - 3, p.w + 2, 4); ctx.fillRect(-p.w / 2 - 1, -p.h / 2 - 1, p.w + 2, 3);
      break;
    }
    case 'bobber':
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -3, 6, 3); ctx.fillStyle = c; ctx.fillRect(-3, 0, 6, 3); ctx.fillStyle = '#222'; ctx.fillRect(-1, -5, 2, 2); break;
    case 'skull':
      ctx.fillStyle = c; ctx.fillRect(-7, -7, 14, 12); ctx.fillStyle = '#111'; ctx.fillRect(-5, -3, 4, 4); ctx.fillRect(1, -3, 4, 4); break;
    default:
      ctx.fillStyle = c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  }
  ctx.restore();
}
