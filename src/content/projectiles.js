// Projectile archetypes. Damage comes from the weapon/ammo/enemy that fires them.
export const PROJ = {};
function p(key, d) {
  PROJ[key] = Object.assign({
    key, w: 8, h: 8, ai: 'linear', gravity: 0, tileCollide: true, pierce: 1, life: 180,
    light: null, color: '#fff', sprite: 'bolt', bounce: 0, explode: null, onHit: null, hostile: false,
  }, d);
}

// ----- player ballistic -----
p('bullet', { w: 6, h: 6, sprite: 'bullet', color: '#ffe08a', life: 120, light: [0.25, 0.2, 0.08] });
p('cryo_bullet', { w: 6, h: 6, sprite: 'bullet', color: '#9ff4ff', life: 120, light: [0.1, 0.35, 0.4], onHit: { buff: 'chill', time: 180 } });
p('plasma_bullet', { w: 6, h: 6, sprite: 'bullet', color: '#ff5ab0', life: 120, light: [0.5, 0.1, 0.3], onHit: { buff: 'burn', time: 180 } });
p('seeker_bullet', { w: 6, h: 6, sprite: 'bullet', ai: 'homing', homing: 0.12, color: '#3dffb0', life: 150, light: [0.1, 0.45, 0.3] });
p('neutron_bullet', { w: 6, h: 6, sprite: 'bullet', color: '#8fa8ff', pierce: 4, life: 150, light: [0.15, 0.2, 0.5] });
p('void_bullet', { w: 7, h: 7, sprite: 'bullet', ai: 'homing', homing: 0.2, color: '#d0a0ff', pierce: 3, life: 180, light: [0.4, 0.25, 0.6] });
p('rocket', { w: 10, h: 10, sprite: 'rocket', color: '#ffb12e', life: 200, light: [0.6, 0.4, 0.1], explode: { r: 48, tiles: 0 }, trail: '#ffb12e' });
p('rocket_mining', { w: 10, h: 10, sprite: 'rocket', color: '#ff7a2e', life: 200, light: [0.6, 0.3, 0.1], explode: { r: 48, tiles: 2 }, trail: '#ff7a2e' });
p('grenade', { w: 8, h: 8, sprite: 'grenade', color: '#7a9a5a', gravity: 0.25, bounce: 0.5, life: 150, explode: { r: 56, tiles: 0 }, timedOnly: true });
p('grav_grenade', { w: 8, h: 8, sprite: 'grenade', color: '#5a78ff', gravity: 0.25, bounce: 0.5, life: 120, explode: { r: 80, tiles: 0, pull: true }, timedOnly: true, light: [0.1, 0.15, 0.5] });
p('demo_charge', { w: 10, h: 10, sprite: 'bomb', color: '#c0c4cc', gravity: 0.25, bounce: 0.3, life: 180, explode: { r: 56, tiles: 3 }, timedOnly: true, light: [0.4, 0.05, 0.05] });
p('shuriken', { w: 8, h: 8, sprite: 'shuriken', color: '#c0d0e0', gravity: 0.08, life: 120 });
p('purifier_dust', { w: 16, h: 16, sprite: 'dust', color: '#6cffd8', life: 40, tileCollide: false, pierce: 99, convert: 'pure', light: [0.1, 0.4, 0.3] });
p('purifier_spray', { w: 12, h: 12, sprite: 'dust', color: '#6cffd8', life: 50, tileCollide: false, pierce: 99, convert: 'pure', light: [0.1, 0.4, 0.3] });

p('bobber', { w: 6, h: 6, sprite: 'bobber', ai: 'bobber', gravity: 0.25, life: 1e9, color: '#ff3355', bounce: 0.2 });

p('mech_shell', { w: 10, h: 10, sprite: 'rocket', color: '#ff3355', gravity: 0.06, life: 160, light: [0.6, 0.15, 0.15], explode: { r: 52, tiles: 0 }, trail: '#ff8a3d' });
p('star_missile', { w: 10, h: 10, sprite: 'rocket', ai: 'homing', homing: 0.12, color: '#d0a0ff', life: 200, light: [0.5, 0.35, 0.7], explode: { r: 44, tiles: 0 }, trail: '#d0a0ff' });
p('micro_missile', { w: 6, h: 6, sprite: 'rocket', ai: 'homing', homing: 0.16, color: '#ffb12e', life: 140, light: [0.4, 0.25, 0.05], explode: { r: 24, tiles: 0 }, trail: '#ffb12e' });

