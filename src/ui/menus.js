// Title, character and world selection/creation screens.
import { store } from '../core/storage.js';
import { makeBackup, deliver, readBackup, restoreBackup } from '../core/backup.js';
import { newPlayerData } from '../game/player.js';
import { WORLD_SIZES } from '../world/worldgen.js';
import { drawHumanoid } from '../gfx/sprites.js';
import { makeCanvas, uid, hashString } from '../core/util.js';
import { settingsForm, bindSettingsForm, HELP_HTML } from './ui.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CHASSIS = ['#c8d0da', '#e8d0b0', '#a87a5a', '#6b4a3a', '#3a2a2a', '#d8c6ef', '#9fd8ff', '#b4ff4a', '#ffcc99', '#5a6b7a'];
const VISORS = ['#2ef2ff', '#ff3ddc', '#9dff3d', '#ffb12e', '#ff3355', '#ffffff', '#a46bff', '#3dffb0'];
const SUITS = ['#2a3a4f', '#3a2a4f', '#4f2a3a', '#2a4f3a', '#4f4a2a', '#1a1a22', '#5a6b8a', '#8a5a3a'];
const HAIR = ['#ff3ddc', '#2ef2ff', '#ffcc33', '#ffffff', '#222222', '#ff5a2a', '#9dff3d', '#a46bff', '#8a5a3a'];
const NAMES = ['Nova', 'Kestrel', 'Iota', 'Rhea', 'Cass', 'Juno', 'Orion', 'Vega', 'Lyra', 'Dax', 'Echo', 'Sable', 'Ion', 'Pax', 'Zephyr'];
const WORLD_NAMES = ['Neon', 'Shattered', 'Silent', 'Iron', 'Crimson', 'Hollow', 'Gleaming', 'Ancient', 'Drifting', 'Burning', 'Frozen', 'Electric'];
const WORLD_NOUNS = ['Strata', 'Expanse', 'Lattice', 'Reach', 'Spire', 'Abyss', 'Frontier', 'Engine', 'Shelf', 'Ring', 'Basin', 'Crown'];

export class Menus {
  constructor(env) { this.env = env; }

  clear() { $('#menu').innerHTML = ''; }

  title() {
    $('#menu').innerHTML = `<div class="screen">
      <div class="logo">NEON STRATA<small>DIG · BUILD · FIGHT · ASCEND</small></div>
      <div class="menu-buttons">
        <button class="primary" id="m-play">Play</button>
        <button id="m-saves">Saves &amp; iCloud Backup</button>
        <button id="m-settings">Settings</button>
        <button id="m-help">Field Guide</button>
      </div>
      <div style="font-size:11px;color:#8aa0c0;text-align:center;max-width:420px">Tip: on iPhone, tap Share → <b>Add to Home Screen</b> to play full-screen and offline.</div>
    </div>`;
    $('#m-play').onclick = () => { this.env.audio.unlock(); this.env.audio.play('ui'); this.characters(); };
    $('#m-settings').onclick = () => { this.env.audio.unlock(); this.settings(); };
    $('#m-help').onclick = () => this.help();
    $('#m-saves').onclick = () => { this.env.audio.unlock(); this.saves(); };
    this.env.audio.setTheme('title');
  }

