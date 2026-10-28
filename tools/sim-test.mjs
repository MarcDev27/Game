// Deep simulation test: drives the real game modules in a headless browser and exercises
// items, crafting, building, housing, every monster, every boss, events and save/load.
// Usage: node tools/sim-test.mjs
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, [path.join(root, 'tools', 'serve.mjs'), String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector('#m-play');

const result = await page.evaluate(async () => {
  const log = [];
  const fail = [];
  const W = await import('/src/world/worldgen.js');
  const P = await import('/src/game/player.js');
  const I = await import('/src/content/items.js');
  const M = await import('/src/content/monsters.js');
  const R = await import('/src/content/recipes.js');
  const Tl = await import('/src/content/tiles.js');
  const St = await import('/src/core/storage.js');
  const B = await import('/src/game/bosses.js');
  const inv = await import('/src/game/inventory.js');
  const world = await W.generateWorld({ size: 'small', seed: 777, name: 'Sim' });
  world.id = 'sim';
  const pd = P.newPlayerData('Sim', { chassis: '#ccc', visor: '#2ef2ff', suit: '#333', hair: '#f0f', style: 0 }, 'soft');
  pd.id = 'simp';
  window.__neon.launch(pd, world);
  const g = window.__neon.game;
  const p = g.player;
  const none = { mx: 0, my: 0, jump: false, jumpPressed: false, down: false, up: false };
  const run = (n, intents = none, aim = null, use = false) => {
    for (let i = 0; i < n; i++) {
      try { g.update(intents, aim || { x: p.cx + 40, y: p.cy }, use); }
      catch (e) { fail.push('tick: ' + e.message + ' ' + e.stack.split('\n').slice(0, 3).join(' | ')); return false; }
    }
    return true;
  };
  const guard = (label, fn) => { try { fn(); } catch (e) { fail.push(label + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); } };
  run(120);
  log.push('start y ' + Math.round(p.y / 16) + ' onGround ' + p.onGround);
  // walking & jumping
  run(60, { ...none, mx: 1 }); run(20, { ...none, mx: 1, jump: true, jumpPressed: true });
  run(60, { ...none, mx: -1 });
  log.push('after walk x ' + Math.round(p.x / 16));
  p.immune = 1e9;
  // mining below
  p.sel = 1;
  const tx = Math.floor(p.cx / 16), ty = Math.floor((p.y + p.h + 4) / 16);
  const before = g.world.get(tx, ty);
  run(120, none, { x: tx * 16 + 8, y: ty * 16 + 8, show: true }, true);
  log.push('mined tile ' + Tl.TILES[before]?.key + ' -> ' + g.world.get(tx, ty) + ' drops ' + g.drops.length);
  run(60);
  // give every item once and use it
  const give = (k, n = 1) => inv.addItem(p.inv, k, n);
  let used = 0;
  for (const it of I.ITEM_LIST) {
    guard('use ' + it.key, () => {
      p.inv[0] = { k: it.key, n: Math.min(it.stack, 50) };
      p.sel = 0; p.useTimer = 0; p.energy = 999; p.life = p.s.maxLife;
      if (it.ammo === 'round') p.inv[49] = { k: 'kinetic_round', n: 999 };
      if (it.ammo === 'rocket') p.inv[49] = { k: 'rocket_i', n: 999 };
      p.buffs.delete('potion_sick');
      if (it.consume && it.consume.summon) return; // bosses tested separately
      if (it.recall) return;
      for (let k = 0; k < 3; k++) { g.update(none, { x: p.cx + 60, y: p.cy - 10, show: true }, true); }
      used++;
    });
  }
  run(200);
  log.push('used items ' + used + ' projectiles ' + g.projectiles.length);
  for (const q of g.projectiles) q.dead = true;
  // crafting: place all stations near player and craft every recipe
  for (let i = 0; i < p.inv.length; i++) p.inv[i] = null;
  const px = Math.floor(p.cx / 16), py = Math.floor(p.cy / 16);
  const stations = ['assembly_bench', 'smelter', 'fabricator', 'synth_vat', 'textile_printer', 'tinker_station', 'plasma_forge', 'nano_forge', 'quantum_assembler', 'singularity_core', 'cryo_lathe'];
  // flatten an area
  for (let y = py - 12; y <= py + 1; y++) for (let x = px - 20; x <= px + 20; x++) g.world.set(x, y, 0);
  for (let x = px - 20; x <= px + 20; x++) g.world.set(x, py + 2, Tl.T.ferrocrete);
  p.y = (py + 2) * 16 - p.h - 0.1; p.x = px * 16;
  let sx = px - 18;
  for (const s of stations) { const f = Tl.TILES[Tl.T[s]].furn; g.world.placeFurniture(sx, py + 2 - f.h, Tl.T[s]); sx += f.w; }
  const st = R.stationsProvided(g.nearbyStations());
  log.push('stations ' + [...st].join(','));
  const ui = g.ui;
  let crafted = 0;
  for (const r of R.RECIPES) {
    for (let i = 0; i < p.inv.length; i++) p.inv[i] = null;
    for (const [k, n] of r.ing) give(R.GROUPS[k] ? R.GROUPS[k][0] : k, n);
    ui.craftSel = r.id;
    const beforeCount = inv.countItem(p.inv, r.out);
    guard('craft ' + r.out, () => ui.craft(1));
    if (inv.countItem(p.inv, r.out) > beforeCount || g.drops.length) crafted++;
    else fail.push('could not craft ' + r.out + ' at ' + r.at);
  }
  log.push('crafted ' + crafted + '/' + R.RECIPES.length);
  ui.closePanel();
  // house building + housing validation
  for (let i = 0; i < p.inv.length; i++) p.inv[i] = null;
  const hx = px + 4, hy = py + 1; // floor at py+2
  for (let x = hx; x < hx + 12; x++) { g.world.set(x, hy - 9, Tl.T.fiber_block); }
  for (let y = hy - 9; y <= hy + 1; y++) { g.world.set(hx, y, Tl.T.fiber_block); g.world.set(hx + 11, y, Tl.T.fiber_block); }
  for (let y = hy - 8; y <= hy; y++) for (let x = hx + 1; x < hx + 11; x++) g.world.setWall(x, y, Tl.W.fiber_wall);
  for (let y = hy - 2; y <= hy; y++) g.world.set(hx, y, 0);
  g.world.placeFurniture(hx, hy - 2, Tl.T.fiber_door);
  g.world.placeFurniture(hx + 2, hy - 1, Tl.T.fiber_chair);
  g.world.placeFurniture(hx + 4, hy - 1, Tl.T.fiber_table);
  g.world.set(hx + 8, hy - 5, Tl.T.glowstick);
  const home = g.town.findHouse();
  log.push('house found ' + JSON.stringify(home));
  if (!home) fail.push('valid house not detected');
  p.credits = 99999;
  inv.addItem(p.inv, 'kinetic_round', 10);
  g.town.checkArrivals(true);
  log.push('npcs ' + g.town.npcs.map((n) => n.key).join(','));
  // interact: door toggle, chest
  guard('door', () => g.tryInteract(hx * 16 + 8, (hy - 1) * 16 + 8));
  // npc dialogs
  for (const n of g.town.npcs) guard('npc ' + n.key, () => { ui.openNpc(n); ui.action('shop'); ui.action('sellmode'); ui.action('hint'); ui.closePanel(); });
  log.push('hint: ' + g.town.hint());
  // monsters
  let mcount = 0;
  for (const k in M.MONSTERS) {
    const d = M.MONSTERS[k];
    if (d.boss) continue;
    guard('monster ' + k, () => {
      const m = d.ai === 'worm' ? g.spawnWormMonster(k, p.cx + 120, p.cy - 40) : g.spawnMonster(k, p.cx + 120, p.cy - 10);
      for (let t = 0; t < 40; t++) g.update(none, { x: p.cx, y: p.cy }, false);
      g.damageMonster(m, 1e7, 1, 1, false, null);
      mcount++;
    });
  }
  run(30);
  log.push('monsters tested ' + mcount + ' alive ' + g.monsters.length + ' drops ' + g.drops.length);
  // bosses
  for (const k of ['overseer', 'gel_sovereign', 'data_wyrm', 'swarm_mother', 'archon', 'core_warden', 'twin_lancers', 'leviathan', 'prime_archon', 'bloom_titan', 'gravity_golem', 'architect']) {
    guard('boss ' + k, () => {
      g.world.time = 23 * 3600;
      const b = B.summonBoss(g, k);
      if (!b) { fail.push('no boss ' + k); return; }
      for (let t = 0; t < 400; t++) { p.life = p.s.maxLife; g.update(none, { x: p.cx, y: p.cy }, false); }
      for (const m of [...g.monsters]) if (m.def.boss && !m.head && !m.owner) g.damageMonster(m, 1e8, 0, 1, false, null);
      for (let t = 0; t < 30; t++) g.update(none, { x: p.cx, y: p.cy }, false);
      for (const m of [...g.monsters]) if (m.def.boss && !m.head && !m.dead) g.damageMonster(m, 1e8, 0, 1, false, null);
      for (let t = 0; t < 5; t++) g.update(none, { x: p.cx, y: p.cy }, false);
    });
  }
  log.push('bosses: ' + Object.keys(g.world.flags.bosses).join(',') + ' hardmode ' + g.world.flags.hardmode);
  // events
  for (const e of ['invasion_drones', 'event_redshift']) guard('event ' + e, () => { g.world.time = 23 * 3600; g.events.active = null; g.events.trigger(e); run(200); });
  guard('meteor', () => g.events.orbitalDrop());
  guard('stars', () => { for (let i = 0; i < 5; i++) g.events.fallStar(); run(100); });
  // player death / respawn
  p.immune = 0; guard('death', () => { g.hurtPlayer(1e6, p.cx, 0, 'test'); run(400); });
  log.push('respawned ' + !p.dead);
  // biome tours: teleport around the world and tick
  for (const [fx, fy] of [[0.1, 0.3], [0.27, 0.35], [0.5, 0.6], [0.78, 0.5], [0.78, 0.7], [0.5, 0.95], [0.05, 0.27], [0.6, 0.05]]) {
    p.x = g.world.w * 16 * fx; p.y = g.world.h * 16 * fy; p.immune = 1e9;
    run(240);
  }
  log.push('tour done, monsters ' + g.monsters.length);
  // render a frame in a few states
  guard('render', () => window.__neon.env.renderer.render(g, { x: p.cx, y: p.cy, show: true }, window.__neon.env.settings));
  // save/load roundtrip
  const ser = St.serializeWorld(g.world);
  const back = St.deserializeWorld(JSON.parse(JSON.stringify({ ...ser, fg: Array.from(ser.fg), wall: Array.from(ser.wall), liq: Array.from(ser.liq), liqT: Array.from(ser.liqT), data: Array.from(ser.data), explored: Array.from(ser.explored), biomeCol: Array.from(ser.biomeCol), surfaceY: Array.from(ser.surfaceY) })));
  let diff = 0; for (let i = 0; i < g.world.fg.length; i++) if (back.fg[i] !== g.world.fg[i] || back.wall[i] !== g.world.wall[i]) diff++;
  log.push('roundtrip diff ' + diff + ' rle words ' + ser.fg.length);
  await window.__neon.env.save();
  const loaded = await St.store.get('worlds', 'sim');
  log.push('saved world in IDB: ' + !!loaded + ' players: ' + (await St.store.all('players')).length);
  return { log, fail };
});
console.log(result.log.join('\n'));
console.log('FAILURES (' + result.fail.length + '):\n' + result.fail.slice(0, 40).join('\n'));
console.log('PAGE ERRORS (' + errors.length + '):\n' + errors.slice(0, 10).join('\n'));
await browser.close();
server.kill();
