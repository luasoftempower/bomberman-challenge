import { CRATE, EMPTY, WALL } from './constants.js';
import { ARENA_TYPES, arenaDimensions, spawnsForArena } from './arena.js';

export const MAP_THEMES = Object.freeze({
  reactor: { color: '#55dff7', floor: '#162a38', wall: '#50697c', glow: '#b8f6ff' },
  circuit: { color: '#c8f34a', floor: '#0c3736', wall: '#29786c', glow: '#f2ffac' },
  furnace: { color: '#ffae42', floor: '#302a32', wall: '#8b4d32', glow: '#ffe3a0' },
  garden: { color: '#61e88a', floor: '#213426', wall: '#36734f', glow: '#c6ffce' },
  plasma: { color: '#b295ff', floor: '#222b44', wall: '#466a92', glow: '#ffe9a3' },
  temple: { color: '#ffce58', floor: '#451e28', wall: '#957531', glow: '#fff0b0' },
  station: { color: '#c8f34a', floor: '#14352c', wall: '#46794d', glow: '#e8ffc0' },
});
export const BLOCK_COLORS = Object.freeze(['#55dff7', '#c8f34a', '#ffae42', '#61e88a', '#b295ff', '#ff77b5']);
export const MAP_FAMILIES = Object.freeze([
  { id: 'plasma', theme: 'plasma', nameKey: 'maps.familyPlasma' },
  { id: 'circuit', theme: 'circuit', nameKey: 'maps.familyCircuit' },
  { id: 'furnace', theme: 'furnace', nameKey: 'maps.familyFurnace' },
  { id: 'garden', theme: 'garden', nameKey: 'maps.familyGarden' },
  { id: 'temple', theme: 'temple', nameKey: 'maps.familyTemple' },
  { id: 'station', theme: 'station', nameKey: 'maps.familyStation' },
]);
// Six families × six layouts from the reference collection. Keep existing IDs
// for previously selected arenas and saved editor templates.
export const STANDARD_MAPS = Object.freeze([
  { id: 'original', theme: 'reactor', nameKey: 'maps.original', detailKey: 'maps.originalDetail' },
  ...MAP_FAMILIES.flatMap((family) => Array.from({ length: 6 }, (_, index) => {
    const variant = index + 1;
    const legacy = (family.id === 'circuit' || family.id === 'furnace') && variant === 2
      || family.id === 'garden' && variant === 1;
    return { id: legacy ? family.id : `${family.id}-${variant}`, theme: family.theme,
      family: family.id, variant, nameKey: `maps.variant_${family.id}`, nameParams: { number: variant }, detailKey: `maps.layout_${variant}` };
  })),
]);

// Layouts translate the reference's rings, split corridors, dense lattices,
// winding paths, terraces and open checker fields into energy modules.
// Destructible cover makes the patterns navigable after bombs clear a path.
function referenceCover(variant, x, y, familyIndex) {
  const sx = familyIndex % 2 ? 16 - x : x;
  const sy = familyIndex >= 3 ? 10 - y : y;
  const ring = Math.min(sx, 16 - sx, sy, 10 - sy);
  const offset = familyIndex % 3;
  switch (variant) {
    case 1: return (ring + offset) % 3 !== 2 && !(sx === 8 && sy % 4 === 1);
    case 2: return sx !== 8 && sy !== 5 && (sx + offset) % 8 !== 4;
    case 3: return (sx + sy + offset) % 5 !== 0 && (sx + 2 * sy + offset) % 7 !== 3;
    case 4: return (ring + offset) % 3 !== 1 && !((sx < 8 ? sy : 10 - sy) === 2 + offset);
    case 5: return (sx + offset) % 4 < 2 && sy % 4 !== (familyIndex % 4);
    default: return (sx * 3 + sy * 5 + familyIndex) % 8 < 3;
  }
}

