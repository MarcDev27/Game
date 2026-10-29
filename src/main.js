// Entry point: boot, screen state machine, fixed-timestep loop, input → actions, saving.
import { TILE, uid } from './core/util.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { store, serializeWorld, deserializeWorld, loadSettings, saveSettings, requestPersistence } from './core/storage.js';
import { buildAtlases } from './gfx/textures.js';
import { Renderer } from './gfx/renderer.js';
import { Player } from './game/player.js';
import { Game } from './game/game.js';
import { ITEMS } from './content/items.js';
import { generateWorld } from './world/worldgen.js';
import { UI } from './ui/ui.js';
import { Menus } from './ui/menus.js';
import { HOTBAR } from './game/inventory.js';
import { applyLayout, watchLayout } from './ui/layout.js';
import { smartAim } from './game/smartaim.js';
import { startPadding } from './ui/padding.js';
import { toggleRide } from './game/vehicles.js';
import { activateAug } from './game/implants.js';

const canvas = document.getElementById('game');
const settings = loadSettings();
const input = new Input(canvas);
const audio = new Audio();
const renderer = new Renderer(canvas);
let game = null, ui = null, state = 'menu';
let consumedTouch = false;
let lastZoomOut = 0;
let lastAim = { x: 0, y: 0, show: false, fromMouse: false };

const env = {
  settings, input, audio, renderer,
  applySettings() {
    saveSettings(settings);
    audio.setVolumes(settings.sfx, settings.music);
    renderer.smoothLight = settings.smoothLight;
    resize();
  },
  async save() {
    if (!game) return;
    game.town.save(); game.events.save();
    const w = game.world;
    w.lastPlayed = Date.now();
    const pd = game.player.serialize();
    pd.lastPlayed = Date.now();
    if (game.player.mode === 'hard' && game.player.dead) return;
    await store.put('players', JSON.parse(JSON.stringify(pd)));
    await store.put('worlds', serializeWorld(w));
  },
  async saveAndQuit() {
    await env.save();
    exitToMenu();
  },
  async hardcoreExit() {
    if (game) { await store.del('players', game.player.id); game.player.dead = true; await store.put('worlds', serializeWorld(game.world)); }
    exitToMenu(true);
  },
  async startGame(pd, worldId) {
    menus.loading('Loading world...', 0.3);
    const o = await store.get('worlds', worldId);
    menus.loading('Decompressing strata...', 0.7);
    await new Promise((r) => setTimeout(r, 0));
    const world = deserializeWorld(o);
    launch(pd, world);
  },
  async createWorld(pd, opts) {
    menus.loading('Initializing terraformer...', 0);
    const world = await generateWorld(opts, (t, f) => menus.loading(t, f));
    world.id = uid(); world.created = Date.now();
    menus.loading('Saving world...', 1);
    await store.put('worlds', serializeWorld(world));
    launch(pd, world);
  },
  onPanelClosed() {},
};
const menus = new Menus(env);

function launch(pd, world) {
  const player = new Player(pd);
  if (!player.id) player.id = uid();
  game = new Game(world, player, env);
  ui = new UI(game, env);
  resize();
  game.start();
  menus.clear();
  state = 'game';
  requestPersistence();
  game.notify('Tap "Field Guide" in the menu (☰) for controls. Ask the Archivist for hints!', '#8aa0c0');
}

function exitToMenu(skipSave) {
  if (ui) ui.destroy();
  game = null; ui = null; state = 'menu';
  menus.title();
}

// Every resize (rotation, iPhone Duo opening/closing/folding, Split View) re-lays out the HUD
// and resizes the canvas to the new shape — no letterboxing, the view simply grows or shrinks.
let gameArea = null;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, settings.resolution || 2);
  const area = applyLayout(settings);
  gameArea = area;
  const zoomOut = game ? game.player.s.zoomOut || 0 : 0;
  lastZoomOut = zoomOut;
  renderer.resize(area.w, area.h, dpr, settings.zoom / (1 + zoomOut));
  if (game) { const v = renderer.viewSize(); game.view.w = v.w; game.view.h = v.h; }
  if (ui) ui.relayout();
}
watchLayout(resize);
startPadding(renderer.canvas, () => ({ gameH: gameArea ? gameArea.h : window.innerHeight }));

// ---------------- input → actions ----------------
function quickUse(kind) {
  const p = game.player;
  let best = -1, bestV = 0;
  for (let i = 0; i < p.inv.length; i++) {
    const s = p.inv[i];
    if (!s) continue;
    const c = ITEMS[s.k].consume;
    if (!c) continue;
    const v = kind === 'heal' ? c.heal : c.energy;
    if (v && (best < 0 || (kind === 'heal' ? Math.abs(v - (p.s.maxLife - p.life)) < Math.abs(bestV - (p.s.maxLife - p.life)) : v > bestV))) { best = i; bestV = v; }
  }
  if (best < 0) { game.fx.text(p.cx, p.y - 6, kind === 'heal' ? 'No stims' : 'No cells', '#ff8fa8'); return; }
  const s = p.inv[best];
  if (game.consume(p, ITEMS[s.k])) { s.n--; if (s.n <= 0) p.inv[best] = null; }
}

