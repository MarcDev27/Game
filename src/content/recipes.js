// Crafting recipes. `at` is a crafting station key (null = by hand).
import { METALS, WOODS, NEON_COLORS } from './materials.js';
import { ITEMS } from './items.js';

export const GROUPS = {
  any_wood: ['fiber', 'rustwood', 'cryowood', 'glowwood', 'graywood', 'prismwood'],
  any_sand: ['silica', 'rustsand', 'graysand', 'prismsand'],
  any_fish: ['coolant_carp', 'neon_tetra', 'ripple_bass', 'chrome_tuna', 'dune_eel', 'frost_trout', 'spore_pike', 'glitch_fish', 'cave_lumen', 'moon_minnow'],
};
export const GROUP_NAMES = { any_wood: 'Any Wood', any_sand: 'Any Sand', any_fish: 'Any Fish' };

// Stations that also count as other stations.
export const STATION_PROVIDES = {
  plasmaforge: ['smelter'],
  nanoforge: ['fabricator', 'smelter', 'plasmaforge'],
  quantum: ['fabricator', 'nanoforge', 'smelter', 'plasmaforge', 'bench', 'vat', 'printer', 'tinker', 'lathe'],
  singularity: ['quantum', 'fabricator', 'nanoforge', 'smelter', 'plasmaforge', 'bench'],
};
export const STATION_NAMES = {
  bench: 'Assembly Bench', smelter: 'Smelter', fabricator: 'Fabricator', vat: 'Synth Vat', printer: 'Textile Printer',
  tinker: 'Tinker Station', plasmaforge: 'Plasma Forge', nanoforge: 'Nano Forge', quantum: 'Quantum Assembler',
  singularity: 'Singularity Core', lathe: 'Cryo Lathe', surgery: 'Surgery Bay',
};

export const RECIPES = [];
function r(out, n, ing, at = null) {
  if (!ITEMS[out]) throw new Error('recipe output missing: ' + out);
  for (const [k] of ing) if (!ITEMS[k] && !GROUPS[k]) throw new Error('recipe ingredient missing: ' + k + ' for ' + out);
  RECIPES.push({ out, n, ing, at, id: RECIPES.length });
}

// ---- by hand ----
r('assembly_bench', 1, [['any_wood', 10]]);
r('glowstick', 3, [['nanogel', 1], ['any_wood', 1]]);
r('energy_matrix', 1, [['star_shard', 5]]);
for (const w of WOODS) r(w.key + '_platform', 2, [[w.item, 1]]);
r('ration_bar', 1, [['bio_mushroom', 2], ['voltleaf', 1]]);

// ---- assembly bench ----
for (const w of WOODS) {
  if (w.item !== w.key) r(w.key + '_block', 1, [[w.item, 1]], 'bench');
  r(w.key + '_wall', 4, [[w.item, 1]], 'bench');
  r(w.key + '_table', 1, [[w.item, 8]], 'bench');
  r(w.key + '_chair', 1, [[w.item, 4]], 'bench');
  r(w.key + '_door', 1, [[w.item, 6]], 'bench');
  r(w.key + '_chest', 1, [[w.item, 8], ['ferrite_bar', 2]], 'bench');
  r(w.key + '_lamp', 1, [[w.item, 3], ['glowstick', 1]], 'bench');
}
r('fiber_head', 1, [['fiber', 20]], 'bench');
r('fiber_body', 1, [['fiber', 30]], 'bench');
r('fiber_legs', 1, [['fiber', 25]], 'bench');
r('smelter', 1, [['ferrocrete', 20], ['any_wood', 4], ['glowstick', 3]], 'bench');
r('fabricator', 1, [['ferrite_bar', 5]], 'bench');
r('textile_printer', 1, [['any_wood', 12], ['scrap', 4]], 'bench');
r('synth_vat', 1, [['glass', 2], ['nanogel', 2]], 'bench');
r('cable', 10, [['fiber', 1], ['nanogel', 1]], 'bench');
r('cable', 10, [['nano_filament', 2]], 'bench');
r('ferrocrete_brick', 1, [['ferrocrete', 2]], 'bench');
r('rustrock_brick', 1, [['rustrock', 2]], 'bench');
r('cryo_brick', 1, [['cryoice', 2]], 'bench');
r('prism_brick', 1, [['prismstone', 2]], 'bench');
r('ferrocrete_wall', 4, [['ferrocrete', 1]], 'bench');
r('regolith_wall', 4, [['regolith', 1]], 'bench');
r('basalt_wall', 4, [['basalt', 1]], 'bench');
r('glass_wall', 4, [['glass', 1]], 'bench');
r('carbon_wall', 4, [['carbon_brick', 1]], 'bench');
r('circuit_wall', 4, [['circuit_block', 1]], 'bench');
r('ferrocrete_brick_wall', 4, [['ferrocrete_brick', 1]], 'bench');
r('glowstick_cyan', 3, [['glowstick', 3], ['glowcap', 1]], 'bench');
r('glowstick_magenta', 3, [['glowstick', 3], ['gloomspore', 1]], 'bench');
r('glowstick_lime', 3, [['glowstick', 3], ['voltleaf', 1]], 'bench');
r('glowstick_amber', 3, [['glowstick', 3], ['sunpetal', 1]], 'bench');
r('glowstick_violet', 3, [['glowstick', 3], ['blight_shard', 1]], 'bench');
r('plasma_torch', 3, [['glowstick', 3], ['emberroot', 1]], 'bench');
r('cryo_torch', 3, [['glowstick', 3], ['frostbloom', 1]], 'bench');
r('trade_terminal', 1, [['circuitry', 5], ['glass', 10]], 'bench');
for (const m of METALS) r(m.key + '_wall', 4, [[m.key + '_plating', 1]], 'bench');

