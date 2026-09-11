import { BOARD_HEIGHT, BOARD_WIDTH } from "./constants.js";

export const ARENA_TYPES = Object.freeze({ SQUARE: "square", HEXAGON: "hexagon" });

export const SQUARE_SPAWNS = Object.freeze([
  { x: 1, y: 1 },
  { x: BOARD_WIDTH - 2, y: BOARD_HEIGHT - 2 },
  { x: BOARD_WIDTH - 2, y: 1 },
  { x: 1, y: BOARD_HEIGHT - 2 },
]);

// Eight safe starting points distributed around the six-sided arena.
export const HEXAGON_SPAWNS = Object.freeze([
  { x: 5, y: 1 },
  { x: 7, y: 1 },
  { x: 3, y: 3 },
  { x: 9, y: 3 },
  { x: 1, y: 5 },
  { x: 11, y: 5 },
  { x: 3, y: 7 },
  { x: 9, y: 7 },
]);

export function arenaTypeForPlayerCount(playerCount) {
  return playerCount > 4 ? ARENA_TYPES.HEXAGON : ARENA_TYPES.SQUARE;
}

export function isInsideArena(arenaType, x, y) {
  if (x < 0 || y < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return false;
  if (arenaType !== ARENA_TYPES.HEXAGON) return true;

  // A discrete six-sided mask: short horizontal top/bottom edges and four diagonal edges.
  const distanceFromMiddle = Math.abs(y - Math.floor(BOARD_HEIGHT / 2));
  const inset = distanceFromMiddle;
  return x >= inset && x < BOARD_WIDTH - inset;
}

export function isArenaBoundary(arenaType, x, y) {
  if (!isInsideArena(arenaType, x, y)) return false;
  return [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ].some(([dx, dy]) => !isInsideArena(arenaType, x + dx, y + dy));
}

export function spawnsForArena(arenaType) {
  return arenaType === ARENA_TYPES.HEXAGON ? HEXAGON_SPAWNS : SQUARE_SPAWNS;
}
