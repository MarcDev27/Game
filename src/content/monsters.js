// Hostile creature & boss definitions with spawn rules and drop tables.
export const MONSTERS = {};

// drops: [itemKey, chance, min, max]
function m(key, d) {
  MONSTERS[key] = Object.assign({
    key, name: key, hp: 20, dmg: 10, def: 0, kbRes: 0, w: 24, h: 24, ai: 'walker', sprite: 'bot', color: '#888', c2: '#444',
    speed: 1.5, drops: [], credits: 20, spawn: [], light: null, gravity: true, tileCollide: true, boss: false,
  }, d);
}
const S = (biomes, layers, time = 'any', weight = 1, extra = {}) => Object.assign({ biomes, layers, time, weight }, extra);
const ANY = null;
const SURF = ['surface'];
const UG = ['underground', 'cavern'];
const CAV = ['cavern'];

// ---------------- pre-Singularity ----------------
m('nanoslime', { name: 'Nanoslime', hp: 14, dmg: 6, w: 22, h: 16, ai: 'hopper', sprite: 'slime', color: '#2fe0a8', speed: 2, credits: 25,
  drops: [['nanogel', 1, 1, 2]], spawn: [S(['plains'], SURF, 'day', 3, { pre: true })] });
m('gel_cube', { name: 'Gel Cube', hp: 25, dmg: 7, def: 2, w: 24, h: 18, ai: 'hopper', sprite: 'slime', color: '#4ad9ff', speed: 2.2, credits: 30,
  drops: [['nanogel', 1, 1, 3]], spawn: [S(['plains', 'ocean'], SURF, 'any', 2, { pre: true })] });
m('husk_drone', { name: 'Husk Unit', hp: 45, dmg: 14, def: 6, w: 20, h: 40, ai: 'walker', sprite: 'husk', color: '#6b7b5a', c2: '#ff3355', speed: 1.1, credits: 60,
  drops: [['scrap', 0.5, 1, 2], ['battery', 0.03, 1, 1]], spawn: [S(['plains', 'desert', 'snow', 'jungle', 'blight', 'prism'], SURF, 'night', 4)] });
m('sight_drone', { name: 'Sight Drone', hp: 60, dmg: 18, def: 2, w: 26, h: 26, ai: 'flyer', sprite: 'eye', color: '#e8e8e8', c2: '#ff3355', speed: 2.4, gravity: false, credits: 75,
  drops: [['optic_lens', 0.35, 1, 1]], spawn: [S(['plains', 'desert', 'snow', 'jungle', 'blight', 'prism'], SURF, 'night', 3)] });
m('rust_scorpion', { name: 'Rust Scorpion', hp: 50, dmg: 18, def: 6, w: 32, h: 20, ai: 'walker', sprite: 'crawler', color: '#c7854f', c2: '#ffb347', speed: 1.8, credits: 60,
  drops: [['scrap', 0.4, 1, 2], ['synth_leather', 0.1, 1, 1]], spawn: [S(['desert'], ['surface', 'underground', 'cavern'], 'any', 3, { pre: true })] });
m('dust_drone', { name: 'Dust Drone', hp: 40, dmg: 15, def: 4, w: 26, h: 18, ai: 'flyer', sprite: 'drone', color: '#c7854f', c2: '#ffcc33', speed: 2.6, gravity: false, credits: 50,
  drops: [['aero_vane', 0.4, 1, 1]], spawn: [S(['desert'], SURF, 'day', 2)] });
m('frost_slime', { name: 'Frost Slime', hp: 40, dmg: 12, def: 4, w: 24, h: 18, ai: 'hopper', sprite: 'slime', color: '#bde6ff', speed: 2.2, credits: 40,
  drops: [['nanogel', 1, 1, 3], ['cryo_essence', 0.05, 1, 1]], spawn: [S(['snow'], ['surface', 'underground'], 'any', 3, { pre: true })] });
m('cryo_husk', { name: 'Cryo Husk', hp: 60, dmg: 16, def: 8, w: 20, h: 40, ai: 'walker', sprite: 'husk', color: '#8fb3c9', c2: '#9ff4ff', speed: 1.2, credits: 70,
  drops: [['scrap', 0.5, 1, 2], ['cryo_essence', 0.08, 1, 1]], spawn: [S(['snow'], SURF, 'night', 3)] });
m('ice_bat', { name: 'Ice Bat', hp: 30, dmg: 14, def: 3, w: 22, h: 16, ai: 'flyer', sprite: 'bat', color: '#9fd8ff', c2: '#2a7a8a', speed: 3, gravity: false, credits: 40,
  drops: [['cryo_essence', 0.1, 1, 1]], spawn: [S(['snow'], UG, 'any', 3, { pre: true })] });
