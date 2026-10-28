// Loot tables for chests and breakable canisters.
import { ITEMS } from './items.js';

const INJECTORS = Object.keys(ITEMS).filter((k) => k.endsWith('_inj'));

export const CHEST_PRIMARY = {
  cave: ['hydraulic_boots', 'jump_module', 'grav_bubble', 'shock_absorbers', 'magnet_module', 'regen_band', 'mining_gauntlet', 'ion_boomerang', 'spark_wand', 'volt_spear', 'grapple_hook', 'rocket_boots', 'glow_drone', 'precision_chip'],
  surface: ['scrap_knife', 'spark_wand', 'ion_boomerang', 'hydraulic_boots', 'grapple_hook', 'micro_stim'],
  snow: ['hover_soles', 'cryo_hook', 'jump_module', 'thermal_regulator', 'cryo_essence'],
  jungle: ['gecko_gloves', 'hydro_fins', 'thorn_plating', 'mining_gauntlet', 'power_glove'],
  sky: ['grav_bubble', 'jump_module', 'shock_absorbers', 'glow_drone', 'rocket_boots'],
  desert: ['hydraulic_boots', 'scatter_cannon', 'magnet_module', 'targeting_scope'],
  ocean: ['hydro_fins', 'hover_soles', 'kinetic_shield'],
  derelict: ['kinetic_shield', 'grav_flail', 'scatter_cannon', 'medkit_core', 'phase_dash', 'void_lance', 'overclock_chip'],
  core: ['plasma_ward', 'phase_dash', 'plasma_boomerang', 'overclock_chip', 'precision_chip', 'thermal_regulator'],
  temple: ['power_cell', 'power_cell', 'battery'],
};

export function fillChest(chest, kind, depthFactor, rng) {
  const items = chest.items;
  let slot = 0;
  const add = (k, n = 1) => { if (ITEMS[k] && slot < items.length) items[slot++] = { k, n }; };
  const prim = CHEST_PRIMARY[kind] || CHEST_PRIMARY.cave;
  add(rng.pick(prim), 1);
  if (kind === 'derelict' || kind === 'core') add(rng.pick(prim), 1);
  const bars = depthFactor < 0.4 ? ['cuprite_bar', 'ferrite_bar'] : ['ferrite_bar', 'titanite_bar'];
  if (rng.chance(0.6)) add(rng.pick(bars), rng.int(3, 10));
  if (rng.chance(0.5)) add(depthFactor > 0.5 ? 'stim_pack' : 'micro_stim', rng.int(2, 5));
  if (rng.chance(0.5)) add(rng.pick(INJECTORS), rng.int(1, 2));
  if (rng.chance(0.4)) add('kinetic_round', rng.int(30, 90));
  if (rng.chance(0.5)) add(kind === 'core' ? 'plasma_torch' : 'glowstick', rng.int(8, 20));
  if (rng.chance(0.3)) add('recall_inj', rng.int(1, 2));
  if (rng.chance(0.25)) add('demo_charge', rng.int(2, 6));
  if (rng.chance(0.25)) add('star_shard', rng.int(1, 3));
  if (rng.chance(0.2)) add('vital_core', 1);
  chest.credits = Math.floor(rng.int(100, 600) * (1 + depthFactor * 3));
}

export function canisterLoot(kind, depthFactor, rng, hard) {
  const out = [];
  const r = rng.next();
  if (r < 0.14) out.push(['micro_stim', rng.int(1, 2)]);
  else if (r < 0.24) out.push([rng.pick(INJECTORS), 1]);
  else if (r < 0.36) out.push([kind === 'core' ? 'plasma_torch' : 'glowstick', rng.int(4, 12)]);
  else if (r < 0.46) out.push(['kinetic_round', rng.int(15, 40)]);
  else if (r < 0.52) out.push(['demo_charge', rng.int(1, 3)]);
  else if (r < 0.58) out.push(['cable', rng.int(10, 25)]);
  else if (r < 0.62) out.push(['recall_inj', 1]);
  else if (r < 0.68 && hard) out.push(['stim_pack', rng.int(1, 3)]);
  else if (r < 0.74) out.push([depthFactor > 0.5 ? 'titanite_bar' : 'ferrite_bar', rng.int(1, 4)]);
  else if (r < 0.80) out.push(['nano_shuriken', rng.int(10, 30)]);
  const credits = Math.floor(rng.int(20, 120) * (1 + depthFactor * 4) * (hard ? 3 : 1));
  return { items: out, credits };
}
