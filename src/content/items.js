// Item registry. Many items are generated from the metal / wood tables so each tier
// gets a full kit (tools, weapons, armor, building blocks, furniture).
import { METALS, WOODS, NEON_COLORS } from './materials.js';
import { TILES, T, WALLS, W, HERBS } from './tiles.js';

export const ITEMS = {};
export const ITEM_LIST = [];

export function item(key, d) {
  if (ITEMS[key]) throw new Error('duplicate item ' + key);
  const it = Object.assign({
    key, name: key, type: 'material', stack: 999, value: 0, rarity: 0, icon: { s: 'gem', c: '#888' },
    useTime: 20, useStyle: null, tip: '',
  }, d);
  if (it.stack === 999 && ['tool', 'weapon', 'armor', 'accessory', 'hook'].includes(it.type)) it.stack = 1;
  it.index = ITEM_LIST.length;
  ITEMS[key] = it;
  ITEM_LIST.push(it);
  return it;
}

const blockItem = (tileKey, extra = {}) =>
  item(extra.key || tileKey, Object.assign({ name: TILES[T[tileKey]].name, type: 'block', place: tileKey, icon: { tile: tileKey }, useTime: 12, useStyle: 'swing' }, extra));
const wallItem = (wallKey, extra = {}) =>
  item(wallKey, Object.assign({ name: WALLS[W[wallKey]].name, type: 'wall', placeWall: wallKey, icon: { wall: wallKey }, useTime: 8, useStyle: 'swing' }, extra));
const furnItem = (tileKey, extra = {}) =>
  item(extra.key || tileKey, Object.assign({ name: TILES[T[tileKey]].name, type: 'furniture', place: tileKey, icon: { furn: tileKey }, useTime: 15, useStyle: 'swing', stack: 99 }, extra));

// ---------------- terrain blocks ----------------
for (const k of ['regolith', 'ferrocrete', 'silica', 'rustsand', 'rustrock', 'frost', 'cryoice', 'biogel', 'graymass', 'graysand',
  'prismstone', 'prismsand', 'basalt', 'slag', 'vitrislag', 'aerogel', 'swarmcomb', 'derelict_hull', 'temple_brick']) blockItem(k);
ITEMS.vitrislag.value = 20; ITEMS.derelict_hull.value = 10;
blockItem('glass'); blockItem('carbon_brick'); blockItem('circuit_block', { value: 50 });
blockItem('ferrocrete_brick'); blockItem('rustrock_brick'); blockItem('cryo_brick'); blockItem('vitri_brick'); blockItem('prism_brick');
for (const n of NEON_COLORS) blockItem('neon_' + n.key, { value: 40 });
blockItem('laser_grid', { value: 200, rarity: 1 });

// ---------------- woods ----------------
for (const w of WOODS) {
  if (w.item === w.key) item(w.key, { name: w.name, type: 'block', place: w.key + '_block', icon: { tile: w.key + '_block' }, useTime: 12, useStyle: 'swing', value: 2, tip: 'Building material' });
  else blockItem(w.key + '_block');
  blockItem(w.key + '_platform', { stack: 999 });
  wallItem(w.key + '_wall');
  furnItem(w.key + '_table'); furnItem(w.key + '_chair'); furnItem(w.key + '_door'); furnItem(w.key + '_chest'); furnItem(w.key + '_lamp');
}
for (const k of ['biogel_wall', 'jungle_wall', 'frost_wall', 'rustrock_wall', 'blight_wall', 'prism_wall', 'slag_wall', 'hive_wall', 'derelict_wall', 'temple_wall', 'regolith_wall', 'ferrocrete_wall', 'basalt_wall', 'glass_wall', 'carbon_wall', 'circuit_wall', 'ferrocrete_brick_wall']) wallItem(k);
for (const m of METALS) wallItem(m.key + '_wall');

// ---------------- ores, bars, plating ----------------
for (const m of METALS) {
  const r = Math.min(10, m.tier);
  blockItem(m.key + '_ore', { value: 5 * m.tier * m.tier, rarity: Math.max(0, r - 1), tip: 'Smelt into bars' });
  item(m.key + '_bar', { name: m.name + ' Bar', icon: { s: 'bar', c: m.color, c2: m.dark }, value: 30 * m.tier * m.tier, rarity: Math.max(0, r - 1), tip: 'Fabrication material' });
  blockItem(m.key + '_plating', { value: 10 });
}
item('star_shard', { name: 'Star Shard', icon: { s: 'star', c: '#fff38a', c2: '#b39a2a' }, value: 100, rarity: 1, tip: 'Fragments of orbital debris. They rain down at night.' });
blockItem('starshard_ore', { key: 'starshard_cluster', name: 'Starshard Cluster', value: 30 });

// ---------------- misc placeables ----------------
blockItem('cable', { stack: 999, value: 2, tip: 'Climbable. Use up/down while touching it.' });
blockItem('glowstick', { stack: 999, value: 5, tip: 'Basic light source' });
for (const n of NEON_COLORS) if (n.key !== 'white') blockItem('glowstick_' + n.key, { stack: 999, value: 10 });
blockItem('plasma_torch', { stack: 999, value: 30, tip: 'Hot, bright and comforting. Regenerates nearby.' });
blockItem('cryo_torch', { stack: 999, value: 20 });
for (const k of ['assembly_bench', 'rest_pod', 'smelter', 'fabricator', 'synth_vat', 'textile_printer', 'tinker_station', 'plasma_forge',
  'nano_forge', 'quantum_assembler', 'singularity_core', 'cryo_lathe', 'trade_terminal', 'derelict_chest', 'core_chest', 'cache_chest']) furnItem(k, { stack: 99, value: 100 });
ITEMS.assembly_bench.tip = 'Basic crafting station';
ITEMS.rest_pod.tip = 'Interact to set your respawn point';
ITEMS.smelter.tip = 'Smelts ore into bars';
ITEMS.fabricator.tip = 'Fabricates metal gear';
ITEMS.synth_vat.tip = 'Synthesizes stims and injectors';
ITEMS.tinker_station.tip = 'Combines accessories';
ITEMS.plasma_forge.tip = 'Smelts Plasmite and hardmode ores';
ITEMS.nano_forge.tip = 'Fabricates advanced alloys';
ITEMS.quantum_assembler.tip = 'Assembles post-Singularity technology';
ITEMS.singularity_core.tip = 'The final fabrication station';
ITEMS.trade_terminal.tip = 'Decor. Hums with old market data.';

item('seed_pod', { name: 'Seed Pod', type: 'block', place: 'sapling', icon: { s: 'seed', c: '#8a6b55', c2: '#2fe0a8' }, useTime: 15, useStyle: 'swing', value: 10, tip: 'Plant on grass to grow a tree', plantOn: ['synthgrass', 'glowmoss', 'grayturf', 'prismturf', 'frost', 'rustsand'] });
item('grass_seeds', { name: 'Synthgrass Seeds', type: 'tool', stack: 99, icon: { s: 'seed', c: '#2fe0a8', c2: '#1a9e7a' }, useTime: 15, useStyle: 'swing', value: 20, seedGrass: 'synthgrass', tip: 'Plant on regolith' });
item('glowmoss_seeds', { name: 'Glowmoss Seeds', type: 'tool', stack: 99, icon: { s: 'seed', c: '#a8ff3a', c2: '#5fa52a' }, useTime: 15, useStyle: 'swing', value: 30, seedGrass: 'glowmoss', tip: 'Plant on biogel' });
for (const it of ['grass_seeds', 'glowmoss_seeds']) ITEMS[it].stack = 99;