// ---- smelter ----
r('glass', 1, [['any_sand', 1]], 'smelter');
r('carbon_brick', 1, [['regolith', 1], ['ferrocrete', 1]], 'smelter');
r('vitri_brick', 1, [['vitrislag', 2]], 'smelter');
const BAR = { cuprite: 3, ferrite: 3, titanite: 4, lumenite: 3, xenometal: 4, cryonite: 4 };
for (const k in BAR) r(k + '_bar', 1, [[k + '_ore', BAR[k]]], 'smelter');
r('plasmite_bar', 1, [['plasmite_ore', 3], ['vitrislag', 1]], 'plasmaforge');
r('neutronium_bar', 1, [['neutronium_ore', 3]], 'plasmaforge');
r('chronite_bar', 1, [['chronite_ore', 4]], 'nanoforge');
r('aetherium_bar', 1, [['aetherium_ore', 5]], 'nanoforge');

// ---- fabricator: metal kits ----
for (const m of METALS) {
  const t = m.tier;
  const hm = m.hard;
  let st = hm ? 'nanoforge' : 'fabricator';
  if (m.key === 'cryonite') st = 'lathe';
  const bar = m.key + '_bar';
  const extra = (n) => (hm ? [] : [['any_wood', n]]);
  r(m.key + '_plating', 5, [[bar, 1], ['ferrocrete', 5]], 'fabricator');
  r(m.key + '_pick', 1, [[bar, 10 + t], ...extra(3)], st);
  r(m.key + '_cutter', 1, [[bar, 9 + t], ...extra(3)], st);
  if (ITEMS[m.key + '_blade']) r(m.key + '_blade', 1, [[bar, 8 + t]], st);
  if (ITEMS[m.key + '_gun']) r(m.key + '_gun', 1, [[bar, 8 + t], ...(t >= 3 ? [['circuitry', hm ? 4 : 1]] : [])], st);
  if (ITEMS[m.key + '_staff']) r(m.key + '_staff', 1, [[bar, 10 + t], hm ? ['quantum_dust', 5] : ['star_shard', 3]], st);
  if (ITEMS[m.key + '_remote']) r(m.key + '_remote', 1, [[bar, 8 + t], ['circuitry', hm ? 6 : 3]], st);
  if (ITEMS[m.key + '_head']) {
    const ex = m.key === 'cryonite' ? [['cryo_essence', 2]] : m.key === 'aetherium' ? [['photon_core', 3], ['void_core', 3]] : [];
    r(m.key + '_head', 1, [[bar, 10 + t], ...ex], st);
    r(m.key + '_body', 1, [[bar, 15 + t], ...ex], st);
    r(m.key + '_legs', 1, [[bar, 12 + t], ...ex], st);
  }
}
r('kinetic_round', 40, [['cuprite_bar', 1]], 'fabricator');
r('kinetic_round', 60, [['ferrite_bar', 1]], 'fabricator');
r('cryo_round', 50, [['kinetic_round', 50], ['cryonite_bar', 1]], 'fabricator');
r('plasma_round', 100, [['kinetic_round', 100], ['plasmite_bar', 1]], 'fabricator');
r('seeker_round', 100, [['kinetic_round', 100], ['chronite_bar', 1]], 'nanoforge');
r('neutron_round', 100, [['kinetic_round', 100], ['neutronium_bar', 1]], 'nanoforge');
r('void_round', 100, [['kinetic_round', 100], ['singularity_bar', 1]], 'quantum');
r('rocket_i', 25, [['neutronium_bar', 1], ['scrap', 5]], 'nanoforge');
r('rocket_mining', 25, [['rocket_i', 25], ['demo_charge', 1]], 'nanoforge');
r('grenade', 5, [['ferrite_bar', 1], ['scrap', 5], ['nanogel', 1]], 'fabricator');
r('grav_grenade', 5, [['grenade', 5], ['gravity_core', 1]], 'nanoforge');
r('demo_charge', 1, [['nanogel', 2], ['battery', 1]], 'fabricator');
r('nano_shuriken', 15, [['ferrite_bar', 1]], 'fabricator');
r('circuit_block', 10, [['circuitry', 1], ['ferrocrete', 10]], 'fabricator');
for (const n of NEON_COLORS) r('neon_' + n.key, 10, [['glass', 10], ['battery', 1]], 'fabricator');
r('depth_meter', 1, [['cuprite_bar', 8], ['ferrite_bar', 4]], 'fabricator');
r('chrono_display', 1, [['titanite_bar', 10], ['battery', 2]], 'fabricator');
r('radar', 1, [['ferrite_bar', 8], ['circuitry', 3]], 'fabricator');
r('ore_scanner', 1, [['titanite_bar', 8], ['circuitry', 2]], 'fabricator');
r('glow_drone', 1, [['ferrite_bar', 5], ['battery', 2], ['glowstick', 1]], 'fabricator');
r('energy_band', 1, [['titanite_bar', 5], ['star_shard', 5]], 'fabricator');
r('grapple_hook', 1, [['ferrite_bar', 4], ['cable', 15]], 'fabricator');
r('lumen_hook', 1, [['grapple_hook', 1], ['lumenite_bar', 8]], 'fabricator');
r('cryo_hook', 1, [['grapple_hook', 1], ['cryonite_bar', 10]], 'lathe');
r('plasma_hook', 1, [['grapple_hook', 1], ['plasmite_bar', 12]], 'fabricator');
r('neutron_hook', 1, [['grapple_hook', 1], ['neutronium_bar', 15]], 'nanoforge');
r('gravity_hook', 1, [['grapple_hook', 1], ['aetherium_bar', 15], ['gravity_core', 5]], 'nanoforge');
r('plasma_boomerang', 1, [['ion_boomerang', 1], ['plasmite_bar', 10]], 'fabricator');
r('plasma_forge', 1, [['smelter', 1], ['slag', 20], ['plasmite_ore', 10]], 'fabricator');
r('cryo_lathe', 1, [['cryoice', 20], ['cryo_essence', 3], ['titanite_bar', 6]], 'fabricator');
r('nano_forge', 1, [['fabricator', 1], ['neutronium_bar', 12]], 'fabricator');
r('quantum_assembler', 1, [['chronite_bar', 10], ['phase_residue', 5], ['circuitry', 10]], 'nanoforge');
r('singularity_core', 1, [['singularity_bar', 10], ['quantum_assembler', 1]], 'quantum');
r('blight_head', 1, [['lumenite_bar', 10], ['wyrm_scale', 8]], 'fabricator');
r('blight_body', 1, [['lumenite_bar', 15], ['wyrm_scale', 12]], 'fabricator');
r('blight_legs', 1, [['lumenite_bar', 12], ['wyrm_scale', 10]], 'fabricator');
r('blight_reaper', 1, [['lumenite_bar', 10], ['wyrm_scale', 5]], 'fabricator');
r('void_lance', 1, [['lumenite_bar', 10], ['wyrm_scale', 6], ['star_shard', 3]], 'fabricator');
r('swarm_head', 1, [['swarm_chitin', 8], ['nano_stinger', 4]], 'fabricator');
r('swarm_body', 1, [['swarm_chitin', 12], ['nano_stinger', 6]], 'fabricator');
r('swarm_legs', 1, [['swarm_chitin', 10], ['nano_stinger', 5]], 'fabricator');
r('exalted_head', 1, [['exalted_bar', 12]], 'nanoforge');
r('exalted_body', 1, [['exalted_bar', 24]], 'nanoforge');
r('exalted_legs', 1, [['exalted_bar', 18]], 'nanoforge');
r('exalted_blade', 1, [['exalted_bar', 12]], 'nanoforge');
r('exalted_repeater', 1, [['exalted_bar', 12]], 'nanoforge');
r('exalted_staff', 1, [['exalted_bar', 12], ['star_shard', 5]], 'nanoforge');
r('rocket_launcher', 1, [['neutronium_bar', 18], ['circuitry', 5]], 'nanoforge');
r('jetpack_mk1', 1, [['gravity_core', 20], ['aero_vane', 10], ['neutronium_bar', 5]], 'nanoforge');
r('jetpack_mk2', 1, [['jetpack_mk1', 1], ['chronite_bar', 10], ['targeting_matrix', 10]], 'nanoforge');
r('jetpack_mk3', 1, [['jetpack_mk2', 1], ['phase_residue', 10], ['bloom_tissue', 10]], 'nanoforge');
r('jetpack_mk4', 1, [['jetpack_mk3', 1], ['golem_core', 1], ['aetherium_bar', 15]], 'quantum');
r('purifier_cannon', 1, [['neutronium_bar', 10], ['photon_core', 10], ['circuitry', 5]], 'nanoforge');

