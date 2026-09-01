export const BOARD_WIDTH = 13;
export const BOARD_HEIGHT = 11;
export const TILE_SIZE = 40;
export const TICK_RATE = 40;
export const TICK_SECONDS = 1 / TICK_RATE;
// Ritmo ágil inspirado nos Bomberman de 16 bits, sem perder a precisão por casa.
export const MOVE_SPEED = 112;
export const PLAYER_SIZE = 26;
export const MAX_BOMBS = 2;
export const BLAST_RANGE = 2;
export const FUSE_SECONDS = 1.95;
export const BLAST_SECONDS = 0.4;
export const ROOM_CAPACITY = 4;
export const GAME_MODES = Object.freeze({ CLASSIC: "classic", SUPER: "super" });
export const POWERUP_TYPES = Object.freeze([
  "fire",
  "bomb",
  "speed",
  "remote",
  "glove",
  "kick",
  "bombPass",
  "blockPass",
  "suit",
  "fullFire",
]);
export const MAX_BOMBS_LIMIT = 8;
export const MAX_FIRE_RANGE = Math.max(BOARD_WIDTH, BOARD_HEIGHT);
export const MAX_MOVE_SPEED = 184;
export const SPEED_UP_AMOUNT = 18;
export const SUIT_SECONDS = 8;
export const POWERUP_DROP_CHANCE = 0.48;
export const BOMB_SLIDE_SECONDS = 0.12;
export const BOMB_THROW_SECONDS = 0.42;
export const DEATH_BLOCK_FALL_SECONDS = 0.62;
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