// ---------------- monster drops & materials ----------------
const mat = (key, name, icon, value, rarity = 0, tip = '') => item(key, { name, icon, value, rarity, tip });
mat('nanogel', 'Nanogel', { s: 'gel', c: '#4ad9ff' }, 2, 0, 'Sticky and flammable');
mat('optic_lens', 'Optic Lens', { s: 'lens', c: '#ff3355', c2: '#ffffff' }, 50, 0);
mat('scrap', 'Scrap Metal', { s: 'gear', c: '#8a8f99' }, 5, 0, 'Salvaged from machines');
mat('circuitry', 'Circuitry', { s: 'chip', c: '#2a8a4a', c2: '#ffcc33' }, 25, 1);
mat('battery', 'Battery Cell', { s: 'cell', c: '#e8ff4a', c2: '#333' }, 40, 1);
mat('blight_shard', 'Blight Shard', { s: 'shard', c: '#b06bff', c2: '#5b5770' }, 10, 0, 'Fragment of self-replicating machinery');
mat('wyrm_scale', 'Wyrm Scale', { s: 'scale', c: '#7a5aa8', c2: '#b06bff' }, 100, 1);
mat('swarm_chitin', 'Swarm Chitin', { s: 'scale', c: '#c29a2a', c2: '#ffcc33' }, 60, 2);
mat('nano_stinger', 'Nano Stinger', { s: 'needle', c: '#ffcc33' }, 20, 1);
mat('biofiber', 'Biofiber Vine', { s: 'leaf', c: '#7dff5a', c2: '#3a8a2a' }, 30, 1);
mat('bio_spore', 'Bio Spore', { s: 'orb', c: '#a8ff3a', c2: '#5fa52a' }, 30, 1);
mat('cryo_essence', 'Cryo Essence', { s: 'core', c: '#9ff4ff', c2: '#2a7a8a' }, 80, 2);
mat('aero_vane', 'Aero Vane', { s: 'feather', c: '#e8f6ff', c2: '#8fb8ff' }, 40, 1);
mat('nano_filament', 'Nano Filament', { s: 'cable', c: '#cfd8e0' }, 2, 0, 'Spin into Nanoweave');
mat('nanoweave', 'Nanoweave', { s: 'cloth', c: '#cfd8e0', c2: '#66ccff' }, 20, 0);
mat('synth_leather', 'Synth Leather', { s: 'cloth', c: '#8a5a3a', c2: '#5a3a2a' }, 30, 0);
mat('bone_alloy', 'Bone Alloy', { s: 'bone', c: '#dcd6c4' }, 15, 1, 'Old, incredibly dense struts');
mat('photon_core', 'Photon Core', { s: 'soul', c: '#ff9ee8' }, 200, 3, 'Pulses with Prism energy');
mat('void_core', 'Void Core', { s: 'soul', c: '#b06bff' }, 200, 3, 'Pulses with Blight energy');
mat('gravity_core', 'Gravity Core', { s: 'soul', c: '#8fd8ff' }, 300, 3, 'Defies gravity. Used for jetpacks.');
mat('targeting_matrix', 'Targeting Matrix', { s: 'matrix', c: '#3dff6a' }, 400, 5);
mat('force_matrix', 'Force Matrix', { s: 'matrix', c: '#5a78ff' }, 400, 5);
mat('terror_matrix', 'Terror Matrix', { s: 'matrix', c: '#ff8a3d' }, 400, 5);
item('exalted_bar', { name: 'Exalted Alloy Bar', icon: { s: 'bar', c: '#ffe8a8', c2: '#c9a640' }, value: 800, rarity: 5, tip: 'Forged inside mechanical gods' });
mat('phase_residue', 'Phase Residue', { s: 'gel', c: '#9ff4e8' }, 300, 6, 'Residue of digital ghosts');
mat('bloom_tissue', 'Bloom Tissue', { s: 'leaf', c: '#ff5aa8', c2: '#3a8a2a' }, 500, 6);
mat('golem_core', 'Gravity Golem Core', { s: 'core', c: '#ffaa22', c2: '#8a6a2e' }, 1000, 7);
mat('fragment_flux', 'Flux Fragment', { s: 'fragment', c: '#ff8a3d' }, 500, 8);
mat('fragment_volt', 'Volt Fragment', { s: 'fragment', c: '#3dffb0' }, 500, 8);
mat('fragment_nova', 'Nova Fragment', { s: 'fragment', c: '#ff3ddc' }, 500, 8);
mat('fragment_drift', 'Drift Fragment', { s: 'fragment', c: '#66ccff' }, 500, 8);
item('singularity_bar', { name: 'Singularity Bar', icon: { s: 'bar', c: '#d0a0ff', c2: '#6a3aa8' }, value: 3000, rarity: 10, tip: 'Matter at the edge of comprehension' });
mat('quantum_dust', 'Quantum Dust', { s: 'dust', c: '#d0a0ff' }, 50, 4, 'Scraped from hardmode machines');
for (const h of HERBS) mat(h.key, h.name, { s: 'herb', c: h.color }, 20, 0, 'Alchemical ingredient');
mat('bio_mushroom', 'Bio Mushroom', { s: 'mushroom', c: '#ff5a8a' }, 25, 0);

// ---------------- currency-like ----------------
item('access_key', { name: 'Access Key', icon: { s: 'key', c: '#ffe27a' }, stack: 99, value: 0, rarity: 1, tip: 'Unlocks a Derelict Chest' });
item('core_key', { name: 'Core Key', icon: { s: 'key', c: '#ff3fa4' }, stack: 1, value: 0, rarity: 3, tip: 'Unlocks a Core Chest' });
item('temple_key', { name: 'Ancient Key', icon: { s: 'key', c: '#ffaa22' }, stack: 99, value: 0, rarity: 6, tip: 'Opens the Ancient Temple doors' });

// ---------------- tools ----------------
const tool = (key, d) => item(key, Object.assign({ type: 'tool', useStyle: 'swing', dmgType: 'melee', knock: 2, crit: 4 }, d));
tool('scrap_pick', { name: 'Scrap Pick', pick: 35, damage: 4, useTime: 16, icon: { s: 'pick', c: '#8a8f99', c2: '#6e5148' }, value: 50 });
tool('scrap_cutter', { name: 'Scrap Cutter', axe: 40, hammer: 35, damage: 4, useTime: 22, icon: { s: 'cutter', c: '#8a8f99', c2: '#6e5148' }, value: 50, tip: 'Chops trees and knocks down walls' });

for (const m of METALS) {
  const t = m.tier, r = Math.max(0, t - 1), v = 120 * t * t;
  const isDrill = m.hard;
  tool(m.key + '_pick', {
    name: m.name + (isDrill ? ' Drill' : ' Pick'), pick: m.pick, damage: 4 + Math.round(t * 2.6), useTime: Math.max(6, 16 - t),
    icon: { s: isDrill ? 'drill' : 'pick', c: m.color, c2: m.dark }, value: v, rarity: r, reach: isDrill ? 1 : 0,
  });
  tool(m.key + '_cutter', {
    name: m.name + ' Cutter', axe: 40 + t * 12, hammer: 35 + t * 10, damage: 6 + Math.round(t * 3), useTime: Math.max(8, 22 - t),
    icon: { s: 'cutter', c: m.color, c2: m.dark }, value: v, rarity: r,
  });
}

tool('singularity_pick', { name: 'Singularity Drill', pick: 250, damage: 60, useTime: 5, reach: 3, icon: { s: 'drill', c: '#d0a0ff', c2: '#6a3aa8' }, value: 150000, rarity: 10 });
tool('singularity_cutter', { name: 'Singularity Cutter', axe: 200, hammer: 150, damage: 80, useTime: 6, reach: 3, icon: { s: 'cutter', c: '#d0a0ff', c2: '#6a3aa8' }, value: 150000, rarity: 10 });

// ---------------- weapons ----------------
const weapon = (key, d) => item(key, Object.assign({ type: 'weapon', knock: 4, crit: 4 }, d));
const melee = (key, d) => weapon(key, Object.assign({ dmgType: 'melee', useStyle: 'swing', size: 34 }, d));
const ranged = (key, d) => weapon(key, Object.assign({ dmgType: 'ranged', useStyle: 'shoot', ammo: 'round', shootSpeed: 10, knock: 2 }, d));
const energy = (key, d) => weapon(key, Object.assign({ dmgType: 'energy', useStyle: 'shoot', shootSpeed: 9, knock: 3 }, d));
const summon = (key, d) => weapon(key, Object.assign({ dmgType: 'summon', useStyle: 'shoot', useTime: 30, knock: 2, summonMinion: true }, d));

melee('scrap_knife', { name: 'Scrap Knife', damage: 7, useTime: 13, size: 24, icon: { s: 'knife', c: '#aeb7c2' }, value: 40 });
const BLADE = {
  cuprite: { n: 'Cuprite Blade', d: 9, u: 22 }, ferrite: { n: 'Ferrite Blade', d: 11, u: 21 }, titanite: { n: 'Titanite Blade', d: 14, u: 20 },
  lumenite: { n: 'Lumen Edge', d: 18, u: 20 }, xenometal: { n: 'Xeno Saber', d: 22, u: 19, proj: 'blade_wave' }, cryonite: { n: 'Cryo Edge', d: 26, u: 21, onHit: { buff: 'chill', time: 180 } },
  plasmite: { n: 'Plasma Cleaver', d: 34, u: 24, onHit: { buff: 'burn', time: 240 }, size: 44 }, neutronium: { n: 'Neutron Saber', d: 44, u: 18 },
  chronite: { n: 'Chrono Blade', d: 56, u: 17, proj: 'chrono_wave' }, aetherium: { n: 'Aether Brand', d: 68, u: 16, proj: 'aether_wave', size: 46 },
};
const RIFLE = {
  cuprite: { n: 'Cuprite Pistol', d: 8, u: 22, s: 'pistol' }, ferrite: { n: 'Ferrite Repeater', d: 10, u: 20, s: 'pistol' },
  titanite: { n: 'Titanite Rifle', d: 14, u: 22, s: 'rifle', sp: 13 }, lumenite: { n: 'Lumen Carbine', d: 16, u: 16, s: 'rifle' },
  cryonite: { n: 'Cryo Rifle', d: 22, u: 20, s: 'rifle', conv: 'cryo_bullet' }, plasmite: { n: 'Plasma Repeater', d: 27, u: 18, s: 'rifle', conv: 'plasma_bullet' },
  neutronium: { n: 'Neutron SMG', d: 24, u: 7, s: 'smg' }, chronite: { n: 'Chrono Sniper', d: 115, u: 38, s: 'sniper', sp: 18, crit: 25 },
  aetherium: { n: 'Aether Minigun', d: 34, u: 5, s: 'minigun', spread: 0.08, ammoSave: 0.5 },
};
const STAFF = {
  lumenite: { n: 'Lumen Staff', d: 17, u: 24, proj: 'lumen_bolt', cost: 6, s: 'staff' }, xenometal: { n: 'Xeno Blaster', d: 18, u: 12, proj: 'xeno_laser', cost: 4, s: 'raygun', sp: 13 },
  cryonite: { n: 'Cryo Lance Staff', d: 25, u: 24, proj: 'ice_lance', cost: 8, s: 'staff', sp: 12 }, plasmite: { n: 'Plasma Projector', d: 32, u: 26, proj: 'plasma_orb', cost: 12, s: 'tome' },
  neutronium: { n: 'Neutron Staff', d: 42, u: 20, proj: 'neutron_bolt', cost: 10, s: 'staff' }, chronite: { n: 'Chrono Prism', d: 48, u: 10, proj: 'chrono_beam', cost: 6, s: 'wand', sp: 15 },
  aetherium: { n: 'Aether Codex', d: 70, u: 18, proj: 'aether_star', cost: 14, s: 'tome', count: 2, spread: 0.2 },
};
const SUMMON = {
  ferrite: { n: 'Drone Remote', d: 8, proj: 'minion_drone' }, neutronium: { n: 'Neutron Remote', d: 30, proj: 'minion_neutron' },
  chronite: { n: 'Chrono Remote', d: 42, proj: 'minion_chrono' }, aetherium: { n: 'Aether Remote', d: 60, proj: 'minion_aether' },
};
for (const m of METALS) {
  const t = m.tier, r = Math.max(0, t - 1), v = 150 * t * t;
  const b = BLADE[m.key];
  if (b) melee(m.key + '_blade', { name: b.n, damage: b.d, useTime: b.u, size: b.size || 30 + t * 2, icon: { s: 'blade', c: m.color, c2: m.dark }, value: v, rarity: r, swingProj: b.proj, projSpeed: 9, onHit: b.onHit });
  const g = RIFLE[m.key];
  if (g) ranged(m.key + '_gun', { name: g.n, damage: g.d, useTime: g.u, icon: { s: g.s, c: m.color, c2: m.dark }, value: v, rarity: r, shootSpeed: g.sp || 11, convertAmmo: g.conv, crit: g.crit || 4, spread: g.spread || 0.02, ammoSave: g.ammoSave || 0 });
  const s = STAFF[m.key];
  if (s) energy(m.key + '_staff', { name: s.n, damage: s.d, useTime: s.u, shoot: s.proj, energyCost: s.cost, icon: { s: s.s, c: m.color, c2: m.dark }, value: v, rarity: r, shootSpeed: s.sp || 9, count: s.count || 1, spread: s.spread || 0 });
  const sm = SUMMON[m.key];
  if (sm) summon(m.key + '_remote', { name: sm.n, damage: sm.d, shoot: sm.proj, energyCost: 10, icon: { s: 'remote', c: m.color, c2: m.dark }, value: v, rarity: r, tip: 'Summons a combat drone to fight for you' });
}

