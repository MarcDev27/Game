// Tile (foreground) and wall (background) registries.
import { METALS, WOODS, NEON_COLORS } from './materials.js';

export const TILES = [null];
export const T = {}; // key -> numeric id
export const WALLS = [null];
export const W = {};

function tile(key, p) {
  const d = Object.assign({
    key, id: TILES.length, name: key, solid: true, opaque: undefined, hp: 1, minPick: 0, tool: 'pick',
    drop: key, tex: null, light: null, map: '#888', furn: null,
  }, p);
  if (d.opaque === undefined) d.opaque = d.solid && !d.platform && !d.door;
  TILES.push(d);
  T[key] = d.id;
  return d;
}

function wall(key, p) {
  const d = Object.assign({ key, id: WALLS.length, name: key, drop: key, tex: null, map: '#333' }, p);
  WALLS.push(d);
  W[key] = d.id;
  return d;
}

// ---------- natural terrain ----------
tile('regolith', { name: 'Regolith', tex: { style: 'soil', c: '#6e5148' }, map: '#6e5148', soil: true });
tile('synthgrass', { name: 'Synthgrass', drop: 'regolith', grassOf: 'regolith', tex: { style: 'soil', c: '#6e5148', grass: '#2fe0a8' }, map: '#2fe0a8' });
tile('ferrocrete', { name: 'Ferrocrete', hp: 1.25, tex: { style: 'rock', c: '#6b7380' }, map: '#6b7380', stone: true });
tile('silica', { name: 'Silica Sand', tex: { style: 'sand', c: '#d9cfa1' }, map: '#d9cfa1', sand: true });
tile('rustsand', { name: 'Rust Sand', tex: { style: 'sand', c: '#c7854f' }, map: '#c7854f', sand: true, biome: 'desert' });
tile('rustrock', { name: 'Rustrock', hp: 1.3, tex: { style: 'strata', c: '#9a5b38' }, map: '#9a5b38', biome: 'desert' });
tile('frost', { name: 'Frost Powder', tex: { style: 'sand', c: '#e6f1fb' }, map: '#e6f1fb', biome: 'snow' });
tile('cryoice', { name: 'Cryo Ice', hp: 1.1, tex: { style: 'ice', c: '#9fd8ff' }, map: '#9fd8ff', biome: 'snow' });
tile('biogel', { name: 'Biogel', tex: { style: 'soil', c: '#4a3a52' }, map: '#4a3a52', biome: 'jungle' });
tile('glowmoss', { name: 'Glowmoss', drop: 'biogel', grassOf: 'biogel', tex: { style: 'soil', c: '#4a3a52', grass: '#a8ff3a' }, map: '#a8ff3a', light: [0.12, 0.2, 0.04], biome: 'jungle' });
tile('graymass', { name: 'Graymass', hp: 1.4, minPick: 0, tex: { style: 'goo', c: '#5b5770' }, map: '#5b5770', biome: 'blight', blight: true });
tile('grayturf', { name: 'Gray Turf', drop: 'regolith', grassOf: 'regolith', tex: { style: 'soil', c: '#6e5148', grass: '#b06bff' }, map: '#b06bff', biome: 'blight', blight: true });
tile('graysand', { name: 'Gray Sand', tex: { style: 'sand', c: '#7d7590' }, map: '#7d7590', biome: 'blight', blight: true, sand: true });
tile('prismstone', { name: 'Prism Stone', hp: 1.5, tex: { style: 'crystal', c: '#c9b5ff' }, map: '#c9b5ff', biome: 'prism', prism: true, light: [0.08, 0.05, 0.12] });
tile('prismturf', { name: 'Prism Turf', drop: 'regolith', grassOf: 'regolith', tex: { style: 'soil', c: '#6e5148', grass: '#ff9ee8' }, map: '#ff9ee8', biome: 'prism', prism: true });
tile('prismsand', { name: 'Pearl Sand', tex: { style: 'sand', c: '#f0dcf5' }, map: '#f0dcf5', biome: 'prism', prism: true, sand: true });
tile('basalt', { name: 'Strata Basalt', hp: 1.6, tex: { style: 'rock', c: '#3f4552' }, map: '#3f4552', stone: true });
tile('slag', { name: 'Slag Rock', hp: 1.3, tex: { style: 'rock', c: '#4b3b3b' }, map: '#4b3b3b', biome: 'core' });
tile('vitrislag', { name: 'Vitrified Slag', hp: 3, minPick: 55, tex: { style: 'crystal', c: '#2b1f3a' }, map: '#2b1f3a' });
tile('aerogel', { name: 'Aerogel', tex: { style: 'cloud', c: '#e9f2ff' }, map: '#e9f2ff', biome: 'space' });
tile('swarmcomb', { name: 'Swarm Comb', hp: 1.2, tex: { style: 'hex', c: '#c29a2a' }, map: '#c29a2a', biome: 'hive' });
tile('derelict_hull', { name: 'Derelict Hull', hp: 4, minPick: 65, tex: { style: 'plate', c: '#44607e' }, map: '#44607e', biome: 'dungeon' });
tile('derelict_hull_g', { name: 'Derelict Hull (Green)', hp: 4, minPick: 65, tex: { style: 'plate', c: '#3f6e57' }, map: '#3f6e57', biome: 'dungeon', drop: 'derelict_hull' });
tile('temple_brick', { name: 'Ancient Alloy Brick', hp: 5, minPick: 200, tex: { style: 'brick', c: '#8a6a2e' }, map: '#8a6a2e', biome: 'temple' });
tile('laser_grid', { name: 'Laser Grid', hp: 3, minPick: 65, tex: { style: 'grid', c: '#30404a', glow: '#ff3355' }, map: '#ff3355', damage: 30, light: [0.35, 0.04, 0.06], biome: 'dungeon' });
tile('temple_spikes', { name: 'Ancient Spikes', drop: null, hp: 5, minPick: 200, tex: { style: 'grid', c: '#5a4520', glow: '#ffcc33' }, map: '#ffaa22', damage: 60, light: [0.3, 0.2, 0.02], biome: 'temple' });

