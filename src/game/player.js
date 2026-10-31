// The player: stats, movement (jumps, flight, hooks, swimming), item use, building and mining.
import { TILE, clamp, sign, rng } from '../core/util.js';
import { ITEMS, ARMOR_SETS, DEFAULT_START } from '../content/items.js';
import { TILES, T, W, SOLID } from '../content/tiles.js';
import { BUFFS } from '../content/buffs.js';
import { PREFIXES } from '../content/prefixes.js';
import { moveEntity, liquidAt, rectSolid } from './physics.js';
import { addItem, removeItem, countItem, INV_SIZE } from './inventory.js';
import { LIQ, DOOR_OPEN } from '../world/world.js';
import { findBait, reelIn, fishingPower } from './fishing.js';
import { VEHICLES, IMPLANT_SLOTS } from '../content/items.js';
import { updateVehicle } from './vehicles.js';
import { tickImplants, MANTIS, mantisDamage } from './implants.js';
import { updateTech, checkPortals } from './tech.js';

export const PLAYER_W = 20, PLAYER_H = 42;

export function newPlayerData(name, look, mode) {
  const inv = new Array(INV_SIZE).fill(null);
  for (const [k, n] of DEFAULT_START) addItem(inv, k, n);
  return {
    name, look, mode: mode || 'soft', inv, trash: null,
    equip: { head: null, body: null, legs: null, acc: [null, null, null, null, null, null], hook: null },
    maxLife: 100, maxEnergy: 20, life: 100, energy: 20, credits: 0, accSlots: 5,
    discovered: DEFAULT_START.map(([k]) => k), spawns: {}, portals: {}, lore: [], playTime: 0, created: Date.now(), id: null,
    stats: { kills: 0, deaths: 0, bosses: 0, crafted: 0, mined: 0 },
  };
}

export class Player {
  constructor(data) {
    this.data = data;
    Object.assign(this, data);
    if (!this.equip.implants) this.equip.implants = {};
    if (this.equip.vehicle === undefined) this.equip.vehicle = null;
    this.vehicle = null; this.augCd = 0; this.reviveCd = 0; this.mantisBase = 18;
    if (!this.portals) this.portals = {};
    if (!this.lore) this.lore = [];
    this.techCd = 0; this.techHeld = false; this.charge = 0; this.grabbed = null; this.portalCd = 0; this.techFx = null;
    this.discovered = new Set(data.discovered);
    this.achievements = new Set(data.achievements || []);
    this.x = 0; this.y = 0; this.w = PLAYER_W; this.h = PLAYER_H; this.vx = 0; this.vy = 0;
    this.dir = 1; this.onGround = false; this.anim = 0;
    this.sel = 0;
    this.useTimer = 0; this.useTotal = 0; this.useKey = null; this.swingHits = new Set(); this.useAngle = 0; this.aimX = 0; this.aimY = 0;
    this.jumpTimer = 0; this.jumpsUsed = 0; this.flightTime = 0; this.rocketTime = 0; this.coyote = 0; this.flying = false;
    this.immune = 0; this.dead = false; this.respawn = 0;
    this.fallStartY = 0; this.buffs = new Map(); this.s = null;
    this.hook = null; this.dashCd = 0; this.climbing = false; this.inLiquid = -1; this.plasmaWardTime = 0;
    this.regenTimer = 0; this.hurtTimer = 0; this.holdTime = 0;
    this.recalc();
  }