// special weapons
melee('ion_boomerang', { name: 'Ion Boomerang', damage: 15, useTime: 16, useStyle: 'throw', shoot: 'ion_boomerang', shootSpeed: 10, maxActive: 1, icon: { s: 'boomerang', c: '#66ccff' }, value: 2000, rarity: 1 });
melee('plasma_boomerang', { name: 'Plasma Rang', damage: 30, useTime: 15, useStyle: 'throw', shoot: 'plasma_boomerang', shootSpeed: 12, maxActive: 2, icon: { s: 'boomerang', c: '#ff5ab0' }, value: 8000, rarity: 3 });
melee('grav_flail', { name: 'Grav Flail', damage: 22, useTime: 40, useStyle: 'throw', shoot: 'grav_flail', shootSpeed: 13, maxActive: 1, knock: 7, icon: { s: 'flail', c: '#8a7aa8' }, value: 5000, rarity: 2 });
melee('volt_spear', { name: 'Volt Spear', damage: 16, useTime: 26, useStyle: 'thrust', size: 64, icon: { s: 'spear', c: '#e8ff4a' }, value: 2500, rarity: 1, onHit: { buff: 'shock', time: 120 } });
melee('swarm_blade', { name: 'Swarm Blade', damage: 24, useTime: 20, size: 40, icon: { s: 'blade', c: '#ffcc33', c2: '#c29a2a' }, value: 6000, rarity: 3, swingProj: 'swarm_bee', projSpeed: 6, swingProjChance: 0.4 });
melee('blight_reaper', { name: 'Blight Reaper', damage: 30, useTime: 25, size: 48, icon: { s: 'blade', c: '#b06bff', c2: '#5b5770' }, value: 8000, rarity: 3, onHit: { buff: 'corrode', time: 240 } });
melee('archon_mace', { name: 'Archon Mace', damage: 36, useTime: 30, size: 46, knock: 9, icon: { s: 'mace', c: '#66ccff', c2: '#44607e' }, value: 9000, rarity: 3 });
melee('event_horizon', { name: 'Event Horizon', damage: 160, useTime: 14, size: 56, icon: { s: 'blade', c: '#d0a0ff', c2: '#6a3aa8' }, value: 200000, rarity: 10, swingProj: 'horizon_wave', projSpeed: 12 });
melee('exalted_blade', { name: 'Exalted Blade', damage: 62, useTime: 18, size: 44, icon: { s: 'blade', c: '#ffe8a8', c2: '#c9a640' }, value: 40000, rarity: 5, swingProj: 'blade_wave', projSpeed: 11 });
melee('bloom_glaive', { name: 'Bloom Glaive', damage: 78, useTime: 20, useStyle: 'thrust', size: 80, icon: { s: 'spear', c: '#ff5aa8' }, value: 60000, rarity: 7 });
melee('golem_fist', { name: 'Golem Fist', damage: 96, useTime: 26, useStyle: 'thrust', size: 70, knock: 10, icon: { s: 'glove', c: '#ffaa22' }, value: 80000, rarity: 8 });
weapon('nano_shuriken', { name: 'Nano Shuriken', type: 'weapon', dmgType: 'ranged', damage: 10, useTime: 15, useStyle: 'throw', shoot: 'shuriken', shootSpeed: 10, consumeSelf: true, stack: 999, icon: { s: 'shuriken', c: '#c0d0e0' }, value: 15 });
weapon('grenade', { name: 'Frag Grenade', type: 'weapon', dmgType: 'ranged', damage: 50, useTime: 40, useStyle: 'throw', shoot: 'grenade', shootSpeed: 7, consumeSelf: true, stack: 99, icon: { s: 'grenade', c: '#7a9a5a' }, value: 75 });
weapon('grav_grenade', { name: 'Gravity Grenade', type: 'weapon', dmgType: 'ranged', damage: 70, useTime: 40, useStyle: 'throw', shoot: 'grav_grenade', shootSpeed: 7, consumeSelf: true, stack: 99, icon: { s: 'grenade', c: '#5a78ff' }, value: 200, rarity: 3 });
ranged('scatter_cannon', { name: 'Scatter Cannon', damage: 8, useTime: 45, count: 5, spread: 0.25, icon: { s: 'shotgun', c: '#8a6b55', c2: '#555' }, value: 20000, rarity: 2, knock: 6 });
ranged('swarm_gun', { name: 'Swarm Launcher', damage: 14, useTime: 14, ammo: null, shoot: 'swarm_bee', count: 3, spread: 0.3, energyCost: 4, dmgType: 'energy', icon: { s: 'raygun', c: '#ffcc33' }, value: 10000, rarity: 3 });
ranged('rocket_launcher', { name: 'Rocket Launcher', damage: 50, useTime: 30, ammo: 'rocket', shootSpeed: 8, icon: { s: 'launcher', c: '#5a6b4a' }, value: 50000, rarity: 5, knock: 4 });
ranged('grenade_launcher', { name: 'Grenade Launcher', damage: 60, useTime: 34, ammo: 'rocket', shootSpeed: 9, convertAmmo: 'grenade', icon: { s: 'launcher', c: '#7a9a5a' }, value: 50000, rarity: 5 });
ranged('exalted_repeater', { name: 'Exalted Repeater', damage: 44, useTime: 12, icon: { s: 'rifle', c: '#ffe8a8', c2: '#c9a640' }, value: 40000, rarity: 5, shootSpeed: 13 });
ranged('railgun', { name: 'Architect Railgun', damage: 180, useTime: 30, convertAmmo: 'rail_slug', shootSpeed: 20, crit: 20, icon: { s: 'sniper', c: '#d0a0ff', c2: '#6a3aa8' }, value: 200000, rarity: 10 });
ranged('bloom_launcher', { name: 'Spore Repeater', damage: 52, useTime: 10, convertAmmo: 'seeker_bullet', icon: { s: 'smg', c: '#a8ff3a', c2: '#3a8a2a' }, value: 60000, rarity: 7 });
energy('spark_wand', { name: 'Spark Wand', damage: 12, useTime: 22, shoot: 'spark', energyCost: 4, icon: { s: 'wand', c: '#e8ff4a', c2: '#8a6b55' }, value: 2000, rarity: 1 });
energy('void_lance', { name: 'Void Lance', damage: 24, useTime: 20, shoot: 'void_lance_p', energyCost: 7, icon: { s: 'staff', c: '#b06bff', c2: '#5b5770' }, value: 8000, rarity: 3, shootSpeed: 12 });
energy('exalted_staff', { name: 'Exalted Staff', damage: 55, useTime: 14, shoot: 'aether_star', energyCost: 10, icon: { s: 'staff', c: '#ffe8a8', c2: '#c9a640' }, value: 40000, rarity: 5, shootSpeed: 11 });
energy('golem_eye', { name: 'Golem Eye Beam', damage: 90, useTime: 8, shoot: 'chrono_beam', energyCost: 6, icon: { s: 'lens', c: '#ffaa22', c2: '#ffffff' }, value: 80000, rarity: 8, shootSpeed: 16 });
energy('singularity_staff', { name: 'Singularity Staff', damage: 150, useTime: 16, shoot: 'singularity_orb', energyCost: 16, icon: { s: 'staff', c: '#d0a0ff', c2: '#6a3aa8' }, value: 200000, rarity: 10, shootSpeed: 12 });
summon('swarm_remote', { name: 'Hornet Remote', damage: 12, shoot: 'minion_hornet', energyCost: 10, icon: { s: 'remote', c: '#ffcc33', c2: '#c29a2a' }, value: 10000, rarity: 3 });
summon('sentry_remote', { name: 'Sentry Deployer', damage: 18, shoot: 'sentry_turret', energyCost: 15, sentry: true, icon: { s: 'remote', c: '#aeb7c2', c2: '#555' }, value: 12000, rarity: 3, tip: 'Deploys a stationary turret (max 1)' });
summon('singularity_remote', { name: 'Singularity Remote', damage: 120, shoot: 'minion_singularity', energyCost: 10, icon: { s: 'remote', c: '#d0a0ff', c2: '#6a3aa8' }, value: 200000, rarity: 10 });