m('jungle_slime', { name: 'Overgrowth Slime', hp: 50, dmg: 14, def: 6, w: 24, h: 18, ai: 'hopper', sprite: 'slime', color: '#a8ff3a', speed: 2.4, credits: 50,
  drops: [['nanogel', 1, 1, 3], ['bio_spore', 0.2, 1, 1]], spawn: [S(['jungle'], ['surface', 'underground', 'cavern'], 'any', 3)] });
m('spore_pod', { name: 'Spore Pod', hp: 80, dmg: 22, def: 6, w: 26, h: 30, ai: 'turret', sprite: 'pod', color: '#5fa52a', c2: '#ff5aa8', gravity: true, credits: 80,
  shoot: { proj: 'e_spore', rate: 120, speed: 3, dmg: 14 }, drops: [['bio_spore', 0.5, 1, 2], ['biofiber', 0.3, 1, 1]], spawn: [S(['jungle'], UG, 'any', 2, { ground: true })] });
m('hornet_drone', { name: 'Hornet Drone', hp: 55, dmg: 20, def: 8, w: 24, h: 20, ai: 'flyer', sprite: 'bug', color: '#ffcc33', c2: '#333', speed: 2.6, gravity: false, credits: 70,
  shoot: { proj: 'e_stinger', rate: 110, speed: 6, dmg: 16 }, drops: [['nano_stinger', 0.5, 1, 1], ['bio_spore', 0.1, 1, 1]], spawn: [S(['jungle'], UG, 'any', 3), S(['jungle'], SURF, 'any', 1)] });
m('vine_snatcher', { name: 'Vine Snatcher', hp: 70, dmg: 24, def: 8, w: 24, h: 24, ai: 'flyer', sprite: 'pod', color: '#3a8a2a', c2: '#ff5aa8', speed: 1.8, gravity: false, credits: 70,
  drops: [['biofiber', 0.6, 1, 2]], spawn: [S(['jungle'], SURF, 'any', 2)] });
m('eater_drone', { name: 'Eater Drone', hp: 50, dmg: 22, def: 8, w: 26, h: 22, ai: 'flyer', sprite: 'bug', color: '#7a5aa8', c2: '#b06bff', speed: 2.8, gravity: false, credits: 70,
  drops: [['blight_shard', 0.55, 1, 2]], spawn: [S(['blight'], ['surface', 'underground'], 'any', 4)] });
m('gray_crawler', { name: 'Graymass Crawler', hp: 70, dmg: 20, def: 10, w: 34, h: 20, ai: 'walker', sprite: 'crawler', color: '#5b5770', c2: '#b06bff', speed: 1.6, credits: 70,
  drops: [['blight_shard', 0.5, 1, 2]], spawn: [S(['blight'], ['surface', 'underground', 'cavern'], 'any', 2)] });
m('devourer', { name: 'Devourer', hp: 120, dmg: 20, def: 4, w: 20, h: 20, ai: 'worm', sprite: 'worm', color: '#7a5aa8', c2: '#b06bff', speed: 5, gravity: false, tileCollide: false, credits: 120,
  segments: 8, drops: [['blight_shard', 0.8, 1, 3]], spawn: [S(['blight'], ['surface', 'underground', 'cavern'], 'any', 1, { pre: true })] });
m('cave_bat', { name: 'Cave Bat', hp: 16, dmg: 13, def: 2, w: 22, h: 16, ai: 'flyer', sprite: 'bat', color: '#5a4a6a', c2: '#ff3355', speed: 3, gravity: false, credits: 25,
  drops: [], spawn: [S(ANY, UG, 'any', 3)] });
m('skitter_bot', { name: 'Skitter Bot', hp: 40, dmg: 15, def: 6, w: 28, h: 18, ai: 'walker', sprite: 'crawler', color: '#8a8f99', c2: '#66ccff', speed: 2, credits: 50,
  drops: [['scrap', 0.6, 1, 3], ['circuitry', 0.08, 1, 1]], spawn: [S(ANY, UG, 'any', 4, { pre: true })] });
m('rock_slime', { name: 'Rock Slime', hp: 40, dmg: 14, def: 8, w: 24, h: 18, ai: 'hopper', sprite: 'slime', color: '#8a6b55', speed: 2.2, credits: 40,
  drops: [['nanogel', 1, 2, 4]], spawn: [S(ANY, UG, 'any', 3, { pre: true })] });
m('web_crawler', { name: 'Web Crawler', hp: 60, dmg: 18, def: 6, w: 30, h: 20, ai: 'walker', sprite: 'spider', color: '#cfd8e0', c2: '#ff3355', speed: 2.4, credits: 60,
  shoot: { proj: 'e_web', rate: 150, speed: 5, dmg: 6 }, drops: [['nano_filament', 0.9, 2, 5]], spawn: [S(ANY, CAV, 'any', 2, { pre: true })] });