// ---------- ores ----------
for (const m of METALS) {
  const host = m.key === 'plasmite' ? '#4b3b3b' : m.key === 'cryonite' ? '#9fd8ff' : m.hard ? '#3f4552' : '#6b7380';
  tile(m.key + '_ore', {
    name: m.name + ' Ore', hp: m.hp, minPick: m.minPick, ore: true,
    tex: { style: 'ore', c: host, ore: m.color, oreDark: m.dark }, map: m.color, light: m.glow,
  });
}
tile('starshard_ore', { name: 'Starshard Cluster', hp: 1.2, ore: true, drop: 'star_shard', tex: { style: 'ore', c: '#6b7380', ore: '#fff38a', oreDark: '#b39a2a' }, map: '#fff38a', light: [0.4, 0.38, 0.15] });

// ---------- crafted blocks ----------
for (const m of METALS) {
  tile(m.key + '_plating', { name: m.name + ' Plating', hp: 2, tex: { style: 'plate', c: m.color }, map: m.color });
}
for (const w of WOODS) {
  tile(w.key + '_block', { name: w.block, drop: w.item === w.key ? w.key : w.key + '_block', tex: { style: 'wood', c: w.color }, map: w.color });
}
tile('glass', { name: 'Glass', opaque: false, tex: { style: 'glass', c: '#bfe9ff' }, map: '#bfe9ff' });
tile('carbon_brick', { name: 'Carbon Brick', hp: 1.5, tex: { style: 'brick', c: '#3a3d46' }, map: '#3a3d46' });
tile('circuit_block', { name: 'Circuit Block', hp: 1.5, tex: { style: 'circuit', c: '#16323a', glow: '#2ef2ff' }, map: '#16323a', light: [0.03, 0.12, 0.14] });
for (const n of NEON_COLORS) {
  tile('neon_' + n.key, { name: n.name + ' Neon Block', tex: { style: 'neon', c: n.color }, map: n.color, light: n.light });
}
tile('ferrocrete_brick', { name: 'Ferrocrete Brick', hp: 1.5, tex: { style: 'brick', c: '#7c8592' }, map: '#7c8592' });
tile('rustrock_brick', { name: 'Rustrock Brick', hp: 1.5, tex: { style: 'brick', c: '#a8633c' }, map: '#a8633c' });
tile('cryo_brick', { name: 'Cryo Brick', hp: 1.5, tex: { style: 'brick', c: '#a9dcf5' }, map: '#a9dcf5' });
tile('vitri_brick', { name: 'Vitrified Brick', hp: 3, tex: { style: 'brick', c: '#3a2a4f' }, map: '#3a2a4f' });
tile('prism_brick', { name: 'Prism Brick', hp: 2, tex: { style: 'brick', c: '#d9c8ff' }, map: '#d9c8ff' });

