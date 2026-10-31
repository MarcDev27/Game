// Sprites for the Strata's original enemies and bosses (see game/original.js).
const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const circle = (ctx, c, x, y, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

export function drawOriginal(ctx, m, t, look) {
  const d = m.def, c = d.color, c2 = d.c2;
  const x = m.x, y = m.y, w = m.w, h = m.h, cx = x + w / 2, cy = y + h / 2;
  if (m.cloak) ctx.globalAlpha = 0.07 + 0.05 * Math.sin(t * 0.3);
  switch (d.sprite) {
    case 'repair': {
      const bob = Math.sin(t * 0.15) * 1;
      R(ctx, '#2a3a2e', x + 2, y + 4 + bob, w - 4, h - 8);
      R(ctx, c, x + 4, y + 6 + bob, w - 8, h - 12);
      R(ctx, c2, cx - 1, y + 2 + bob, 2, 4); R(ctx, c2, cx - 4, y + bob, 8, 2); // medic cross
      R(ctx, '#aeb7c2', x, y + h / 2 + bob, 3, 2); R(ctx, '#aeb7c2', x + w - 3, y + h / 2 + bob, 3, 2);
      R(ctx, (t >> 3) % 2 ? '#e8f6ff' : c, cx - 3 + look[0] * 2, cy + bob, 6, 3);
      break;
    }
    case 'stalker': {
      R(ctx, '#1a2a2e', cx - 6, y + 2, 12, 12);
      R(ctx, c2, cx - 4 + look[0] * 2, y + 6, 8, 2);
      R(ctx, '#2a3a40', cx - 7, y + 14, 14, 16);
      R(ctx, c, cx - 7, y + 14, 2, 16); R(ctx, c, cx + 5, y + 14, 2, 16);
      const step = Math.sin(m.anim * 0.3) * 3;
      R(ctx, '#2a3a40', cx - 6, y + 30, 5, 10 + step * 0.3); R(ctx, '#2a3a40', cx + 1, y + 30, 5, 10 - step * 0.3);
      R(ctx, c, cx + m.dir * 7, y + 18, m.dir * 9, 2); // blade
      break;
    }
    case 'emp': {
      const ch = (m.ai.charge || 0) / 90;
      if (ch > 0) { ctx.globalAlpha = 0.25 + ch * 0.4; ctx.strokeStyle = c2; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 10 + (1 - ch) * 50, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
      R(ctx, '#20304a', x + 2, y + 4, w - 4, h - 8);
      R(ctx, c, x + 4, y + 6, w - 8, h - 12);
      R(ctx, ch > 0.5 && (t >> 2) % 2 ? '#ffffff' : c2, cx - 3, cy - 3, 6, 6);
      for (const s of [-1, 1]) { R(ctx, '#aeb7c2', cx + s * (w / 2 - 1) - 1, y, 2, 6); R(ctx, c2, cx + s * (w / 2 - 1) - 1, y - 2, 2, 2); }
      break;
    }
    case 'mimic': {
      const dormant = m.ai.dormant !== false;
      const open = dormant ? 0 : 4 + Math.abs(Math.sin(t * 0.3)) * 6;
      R(ctx, '#4a5568', x, y + 6, w, h - 6);
      R(ctx, c, x + 2, y + 8, w - 4, h - 10);
      R(ctx, '#ffcc33', x + 2, y + h - 8, w - 4, 2);
      R(ctx, '#4a5568', x - 1, y + 6 - open, w + 2, 6); // lid
      R(ctx, c, x + 1, y + 7 - open, w - 2, 3);
      if (!dormant) {
        R(ctx, '#2a0a10', x + 2, y + 9 - open, w - 4, open);
        for (let k = 0; k < 5; k++) { R(ctx, '#e8e8e8', x + 3 + k * 5, y + 9 - open, 3, 3); R(ctx, '#e8e8e8', x + 3 + k * 5, y + 6 + 0, 3, 2); }
        R(ctx, '#ff3355', cx - 6, y + 12 - open, 3, 3); R(ctx, '#ff3355', cx + 3, y + 12 - open, 3, 3);
      } else R(ctx, '#ffcc33', cx - 2, y + 12, 4, 3);
      break;
    }
    case 'leech': {
      const pulse = Math.sin(t * 0.2) * 1.5;
      circle(ctx, '#3a1a2a', cx, cy, w / 2 + pulse);
      circle(ctx, c, cx, cy, w / 2 - 2 + pulse);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + t * 0.05; R(ctx, c2, cx + Math.cos(a) * (w / 2 + 2) - 1, cy + Math.sin(a) * (w / 2 + 2) - 1, 3, 3); }
      circle(ctx, '#1a0a10', cx + look[0] * 2, cy + look[1] * 2, 4);
      break;
    }
    case 'sapper': {
      const fuse = m.ai.fuse || 0;
      R(ctx, '#3a2a1a', cx - 7, y + 8, 14, 12);
      R(ctx, c, cx - 6, y + 9, 12, 10);
      R(ctx, fuse && (t >> (fuse > 30 ? 1 : 2)) % 2 ? '#ffffff' : c2, cx - 2, y + 2, 4, 6); // charge
      R(ctx, '#555', cx - 6, y + 20, 4, 4); R(ctx, '#555', cx + 2, y + 20, 4, 4);
      R(ctx, '#ffcc33', cx - 6, y + 13, 12, 2);
      break;
    }
    case 'firewall': {
      const sh = m.ai.shielded;
      ctx.translate(cx, cy);
      ctx.save(); ctx.rotate(t * 0.01);
      ctx.fillStyle = '#2a0a10'; hex(ctx, 0, 0, w / 2 + 2); ctx.fill();
      ctx.fillStyle = c; hex(ctx, 0, 0, w / 2 - 3); ctx.fill();
      ctx.fillStyle = '#1a0508'; hex(ctx, 0, 0, w / 3); ctx.fill();
      ctx.rotate(-t * 0.02);
      for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); R(ctx, c2, w / 6, -1, w / 6, 2); }
      ctx.restore();
      circle(ctx, sh ? '#ff3355' : '#3dff6a', 0, 0, 6);
      if (sh) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 0.2); ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, w / 2 + 8, 0, Math.PI * 2); ctx.stroke(); }
      break;
    }
    case 'fw_node': {
      const br = m.ai.breached, hk = (m.ai.hack || 0) / 150;
      ctx.translate(cx, cy);
      ctx.fillStyle = '#1a0508'; hex(ctx, 0, 0, w / 2); ctx.fill();
      ctx.fillStyle = br ? c2 : c; hex(ctx, 0, 0, w / 2 - 3); ctx.fill();
      R(ctx, '#ffffff', -2, -2, 4, 4);
      if (!br && hk > 0) { ctx.strokeStyle = '#3dff6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, w / 2 + 5, -Math.PI / 2, -Math.PI / 2 + hk * Math.PI * 2); ctx.stroke(); }
      if (!br) { ctx.globalAlpha = 0.35; ctx.strokeStyle = '#3dff6a'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      break;
    }
    case 'echo': {
      ctx.translate(cx, cy);
      circle(ctx, '#0a2a24', 0, 0, w / 2);
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, w / 2 - 3, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; R(ctx, c2, Math.cos(a) * (w / 2 - 9) - 1, Math.sin(a) * (w / 2 - 9) - 1, 3, 3); }
      ctx.strokeStyle = c2; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 0.05) * (w / 2 - 12), Math.sin(t * 0.05) * (w / 2 - 12)); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-t * 0.12) * (w / 2 - 6), Math.sin(-t * 0.12) * (w / 2 - 6)); ctx.stroke();
      circle(ctx, m.ai.stun > 0 ? '#ff3355' : c, 0, 0, 6);
      break;
    }
    case 'echo_ghost': {
      if (m.ai.inactive) break;
      // a translucent replay of the player: where you were a few seconds ago
      ctx.globalAlpha = 0.45 + 0.15 * Math.sin(t * 0.3);
      const step = m.onGround ? Math.sin(m.anim * 0.35) * 3 : 0;
      R(ctx, c, cx - 6, y + 2, 12, 12);
      R(ctx, c2, cx - 4 + m.dir * 2, y + 6, 8, 2);
      R(ctx, c, cx - 7, y + 14, 14, 16);
      R(ctx, c, cx - 6, y + 30, 5, 12 + step * 0.3); R(ctx, c, cx + 1, y + 30, 5, 12 - step * 0.3);
      ctx.globalAlpha = 0.15; R(ctx, c, x - 3, y - 3, w + 6, h + 6);
      break;
    }
    case 'anchor': {
      ctx.translate(cx, cy); ctx.rotate(m.rot || 0);
      R(ctx, '#3a2a0a', -w / 2, -h / 2, w, h);
      R(ctx, c, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      R(ctx, c2, -2, -h / 2 - 4, 4, h + 8); R(ctx, c2, -w / 2 - 4, -2, w + 8, 4);
      break;
    }
    case 'legion_core': {
      ctx.translate(cx, cy); ctx.rotate(t * 0.05);
      R(ctx, '#2a2a33', -w / 2, -h / 2, w, h);
      R(ctx, c, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      ctx.rotate(-t * 0.1); R(ctx, c2, -5, -5, 10, 10);
      break;
    }
    case 'legion_bot': {
      ctx.translate(cx, cy); ctx.rotate(m.rot || 0);
      R(ctx, '#2a2a33', -w / 2, -h / 2, w, h);
      R(ctx, c, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      R(ctx, c2, w / 2 - 4, -2, 3, 4);
      break;
    }
    case 'blackout': {
      if (m.cloak) ctx.globalAlpha = 0.15;
      const pulse = Math.sin(t * 0.08) * 4;
      ctx.globalAlpha *= 0.5; circle(ctx, c2, cx, cy, w / 2 + 10 + pulse); ctx.globalAlpha = m.cloak ? 0.15 : 1;
      circle(ctx, '#05030a', cx, cy, w / 2 + pulse * 0.5);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + t * 0.02; R(ctx, c2, cx + Math.cos(a) * (w / 2 + 4) - 1, cy + Math.sin(a) * (w / 2 + 4) - 1, 2, 2); }
      circle(ctx, m.phase === 2 ? '#ff3355' : c2, cx + look[0] * 8, cy + look[1] * 8, 5);
      break;
    }
    default:
      return false;
  }
  return true;
}

function hex(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.closePath();
}