m('scrap_sentinel', { name: 'Scrap Sentinel', hp: 70, dmg: 20, def: 8, w: 20, h: 40, ai: 'walker', sprite: 'husk', color: '#aeb7c2', c2: '#ffcc33', speed: 1.5, credits: 90,
  drops: [['scrap', 0.6, 2, 4], ['bone_alloy', 0.3, 1, 2], ['grapple_hook', 0.01, 1, 1], ['battery', 0.05, 1, 1]], spawn: [S(ANY, CAV, 'any', 3, { pre: true })] });
m('volt_bot', { name: 'Volt Bot', hp: 90, dmg: 24, def: 10, w: 26, h: 30, ai: 'shooter', sprite: 'bot', color: '#e8ff4a', c2: '#333', speed: 1.4, credits: 110, light: [0.3, 0.3, 0.05],
  shoot: { proj: 'e_laser', rate: 130, speed: 7, dmg: 18 }, drops: [['battery', 0.35, 1, 1], ['circuitry', 0.2, 1, 1]], spawn: [S(ANY, CAV, 'any', 2)] });
m('shard_wisp', { name: 'Shard Wisp', hp: 70, dmg: 22, def: 12, w: 22, h: 22, ai: 'floater', sprite: 'wisp', color: '#fff38a', c2: '#ffffff', speed: 1.6, gravity: false, tileCollide: false, credits: 80, light: [0.4, 0.38, 0.15],
  drops: [['star_shard', 0.25, 1, 1]], spawn: [S(ANY, CAV, 'night', 1)] });
m('bone_sentry', { name: 'Bone Sentry', hp: 80, dmg: 30, def: 12, w: 20, h: 40, ai: 'walker', sprite: 'husk', color: '#dcd6c4', c2: '#66ccff', speed: 1.8, credits: 120,
  drops: [['bone_alloy', 0.7, 1, 3], ['access_key', 0.03, 1, 1]], spawn: [S(['dungeon'], ANY, 'any', 4)] });
m('arc_caster', { name: 'Arc Caster', hp: 50, dmg: 20, def: 6, w: 20, h: 40, ai: 'caster', sprite: 'caster', color: '#44607e', c2: '#66ccff', speed: 0, credits: 140, light: [0.15, 0.35, 0.5],
  shoot: { proj: 'e_bolt', rate: 140, speed: 5, dmg: 22 }, drops: [['bone_alloy', 0.4, 1, 2], ['spark_wand', 0.02, 1, 1], ['access_key', 0.03, 1, 1]], spawn: [S(['dungeon'], ANY, 'any', 2)] });
m('cursed_skull', { name: 'Haunted Processor', hp: 40, dmg: 26, def: 10, w: 22, h: 22, ai: 'floater', sprite: 'skull', color: '#66ccff', c2: '#ffffff', speed: 2, gravity: false, tileCollide: false, credits: 110, light: [0.2, 0.4, 0.6],
  drops: [['circuitry', 0.3, 1, 1]], spawn: [S(['dungeon'], ANY, 'any', 2)] });
m('plasma_slime', { name: 'Plasma Slime', hp: 60, dmg: 18, def: 10, w: 24, h: 18, ai: 'hopper', sprite: 'slime', color: '#ff5a2a', speed: 2.4, credits: 80, light: [0.5, 0.2, 0.05],
  contactBuff: { buff: 'burn', time: 180 }, drops: [['nanogel', 1, 2, 4]], spawn: [S(['core'], ANY, 'any', 3)] });
m('ember_imp', { name: 'Ember Imp', hp: 70, dmg: 20, def: 16, w: 22, h: 30, ai: 'caster', sprite: 'imp', color: '#ff5a2a', c2: '#ffcc33', speed: 0, credits: 120, light: [0.5, 0.25, 0.05],
  shoot: { proj: 'e_plasma', rate: 120, speed: 4, dmg: 20 }, drops: [['emberroot', 0.1, 1, 1], ['plasma_ward', 0.01, 1, 1]], spawn: [S(['core'], ANY, 'any', 3)] });
m('core_bat', { name: 'Core Bat', hp: 50, dmg: 26, def: 12, w: 22, h: 16, ai: 'flyer', sprite: 'bat', color: '#ff3355', c2: '#ffcc33', speed: 3.4, gravity: false, credits: 80, light: [0.4, 0.1, 0.05],
  contactBuff: { buff: 'burn', time: 180 }, drops: [], spawn: [S(['core'], ANY, 'any', 3)] });
m('slag_demon', { name: 'Slag Demon', hp: 140, dmg: 32, def: 16, w: 38, h: 34, ai: 'flyer', sprite: 'demon', color: '#7a2a2a', c2: '#ff5a2a', speed: 1.6, gravity: false, credits: 300, light: [0.4, 0.15, 0.05],
  shoot: { proj: 'e_fireball', rate: 150, speed: 4, dmg: 26 }, drops: [['plasmite_ore', 0.3, 3, 8], ['core_override', 0.01, 1, 1]], spawn: [S(['core'], ANY, 'any', 1)] });