// ---- singularity tier ----
const FR = [['fragment_flux', 6], ['fragment_volt', 6], ['fragment_nova', 6], ['fragment_drift', 6]];
r('singularity_pick', 1, [['singularity_bar', 12], ...FR.map(([k]) => [k, 4])], 'singularity');
r('singularity_cutter', 1, [['singularity_bar', 12], ...FR.map(([k]) => [k, 4])], 'singularity');
r('singularity_head', 1, [['singularity_bar', 10], ...FR.map(([k]) => [k, 4])], 'singularity');
r('singularity_body', 1, [['singularity_bar', 18], ...FR.map(([k]) => [k, 6])], 'singularity');
r('singularity_legs', 1, [['singularity_bar', 14], ...FR.map(([k]) => [k, 5])], 'singularity');
r('singularity_wings', 1, [['jetpack_mk4', 1], ['singularity_bar', 10], ...FR], 'singularity');
r('event_horizon', 1, [['singularity_bar', 14], ['fragment_flux', 12]], 'singularity');
r('railgun', 1, [['singularity_bar', 14], ['fragment_volt', 12]], 'singularity');
r('singularity_staff', 1, [['singularity_bar', 14], ['fragment_nova', 12]], 'singularity');
r('singularity_remote', 1, [['singularity_bar', 14], ['fragment_drift', 12]], 'singularity');
r('omni_stim', 4, [['mega_stim', 4], ['fragment_volt', 1]], 'quantum');
r('architect_sigil', 1, [['golem_core', 1], ...FR.map(([k]) => [k, 5])], 'quantum');