function referenceMap(preset, arenaType) {
  const { width, height } = arenaDimensions(arenaType);
  const safe = protectedMapCells(arenaType);
  const familyIndex = MAP_FAMILIES.findIndex((family) => family.id === preset.family);
  const baseColor = { plasma: 4, circuit: 1, furnace: 2, garden: 3, temple: 2, station: 1 }[preset.family];
  const cells = [], colors = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const sx = Math.floor((x - 1) * 17 / (width - 2));
      const sy = Math.floor((y - 1) * 11 / (height - 2));
      const pillar = x % 2 === 0 && y % 2 === 0
        && !(preset.family === 'garden' && (x + y) % 6 === 0)
        && !(preset.family === 'furnace' && x % 6 === 0)
        && !(preset.family === 'station' && (x + y) % 8 === 0);
      cells.push(border ? WALL : safe.has(y * width + x) ? EMPTY : pillar ? WALL
        : referenceCover(preset.variant, sx, sy, familyIndex) ? CRATE : EMPTY);
      const color = preset.family === 'plasma' ? [0, 1, 2, 4][(x + y + preset.variant) % 4]
        : preset.family === 'temple' && (x + y) % 5 === 0 ? 0
        : preset.family === 'station' && (x * 3 + y + preset.variant) % 7 === 0 ? 2 : baseColor;
      colors.push(String(color));
    }
  }
  return { id: preset.id, name: '', theme: preset.theme, grid: cells.join(''), colors: colors.join('') };
}

// Spawns and two adjacent escape tiles are protected in every preset/editor.
export function protectedMapCells(arenaType = ARENA_TYPES.RECTANGLE) {
  const { width, height } = arenaDimensions(arenaType);
  const cells = new Set();
  for (const { x, y } of spawnsForArena(arenaType)) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && ny > 0 && nx < width - 1 && ny < height - 1) cells.add(ny * width + nx);
    }
  }
  return cells;
}

// Three layouts inspired by the references, extended symmetrically for six slots.
export function presetMap(id, arenaType = ARENA_TYPES.RECTANGLE) {
  const preset = STANDARD_MAPS.find((map) => map.id === id);
  if (!preset) throw new Error('Unknown map');
  if (!['original', 'circuit', 'furnace', 'garden'].includes(id)) return referenceMap(preset, arenaType);
  const { width, height } = arenaDimensions(arenaType);
  const protectedCells = protectedMapCells(arenaType);
  const cells = [], colors = [];
  const defaultColor = { original: 0, circuit: 1, furnace: 2, garden: 3 }[id];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const pillar = x % 2 === 0 && y % 2 === 0
        && (id !== 'furnace' || x % 6 !== 0)
        && (id !== 'garden' || (x + y) % 6 !== 0);
      // Open cross corridors connect the circuit; furnace has wider central lanes.
      const corridor = id === 'circuit' ? x === Math.floor(width / 2) || y === Math.floor(height / 2)
        : id === 'furnace' ? x % 6 === 3 || y === Math.floor(height / 2)
        : id === 'garden' ? (x + y) % 4 === 0 : (x * 7 + y * 3) % 5 === 0;
      cells.push(border ? WALL : protectedCells.has(y * width + x) ? EMPTY
        : pillar ? WALL : corridor ? EMPTY : CRATE);
      colors.push(String(defaultColor));
    }
  }
  return { id, name: '', theme: preset.theme, grid: cells.join(''), colors: colors.join('') };
}

// Never trust a browser's validation: the server uses this same bounded schema.
export function validateCustomMap(value) {
  const { width, height } = arenaDimensions(ARENA_TYPES.RECTANGLE);
  if (!value || typeof value !== 'object' || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 32
    || typeof value.theme !== 'string' || !Object.hasOwn(MAP_THEMES, value.theme) || typeof value.grid !== 'string' || value.grid.length !== width * height
    || /[^.#o]/.test(value.grid) || typeof value.colors !== 'string' || value.colors.length !== width * height
    || /[^0-5]/.test(value.colors)) return { error: 'maps.invalid' };
  const protectedCells = protectedMapCells();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && value.grid[index] !== WALL) return { error: 'maps.borderError' };
      if (protectedCells.has(index) && value.grid[index] !== EMPTY) return { error: 'maps.spawnError' };
    }
  }
  // Crates can be destroyed, but solid walls must not isolate any playable cell.
  const first = spawnsForArena(ARENA_TYPES.RECTANGLE)[0];
  const seen = new Set([first.y * width + first.x]), queue = [...seen];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const at = queue[cursor], x = at % width, y = Math.floor(at / width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * width + nx;
      if (nx > 0 && ny > 0 && nx < width - 1 && ny < height - 1 && value.grid[next] !== WALL && !seen.has(next)) {
        seen.add(next); queue.push(next);
      }
    }
  }
  if ([...value.grid].some((tile, index) => tile !== WALL && !seen.has(index))) return { error: 'maps.disconnected' };
  return { map: { id: 'custom', name: value.name.trim(), theme: value.theme, grid: value.grid, colors: value.colors } };
}