// purifier tools
item('nano_purifier', { name: 'Nano Purifier', type: 'weapon', useStyle: 'throw', shoot: 'purifier_dust', shootSpeed: 6, consumeSelf: true, stack: 99, damage: 0, useTime: 20, icon: { s: 'dust', c: '#6cffd8' }, value: 100, tip: 'Cleanses Blight and Prism' });
item('purifier_cannon', { name: 'Purifier Cannon', type: 'weapon', useStyle: 'shoot', shoot: 'purifier_spray', shootSpeed: 8, damage: 0, useTime: 6, energyCost: 1, icon: { s: 'raygun', c: '#6cffd8', c2: '#2a8a6a' }, value: 30000, rarity: 4, tip: 'Sprays purifying nanites' });

// ---------------- ammo ----------------
const ammo = (key, d) => item(key, Object.assign({ type: 'ammo', ammoType: 'round', stack: 999 }, d));
ammo('kinetic_round', { name: 'Kinetic Round', proj: 'bullet', ammoDmg: 7, icon: { s: 'round', c: '#ffe08a' }, value: 1 });
ammo('cryo_round', { name: 'Cryo Round', proj: 'cryo_bullet', ammoDmg: 9, icon: { s: 'round', c: '#9ff4ff' }, value: 4, rarity: 1 });
ammo('plasma_round', { name: 'Plasma Round', proj: 'plasma_bullet', ammoDmg: 11, icon: { s: 'round', c: '#ff5ab0' }, value: 6, rarity: 2 });
ammo('seeker_round', { name: 'Seeker Round', proj: 'seeker_bullet', ammoDmg: 12, icon: { s: 'round', c: '#3dffb0' }, value: 10, rarity: 4 });
ammo('neutron_round', { name: 'Neutron Round', proj: 'neutron_bullet', ammoDmg: 13, icon: { s: 'round', c: '#8fa8ff' }, value: 10, rarity: 4 });
ammo('void_round', { name: 'Void Round', proj: 'void_bullet', ammoDmg: 20, icon: { s: 'round', c: '#d0a0ff' }, value: 30, rarity: 9 });
ammo('rocket_i', { name: 'Rocket', ammoType: 'rocket', proj: 'rocket', ammoDmg: 40, icon: { s: 'rocket', c: '#ffb12e' }, value: 50, rarity: 4 });
ammo('rocket_mining', { name: 'Mining Rocket', ammoType: 'rocket', proj: 'rocket_mining', ammoDmg: 30, icon: { s: 'rocket', c: '#ff7a2e' }, value: 80, rarity: 4, tip: 'Destroys tiles' });

// ---------------- armor ----------------
export const ARMOR_SETS = {};
function armorSet(set, name, color, c2, def, bonus, bonusText, pieceStats = {}, tier = 1, extra = {}) {
  ARMOR_SETS[set] = { name, bonus, text: bonusText };
  const slots = [['head', 'Helmet', 'helmet'], ['body', 'Chestplate', 'chest'], ['legs', 'Greaves', 'legs']];
  slots.forEach(([slot, label, shape], i) => {
    item(set + '_' + slot, Object.assign({
      name: name + ' ' + (extra.names ? extra.names[i] : label), type: 'armor', slot, set, defense: def[i],
      stats: pieceStats[slot] || null, icon: { s: shape, c: color, c2 }, value: 100 * tier * tier * (i + 2), rarity: Math.max(0, tier - 1),
    }, extra.piece || {}));
  });
}
armorSet('fiber', 'Fiber', '#a88f72', '#6b5a48', [1, 1, 0], { defense: 1 }, '+1 defense');
armorSet('cuprite', 'Cuprite', '#e08a4a', '#8a4421', [1, 2, 1], { defense: 2 }, '+2 defense', {}, 1);
armorSet('ferrite', 'Ferrite', '#aeb7c2', '#59616c', [2, 3, 2], { defense: 2 }, '+2 defense', {}, 2);
armorSet('titanite', 'Titanite', '#f2dd7a', '#8f7a2a', [3, 4, 3], { defense: 3 }, '+3 defense', {}, 3);
armorSet('lumenite', 'Lumenite', '#a46bff', '#4b2a8a', [5, 6, 5], { moveSpeed: 0.15, crit: 7 }, '+15% move speed, +7% crit', { head: { crit: 3 }, body: { crit: 3 }, legs: { moveSpeed: 0.05 } }, 4);
armorSet('blight', 'Blight Shell', '#7a5aa8', '#3a2a4f', [6, 7, 6], { meleeSpeed: 0.15 }, '+15% melee speed', { head: { meleeDmg: 0.05 }, body: { meleeDmg: 0.05 }, legs: { meleeDmg: 0.05 } }, 4);
armorSet('xenometal', 'Xeno', '#ff6a3d', '#8a2a12', [5, 6, 5], { energyCost: -0.5 }, 'Energy costs halved', { head: { energyDmg: 0.08 }, body: { energyDmg: 0.08 }, legs: { maxEnergy: 20 } }, 4);
armorSet('swarm', 'Swarm', '#ffcc33', '#c29a2a', [4, 5, 4], { summonDmg: 0.12 }, '+12% summon damage', { head: { minions: 1 }, body: { minions: 1 }, legs: { summonDmg: 0.05 } }, 4);
armorSet('nanoweave', 'Nanoweave', '#cfd8e0', '#66ccff', [2, 4, 2], { energyCost: -0.15 }, '-15% energy cost', { head: { maxEnergy: 40 }, body: { maxEnergy: 20, energyDmg: 0.05 }, legs: { energyDmg: 0.05 } }, 2, { names: ['Hood', 'Robe', 'Leggings'] });
armorSet('cryonite', 'Cryonite', '#7ff0ff', '#2a7a8a', [7, 8, 7], { allDmg: 0.1, coldImmune: 1 }, '+10% damage, immune to Chill', { head: { rangedDmg: 0.07 }, body: { crit: 5 }, legs: { moveSpeed: 0.07 } }, 5);
armorSet('plasmite', 'Plasmite', '#ff3fa4', '#8a1150', [8, 9, 8], { meleeDmg: 0.1, crit: 10, plasmaResist: 1 }, '+10% melee damage, +10% crit, plasma resistance', { head: { meleeSpeed: 0.07 }, body: { meleeDmg: 0.07 }, legs: { meleeSpeed: 0.07 } }, 6);
armorSet('neutronium', 'Neutronium', '#5a78ff', '#1d2a7a', [11, 13, 10], { allDmg: 0.15, moveSpeed: 0.1 }, '+15% damage, +10% move speed', { head: { crit: 6 }, body: { allDmg: 0.06 }, legs: { moveSpeed: 0.1 } }, 7);
armorSet('exalted', 'Exalted', '#ffe8a8', '#c9a640', [13, 15, 11], { dodge: 0.1 }, '10% chance to phase through an attack', { head: { allDmg: 0.1 }, body: { crit: 7 }, legs: { moveSpeed: 0.08, allDmg: 0.07 } }, 7);
armorSet('chronite', 'Chronite', '#3dffb0', '#118a5a', [16, 18, 14], { lifeRegen: 3, allDmg: 0.1 }, '+3 integrity regen, +10% damage', { head: { crit: 10 }, body: { allDmg: 0.1 }, legs: { moveSpeed: 0.12 } }, 8);
armorSet('aetherium', 'Aetherium', '#fff1a8', '#9a8a3a', [20, 22, 16], { lifesteal: 0.04, damageReduce: 0.1 }, 'Attacks siphon integrity, 10% damage reduction', { head: { allDmg: 0.12 }, body: { crit: 10, minions: 1 }, legs: { moveSpeed: 0.15, maxEnergy: 40 } }, 9);
armorSet('singularity', 'Singularity', '#d0a0ff', '#6a3aa8', [26, 30, 22], { allDmg: 0.2, lifeRegen: 4, minions: 2 }, '+20% damage, +4 regen, +2 drones', { head: { crit: 15 }, body: { allDmg: 0.15 }, legs: { moveSpeed: 0.2 } }, 10);

