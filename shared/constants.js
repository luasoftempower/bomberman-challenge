export const BOARD_WIDTH = 13;
export const BOARD_HEIGHT = 11;
export const TILE_SIZE = 40;
export const TICK_RATE = 40;
export const TICK_SECONDS = 1 / TICK_RATE;
export const MOVE_SPEED = 95;
export const PLAYER_SIZE = 26;
export const MAX_BOMBS = 2;
export const BLAST_RANGE = 2;
export const FUSE_SECONDS = 2.2;
export const BLAST_SECONDS = 0.45;
export const ROOM_CAPACITY = 4;
export const EMPTY = ".";
export const WALL = "#";
export const CRATE = "o";

export const SPAWNS = [
  { x: 1, y: 1 },
  { x: BOARD_WIDTH - 2, y: BOARD_HEIGHT - 2 },
  { x: BOARD_WIDTH - 2, y: 1 },
  { x: 1, y: BOARD_HEIGHT - 2 },
];

export const PLAYER_COLORS = ["#9b6cff", "#c8ff50", "#ff6b8b", "#55dff7"];

export const DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];