// ---- tinker station ----
r('jet_boots', 1, [['hydraulic_boots', 1], ['rocket_boots', 1]], 'tinker');
r('lift_harness', 1, [['jump_module', 1], ['grav_bubble', 1]], 'tinker');
r('bulwark', 1, [['kinetic_shield', 1], ['shock_absorbers', 1]], 'tinker');
r('gps_module', 1, [['depth_meter', 1], ['chrono_display', 1]], 'tinker');
r('data_pad', 1, [['gps_module', 1], ['radar', 1], ['ore_scanner', 1]], 'tinker');
r('thermal_regulator', 1, [['plasma_ward', 1], ['cryo_essence', 5]], 'tinker');
r('overcharger', 1, [['overclock_chip', 1], ['precision_chip', 1], ['targeting_matrix', 5]], 'tinker');

// ---- synth vat (alchemy) ----
r('micro_stim', 2, [['glass', 2], ['glowcap', 1], ['nanogel', 2]], 'vat');
r('stim_pack', 1, [['micro_stim', 2], ['glowcap', 1]], 'vat');
r('mega_stim', 4, [['stim_pack', 4], ['photon_core', 1]], 'vat');
r('charge_cell', 2, [['glass', 2], ['star_shard', 1]], 'vat');
r('greater_cell', 3, [['charge_cell', 3], ['photon_core', 1]], 'vat');
const INJ_RECIPES = {
  plating: [['voltleaf', 1], ['ferrite_ore', 1]], regen: [['voltleaf', 1], ['glowcap', 1]], swift: [['voltleaf', 1], ['sunpetal', 1]],
  optic: [['glowcap', 1], ['frostbloom', 1]], mining: [['glowcap', 1], ['bio_mushroom', 1]], feather: [['aero_vane', 1], ['voltleaf', 1]],
  ballistic: [['sunpetal', 1], ['optic_lens', 1]], energized: [['star_shard', 1], ['gloomspore', 1]], thorns: [['junglevine', 1], ['nano_stinger', 1]],
  scanner: [['titanite_ore', 1], ['glowcap', 1]], hunter: [['junglevine', 1], ['optic_lens', 1]], shine: [['glowcap', 1], ['nanogel', 1]],
  builder: [['voltleaf', 1], ['frostbloom', 1], ['emberroot', 1]], wrath: [['gloomspore', 1], ['blight_shard', 1]], rage: [['gloomspore', 1], ['wyrm_scale', 1]],
  endurance: [['frostbloom', 1], ['cryo_essence', 1]], lifeforce: [['bio_mushroom', 1], ['emberroot', 1], ['cryo_essence', 1]],
  plasma_ward: [['emberroot', 1], ['vitrislag', 2]], calm: [['frostbloom', 1], ['nanogel', 1]], battle: [['gloomspore', 1], ['nanogel', 1]],
};
for (const k in INJ_RECIPES) r(k + '_inj', 1, [['glass', 1], ...INJ_RECIPES[k]], 'vat');
r('recall_inj', 1, [['glass', 1], ['voltleaf', 1], ['sunpetal', 1]], 'vat');