p('coil_slug', { w: 12, h: 4, sprite: 'laser', color: '#66ccff', life: 60, pierce: 2, light: [0.2, 0.4, 0.6], trail: '#66ccff' });
p('tachyon_slug', { w: 16, h: 4, sprite: 'laser', color: '#fff1a8', life: 70, pierce: 8, tileCollide: false, light: [0.6, 0.55, 0.3], trail: '#fff1a8' });
p('smart_round', { w: 6, h: 6, sprite: 'bullet', ai: 'homing', homing: 0.22, color: '#2ef2ff', life: 120, light: [0.1, 0.4, 0.45] });
p('black_hole', { w: 10, h: 10, sprite: 'orb', ai: 'blackhole', color: '#d0a0ff', gravity: 0.2, bounce: 0.3, life: 300, light: [0.4, 0.25, 0.6], pierce: 99 });
p('hardlight_wall', { w: 10, h: 48, sprite: 'barrier', ai: 'barrier', color: '#2ef2ff', life: 60 * 15, tileCollide: false, pierce: 99, light: [0.15, 0.5, 0.55] });

// ----- player melee / thrown -----
p('ion_boomerang', { w: 14, h: 14, sprite: 'boomerang', ai: 'boomerang', color: '#66ccff', pierce: 99, life: 600, light: [0.2, 0.4, 0.6], returnAfter: 30 });
p('plasma_boomerang', { w: 14, h: 14, sprite: 'boomerang', ai: 'boomerang', color: '#ff5ab0', pierce: 99, life: 600, light: [0.5, 0.1, 0.3], returnAfter: 40, onHit: { buff: 'burn', time: 180 } });
p('grav_flail', { w: 18, h: 18, sprite: 'flail', ai: 'flail', color: '#8a7aa8', pierce: 99, life: 900, light: [0.25, 0.15, 0.4] });
p('blade_wave', { w: 14, h: 14, sprite: 'wave', color: '#9ff4ff', tileCollide: true, life: 50, pierce: 2, light: [0.2, 0.4, 0.5] });
p('chrono_wave', { w: 16, h: 16, sprite: 'wave', color: '#3dffb0', life: 55, pierce: 3, light: [0.1, 0.5, 0.3] });
p('aether_wave', { w: 20, h: 20, sprite: 'wave', color: '#fff1a8', life: 60, pierce: 4, light: [0.5, 0.45, 0.2] });
p('horizon_wave', { w: 24, h: 24, sprite: 'wave', color: '#d0a0ff', tileCollide: false, life: 70, pierce: 8, light: [0.5, 0.3, 0.7] });
p('swarm_bee', { w: 6, h: 6, sprite: 'bee', ai: 'homing', homing: 0.15, color: '#ffcc33', life: 120, light: [0.2, 0.15, 0.02] });

// ----- player energy -----
p('spark', { w: 8, h: 8, sprite: 'orb', color: '#e8ff4a', life: 90, light: [0.5, 0.55, 0.1] });
p('lumen_bolt', { w: 10, h: 10, sprite: 'orb', ai: 'homing', homing: 0.08, color: '#a46bff', life: 120, light: [0.4, 0.2, 0.65] });
p('xeno_laser', { w: 12, h: 4, sprite: 'laser', color: '#ff6a3d', life: 60, light: [0.5, 0.15, 0.05] });
p('ice_lance', { w: 14, h: 6, sprite: 'laser', color: '#9ff4ff', life: 80, pierce: 3, light: [0.2, 0.5, 0.6], onHit: { buff: 'chill', time: 240 } });
p('plasma_orb', { w: 12, h: 12, sprite: 'orb', color: '#ff3fa4', life: 100, light: [0.7, 0.15, 0.4], explode: { r: 40, tiles: 0 }, onHit: { buff: 'burn', time: 240 } });
p('void_lance_p', { w: 14, h: 6, sprite: 'laser', color: '#b06bff', life: 80, pierce: 2, light: [0.4, 0.2, 0.6] });
p('neutron_bolt', { w: 10, h: 10, sprite: 'orb', ai: 'homing', homing: 0.14, color: '#5a78ff', life: 120, pierce: 2, light: [0.15, 0.25, 0.7] });
p('chrono_beam', { w: 16, h: 6, sprite: 'laser', color: '#3dffb0', life: 50, pierce: 5, tileCollide: false, light: [0.1, 0.6, 0.35] });
p('aether_star', { w: 14, h: 14, sprite: 'star', ai: 'homing', homing: 0.18, color: '#fff1a8', life: 140, pierce: 3, light: [0.6, 0.55, 0.3] });
p('singularity_orb', { w: 20, h: 20, sprite: 'orb', ai: 'homing', homing: 0.2, color: '#d0a0ff', life: 160, pierce: 6, tileCollide: false, light: [0.6, 0.4, 0.8], explode: { r: 64, tiles: 0 } });
p('rail_slug', { w: 16, h: 4, sprite: 'laser', color: '#ffffff', life: 40, pierce: 12, tileCollide: false, light: [0.5, 0.5, 0.6] });