// ---------------- accessories ----------------
const acc = (key, name, stats, icon, value, rarity = 1, tip = '') => item(key, { name, type: 'accessory', stats, icon, value, rarity, tip });
acc('hydraulic_boots', 'Hydraulic Boots', { runSpeed: 2.5 }, { s: 'boots', c: '#66ccff', c2: '#44607e' }, 5000, 1, 'Run much faster');
acc('rocket_boots', 'Rocket Boots', { rocket: 60 }, { s: 'boots', c: '#ff6a3d', c2: '#8a2a12' }, 6000, 1, 'Hold jump in the air to fly briefly');
acc('jet_boots', 'Jet Boots', { runSpeed: 3, rocket: 80 }, { s: 'boots', c: '#ffb12e', c2: '#8a6a2e' }, 15000, 3, 'Fast running and rocket flight');
acc('jump_module', 'Jump Module', { doubleJump: 1 }, { s: 'module', c: '#e8f6ff', c2: '#66ccff' }, 5000, 1, 'Grants a double jump');
acc('grav_bubble', 'Grav Bubble', { jumpBoost: 1.35 }, { s: 'orb', c: '#ff9ee8', c2: '#ffffff' }, 4000, 1, 'Increases jump height');
acc('lift_harness', 'Lift Harness', { doubleJump: 1, jumpBoost: 1.35 }, { s: 'module', c: '#ff9ee8', c2: '#66ccff' }, 12000, 2, 'Double jump and higher jumps');
acc('shock_absorbers', 'Shock Absorbers', { noFall: 1 }, { s: 'boots', c: '#aeb7c2', c2: '#555' }, 4000, 1, 'Negates fall damage');
acc('kinetic_shield', 'Kinetic Shield', { kbImmune: 1, defense: 1 }, { s: 'shield', c: '#66ccff', c2: '#44607e' }, 8000, 2, 'Immune to knockback');
acc('bulwark', 'Bulwark Array', { kbImmune: 1, noFall: 1, defense: 4 }, { s: 'shield', c: '#ffcc33', c2: '#8a6a2e' }, 20000, 3, 'Knockback & fall immunity');
acc('gecko_gloves', 'Gecko Gloves', { wallClimb: 1 }, { s: 'glove', c: '#7dff5a', c2: '#3a8a2a' }, 8000, 2, 'Slide down and jump off walls');
acc('hover_soles', 'Hover Soles', { waterWalk: 1 }, { s: 'boots', c: '#9ff4ff', c2: '#2a7a8a' }, 6000, 2, 'Walk on liquids');
acc('hydro_fins', 'Hydro Fins', { swim: 1 }, { s: 'feather', c: '#4ad9ff', c2: '#1a6a8a' }, 3000, 1, 'Swim freely');
acc('magnet_module', 'Magnet Module', { magnet: 1 }, { s: 'magnet', c: '#ff3355', c2: '#aeb7c2' }, 6000, 1, 'Increased pickup range');
acc('regen_band', 'Regen Band', { lifeRegen: 1 }, { s: 'band', c: '#ff5a8a', c2: '#8a1150' }, 5000, 1, 'Slowly regenerate integrity');
acc('energy_band', 'Energy Band', { maxEnergy: 20, energyRegen: 3 }, { s: 'band', c: '#a46bff', c2: '#4b2a8a' }, 5000, 1, '+20 max energy');
acc('overclock_chip', 'Overclock Chip', { allDmg: 0.04 }, { s: 'chip', c: '#ff3355', c2: '#ffcc33' }, 8000, 2, '+4% damage');
acc('precision_chip', 'Precision Chip', { crit: 4 }, { s: 'chip', c: '#3dff6a', c2: '#ffcc33' }, 8000, 2, '+4% critical chance');
acc('power_glove', 'Power Glove', { meleeSpeed: 0.12, meleeKnock: 1 }, { s: 'glove', c: '#ff8a3d', c2: '#8a4421' }, 10000, 2, '+12% melee speed, more knockback');
acc('targeting_scope', 'Targeting Scope', { rangedDmg: 0.1, crit: 6 }, { s: 'scope', c: '#555', c2: '#ff3355' }, 15000, 3, '+10% ranged damage');
acc('thorn_plating', 'Thorn Plating', { thorns: 0.5 }, { s: 'shield', c: '#5aff6a', c2: '#3a8a2a' }, 8000, 2, 'Attackers take damage');
acc('medkit_core', 'Medkit Core', { stimCooldown: -0.25 }, { s: 'core', c: '#ff5a8a', c2: '#ffffff' }, 20000, 3, 'Shorter stim cooldown');
acc('depth_meter', 'Depth Meter', { info_depth: 1 }, { s: 'meter', c: '#aeb7c2', c2: '#66ccff' }, 2000, 0, 'Shows depth');
acc('chrono_display', 'Chrono Display', { info_time: 1 }, { s: 'meter', c: '#f2dd7a', c2: '#ff3355' }, 2000, 0, 'Shows time');
acc('gps_module', 'GPS Module', { info_depth: 1, info_time: 1, info_pos: 1 }, { s: 'meter', c: '#3dff6a', c2: '#66ccff' }, 8000, 2, 'Shows position, depth and time');
acc('radar', 'Threat Radar', { info_radar: 1 }, { s: 'meter', c: '#ff3355', c2: '#3dff6a' }, 4000, 1, 'Counts nearby hostiles');
acc('ore_scanner', 'Ore Detector', { info_ore: 1 }, { s: 'meter', c: '#ffcc33', c2: '#555' }, 4000, 1, 'Detects the most valuable ore nearby');
acc('data_pad', 'Data Pad', { info_depth: 1, info_time: 1, info_pos: 1, info_radar: 1, info_ore: 1, info_dps: 1 }, { s: 'meter', c: '#d0a0ff', c2: '#2ef2ff' }, 25000, 4, 'Displays everything');
acc('mining_gauntlet', 'Mining Gauntlet', { mineSpeed: 0.25 }, { s: 'glove', c: '#f2dd7a', c2: '#8f7a2a' }, 6000, 1, '+25% mining speed');
acc('tool_belt', 'Tool Belt', { reach: 2 }, { s: 'band', c: '#8a5a3a', c2: '#aeb7c2' }, 3000, 1, '+2 block reach');
acc('glow_drone', 'Glow Drone', { light: 1 }, { s: 'drone', c: '#fff0c0', c2: '#66ccff' }, 5000, 1, 'A small drone lights your way');
acc('phase_dash', 'Phase Dash Module', { dash: 1 }, { s: 'module', c: '#3dffb0', c2: '#118a5a' }, 15000, 3, 'Adds a Dash button');
acc('plasma_ward', 'Plasma Ward', { plasmaWard: 1 }, { s: 'core', c: '#ff5a2a', c2: '#ffb12e' }, 10000, 2, 'Brief immunity to plasma');
acc('thermal_regulator', 'Thermal Regulator', { coldImmune: 1, burnImmune: 1 }, { s: 'core', c: '#9ff4ff', c2: '#ff5a2a' }, 15000, 3, 'Immune to Chill and Plasma Burn');
acc('nano_mender', 'Nano Mender', { lifesteal: 0.02 }, { s: 'band', c: '#ff3355', c2: '#d0a0ff' }, 40000, 5, 'Attacks siphon integrity');
acc('phase_cloak', 'Phase Cloak', { dodge: 0.08 }, { s: 'cloth', c: '#9ff4e8', c2: '#5a78ff' }, 40000, 5, '8% chance to phase through attacks');
acc('berserker_core', 'Berserker Core', { berserk: 1 }, { s: 'core', c: '#ff3355', c2: '#8a1150' }, 40000, 5, 'More damage at low integrity');
acc('star_veil', 'Star Veil', { immuneTime: 0.5 }, { s: 'cloth', c: '#fff38a', c2: '#5a78ff' }, 40000, 5, 'Longer invulnerability after a hit');
acc('void_band', 'Void Band', { energyCost: -0.08, maxEnergy: 20 }, { s: 'band', c: '#b06bff', c2: '#3a2a4f' }, 30000, 4, '-8% energy cost');
acc('melee_emblem', 'Assault Emblem', { meleeDmg: 0.15 }, { s: 'emblem', c: '#ff8a3d', c2: '#8a4421' }, 30000, 4, '+15% melee damage');
acc('ranged_emblem', 'Marksman Emblem', { rangedDmg: 0.15 }, { s: 'emblem', c: '#3dff6a', c2: '#118a5a' }, 30000, 4, '+15% ranged damage');
acc('energy_emblem', 'Arcwright Emblem', { energyDmg: 0.15 }, { s: 'emblem', c: '#a46bff', c2: '#4b2a8a' }, 30000, 4, '+15% energy damage');
acc('summon_emblem', 'Swarmlord Emblem', { summonDmg: 0.15 }, { s: 'emblem', c: '#66ccff', c2: '#44607e' }, 30000, 4, '+15% summon damage');
acc('overcharger', 'Overcharger', { allDmg: 0.1, crit: 8 }, { s: 'emblem', c: '#ff3355', c2: '#ffe8a8' }, 60000, 5, '+10% damage, +8% crit');
acc('sovereign_core', 'Sovereign Core', { jumpBoost: 1.2, defense: 2 }, { s: 'gel', c: '#4ad9ff' }, 8000, 2, 'Bouncy. Higher jumps.');
acc('optic_shield', 'Optic Shield', { kbImmune: 1, defense: 2, dash: 1 }, { s: 'shield', c: '#ff3355', c2: '#ffffff' }, 30000, 4, 'Dash into enemies; knockback immunity');
acc('swarm_cloak', 'Swarm Cloak', { swarmRetaliate: 1 }, { s: 'cloth', c: '#ffcc33', c2: '#c29a2a' }, 12000, 3, 'Releases hornets when hit');
acc('archon_crown', 'Archon Crown', { minions: 1, summonDmg: 0.05 }, { s: 'emblem', c: '#66ccff', c2: '#ffe27a' }, 20000, 3, '+1 drone slot');
for (const [k, n, f, sp, r] of [['jetpack_mk1', 'Jetpack Mk I', 100, 6, 5], ['jetpack_mk2', 'Jetpack Mk II', 130, 6.5, 5], ['jetpack_mk3', 'Jetpack Mk III', 160, 7, 6], ['jetpack_mk4', 'Jetpack Mk IV', 190, 8, 7], ['singularity_wings', 'Singularity Wings', 260, 9.5, 10]]) {
  acc(k, n, { flight: f, flightSpeed: sp, noFall: 1 }, { s: 'wings', c: ['#aeb7c2', '#5a78ff', '#3dffb0', '#fff1a8', '#d0a0ff'][['jetpack_mk1', 'jetpack_mk2', 'jetpack_mk3', 'jetpack_mk4', 'singularity_wings'].indexOf(k)], c2: '#555' }, 50000 * r, r, 'Hold jump to fly');
}

