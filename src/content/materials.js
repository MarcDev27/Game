// Material palettes shared by tiles, walls, furniture and item icons.

// Metal tiers. pick = pickaxe power of tools made from this metal.
export const METALS = [
  { key: 'cuprite', name: 'Cuprite', color: '#e08a4a', dark: '#8a4421', glow: null, tier: 1, pick: 40, minPick: 0, hp: 1.4, hard: false },
  { key: 'ferrite', name: 'Ferrite', color: '#aeb7c2', dark: '#59616c', glow: null, tier: 2, pick: 45, minPick: 0, hp: 1.6, hard: false },
  { key: 'titanite', name: 'Titanite', color: '#f2dd7a', dark: '#8f7a2a', glow: null, tier: 3, pick: 55, minPick: 40, hp: 1.9, hard: false },
  { key: 'lumenite', name: 'Lumenite', color: '#a46bff', dark: '#4b2a8a', glow: [0.35, 0.18, 0.6], tier: 4, pick: 65, minPick: 55, hp: 2.3, hard: false },
  { key: 'xenometal', name: 'Xenometal', color: '#ff6a3d', dark: '#8a2a12', glow: [0.4, 0.12, 0.05], tier: 4, pick: 65, minPick: 55, hp: 2.3, hard: false },
  { key: 'cryonite', name: 'Cryonite', color: '#7ff0ff', dark: '#2a7a8a', glow: [0.15, 0.45, 0.55], tier: 5, pick: 75, minPick: 65, hp: 2.7, hard: false },
  { key: 'plasmite', name: 'Plasmite', color: '#ff3fa4', dark: '#8a1150', glow: [0.6, 0.12, 0.35], tier: 6, pick: 100, minPick: 75, hp: 3.0, hard: false },
  { key: 'neutronium', name: 'Neutronium', color: '#5a78ff', dark: '#1d2a7a', glow: [0.12, 0.2, 0.6], tier: 7, pick: 130, minPick: 100, hp: 3.5, hard: true },
  { key: 'chronite', name: 'Chronite', color: '#3dffb0', dark: '#118a5a', glow: [0.1, 0.55, 0.35], tier: 8, pick: 160, minPick: 130, hp: 4.0, hard: true },
  { key: 'aetherium', name: 'Aetherium', color: '#fff1a8', dark: '#9a8a3a', glow: [0.6, 0.55, 0.3], tier: 9, pick: 200, minPick: 160, hp: 4.6, hard: true },
];
export const METAL = Object.fromEntries(METALS.map((m) => [m.key, m]));

// Wood-like building materials (each yields a furniture set).
export const WOODS = [
  { key: 'fiber', item: 'fiber', name: 'Fiber', block: 'Fiber Panel', color: '#a88f72', accent: '#3ff0d0', light: [0.95, 0.85, 0.7] },
  { key: 'rustwood', item: 'rustwood', name: 'Rustwood', block: 'Rustwood Panel', color: '#a0573a', accent: '#ffb347', light: [1, 0.7, 0.4] },
  { key: 'cryowood', item: 'cryowood', name: 'Cryowood', block: 'Cryowood Panel', color: '#8fb3c9', accent: '#c8f6ff', light: [0.7, 0.9, 1] },
  { key: 'glowwood', item: 'glowwood', name: 'Glowwood', block: 'Glowwood Panel', color: '#55703f', accent: '#b4ff4a', light: [0.7, 1, 0.45] },
  { key: 'graywood', item: 'graywood', name: 'Graywood', block: 'Graywood Panel', color: '#5f5873', accent: '#c08bff', light: [0.75, 0.55, 1] },
  { key: 'prismwood', item: 'prismwood', name: 'Prismwood', block: 'Prismwood Panel', color: '#d8c6ef', accent: '#ff8cf0', light: [1, 0.7, 0.95] },
  { key: 'hull', item: 'derelict_hull', name: 'Hull', block: 'Hull Panel', color: '#44607e', accent: '#66ccff', light: [0.55, 0.8, 1] },
  { key: 'slagstone', item: 'slag', name: 'Slagstone', block: 'Slagstone Panel', color: '#4a3636', accent: '#ff5a2a', light: [1, 0.5, 0.25] },
];
export const WOOD = Object.fromEntries(WOODS.map((w) => [w.key, w]));

export const NEON_COLORS = [
  { key: 'cyan', name: 'Cyan', color: '#2ef2ff', light: [0.2, 0.9, 1] },
  { key: 'magenta', name: 'Magenta', color: '#ff3ddc', light: [1, 0.25, 0.85] },
  { key: 'lime', name: 'Lime', color: '#9dff3d', light: [0.6, 1, 0.25] },
  { key: 'amber', name: 'Amber', color: '#ffb12e', light: [1, 0.7, 0.2] },
  { key: 'violet', name: 'Violet', color: '#9a5cff', light: [0.6, 0.35, 1] },
  { key: 'white', name: 'White', color: '#e8f6ff', light: [0.95, 0.97, 1] },
];

export const RARITY_COLORS = ['#c8c8c8', '#8fb8ff', '#8fff9a', '#ffb070', '#ff8fa8', '#d08fff', '#90ffef', '#fff27a', '#ff7af6', '#7affb4', '#ffffff'];