// ----- minions (summons) -----
p('minion_drone', { w: 16, h: 12, sprite: 'minion', ai: 'minion', minion: { speed: 6, shoot: 'minion_bolt', rate: 40, contact: false }, color: '#66ccff', life: 1e9, tileCollide: false, pierce: 99, light: [0.15, 0.3, 0.45] });
p('minion_hornet', { w: 14, h: 12, sprite: 'minion_bug', ai: 'minion', minion: { speed: 7, shoot: 'e_stinger_friendly', rate: 35, contact: false }, color: '#ffcc33', life: 1e9, tileCollide: false, pierce: 99, light: [0.2, 0.15, 0.02] });
p('minion_neutron', { w: 16, h: 16, sprite: 'minion', ai: 'minion', minion: { speed: 9, shoot: null, rate: 0, contact: true }, color: '#5a78ff', life: 1e9, tileCollide: false, pierce: 99, light: [0.15, 0.2, 0.6] });
p('minion_chrono', { w: 18, h: 14, sprite: 'minion', ai: 'minion', minion: { speed: 9, shoot: 'chrono_beam', rate: 30, contact: false }, color: '#3dffb0', life: 1e9, tileCollide: false, pierce: 99, light: [0.1, 0.5, 0.3] });
p('minion_aether', { w: 18, h: 18, sprite: 'minion', ai: 'minion', minion: { speed: 11, shoot: null, rate: 0, contact: true }, color: '#fff1a8', life: 1e9, tileCollide: false, pierce: 99, light: [0.55, 0.5, 0.25] });
p('minion_singularity', { w: 20, h: 20, sprite: 'minion', ai: 'minion', minion: { speed: 13, shoot: 'singularity_orb', rate: 45, contact: true }, color: '#d0a0ff', life: 1e9, tileCollide: false, pierce: 99, light: [0.5, 0.35, 0.7] });
p('minion_bolt', { w: 6, h: 6, sprite: 'orb', color: '#66ccff', life: 60, light: [0.15, 0.3, 0.45] });
p('e_stinger_friendly', { w: 6, h: 6, sprite: 'needle', color: '#ffcc33', life: 60, onHit: { buff: 'poison', time: 180 } });
p('sentry_turret', { w: 20, h: 20, sprite: 'sentry', ai: 'sentry', sentry: { shoot: 'bullet', rate: 25, range: 420 }, color: '#aeb7c2', life: 60 * 60 * 10, tileCollide: true, gravity: 0.3, pierce: 99 });

