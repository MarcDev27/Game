// Game session: owns the world, player and entities and runs the simulation tick.
import { TILE, rng, clamp, sign, segmentHitsRect, rectsOverlap, RNG } from '../core/util.js';
import { TILES, T, W, WALLS, SOLID, CONVERT, TREES } from '../content/tiles.js';
import { ITEMS } from '../content/items.js';
import { MONSTERS, BOSS_INFO } from '../content/monsters.js';
import { RARITY_COLORS } from '../content/materials.js';
import { rollPrefix } from '../content/prefixes.js';
import { canisterLoot } from '../content/loot.js';
import { Lighting } from '../world/lighting.js';
import { Liquids } from '../world/liquids.js';
import { LIQ, DOOR_OPEN, BIOME } from '../world/world.js';
import { Monster, Projectile, Drop, updateDrop, updateProjectile } from './entities.js';
import { updateMonster } from './ai.js';
import { summonBoss, spawnWorm } from './bosses.js';
import { FX } from './fx.js';
import { Spawner } from './spawner.js';
import { Events } from './events.js';
import { Town } from './town.js';
import { addItem, canFit } from './inventory.js';
import { rectSolid } from './physics.js';
import { openCrate } from './fishing.js';
import { ACHIEVEMENTS } from '../content/achievements.js';

const TREE_HP = 220;

export class Game {
  constructor(world, player, env) {
    this.world = world; this.player = player;
    this.audio = env.audio; this.input = env.input; this.settings = env.settings; this.ui = null;
    this.monsters = []; this.projectiles = []; this.drops = [];
    this.fx = new FX();
    this.lighting = new Lighting(world);
    this.liquids = new Liquids(world);
    this.spawner = new Spawner(this);
    this.events = new Events(this);
    this.town = new Town(this);
    this.tick = 0;
    this.cam = { x: 0, y: 0 };
    this.view = { w: 800, h: 450 };
    this.tileDmg = new Map();
    this.biome = 'plains'; this.layer = 'surface';
    this.bosses = [];
    this.openChest = null;
    this.mapDirty = new Set();
    this.rng = new RNG((world.seed ^ Date.now()) >>> 0);
    this.saveTimer = 0;
    this.dpsLog = [];
    world.listeners.push((x, y) => this.mapDirty.add(x < 0 ? -1 : (y >> 6) * 4096 + (x >> 6)));
  }

  start() {
    const w = this.world, p = this.player;
    const sp = p.spawns[w.id];
    const sx = sp ? sp[0] : w.spawnX, sy = sp ? sp[1] : w.spawnY;
    p.x = sx * TILE + 8 - p.w / 2; p.y = sy * TILE - p.h - 1;
    if (rectSolid(w, p.x, p.y, p.w, p.h)) { p.x = w.spawnX * TILE; p.y = this.findStandY(w.spawnX) * TILE - p.h - 1; }
    p.fallStartY = p.y;
    this.cam.x = p.cx - this.view.w / 2; this.cam.y = p.cy - this.view.h / 2;
    this.town.init();
    this.notify('Welcome to ' + w.name, '#2ef2ff');
  }

  findStandY(tx) {
    const w = this.world;
    tx = clamp(tx, 0, w.w - 1);
    for (let y = Math.max(1, w.surfaceY[tx] - 50); y < w.h - 1; y++) if (this.world.solidAt(tx, y) && !this.world.solidAt(tx, y - 1) && !this.world.solidAt(tx, y - 2) && !this.world.solidAt(tx, y - 3)) return y;
    return 10;
  }

  rarityColor(k) { const it = ITEMS[k]; return RARITY_COLORS[it ? it.rarity : 0] || '#fff'; }
  notify(msg, color = '#fff') { if (this.ui) this.ui.toast(msg, color); }

  // ---------------- main tick ----------------
  update(intents, aim, useHeld) {
    this.tick++;
    const w = this.world, p = this.player;
    this.events.update();
    // biome sensing every half second
    if (this.tick % 30 === 1) this.senseBiome();
    p.update(this, intents, aim, useHeld);
    for (const m of this.monsters) if (!m.dead) {
      updateMonster(m, this);
      if (m.dead) continue;
      this.monsterContact(m);
      this.despawnCheck(m);
    }
    for (const pr of this.projectiles) if (!pr.dead) updateProjectile(pr, this);
    for (const d of this.drops) if (!d.dead) updateDrop(d, this);
    this.monsters = this.monsters.filter((m) => !m.dead);
    this.projectiles = this.projectiles.filter((q) => !q.dead);
    this.drops = this.drops.filter((d) => !d.dead);
    this.town.update();
    this.spawner.update();
    if (this.tick % 2 === 0) this.liquids.update(Math.floor(p.cx / TILE), Math.floor(p.cy / TILE));
    this.randomTicks();
    this.fx.update();
    // tile damage decays
    if (this.tick % 60 === 0) for (const [k, v] of this.tileDmg) if (this.tick - v.t > 300) this.tileDmg.delete(k);
    this.updateCamera();
    this.chestRangeCheck();
    if (this.tick % 120 === 7) this.checkAchievements();
  }

  updateCamera() {
    const p = this.player;
    const tx = p.cx - this.view.w / 2, ty = p.cy - this.view.h / 2 - 20;
    this.cam.x += (tx - this.cam.x) * 0.2;
    this.cam.y += (ty - this.cam.y) * 0.2;
    const W2 = this.world.w * TILE, H2 = this.world.h * TILE;
    this.cam.x = clamp(this.cam.x, 0, Math.max(0, W2 - this.view.w));
    this.cam.y = clamp(this.cam.y, 0, Math.max(0, H2 - this.view.h));
  }