m('sky_drone', { name: 'Sky Drone', hp: 60, dmg: 22, def: 8, w: 30, h: 20, ai: 'flyer', sprite: 'drone', color: '#e8f6ff', c2: '#66ccff', speed: 2.8, gravity: false, credits: 90,
  shoot: { proj: 'e_laser', rate: 160, speed: 6, dmg: 16 }, drops: [['aero_vane', 0.6, 1, 2]], spawn: [S(ANY, ['space'], 'any', 3)] });
m('coolant_jelly', { name: 'Coolant Jelly', hp: 40, dmg: 20, def: 2, w: 22, h: 24, ai: 'swimmer', sprite: 'jelly', color: '#4ad9ff', c2: '#ffffff', speed: 1.4, gravity: false, credits: 50, light: [0.1, 0.3, 0.4],
  drops: [['nanogel', 0.5, 1, 2]], spawn: [S(['ocean'], ANY, 'any', 3, { water: true })] });
m('shark_drone', { name: 'Shark Drone', hp: 300, dmg: 40, def: 2, w: 60, h: 24, ai: 'swimmer', sprite: 'fish', color: '#5a6b7a', c2: '#ff3355', speed: 3.2, gravity: false, credits: 400,
  drops: [['hydro_fins', 0.05, 1, 1], ['scrap', 1, 3, 6]], spawn: [S(['ocean'], ANY, 'any', 1, { water: true })] });

// ---------------- events ----------------
m('blood_husk', { name: 'Red Husk', hp: 70, dmg: 20, def: 8, w: 20, h: 40, ai: 'walker', sprite: 'husk', color: '#a83a3a', c2: '#ff2244', speed: 1.6, credits: 90,
  drops: [['scrap', 0.6, 1, 2], ['optic_lens', 0.1, 1, 1], ['red_shift_beacon', 0.005, 1, 1]], spawn: [S(ANY, SURF, 'night', 6, { event: 'redshift' })] });
m('blood_eye', { name: 'Red Sight Drone', hp: 80, dmg: 22, def: 6, w: 26, h: 26, ai: 'flyer', sprite: 'eye', color: '#ffcccc', c2: '#ff2244', speed: 3, gravity: false, credits: 100,
  drops: [['optic_lens', 0.6, 1, 1]], spawn: [S(ANY, SURF, 'night', 4, { event: 'redshift' })] });
m('swarm_drone', { name: 'Swarm Drone', hp: 40, dmg: 18, def: 4, w: 22, h: 16, ai: 'flyer', sprite: 'drone', color: '#ff3355', c2: '#aeb7c2', speed: 3.4, gravity: false, credits: 40,
  drops: [['scrap', 0.4, 1, 1]], spawn: [S(ANY, SURF, 'any', 5, { event: 'invasion' })], invader: 1 });
m('assault_bot', { name: 'Assault Bot', hp: 90, dmg: 22, def: 10, w: 22, h: 40, ai: 'shooter', sprite: 'bot', color: '#ff3355', c2: '#aeb7c2', speed: 1.8, credits: 120,
  shoot: { proj: 'e_laser', rate: 90, speed: 7, dmg: 16 }, drops: [['circuitry', 0.2, 1, 1], ['scrap', 0.6, 1, 3]], spawn: [S(ANY, SURF, 'any', 5, { event: 'invasion' })], invader: 1 });
m('shield_bot', { name: 'Shield Bot', hp: 180, dmg: 26, def: 24, kbRes: 0.6, w: 28, h: 40, ai: 'walker', sprite: 'bot', color: '#aeb7c2', c2: '#66ccff', speed: 1, credits: 160,
  drops: [['kinetic_shield', 0.04, 1, 1], ['scrap', 1, 2, 4]], spawn: [S(ANY, SURF, 'any', 3, { event: 'invasion' })], invader: 2 });
m('sniper_bot', { name: 'Sniper Bot', hp: 70, dmg: 18, def: 6, w: 20, h: 40, ai: 'shooter', sprite: 'bot', color: '#3dff6a', c2: '#333', speed: 1.2, credits: 140,
  shoot: { proj: 'e_laser_g', rate: 150, speed: 12, dmg: 34 }, drops: [['targeting_scope', 0.01, 1, 1], ['circuitry', 0.3, 1, 1]], spawn: [S(ANY, SURF, 'any', 2, { event: 'invasion' })], invader: 2 });

// ---------------- Singularity (hardmode) ----------------
m('rogue_mech', { name: 'Rogue Mech', hp: 420, dmg: 50, def: 24, kbRes: 0.4, w: 30, h: 46, ai: 'walker', sprite: 'mech', color: '#5a6b7a', c2: '#ff3355', speed: 1.6, credits: 600,
  drops: [['scrap', 1, 4, 8], ['quantum_dust', 0.3, 1, 2], ['power_glove', 0.02, 1, 1]], spawn: [S(['plains', 'desert', 'snow', 'jungle'], SURF, 'night', 4, { hard: true })] });