  serialize() {
    const d = this.data;
    for (const k of ['name', 'look', 'mode', 'inv', 'trash', 'equip', 'maxLife', 'maxEnergy', 'life', 'energy', 'credits', 'accSlots', 'spawns', 'portals', 'lore', 'playTime', 'created', 'id', 'stats']) d[k] = this[k];
    d.discovered = [...this.discovered];
    d.achievements = [...this.achievements];
    return d;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  heldSlot() { return this.inv[this.sel]; }
  held() { const s = this.inv[this.sel]; return s ? ITEMS[s.k] : null; }

  addBuff(k, ticks) {
    const s = this.s;
    if (k === 'burn' && (s.burnImmune || s.plasmaImmune)) return;
    if (k === 'chill' && s.coldImmune) return;
    this.buffs.set(k, Math.max(this.buffs.get(k) || 0, ticks));
  }

  recalc() {
    const s = {
      defense: 0, allDmg: 0, meleeDmg: 0, rangedDmg: 0, energyDmg: 0, summonDmg: 0, crit: 0, meleeSpeed: 0, moveSpeed: 0, runSpeed: 0,
      jumpBoost: 1, doubleJump: 0, flight: 0, flightSpeed: 0, rocket: 0, noFall: 0, kbImmune: 0, lifeRegen: 0, energyRegen: 0,
      maxLife: this.maxLife, maxEnergy: this.maxEnergy, energyCost: 0, minions: 1, mineSpeed: 0, reach: 0, magnet: 0, light: 0, dash: 0,
      wallClimb: 0, waterWalk: 0, swim: 0, plasmaImmune: 0, coldImmune: 0, burnImmune: 0, thorns: 0, lifesteal: 0, dodge: 0, damageReduce: 0,
      maxLifePct: 0, nightVision: 0, featherFall: 0, scanner: 0, hunter: 0, placeSpeed: 0, spawnRate: 0, immuneTime: 0, berserk: 0,
      stimCooldown: 0, plasmaWard: 0, fishingPower: 0, baitSave: 0, sonar: 0, zoomOut: 0, stomp: 0, swarmRetaliate: 0, meleeKnock: 0, plasmaResist: 0, info: new Set(), setBonus: null, noRegen: false,
    };
    const addStats = (st) => {
      if (!st) return;
      for (const k in st) {
        if (k.startsWith('info_')) { s.info.add(k.slice(5)); continue; }
        if (k === 'jumpBoost') s.jumpBoost = Math.max(s.jumpBoost, st[k]) + (s.jumpBoost > 1 && st[k] > 1 ? 0.1 : 0);
        else if (k === 'flight') { s.flight = Math.max(s.flight, st[k]); }
        else if (k === 'flightSpeed') s.flightSpeed = Math.max(s.flightSpeed, st[k]);
        else if (k === 'rocket') s.rocket = Math.max(s.rocket, st[k]);
        else if (k === 'runSpeed') s.runSpeed = Math.max(s.runSpeed, st[k]);
        else s[k] = (s[k] || 0) + st[k];
      }
    };
    const eq = this.equip;
    const sets = [];
    for (const slot of ['head', 'body', 'legs']) {
      const it = eq[slot] && ITEMS[eq[slot].k];
      if (!it) continue;
      s.defense += it.defense || 0;
      addStats(it.stats);
      sets.push(it.set);
    }
    if (sets.length === 3 && sets[0] === sets[1] && sets[1] === sets[2]) { s.setBonus = sets[0]; addStats(ARMOR_SETS[sets[0]].bonus); }
    for (let i = 0; i < this.accSlots; i++) {
      const a = eq.acc[i];
      if (!a) continue;
      addStats(ITEMS[a.k].stats);
      if (a.p) {
        const p = PREFIXES[a.p];
        if (p) { s.defense += p.def || 0; s.crit += p.crit || 0; s.allDmg += p.dmg || 0; s.moveSpeed += p.move || 0; s.maxEnergy += p.energy || 0; }
      }
    }
    for (const sl of IMPLANT_SLOTS) { const im = eq.implants[sl]; if (im && ITEMS[im.k]) addStats(ITEMS[im.k].stats); }
    if (this.vehicle) addStats(VEHICLES[this.vehicle.key].stats);
    for (const [k] of this.buffs) {
      const b = BUFFS[k];
      if (!b) continue;
      addStats(b.stats);
      if (b.noRegen) s.noRegen = true;
    }
    s.maxLife = Math.round(s.maxLife * (1 + s.maxLifePct));
    this.s = s;
    if (this.life > s.maxLife) this.life = s.maxLife;
    if (this.energy > s.maxEnergy) this.energy = s.maxEnergy;
  }

  dmgMult(type) {
    const s = this.s;
    let m = 1 + s.allDmg + (type === 'melee' ? s.meleeDmg : type === 'ranged' ? s.rangedDmg : type === 'energy' ? s.energyDmg : type === 'summon' ? s.summonDmg : 0);
    if (s.berserk) m += (1 - this.life / s.maxLife) * 0.3;
    return m;
  }

  itemDamage(slot) {
    const it = ITEMS[slot.k];
    const p = slot.p ? PREFIXES[slot.p] : null;
    if (slot.k === MANTIS) return Math.round(this.mantisBase * this.dmgMult('melee'));
    return Math.round(it.damage * (1 + (p ? p.dmg || 0 : 0)) * this.dmgMult(it.dmgType));
  }
  itemCrit(slot) {
    const it = ITEMS[slot.k];
    const p = slot.p ? PREFIXES[slot.p] : null;
    return 4 + (it.crit || 0) + this.s.crit + (p ? p.crit || 0 : 0);
  }
  itemUseTime(slot) {
    const it = ITEMS[slot.k];
    const p = slot.p ? PREFIXES[slot.p] : null;
    let speed = 1 + (p ? p.speed || 0 : 0);
    if (it.dmgType === 'melee' && it.type === 'weapon') speed += this.s.meleeSpeed;
    if (it.pick || it.axe) speed += this.s.mineSpeed;
    if (it.type === 'block' || it.type === 'wall' || it.type === 'furniture') speed += this.s.placeSpeed;
    return Math.max(3, Math.round(it.useTime / speed));
  }
  itemKnock(slot) {
    const it = ITEMS[slot.k];
    const p = slot.p ? PREFIXES[slot.p] : null;
    return (it.knock || 0) * (1 + (p ? p.kb || 0 : 0)) * (it.dmgType === 'melee' && this.s.meleeKnock ? 1.5 : 1);
  }

  reachTiles(it) { return 5 + (it && it.reach || 0) + this.s.reach; }
  inReach(tx, ty, it) {
    const r = this.reachTiles(it);
    const ptx = this.cx / TILE, pty = this.cy / TILE;
    return Math.abs(tx + 0.5 - ptx) <= r + 1 && Math.abs(ty + 0.5 - pty) <= r;
  }

  // ---------------- update ----------------
  update(game, inp, aim, useHeld) {
    const world = game.world;
    if (this.dead) {
      this.respawn--;
      if (this.respawn <= 0) game.respawnPlayer();
      return;
    }
    // buffs tick
    let changed = false;
    for (const [k, t] of this.buffs) {
      if (t <= 1) { this.buffs.delete(k); changed = true; } else this.buffs.set(k, t - 1);
      const b = BUFFS[k];
      if (b && b.dot && game.tick % 30 === 0) {
        let dot = b.dot;
        if (k === 'burn' && this.s.plasmaResist) dot *= 0.5;
        this.life -= dot / 2;
        game.fx.text(this.cx, this.y, Math.round(dot / 2), '#ff8a3d');
        if (this.life <= 0) game.killPlayer(BUFFS[k].name);
      }
    }
    if (changed || game.tick % 30 === 0) this.recalc();
    const s = this.s;
    this.playTime++;

    // regen
    this.regenTimer++;
    if (!s.noRegen && !this.buffs.has('burn') && !this.buffs.has('poison')) {
      const still = Math.abs(this.vx) < 0.1 ? 2 : 1;
      const base = this.hurtTimer > 0 ? 0 : (0.5 + this.s.maxLife / 400) * still;
      const regen = base + s.lifeRegen;
      if (this.regenTimer % 30 === 0 && this.life < s.maxLife) this.life = Math.min(s.maxLife, this.life + regen / 2);
    }
    if (this.hurtTimer > 0) this.hurtTimer--;
    const eRegen = this.useTimer > 0 ? 0 : 0.18 + s.energyRegen * 0.04 + s.maxEnergy * 0.0015;
    this.energy = Math.min(s.maxEnergy, this.energy + eRegen);

    if (this.immune > 0) this.immune--;
    if (this.dashCd > 0) this.dashCd--;
    this.mantisBase = mantisDamage(game);
    tickImplants(game, this);
    checkPortals(game, this);

    if (this.vehicle) {
      this.aimX = aim.x; this.aimY = aim.y;
      const handled = updateVehicle(game, this, inp, aim, useHeld);
      if (!handled) this.updateUse(game, useHeld, aim);
      else if (this.useTimer > 0) this.useTimer--;
      return;
    }

    // ---------- movement ----------
    const liquid = liquidAt(world, this);
    this.inLiquid = liquid;
    const inWater = liquid === LIQ.water || liquid === LIQ.gel;
    const space = this.y / TILE < world.layers.space;
    let grav = space ? 0.18 : 0.4;
    let maxFall = 10;
    let maxRun = (3 + s.runSpeed) * (1 + s.moveSpeed);
    if (maxRun < 0.8) maxRun = 0.8;
    let accel = this.onGround ? 0.22 : 0.14;
    if (inWater && !s.swim) { grav = 0.15; maxFall = 3.5; maxRun *= liquid === LIQ.gel ? 0.35 : 0.55; }
    if (liquid === LIQ.plasma) { grav = 0.2; maxFall = 3; maxRun *= 0.5; }
    if (s.featherFall && !inp.down) maxFall = 2.4;
    // Gravity Golem shifts gravity: heavy (short jumps, hard falls) or nearly weightless
    const gf = game.gravField && game.tick <= game.gravField.until ? game.gravField.mul : 1;
    grav *= gf; if (gf > 1) maxFall *= 1.3;

    const mx = this.buffs.has('glitch') ? -inp.mx : inp.mx;
    if (mx !== 0) {
      if (sign(mx) !== sign(this.vx) && this.onGround) this.vx *= 0.7;
      this.vx += mx * accel * (sign(mx) === sign(this.vx) ? 1 : 1.6);
      const cap = maxRun * Math.abs(mx);
      if (Math.abs(this.vx) > cap) this.vx = sign(this.vx) * Math.max(cap, Math.abs(this.vx) - 0.25);
      if (this.useTimer === 0 || !this.useKey) this.dir = sign(mx);
    } else {
      const f = this.onGround ? 0.72 : 0.96;
      this.vx *= f;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }

    // climbing cables
    const ctx0 = Math.floor(this.cx / TILE), cty = Math.floor(this.cy / TILE);
    const onCable = TILES[world.get(ctx0, cty)]?.climb || TILES[world.get(ctx0, Math.floor((this.y + 4) / TILE))]?.climb;
    if (onCable && (inp.up || inp.down) && !this.hook) this.climbing = true;
    if (!onCable || inp.jumpPressed) this.climbing = false;

    if (this.onGround) { this.coyote = 6; this.jumpsUsed = 0; this.flightTime = s.flight; this.rocketTime = s.rocket; }
    else if (this.coyote > 0) this.coyote--;

    // jumping
    const jumpSpeed = 5.1;
    const holdTicks = Math.round(15 * s.jumpBoost);
    this.flying = false;
    if (this.climbing) {
      this.vy = inp.up ? -3 : inp.down ? 3 : 0;
      this.vx *= 0.5;
      this.x += ((ctx0 * TILE + TILE / 2) - this.cx) * 0.3;
    } else if (this.hook && this.hook.attached) {
      // hanging / pulling
    } else {
      if (inp.jumpPressed) {
        if (this.coyote > 0 || (inWater && !this.onGround)) {
          this.vy = inWater ? -4.2 : -jumpSpeed * (gf > 1 ? 0.8 : 1); this.jumpTimer = inWater ? 6 : holdTicks; this.coyote = 0;
          game.audio.play('jump');
        } else if (s.wallClimb && this.hitWallDir) {
          this.vy = -jumpSpeed; this.vx = -this.hitWallDir * 5; this.jumpTimer = holdTicks; this.dir = -this.hitWallDir;
          game.audio.play('jump');
        } else if (this.jumpsUsed < s.doubleJump) {
          this.jumpsUsed++; this.vy = -jumpSpeed * 0.95; this.jumpTimer = Math.round(holdTicks * 0.8);
          game.fx.burst(this.cx, this.y + this.h, '#e8f6ff', 10, 2);
          game.audio.play('jump2');
        }
      }
      if (inp.jump && this.jumpTimer > 0) { this.vy = Math.min(this.vy, -jumpSpeed * (inWater ? 0.8 : gf > 1 ? 0.8 : 1)); this.jumpTimer--; }
      else if (!inp.jump) this.jumpTimer = 0;
      if (inp.jump && this.jumpTimer === 0 && !this.onGround && this.coyote === 0) {
        if (s.flight && this.flightTime > 0) {
          this.flying = true; this.flightTime--;
          this.vy = Math.max(this.vy - 0.6, -(s.flightSpeed || 6));
          if (game.tick % 3 === 0) game.fx.spark(this.cx - this.dir * 6, this.y + 30, '#ffb12e');
        } else if (s.rocket && this.rocketTime > 0) {
          this.flying = true; this.rocketTime--;
          this.vy = Math.max(this.vy - 0.5, -4.5);
          if (game.tick % 2 === 0) game.fx.spark(this.cx, this.y + this.h, '#ff6a3d');
        }
      }
      if (inWater && s.swim && inp.jump) this.vy = Math.max(this.vy - 0.5, -4);
      this.vy = Math.min(this.vy + grav, maxFall);
      // glide with wings when holding jump and falling
      if (inp.jump && s.flight && this.flightTime <= 0 && this.vy > 1.5 && !this.onGround) this.vy = 1.5;
      // wall slide
      if (s.wallClimb && this.hitWallDir && !this.onGround && this.vy > 1 && sign(mx) === this.hitWallDir) this.vy = 1;
    }

    // hook
    this.updateHook(game, inp, aim);

    // dash
    if (inp.dash && s.dash && this.dashCd === 0) {
      const d = mx !== 0 ? sign(mx) : this.dir;
      this.vx = d * 11; this.dashCd = 45; this.immune = Math.max(this.immune, 8);
      if (this.buffs.has('marked')) { this.buffs.delete('marked'); game.fx.text(this.cx, this.y - 6, 'Mark shaken off', '#ffcc33'); }
      game.fx.burst(this.cx, this.cy, '#3dffb0', 12, 3);
      game.audio.play('dash');
    }

    // water walking
    const footT = Math.floor((this.y + this.h + 1) / TILE);
    let walkOnLiquid = false;
    if (s.waterWalk && !inp.down && this.vy >= 0) {
      const lx0 = Math.floor(this.x / TILE), lx1 = Math.floor((this.x + this.w) / TILE);
      for (let tx = lx0; tx <= lx1; tx++) if (world.inb(tx, footT) && world.liq[footT * world.w + tx] > 120 && !world.solidAt(tx, footT)) walkOnLiquid = true;
      if (walkOnLiquid && liquid < 0) { this.vy = 0; this.y = footT * TILE - this.h - 0.01; }
    }

    const prevVy = this.vy;
    this.stepOffset = 0;
    moveEntity(world, this, { platforms: true, step: true, drop: inp.down && !this.climbing });
    if (walkOnLiquid) this.onGround = true;
    this.hitWallDir = this.hitWall || 0;
    if (this.stepOffset) game.camShake = Math.max(game.camShake || 0, 0);

    // world bounds
    this.x = clamp(this.x, TILE * 2, (world.w - 2) * TILE - this.w);
    if (this.y < 0) { this.y = 0; this.vy = Math.max(0, this.vy); }

    // fall damage
    if (this.onGround) {
      const fell = (this.y - this.fallStartY) / TILE;
      if (fell > 25 && !s.noFall && liquid < 0 && !this.climbing && prevVy > 6) {
        const dmg = Math.round((fell - 25) * 10);
        game.hurtPlayer(dmg, this.cx, 0, 'fell');
      }
      this.fallStartY = this.y;
    } else if (this.vy <= 0 || this.flying || this.climbing || liquid >= 0 || (this.hook && this.hook.attached) || s.featherFall) this.fallStartY = this.y;

    // plasma
    if (liquid === LIQ.plasma) {
      if (s.plasmaImmune) { /* immune */ }
      else if (s.plasmaWard && this.plasmaWardTime < 420) this.plasmaWardTime++;
      else { game.hurtPlayer(s.plasmaResist ? 40 : 80, this.cx, 0, 'plasma'); this.addBuff('burn', 420); }
    } else if (this.plasmaWardTime > 0 && game.tick % 2 === 0) this.plasmaWardTime--;

    // hazards: laser grids / spikes
    const hx0 = Math.floor((this.x - 1) / TILE), hx1 = Math.floor((this.x + this.w + 1) / TILE);
    const hy0 = Math.floor((this.y - 1) / TILE), hy1 = Math.floor((this.y + this.h + 1) / TILE);
    for (let ty = hy0; ty <= hy1; ty++) for (let tx = hx0; tx <= hx1; tx++) {
      const td = TILES[world.get(tx, ty)];
      if (td && td.damage) { game.hurtPlayer(td.damage, tx * TILE + 8, 4, td.name); break; }
      if (td && td.web) { this.vx *= 0.6; this.vy *= 0.6; }
    }

    if (Math.abs(this.vx) > 0.1 && this.onGround) this.anim += Math.abs(this.vx) * 0.5;
    else if (!this.onGround) this.anim = 0;

    // ---------- item use ----------
    this.aimX = aim.x; this.aimY = aim.y;
    this.updateUse(game, useHeld, aim);
  }

  updateHook(game, inp, aim) {
    const world = game.world;
    let hk = this.equip.hook && ITEMS[this.equip.hook.k];
    if (!hk) { const arm = this.equip.implants.arms && ITEMS[this.equip.implants.arms.k]; if (arm && arm.builtinHook) hk = arm.builtinHook; }
    if (!hk) { this.hook = null; return; }
    if (inp.hook) {
      if (this.hook) { this.hook = null; }
      else {
        let dx = 0, dy = -1;
        if (game.input.joy.active && (Math.abs(game.input.joy.x) > 0.2 || Math.abs(game.input.joy.y) > 0.2)) { dx = game.input.joy.x; dy = game.input.joy.y; }
        else if (aim && aim.fromMouse) { dx = aim.x - this.cx; dy = aim.y - this.cy; }
        else { dx = this.dir * 0.8; dy = -1; }
        const d = Math.hypot(dx, dy) || 1;
        this.hook = { x: this.cx, y: this.cy, vx: dx / d * hk.hookSpeed, vy: dy / d * hk.hookSpeed, attached: false, range: hk.hookRange * TILE, speed: hk.hookSpeed };
        game.audio.play('hook');
      }
    }
    const h = this.hook;
    if (!h) return;
    if (!h.attached) {
      for (let s = 0; s < 3; s++) {
        h.x += h.vx / 3; h.y += h.vy / 3;
        const tx = Math.floor(h.x / TILE), ty = Math.floor(h.y / TILE);
        if (world.solidAt(tx, ty) || world.platformAt(tx, ty) || TILES[world.get(tx, ty)]?.tree) { h.attached = true; break; }
      }
      if (Math.hypot(h.x - this.cx, h.y - this.cy) > h.range) this.hook = null;
    } else {
      const dx = h.x - this.cx, dy = h.y - (this.y + 8), d = Math.hypot(dx, dy);
      if (d > 20) { this.vx = dx / d * h.speed * 0.8; this.vy = dy / d * h.speed * 0.8; }
      else { this.vx *= 0.5; this.vy = 0; }
      this.jumpsUsed = 0; this.flightTime = this.s.flight; this.rocketTime = this.s.rocket;
      if (inp.jumpPressed) { this.hook = null; this.vy = -5.1; this.jumpTimer = 10; }
      const tx = Math.floor(h.x / TILE), ty = Math.floor(h.y / TILE);
      if (this.hook && !world.solidAt(tx, ty) && !world.platformAt(tx, ty) && !TILES[world.get(tx, ty)]?.tree) this.hook = null;
    }
  }

  // ---------------- using items ----------------
  updateUse(game, useHeld, aim) {
    const slot = this.inv[this.sel];
    const tit = slot && ITEMS[slot.k];
    if (tit && tit.tech) {
      updateTech(game, this, tit, slot, useHeld && !(game.ui && game.ui.blocking()), aim);
      if (this.useTimer > 0) this.useTimer--;
      return;
    }
    this.techFx = null; this.charge = 0;
    if (this.grabbed) { this.grabbed.grabbed = false; this.grabbed = null; }
    if (this.useTimer > 0) {
      this.useTimer--;
      const it = this.useKey && ITEMS[this.useKey];
      if (it) this.continueUse(game, it, slot);
      if (this.useTimer === 0) { this.useKey = null; this.swingHits.clear(); }
      return;
    }
    if (useHeld && !slot && this.equip.implants.arms && ITEMS[this.equip.implants.arms.k].mantis && !(game.ui && game.ui.blocking())) {
      this.startUse(game, ITEMS[MANTIS], { k: MANTIS, n: 1 }, aim);
      return;
    }
    if (!useHeld || !slot) { this.holdTime = 0; return; }
    const it = ITEMS[slot.k];
    if (!it) return;
    if (it.useStyle === 'hold') {
      this.holdTime++;
      if (game.tick % 4 === 0) game.fx.spark(this.cx + rng.float(-10, 10), this.cy + rng.float(-20, 20), '#2ef2ff');
      if (this.holdTime >= it.useTime) { this.holdTime = 0; if (it.recall) game.recall(); }
      return;
    }
    if (game.ui && game.ui.blocking()) return;
    this.startUse(game, it, slot, aim);
  }

  startUse(game, it, slot, aim) {
    const world = game.world;
    const ut = this.itemUseTime(slot);
    const tx = Math.floor(aim.x / TILE), ty = Math.floor(aim.y / TILE);
    this.dir = aim.x >= this.cx ? 1 : -1;
    const ang = Math.atan2(aim.y - (this.y + 16), aim.x - this.cx);
    let used = false;

    if (it.pick || it.axe || it.hammer) {
      used = true;
      const tgt = game.toolTarget(this, it, tx, ty);
      if (tgt) {
        game.hitTile(this, it, tgt.x, tgt.y, tgt.mode);
        if (it.area && tgt.mode === 'tile') for (let dy = -it.area; dy <= it.area; dy++) for (let dx = -it.area; dx <= it.area; dx++) {
          if ((dx || dy) && world.solidAt(tgt.x + dx, tgt.y + dy) && !TILES[world.get(tgt.x + dx, tgt.y + dy)].furn) game.hitTile(this, it, tgt.x + dx, tgt.y + dy, 'tile');
        }
      }
    }
    if (it.seedGrass) {
      const t = game.pickPlaceTarget(this, it, tx, ty, true);
      if (t && world.get(t.x, t.y) === T[it.seedGrass === 'glowmoss' ? 'biogel' : 'regolith']) {
        world.set(t.x, t.y, T[it.seedGrass]); this.consumeHeld(1); game.audio.play('place');
      }
      used = true;
    }
    if (it.place || it.placeWall) {
      const ok = it.placeWall ? game.placeWall(this, it, tx, ty) : game.placeTile(this, it, tx, ty);
      if (ok) { this.consumeHeld(1); game.audio.play('place'); }
      used = true;
    }
    if (it.type === 'consumable') {
      if (game.consume(this, it)) { this.consumeHeld(1); used = true; }
      else return;
    }
    if (it.type === 'weapon' || (it.type === 'tool' && it.damage)) {
      if (it.useStyle === 'swing' || it.useStyle === 'thrust') {
        used = true;
        this.swingHits.clear();
        if (it.swingProj && (!it.swingProjChance || rng.chance(it.swingProjChance))) {
          const sp = it.projSpeed || 9;
          game.spawnProjectile(it.swingProj, this.cx, this.y + 16, Math.cos(ang) * sp, Math.sin(ang) * sp, this.itemDamage(slot), this.itemKnock(slot), 'player', { crit: this.itemCrit(slot), dmgType: it.dmgType });
        }
        game.audio.play(it.useStyle === 'thrust' ? 'thrust' : 'swing');
      } else if (it.useStyle === 'throw' || it.useStyle === 'shoot') {
        used = this.fire(game, it, slot, aim);
        if (!used) return;
      }
    }
    if (it.fishing) { used = this.fire(game, it, slot, aim); if (!used) return; }
    if (it.recall) used = true;
    if (!used) return;
    this.useKey = it.key;
    this.useTotal = ut; this.useTimer = ut;
    this.useAngle = ang;
    this.useStyle = it.useStyle;
  }

  continueUse(game, it, slot) {
    if (it.key === MANTIS) slot = { k: MANTIS, n: 1 };
    if (!slot || slot.k !== it.key) return;
    const prog = 1 - this.useTimer / this.useTotal;
    if (it.useStyle === 'swing' && (it.type === 'weapon' || it.damage)) {
      const len = (it.size || 30) * (it.type === 'tool' ? 0.8 : 1);
      const a0 = -2.2, a1 = 1.0;
      const a = a0 + (a1 - a0) * Math.min(1, prog * 1.3);
      const sa = this.dir > 0 ? a : Math.PI - a;
      const hx = this.cx + this.dir * 2, hy = this.y + 16;
      const ex = hx + Math.cos(sa) * len, ey = hy + Math.sin(sa) * len;
      game.meleeHit(this, it, slot, hx, hy, ex, ey);
      this.swingAngle = sa;
    } else if (it.useStyle === 'thrust') {
      const len = (it.size || 40) * Math.sin(Math.min(1, prog * 1.2) * Math.PI);
      const hx = this.cx, hy = this.y + 16;
      const ex = hx + Math.cos(this.useAngle) * len, ey = hy + Math.sin(this.useAngle) * len;
      game.meleeHit(this, it, slot, hx, hy, ex, ey);
    }
  }

  fire(game, it, slot, aim) {
    const s = this.s;
    if (it.fishing) {
      const cur = game.projectiles.find((q) => q.def.ai === 'bobber' && !q.dead);
      if (cur) { reelIn(game, cur); return true; }
      const bi = findBait(this);
      if (bi < 0) { game.fx.text(this.cx, this.y - 6, 'Needs bait', '#ffcc33'); return false; }
      const a = Math.atan2(aim.y - (this.y + 16), aim.x - this.cx);
      const b = game.spawnProjectile('bobber', this.cx, this.y + 12, Math.cos(a) * it.shootSpeed, Math.sin(a) * it.shootSpeed - 1, 0, 0, 'player');
      b.power = fishingPower(this, it, this.inv[bi].k);
      game.audio.play('throw');
      return true;
    }
    if (it.energyCost) {
      const cost = Math.max(1, Math.round(it.energyCost * (1 + s.energyCost)));
      if (this.energy < cost) {
        if (!game.autoEnergy(this)) { game.fx.text(this.cx, this.y - 6, 'Low energy', '#a46bff'); return false; }
      }
      this.energy -= cost;
    }
    let projKey = it.shoot, ammoDmg = 0;
    if (it.ammo) {
      const ai = this.findAmmo(it.ammo);
      if (ai < 0) { game.fx.text(this.cx, this.y - 6, 'No ammo', '#ffcc33'); return false; }
      const am = ITEMS[this.inv[ai].k];
      projKey = it.convertAmmo || am.proj;
      ammoDmg = am.ammoDmg || 0;
      if (!(it.ammoSave && rng.chance(it.ammoSave))) { this.inv[ai].n--; if (this.inv[ai].n <= 0) this.inv[ai] = null; }
    }
    if (it.maxActive) {
      const n = game.projectiles.filter((p) => p.def.key === projKey && p.owner === 'player').length;
      if (n >= it.maxActive) return false;
    }
    if (it.summonMinion) {
      if (it.sentry) { game.projectiles.filter((p) => p.def.key === projKey).forEach((p) => (p.dead = true)); }
      else if (it.barrier) { const walls = game.projectiles.filter((q) => q.def.key === projKey); if (walls.length >= 2) walls[0].dead = true; }
      else {
        if (!it.barrier) {
          const mins = game.projectiles.filter((p) => p.def.ai === 'minion' && p.owner === 'player');
          if (mins.length >= s.minions) mins[0].dead = true;
        }
      }
      const p = game.spawnProjectile(projKey, aim.x, aim.y, 0, 0, Math.round(this.itemDamage(slot)), this.itemKnock(slot), 'player', { crit: 0, dmgType: 'summon' });
      if (it.sentry || it.barrier) { p.x = aim.x - p.w / 2; p.y = aim.y - p.h / (it.barrier ? 2 : 1); }
      game.audio.play('summon');
      return true;
    }
    if (it.consumeSelf) {
      if (!slot || slot.n <= 0) return false;
    }
    const dmg = Math.round((it.damage + ammoDmg) * (1 + (slot.p ? PREFIXES[slot.p]?.dmg || 0 : 0)) * this.dmgMult(it.dmgType));
    if (it.smartAim) {
      let best = null, bd = 260;
      for (const m of game.monsters) { if (m.dead || m.allied) continue; const d = Math.hypot(m.cx - aim.x, m.cy - aim.y); if (d < bd) { bd = d; best = m; } }
      if (best) aim = { x: best.cx, y: best.cy };
    }
    const cx = this.cx, cy = this.y + 16;
    const baseAng = Math.atan2(aim.y - cy, aim.x - cx);
    const count = it.count || 1;
    const sp = it.shootSpeed || 10;
    for (let i = 0; i < count; i++) {
      const spread = (it.spread || 0) * (count > 1 ? (i / (count - 1) - 0.5) * 2 : rng.float(-1, 1));
      const a = baseAng + spread + (count > 1 ? rng.float(-0.03, 0.03) : 0);
      const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
      game.spawnProjectile(projKey, cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, vx, vy, dmg, this.itemKnock(slot), 'player', { crit: this.itemCrit(slot), dmgType: it.dmgType, onHit: it.onHit });
    }
    if (it.consumeSelf) this.consumeHeld(1);
    game.audio.play(it.dmgType === 'energy' ? 'laser' : it.ammo === 'rocket' ? 'rocket' : it.useStyle === 'throw' ? 'throw' : 'shoot');
    return true;
  }

  findAmmo(type) {
    for (let i = 0; i < this.inv.length; i++) {
      const s = this.inv[i];
      if (s && ITEMS[s.k].type === 'ammo' && ITEMS[s.k].ammoType === type) return i;
    }
    return -1;
  }

  consumeHeld(n) {
    const s = this.inv[this.sel];
    if (!s) return;
    s.n -= n;
    if (s.n <= 0) this.inv[this.sel] = null;
  }

  gearColors() {
    const g = {};
    const c = (slot) => { const e = this.equip[slot]; return e ? ITEMS[e.k].icon.c : null; };
    g.head = c('head'); g.body = c('body'); g.legs = c('legs');
    for (let i = 0; i < this.accSlots; i++) { const a = this.equip.acc[i]; if (a && ITEMS[a.k].stats && ITEMS[a.k].stats.flight) g.wings = ITEMS[a.k].icon.c; }
    g.imp = {};
    for (const sl of IMPLANT_SLOTS) { const im = this.equip.implants[sl]; if (im) g.imp[sl] = { k: im.k, c: ITEMS[im.k].icon.c }; }
    return g;
  }
}