// ---------- platforms, ropes, light ----------
for (const w of WOODS) {
  tile(w.key + '_platform', { name: w.name + ' Platform', solid: true, platform: true, opaque: false, tool: 'any', tex: { style: 'platform', c: w.color }, map: w.color });
}
tile('cable', { name: 'Cable Coil', solid: false, climb: true, tool: 'any', tex: { style: 'cable', c: '#8a8f99' }, map: '#8a8f99' });
tile('glowstick', { name: 'Glowstick', solid: false, tool: 'any', mount: 'any', tex: { style: 'torch', c: '#fff0c0' }, light: [1, 0.92, 0.72], map: '#fff0c0' });
for (const n of NEON_COLORS) {
  if (n.key === 'white') continue;
  tile('glowstick_' + n.key, { name: n.name + ' Glowstick', solid: false, tool: 'any', mount: 'any', tex: { style: 'torch', c: n.color }, light: n.light, map: n.color });
}
tile('plasma_torch', { name: 'Plasma Torch', solid: false, tool: 'any', mount: 'any', tex: { style: 'torch', c: '#ff5a2a' }, light: [1, 0.55, 0.3], map: '#ff5a2a' });
tile('cryo_torch', { name: 'Cryo Torch', solid: false, tool: 'any', mount: 'any', tex: { style: 'torch', c: '#9ff4ff' }, light: [0.6, 0.95, 1], map: '#9ff4ff' });

// ---------- trees & plants ----------
const TREE_TYPES = [
  { key: 'lattice', wood: 'fiber', bark: '#8a6b55', leaf: '#2fe0a8', leaf2: '#1a9e7a' },
  { key: 'rustpalm', wood: 'rustwood', bark: '#7d4630', leaf: '#ffb347', leaf2: '#c4702a' },
  { key: 'cryopine', wood: 'cryowood', bark: '#6d8aa0', leaf: '#c8f6ff', leaf2: '#7fb7d6' },
  { key: 'glowtree', wood: 'glowwood', bark: '#4b5e35', leaf: '#b4ff4a', leaf2: '#5fa52a' },
  { key: 'blighttree', wood: 'graywood', bark: '#4d475e', leaf: '#b06bff', leaf2: '#6c3fb5' },
  { key: 'prismtree', wood: 'prismwood', bark: '#bfa9d9', leaf: '#ff9ee8', leaf2: '#b678e0' },
];
export const TREES = TREE_TYPES;
for (const t of TREE_TYPES) {
  tile('tree_' + t.key, { name: 'Tree', solid: false, tool: 'axe', tree: t, drop: t.wood, hp: 1, tex: { style: 'trunk', c: t.bark }, map: t.bark });
}
tile('nanoweb', { name: 'Nanoweb', solid: false, tool: 'any', cut: true, web: true, drop: 'nano_filament', tex: { style: 'web', c: '#cfd8e0' }, map: '#8a9099' });
tile('sapling', { name: 'Sapling', solid: false, tool: 'any', drop: 'seed_pod', tex: { style: 'sapling', c: '#2fe0a8' }, map: '#2fe0a8' });

const PLANTS = [
  { key: 'tallgrass', color: '#2fe0a8', on: ['synthgrass'] },
  { key: 'tallgrass_j', color: '#a8ff3a', on: ['glowmoss'], light: [0.08, 0.14, 0.02] },
  { key: 'tallgrass_b', color: '#b06bff', on: ['grayturf'] },
  { key: 'tallgrass_p', color: '#ff9ee8', on: ['prismturf'] },
  { key: 'dead_shrub', color: '#8a5a3a', on: ['rustsand'] },
  { key: 'frost_shrub', color: '#bde6ff', on: ['frost'] },
];
for (const p of PLANTS) {
  tile(p.key, { name: 'Plant', solid: false, tool: 'any', cut: true, drop: p.key === 'tallgrass' ? 'seed_pod' : null, dropChance: 0.08, tex: { style: 'grassblade', c: p.color }, light: p.light || null, map: p.color, plantOn: p.on });
}
export const HERBS = [
  { key: 'voltleaf', name: 'Voltleaf', color: '#e8ff4a', on: ['synthgrass'] },
  { key: 'frostbloom', name: 'Frostbloom', color: '#9fe8ff', on: ['frost', 'cryoice'] },
  { key: 'sunpetal', name: 'Sunpetal', color: '#ffcc33', on: ['rustsand'] },
  { key: 'gloomspore', name: 'Gloomspore', color: '#b06bff', on: ['grayturf', 'graymass'] },
  { key: 'junglevine', name: 'Jungle Vinebud', color: '#7dff5a', on: ['glowmoss'] },
  { key: 'emberroot', name: 'Emberroot', color: '#ff6a2a', on: ['slag'] },
  { key: 'glowcap', name: 'Glowcap', color: '#3ff0ff', on: ['regolith', 'ferrocrete', 'biogel'], light: [0.08, 0.3, 0.35] },
];
for (const h of HERBS) {
  tile('herb_' + h.key, { name: h.name, solid: false, tool: 'any', cut: true, drop: h.key, tex: { style: 'herb', c: h.color }, light: h.light || [0.05, 0.05, 0.02], map: h.color, plantOn: h.on });
}