m('plasma_wraith', { name: 'Plasma Wraith', hp: 220, dmg: 50, def: 18, w: 24, h: 40, ai: 'floater', sprite: 'wraith', color: '#ff5ab0', c2: '#ffffff', speed: 1.6, gravity: false, tileCollide: false, credits: 500, light: [0.5, 0.1, 0.3],
  drops: [['phase_residue', 0.08, 1, 1], ['quantum_dust', 0.4, 1, 2]], spawn: [S(ANY, SURF, 'night', 2, { hard: true })] });
m('prism_charger', { name: 'Prism Charger', hp: 420, dmg: 60, def: 20, kbRes: 0.5, w: 46, h: 30, ai: 'charger', sprite: 'charger', color: '#f0dcf5', c2: '#ff9ee8', speed: 4.5, credits: 700,
  drops: [['photon_core', 0.4, 1, 2]], spawn: [S(['prism'], SURF, 'any', 3, { hard: true })] });
m('prism_sprite', { name: 'Prism Sprite', hp: 160, dmg: 40, def: 16, w: 20, h: 20, ai: 'flyer', sprite: 'wisp', color: '#ff9ee8', c2: '#ffffff', speed: 3.6, gravity: false, credits: 300, light: [0.5, 0.3, 0.45],
  drops: [['photon_core', 0.18, 1, 1], ['quantum_dust', 0.3, 1, 1]], spawn: [S(['prism'], ANY, 'any', 3, { hard: true })] });
m('blight_corruptor', { name: 'Blight Corruptor', hp: 240, dmg: 48, def: 18, w: 34, h: 26, ai: 'flyer', sprite: 'bug', color: '#5b5770', c2: '#b06bff', speed: 2.6, gravity: false, credits: 500,
  shoot: { proj: 'e_goo', rate: 120, speed: 5, dmg: 36 }, drops: [['blight_shard', 1, 1, 3], ['void_core', 0.18, 1, 1]], spawn: [S(['blight'], ANY, 'any', 3, { hard: true })] });
m('void_slime', { name: 'Void Slime', hp: 260, dmg: 50, def: 20, w: 34, h: 26, ai: 'hopper', sprite: 'slime', color: '#3a2a4f', speed: 3, credits: 500,
  drops: [['nanogel', 1, 3, 6], ['void_core', 0.3, 1, 1]], spawn: [S(['blight'], UG, 'any', 3, { hard: true })] });
m('neutron_golem', { name: 'Neutron Golem', hp: 650, dmg: 60, def: 34, kbRes: 0.8, w: 34, h: 46, ai: 'walker', sprite: 'mech', color: '#3a4a8a', c2: '#5a78ff', speed: 1.2, credits: 900, light: [0.1, 0.15, 0.4],
  drops: [['neutronium_ore', 0.5, 3, 8], ['quantum_dust', 0.5, 1, 3]], spawn: [S(ANY, UG, 'any', 3, { hard: true })] });
m('quantum_specter', { name: 'Quantum Specter', hp: 300, dmg: 55, def: 18, w: 24, h: 40, ai: 'floater', sprite: 'wraith', color: '#d0a0ff', c2: '#2ef2ff', speed: 2, gravity: false, tileCollide: false, credits: 700, light: [0.4, 0.3, 0.6],
  drops: [['quantum_dust', 1, 1, 3], ['phase_cloak', 0.005, 1, 1]], spawn: [S(ANY, CAV, 'any', 2, { hard: true })] });
m('armored_crawler', { name: 'Armored Crawler', hp: 400, dmg: 55, def: 36, w: 40, h: 22, ai: 'walker', sprite: 'spider', color: '#4a4a5a', c2: '#3dffb0', speed: 2.8, credits: 600,
  drops: [['nano_filament', 1, 3, 8], ['scrap', 1, 3, 6]], spawn: [S(ANY, CAV, 'any', 2, { hard: true })] });
m('grav_wisp', { name: 'Grav Wisp', hp: 200, dmg: 45, def: 14, w: 22, h: 22, ai: 'flyer', sprite: 'wisp', color: '#8fd8ff', c2: '#ffffff', speed: 3.4, gravity: false, credits: 400, light: [0.3, 0.5, 0.6],
  drops: [['gravity_core', 0.6, 1, 2]], spawn: [S(ANY, ['space'], 'any', 3, { hard: true })] });
m('sky_wyvern', { name: 'Sky Wyvern', hp: 900, dmg: 60, def: 14, w: 26, h: 26, ai: 'worm', sprite: 'wyvern', color: '#e8f6ff', c2: '#8fd8ff', speed: 7, gravity: false, tileCollide: false, credits: 1500,
  segments: 14, drops: [['gravity_core', 1, 3, 6], ['aero_vane', 1, 2, 4]], spawn: [S(ANY, ['space'], 'any', 0.5, { hard: true })] });