// ---------------- hooks ----------------
const hook = (key, name, range, speed, color, value, rarity) => item(key, { name, type: 'hook', hookRange: range, hookSpeed: speed, icon: { s: 'hook', c: color }, value, rarity, tip: 'Equip in the Hook slot, then use the Hook button' });
hook('grapple_hook', 'Grapple Hook', 18, 12, '#aeb7c2', 2000, 1);
hook('lumen_hook', 'Lumen Hook', 22, 14, '#a46bff', 6000, 2);
hook('cryo_hook', 'Cryo Hook', 26, 15, '#7ff0ff', 10000, 3);
hook('plasma_hook', 'Plasma Hook', 30, 16, '#ff3fa4', 20000, 4);
hook('neutron_hook', 'Neutron Hook', 34, 18, '#5a78ff', 40000, 5);
hook('gravity_hook', 'Gravity Hook', 42, 22, '#d0a0ff', 100000, 8);

// ---------------- consumables ----------------
const cons = (key, name, consume, icon, value, rarity = 0, tip = '', extra = {}) => item(key, Object.assign({ name, type: 'consumable', useStyle: 'consume', useTime: 17, consume, icon, value, rarity, tip, stack: 99 }, extra));
cons('micro_stim', 'Micro Stim', { heal: 50, sick: 60 }, { s: 'stim', c: '#ff5a8a' }, 300, 0, 'Restores 50 integrity');
cons('stim_pack', 'Stim Pack', { heal: 100, sick: 60 }, { s: 'stim', c: '#ff3355' }, 1000, 1, 'Restores 100 integrity');
cons('mega_stim', 'Mega Stim', { heal: 150, sick: 60 }, { s: 'stim', c: '#ff3ddc' }, 2500, 3, 'Restores 150 integrity');
cons('omni_stim', 'Omni Stim', { heal: 200, sick: 60 }, { s: 'stim', c: '#d0a0ff' }, 5000, 7, 'Restores 200 integrity');
cons('charge_cell', 'Charge Cell', { energy: 60 }, { s: 'cell', c: '#a46bff', c2: '#333' }, 200, 0, 'Restores 60 energy');
cons('greater_cell', 'Greater Charge Cell', { energy: 140 }, { s: 'cell', c: '#5a78ff', c2: '#333' }, 600, 2, 'Restores 140 energy');
cons('ration_bar', 'Ration Bar', { buff: 'well_fed', time: 60 * 60 * 10 }, { s: 'bar', c: '#ffb070', c2: '#8a5a3a' }, 200, 0, 'Minor improvements to all stats');
const INJ = [
  ['plating', 'Plating Injector', '#aeb7c2', 4], ['regen', 'Regen Injector', '#ff5a8a', 8], ['swift', 'Swiftness Injector', '#66ccff', 4],
  ['optic', 'Optic Injector', '#9dff3d', 4], ['mining', 'Overdrive Injector', '#f2dd7a', 8], ['feather', 'Dampener Injector', '#e8f6ff', 3],
  ['ballistic', 'Ballistic Injector', '#ffe08a', 4], ['energized', 'Energy Injector', '#a46bff', 6], ['thorns', 'Thorn Injector', '#5aff6a', 6],
  ['scanner', 'Scanner Injector', '#ffcc33', 5], ['hunter', 'Hunter Injector', '#ff8a3d', 5], ['shine', 'Luminance Injector', '#fff0c0', 5],
  ['builder', 'Builder Injector', '#c9a640', 15], ['wrath', 'Wrath Injector', '#ff3355', 4], ['rage', 'Rage Injector', '#ff3ddc', 4],
  ['endurance', 'Endurance Injector', '#8a8f99', 4], ['lifeforce', 'Lifeforce Injector', '#ff5a8a', 8], ['plasma_ward', 'Plasma Ward Injector', '#ff5a2a', 4],
  ['calm', 'Dampener Signal', '#8fb8ff', 5], ['battle', 'Beacon Signal', '#ff8fa8', 7],
];
for (const [b, n, c, min] of INJ) cons(b + '_inj', n, { buff: b, time: 60 * 60 * min }, { s: 'injector', c }, 400, 1, '');
cons('vital_core', 'Vital Core', { maxLife: 20, cap: 400 }, { s: 'heart', c: '#ff3355' }, 7500, 2, 'Permanently +20 max integrity (up to 400)');
cons('energy_matrix', 'Energy Matrix', { maxEnergy: 20, cap: 200 }, { s: 'star', c: '#a46bff', c2: '#5a78ff' }, 5000, 2, 'Permanently +20 max energy (up to 200)');
cons('overcharge_capsule', 'Overcharge Capsule', { maxLife: 5, cap: 500, needs: 400 }, { s: 'heart', c: '#ffcc33' }, 15000, 6, 'Permanently +5 max integrity (400 to 500)');
cons('expansion_port', 'Expansion Port', { accSlot: 1 }, { s: 'chip', c: '#d0a0ff', c2: '#2ef2ff' }, 50000, 5, 'Permanently unlocks a 6th accessory slot', { stack: 1 });
cons('recall_inj', 'Recall Injector', { recall: 1 }, { s: 'injector', c: '#2ef2ff' }, 300, 1, 'Teleports you home');
item('recall_device', { name: 'Recall Device', type: 'tool', useStyle: 'hold', useTime: 90, recall: true, icon: { s: 'meter', c: '#2ef2ff', c2: '#ffffff' }, value: 10000, rarity: 2, tip: 'Hold to teleport home. Reusable.' });
item('demo_charge', { name: 'Demo Charge', type: 'weapon', useStyle: 'throw', shoot: 'demo_charge', shootSpeed: 5, consumeSelf: true, damage: 80, dmgType: 'ranged', useTime: 40, stack: 99, icon: { s: 'bomb', c: '#c0c4cc', c2: '#ff3355' }, value: 300, tip: 'Destroys nearby tiles' });

// boss & event summons
const sum = (key, name, boss, icon, value, rarity, tip, extra = {}) => item(key, Object.assign({ name, type: 'consumable', useStyle: 'consume', useTime: 40, consume: { summon: boss }, icon, value, rarity, tip, stack: 20 }, extra));
sum('optic_lure', 'Optic Lure', 'overseer', { s: 'lens', c: '#ff3355', c2: '#ffffff' }, 2000, 1, 'Summons the Overseer. Use at night.');
sum('gel_beacon', 'Gel Beacon', 'gel_sovereign', { s: 'gel', c: '#4ad9ff' }, 2000, 1, 'Summons the Gel Sovereign');
sum('corrupt_datachip', 'Corrupted Datachip', 'data_wyrm', { s: 'chip', c: '#b06bff', c2: '#5b5770' }, 3000, 2, 'Summons the Data Wyrm. Use in the Blight.');
sum('pheromone_chip', 'Pheromone Chip', 'swarm_mother', { s: 'chip', c: '#ffcc33', c2: '#c29a2a' }, 3000, 2, 'Summons the Swarm Mother. Use in the Overgrowth.');
sum('archon_key', 'Archon Override', 'archon', { s: 'key', c: '#66ccff' }, 4000, 2, 'Summons the Archon. Use at night.');
sum('core_override', 'Core Override Key', 'core_warden', { s: 'key', c: '#ff5a2a' }, 8000, 3, 'Summons the Core Warden. Use in the Reactor Core.');
sum('mech_optic', 'Mechanical Optic', 'twin_lancers', { s: 'lens', c: '#3dff6a', c2: '#aeb7c2' }, 20000, 5, 'Summons the Twin Lancers. Use at night.');
sum('mech_worm', 'Mechanical Worm Chip', 'leviathan', { s: 'chip', c: '#ff3355', c2: '#aeb7c2' }, 20000, 5, 'Summons the Leviathan. Use at night.');
sum('mech_skull', 'Mechanical Skull', 'prime_archon', { s: 'skull', c: '#aeb7c2', c2: '#ff3355' }, 20000, 5, 'Summons Prime Archon. Use at night.');
sum('power_cell', 'Power Cell', 'gravity_golem', { s: 'cell', c: '#ffaa22', c2: '#8a6a2e' }, 30000, 7, 'Use at the Ancient Altar deep in the Overgrowth temple.');
sum('architect_sigil', 'Architect Sigil', 'architect', { s: 'emblem', c: '#d0a0ff', c2: '#2ef2ff' }, 100000, 9, 'Summons the Architect. The end of all things.');
sum('signal_flare', 'Signal Flare', 'invasion_drones', { s: 'flare', c: '#ff3355' }, 3000, 1, 'Calls a Drone Invasion');
sum('red_shift_beacon', 'Red Shift Beacon', 'event_redshift', { s: 'flare', c: '#ff2244' }, 5000, 2, 'Starts a Red Shift at night');
sum('eclipse_lens', 'Eclipse Lens', 'event_eclipse', { s: 'lens', c: '#ffb12e', c2: '#222' }, 20000, 5, 'Starts a Solar Flare during the day');

export const DEFAULT_START = [
  ['scrap_knife', 1], ['scrap_pick', 1], ['scrap_cutter', 1], ['glowstick', 15], ['micro_stim', 3],
];

// Rarity for unlisted items: infer from value.
for (const it of ITEM_LIST) {
  if (!it.rarity && it.value > 20000) it.rarity = 3;
}

export function itemDef(k) { return ITEMS[k]; }