// ---------- furniture & interactables (multi-tile) ----------
function furniture(key, name, kind, w, h, extra = {}) {
  return tile(key, Object.assign({
    name, solid: false, tool: 'any', hp: 1, furn: { kind, w, h, anchor: extra.anchor || 'floor' },
    tex: { style: 'furniture' }, map: extra.map || '#a88f72',
  }, extra));
}

for (const wd of WOODS) {
  const ex = { mat: wd, map: wd.color };
  furniture(wd.key + '_table', wd.name + ' Table', 'table', 3, 2, { ...ex, table: true });
  furniture(wd.key + '_chair', wd.name + ' Chair', 'chair', 1, 2, { ...ex, chair: true });
  furniture(wd.key + '_door', wd.name + ' Door', 'door', 1, 3, { ...ex, solid: true, door: true, opaque: false, anchor: 'door', interact: 'door' });
  furniture(wd.key + '_chest', wd.name + ' Chest', 'chest', 2, 2, { ...ex, container: true, interact: 'chest' });
  furniture(wd.key + '_lamp', wd.name + ' Lamp', 'lamp', 1, 3, { ...ex, light: wd.light });
}
furniture('assembly_bench', 'Assembly Bench', 'bench', 2, 1, { mat: WOODS[0], station: 'bench', table: true });
furniture('rest_pod', 'Rest Pod', 'bed', 4, 2, { mat: WOODS[0], interact: 'bed', light: [0.1, 0.35, 0.4] });
furniture('smelter', 'Smelter', 'smelter', 3, 2, { station: 'smelter', light: [0.9, 0.5, 0.2], map: '#ff8a3d' });
furniture('fabricator', 'Fabricator', 'anvil', 2, 1, { station: 'fabricator', map: '#9aa3ad' });
furniture('synth_vat', 'Synth Vat', 'vat', 1, 2, { station: 'vat', light: [0.2, 0.6, 0.3], map: '#5aff8a' });
furniture('textile_printer', 'Textile Printer', 'printer', 3, 2, { station: 'printer', map: '#7a7f8a' });
furniture('tinker_station', 'Tinker Station', 'tinker', 3, 2, { station: 'tinker', map: '#5a6b8a' });
furniture('plasma_forge', 'Plasma Forge', 'forge', 3, 2, { station: 'plasmaforge', light: [1, 0.35, 0.55], map: '#ff3fa4' });
furniture('nano_forge', 'Nano Forge', 'nanoforge', 3, 2, { station: 'nanoforge', light: [0.3, 0.4, 1], map: '#5a78ff' });
furniture('quantum_assembler', 'Quantum Assembler', 'quantum', 3, 3, { station: 'quantum', light: [0.3, 1, 0.7], map: '#3dffb0' });
furniture('singularity_core', 'Singularity Core', 'singularity', 3, 3, { station: 'singularity', light: [0.8, 0.6, 1], map: '#d0a0ff' });
furniture('cryo_lathe', 'Cryo Lathe', 'lathe', 2, 2, { station: 'lathe', light: [0.4, 0.8, 1], map: '#7ff0ff' });
furniture('surgery_bay', 'Surgery Bay', 'surgery', 3, 2, { station: 'surgery', light: [0.3, 0.9, 0.7], map: '#3dffb0' });
furniture('quantum_beacon', 'Quantum Beacon', 'beacon', 2, 3, { interact: 'beacon', light: [0.4, 0.7, 1], map: '#66ccff' });
furniture('trade_terminal', 'Trade Terminal', 'terminal', 2, 2, { light: [0.2, 0.7, 0.9], map: '#2ef2ff' });