m('phase_ghost', { name: 'Phase Ghost', hp: 320, dmg: 60, def: 20, w: 24, h: 40, ai: 'floater', sprite: 'wraith', color: '#9ff4e8', c2: '#ffffff', speed: 2.2, gravity: false, tileCollide: false, credits: 800, light: [0.2, 0.45, 0.4],
  drops: [['phase_residue', 0.6, 1, 2]], spawn: [S(['dungeon'], ANY, 'any', 4, { hard: true, after: 'bloom_titan' })] });
m('derelict_knight', { name: 'Derelict Knight', hp: 700, dmg: 70, def: 40, kbRes: 0.7, w: 26, h: 44, ai: 'walker', sprite: 'mech', color: '#44607e', c2: '#66ccff', speed: 2, credits: 1200,
  drops: [['phase_residue', 0.3, 1, 1], ['bone_alloy', 1, 3, 6]], spawn: [S(['dungeon'], ANY, 'any', 3, { hard: true, after: 'bloom_titan' })] });
m('ancient_sentry', { name: 'Ancient Sentry', hp: 800, dmg: 70, def: 40, w: 26, h: 40, ai: 'shooter', sprite: 'mech', color: '#8a6a2e', c2: '#ffcc33', speed: 1.6, credits: 1200,
  shoot: { proj: 'e_beam', rate: 120, speed: 7, dmg: 50 }, drops: [['battery', 0.4, 1, 2], ['power_cell', 0.03, 1, 1]], spawn: [S(['temple'], ANY, 'any', 4, { hard: true })] });
m('temple_crawler', { name: 'Ancient Crawler', hp: 500, dmg: 70, def: 30, w: 36, h: 20, ai: 'walker', sprite: 'crawler', color: '#8a6a2e', c2: '#ffaa22', speed: 3, credits: 1000,
  drops: [['battery', 0.3, 1, 1]], spawn: [S(['temple'], ANY, 'any', 3, { hard: true })] });
m('bloom_thorn', { name: 'Bloom Thorn', hp: 450, dmg: 60, def: 24, w: 30, h: 30, ai: 'flyer', sprite: 'pod', color: '#ff5aa8', c2: '#3a8a2a', speed: 2.6, gravity: false, credits: 800,
  shoot: { proj: 'e_seed', rate: 100, speed: 6, dmg: 40 }, drops: [['biofiber', 1, 1, 3], ['overcharge_capsule', 0.03, 1, 1]], spawn: [S(['jungle'], UG, 'any', 3, { hard: true })] });
m('reaper_unit', { name: 'Reaper Unit', hp: 1800, dmg: 90, def: 30, kbRes: 0.8, w: 34, h: 50, ai: 'walker', sprite: 'mech', color: '#222', c2: '#ffb12e', speed: 2.6, credits: 3000,
  drops: [['berserker_core', 0.05, 1, 1], ['star_veil', 0.05, 1, 1], ['quantum_dust', 1, 3, 6]], spawn: [S(ANY, SURF, 'day', 3, { event: 'eclipse' })] });
m('eclipse_eye', { name: 'Flare Eye', hp: 700, dmg: 70, def: 20, w: 36, h: 36, ai: 'flyer', sprite: 'eye', color: '#ffb12e', c2: '#222', speed: 3.4, gravity: false, credits: 1500,
  shoot: { proj: 'e_fireball', rate: 90, speed: 6, dmg: 50 }, drops: [['nano_mender', 0.04, 1, 1], ['terror_matrix', 0.3, 1, 2]], spawn: [S(ANY, SURF, 'day', 3, { event: 'eclipse' })] });
for (const [k, n, c, frag] of [['flux_sentinel', 'Flux Sentinel', '#ff8a3d', 'fragment_flux'], ['volt_sentinel', 'Volt Sentinel', '#3dffb0', 'fragment_volt'], ['nova_sentinel', 'Nova Sentinel', '#ff3ddc', 'fragment_nova'], ['drift_sentinel', 'Drift Sentinel', '#66ccff', 'fragment_drift']]) {
  m(k, { name: n, hp: 1400, dmg: 80, def: 36, w: 28, h: 44, ai: 'caster', sprite: 'sentinel', color: c, c2: '#ffffff', speed: 0, credits: 2000, light: [0.4, 0.4, 0.4],
    shoot: { proj: 'e_beam', rate: 90, speed: 8, dmg: 60 }, drops: [[frag, 1, 2, 5]], spawn: [S(ANY, ['surface', 'space'], 'night', 2, { hard: true, after: 'gravity_golem' })] });
}

// ---------------- bosses ----------------
const B = (key, d) => m(key, Object.assign({ boss: true, gravity: false, tileCollide: false, kbRes: 1, spawn: [] }, d));
B('overseer', { name: 'The Overseer', hp: 2800, dmg: 18, def: 12, w: 70, h: 70, ai: 'boss_overseer', sprite: 'eye', color: '#e8e8e8', c2: '#ff3355', speed: 4, credits: 3000, light: [0.5, 0.2, 0.2],
  drops: [['lumenite_ore', 1, 30, 80], ['optic_lens', 1, 4, 8], ['optic_shield', 0.15, 1, 1], ['micro_stim', 1, 5, 10]], minion: 'sight_drone', music: 'boss1' });