// ---------------- fishing ----------------
const rod = (key, name, power, color, value, rarity, extra = {}) => item(key, Object.assign({ name, type: 'tool', useStyle: 'shoot', useTime: 12, fishing: power, shoot: 'bobber', shootSpeed: 8, icon: { s: 'rod', c: color }, value, rarity, tip: `${power}% fishing power. Needs bait. Tap again to reel in when the bobber dips.` }, extra));
rod('fiber_rod', 'Fiber Rod', 10, '#a88f72', 300, 0);
rod('ferrite_rod', 'Ferrite Rod', 20, '#aeb7c2', 1500, 1);
rod('titanite_rod', 'Titanite Rod', 30, '#f2dd7a', 4000, 2);
rod('lumen_rod', 'Lumen Rod', 40, '#a46bff', 8000, 3);
rod('cryo_rod', 'Cryo Rod', 50, '#7ff0ff', 15000, 4);
rod('plasmite_rod', 'Plasmite Rod', 60, '#ff3fa4', 25000, 5, { plasmaFishing: true, tip: '60% fishing power. Can fish in plasma.' });
rod('aether_rod', 'Aether Rod', 75, '#fff1a8', 60000, 8, { plasmaFishing: true, tip: '75% fishing power. Can fish in plasma.' });
const bait = (key, name, power, color, value, rarity = 0) => item(key, { name, type: 'material', bait: power, icon: { s: 'grub', c: color }, value, rarity, stack: 999, tip: `${power}% bait power` });
bait('bio_worm', 'Bio Worm', 15, '#ff8fa8', 50);
bait('glow_grub', 'Glow Grub', 30, '#9dff3d', 150, 1);
bait('nano_larva', 'Nano Larva', 50, '#ffcc33', 400, 2);
export const FISH = [
  // key, name, color, value, rarity, where: { biomes, layers, liquid, minPower, hard, night }
  ['coolant_carp', 'Coolant Carp', '#4ad9ff', 120, 0, {}],
  ['neon_tetra', 'Neon Tetra', '#2ef2ff', 250, 1, { biomes: ['plains', 'jungle'] }],
  ['ripple_bass', 'Ripple Bass', '#5a9a6a', 200, 0, { layers: ['surface'] }],
  ['chrome_tuna', 'Chrome Tuna', '#aeb7c2', 400, 1, { biomes: ['ocean'] }],
  ['abyssal_ray', 'Abyssal Ray', '#3a2a6f', 2500, 3, { biomes: ['ocean'], minPower: 40 }],
  ['dune_eel', 'Dune Eel', '#c7854f', 350, 1, { biomes: ['desert'] }],
  ['frost_trout', 'Frost Trout', '#bde6ff', 350, 1, { biomes: ['snow'] }],
  ['spore_pike', 'Spore Pike', '#a8ff3a', 450, 1, { biomes: ['jungle'] }],
  ['glitch_fish', 'Glitch Fish', '#b06bff', 600, 2, { biomes: ['blight'] }],
  ['prism_koi', 'Prism Koi', '#ff9ee8', 1500, 3, { biomes: ['prism'], hard: true }],
  ['cave_lumen', 'Cave Lumenfish', '#3ff0ff', 500, 1, { layers: ['underground', 'cavern'] }],
  ['void_angler', 'Void Angler', '#5a4a8a', 1800, 3, { layers: ['cavern'], minPower: 35 }],
  ['data_shark', 'Data Shark', '#66ccff', 6000, 5, { biomes: ['ocean'], minPower: 60, hard: true }],
  ['magma_eel', 'Magma Eel', '#ff5a2a', 2000, 4, { liquid: 'plasma' }],
  ['core_kraken', 'Core Kraken Larva', '#ff3fa4', 8000, 6, { liquid: 'plasma', minPower: 70, hard: true }],
  ['moon_minnow', 'Moon Minnow', '#e8e0ff', 900, 2, { night: true }],
];
for (const [k, n, c, v, r] of FISH) item(k, { name: n, icon: { s: 'fish', c }, value: v, rarity: r, tip: 'A fish. Sell it, or process it at a Synth Vat.' });
cons('supply_crate', 'Supply Crate', { crate: 1 }, { s: 'crate', c: '#8a6b55', c2: '#aeb7c2' }, 1000, 1, 'Use to open', { stack: 99 });
cons('ferrite_crate', 'Ferrite Crate', { crate: 2 }, { s: 'crate', c: '#aeb7c2', c2: '#59616c' }, 3000, 2, 'Use to open', { stack: 99 });
cons('titanite_crate', 'Titanite Crate', { crate: 3 }, { s: 'crate', c: '#f2dd7a', c2: '#8f7a2a' }, 8000, 3, 'Use to open', { stack: 99 });
cons('fish_ration', 'Fish Ration', { buff: 'well_fed', time: 60 * 60 * 15 }, { s: 'fish', c: '#ffb070' }, 300, 0, 'Minor improvements to all stats');
cons('sonar_inj', 'Sonar Injector', { buff: 'sonar', time: 60 * 60 * 6 }, { s: 'injector', c: '#4ad9ff' }, 500, 1, 'Shows what is biting');
cons('fishing_inj', 'Angler Injector', { buff: 'angler', time: 60 * 60 * 8 }, { s: 'injector', c: '#66ccff' }, 500, 1, '+15 fishing power');
acc('tackle_box', 'Tackle Box', { baitSave: 0.5 }, { s: 'crate', c: '#5a6b8a', c2: '#ffcc33' }, 15000, 2, '50% chance to keep bait');
acc('angler_band', 'Angler Band', { fishingPower: 10 }, { s: 'band', c: '#4ad9ff', c2: '#2ef2ff' }, 15000, 2, '+10 fishing power');

// ---------------- vehicles ----------------
// Equip in the Vehicle slot, then tap RIDE. Each type has its own handling (see game/vehicles.js).
export const VEHICLES = {
  hoverbike: { w: 38, h: 26, speed: 9, mode: 'hover', stats: { defense: 4 }, color: '#2ef2ff', c2: '#3a3d46', ram: 20 },
  skycar: { w: 54, h: 26, speed: 8, mode: 'fly', antigrav: 34, stats: { defense: 8 }, color: '#ff3ddc', c2: '#2a2a3a', ram: 30 },
  drillpod: { w: 30, h: 30, speed: 2.4, mode: 'drill', drill: 70, stats: { defense: 14 }, color: '#f2dd7a', c2: '#59616c', ram: 0 },
  mech: { w: 40, h: 58, speed: 3.4, mode: 'walk', jump: 9, stats: { defense: 30, kbImmune: 1 }, color: '#5a6b7a', c2: '#ff3355', gun: { proj: 'mech_shell', dmg: 75, cd: 16, speed: 13 }, ram: 0 },
  starjumper: { w: 58, h: 28, speed: 12, mode: 'fly', antigrav: 0, stats: { defense: 20, plasmaImmune: 1 }, color: '#d0a0ff', c2: '#1a1030', gun: { proj: 'star_missile', dmg: 110, cd: 22, speed: 9 }, ram: 60 },
};
const veh = (key, name, icon, value, rarity, tip) => item(key, { name, type: 'vehicle', vehicle: key, icon, value, rarity, tip });
veh('hoverbike', 'Scrap Hoverbike', { s: 'bike', c: '#2ef2ff', c2: '#3a3d46' }, 15000, 2, 'Glides over ground and liquid at high speed. Ram enemies. No fall damage.');
veh('skycar', 'Aerodyne Sky Car', { s: 'car', c: '#ff3ddc', c2: '#2a2a3a' }, 60000, 4, 'A flying car. Its antigrav field works up to 34 tiles above solid ground.');
veh('drillpod', 'Bore Pod', { s: 'pod', c: '#f2dd7a', c2: '#59616c' }, 30000, 3, 'Drives through solid rock, mining everything in its path (70% power).');
veh('mech', 'Titan Walker Mech', { s: 'mech', c: '#5a6b7a', c2: '#ff3355' }, 150000, 6, 'Heavy combat mech: +30 defense, stomps, and an explosive cannon (tap to fire).');
veh('starjumper', 'Starjumper Shuttle', { s: 'ship', c: '#d0a0ff', c2: '#1a1030' }, 400000, 9, 'Unlimited flight anywhere, even through plasma. Fires homing star missiles.');

