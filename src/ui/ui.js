// In-game DOM UI: HUD, hotbar, inventory/equipment, crafting, chests, colonists, map and pause menu.
import { ITEMS } from '../content/items.js';
import { RECIPES, GROUPS, GROUP_NAMES, STATION_NAMES, stationsProvided } from '../content/recipes.js';
import { BUFFS } from '../content/buffs.js';
import { PREFIXES, rollPrefix, prefixValueMult } from '../content/prefixes.js';
import { RARITY_COLORS } from '../content/materials.js';
import { TILES } from '../content/tiles.js';
import { iconURL } from '../gfx/icons.js';
import { itemTooltip, sellPrice } from './tooltip.js';
import { addItem, countItem, removeItem, sortInventory, maxStack, HOTBAR } from '../game/inventory.js';
import { COLONISTS } from '../game/town.js';
import { WorldMap } from './map.js';
import { formatCredits, TILE, rng } from '../core/util.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CRAFT_TABS = [
  ['all', 'All'], ['tools', 'Tools'], ['weapons', 'Weapons'], ['armor', 'Armor'], ['acc', 'Gear'], ['build', 'Build'], ['furn', 'Furniture'], ['use', 'Consumables'], ['mat', 'Materials'],
];
function tabOf(it) {
  if (it.type === 'tool' || it.type === 'hook') return 'tools';
  if (it.type === 'weapon' || it.type === 'ammo') return 'weapons';
  if (it.type === 'armor') return 'armor';
  if (it.type === 'accessory') return 'acc';
  if (it.type === 'block' || it.type === 'wall') return 'build';
  if (it.type === 'furniture') return 'furn';
  if (it.type === 'consumable') return 'use';
  return 'mat';
}

export class UI {
  constructor(game, env) {
    this.game = game; this.env = env; this.input = env.input;
    game.ui = this;
    this.map = new WorldMap(game);
    this.panel = null; this.pick = null; this.chest = null; this.npc = null; this.npcMode = 'talk';
    this.craftTab = 'all'; this.craftSel = null; this.showAll = false; this.dirtyInv = true;
    this.frame = 0; this.lastHot = ''; this.respawnShown = false;
    this.build();
  }