// ----- hostile -----
p('e_laser', { w: 10, h: 4, sprite: 'laser', color: '#ff3355', hostile: true, life: 150, light: [0.5, 0.05, 0.1] });
p('e_laser_g', { w: 10, h: 4, sprite: 'laser', color: '#3dff6a', hostile: true, life: 150, light: [0.1, 0.5, 0.15] });
p('e_bolt', { w: 10, h: 10, sprite: 'orb', color: '#b06bff', hostile: true, life: 180, light: [0.35, 0.15, 0.5] });
p('e_spore', { w: 8, h: 8, sprite: 'orb', color: '#a8ff3a', hostile: true, life: 160, ai: 'homing', homing: 0.03, light: [0.2, 0.35, 0.05], onHit: { buff: 'poison', time: 240 } });
p('e_plasma', { w: 12, h: 12, sprite: 'orb', color: '#ff5a2a', hostile: true, life: 180, light: [0.6, 0.3, 0.1], onHit: { buff: 'burn', time: 240 } });
p('e_ice', { w: 10, h: 6, sprite: 'laser', color: '#9ff4ff', hostile: true, life: 150, light: [0.2, 0.45, 0.5], onHit: { buff: 'chill', time: 240 } });
p('e_stinger', { w: 6, h: 6, sprite: 'needle', color: '#ffcc33', hostile: true, life: 150, onHit: { buff: 'poison', time: 300 } });
p('e_bomb', { w: 10, h: 10, sprite: 'bomb', color: '#ff3355', hostile: true, gravity: 0.2, life: 200, explode: { r: 40, tiles: 0 }, light: [0.4, 0.05, 0.05] });
p('e_seed', { w: 8, h: 8, sprite: 'orb', color: '#5aff6a', hostile: true, life: 200, light: [0.1, 0.4, 0.1], onHit: { buff: 'poison', time: 200 } });
p('e_spike', { w: 10, h: 10, sprite: 'shuriken', color: '#ff5aa8', hostile: true, life: 240, tileCollide: false, light: [0.4, 0.1, 0.25] });
p('e_beam', { w: 18, h: 8, sprite: 'laser', color: '#fff1a8', hostile: true, life: 120, tileCollide: false, light: [0.6, 0.55, 0.3] });
p('e_void', { w: 14, h: 14, sprite: 'orb', color: '#d0a0ff', hostile: true, life: 240, tileCollide: false, ai: 'homing', homing: 0.04, light: [0.5, 0.3, 0.7] });
p('e_rock', { w: 10, h: 10, sprite: 'rock', color: '#8a7a6a', hostile: true, gravity: 0.25, life: 200 });
p('e_web', { w: 10, h: 10, sprite: 'orb', color: '#e0e8f0', hostile: true, life: 150, onHit: { buff: 'slow', time: 120 } });
p('e_goo', { w: 10, h: 10, sprite: 'orb', color: '#7d7590', hostile: true, gravity: 0.2, life: 200, onHit: { buff: 'corrode', time: 300 } });
p('e_skull', { w: 16, h: 16, sprite: 'skull', color: '#66ccff', hostile: true, ai: 'homing', homing: 0.05, tileCollide: false, life: 220, light: [0.2, 0.4, 0.6] });
p('e_fireball', { w: 12, h: 12, sprite: 'orb', color: '#ffb12e', hostile: true, life: 200, tileCollide: false, light: [0.6, 0.4, 0.1], onHit: { buff: 'burn', time: 300 } });
p('e_stinger_mark', { w: 7, h: 7, sprite: 'needle', color: '#ffe27a', hostile: true, life: 150, light: [0.4, 0.35, 0.05], onHit: { buff: 'marked', time: 420 } });
p('e_chrono', { w: 12, h: 12, sprite: 'orb', color: '#3dffb0', hostile: true, life: 240, tileCollide: false, ai: 'homing', homing: 0.02, light: [0.1, 0.45, 0.35], onHit: { buff: 'slow', time: 90 } });
p('e_lumen', { w: 14, h: 14, sprite: 'orb', color: '#fff1a8', hostile: true, life: 300, tileCollide: false, ai: 'homing', homing: 0.015, light: [0.75, 0.65, 0.45], keepLight: true });
p('fw_shot', { w: 10, h: 4, sprite: 'laser', color: '#3dff6a', life: 90, tileCollide: false, light: [0.1, 0.5, 0.15] });
p('data_packet', { w: 10, h: 6, sprite: 'laser', color: '#ffcc33', life: 90, pierce: 3, light: [0.45, 0.35, 0.05] });
p('minion_legion', { w: 12, h: 12, sprite: 'minion', ai: 'minion', minion: { speed: 12, shoot: null, rate: 0, contact: true }, color: '#ff3355', life: 1e9, tileCollide: false, pierce: 99, light: [0.4, 0.1, 0.1] });
