import { BOARD_HEIGHT, BOARD_WIDTH } from "./constants.js";

export const ARENA_TYPES = Object.freeze({ SQUARE: "square", RECTANGLE: "rectangle" });

export const SQUARE_SPAWNS = Object.freeze([
  { x: 1, y: 1 },
  { x: BOARD_WIDTH - 2, y: BOARD_HEIGHT - 2 },
  { x: BOARD_WIDTH - 2, y: 1 },
  { x: 1, y: BOARD_HEIGHT - 2 },
]);

export const RECTANGLE_WIDTH = 23;
export const RECTANGLE_HEIGHT = 15;
export function arenaDimensions(arenaType) {
  return arenaType === ARENA_TYPES.RECTANGLE
    ? { width: RECTANGLE_WIDTH, height: RECTANGLE_HEIGHT }
    : { width: BOARD_WIDTH, height: BOARD_HEIGHT };
}
// Grid strings include outside cells and have one of two fixed sizes.
export function gridDimensions(grid) {
  return arenaDimensions(grid?.length === RECTANGLE_WIDTH * RECTANGLE_HEIGHT ? ARENA_TYPES.RECTANGLE : ARENA_TYPES.SQUARE);
}
// Four corners, then the middle of the top and bottom edges.
export const RECTANGLE_SPAWNS = Object.freeze([
  { x: 1, y: 1 },
  { x: RECTANGLE_WIDTH - 2, y: RECTANGLE_HEIGHT - 2 },
  { x: RECTANGLE_WIDTH - 2, y: 1 },
  { x: 1, y: RECTANGLE_HEIGHT - 2 },
  { x: Math.floor(RECTANGLE_WIDTH / 2), y: 1 },
  { x: Math.floor(RECTANGLE_WIDTH / 2), y: RECTANGLE_HEIGHT - 2 },
]);

export function arenaTypeForPlayerCount(playerCount) {
  return playerCount > 4
    ? ARENA_TYPES.RECTANGLE
    : ARENA_TYPES.SQUARE;
}

export function isInsideArena(arenaType, x, y) {
  const { width, height } = arenaDimensions(arenaType);
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function isArenaBoundary(arenaType, x, y) {
  if (!isInsideArena(arenaType, x, y)) return false;
  return [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ].some(([dx, dy]) => !isInsideArena(arenaType, x + dx, y + dy));
}

export function spawnsForArena(arenaType) {
  return arenaType === ARENA_TYPES.RECTANGLE ? RECTANGLE_SPAWNS : SQUARE_SPAWNS;
}