function step() {
  const intents = input.intents();
  const p = game.player;
  // panels
  if (intents.inventory) {
    if (ui.map.open) ui.closeMap();
    else if (ui.panel) ui.closePanel();
    else if (input.pressed.has('Escape')) ui.openPause();
    else ui.openInventory();
  }
  if (intents.map) { if (ui.map.open) ui.closeMap(); else ui.openMap(); }
  // hotbar keys
  for (let i = 0; i < HOTBAR; i++) if (input.pressed.has(String((i + 1) % 10))) p.sel = i;
  if (input.wheel && !ui.panel) p.sel = (p.sel + input.wheel + HOTBAR) % HOTBAR;
  if (intents.ride && !p.dead) toggleRide(game, p);
  if (intents.aug && !p.dead) activateAug(game, p);
  if (intents.heal) quickUse('heal');
  if (intents.energy) quickUse('energy');

  // aim and use
  let useHeld = false;
  const blocked = ui.blocking();
  for (const t of input.taps) {
    if (blocked) continue;
    const wp = renderer.screenToWorld(game, t.x, t.y);
    if (t.touch) {
      consumedTouch = game.tryInteract(wp.x, wp.y);
    }
  }
  if (input.pressed.has('MouseRight') && !blocked) {
    const wp = renderer.screenToWorld(game, input.mouse.x, input.mouse.y);
    game.tryInteract(wp.x, wp.y);
  }
  input.taps.length = 0;
  const us = input.useStick;
  if (us.active && !blocked && !p.dead) {
    // USE button: drag to aim; otherwise follow the movement stick, then smart-target.
    const j = input.joy;
    const drag = Math.hypot(us.x, us.y) > 0.3 ? { x: us.x, y: us.y } : null;
    const move = j.active && Math.hypot(j.x, j.y) > 0.4 ? { x: j.x, y: j.y } : null;
    const a = smartAim(game, p, drag, move);
    lastAim = { x: a.x, y: a.y, show: true, fromMouse: false, fromStick: true };
    useHeld = true;
  } else if (input.touch.active && !blocked) {
    const wp = renderer.screenToWorld(game, input.touch.x, input.touch.y);
    lastAim = { x: wp.x, y: wp.y, show: true, fromMouse: false };
    useHeld = !consumedTouch;
  } else if (!input.usedTouch || input.mouse.inside) {
    const wp = renderer.screenToWorld(game, input.mouse.x, input.mouse.y);
    lastAim = { x: wp.x, y: wp.y, show: input.mouse.inside, fromMouse: true };
    useHeld = input.mouse.left && !blocked;
  } else {
    lastAim.show = false;
    if (!input.touch.active) consumedTouch = false;
  }
  if (!input.touch.active) consumedTouch = false;
  const paused = blocked && settings.autoPause && (ui.panel === 'pause' || ui.panel === 'settings' || ui.panel === 'help' || ui.panel === 'inv' || ui.panel === 'npc' || ui.map.open);
  if (!paused) game.update(intents, lastAim, useHeld && !blocked);
  input.endFrame();
}

// ---------------- loop ----------------
let acc = 0, last = performance.now(), saveClock = 0, fpsT = 0, fpsN = 0, fps = 0;
const menuWorld = { time: 20 * 3600, layers: { cavern: 500, surface: 200 } };
function frame(now) {
  requestAnimationFrame(frame);
  let dt = now - last; last = now;
  if (dt > 250) dt = 250;
  if (state === 'game' && game) {
    acc += dt;
    let n = 0;
    while (acc >= 1000 / 60 && n < 4) { step(); acc -= 1000 / 60; n++; }
    if (n === 4) acc = 0;
    if ((game.player.s.zoomOut || 0) !== lastZoomOut) resize();
    renderer.render(game, lastAim, settings);
    ui.update();
    saveClock += dt;
    if (saveClock > 120000) { saveClock = 0; env.save().then(() => ui && ui.toast('Autosaved', '#3a6a7a')); }
    if (settings.showFps) {
      fpsN++; fpsT += dt;
      if (fpsT > 500) { fps = Math.round(fpsN * 1000 / fpsT); fpsN = 0; fpsT = 0; }
      const ctx = renderer.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, renderer.canvas.height - 18, 70, 18);
      ctx.fillStyle = '#3dff6a'; ctx.font = '12px monospace'; ctx.fillText(fps + ' fps', 4, renderer.canvas.height - 5);
    }
  } else {
    // animated title background
    menuWorld.time = (menuWorld.time + dt * 3) % 86400;
    const ctx = renderer.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderer.bg.draw(ctx, renderer.canvas.width, renderer.canvas.height, { x: now * 0.05, y: 0, yOff: 0 }, menuWorld, 'plains', null, 0, false);
    input.endFrame();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (game) env.save(); input.releaseAll(); if (audio.ctx) audio.ctx.suspend(); }
  else if (audio.ctx) audio.ctx.resume();
});
window.addEventListener('pagehide', () => { if (game) env.save(); });
document.addEventListener('touchstart', () => audio.unlock(), { once: false, passive: true });
document.addEventListener('mousedown', () => audio.unlock());
document.addEventListener('gesturestart', (e) => e.preventDefault());

async function boot() {
  buildAtlases();
  env.applySettings();
  resize();
  menus.title();
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {});
    // A new version was installed: reload straight away on the title screen, otherwise say so.
    let reloading = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !hadController) return;
      if (state !== 'game') { reloading = true; location.reload(); } else if (ui) ui.toast('Update installed. Return to the title screen to load it.', '#2ef2ff');
    });
    fetch('sw.js').then((r) => r.text()).then((t) => { const m = t.match(/neon-strata-([0-9a-f]+)/); if (m) window.__neonBuild = m[1]; }).catch(() => {});
  }
  window.__neon = { get game() { return game; }, env, menus, launch };
}
boot();