  senseBiome() {
    const w = this.world, p = this.player;
    const tx = Math.floor(p.cx / TILE), ty = Math.floor(p.cy / TILE);
    const counts = { blight: 0, prism: 0, jungle: 0, snow: 0, desert: 0, dungeon: 0, temple: 0, hive: 0 };
    for (let y = ty - 25; y <= ty + 25; y += 2) for (let x = tx - 40; x <= tx + 40; x += 2) {
      const t = TILES[w.get(x, y)];
      if (t && t.biome && counts[t.biome] !== undefined) counts[t.biome]++;
    }
    const layer = w.layerAt(ty);
    let b = w.biomeAt(tx);
    if (counts.temple > 40 && w.getWall(tx, ty) === W.temple_wall) b = 'temple';
    else if (counts.dungeon > 60 && w.getWall(tx, ty) === W.derelict_wall) b = 'dungeon';
    else if (counts.hive > 30) b = 'hive';
    else if (counts.blight > 60) b = 'blight';
    else if (counts.prism > 60) b = 'prism';
    else if (counts.jungle > 80) b = 'jungle';
    else if (counts.snow > 80) b = 'snow';
    else if (counts.desert > 80) b = 'desert';
    else if (b === 'blight' || b === 'prism') b = 'plains';
    if (layer === 'core') b = 'core';
    this.biome = b; this.layer = layer;
    // music
    let theme = 'day';
    const boss = this.bosses.find((m) => !m.dead);
    if (boss) theme = boss.def.music || 'boss1';
    else if (this.events.active === 'invasion' || this.events.active === 'eclipse') theme = 'event';
    else if (layer === 'space') theme = 'space';
    else if (b === 'core') theme = 'core';
    else if (b === 'dungeon' || b === 'temple') theme = 'dungeon';
    else if (layer === 'cavern') theme = b === 'jungle' ? 'jungle' : b === 'snow' ? 'snow' : 'cavern';
    else if (layer === 'underground') theme = b === 'jungle' ? 'jungle' : b === 'snow' ? 'snow' : b === 'desert' ? 'desert' : 'underground';
    else if (b === 'ocean') theme = 'ocean';
    else if (!w.isDay()) theme = this.events.active === 'redshift' ? 'event' : 'night';
    else theme = { jungle: 'jungle', snow: 'snow', desert: 'desert', blight: 'blight', prism: 'snow' }[b] || 'day';
    this.audio.setTheme(theme);
  }