B('gel_sovereign', { name: 'Gel Sovereign', hp: 2000, dmg: 30, def: 10, w: 120, h: 90, ai: 'boss_sovereign', sprite: 'slime', color: '#4ad9ff', speed: 4, gravity: true, tileCollide: true, credits: 3000,
  drops: [['nanogel', 1, 40, 80], ['sovereign_core', 0.5, 1, 1], ['gel_beacon', 0.1, 1, 1], ['ion_boomerang', 0.2, 1, 1]], minion: 'gel_cube', music: 'boss1' });
B('data_wyrm', { name: 'Data Wyrm', hp: 160, dmg: 22, def: 6, w: 26, h: 26, ai: 'boss_worm', sprite: 'worm', color: '#7a5aa8', c2: '#b06bff', speed: 8, credits: 300, segments: 40, segmentHp: true,
  drops: [['wyrm_scale', 0.6, 1, 2], ['lumenite_ore', 0.3, 2, 5]], music: 'boss1' });
B('swarm_mother', { name: 'Swarm Mother', hp: 3400, dmg: 30, def: 10, w: 80, h: 64, ai: 'boss_swarm', sprite: 'queen', color: '#ffcc33', c2: '#333', speed: 6, credits: 5000,
  drops: [['swarm_chitin', 1, 15, 30], ['nano_stinger', 1, 10, 20], ['swarm_blade', 0.3, 1, 1], ['swarm_gun', 0.3, 1, 1], ['swarm_remote', 0.3, 1, 1], ['swarm_cloak', 0.3, 1, 1]], minion: 'hornet_drone', music: 'boss1' });
B('archon', { name: 'The Archon', hp: 4400, dmg: 32, def: 12, w: 80, h: 80, ai: 'boss_archon', sprite: 'archon', color: '#66ccff', c2: '#44607e', speed: 3, credits: 8000, light: [0.2, 0.4, 0.6],
  drops: [['archon_mace', 0.3, 1, 1], ['archon_crown', 0.4, 1, 1], ['bone_alloy', 1, 15, 30], ['access_key', 1, 1, 2]], music: 'boss2' });
B('archon_hand', { name: 'Archon Arm', hp: 800, dmg: 22, def: 14, w: 40, h: 40, ai: 'boss_hand', sprite: 'hand', color: '#66ccff', c2: '#44607e', speed: 4, credits: 0, drops: [] });
B('core_warden', { name: 'The Core Warden', hp: 9000, dmg: 50, def: 12, w: 120, h: 360, ai: 'boss_warden', sprite: 'warden', color: '#7a2a2a', c2: '#ff5a2a', speed: 1.5, credits: 30000, light: [0.6, 0.25, 0.1],
  drops: [['expansion_port', 1, 1, 1], ['melee_emblem', 0.25, 1, 1], ['ranged_emblem', 0.25, 1, 1], ['energy_emblem', 0.25, 1, 1], ['summon_emblem', 0.25, 1, 1], ['plasmite_bar', 1, 10, 20], ['grenade_launcher', 0.0, 1, 1]], music: 'boss2' });
B('twin_lancer_r', { name: 'Lancer Ret', hp: 20000, dmg: 50, def: 10, w: 70, h: 70, ai: 'boss_twin', sprite: 'eye', color: '#aeb7c2', c2: '#ff3355', speed: 5, credits: 20000, light: [0.5, 0.1, 0.1], twinShot: 'e_laser',
  drops: [['targeting_matrix', 1, 20, 40], ['exalted_bar', 1, 15, 30]], music: 'boss3' });
B('twin_lancer_s', { name: 'Lancer Spaz', hp: 23000, dmg: 50, def: 10, w: 70, h: 70, ai: 'boss_twin', sprite: 'eye', color: '#aeb7c2', c2: '#3dff6a', speed: 5.5, credits: 20000, light: [0.1, 0.5, 0.1], twinShot: 'e_fireball', drops: [], music: 'boss3' });
B('leviathan', { name: 'The Leviathan', hp: 900, dmg: 55, def: 20, w: 34, h: 34, ai: 'boss_worm', sprite: 'mechworm', color: '#5a6b7a', c2: '#ff3355', speed: 11, credits: 400, segments: 60, segmentHp: true, laser: true,
  drops: [['force_matrix', 0.7, 1, 1], ['exalted_bar', 0.5, 1, 1]], music: 'boss3' });