// ---- textile printer ----
r('nanoweave', 1, [['nano_filament', 7]], 'printer');
r('synth_leather', 1, [['nanogel', 5], ['scrap', 2]], 'printer');
r('rest_pod', 1, [['any_wood', 15], ['nanoweave', 5], ['battery', 1]], 'printer');
r('nanoweave_head', 1, [['nanoweave', 10], ['star_shard', 2]], 'printer');
r('nanoweave_body', 1, [['nanoweave', 20], ['star_shard', 3]], 'printer');
r('nanoweave_legs', 1, [['nanoweave', 15], ['star_shard', 2]], 'printer');
r('tool_belt', 1, [['synth_leather', 6], ['ferrite_bar', 2]], 'printer');

// ---- fishing ----
r('fiber_rod', 1, [['fiber', 8], ['cable', 5]], 'bench');
r('ferrite_rod', 1, [['ferrite_bar', 8], ['cable', 10]], 'fabricator');
r('titanite_rod', 1, [['titanite_bar', 10], ['cable', 10]], 'fabricator');
r('lumen_rod', 1, [['lumenite_bar', 10], ['nano_filament', 10]], 'fabricator');
r('cryo_rod', 1, [['cryonite_bar', 12], ['cryo_essence', 2]], 'lathe');
r('plasmite_rod', 1, [['plasmite_bar', 12], ['magma_eel', 1]], 'fabricator');
r('aether_rod', 1, [['aetherium_bar', 12], ['data_shark', 1]], 'nanoforge');
r('fish_ration', 1, [['any_fish', 2]], 'vat');
r('sonar_inj', 1, [['glass', 1], ['coolant_carp', 1], ['glowcap', 1]], 'vat');
r('fishing_inj', 1, [['glass', 1], ['neon_tetra', 1], ['voltleaf', 1]], 'vat');
r('sonar_inj', 1, [['glass', 1], ['chrome_tuna', 1]], 'vat');
r('swift_inj', 1, [['glass', 1], ['dune_eel', 1]], 'vat');
r('plating_inj', 1, [['glass', 1], ['chrome_tuna', 1], ['ferrite_ore', 1]], 'vat');
r('endurance_inj', 1, [['glass', 1], ['frost_trout', 1], ['frostbloom', 1]], 'vat');
r('plasma_ward_inj', 1, [['glass', 1], ['magma_eel', 1]], 'vat');
r('wrath_inj', 1, [['glass', 1], ['glitch_fish', 1]], 'vat');
r('optic_inj', 1, [['glass', 1], ['cave_lumen', 1]], 'vat');
r('lifeforce_inj', 1, [['glass', 1], ['prism_koi', 1]], 'vat');
r('regen_inj', 1, [['glass', 1], ['spore_pike', 1]], 'vat');
r('glow_grub', 3, [['bio_worm', 3], ['glowcap', 1]], 'vat');