  // ---------------- random tile updates (growth, spread) ----------------
  randomTicks() {
    const w = this.world;
    const n = Math.max(20, Math.floor(w.w * w.h / 40000));
    const L = w.layers;
    for (let i = 0; i < n; i++) {
      const x = 2 + Math.floor(this.rng.next() * (w.w - 4)), y = 2 + Math.floor(this.rng.next() * (w.h - 4));
      const id = w.fg[y * w.w + x];
      if (!id) continue;
      const t = TILES[id];
      if (t.key === 'sapling') {
        if (this.rng.chance(0.08)) this.growSapling(x, y);
      } else if (t.key === 'regolith') {
        // grass spreads to exposed regolith from adjacent grass
        if (y < L.rock + 10 && this.exposed(x, y)) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) {
          const nt = w.get(x + dx, y + dy);
          if (nt === T.synthgrass || nt === T.grayturf || nt === T.prismturf) { w.set(x, y, nt); break; }
        }
      } else if (t.grassOf && w.isAir(x, y - 1) && !w.liq[(y - 1) * w.w + x] && this.rng.chance(0.25)) {
        const plant = { synthgrass: T.tallgrass, glowmoss: T.tallgrass_j, grayturf: T.tallgrass_b, prismturf: T.tallgrass_p }[t.key];
        if (this.rng.chance(0.06)) {
          const herb = { synthgrass: 'herb_voltleaf', glowmoss: 'herb_junglevine', grayturf: 'herb_gloomspore' }[t.key];
          if (herb) w.set(x, y - 1, T[herb]);
        } else if (plant) w.set(x, y - 1, plant);
      } else if ((t.key === 'frost' || t.key === 'cryoice') && w.isAir(x, y - 1) && this.rng.chance(0.01)) w.set(x, y - 1, T.herb_frostbloom);
      else if (t.key === 'rustsand' && w.isAir(x, y - 1) && this.rng.chance(0.01)) w.set(x, y - 1, T.herb_sunpetal);
      else if (t.key === 'slag' && w.isAir(x, y - 1) && this.rng.chance(0.01)) w.set(x, y - 1, T.herb_emberroot);
      else if ((t.key === 'ferrocrete' || t.key === 'regolith' || t.key === 'biogel') && y > L.rock && w.isAir(x, y - 1) && w.getWall(x, y - 1) && this.rng.chance(0.004)) w.set(x, y - 1, T.herb_glowcap);
      else if (t.key === 'glowmoss' && y > L.cavern && w.flags.bosses.twin_lancers && w.flags.bosses.leviathan && w.flags.bosses.prime_archon && !w.flags.bosses.bloom_titan && this.rng.chance(0.002)) {
        if (w.isAir(x, y - 1) && w.isAir(x + 1, y - 1) && w.isAir(x, y - 2) && w.isAir(x + 1, y - 2) && w.solidAt(x + 1, y) && w.countBulbs !== false) {
          w.placeFurniture(x, y - 2, T.bloom_bulb);
        }
      }
      // hardmode spread
      if (w.flags.hardmode && (t.blight || t.prism) && this.rng.chance(0.3)) {
        const nx = x + this.rng.int(-3, 3), ny = y + this.rng.int(-3, 3);
        const conv = (t.blight ? CONVERT.blight : CONVERT.prism).get(w.get(nx, ny));
        if (conv) w.set(nx, ny, conv, w.data[ny * w.w + nx]);
      }
    }
  }

  exposed(x, y) { const w = this.world; return w.isAir(x - 1, y) || w.isAir(x + 1, y) || w.isAir(x, y - 1) || w.isAir(x, y + 1); }

  growSapling(x, y) {
    const w = this.world;
    const ground = w.get(x, y + 1);
    const type = { [T.synthgrass]: 'lattice', [T.glowmoss]: 'glowtree', [T.grayturf]: 'blighttree', [T.prismturf]: 'prismtree', [T.frost]: 'cryopine', [T.rustsand]: 'rustpalm' }[ground];
    if (!type) return;
    const h = this.rng.int(6, 13);
    for (let k = 1; k <= h; k++) if (k > 0 && w.get(x, y - k + 1) && k > 1) return;
    for (let k = 0; k < h; k++) {
      let d = 0;
      if (k === h - 1) d = 4; else if (k > 1 && k < h - 2) { if (this.rng.chance(0.15)) d |= 1; if (this.rng.chance(0.15)) d |= 2; }
      w.set(x, y - k, T['tree_' + type], d);
    }
  }

  // ---------------- entities ----------------
  spawnMonster(key, x, y, force = false) {
    const m = new Monster(key, x, y, this);
    this.monsters.push(m);
    if (m.def.boss && !m.owner && !m.head) this.bosses.push(m);
    return m;
  }

  spawnWormMonster(key, x, y) { return spawnWorm(this, key, x, y); }

  spawnProjectile(key, x, y, vx, vy, dmg, kb, owner, extra) {
    const p = new Projectile(key, x, y, vx, vy, dmg, kb, owner, extra);
    this.projectiles.push(p);
    return p;
  }

  dropItem(x, y, k, n = 1, p = null) {
    if (!ITEMS[k] && k !== 'credits') return;
    if (p === null && ITEMS[k] && (ITEMS[k].type === 'weapon' || ITEMS[k].type === 'accessory') && ITEMS[k].damage !== 0) p = rollPrefix(ITEMS[k], this.rng);
    // merge with a nearby identical drop
    for (const d of this.drops) if (d.k === k && !d.p && !p && Math.abs(d.x - x) < 24 && Math.abs(d.y - y) < 24 && k !== 'credits') { d.n += n; return d; }
    const d = new Drop(x, y, k, n, p);
    this.drops.push(d);
    return d;
  }
  dropCredits(x, y, n) {
    n = Math.round(n);
    if (n <= 0) return;
    const d = new Drop(x, y, 'credits', n);
    this.drops.push(d);
  }

  projSolid(p) {
    const w = this.world;
    const tx = Math.floor(p.cx / TILE), ty = Math.floor(p.cy / TILE);
    return w.solidAt(tx, ty);
  }

  los(x1, y1, x2, y2) {
    const w = this.world;
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 12);
    for (let i = 1; i < n; i++) {
      const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n;
      if (w.solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
    }
    return true;
  }

  monsterContact(m) {
    const p = this.player;
    if (p.dead || m.def.friendly || m.dmg <= 0) return;
    if (rectsOverlap(m, p)) {
      this.hurtPlayer(m.dmg, m.cx, 5, m.def.name);
      if (m.def.contactBuff) p.addBuff(m.def.contactBuff.buff, m.def.contactBuff.time);
      if (p.s.thorns && m.contactCd <= 0) { this.damageMonster(m, Math.round(m.dmg * p.s.thorns), 2, sign(m.cx - p.cx), false, null); m.contactCd = 20; }
    }
  }

  despawnCheck(m) {
    if (m.def.boss || m.head || m.owner) return;
    const p = this.player;
    const dx = Math.abs(m.cx - p.cx) / TILE, dy = Math.abs(m.cy - p.cy) / TILE;
    if (dx > 110 || dy > 75) { this.removeMonster(m); return; }
    const sp = m.def.spawn[0];
    if (sp && sp.time === 'night' && this.world.isDay() && m.cy / TILE < this.world.layers.rock && (dx > 45 || dy > 30) && this.events.active !== 'eclipse') this.removeMonster(m);
  }

  removeMonster(m) {
    m.dead = true;
    if (m.segments) for (const s of m.segments) s.dead = true;
  }

  despawnBoss(m) {
    this.removeMonster(m);
    for (const o of this.monsters) if (o.owner === m || o.head === m) o.dead = true;
    if (!this.bosses.some((b) => !b.dead && b !== m)) this.notify(m.def.name + ' has departed...', '#aeb7c2');
    this.bosses = this.bosses.filter((b) => !b.dead);
  }

  damageMonster(m, dmg, kb, dir, crit, src) {
    if (m.dead) return 0;
    if (m.head) { const h = m.head; if (h.dead) return 0; return this.applyDamage(h, m, dmg, kb, dir, crit); }
    return this.applyDamage(m, m, dmg, kb, dir, crit);
  }

  applyDamage(m, shown, dmg, kb, dir, crit) {
    let d = dmg * rng.float(0.88, 1.12);
    if (crit) d *= 2;
    d = Math.max(1, Math.round(d - m.defense * 0.5));
    m.hp -= d;
    shown.hitFlash = 6; m.hitFlash = 6;
    this.fx.text(shown.cx, shown.y - 2, d, crit ? '#ff8a3d' : '#ffe08a', crit);
    this.fx.burst(shown.cx, shown.cy, shown.def.boss ? '#ff5a8a' : shown.def.color, 4, 1.5, false);
    this.audio.play(crit ? 'crit' : 'hit');
    const p = this.player;
    if (p.s.lifesteal && this.tick % 3 === 0) p.life = Math.min(p.s.maxLife, p.life + Math.max(1, d * p.s.lifesteal));
    this.dpsLog.push([this.tick, d]);
    if (kb && m.kbRes < 1 && !m.def.boss) { m.vx = dir * kb * (1 - m.kbRes) * 0.9; m.vy = -kb * (1 - m.kbRes) * 0.5; }
    if (m.hp <= 0) this.killMonster(m);
    return d;
  }

  killMonster(m, silent = false) {
    if (m.dead) return;
    m.dead = true;
    const d = m.def, p = this.player;
    if (m.segments) for (const s of m.segments) { s.dead = true; if (!silent) this.fx.burst(s.cx, s.cy, d.color, 6, 2, false); }
    if (silent) return;
    this.fx.burst(m.cx, m.cy, d.color, 14, 2.5, false);
    this.fx.debris(m.cx, m.cy, d.c2 || '#aaa', 6);
    this.audio.play('kill');
    p.stats.kills++;
    // drops
    const loot = (x, y) => {
      for (const [k, ch, mn, mx] of d.drops) if (this.rng.chance(ch)) this.dropItem(x, y, k, this.rng.int(mn, mx));
      const cr = d.credits * (this.world.difficulty === 'expert' ? 2.5 : 1) * this.rng.float(0.7, 1.3);
      if (cr > 0) this.dropCredits(x, y, cr);
    };
    if (d.boss && !m.owner) {
      if (m.segments && d.segmentHp) for (const sg of m.segments) loot(sg.cx, sg.cy);
      loot(m.cx, m.cy);
      this.dropItem(m.cx, m.cy, m.def.hp > 10000 ? 'mega_stim' : 'stim_pack', this.rng.int(5, 12));
      this.onBossKilled(m);
    } else if (!d.boss) loot(m.cx, m.cy);
    if (d.invader) this.events.invaderKilled(d.invader);
    // hearts drop from regular enemies when low
    if (!d.boss && p.life < p.s.maxLife * 0.5 && this.rng.chance(0.08)) this.dropItem(m.cx, m.cy, 'micro_stim', 1);
  }

  onBossKilled(m) {
    const w = this.world;
    let key = m.key;
    if (key === 'twin_lancer_r' || key === 'twin_lancer_s') {
      const other = m.partner;
      if (other && !other.dead) { this.notify(m.def.name + ' has been destroyed!', '#ffcc33'); return; }
      key = 'twin_lancers';
    }
    this.bosses = this.bosses.filter((b) => !b.dead);
    const first = !w.flags.bosses[key];
    w.flags.bosses[key] = (w.flags.bosses[key] || 0) + 1;
    this.player.stats.bosses++;
    this.notify((BOSS_INFO[key] ? BOSS_INFO[key].name : m.def.name) + ' has been defeated!', '#ffcc33');
    this.audio.play('levelup');
    for (const o of this.monsters) if (o.owner === m) o.dead = true;
    if (key === 'core_warden' && !w.flags.hardmode) this.events.startHardmode();
    if (first && key === 'gravity_golem') this.notify('Sentinels now descend at night, carrying fragments...', '#d0a0ff');
    if (first && key === 'architect') this.notify('You have conquered the Strata. The Singularity is yours.', '#d0a0ff');
    if (first && key === 'archon') this.notify('The Derelict Station is now safe to explore.', '#66ccff');
    if (first && key === 'bloom_titan') this.notify('The Ancient Temple stirs...', '#ffaa22');
    this.town.checkArrivals(true);
  }

  // ---------------- combat vs player ----------------
  hurtPlayer(dmg, srcX, kb, cause) {
    const p = this.player;
    if (p.dead || p.immune > 0) return;
    if (p.s.dodge && rng.chance(p.s.dodge)) { p.immune = 40; this.fx.text(p.cx, p.y, 'Phased', '#9ff4e8'); return; }
    const expert = this.world.difficulty === 'expert';
    let d = Math.max(1, Math.round(dmg - p.s.defense * (expert ? 0.75 : 0.5)));
    d = Math.max(1, Math.round(d * (1 - p.s.damageReduce)));
    p.life -= d;
    p.hurtTimer = 300;
    p.immune = Math.round(40 * (1 + p.s.immuneTime));
    this.fx.text(p.cx, p.y - 4, d, '#ff3355', d > 50);
    this.fx.burst(p.cx, p.cy, '#ff3355', 8, 2, false);
    this.audio.play('hurt');
    if (kb && !p.s.kbImmune) { p.vx = sign(p.cx - srcX || 1) * kb; p.vy = -3.5; }
    if (p.s.swarmRetaliate) for (let i = 0; i < 3; i++) this.spawnProjectile('swarm_bee', p.cx, p.cy, rng.float(-4, 4), rng.float(-4, 0), 12, 1, 'player', { dmgType: 'summon' });
    if (p.life <= 0) this.killPlayer(cause);
  }

  killPlayer(cause) {
    const p = this.player;
    if (p.dead) return;
    p.dead = true; p.life = 0; p.hook = null;
    p.stats.deaths++;
    const boss = this.bosses.some((b) => !b.dead);
    p.respawn = boss ? 60 * 15 : 60 * 5;
    this.fx.burst(p.cx, p.cy, '#ff3355', 40, 4, false);
    this.audio.play('death');
    const lost = Math.floor(p.credits * (p.mode === 'soft' ? 0.5 : 1));
    if (lost > 0) { p.credits -= lost; this.dropCredits(p.cx, p.cy, lost); }
    if (p.mode === 'medium' || p.mode === 'hard') {
      for (let i = 0; i < p.inv.length; i++) if (p.inv[i]) { const s = p.inv[i]; const d = this.dropItem(p.cx, p.cy, s.k, s.n, s.p || false); if (d) d.delay = 120; p.inv[i] = null; }
    }
    if (p.mode === 'hard') { this.notify('Your synthetic consciousness has been erased.', '#ff3355'); if (this.ui) this.ui.hardcoreDeath(); return; }
    this.notify(p.name + ' was destroyed' + (cause ? ' by ' + cause : '') + '.', '#ff3355');
  }

  respawnPlayer() {
    const p = this.player, w = this.world;
    p.dead = false;
    p.life = p.s.maxLife; p.energy = p.s.maxEnergy;
    p.buffs.clear(); p.recalc();
    const sp = p.spawns[w.id];
    let sx = w.spawnX, sy = w.spawnY;
    if (sp && this.validSpawn(sp[0], sp[1])) { sx = sp[0]; sy = sp[1]; }
    else if (sp) { delete p.spawns[w.id]; this.notify('Your Rest Pod is missing or obstructed.', '#ffcc33'); }
    p.x = sx * TILE + 8 - p.w / 2; p.y = sy * TILE - p.h - 1; p.vx = p.vy = 0; p.fallStartY = p.y;
    if (rectSolid(w, p.x, p.y, p.w, p.h)) p.y = this.findStandY(sx) * TILE - p.h - 1;
    p.immune = 120;
    for (const b of this.bosses) if (!b.dead && !['core_warden'].includes(b.key)) {} // bosses chase as normal
  }

  validSpawn(x, y) {
    const w = this.world;
    for (let dx = -2; dx <= 2; dx++) if (w.get(x + dx, y) === T.rest_pod) return true;
    return false;
  }

  recall() {
    const p = this.player;
    this.fx.burst(p.cx, p.cy, '#2ef2ff', 30, 3);
    this.audio.play('summon');
    p.hook = null;
    const sp = p.spawns[this.world.id];
    let sx = this.world.spawnX, sy = this.world.spawnY;
    if (sp && this.validSpawn(sp[0], sp[1])) { sx = sp[0]; sy = sp[1]; }
    p.x = sx * TILE + 8 - p.w / 2; p.y = sy * TILE - p.h - 1; p.vx = p.vy = 0; p.fallStartY = p.y;
    if (rectSolid(this.world, p.x, p.y, p.w, p.h)) p.y = this.findStandY(sx) * TILE - p.h - 1;
    this.fx.burst(p.cx, p.cy, '#2ef2ff', 30, 3);
  }

  explode(x, y, ex, dmg, owner, src) {
    this.fx.burst(x, y, '#ffb12e', 30, 4);
    this.fx.burst(x, y, '#ff5a2a', 20, 2.5);
    this.fx.debris(x, y, '#555', 10);
    this.audio.play('explode');
    this.camShake = 10;
    if (owner === 'player') {
      for (const m of this.monsters) {
        if (m.dead) continue;
        const d = Math.hypot(m.cx - x, m.cy - y);
        if (d < ex.r + m.w / 2) this.damageMonster(m, dmg, 6, sign(m.cx - x) || 1, false, src);
        if (ex.pull && d < ex.r * 2 && !m.def.boss) { m.vx += (x - m.cx) / (d || 1) * 6; m.vy += (y - m.cy) / (d || 1) * 6; }
      }
      if (ex.tiles) {
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        for (let dy = -ex.tiles; dy <= ex.tiles; dy++) for (let dx = -ex.tiles; dx <= ex.tiles; dx++) {
          if (dx * dx + dy * dy > ex.tiles * ex.tiles + 1) continue;
          const t = TILES[this.world.get(tx + dx, ty + dy)];
          if (!t || t.tool === 'none' || t.minPick > 65 || t.hp >= 4 || t.container || t.interact) continue;
          if (t.biome === 'dungeon' && !this.world.flags.bosses.archon) continue;
          this.breakTile(tx + dx, ty + dy, true);
        }
      }
    } else {
      const p = this.player;
      if (Math.hypot(p.cx - x, p.cy - y) < ex.r + 10) this.hurtPlayer(dmg, x, 6, 'explosion');
    }
  }

  meleeHit(player, it, slot, x1, y1, x2, y2) {
    for (const m of this.monsters) {
      if (m.dead || m.def.friendly || player.swingHits.has(m.id)) continue;
      if (!segmentHitsRect(x1, y1, x2, y2, { x: m.x - 4, y: m.y - 4, w: m.w + 8, h: m.h + 8 })) continue;
      player.swingHits.add(m.id);
      const crit = rng.next() * 100 < player.itemCrit(slot);
      this.damageMonster(m, player.itemDamage(slot), player.itemKnock(slot), player.dir, crit, null);
      if (it.onHit && it.onHit.buff) m.buffs.set(it.onHit.buff, it.onHit.time);
    }
    // cut plants
    const tx = Math.floor(x2 / TILE), ty = Math.floor(y2 / TILE);
    const t = TILES[this.world.get(tx, ty)];
    if (t && t.cut) this.breakTile(tx, ty, true);
  }

  // ---------------- tiles: mining / placing ----------------
  toolTarget(p, it, tx, ty) {
    const w = this.world;
    const check = (x, y) => {
      if (!w.inb(x, y)) return null;
      const id = w.get(x, y), t = TILES[id];
      if (it.pick && id && !t.tree && t.tool !== 'none' && !(t.tool === 'hammer' && !it.hammer)) return { x, y, mode: 'tile' };
      if (it.axe && t && t.tree) return { x, y, mode: 'tree' };
      if (it.hammer && t && t.tool === 'hammer') return { x, y, mode: 'tile' };
      if (it.hammer && !it.pick && (!id || !t.solid) && !(t && (t.furn || t.tree)) && w.getWall(x, y)) return { x, y, mode: 'wall' };
      if (id && t && t.cut) return { x, y, mode: 'tile' };
      if (it.axe && !it.pick && id && t.furn && t.tool === 'any') return { x, y, mode: 'tile' };
      return null;
    };
    if (p.inReach(tx, ty, it)) { const r = check(tx, ty); if (r) return r; }
    // ray toward the target, nearest valid tile within reach
    const sx = p.cx / TILE, sy = p.cy / TILE;
    const dx = tx + 0.5 - sx, dy = ty + 0.5 - sy, d = Math.hypot(dx, dy);
    const steps = Math.ceil(d * 3);
    for (let i = 1; i <= steps; i++) {
      const x = Math.floor(sx + dx * i / steps), y = Math.floor(sy + dy * i / steps);
      if (!p.inReach(x, y, it)) break;
      const r = check(x, y);
      if (r) return r;
    }
    return null;
  }

  hitTile(p, it, x, y, mode) {
    const w = this.world;
    const key = y * w.w + x;
    const id = w.get(x, y), t = TILES[id];
    if (mode === 'wall') {
      const wl = WALLS[w.getWall(x, y)];
      if (wl && wl.unbreakableUntil && !w.flags.bosses.gravity_golem) { this.fx.text(x * TILE + 8, y * TILE, 'Too ancient to break', '#ffaa22'); return; }
      const e = this.tileDmg.get(key + 1e9) || { dmg: 0, t: 0 };
      e.dmg += it.hammer; e.t = this.tick;
      this.audio.play('dig');
      this.fx.debris(x * TILE + 8, y * TILE + 8, WALLS[w.getWall(x, y)].map, 2);
      if (e.dmg >= 70) { this.tileDmg.delete(key + 1e9); this.breakWall(x, y); }
      else this.tileDmg.set(key + 1e9, e);
      return;
    }
    if (!t) return;
    if (t.cut) { this.breakTile(x, y, true); return; }
    if (mode === 'tree') {
      // find the base of the tree
      let by = y;
      while (TILES[w.get(x, by + 1)]?.tree) by++;
      const k = by * w.w + x;
      const e = this.tileDmg.get(k) || { dmg: 0, t: 0 };
      e.dmg += it.axe; e.t = this.tick;
      this.audio.play('chop');
      this.fx.debris(x * TILE + 8, y * TILE + 8, t.tree.leaf, 3);
      if (e.dmg >= TREE_HP) { this.tileDmg.delete(k); this.fellTree(x, by); }
      else this.tileDmg.set(k, e);
      return;
    }
    const power = it.pick || it.hammer || 0;
    if (t.minPick > power) { if (this.tick % 20 === 0 || !this.tileDmg.has(key)) this.fx.text(x * TILE + 8, y * TILE, 'Needs ' + t.minPick + '% pick power', '#ffcc33'); this.tileDmg.set(key, { dmg: 0, t: this.tick }); return; }
    if (t.biome === 'dungeon' && !w.flags.bosses.archon && t.solid) { this.fx.text(x * TILE + 8, y * TILE, 'Protected by the Archon', '#66ccff'); return; }
    if (t.biome === 'temple' && !w.flags.bosses.gravity_golem) { this.fx.text(x * TILE + 8, y * TILE, 'Sealed until the Golem falls', '#ffaa22'); return; }
    const e = this.tileDmg.get(key) || { dmg: 0, t: 0 };
    e.dmg += t.furn || t.platform || !t.solid ? 100 : power;
    e.t = this.tick;
    this.audio.play('dig');
    this.fx.debris(x * TILE + 8, y * TILE + 8, t.map, 2);
    if (e.dmg >= 100 * t.hp) { this.tileDmg.delete(key); this.breakTile(x, y, true); p.stats.mined++; }
    else this.tileDmg.set(key, e);
  }

  breakWall(x, y) {
    const w = this.world;
    const wl = WALLS[w.getWall(x, y)];
    if (!wl) return;
    w.setWall(x, y, 0);
    if (wl.drop && ITEMS[wl.drop]) this.dropItem(x * TILE + 8, y * TILE + 8, wl.drop, 1, false);
    this.audio.play('break');
  }

  fellTree(x, by) {
    const w = this.world;
    const t = TILES[w.get(x, by)];
    let n = 0, y = by;
    while (TILES[w.get(x, y)]?.tree) {
      const d = w.data[y * w.w + x];
      w.set(x, y, 0);
      n += 1 + ((d & 1) ? 1 : 0) + ((d & 2) ? 1 : 0);
      if (d & 4) { n += 3; this.fx.burst(x * TILE + 8, y * TILE, t.tree.leaf, 20, 3, false); if (this.rng.chance(0.4)) this.dropItem(x * TILE + 8, y * TILE + 8, 'seed_pod', this.rng.int(1, 2)); }
      y--;
    }
    this.dropItem(x * TILE + 8, by * TILE, t.drop, n + this.rng.int(0, 2), false);
    this.audio.play('break');
    // re-plant a stump-less spot: nothing
  }

  // Removes a tile and its dependents. Returns true if something was removed.
  breakTile(x, y, drop) {
    const w = this.world;
    const id = w.get(x, y);
    if (!id) return false;
    const t = TILES[id];
    if (t.tree) { let by = y; while (TILES[w.get(x, by + 1)]?.tree) by++; this.fellTree(x, by); return true; }
    if (t.furn) {
      const [ox, oy] = w.removeFurniture(x, y);
      const cx = (ox + t.furn.w / 2) * TILE, cy = (oy + t.furn.h / 2) * TILE;
      if (t.container) {
        const key = w.idx(ox, oy), ch = w.chests.get(key);
        if (ch) { for (const s of ch.items) if (s) this.dropItem(cx, cy, s.k, s.n, s.p || false); if (ch.credits) this.dropCredits(cx, cy, ch.credits); w.chests.delete(key); }
        if (this.openChest === key) this.closeChest();
      }
      if (t.smash) this.smash(t, ox, oy, cx, cy);
      else if (drop && t.drop && ITEMS[t.drop]) this.dropItem(cx, cy, t.drop, 1, false);
      this.audio.play('break');
      this.fx.debris(cx, cy, t.map, 8);
      this.checkSupport(ox, oy, t.furn.w, t.furn.h);
      return true;
    }
    w.set(x, y, 0);
    if (drop && t.cut && t.key.startsWith('tallgrass') && this.rng.chance(0.04)) this.dropItem(x * TILE + 8, y * TILE + 8, 'bio_worm', 1);
    if (drop && t.key === 'herb_glowcap' && this.rng.chance(0.3)) this.dropItem(x * TILE + 8, y * TILE + 8, 'glow_grub', 1);
    if (drop && t.key === 'swarmcomb' && this.rng.chance(0.05)) this.dropItem(x * TILE + 8, y * TILE + 8, 'nano_larva', 1);
    if (drop && t.drop && ITEMS[t.drop] && (!t.dropChance || this.rng.chance(t.dropChance))) this.dropItem(x * TILE + 8, y * TILE + 8, t.drop, 1, false);
    if (t.solid) this.audio.play('break');
    this.fx.debris(x * TILE + 8, y * TILE + 8, t.map, 5);
    this.checkSupport(x, y, 1, 1);
    return true;
  }

  // After removing tiles in a rect, break things that depended on them.
  checkSupport(x0, y0, wd, ht) {
    const w = this.world;
    for (let x = x0 - 1; x <= x0 + wd; x++) for (let y = y0 - 1; y <= y0 + ht; y++) {
      const id = w.get(x, y);
      if (!id) continue;
      const t = TILES[id];
      if (t.mount === 'any' && !this.torchSupported(x, y)) this.breakTile(x, y, true);
      else if ((t.cut || t.key === 'sapling') && !w.solidAt(x, y + 1)) this.breakTile(x, y, true);
      else if (t.tree && !TILES[w.get(x, y + 1)]?.tree && !w.solidAt(x, y + 1)) this.breakTile(x, y, true);
      else if (t.furn && (t.furn.anchor === 'floor')) {
        const [ox, oy] = w.origin(x, y);
        let ok = false;
        for (let dx = 0; dx < t.furn.w; dx++) if (w.solidAt(ox + dx, oy + t.furn.h) || w.platformAt(ox + dx, oy + t.furn.h) || TILES[w.get(ox + dx, oy + t.furn.h)]?.table) ok = true;
        if (!ok && !t.smash && !t.interact) this.breakTile(x, y, true);
      } else if (t.door) {
        const [ox, oy] = w.origin(x, y);
        if (!w.solidAt(ox, oy - 1) && !w.solidAt(ox, oy + 3)) this.breakTile(x, y, true);
      } else if (t.climb && !w.solidAt(x, y - 1) && !TILES[w.get(x, y - 1)]?.climb && !w.solidAt(x - 1, y) && !w.solidAt(x + 1, y)) this.breakTile(x, y, true);
    }
  }

  torchSupported(x, y) {
    const w = this.world;
    return w.solidAt(x, y + 1) || w.solidAt(x - 1, y) || w.solidAt(x + 1, y) || w.getWall(x, y) > 0;
  }

  smash(t, ox, oy, cx, cy) {
    const w = this.world;
    const depth = clamp((oy - w.layers.surface) / (w.h - w.layers.surface), 0, 1);
    switch (t.key) {
      case 'vital_core': this.dropItem(cx, cy, 'vital_core', 1); break;
      case 'blight_node': {
        w.flags.nodesSmashed = (w.flags.nodesSmashed || 0) + 1;
        const loot = this.rng.pick(['grav_flail', 'void_lance', 'blight_reaper', 'demo_charge', 'plasma_round']);
        this.dropItem(cx, cy, loot, loot === 'demo_charge' ? 10 : loot === 'plasma_round' ? 100 : 1);
        this.dropCredits(cx, cy, 1000);
        const n = w.flags.nodesSmashed;
        if (n % 3 === 0) { this.notify('A horrible chill goes down your spine...', '#b06bff'); setTimeout(() => summonBoss(this, 'data_wyrm'), 0); }
        else if (n === 1) { this.notify('A data packet streaks across the sky... (an Orbital Drop may land tonight)', '#ff6a3d'); w.flags.meteorPending = true; }
        else this.notify('Something stirs in the Blight...', '#b06bff');
        break;
      }
      case 'hive_pod': this.notify('The hive trembles!', '#ffcc33'); summonBoss(this, 'swarm_mother'); break;
      case 'bloom_bulb': summonBoss(this, 'bloom_titan'); break;
      default: {
        const kind = t.key === 'canister_core' ? 'core' : 'cave';
        const loot = canisterLoot(kind, depth, this.rng, w.flags.hardmode);
        for (const [k, n] of loot.items) this.dropItem(cx, cy, k, n);
        if (loot.credits) this.dropCredits(cx, cy, loot.credits);
      }
    }
  }

  pickPlaceTarget(p, it, tx, ty, solidTarget = false) {
    if (p.inReach(tx, ty, it)) return { x: tx, y: ty };
    return null;
  }

  canPlaceBlockAt(x, y, it) {
    const w = this.world;
    if (!w.inb(x, y)) return false;
    const cur = w.get(x, y);
    if (cur && !TILES[cur].cut) return false;
    const t = TILES[T[it.place]];
    if (t.solid && !t.platform) {
      const r = { x: x * TILE, y: y * TILE, w: TILE, h: TILE };
      if (rectsOverlap(r, this.player)) return false;
      for (const m of this.monsters) if (rectsOverlap(r, m) && !m.def.boss) return false;
    }
    if (t.mount === 'any') return this.torchSupported(x, y);
    if (t.key === 'sapling') return (it.plantOn || []).some((k) => w.get(x, y + 1) === T[k]);
    if (t.climb) return w.solidAt(x, y - 1) || !!TILES[w.get(x, y - 1)]?.climb || w.solidAt(x - 1, y) || w.solidAt(x + 1, y);
    // needs a neighbor
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of nb) { const n = w.get(x + dx, y + dy); if (n && (TILES[n].solid || TILES[n].platform)) return true; }
    if (w.getWall(x, y)) return true;
    if (w.liq[y * w.w + x] > 0) return true;
    return false;
  }

  placeTile(p, it, tx, ty) {
    const w = this.world;
    const id = T[it.place];
    const t = TILES[id];
    if (t.furn) return this.placeFurniture(p, it, tx, ty);
    let x = tx, y = ty;
    if (!p.inReach(x, y, it) || !this.canPlaceBlockAt(x, y, it)) return false;
    if (w.get(x, y)) this.breakTile(x, y, true);
    w.set(x, y, id, 0);
    if (it.place === 'cable') {
      // cables extend down from the bottom of an existing cable
    }
    this.fx.debris(x * TILE + 8, y * TILE + 8, t.map, 2);
    return true;
  }

  placeFurniture(p, it, tx, ty) {
    const w = this.world;
    const id = T[it.place], t = TILES[id], f = t.furn;
    const ox = tx - Math.floor((f.w - 1) / 2), oy = ty - (f.h - 1);
    if (!p.inReach(tx, ty, it)) return false;
    for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) {
      const c = w.get(ox + dx, oy + dy);
      if (!w.inb(ox + dx, oy + dy) || (c && !TILES[c].cut) || w.liq[(oy + dy) * w.w + ox + dx] > 100 && !t.door) return false;
    }
    if (f.anchor === 'door') {
      if (!w.solidAt(ox, oy - 1) || !w.solidAt(ox, oy + f.h)) return false;
      if (rectsOverlap({ x: ox * TILE, y: oy * TILE, w: TILE, h: f.h * TILE }, p)) return false;
    } else {
      for (let dx = 0; dx < f.w; dx++) {
        const below = w.get(ox + dx, oy + f.h);
        if (!(w.solidAt(ox + dx, oy + f.h) || w.platformAt(ox + dx, oy + f.h) || (TILES[below] && TILES[below].table && f.w === 1))) return false;
      }
    }
    for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) if (w.get(ox + dx, oy + dy)) w.set(ox + dx, oy + dy, 0);
    w.placeFurniture(ox, oy, id);
    return true;
  }

  placeWall(p, it, tx, ty) {
    const w = this.world;
    if (!p.inReach(tx, ty, it) || !w.inb(tx, ty)) return false;
    if (w.getWall(tx, ty)) return false;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let ok = false;
    for (const [dx, dy] of nb) if (w.getWall(tx + dx, ty + dy) || w.solidAt(tx + dx, ty + dy)) ok = true;
    if (!ok) return false;
    w.setWall(tx, ty, W[it.placeWall]);
    return true;
  }

  convertArea(cx, cy, r, mode) {
    const w = this.world, map = CONVERT[mode];
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      const id = w.get(x, y), to = map.get(id);
      if (to) w.set(x, y, to, w.data[y * w.w + x]);
      const wl = w.getWall(x, y);
      if (mode === 'pure' && (wl === W.blight_wall || wl === W.prism_wall)) w.setWall(x, y, W.ferrocrete_wall);
    }
  }

  // ---------------- consumables ----------------
  consume(p, it) {
    const c = it.consume;
    if (!c) return false;
    if (c.heal) {
      if (p.buffs.has('potion_sick')) return false;
      if (p.life >= p.s.maxLife && !c.energy) return false;
      p.life = Math.min(p.s.maxLife, p.life + c.heal);
      p.addBuff('potion_sick', Math.round(c.sick * 60 * (1 + p.s.stimCooldown)));
      this.fx.text(p.cx, p.y - 6, '+' + c.heal, '#3dff6a'); this.audio.play('heal');
    }
    if (c.energy) {
      if (p.energy >= p.s.maxEnergy && !c.heal) return false;
      p.energy = Math.min(p.s.maxEnergy, p.energy + c.energy);
      this.fx.text(p.cx, p.y - 6, '+' + c.energy, '#a46bff'); this.audio.play('heal');
    }
    if (c.buff) { p.addBuff(c.buff, c.time); p.recalc(); this.audio.play('heal'); }
    if (c.maxLife) {
      if (c.needs && p.maxLife < c.needs) { this.notify('Requires 400 max integrity first.', '#ffcc33'); return false; }
      if (p.maxLife >= c.cap) return false;
      p.maxLife = Math.min(c.cap, p.maxLife + c.maxLife); p.life += c.maxLife; p.recalc();
      this.audio.play('levelup'); this.fx.burst(p.cx, p.cy, '#ff3355', 24, 3);
      this.notify('Max integrity increased to ' + p.maxLife, '#ff5a8a');
    }
    if (c.maxEnergy) {
      if (p.maxEnergy >= c.cap) return false;
      p.maxEnergy = Math.min(c.cap, p.maxEnergy + c.maxEnergy); p.recalc();
      this.audio.play('levelup'); this.fx.burst(p.cx, p.cy, '#a46bff', 24, 3);
    }
    if (c.accSlot) { if (p.accSlots >= 6) return false; p.accSlots = 6; this.notify('Accessory slot unlocked!', '#d0a0ff'); this.audio.play('levelup'); }
    if (c.recall) this.recall();
    if (c.crate) openCrate(this, c.crate);
    if (c.summon) return this.useSummon(c.summon);
    return true;
  }

  useSummon(key) {
    const w = this.world;
    if (key.startsWith('invasion_') || key.startsWith('event_')) return this.events.trigger(key);
    if (this.bosses.some((b) => !b.dead && (b.key === key || (key === 'twin_lancers' && b.key.startsWith('twin'))))) return false;
    const info = BOSS_INFO[key] || {};
    if (info.night && w.isDay()) { this.notify('It can only be summoned at night.', '#ffcc33'); return false; }
    if (info.biome && this.biome !== info.biome && !(info.biome === 'core' && this.layer === 'core')) { this.notify('This must be used in the ' + ({ blight: 'Blight', jungle: 'Overgrowth', core: 'Reactor Core' }[info.biome]) + '.', '#ffcc33'); return false; }
    if (key === 'gravity_golem') {
      const t = w.temple;
      if (!t || Math.hypot(this.player.cx / TILE - t.altar[0], this.player.cy / TILE - t.altar[1]) > 12) { this.notify('Use it at the Ancient Altar.', '#ffcc33'); return false; }
    }
    return !!summonBoss(this, key);
  }

  autoEnergy(p) {
    return false;
  }

  // ---------------- interactions ----------------
  tryInteract(wx, wy) {
    const w = this.world, p = this.player;
    // town npcs
    for (const n of this.town.npcs) {
      if (wx >= n.x - 6 && wx <= n.x + n.w + 6 && wy >= n.y - 6 && wy <= n.y + n.h + 6 && Math.hypot(n.cx - p.cx, n.cy - p.cy) < 7 * TILE) {
        if (this.ui) this.ui.openNpc(n);
        return true;
      }
    }
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const t = TILES[w.get(tx, ty)];
    if (!t || !t.interact) return false;
    if (!p.inReach(tx, ty, null)) return false;
    const [ox, oy] = w.origin(tx, ty);
    switch (t.interact) {
      case 'door': {
        if (t.locked && !w.flags.templeOpen) {
          if (p.inv.some((s) => s && s.k === t.locked)) { const i = p.inv.findIndex((s) => s && s.k === t.locked); p.inv[i].n--; if (p.inv[i].n <= 0) p.inv[i] = null; w.flags.templeOpen = true; this.notify('The Ancient Door unlocks.', '#ffaa22'); }
          else { this.notify('It is locked. (' + ITEMS[t.locked].name + ')', '#ffaa22'); return true; }
        }
        const open = (w.data[w.idx(ox, oy)] & DOOR_OPEN) === 0;
        if (!open) {
          // closing: make sure nothing is inside
          if (rectsOverlap({ x: ox * TILE, y: oy * TILE, w: TILE, h: 3 * TILE }, p)) return true;
        }
        for (let dy = 0; dy < 3; dy++) { const i = w.idx(ox, oy + dy); w.data[i] = open ? (w.data[i] | DOOR_OPEN) : (w.data[i] & ~DOOR_OPEN); }
        this.audio.play('door');
        for (const l of w.listeners) l(ox, oy);
        return true;
      }
      case 'chest': {
        const key = w.idx(ox, oy), ch = w.chests.get(key);
        if (!ch) return true;
        if (ch.locked) {
          const i = p.inv.findIndex((s) => s && s.k === ch.locked);
          if (ch.locked === 'access_key' && !w.flags.bosses.archon) { this.notify('Locked. Defeat the Archon first.', '#66ccff'); return true; }
          if (ch.locked === 'core_key' && !w.flags.bosses.archon) { this.notify('Locked. Defeat the Archon first.', '#66ccff'); return true; }
          if (i < 0) { this.notify('Locked. Requires ' + ITEMS[ch.locked].name + '.', '#ffcc33'); return true; }
          if (ch.locked !== 'core_key') { p.inv[i].n--; if (p.inv[i].n <= 0) p.inv[i] = null; }
          ch.locked = null; this.notify('Unlocked!', '#ffcc33');
        }
        if (ch.credits) { this.dropCredits(p.cx, p.cy, ch.credits); ch.credits = 0; }
        this.openChest = key; this.openChestPos = [ox, oy];
        this.audio.play('chest');
        if (this.ui) this.ui.openChest(ch);
        return true;
      }
      case 'bed': {
        p.spawns[w.id] = [ox + 1, oy + 2];
        this.notify('Respawn point set.', '#2ef2ff');
        this.audio.play('ui');
        return true;
      }
      case 'archon': {
        if (w.flags.bosses.archon) { this.notify('The terminal is silent now.', '#66ccff'); return true; }
        if (w.isDay()) { this.notify('ARCHON TERMINAL: "Return when the lights go out."', '#66ccff'); return true; }
        if (this.bosses.some((b) => !b.dead && b.key === 'archon')) return true;
        summonBoss(this, 'archon');
        return true;
      }
      case 'altar': {
        const i = p.inv.findIndex((s) => s && s.k === 'power_cell');
        if (i < 0) { this.notify('The altar needs a Power Cell.', '#ffaa22'); return true; }
        if (this.bosses.some((b) => !b.dead)) return true;
        p.inv[i].n--; if (p.inv[i].n <= 0) p.inv[i] = null;
        summonBoss(this, 'gravity_golem');
        return true;
      }
    }
    return false;
  }

  chestRangeCheck() {
    if (this.openChest === null || !this.openChestPos) return;
    const p = this.player;
    const [ox, oy] = this.openChestPos;
    if (Math.abs(p.cx / TILE - ox) > 8 || Math.abs(p.cy / TILE - oy) > 7 || !this.world.chests.has(this.openChest)) this.closeChest();
  }
  closeChest() { this.openChest = null; this.openChestPos = null; if (this.ui) this.ui.closeChest(); }

  checkAchievements() {
    const p = this.player;
    for (const a of ACHIEVEMENTS) {
      if (p.achievements.has(a.key)) continue;
      let ok = false;
      try { ok = a.check(this); } catch (e) { ok = false; }
      if (ok) { p.achievements.add(a.key); this.notify('Achievement: ' + a.name, '#ffcc33'); this.audio.play('levelup'); }
    }
  }

  onPickup(k) { if (this.ui) this.ui.dirtyInv = true; this.town.onPickup(k); }

  nearbyStations() {
    const w = this.world, p = this.player;
    const tx = Math.floor(p.cx / TILE), ty = Math.floor(p.cy / TILE);
    const s = new Set();
    for (let y = ty - 4; y <= ty + 4; y++) for (let x = tx - 5; x <= tx + 5; x++) {
      const t = TILES[w.get(x, y)];
      if (t && t.station) s.add(t.station);
    }
    return s;
  }
}
