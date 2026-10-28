// Headless smoke test: creates a character + small world through the real menus on an
// iPhone-sized touch viewport, plays a few seconds, and saves screenshots.
// Usage: node tools/smoke-test.mjs [outDir]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'tools', 'screens');
fs.mkdirSync(out, { recursive: true });
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, [path.join(root, 'tools', 'serve.mjs'), String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector('#m-play');
await page.screenshot({ path: path.join(out, '01-title.png') });
await page.tap('#m-play');
await page.waitForSelector('#m-new');
await page.tap('#m-new');
await page.waitForSelector('#cc-create');
await page.screenshot({ path: path.join(out, '02-character.png') });
await page.tap('#cc-create');
await page.waitForSelector('#m-new');
await page.tap('#m-new');
await page.waitForSelector('#cw-create');
await page.tap('[data-size="small"]');
await page.fill('#cw-seed', '424242');
await page.tap('#cw-create');
await page.waitForFunction(() => window.__neon && window.__neon.game, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, '03-game.png') });
// walk right with the joystick, jump, then mine toward the ground
const tap = async (x, y, ms = 300) => {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
await page.evaluate(() => { const g = window.__neon.game; g.player.sel = 2; });
await tap(470, 330, 1200);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, '04-mining.png') });
const state = await page.evaluate(() => {
  const g = window.__neon.game;
  return { x: g.player.x, y: g.player.y, life: g.player.life, monsters: g.monsters.length, tick: g.tick, npcs: g.town.npcs.length, drops: g.drops.length };
});
console.log('state', JSON.stringify(state));
// open inventory
await page.tap('#btn-inv');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, '05-inventory.png') });
await page.tap('[data-act="close"]');
// night + underground views
await page.evaluate(() => { const g = window.__neon.game; g.world.time = 23 * 3600; });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(out, '06-night.png') });
await page.evaluate(() => { const g = window.__neon.game; const p = g.player; p.y = g.world.layers.cavern * 16; p.x += 64; g.cam.y = p.y - 200; });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(out, '07-cavern.png') });
await page.evaluate(() => { const g = window.__neon.game; const p = g.player; p.y = (g.world.h - 60) * 16; g.cam.y = p.y - 200; });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(out, '08-core.png') });
await page.evaluate(() => window.__neon.env.save());
console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 20).join('\n') : 'no errors');
await browser.close();
server.kill();