// ---- circuitry, surgery, vehicles, cyberware ----
r('circuitry', 1, [['scrap', 2], ['cuprite_bar', 1]], 'fabricator');
r('battery', 1, [['scrap', 2], ['nanogel', 3], ['ferrite_bar', 1]], 'fabricator');
r('surgery_bay', 1, [['ferrite_bar', 10], ['circuitry', 5], ['battery', 2], ['glass', 4]], 'fabricator');
r('hoverbike', 1, [['ferrite_bar', 14], ['battery', 4], ['circuitry', 3]], 'fabricator');
r('drillpod', 1, [['titanite_bar', 16], ['titanite_pick', 1], ['battery', 4]], 'fabricator');
r('skycar', 1, [['xenometal_bar', 20], ['battery', 6], ['circuitry', 6], ['aero_vane', 8]], 'fabricator');
r('mech', 1, [['neutronium_bar', 25], ['force_matrix', 8], ['circuitry', 10]], 'nanoforge');
r('starjumper', 1, [['skycar', 1], ['chronite_bar', 15], ['gravity_core', 10], ['golem_core', 1]], 'quantum');
const S = 'surgery';
r('thermal_optics', 1, [['optic_lens', 6], ['circuitry', 4], ['titanite_bar', 5]], S);
r('ore_lens', 1, [['optic_lens', 2], ['titanite_ore', 10], ['circuitry', 4]], S);
r('zoom_optics', 1, [['optic_lens', 4], ['lumenite_bar', 8], ['circuitry', 4]], S);
r('targeting_optics', 1, [['targeting_scope', 1], ['circuitry', 4], ['targeting_matrix', 5]], S);
r('mantis_blades', 1, [['xenometal_bar', 15], ['circuitry', 4], ['battery', 2]], S);
r('gorilla_arms', 1, [['ferrite_bar', 15], ['bone_alloy', 5], ['circuitry', 4]], S);
r('grapple_arm', 1, [['grapple_hook', 1], ['titanite_bar', 8], ['circuitry', 4]], S);
r('launcher_arm', 1, [['plasmite_bar', 12], ['battery', 6], ['circuitry', 6]], S);
r('exo_spine', 1, [['ferrite_bar', 20], ['bone_alloy', 10], ['circuitry', 4]], S);
r('synth_muscle', 1, [['biofiber', 10], ['nanoweave', 8], ['circuitry', 4]], S);
r('shock_spine', 1, [['cryonite_bar', 10], ['battery', 6], ['nano_stinger', 5]], S);
r('spring_legs', 1, [['jump_module', 1], ['cuprite_bar', 8], ['circuitry', 4]], S);
r('kinetic_legs', 1, [['titanite_bar', 12], ['battery', 4], ['circuitry', 4]], S);
r('mag_treads', 1, [['gecko_gloves', 1], ['hover_soles', 1], ['circuitry', 6]], S);
r('nano_heart', 1, [['vital_core', 2], ['lumenite_bar', 10], ['circuitry', 6]], S);
r('fusion_core', 1, [['energy_matrix', 3], ['xenometal_bar', 8], ['battery', 4]], S);
r('bio_monitor', 1, [['bio_spore', 10], ['cryo_essence', 3], ['circuitry', 4]], S);
r('overclock_core', 1, [['neutronium_bar', 10], ['force_matrix', 5], ['circuitry', 6]], S);
r('reflex_booster', 1, [['cryonite_bar', 15], ['circuitry', 10], ['cryo_essence', 5]], S);
r('tactical_link', 1, [['swarm_chitin', 10], ['circuitry', 6], ['battery', 4]], S);
r('hack_uplink', 1, [['circuitry', 20], ['battery', 10], ['bone_alloy', 5]], S);
r('overdrive_chip', 1, [['neutronium_bar', 10], ['terror_matrix', 5], ['circuitry', 6]], S);