// world-generated interactables
furniture('canister', 'Supply Canister', 'canister', 2, 2, { smash: true, drop: null, map: '#7a8a99' });
furniture('canister_ice', 'Supply Canister', 'canister', 2, 2, { smash: true, drop: null, map: '#bfe9ff', tint: '#bfe9ff' });
furniture('canister_jungle', 'Supply Canister', 'canister', 2, 2, { smash: true, drop: null, map: '#a8ff3a', tint: '#7dbf3a' });
furniture('canister_core', 'Supply Canister', 'canister', 2, 2, { smash: true, drop: null, map: '#ff5a2a', tint: '#a03a2a' });
furniture('canister_derelict', 'Supply Canister', 'canister', 2, 2, { smash: true, drop: null, map: '#66ccff', tint: '#44607e' });
furniture('vital_core', 'Vital Core', 'heart', 2, 2, { smash: true, drop: 'vital_core', light: [0.7, 0.15, 0.25], map: '#ff3355' });
furniture('blight_node', 'Blight Node', 'orb', 2, 2, { tool: 'hammer', smash: true, drop: null, light: [0.45, 0.2, 0.7], map: '#b06bff' });
furniture('hive_pod', 'Hive Pod', 'larva', 3, 3, { smash: true, drop: null, light: [0.5, 0.35, 0.05], map: '#ffcc33' });
furniture('bloom_bulb', 'Bloom Bulb', 'bulb', 2, 2, { smash: true, drop: null, light: [0.6, 0.2, 0.4], map: '#ff5aa8' });
furniture('archon_terminal', 'Archon Terminal', 'archon', 2, 3, { tool: 'none', drop: null, interact: 'archon', light: [0.2, 0.5, 0.9], map: '#66ccff' });
furniture('temple_altar', 'Ancient Altar', 'altar', 3, 2, { tool: 'none', drop: null, interact: 'altar', light: [0.6, 0.4, 0.1], map: '#ffaa22' });
furniture('derelict_chest', 'Derelict Chest', 'chest', 2, 2, { mat: { color: '#c9a640', accent: '#ffe27a' }, container: true, interact: 'chest', map: '#c9a640', locked: 'access_key' });
furniture('core_chest', 'Core Chest', 'chest', 2, 2, { mat: { color: '#3a2a4f', accent: '#ff3fa4' }, container: true, interact: 'chest', map: '#3a2a4f', locked: 'core_key' });
furniture('cache_chest', 'Cache Chest', 'chest', 2, 2, { mat: { color: '#8a7a5a', accent: '#ffd27a' }, container: true, interact: 'chest', map: '#8a7a5a' });
furniture('temple_door', 'Ancient Door', 'door', 1, 3, { mat: { color: '#8a6a2e', accent: '#ffcc33' }, solid: true, door: true, opaque: false, anchor: 'door', interact: 'door', tool: 'none', drop: null, locked: 'temple_key', map: '#8a6a2e' });
tile('lockdown_field', { name: 'Lockdown Field', tool: 'none', drop: null, hp: 99, opaque: false, light: [0.15, 0.4, 0.7], tex: { style: 'glass', c: '#66ccff' }, map: '#66ccff' });