B('prime_archon', { name: 'Prime Archon', hp: 28000, dmg: 50, def: 24, w: 80, h: 80, ai: 'boss_archon', sprite: 'archon', color: '#aeb7c2', c2: '#ff3355', speed: 4, credits: 30000, light: [0.5, 0.15, 0.15], prime: true,
  drops: [['terror_matrix', 1, 20, 40], ['exalted_bar', 1, 15, 30]], music: 'boss3' });
B('prime_hand', { name: 'Prime Arm', hp: 9000, dmg: 40, def: 24, w: 44, h: 44, ai: 'boss_hand', sprite: 'hand', color: '#aeb7c2', c2: '#ff3355', speed: 5, credits: 0, drops: [], prime: true });
B('bloom_titan', { name: 'Bloom Titan', hp: 30000, dmg: 50, def: 14, w: 90, h: 90, ai: 'boss_bloom', sprite: 'bloom', color: '#ff5aa8', c2: '#3a8a2a', speed: 3, credits: 40000, light: [0.5, 0.2, 0.35],
  drops: [['temple_key', 1, 1, 1], ['bloom_tissue', 1, 10, 20], ['bloom_glaive', 0.3, 1, 1], ['bloom_launcher', 0.3, 1, 1], ['grenade_launcher', 0.3, 1, 1], ['thorn_plating', 0.2, 1, 1]], music: 'boss3' });
B('gravity_golem', { name: 'Gravity Golem', hp: 40000, dmg: 70, def: 26, w: 110, h: 110, ai: 'boss_golem', sprite: 'golem', color: '#8a6a2e', c2: '#ffaa22', speed: 3, gravity: true, tileCollide: true, credits: 60000, light: [0.5, 0.35, 0.1],
  drops: [['golem_core', 1, 1, 1], ['golem_fist', 0.35, 1, 1], ['golem_eye', 0.35, 1, 1], ['temple_brick', 1, 20, 40]], music: 'boss3' });
B('golem_fist_e', { name: 'Golem Fist', hp: 9000, dmg: 60, def: 30, w: 40, h: 40, ai: 'boss_hand', sprite: 'fist', color: '#8a6a2e', c2: '#ffaa22', speed: 6, credits: 0, drops: [] });
B('architect', { name: 'The Architect', hp: 145000, dmg: 80, def: 50, w: 140, h: 160, ai: 'boss_architect', sprite: 'architect', color: '#d0a0ff', c2: '#2ef2ff', speed: 2, credits: 200000, light: [0.6, 0.4, 0.8],
  drops: [['singularity_bar', 1, 70, 90], ['fragment_flux', 1, 10, 20], ['fragment_volt', 1, 10, 20], ['fragment_nova', 1, 10, 20], ['fragment_drift', 1, 10, 20], ['gravity_hook', 0.3, 1, 1]], music: 'boss4' });
B('architect_hand', { name: 'Architect Hand', hp: 50000, dmg: 70, def: 40, w: 60, h: 60, ai: 'boss_hand', sprite: 'ahand', color: '#d0a0ff', c2: '#2ef2ff', speed: 5, credits: 0, drops: [], architect: true });

export const BOSS_INFO = {
  overseer: { name: 'The Overseer', summon: 'optic_lure', night: true, hint: 'Craft an Optic Lure from 6 Optic Lenses (dropped by Sight Drones at night).' },
  gel_sovereign: { name: 'Gel Sovereign', summon: 'gel_beacon', hint: 'Craft a Gel Beacon from 30 Nanogel.' },
  data_wyrm: { name: 'Data Wyrm', summon: 'corrupt_datachip', biome: 'blight', hint: 'Smash 3 Blight Nodes in the Blight chasms or craft a Corrupted Datachip.' },
  swarm_mother: { name: 'Swarm Mother', summon: 'pheromone_chip', biome: 'jungle', hint: 'Break the Hive Pod inside the Overgrowth hive.' },
  archon: { name: 'The Archon', summon: 'archon_key', night: true, hint: 'Activate the Archon Terminal outside the Derelict Station at night.' },
  core_warden: { name: 'The Core Warden', summon: 'core_override', biome: 'core', hint: 'Use a Core Override Key in the Reactor Core. Defeating it begins the Singularity.' },
  twin_lancers: { name: 'Twin Lancers', summon: 'mech_optic', night: true, hard: true },
  leviathan: { name: 'The Leviathan', summon: 'mech_worm', night: true, hard: true },
  prime_archon: { name: 'Prime Archon', summon: 'mech_skull', night: true, hard: true },
  bloom_titan: { name: 'Bloom Titan', biome: 'jungle', hard: true, hint: 'After the three mechanical bosses, Bloom Bulbs appear deep in the Overgrowth.' },
  gravity_golem: { name: 'Gravity Golem', summon: 'power_cell', hard: true, hint: 'Use a Power Cell at the Ancient Altar in the Overgrowth temple.' },
  architect: { name: 'The Architect', summon: 'architect_sigil', hard: true, hint: 'Gather fragments from the Sentinels that appear after the Golem falls.' },
};