// ---------------- cyberware implants ----------------
// Installed into body slots at a Surgery Bay. Total cost is limited by cyberware capacity.
export const IMPLANT_SLOTS = ['neural', 'optic', 'arms', 'spine', 'legs', 'core'];
export const IMPLANT_SLOT_NAMES = { neural: 'Neural', optic: 'Optics', arms: 'Arms', spine: 'Spine', legs: 'Legs', core: 'Core' };
const imp = (key, name, slot, cost, stats, color, value, rarity, tip, extra = {}) => item(key, Object.assign({ name, type: 'implant', slot, cost, stats, icon: { s: 'implant_' + slot, c: color }, value, rarity, tip }, extra));
imp('reflex_booster', 'Reflex Booster', 'neural', 6, { crit: 5 }, '#3dffb0', 40000, 4, 'AUG: Time Dilation — the world slows to a crawl for 4s.', { active: 'timedilation', cooldown: 30 * 60 });
imp('tactical_link', 'Tactical Link', 'neural', 4, { minions: 1, summonDmg: 0.1 }, '#66ccff', 25000, 3, 'AUG: Drone Command — your drones deal double damage for 6s.', { active: 'dronecommand', cooldown: 25 * 60 });
imp('hack_uplink', 'Hack Uplink', 'neural', 5, { energyDmg: 0.05 }, '#9dff3d', 35000, 3, 'AUG: Override — hijack the nearest machine; it fights for you for 20s.', { active: 'override', cooldown: 35 * 60 });
imp('overdrive_chip', 'Overdrive Chip', 'neural', 7, { allDmg: 0.05 }, '#ff3355', 90000, 6, 'AUG: Overdrive — +40% damage and speed for 8s.', { active: 'overdrive', cooldown: 40 * 60 });
imp('thermal_optics', 'Thermal Optics', 'optic', 2, { hunter: 1, nightVision: 1 }, '#ff8a3d', 8000, 2, 'See heat signatures: enemies highlighted, see in the dark.');
imp('ore_lens', 'Prospector Lens', 'optic', 2, { scanner: 1 }, '#ffcc33', 8000, 2, 'Ores and treasure glow through rock.');
imp('zoom_optics', 'Wide-Field Optics', 'optic', 3, { zoomOut: 0.3 }, '#2ef2ff', 15000, 3, 'See 30% more of the world.');
imp('targeting_optics', 'Targeting Optics', 'optic', 3, { rangedDmg: 0.1, crit: 8 }, '#ff3355', 30000, 4, 'Ballistic overlay for marksmen.');
imp('mantis_blades', 'Mantis Blades', 'arms', 5, { meleeSpeed: 0.1 }, '#ff6a3d', 25000, 4, 'Forearm blades. Attack with an empty hotbar slot to slash (scales with progress).', { mantis: true });
imp('gorilla_arms', 'Gorilla Arms', 'arms', 4, { mineSpeed: 0.25, meleeDmg: 0.15, meleeKnock: 1 }, '#aeb7c2', 15000, 3, 'Hydraulic arms: dig faster, punch harder.');
imp('grapple_arm', 'Grapple Arm', 'arms', 3, {}, '#d8dde4', 12000, 2, 'A built-in grappling hook (30 tiles) when no hook is equipped.', { builtinHook: { hookRange: 30, hookSpeed: 17 } });
imp('launcher_arm', 'Launcher Arm', 'arms', 4, { rangedDmg: 0.05 }, '#ffb12e', 40000, 5, 'Shoulder pod auto-fires micro-missiles at nearby enemies.', { autoMissile: true });
imp('exo_spine', 'Exo-Spine', 'spine', 4, { defense: 8, kbImmune: 1 }, '#59616c', 15000, 3, 'Carbon-steel vertebrae.');
imp('synth_muscle', 'Synthetic Muscle', 'spine', 3, { moveSpeed: 0.2, runSpeed: 1.5 }, '#ff5a8a', 12000, 2, 'Faster in every way.');
imp('shock_spine', 'Shock Spine', 'spine', 3, { thorns: 1.0 }, '#e8ff4a', 20000, 3, 'Discharges into anything that touches you.');
imp('spring_legs', 'Spring Legs', 'legs', 3, { doubleJump: 1, jumpBoost: 1.4, noFall: 1 }, '#66ccff', 10000, 2, 'Pneumatic legs: double jump, high jumps, no fall damage.');
imp('kinetic_legs', 'Kinetic Legs', 'legs', 4, { dash: 1, stomp: 1 }, '#3dffb0', 20000, 3, 'Dash, and crush enemies by landing on them.');
imp('mag_treads', 'Mag-Treads', 'legs', 3, { wallClimb: 1, waterWalk: 1 }, '#8a8f99', 18000, 3, 'Grip walls and walk on liquids.');
imp('nano_heart', 'Nano-Heart', 'core', 6, { lifeRegen: 1 }, '#ff3355', 45000, 4, 'Reboots you at 50% integrity when destroyed (once every 5 minutes).', { revive: true });
imp('fusion_core', 'Micro-Fusion Core', 'core', 4, { maxEnergy: 40, energyRegen: 6 }, '#a46bff', 25000, 3, 'Clean energy for your energy weapons.');
imp('bio_monitor', 'Bio-Monitor', 'core', 3, { lifeRegen: 3, stimCooldown: -0.2 }, '#3dff6a', 15000, 3, 'Automated nanite repairs.');
imp('overclock_core', 'Overclocked Core', 'core', 5, { allDmg: 0.08, crit: 4 }, '#ff3ddc', 80000, 6, 'Runs hot. Hits harder.');
furnItem('surgery_bay', { name: 'Surgery Bay', stack: 99, value: 5000, tip: 'Stand near it to install or remove cyberware implants' });
// Internal: the attack performed by Mantis Blades with an empty hotbar slot.
item('mantis_strike', { name: 'Mantis Strike', type: 'weapon', dmgType: 'melee', useStyle: 'swing', damage: 18, useTime: 11, size: 30, knock: 4, crit: 10, icon: { s: 'blade', c: '#ff6a3d', c2: '#8a2a12' }, hidden: true });

// ---------------- futuristic weapons & tech ----------------
const techw = (key, d) => item(key, Object.assign({ type: 'weapon', useStyle: 'shoot', crit: 4, knock: 2 }, d));
techw('photon_lance', { name: 'Photon Lance', dmgType: 'energy', damage: 14, useTime: 5, energyCost: 1, tech: { kind: 'beam', range: 24, rate: 5, color: '#a46bff', width: 2 }, icon: { s: 'raygun', c: '#a46bff', c2: '#4b2a8a' }, value: 12000, rarity: 3, tip: 'Hold to sustain a continuous photon beam.' });
techw('graviton_ray', { name: 'Graviton Ray', dmgType: 'energy', damage: 42, useTime: 4, energyCost: 2, tech: { kind: 'beam', range: 30, rate: 4, pierce: 3, pull: true, color: '#3dffb0', width: 3 }, icon: { s: 'raygun', c: '#3dffb0', c2: '#118a5a' }, value: 60000, rarity: 7, tip: 'A piercing beam that drags enemies toward you.' });
techw('coilgun', { name: 'Coilgun', dmgType: 'ranged', damage: 80, useTime: 20, energyCost: 6, tech: { kind: 'charge', max: 60, speed: 18, proj: 'coil_slug', fullProj: 'coil_slug', color: '#66ccff', cooldown: 12 }, icon: { s: 'sniper', c: '#66ccff', c2: '#44607e' }, value: 20000, rarity: 4, tip: 'Hold to charge magnetic rails, release to fire. Full charge pierces deeper.' });
techw('tachyon_lance', { name: 'Tachyon Lance', dmgType: 'ranged', damage: 300, useTime: 20, energyCost: 12, tech: { kind: 'charge', max: 75, speed: 24, proj: 'coil_slug', fullProj: 'tachyon_slug', color: '#fff1a8', cooldown: 15 }, icon: { s: 'sniper', c: '#fff1a8', c2: '#9a8a3a' }, value: 90000, rarity: 8, tip: 'Charged tachyon shots phase straight through walls.' });
techw('gravity_gun', { name: 'Gravity Gun', dmgType: 'ranged', damage: 55, useTime: 10, energyCost: 3, tech: { kind: 'grab', range: 18, throwSpeed: 17, color: '#ff8a3d' }, icon: { s: 'raygun', c: '#ff8a3d', c2: '#59616c' }, value: 25000, rarity: 4, tip: 'Hold to lift an enemy, release to hurl it into walls and other enemies.' });
techw('wormhole_projector', { name: 'Wormhole Projector', dmgType: 'energy', damage: 0, useTime: 20, energyCost: 10, tech: { kind: 'portal', range: 40 }, icon: { s: 'raygun', c: '#66ccff', c2: '#ff8a3d' }, value: 40000, rarity: 5, tip: 'Tap twice to open a linked pair of wormholes. Walk into one to exit the other.' });
techw('monofilament_whip', { name: 'Monofilament Whip', dmgType: 'melee', damage: 17, useTime: 24, knock: 3, tech: { kind: 'whip', reach: 130, color: '#ff3ddc' }, icon: { s: 'cable', c: '#ff3ddc' }, value: 15000, rarity: 3, tip: 'A molecule-thin wire that slices everything in a long line.' });
techw('plasma_filament', { name: 'Plasma Filament', dmgType: 'melee', damage: 58, useTime: 20, knock: 4, onHit: { buff: 'burn', time: 240 }, tech: { kind: 'whip', reach: 170, color: '#ff5a2a' }, icon: { s: 'cable', c: '#ff5a2a' }, value: 70000, rarity: 7, tip: 'A superheated filament. Sets enemies ablaze.' });
ranged('smart_pistol', { name: 'Smart Pistol', damage: 9, useTime: 14, convertAmmo: 'smart_round', smartAim: true, icon: { s: 'pistol', c: '#2ef2ff', c2: '#3a3d46' }, value: 6000, rarity: 2, tip: 'Rounds lock onto the target nearest your aim.' });
weapon('black_hole_charge', { name: 'Black Hole Charge', type: 'weapon', dmgType: 'ranged', damage: 30, useTime: 45, useStyle: 'throw', shoot: 'black_hole', shootSpeed: 6, consumeSelf: true, stack: 99, icon: { s: 'grenade', c: '#1a1030', c2: '#d0a0ff' }, value: 600, rarity: 5, tip: 'Collapses into a micro black hole that devours nearby enemies.' });
summon('barrier_projector', { name: 'Hardlight Barrier', damage: 10, shoot: 'hardlight_wall', energyCost: 15, sentry: false, barrier: true, icon: { s: 'shield', c: '#2ef2ff', c2: '#ffffff' }, value: 12000, rarity: 3, tip: 'Projects a wall of solid light that blocks enemy fire (max 2).' });
tool('nano_disassembler', { name: 'Nano Disassembler', pick: 70, axe: 60, damage: 8, useTime: 14, area: 1, reach: 2, icon: { s: 'raygun', c: '#7ff0ff', c2: '#2a7a8a' }, value: 30000, rarity: 4, tip: 'Unbinds matter in a 3×3 area.' });
tool('matter_disassembler', { name: 'Matter Disassembler', pick: 160, axe: 120, damage: 24, useTime: 9, area: 1, reach: 4, icon: { s: 'raygun', c: '#3dffb0', c2: '#118a5a' }, value: 90000, rarity: 8, tip: 'Industrial-grade 3×3 matter disassembly.' });
furnItem('quantum_beacon', { name: 'Quantum Beacon', stack: 99, value: 4000, tip: 'Tap a beacon to teleport to any other beacon or your landing site.' });
item('memory_shard', { name: 'Memory Shard', icon: { s: 'shard', c: '#2ef2ff', c2: '#ff3ddc' }, value: 0, rarity: 3, tip: 'A recovered fragment of the Strata archive.' });