  build() {
    const hb = $('#hotbar');
    hb.innerHTML = '';
    for (let i = 0; i < HOTBAR; i++) {
      const d = document.createElement('div');
      d.className = 'slot hot'; d.dataset.i = i;
      d.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.game.player.sel = i; this.dirtyInv = true; this.env.audio.play('ui'); });
      hb.appendChild(d);
    }
    $('#hud').classList.remove('hidden');
    $('#touch').classList.toggle('hidden', !this.input.isTouch);
    const bind = (sel, fn) => { const el = $(sel); el.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); fn(); }; };
    bind('#btn-inv', () => this.togglePanel('inv'));
    bind('#btn-map', () => this.openMap());
    bind('#btn-pause', () => this.togglePanel('pause'));
    this.input.bindJoystick($('#joyzone'), $('#joyknob'), $('#joybase'));
    for (const [id, name] of [['#act-jump', 'jump'], ['#act-hook', 'hook'], ['#act-heal', 'heal'], ['#act-energy', 'energy'], ['#act-dash', 'dash']]) this.input.bindButton($(id), name);
    // map controls
    const mc = $('#mapcanvas');
    let drag = null;
    mc.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, ox: this.map.ox, oy: this.map.oy }; mc.setPointerCapture(e.pointerId); };
    mc.onpointermove = (e) => { if (!drag) return; this.map.ox = drag.ox - (e.clientX - drag.x) / this.map.zoom; this.map.oy = drag.oy - (e.clientY - drag.y) / this.map.zoom; };
    mc.onpointerup = () => { drag = null; };
    mc.onwheel = (e) => { this.map.zoom = Math.max(0.25, Math.min(8, this.map.zoom * (e.deltaY < 0 ? 1.25 : 0.8))); e.preventDefault(); };
    $('#map-in').onclick = () => { this.map.zoom = Math.min(8, this.map.zoom * 1.5); };
    $('#map-out').onclick = () => { this.map.zoom = Math.max(0.25, this.map.zoom / 1.5); };
    $('#map-center').onclick = () => this.map.center();
    $('#map-close').onclick = () => this.closeMap();
    $('#panel').onpointerdown = (e) => { if (e.target.id === 'panel') this.closePanel(); };
    this.applyLayout();
  }

  applyLayout() {
    document.body.classList.toggle('lefty', !!this.env.settings.leftHanded);
    const sc = this.env.settings.controlScale || 1;
    $('#actions').style.transform = `scale(${sc})`;
    $('#actions').style.transformOrigin = this.env.settings.leftHanded ? 'bottom left' : 'bottom right';
  }

  destroy() {
    $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); $('#panel').classList.add('hidden'); $('#mapview').classList.add('hidden');
    $('#bossbar').classList.add('hidden'); $('#death').classList.add('hidden');
  }

  blocking() { return !!this.panel || this.map.open; }

  toast(msg, color = '#fff') {
    const t = document.createElement('div');
    t.className = 'toast'; t.style.color = color; t.textContent = msg;
    const box = $('#toasts');
    box.appendChild(t);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => t.remove(), 5000);
  }

  // ---------------- per-frame HUD ----------------
  update() {
    const g = this.game, p = g.player, s = p.s;
    this.frame++;
    if (this.frame % 3 === 0) {
      $('.bar.life .fill').style.width = Math.max(0, p.life / s.maxLife * 100) + '%';
      $('.bar.life span').textContent = `INTEGRITY ${Math.ceil(Math.max(0, p.life))}/${s.maxLife}`;
      $('.bar.energy .fill').style.width = Math.max(0, p.energy / s.maxEnergy * 100) + '%';
      $('.bar.energy span').textContent = `ENERGY ${Math.floor(p.energy)}/${s.maxEnergy}`;
      $('#credits').textContent = formatCredits(p.credits) + ' cr';
    }
    if (this.frame % 15 === 0) {
      let bh = '';
      for (const [k, t] of p.buffs) {
        const b = BUFFS[k]; if (!b) continue;
        const sec = Math.ceil(t / 60);
        bh += `<span class="buff" style="border-color:${b.color};color:${b.color}">${b.name} ${sec >= 60 ? Math.ceil(sec / 60) + 'm' : sec + 's'}</span>`;
      }
      $('#buffs').innerHTML = bh;
      this.updateInfo();
      // boss bar
      const bosses = g.bosses.filter((b) => !b.dead);
      const bb = $('#bossbar');
      if (bosses.length) {
        bb.classList.remove('hidden');
        let hp = 0, max = 0;
        for (const b of bosses) { hp += Math.max(0, b.hp); max += b.maxHp; }
        for (const m of g.monsters) if (m.owner && bosses.includes(m.owner) && !m.dead) { hp += Math.max(0, m.hp); max += m.maxHp; }
        bb.querySelector('.name').textContent = bosses.map((b) => b.def.name).filter((v, i, a) => a.indexOf(v) === i).join(' & ');
        bb.querySelector('.fill').style.width = (hp / max * 100) + '%';
      } else bb.classList.add('hidden');
      const ev = g.events.active, eb = $('#eventbar');
      if (ev) {
        eb.classList.remove('hidden');
        eb.textContent = ev === 'invasion' && g.events.invasion ? `DRONE INVASION ${Math.floor(g.events.invasion.done / g.events.invasion.need * 100)}%` : ev === 'redshift' ? 'RED SHIFT' : 'SOLAR FLARE';
      } else eb.classList.add('hidden');
      // touch extras
      $('#act-hook').classList.toggle('hidden', !p.equip.hook);
      $('#act-dash').classList.toggle('hidden', !s.dash);
      // death overlay
      const de = $('#death');
      if (p.dead && p.mode !== 'hard') { de.classList.remove('hidden'); de.querySelector('.sub').textContent = 'Reassembling in ' + Math.ceil(p.respawn / 60) + 's'; }
      else if (p.mode !== 'hard') de.classList.add('hidden');
    }
    if (this.frame % 20 === 0 && this.env.settings.minimap) { this.map.flushDirty(); this.map.drawMini($('#minimap')); }
    $('#minimap-wrap').style.display = this.env.settings.minimap ? '' : 'none';
    if (this.map.open && this.frame % 2 === 0) { this.map.flushDirty(); this.map.drawFull($('#mapcanvas')); }
    // hotbar
    const sig = p.sel + '|' + p.inv.slice(0, HOTBAR).map((s) => (s ? s.k + s.n : '')).join(',');
    if (sig !== this.lastHot || this.dirtyInv) {
      this.lastHot = sig;
      const slots = $('#hotbar').children;
      for (let i = 0; i < HOTBAR; i++) {
        const el = slots[i];
        el.className = 'slot hot' + (i === p.sel ? ' sel' : '');
        el.innerHTML = this.slotInner(p.inv[i], (i + 1) % 10);
      }
    }
    if (this.dirtyInv && this.panel) { this.dirtyInv = false; this.refreshPanel(); }
    else if (this.panel === 'inv' && this.frame % 30 === 0) this.refreshCraftAvailability();
    this.dirtyInv = false;
  }

  updateInfo() {
    const g = this.game, p = g.player, w = g.world, info = p.s.info;
    const lines = [];
    const tx = Math.floor(p.cx / TILE), ty = Math.floor(p.cy / TILE);
    if (info.has('time')) {
      const h = Math.floor(w.time / 3600), m = Math.floor((w.time % 3600) / 60);
      lines.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} · Day ${w.day}`);
    }
    if (info.has('depth')) {
      const d = ty - w.layers.surface;
      lines.push(d < 0 ? `${-d}m altitude` : `${d}m depth (${({ space: 'Orbit', surface: 'Surface', underground: 'Underground', cavern: 'Caverns', core: 'Reactor Core' })[w.layerAt(ty)]})`);
    }
    if (info.has('pos')) lines.push(`${tx - (w.w >> 1)}${tx >= w.w >> 1 ? 'E' : 'W'}`);
    if (info.has('radar')) lines.push(`${g.monsters.filter((m) => Math.abs(m.cx - p.cx) < 1600 && Math.abs(m.cy - p.cy) < 900 && !m.head).length} hostiles nearby`);
    if (info.has('ore')) {
      let best = null, bv = 0;
      for (let y = ty - 30; y <= ty + 30; y += 1) for (let x = tx - 40; x <= tx + 40; x += 1) {
        const t = TILES[w.get(x, y)];
        if (t && t.ore && ITEMS[t.drop] && ITEMS[t.drop].value > bv) { bv = ITEMS[t.drop].value; best = t; }
      }
      lines.push(best ? best.name + ' detected' : 'No ore nearby');
    }
    if (info.has('dps')) {
      const since = g.tick - 180;
      g.dpsLog = g.dpsLog.filter((e) => e[0] > since);
      lines.push(Math.round(g.dpsLog.reduce((a, e) => a + e[1], 0) / 3) + ' DPS');
    }
    $('#info').innerHTML = lines.map(esc).join('<br>');
  }

  slotInner(slot, keyLabel) {
    if (!slot) return keyLabel !== undefined ? `<span class="k">${keyLabel}</span>` : '';
    const it = ITEMS[slot.k];
    return `<img src="${iconURL(slot.k)}" alt="">${slot.n > 1 ? `<span class="n">${slot.n}</span>` : ''}${keyLabel !== undefined ? `<span class="k">${keyLabel}</span>` : ''}` + (it && it.rarity > 0 ? '' : '');
  }

  // ---------------- panels ----------------
  togglePanel(name) {
    if (this.panel === name) this.closePanel();
    else if (name === 'inv') this.openInventory();
    else if (name === 'pause') this.openPause();
  }

  show(html) {
    const el = $('#panel');
    el.innerHTML = html;
    el.classList.remove('hidden');
    this.input.releaseAll();
  }

  closePanel() {
    const wasChest = this.panel === 'inv' && this.chest;
    this.panel = null; this.pick = null; this.npc = null;
    $('#panel').classList.add('hidden'); $('#panel').innerHTML = '';
    if (wasChest) { this.chest = null; this.game.openChest = null; this.game.openChestPos = null; }
    this.chest = null;
    if (this.env.onPanelClosed) this.env.onPanelClosed();
  }

  openInventory() { this.panel = 'inv'; this.npc = null; this.refreshPanel(); }
  openChest(ch) { this.chest = ch; this.panel = 'inv'; this.npc = null; this.refreshPanel(); }
  closeChest() { if (this.chest) { this.chest = null; if (this.panel === 'inv') this.refreshPanel(); } }
  openNpc(n) { this.npc = n; this.npcMode = 'talk'; this.npcLine = rng.pick(n.def.lines); this.panel = 'npc'; this.pick = null; this.refreshPanel(); }

  refreshPanel() {
    if (this.panel === 'inv') this.renderInventory();
    else if (this.panel === 'npc') this.renderNpc();
    else if (this.panel === 'pause') this.renderPause();
    else if (this.panel === 'settings') this.renderSettings();
    else if (this.panel === 'help') this.renderHelp();
  }

  // slot access by (src, i)
  getSlot(src, i) {
    const p = this.game.player;
    if (src === 'inv') return p.inv[i];
    if (src === 'chest') return this.chest ? this.chest.items[i] : null;
    if (src === 'trash') return p.trash;
    if (src === 'eq') return i.startsWith('acc') ? p.equip.acc[+i.slice(3)] : p.equip[i];
    return null;
  }
  setSlot(src, i, v) {
    const p = this.game.player;
    if (src === 'inv') p.inv[i] = v;
    else if (src === 'chest') this.chest.items[i] = v;
    else if (src === 'trash') p.trash = v;
    else if (src === 'eq') { if (i.startsWith('acc')) p.equip.acc[+i.slice(3)] = v; else p.equip[i] = v; }
  }
  validFor(src, i, slot) {
    if (!slot) return true;
    if (src !== 'eq') return true;
    const it = ITEMS[slot.k], p = this.game.player;
    if (i === 'head' || i === 'body' || i === 'legs') return it.type === 'armor' && it.slot === i;
    if (i === 'hook') return it.type === 'hook';
    if (i.startsWith('acc')) {
      const idx = +i.slice(3);
      if (idx >= p.accSlots || it.type !== 'accessory') return false;
      return !p.equip.acc.some((a, j) => a && j !== idx && a.k === slot.k);
    }
    return false;
  }

  tapSlot(src, i) {
    const g = this.game;
    this.env.audio.play('ui');
    if (!this.pick) {
      if (this.getSlot(src, i)) this.pick = { src, i };
      this.refreshPanel();
      return;
    }
    const a = this.pick;
    if (a.src === src && a.i === i) { this.pick = null; this.refreshPanel(); return; }
    this.moveSlot(a.src, a.i, src, i);
    this.pick = null;
    g.player.recalc();
    this.refreshPanel();
  }

  moveSlot(sa, ia, sb, ib) {
    const A = this.getSlot(sa, ia), B = this.getSlot(sb, ib);
    if (!A) return;
    if (B && B.k === A.k && !A.p && !B.p && maxStack(A.k) > 1) {
      const room = maxStack(A.k) - B.n, m = Math.min(room, A.n);
      B.n += m; A.n -= m;
      if (A.n <= 0) this.setSlot(sa, ia, null);
      return;
    }
    if (!this.validFor(sb, ib, A) || !this.validFor(sa, ia, B)) { this.toast('That does not fit there.', '#ff8fa8'); return; }
    this.setSlot(sa, ia, B); this.setSlot(sb, ib, A);
  }

  pickAction(act) {
    const g = this.game, p = g.player;
    const a = this.pick;
    if (!a) return;
    const s = this.getSlot(a.src, a.i);
    if (!s) { this.pick = null; this.refreshPanel(); return; }
    const it = ITEMS[s.k];
    if (act === 'equip') {
      let target = null;
      if (it.type === 'armor') target = it.slot;
      else if (it.type === 'hook') target = 'hook';
      else if (it.type === 'accessory') {
        const dupe = p.equip.acc.findIndex((x, j) => x && x.k === s.k && j < p.accSlots);
        if (dupe >= 0) target = 'acc' + dupe;
        else { let free = -1; for (let j = 0; j < p.accSlots; j++) if (!p.equip.acc[j]) { free = j; break; } target = 'acc' + (free >= 0 ? free : 0); }
      }
      if (target) this.moveSlot(a.src, a.i, 'eq', target);
      p.recalc();
    } else if (act === 'unequip') {
      const free = p.inv.findIndex((x, j) => !x && j >= 0);
      if (free >= 0) { this.setSlot('inv', free, s); this.setSlot(a.src, a.i, null); p.recalc(); }
      else this.toast('Inventory full', '#ff8fa8');
    } else if (act === 'use') {
      if (g.consume(p, it)) { s.n--; if (s.n <= 0) this.setSlot(a.src, a.i, null); }
    } else if (act === 'split') {
      if (s.n > 1) {
        const free = p.inv.findIndex((x) => !x);
        if (free >= 0) { const half = Math.floor(s.n / 2); s.n -= half; p.inv[free] = { k: s.k, n: half }; }
      }
    } else if (act === 'trash') {
      p.trash = s; this.setSlot(a.src, a.i, null);
    } else if (act === 'drop') {
      g.dropItem(p.cx + p.dir * 20, p.cy, s.k, s.n, s.p || false).delay = 90;
      this.setSlot(a.src, a.i, null);
    } else if (act === 'sell') {
      const price = sellPrice(s);
      p.credits += price; this.setSlot(a.src, a.i, null);
      this.env.audio.play('coin');
      this.toast('Sold for ' + formatCredits(price) + ' cr', '#ffe27a');
    } else if (act === 'reforge') {
      const cost = this.reforgeCost(s);
      if (p.credits < cost) { this.toast('Not enough credits', '#ff8fa8'); return; }
      p.credits -= cost;
      s.p = rollPrefix(ITEMS[s.k], g.rng, true) || s.p;
      this.env.audio.play('craft');
      this.toast('Reforged: ' + (s.p ? PREFIXES[s.p].name : 'No modifier'), '#3dff6a');
      this.refreshPanel(); return;
    } else if (act === 'hotbar') {
      const free = p.inv.findIndex((x, j) => j < HOTBAR && !x);
      if (free >= 0) { this.moveSlot(a.src, a.i, 'inv', free); }
      else { this.moveSlot(a.src, a.i, 'inv', p.sel); }
    }
    this.pick = null;
    this.refreshPanel();
  }

  reforgeCost(s) { return Math.max(100, Math.round((ITEMS[s.k].value || 100) / 3)); }

  slotHTML(src, i, slot, extraCls = '', label) {
    const picked = this.pick && this.pick.src === src && this.pick.i === i;
    const it = slot && ITEMS[slot.k];
    const border = it && it.rarity > 0 ? `style="border-color:${RARITY_COLORS[it.rarity]}55"` : '';
    return `<div class="slot ${extraCls}${picked ? ' picked' : ''}" data-src="${src}" data-i="${i}" ${border}>${slot ? this.slotInner(slot) : (label ? `<span class="ph">${label}</span>` : '')}</div>`;
  }

  renderInventory() {
    const g = this.game, p = g.player;
    let inv = '';
    for (let i = 0; i < p.inv.length; i++) inv += this.slotHTML('inv', i, p.inv[i], i < HOTBAR ? 'hot' + (i === p.sel ? ' sel' : '') : '');
    let eq = '';
    const L = { head: '&#9673;', body: '&#9635;', legs: '&#8214;', hook: '&#10148;' };
    eq += this.slotHTML('eq', 'head', p.equip.head, '', L.head) + this.slotHTML('eq', 'acc0', p.equip.acc[0], '', '+');
    eq += this.slotHTML('eq', 'body', p.equip.body, '', L.body) + this.slotHTML('eq', 'acc1', p.equip.acc[1], '', '+');
    eq += this.slotHTML('eq', 'legs', p.equip.legs, '', L.legs) + this.slotHTML('eq', 'acc2', p.equip.acc[2], '', '+');
    eq += this.slotHTML('eq', 'hook', p.equip.hook, '', L.hook) + this.slotHTML('eq', 'acc3', p.equip.acc[3], '', '+');
    eq += this.slotHTML('trash', 0, p.trash, '', '&#128465;') + this.slotHTML('eq', 'acc4', p.equip.acc[4], '', '+');
    eq += '<div></div>' + (p.accSlots > 5 ? this.slotHTML('eq', 'acc5', p.equip.acc[5], '', '+') : '<div class="slot cant"><span class="ph">&#128274;</span></div>');
    let chestHtml = '';
    if (this.chest) {
      let c = '';
      for (let i = 0; i < this.chest.items.length; i++) c += this.slotHTML('chest', i, this.chest.items[i]);
      chestHtml = `<div class="label">Container</div><div class="grid">${c}</div><div class="row" style="margin:4px 0"><button data-act="lootall">Loot all</button><button data-act="depositall">Deposit all</button><button data-act="quickstack">Quick stack</button></div>`;
    }
    const sel = this.pick ? this.getSlot(this.pick.src, this.pick.i) : null;
    const tip = sel ? itemTooltip(sel, p) : '<span style="color:#667">Tap an item to select it, then tap another slot to move it.</span>';
    let acts = '';
    if (sel) {
      const it = ITEMS[sel.k];
      if (this.pick.src === 'eq') acts += '<button data-act="unequip">Unequip</button>';
      else if (['armor', 'accessory', 'hook'].includes(it.type)) acts += '<button class="primary" data-act="equip">Equip</button>';
      if (it.type === 'consumable' && (it.consume.heal || it.consume.energy || it.consume.buff || it.consume.maxLife || it.consume.maxEnergy || it.consume.accSlot || it.consume.recall)) acts += '<button data-act="use">Use</button>';
      if (this.pick.src !== 'eq' && !(this.pick.src === 'inv' && this.pick.i < HOTBAR)) acts += '<button data-act="hotbar">To hotbar</button>';
      if (sel.n > 1) acts += '<button data-act="split">Split</button>';
      acts += '<button data-act="drop">Drop</button><button class="danger" data-act="trash">Trash</button>';
    }
    const craft = this.renderCraft();
    const html = `<div class="win"><h2><span>${this.chest ? 'STORAGE' : 'INVENTORY'} · ${formatCredits(p.credits)} cr</span><span><button data-act="sort">Sort</button> <button data-act="close">&times;</button></span></h2>
      <div class="body"><div class="cols">
        <div class="col">${chestHtml}<div class="label">Inventory</div><div class="grid">${inv}</div>
          <div class="tip">${tip}</div><div class="row">${acts}</div></div>
        <div class="col"><div class="label">Equipment · ${p.s.defense} DEF</div><div class="equip">${eq}</div>${p.s.setBonus ? `<div class="label" style="color:#3dff6a">Set bonus active</div>` : ''}</div>
        <div class="col" style="min-width:200px;max-width:300px">${craft}</div>
      </div></div></div>`;
    this.show(html);
    this.bindPanel();
  }

  // ---------------- crafting ----------------
  availableRecipes() {
    const g = this.game, p = g.player;
    const st = stationsProvided(g.nearbyStations());
    const out = [];
    for (const r of RECIPES) {
      const it = ITEMS[r.out];
      if (this.craftTab !== 'all' && tabOf(it) !== this.craftTab) continue;
      const stationOk = !r.at || st.has(r.at);
      const ingOk = r.ing.every(([k, n]) => countItem(p.inv, k) >= n);
      const can = stationOk && ingOk;
      if (!can) {
        if (!this.showAll) continue;
        const known = r.ing.some(([k]) => (GROUPS[k] || [k]).some((x) => p.discovered.has(x)));
        if (!known) continue;
      }
      out.push({ r, can });
    }
    return out;
  }

  renderCraft() {
    const list = this.availableRecipes();
    this.craftCache = list.map((e) => e.r.id + (e.can ? 'y' : 'n')).join(',');
    let tabs = CRAFT_TABS.map(([k, n]) => `<button data-tab="${k}" class="${this.craftTab === k ? 'on' : ''}">${n}</button>`).join('');
    tabs += `<button data-act="showall" class="${this.showAll ? 'on' : ''}">${this.showAll ? 'Known' : 'Craftable'}</button>`;
    let items = '';
    for (const { r, can } of list) {
      const s = { k: r.out, n: r.n };
      items += `<div class="slot ${can ? '' : 'cant'}${this.craftSel === r.id ? ' picked' : ''}" data-recipe="${r.id}">${this.slotInner(s)}</div>`;
    }
    if (!items) items = `<div style="grid-column:1/-1;color:#667;font-size:11px;padding:6px">${this.showAll ? 'No known recipes in this category.' : 'Nothing craftable here. Stand near crafting stations, or tap "Craftable" to see known recipes.'}</div>`;
    let detail = '';
    const r = this.craftSel !== null ? RECIPES[this.craftSel] : null;
    if (r) {
      const p = this.game.player;
      const st = stationsProvided(this.game.nearbyStations());
      const ing = r.ing.map(([k, n]) => {
        const have = countItem(p.inv, k);
        const nm = GROUP_NAMES[k] || ITEMS[k].name;
        const icon = iconURL(GROUPS[k] ? GROUPS[k][0] : k);
        return `<div class="ing ${have >= n ? '' : 'miss'}"><img src="${icon}">${esc(nm)} ${have}/${n}</div>`;
      }).join('');
      const stOk = !r.at || st.has(r.at);
      const station = r.at ? `<div class="ing ${stOk ? '' : 'miss'}">At: ${STATION_NAMES[r.at]}</div>` : '<div class="ing">By hand</div>';
      const can = stOk && r.ing.every(([k, n]) => countItem(p.inv, k) >= n);
      detail = `<div class="tip" style="margin-top:4px">${itemTooltip({ k: r.out, n: r.n }, p)}<hr style="border-color:#1e2e46">${ing}${station}</div>
        <div class="row" style="margin-top:4px"><button class="primary" data-act="craft" ${can ? '' : 'disabled'}>Craft</button><button data-act="craft10" ${can ? '' : 'disabled'}>×10</button></div>`;
    }
    return `<div class="label">Crafting</div><div class="tabs">${tabs}</div><div class="craftlist">${items}</div>${detail}`;
  }

  refreshCraftAvailability() {
    const list = this.availableRecipes();
    const sig = list.map((e) => e.r.id + (e.can ? 'y' : 'n')).join(',');
    if (sig !== this.craftCache) this.renderInventory();
  }

  craft(times) {
    const g = this.game, p = g.player;
    const r = RECIPES[this.craftSel];
    if (!r) return;
    const st = stationsProvided(g.nearbyStations());
    let made = 0;
    for (let k = 0; k < times; k++) {
      if (r.at && !st.has(r.at)) break;
      if (!r.ing.every(([key, n]) => countItem(p.inv, key) >= n)) break;
      for (const [key, n] of r.ing) removeItem(p.inv, key, n);
      const it = ITEMS[r.out];
      const pre = it.stack === 1 ? rollPrefix(it, g.rng) : null;
      const left = addItem(p.inv, r.out, r.n, pre);
      if (left > 0) g.dropItem(p.cx, p.cy, r.out, left, pre || false);
      p.discovered.add(r.out);
      p.stats.crafted++;
      made++;
      if (it.stack === 1) break;
    }
    if (made) { this.env.audio.play('craft'); g.fx.burst(p.cx, p.cy - 10, '#2ef2ff', 8, 1.5); g.town.checkArrivals(); }
    this.renderInventory();
  }

  bindPanel() {
    const el = $('#panel');
    el.querySelectorAll('[data-src]').forEach((d) => {
      d.onpointerup = (e) => { e.preventDefault(); this.tapSlot(d.dataset.src, d.dataset.src === 'eq' ? d.dataset.i : +d.dataset.i); };
    });
    el.querySelectorAll('[data-recipe]').forEach((d) => {
      d.onpointerup = (e) => { e.preventDefault(); this.craftSel = +d.dataset.recipe; this.env.audio.play('ui'); this.renderInventory(); };
    });
    el.querySelectorAll('[data-tab]').forEach((d) => {
      d.onclick = () => { this.craftTab = d.dataset.tab; this.renderInventory(); };
    });
    el.querySelectorAll('[data-act]').forEach((d) => {
      d.onclick = (e) => { e.stopPropagation(); this.action(d.dataset.act, d); };
    });
    el.querySelectorAll('[data-buy]').forEach((d) => {
      d.onclick = () => this.buy(d.dataset.buy, +(d.dataset.n || 1));
    });
  }

  action(act, el) {
    const g = this.game, p = g.player;
    switch (act) {
      case 'close': this.closePanel(); return;
      case 'sort': sortInventory(p.inv); this.pick = null; this.refreshPanel(); return;
      case 'showall': this.showAll = !this.showAll; this.renderInventory(); return;
      case 'craft': this.craft(1); return;
      case 'craft10': this.craft(10); return;
      case 'lootall': if (this.chest) { for (let i = 0; i < this.chest.items.length; i++) { const s = this.chest.items[i]; if (!s) continue; const left = addItem(p.inv, s.k, s.n, s.p || null); p.discovered.add(s.k); if (left) s.n = left; else this.chest.items[i] = null; } this.env.audio.play('pickup'); } this.refreshPanel(); return;
      case 'depositall': if (this.chest) { for (let i = HOTBAR; i < p.inv.length; i++) { const s = p.inv[i]; if (!s) continue; const left = addItem(this.chest.items, s.k, s.n, s.p || null); if (left) s.n = left; else p.inv[i] = null; } } this.refreshPanel(); return;
      case 'quickstack': if (this.chest) { for (let i = HOTBAR; i < p.inv.length; i++) { const s = p.inv[i]; if (!s || !this.chest.items.some((c) => c && c.k === s.k)) continue; const left = addItem(this.chest.items, s.k, s.n, s.p || null); if (left) s.n = left; else p.inv[i] = null; } } this.refreshPanel(); return;
      case 'shop': if (this.npc && this.npc.def.shop) { this.npcMode = 'shop'; this.renderNpc(); } return;
      case 'sellmode': if (this.npc && this.npc.def.shop) { this.npcMode = 'sell'; this.pick = null; this.renderNpc(); } return;
      case 'reforgemode': this.npcMode = 'reforge'; this.pick = null; this.renderNpc(); return;
      case 'hint': this.npcLine = g.town.hint(); this.npcMode = 'talk'; this.renderNpc(); return;
      case 'npchint': this.npcLine = this.npc.def.hint ? this.npc.def.hint(g) : rng.pick(this.npc.def.lines); this.renderNpc(); return;
      case 'talk': this.npcMode = 'talk'; this.npcLine = rng.pick(this.npc.def.lines); this.renderNpc(); return;
      case 'heal': this.heal(); return;
      case 'resume': this.closePanel(); return;
      case 'settings': this.panel = 'settings'; this.renderSettings(); return;
      case 'help': this.panel = 'help'; this.renderHelp(); return;
      case 'back': this.panel = 'pause'; this.renderPause(); return;
      case 'save': this.env.save().then(() => this.toast('Game saved', '#3dff6a')); return;
      case 'quit': this.env.saveAndQuit(); return;
      default: this.pickAction(act);
    }
  }

  // ---------------- colonists ----------------
  renderNpc() {
    const g = this.game, p = g.player, n = this.npc;
    if (!n) return;
    const d = n.def;
    let body = '';
    const btns = [];
    if (d.shop) btns.push(`<button class="${this.npcMode === 'shop' ? 'primary' : ''}" data-act="shop">Shop</button>`, `<button class="${this.npcMode === 'sell' ? 'primary' : ''}" data-act="sellmode">Sell</button>`);
    if (d.service === 'heal') btns.push(`<button data-act="heal">Heal (${formatCredits(this.healCost())} cr)</button>`);
    if (d.service === 'reforge') btns.push(`<button class="${this.npcMode === 'reforge' ? 'primary' : ''}" data-act="reforgemode">Reforge</button>`);
    if (n.key === 'archivist') btns.push('<button class="primary" data-act="hint">What next?</button>');
    else if (d.hint) btns.push('<button data-act="npchint">Advice</button>');
    btns.push('<button data-act="talk">Chat</button>', '<button data-act="close">Leave</button>');
    if (this.npcMode === 'talk') body = `<div class="say">"${esc(this.npcLine)}"</div>`;
    if (this.npcMode === 'shop') {
      const stock = d.shop(g).filter((k) => ITEMS[k]);
      body = '<div class="shoplist">' + stock.map((k) => {
        const it = ITEMS[k], price = g.town.price(k);
        return `<div class="shopitem"><img src="${iconURL(k)}"><span style="color:${RARITY_COLORS[it.rarity]}">${esc(it.name)}</span><span class="pr">${formatCredits(price)} cr</span><button data-buy="${k}">Buy</button>${it.stack > 1 ? `<button data-buy="${k}" data-n="10">×10</button>` : ''}</div>`;
      }).join('') + '</div>';
    }
    if (this.npcMode === 'sell' || this.npcMode === 'reforge') {
      let inv = '';
      for (let i = 0; i < p.inv.length; i++) inv += this.slotHTML('inv', i, p.inv[i]);
      const sel = this.pick ? this.getSlot(this.pick.src, this.pick.i) : null;
      let act = '';
      if (sel && this.npcMode === 'sell') act = `<button class="primary" data-act="sell">Sell for ${formatCredits(sellPrice(sel))} cr</button>`;
      if (sel && this.npcMode === 'reforge') {
        const ok = !!rollPrefix(ITEMS[sel.k], { next: () => 0.5 }, true) || ITEMS[sel.k].type === 'accessory' || (ITEMS[sel.k].damage > 0);
        act = ok ? `<button class="primary" data-act="reforge">Reforge for ${formatCredits(this.reforgeCost(sel))} cr</button>` : '<span class="warn">Cannot be reforged</span>';
      }
      body = `<div class="grid">${inv}</div><div class="tip" style="margin-top:4px">${sel ? itemTooltip(sel, p) : 'Tap an item.'}</div><div class="row" style="margin-top:4px">${act}</div>`;
    }
    const html = `<div class="win dialog"><h2><span>${esc(n.name)} · ${d.title}</span><span>${formatCredits(p.credits)} cr</span></h2><div class="body">${body}<div class="row" style="margin-top:8px">${btns.join('')}</div></div></div>`;
    this.show(html);
    this.bindPanel();
  }

  buy(k, n) {
    const g = this.game, p = g.player;
    const price = g.town.price(k) * n;
    if (p.credits < price) { this.toast('Not enough credits', '#ff8fa8'); return; }
    const it = ITEMS[k];
    const pre = it.stack === 1 ? rollPrefix(it, g.rng, false) : null;
    const left = addItem(p.inv, k, n, pre);
    if (left === n) { this.toast('Inventory full', '#ff8fa8'); return; }
    p.credits -= Math.round(price * (n - left) / n);
    p.discovered.add(k);
    this.env.audio.play('coin');
    this.renderNpc();
  }

  healCost() {
    const p = this.game.player, w = this.game.world;
    const missing = Math.max(0, p.s.maxLife - p.life);
    const prog = 1 + Object.keys(w.flags.bosses).length * 0.6 + (w.flags.hardmode ? 3 : 0);
    const deb = [...p.buffs.keys()].filter((k) => BUFFS[k] && BUFFS[k].debuff && k !== 'potion_sick').length;
    return Math.round(missing * 1.5 * prog + deb * 50 * prog);
  }

  heal() {
    const p = this.game.player;
    const c = this.healCost();
    if (c <= 0) { this.npcLine = 'You look perfectly functional to me.'; this.renderNpc(); return; }
    if (p.credits < c) { this.toast('Not enough credits', '#ff8fa8'); return; }
    p.credits -= c; p.life = p.s.maxLife;
    for (const k of [...p.buffs.keys()]) if (BUFFS[k] && BUFFS[k].debuff && k !== 'potion_sick') p.buffs.delete(k);
    this.env.audio.play('heal');
    this.npcLine = 'All patched up. Try not to get disassembled.';
    this.renderNpc();
  }

  // ---------------- pause / settings / help ----------------
  openPause() { this.panel = 'pause'; this.renderPause(); }
  renderPause() {
    const g = this.game, p = g.player, w = g.world;
    const bosses = Object.keys(w.flags.bosses).length;
    const html = `<div class="win" style="width:min(360px,94vw)"><h2><span>PAUSED</span><button data-act="close">&times;</button></h2><div class="body">
      <div class="help">${esc(p.name)} · ${p.maxLife} max integrity · ${bosses} bosses defeated${w.flags.hardmode ? ' · <b>Singularity</b>' : ''}<br>${esc(w.name)} · Day ${w.day}</div>
      <div class="menu-buttons" style="margin:10px auto"><button class="primary" data-act="resume">Resume</button><button data-act="help">Field Guide</button><button data-act="settings">Settings</button><button data-act="save">Save</button><button data-act="quit">Save &amp; Exit</button></div></div></div>`;
    this.show(html); this.bindPanel();
  }

  renderSettings() {
    const s = this.env.settings;
    const html = `<div class="win" style="width:min(460px,96vw)"><h2><span>SETTINGS</span><button data-act="back">Back</button></h2><div class="body">${settingsForm(s)}</div></div>`;
    this.show(html); this.bindPanel();
    bindSettingsForm($('#panel'), s, () => { this.env.applySettings(); this.applyLayout(); });
  }

  renderHelp() {
    const html = `<div class="win" style="width:min(640px,96vw)"><h2><span>FIELD GUIDE</span><button data-act="back">Back</button></h2><div class="body help">${HELP_HTML}</div></div>`;
    this.show(html); this.bindPanel();
  }

  openMap() { this.map.open = true; this.map.center(); $('#mapview').classList.remove('hidden'); this.input.releaseAll(); }
  closeMap() { this.map.open = false; $('#mapview').classList.add('hidden'); }

  hardcoreDeath() {
    const de = $('#death');
    de.classList.remove('hidden');
    de.style.pointerEvents = 'auto';
    de.querySelector('.sub').innerHTML = 'Hardcore: this character is gone.<br><br><button id="hc-exit" style="pointer-events:auto">Return to menu</button>';
    setTimeout(() => { const b = document.getElementById('hc-exit'); if (b) b.onclick = () => { de.style.pointerEvents = ''; this.env.hardcoreExit(); }; }, 0);
  }
}

export const HELP_HTML = `
<b>Goal.</b> You are a reawakened synthetic on the shattered terraforming world of the Strata. Dig, build, craft, defeat 12 bosses and reach the Singularity.<br><br>
<b>Touch controls.</b> Left stick: move (push up to jump / climb, down to drop through platforms). Tap or hold anywhere in the world to use the selected item there: mine, chop, build, swing or shoot toward your finger. Tap doors, chests, beds, terminals and colonists to interact. Buttons: JUMP, HOOK (needs a hook equipped), STIM (quick heal), CELL (quick energy), DASH (with a dash accessory). Tap a hotbar slot to select it.<br><br>
<b>Keyboard.</b> A/D move, W/Space jump, S drop, mouse to aim/use, right-click to interact, 1-0 or wheel for hotbar, E inventory, M map, F hook, H heal, J energy, Shift dash, Esc menu.<br><br>
<b>First steps.</b> 1) Chop Lattice trees with the Scrap Cutter for Fiber. 2) Craft an Assembly Bench by hand (10 Fiber) and place it. 3) Kill Nanoslimes for Nanogel → Glowsticks. 4) Dig for ore, build a Smelter and Fabricator. 5) Build a house (enclosed room, background wall, door, light, table and chair) so colonists move in.<br><br>
<b>Progression.</b> Cuprite → Ferrite → Titanite → Lumenite/Xenometal → Cryonite → Plasmite → (Singularity) Neutronium → Chronite → Aetherium → Singularity alloys. Ask the Archivist "What next?" anytime.<br><br>
<b>Integrity</b> is your health. Smash Vital Cores underground to raise it. Five Star Shards (falling at night) make an Energy Matrix.<br><br>
<b>Saving.</b> The game autosaves every 2 minutes and when you leave. On iPhone, use Share → Add to Home Screen to play full-screen and offline.`;

export function settingsForm(s) {
  const range = (k, label, min, max, step) => `<div class="formrow"><span class="lbl">${label}</span><input type="range" data-set="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}"></div>`;
  const tog = (k, label) => `<div class="formrow"><span class="lbl">${label}</span><div class="opt"><button data-tog="${k}" class="${s[k] ? 'on' : ''}">${s[k] ? 'On' : 'Off'}</button></div></div>`;
  return range('sfx', 'Sound', 0, 1, 0.05) + range('music', 'Music', 0, 1, 0.05) + range('zoom', 'Zoom', 0.6, 1.6, 0.1) + range('controlScale', 'Button size', 0.7, 1.4, 0.05)
    + `<div class="formrow"><span class="lbl">Lighting</span><div class="opt"><button data-light="1" class="${s.lightQuality === 1 ? 'on' : ''}">Fast</button><button data-light="2" class="${s.lightQuality === 2 ? 'on' : ''}">Quality</button></div></div>`
    + tog('smoothLight', 'Smooth light') + tog('minimap', 'Minimap') + tog('leftHanded', 'Left-handed') + tog('showFps', 'Show FPS') + tog('autoPause', 'Pause in menus');
}

export function bindSettingsForm(root, s, onChange) {
  root.querySelectorAll('[data-set]').forEach((el) => { el.oninput = () => { s[el.dataset.set] = parseFloat(el.value); onChange(); }; });
  root.querySelectorAll('[data-tog]').forEach((el) => { el.onclick = () => { s[el.dataset.tog] = !s[el.dataset.tog]; el.classList.toggle('on'); el.textContent = s[el.dataset.tog] ? 'On' : 'Off'; onChange(); }; });
  root.querySelectorAll('[data-light]').forEach((el) => { el.onclick = () => { s.lightQuality = +el.dataset.light; root.querySelectorAll('[data-light]').forEach((b) => b.classList.toggle('on', b === el)); onChange(); }; });
}