  async saves(msg = '') {
    const [players, worlds] = await Promise.all([store.all('players'), store.all('worlds')]);
    $('#menu').innerHTML = `<div class="screen"><div class="card"><h3 style="margin:0 0 8px;color:#2ef2ff">Saves &amp; iCloud Backup</h3>
      <div class="help">This device has ${players.length} character${players.length === 1 ? '' : 's'} and ${worlds.length} world${worlds.length === 1 ? '' : 's'}.<br>
      <b>Back up:</b> creates one file with all of them. On iPhone, choose <b>Save to Files</b> in the share sheet, then <b>iCloud Drive</b>.<br>
      <b>Restore:</b> pick a backup file from Files (iCloud Drive). Characters and worlds in it replace their older copies on this device; everything else stays.</div>
      <div id="m-msg" style="font-size:12px;color:#3dff6a;min-height:16px;margin:6px 0">${esc(msg)}</div>
      <div class="menu-buttons" style="margin:0 auto">
        <button class="primary" id="m-export">Back up all saves</button>
        <button id="m-import">Restore from backup</button>
        <input type="file" id="m-file" style="display:none">
        <button id="m-back">Back</button>
      </div></div></div>`;
    const note = (t, c = '#3dff6a') => { const m = $('#m-msg'); m.textContent = t; m.style.color = c; };
    const exp = $('#m-export');
    exp.onclick = async () => {
      exp.disabled = true; exp.textContent = 'Preparing backup…';
      try {
        const b = await makeBackup();
        // Sharing has to start from a tap, so the ready file gets its own button.
        exp.disabled = false; exp.textContent = `Save to Files (${(b.file.size / 1048576).toFixed(1)} MB)`;
        exp.onclick = async () => {
          const r = await deliver(b.file);
          if (r === 'shared') note('Done. If you chose Save to Files → iCloud Drive, the backup is in iCloud.');
          else if (r === 'downloaded') note('Backup downloaded: ' + b.file.name);
        };
      } catch (e) { exp.disabled = false; exp.textContent = 'Back up all saves'; note('Backup failed: ' + e.message, '#ff8fa8'); }
    };
    $('#m-import').onclick = () => $('#m-file').click();
    $('#m-file').onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const b = await readBackup(f);
        const when = b.created ? new Date(b.created).toLocaleString() : 'an unknown date';
        if (!confirm(`Restore ${b.players.length} character(s) and ${b.worlds.length} world(s) from ${when}? Older copies of them on this device will be replaced.`)) return;
        await restoreBackup(b);
        this.saves(`Restored ${b.players.length} character(s) and ${b.worlds.length} world(s).`);
      } catch (err) { note('Could not restore: ' + err.message, '#ff8fa8'); }
    };
    $('#m-back').onclick = () => this.title();
  }

  settings() {
    const s = this.env.settings;
    $('#menu').innerHTML = `<div class="screen"><div class="card"><h3 style="margin:0 0 8px;color:#2ef2ff">Settings</h3>${settingsForm(s)}<div class="row" style="margin-top:8px"><button id="m-back">Back</button></div></div></div>`;
    bindSettingsForm($('#menu'), s, () => this.env.applySettings());
    $('#m-back').onclick = () => this.title();
  }

  help() {
    $('#menu').innerHTML = `<div class="screen"><div class="card help" style="max-height:80vh;overflow:auto">${HELP_HTML}<div class="row" style="margin-top:10px"><button id="m-back">Back</button></div></div></div>`;
    $('#m-back').onclick = () => this.title();
  }

  async characters() {
    const players = (await store.all('players')).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
    const rows = players.map((p) => `<div class="entry"><canvas class="pv" data-id="${p.id}" width="40" height="52" style="width:40px;height:52px"></canvas>
      <div class="meta"><div class="t">${esc(p.name)}</div><div class="s">${p.maxLife} integrity · ${p.maxEnergy} energy · ${{ soft: 'Softcore', medium: 'Mediumcore', hard: 'Hardcore' }[p.mode]} · ${Math.floor((p.playTime || 0) / 216000)}h played</div></div>
      <button class="primary" data-play="${p.id}">Play</button><button class="danger" data-del="${p.id}">&times;</button></div>`).join('');
    $('#menu').innerHTML = `<div class="screen"><div class="card"><h3 style="margin:0 0 8px;color:#2ef2ff">Select Character</h3>
      <div class="list">${rows || '<div style="color:#8aa0c0">No characters yet.</div>'}</div>
      <div class="row" style="margin-top:8px"><button class="primary" id="m-new">New Character</button><button id="m-back">Back</button></div></div></div>`;
    for (const c of document.querySelectorAll('canvas.pv')) {
      const p = players.find((x) => x.id === c.dataset.id);
      this.preview(c, p.look, 2);
    }
    document.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => { this.player = players.find((p) => p.id === b.dataset.play); this.worlds(); }));
    document.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Delete this character permanently?')) return;
      await store.del('players', b.dataset.del); this.characters();
    }));
    $('#m-new').onclick = () => this.createCharacter();
    $('#m-back').onclick = () => this.title();
  }

  preview(canvas, look, scale = 3) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.scale(scale, scale);
    drawHumanoid(ctx, { x: (canvas.width / scale - 20) / 2, y: 2, w: 20, h: 42, dir: 1, anim: 0, onGround: true, vx: 0, vy: 0 }, look, {}, 0);
    ctx.fillStyle = look.chassis; ctx.fillRect(canvas.width / scale / 2 - 1, 18, 4, 11);
    ctx.restore();
  }

  createCharacter() {
    const look = { chassis: CHASSIS[0], visor: VISORS[0], suit: SUITS[0], hair: HAIR[0], style: 0 };
    let mode = 'soft';
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const sw = (key, list) => `<div class="swatches">${list.map((c) => `<button class="sw ${look[key] === c ? 'on' : ''}" data-k="${key}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>`;
    const render = () => {
      $('#menu').innerHTML = `<div class="screen"><div class="card"><h3 style="margin:0 0 8px;color:#2ef2ff">New Character</h3>
        <div class="cols"><canvas id="cc-prev" width="96" height="140" style="width:96px;height:140px;background:#0a1220;border-radius:8px;border:1px solid #2a4a6a"></canvas>
        <div style="flex:1">
          <div class="formrow"><span class="lbl">Name</span><input type="text" id="cc-name" maxlength="18" value="${esc($('#cc-name') ? $('#cc-name').value : name)}"></div>
          <div class="formrow"><span class="lbl">Chassis</span>${sw('chassis', CHASSIS)}</div>
          <div class="formrow"><span class="lbl">Visor</span>${sw('visor', VISORS)}</div>
          <div class="formrow"><span class="lbl">Suit</span>${sw('suit', SUITS)}</div>
          <div class="formrow"><span class="lbl">Crest</span>${sw('hair', HAIR)}</div>
          <div class="formrow"><span class="lbl">Style</span><div class="opt">${[0, 1, 2, 3, 4].map((i) => `<button data-style="${i}" class="${look.style === i ? 'on' : ''}">${i + 1}</button>`).join('')}</div></div>
          <div class="formrow"><span class="lbl">Difficulty</span><div class="opt">
            <button data-mode="soft" class="${mode === 'soft' ? 'on' : ''}">Softcore</button><button data-mode="medium" class="${mode === 'medium' ? 'on' : ''}">Mediumcore</button><button data-mode="hard" class="${mode === 'hard' ? 'on' : ''}">Hardcore</button></div></div>
          <div style="font-size:11px;color:#8aa0c0">${{ soft: 'Drop half your credits on death.', medium: 'Drop all items on death.', hard: 'Death is permanent.' }[mode]}</div>
        </div></div>
        <div class="row" style="margin-top:10px"><button class="primary" id="cc-create">Create</button><button id="cc-back">Back</button></div></div></div>`;
      this.preview($('#cc-prev'), look, 3);
      document.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { look[b.dataset.k] = b.dataset.c; keepName(); }));
      document.querySelectorAll('[data-style]').forEach((b) => (b.onclick = () => { look.style = +b.dataset.style; keepName(); }));
      document.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; keepName(); }));
      $('#cc-back').onclick = () => this.characters();
      $('#cc-create').onclick = async () => {
        const nm = ($('#cc-name').value || 'Drifter').trim().slice(0, 18) || 'Drifter';
        const d = newPlayerData(nm, { ...look }, mode);
        d.id = uid(); d.lastPlayed = Date.now();
        await store.put('players', d);
        this.player = d;
        this.worlds();
      };
    };
    let pendingName = name;
    const keepName = () => { pendingName = $('#cc-name').value; render(); $('#cc-name').value = pendingName; };
    render();
  }

  async worlds() {
    const worlds = (await store.all('worlds')).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
    const sizeName = (w) => (Object.values(WORLD_SIZES).find((s) => s.w === w.w) || { label: w.w + 'w' }).label;
    const rows = worlds.map((w) => `<div class="entry"><div class="meta"><div class="t">${esc(w.name)}${w.flags && w.flags.hardmode ? ' <span style="color:#d0a0ff;font-size:11px">SINGULARITY</span>' : ''}</div>
      <div class="s">${sizeName(w)} · ${w.difficulty === 'expert' ? 'Expert' : 'Normal'} · Day ${w.day} · ${Object.keys((w.flags && w.flags.bosses) || {}).length} bosses</div></div>
      <button class="primary" data-play="${w.id}">Play</button><button class="danger" data-del="${w.id}">&times;</button></div>`).join('');
    $('#menu').innerHTML = `<div class="screen"><div class="card"><h3 style="margin:0 0 8px;color:#2ef2ff">Select World · ${esc(this.player.name)}</h3>
      <div class="list">${rows || '<div style="color:#8aa0c0">No worlds yet. Create one!</div>'}</div>
      <div class="row" style="margin-top:8px"><button class="primary" id="m-new">New World</button><button id="m-back">Back</button></div></div></div>`;
    document.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => this.env.startGame(this.player, b.dataset.play)));
    document.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Delete this world permanently?')) return;
      await store.del('worlds', b.dataset.del); this.worlds();
    }));
    $('#m-new').onclick = () => this.createWorld();
    $('#m-back').onclick = () => this.characters();
  }

  createWorld() {
    let size = 'medium', diff = 'normal';
    const name = WORLD_NAMES[Math.floor(Math.random() * WORLD_NAMES.length)] + ' ' + WORLD_NOUNS[Math.floor(Math.random() * WORLD_NOUNS.length)];
    const render = (nm, seed) => {
      $('#menu').innerHTML = `<div class="screen"><div class="card"><h3 style="margin:0 0 8px;color:#2ef2ff">New World</h3>
        <div class="formrow"><span class="lbl">Name</span><input type="text" id="cw-name" maxlength="24" value="${esc(nm)}"></div>
        <div class="formrow"><span class="lbl">Size</span><div class="opt">${Object.entries(WORLD_SIZES).map(([k, s]) => `<button data-size="${k}" class="${size === k ? 'on' : ''}">${s.label}</button>`).join('')}</div></div>
        <div style="font-size:11px;color:#8aa0c0;margin-left:100px">${{ small: '2400 × 900 tiles · quick to explore', medium: '3600 × 1200 tiles · recommended', large: '4800 × 1500 tiles · huge, slower to generate' }[size]}</div>
        <div class="formrow"><span class="lbl">Difficulty</span><div class="opt"><button data-diff="normal" class="${diff === 'normal' ? 'on' : ''}">Normal</button><button data-diff="expert" class="${diff === 'expert' ? 'on' : ''}">Expert</button></div></div>
        <div style="font-size:11px;color:#8aa0c0;margin-left:100px">${diff === 'expert' ? 'Enemies have double integrity and damage. Better loot.' : 'The intended experience.'}</div>
        <div class="formrow"><span class="lbl">Seed</span><input type="text" id="cw-seed" maxlength="20" placeholder="random" value="${esc(seed)}"></div>
        <div class="row" style="margin-top:10px"><button class="primary" id="cw-create">Generate</button><button id="cw-back">Back</button></div></div></div>`;
      const keep = () => render($('#cw-name').value, $('#cw-seed').value);
      document.querySelectorAll('[data-size]').forEach((b) => (b.onclick = () => { size = b.dataset.size; keep(); }));
      document.querySelectorAll('[data-diff]').forEach((b) => (b.onclick = () => { diff = b.dataset.diff; keep(); }));
      $('#cw-back').onclick = () => this.worlds();
      $('#cw-create').onclick = () => {
        const s = $('#cw-seed').value.trim();
        const seed = s ? (/^\d+$/.test(s) ? parseInt(s, 10) >>> 0 : hashString(s)) : (Math.random() * 4294967295) >>> 0;
        this.env.createWorld(this.player, { name: ($('#cw-name').value || name).trim().slice(0, 24), size, difficulty: diff, seed });
      };
    };
    render(name, '');
  }

  loading(text, frac) {
    let el = document.getElementById('ld');
    if (!el) {
      $('#menu').innerHTML = `<div class="screen" id="ld"><div class="logo" style="font-size:28px">NEON STRATA</div><div id="ld-t" style="color:#8aa0c0"></div><div class="progress" style="width:min(400px,80vw)"><div id="ld-p"></div></div></div>`;
    }
    $('#ld-t').textContent = text;
    $('#ld-p').style.width = Math.round(frac * 100) + '%';
  }
}