// ---------- walls ----------
wall('regolith_wall', { name: 'Regolith Wall', tex: { c: '#3b2c27' }, map: '#3b2c27', natural: true });
wall('ferrocrete_wall', { name: 'Ferrocrete Wall', tex: { c: '#363b43', style: 'rock' }, map: '#363b43', natural: true });
wall('basalt_wall', { name: 'Basalt Wall', tex: { c: '#22262e', style: 'rock' }, map: '#22262e', natural: true });
wall('biogel_wall', { name: 'Biogel Wall', tex: { c: '#2a2030' }, map: '#2a2030', natural: true });
wall('jungle_wall', { name: 'Overgrowth Wall', tex: { c: '#25381a', style: 'leafy' }, map: '#25381a', natural: true });
wall('frost_wall', { name: 'Frost Wall', tex: { c: '#5a7488', style: 'ice' }, map: '#5a7488', natural: true });
wall('rustrock_wall', { name: 'Rustrock Wall', tex: { c: '#55331f', style: 'strata' }, map: '#55331f', natural: true });
wall('blight_wall', { name: 'Blight Wall', tex: { c: '#2f2b3d', style: 'goo' }, map: '#2f2b3d', natural: true });
wall('prism_wall', { name: 'Prism Wall', tex: { c: '#5c4f78', style: 'crystal' }, map: '#5c4f78', natural: true });
wall('slag_wall', { name: 'Slag Wall', tex: { c: '#2a1f1f', style: 'rock' }, map: '#2a1f1f', natural: true });
wall('hive_wall', { name: 'Hive Wall', tex: { c: '#5e4a14', style: 'hex' }, map: '#5e4a14', natural: true });
wall('derelict_wall', { name: 'Derelict Wall', tex: { c: '#1f2d3d', style: 'plate' }, map: '#1f2d3d' });
wall('temple_wall', { name: 'Ancient Wall', tex: { c: '#46361a', style: 'brick' }, map: '#46361a', natural: true, unbreakableUntil: 'golem' });
for (const wd of WOODS) wall(wd.key + '_wall', { name: wd.name + ' Wall', tex: { c: wd.color, style: 'wood' }, map: wd.color });
for (const m of METALS) wall(m.key + '_wall', { name: m.name + ' Plating Wall', tex: { c: m.color, style: 'plate' }, map: m.color });
wall('glass_wall', { name: 'Glass Wall', tex: { c: '#5f8aa0', style: 'glass' }, map: '#5f8aa0' });
wall('carbon_wall', { name: 'Carbon Brick Wall', tex: { c: '#24262c', style: 'brick' }, map: '#24262c' });
wall('circuit_wall', { name: 'Circuit Wall', tex: { c: '#0e1e24', style: 'circuit' }, map: '#0e1e24' });
wall('ferrocrete_brick_wall', { name: 'Ferrocrete Brick Wall', tex: { c: '#454b55', style: 'brick' }, map: '#454b55' });

// ---------- lookup tables for hot loops ----------
export const SOLID = new Uint8Array(TILES.length); // 1 solid, 2 platform, 3 door
export const OPAQUE = new Uint8Array(TILES.length);
export const BLOCKY = new Uint8Array(TILES.length); // full-block auto-tiled tiles
export const LIGHT_R = new Float32Array(TILES.length);
export const LIGHT_G = new Float32Array(TILES.length);
export const LIGHT_B = new Float32Array(TILES.length);
for (let i = 1; i < TILES.length; i++) {
  const t = TILES[i];
  SOLID[i] = t.door ? 3 : t.platform ? 2 : t.solid ? 1 : 0;
  OPAQUE[i] = t.opaque ? 1 : 0;
  BLOCKY[i] = t.solid && !t.platform && !t.door && !t.furn ? 1 : 0;
  if (t.light) { LIGHT_R[i] = t.light[0]; LIGHT_G[i] = t.light[1]; LIGHT_B[i] = t.light[2]; }
}

// Biome conversion maps used by the spreading Blight / Prism and by purifiers.
export const TO_BLIGHT = { synthgrass: 'grayturf', ferrocrete: 'graymass', silica: 'graysand', rustsand: 'graysand', prismstone: 'graymass', prismturf: 'grayturf', prismsand: 'graysand', tree_lattice: 'tree_blighttree', tree_prismtree: 'tree_blighttree', tallgrass: 'tallgrass_b', tallgrass_p: 'tallgrass_b' };
export const TO_PRISM = { synthgrass: 'prismturf', ferrocrete: 'prismstone', silica: 'prismsand', rustsand: 'prismsand', graymass: 'prismstone', grayturf: 'prismturf', graysand: 'prismsand', tree_lattice: 'tree_prismtree', tree_blighttree: 'tree_prismtree', tallgrass: 'tallgrass_p', tallgrass_b: 'tallgrass_p' };
export const TO_PURE = { grayturf: 'synthgrass', graymass: 'ferrocrete', graysand: 'silica', prismstone: 'ferrocrete', prismturf: 'synthgrass', prismsand: 'silica', tree_blighttree: 'tree_lattice', tree_prismtree: 'tree_lattice', tallgrass_b: 'tallgrass', tallgrass_p: 'tallgrass' };
function idMap(m) { const o = new Map(); for (const k in m) o.set(T[k], T[m[k]]); return o; }
export const CONVERT = { blight: idMap(TO_BLIGHT), prism: idMap(TO_PRISM), pure: idMap(TO_PURE) };