// ---- futuristic weapons & tech ----
r('smart_pistol', 1, [['ferrite_bar', 8], ['circuitry', 3]], 'fabricator');
r('monofilament_whip', 1, [['titanite_bar', 10], ['nano_filament', 10], ['circuitry', 2]], 'fabricator');
r('barrier_projector', 1, [['titanite_bar', 10], ['battery', 4], ['circuitry', 4]], 'fabricator');
r('quantum_beacon', 1, [['titanite_bar', 8], ['star_shard', 5], ['circuitry', 4]], 'fabricator');
r('photon_lance', 1, [['lumenite_bar', 12], ['star_shard', 4], ['circuitry', 4]], 'fabricator');
r('coilgun', 1, [['xenometal_bar', 14], ['battery', 6], ['circuitry', 4]], 'fabricator');
r('gravity_gun', 1, [['cryonite_bar', 10], ['battery', 6], ['circuitry', 4]], 'lathe');
r('nano_disassembler', 1, [['cryonite_bar', 12], ['battery', 4], ['circuitry', 6]], 'lathe');
r('wormhole_projector', 1, [['lumenite_bar', 10], ['bone_alloy', 10], ['circuitry', 8], ['star_shard', 2]], 'fabricator');
r('black_hole_charge', 5, [['gravity_core', 1], ['neutronium_bar', 2]], 'nanoforge');
r('plasma_filament', 1, [['monofilament_whip', 1], ['neutronium_bar', 12], ['void_core', 5]], 'nanoforge');
r('graviton_ray', 1, [['chronite_bar', 14], ['gravity_core', 6], ['circuitry', 8]], 'nanoforge');
r('matter_disassembler', 1, [['chronite_bar', 16], ['circuitry', 10]], 'nanoforge');
r('tachyon_lance', 1, [['aetherium_bar', 16], ['circuitry', 10], ['photon_core', 5]], 'nanoforge');

// ---- boss and event summons ----
r('optic_lure', 1, [['optic_lens', 6], ['scrap', 3]], 'fabricator');
r('gel_beacon', 1, [['nanogel', 30], ['scrap', 5]], 'fabricator');
r('intrusion_key', 1, [['circuitry', 6], ['battery', 2], ['ferrite_bar', 8]], 'fabricator');
r('chrono_seed', 1, [['bone_alloy', 12], ['battery', 3], ['optic_lens', 4]], 'fabricator');
r('legion_seed', 1, [['quantum_dust', 10], ['nano_filament', 20], ['circuitry', 6]], 'nanoforge');
r('null_lantern', 1, [['void_core', 5], ['phase_residue', 3], ['exalted_bar', 5]], 'nanoforge');
r('proxy_drive', 1, [['firewall_core', 8], ['circuitry', 4]], 'fabricator');
r('chrono_loop', 1, [['chrono_shard', 10], ['battery', 2]], 'fabricator');
r('legion_remote', 1, [['legion_cell', 14]], 'nanoforge');
r('umbral_veil', 1, [['umbral_core', 10]], 'nanoforge');
r('null_beam', 1, [['umbral_core', 14], ['photon_core', 6]], 'nanoforge');
r('corrupt_datachip', 1, [['blight_shard', 15], ['circuitry', 1]], 'fabricator');
r('pheromone_chip', 1, [['nano_stinger', 10], ['bio_spore', 5], ['circuitry', 1]], 'fabricator');
r('archon_key', 1, [['bone_alloy', 10], ['circuitry', 5], ['lumenite_bar', 3]], 'fabricator');
r('core_override', 1, [['plasmite_bar', 10], ['bone_alloy', 10]], 'fabricator');
r('signal_flare', 1, [['scrap', 10], ['nanogel', 5], ['battery', 1]], 'fabricator');
r('red_shift_beacon', 1, [['blight_shard', 5], ['optic_lens', 1], ['nanogel', 5]], 'fabricator');
r('mech_optic', 1, [['optic_lens', 3], ['ferrite_bar', 5], ['photon_core', 6]], 'nanoforge');
r('mech_worm', 1, [['blight_shard', 6], ['ferrite_bar', 5], ['void_core', 6]], 'nanoforge');
r('mech_skull', 1, [['bone_alloy', 30], ['ferrite_bar', 5], ['photon_core', 3], ['void_core', 3]], 'nanoforge');
r('power_cell', 1, [['bloom_tissue', 3], ['battery', 5], ['chronite_bar', 5]], 'nanoforge');
r('eclipse_lens', 1, [['optic_lens', 3], ['photon_core', 5], ['void_core', 5], ['targeting_matrix', 1]], 'nanoforge');

export function stationsProvided(stationSet) {
  const s = new Set(stationSet);
  for (const st of stationSet) for (const p of STATION_PROVIDES[st] || []) s.add(p);
  return s;
}
