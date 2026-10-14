import { BLOCK_COLORS, MAP_THEMES } from '../shared/maps.js';
import { CRATE, WALL } from '../shared/constants.js';
import { gridDimensions, spawnsForArena, ARENA_TYPES } from '../shared/arena.js';
import { drawArenaProp } from './arena-art.js';

// Pixel-built energy modules, shared by previews, editor and the cached arena.
export function drawEnergyTile(ctx, tile, x, y, themeId = 'reactor', colorIndex = 0, size = 40) {
  const theme = MAP_THEMES[themeId] || MAP_THEMES.reactor;
  const color = BLOCK_COLORS[Number(colorIndex)] || theme.color;
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 40, size / 40);
  const rect = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
  rect('#09151d', 0, 0, 40, 40); rect(theme.floor, 1, 1, 38, 38);
  rect('#ffffff0c', 2, 2, 36, 1); rect('#00000024', 2, 35, 36, 3);
  rect('#ffffff09', 6, 20, 10, 1); rect('#ffffff09', 27, 7, 1, 10);
  if (tile === WALL) {
    rect('#06121b', 1, 1, 38, 38); rect(theme.wall, 2, 2, 36, 32);
    rect('#ffffff35', 2, 2, 36, 3); rect('#00000055', 4, 30, 34, 7);
    rect('#00000035', 6, 8, 28, 20); rect('#ffffff12', 7, 9, 26, 1);
    rect(theme.color, 3, 12, 2, 16); rect(theme.color, 35, 12, 2, 16);
    rect('#0b2027', 12, 13, 16, 13); rect(theme.color, 17, 14, 6, 10);
    rect(theme.glow, 19, 13, 3, 6); rect(theme.glow, 15, 19, 8, 3);
    for (const [a, b] of [[6, 5], [31, 5], [6, 29], [31, 29]]) rect('#cadce2', a, b, 2, 2);
  } else if (tile === CRATE) {
    rect('#00000065', 4, 6, 33, 32); rect('#102332', 3, 3, 33, 32);
    rect(color, 4, 4, 31, 3); rect(color, 4, 8, 3, 25); rect(color, 32, 8, 3, 25);
    rect('#ffffff24', 7, 8, 24, 23); rect('#071820', 17, 9, 5, 23);
    rect(color, 8, 10, 7, 19); rect(color, 24, 10, 6, 19);
    rect('#ffffff35', 8, 10, 7, 2); rect('#ffffff35', 24, 10, 6, 2);
    rect('#09141c', 13, 15, 14, 10); rect(color, 15, 17, 10, 6);
    rect('#f1ffff', 19, 17, 3, 4); rect('#f1ffff', 17, 20, 5, 2);
    rect(color, 5, 32, 29, 3); rect('#00000045', 7, 30, 24, 2);
  }
  ctx.restore();
}

export function paintMapPreview(canvas, map, showSpawns = true) {
  const { width, height } = gridDimensions(map.grid);
  const size = 16;
  canvas.width = width * size; canvas.height = height * size;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < map.grid.length; i++) {
    const x = (i % width) * size, y = Math.floor(i / width) * size;
    drawEnergyTile(ctx, map.grid[i], x, y, map.theme, map.colors[i], size);
    if (map.id === 'original' && [WALL, CRATE].includes(map.grid[i])) {
      drawArenaProp(ctx, map.grid[i] === WALL ? 'wall' : 'crate', x + 1, y + 1, size - 2, size - 2);
    }
  }
  if (showSpawns) {
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [slot, spawn] of spawnsForArena(width === 23 ? ARENA_TYPES.RECTANGLE : ARENA_TYPES.SQUARE).entries()) {
      ctx.fillStyle = '#101c2a'; ctx.fillRect(spawn.x * size + 1, spawn.y * size + 1, 14, 14);
      ctx.fillStyle = '#e9ffff'; ctx.fillText(String(slot + 1), (spawn.x + .5) * size, (spawn.y + .5) * size);
    }
  }
}
