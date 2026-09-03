import {
  BLAST_RANGE,
  BLAST_SECONDS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOMB_SLIDE_SECONDS,
  BOMB_THROW_SECONDS,
  CRATE,
  DEATH_BLOCK_FALL_SECONDS,
  DIRECTIONS,
  EMPTY,
  FUSE_SECONDS,
  GAME_MODES,
  MAX_BOMBS,
  MAX_BOMBS_LIMIT,
  MAX_FIRE_RANGE,
  MAX_MOVE_SPEED,
  MOVE_SPEED,
  POWERUP_DROP_CHANCE,
  SPAWNS,
  SPEED_UP_AMOUNT,
  SUIT_SECONDS,
  TICK_RATE,
  TICK_SECONDS,
  TILE_SIZE,
  WALL,
} from "./constants.js";

const POWERUP_WEIGHTS = [
  ["fire", 22], ["bomb", 20], ["speed", 19], ["remote", 8], ["glove", 7],
  ["kick", 8], ["bombPass", 5], ["blockPass", 4], ["suit", 5], ["fullFire", 2],
];
const TURN_BUFFER_TICKS = Math.ceil(TICK_RATE * 0.5);

export function seededRandom(seed) {
  let value = (Number(seed) || 1) >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export const indexOf = (x, y) => y * BOARD_WIDTH + x;
export const tileAt = (grid, x, y) => grid[indexOf(x, y)];

function setTile(state, x, y, value) {
  const position = indexOf(x, y);
  if (position < 0 || position >= state.grid.length) return;
  const mutable = state.grid.split("");
  mutable[position] = value;
  state.grid = mutable.join("");
}

export function createGrid(seed = Date.now()) {
  const random = seededRandom(seed);
  const grid = Array(BOARD_WIDTH * BOARD_HEIGHT).fill(EMPTY);
  const clear = new Set();
  const crateChance = 0.64 + random() * 0.18;

  for (const spawn of SPAWNS) {
    clear.add(`${spawn.x},${spawn.y}`);
    clear.add(`${spawn.x + (spawn.x === 1 ? 1 : -1)},${spawn.y}`);
    clear.add(`${spawn.x},${spawn.y + (spawn.y === 1 ? 1 : -1)}`);
  }

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const border = x === 0 || y === 0 || x === BOARD_WIDTH - 1 || y === BOARD_HEIGHT - 1;
      const pillar = x % 2 === 0 && y % 2 === 0;
      if (border || pillar) grid[indexOf(x, y)] = WALL;
      else if (!clear.has(`${x},${y}`) && random() < crateChance) grid[indexOf(x, y)] = CRATE;
    }
  }
  return grid.join("");
}

export function createPlayer({ id, slot, name, kind = "human" }) {
  const spawn = SPAWNS[slot];
  return {
    id, slot, name, kind,
    x: (spawn.x + 0.5) * TILE_SIZE,
    y: (spawn.y + 0.5) * TILE_SIZE,
    alive: true,
    dropLatch: false,
    detonateLatch: false,
    specialLatch: false,
    moveTarget: null,
    queuedDirection: null,
    queuedDirectionUntilTick: 0,
    facing: slot === 0 || slot === 3 ? "right" : "left",
    maxBombs: MAX_BOMBS,
    fireRange: BLAST_RANGE,
    moveSpeed: MOVE_SPEED,
    remote: false,
    glove: false,
    kick: false,
    bombPass: false,
    blockPass: false,
    invincibleUntilTick: 0,
  };
}

export function createMatch(seed, slots, { mode = GAME_MODES.CLASSIC } = {}) {
  return {
    tick: 0,
    seed,
    mode,
    grid: createGrid(seed),
    players: slots.map(createPlayer),
    bombs: [],
    blasts: [],
    powerups: [],
    fallingBlocks: [],
    suddenDeathActive: false,
    status: "playing",
    winnerSlot: undefined,
    nextBombId: 1,
    nextPowerupId: 1,
    random: seededRandom((Number(seed) || 1) ^ 0xa17c9e31),
  };
}

function bombAt(state, x, y) {
  return state.bombs.find((bomb) => bomb.x === x && bomb.y === y && !bomb.airborneTtl);
}

function playerOccupies(state, x, y, ignoredPlayerId = null) {
  return state.players.some((player) => {
    if (!player.alive || player.id === ignoredPlayerId) return false;
    const currentX = Math.floor(player.x / TILE_SIZE);
    const currentY = Math.floor(player.y / TILE_SIZE);
    return (currentX === x && currentY === y) || (player.moveTarget?.tileX === x && player.moveTarget?.tileY === y);
  });
}

function canBombEnter(state, x, y, ignoredBombId = null) {
  return tileAt(state.grid, x, y) === EMPTY
    && !state.bombs.some((bomb) => bomb.id !== ignoredBombId && bomb.x === x && bomb.y === y)
    && !playerOccupies(state, x, y);
}

function tryKickBomb(state, player, bomb, direction) {
  if (!player.kick || bomb.airborneTtl) return false;
  const nextX = bomb.x + direction.x;
  const nextY = bomb.y + direction.y;
  if (!canBombEnter(state, nextX, nextY, bomb.id)) return false;
  bomb.slideFromX = bomb.x;
  bomb.slideFromY = bomb.y;
  bomb.x = nextX;
  bomb.y = nextY;
  bomb.slideDirection = { ...direction };
  bomb.slideCooldown = BOMB_SLIDE_SECONDS;
  bomb.slideVisualTtl = BOMB_SLIDE_SECONDS;
  bomb.passThroughIds = [];
  return true;
}

function isTileBlocked(state, x, y, movingPlayer, direction = null) {
  const tile = tileAt(state.grid, x, y);
  if (tile === WALL || tile === undefined) return true;
  if (tile === CRATE && !movingPlayer.blockPass) return true;
  const bomb = bombAt(state, x, y);
  if (bomb && !movingPlayer.bombPass) {
    if (!direction || !tryKickBomb(state, movingPlayer, bomb, direction)) return true;
  }
  return playerOccupies(state, x, y, movingPlayer.id);
}

function releaseBombPassThrough(state) {
  for (const bomb of state.bombs) {
    if (!bomb.passThroughIds?.length) continue;
    bomb.passThroughIds = bomb.passThroughIds.filter((playerId) => {
      const player = state.players.find((candidate) => candidate.id === playerId);
      return player?.alive && Math.floor(player.x / TILE_SIZE) === bomb.x && Math.floor(player.y / TILE_SIZE) === bomb.y;
    });
  }
}

function cardinalDirection(input) {
  const dx = Math.max(-1, Math.min(1, Number(input?.dx) || 0));
  const dy = Math.max(-1, Math.min(1, Number(input?.dy) || 0));
  if (dx) return { x: Math.sign(dx), y: 0 };
  if (dy) return { x: 0, y: Math.sign(dy) };
  return null;
}

function directionName(direction) {
  if (direction.x > 0) return "right";
  if (direction.x < 0) return "left";
  if (direction.y > 0) return "down";
  return "up";
}

function facingDirection(player) {
  if (player.facing === "left") return { x: -1, y: 0 };
  if (player.facing === "up") return { x: 0, y: -1 };
  if (player.facing === "down") return { x: 0, y: 1 };
  return { x: 1, y: 0 };
}

function startPlayerMove(state, player, direction) {
  if (!direction) return false;
  player.facing = directionName(direction);
  const currentX = Math.round(player.x / TILE_SIZE - 0.5);
  const currentY = Math.round(player.y / TILE_SIZE - 0.5);
  const tileX = currentX + direction.x;
  const tileY = currentY + direction.y;
  if (isTileBlocked(state, tileX, tileY, player, direction)) return false;
  player.moveTarget = { tileX, tileY, x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
  return true;
}

function movePlayer(state, player, input) {
  const freshIntent = cardinalDirection(input?.intent);
  if (freshIntent) {
    player.queuedDirection = freshIntent;
    player.queuedDirectionUntilTick = state.tick + TURN_BUFFER_TICKS;
  }
  if (player.queuedDirectionUntilTick < state.tick) player.queuedDirection = null;

  if (!player.moveTarget) {
    const queued = player.queuedDirection;
    if (queued && startPlayerMove(state, player, queued)) player.queuedDirection = null;
    if (!player.moveTarget && !startPlayerMove(state, player, cardinalDirection(input))) return;
  }

  const dx = player.moveTarget.x - player.x;
  const dy = player.moveTarget.y - player.y;
  const distance = Math.abs(dx) + Math.abs(dy);
  const travel = Math.min((player.moveSpeed || MOVE_SPEED) * TICK_SECONDS, distance);
  if (dx) player.x += Math.sign(dx) * travel;
  else if (dy) player.y += Math.sign(dy) * travel;

  if (travel >= distance - 0.001) {
    player.x = player.moveTarget.x;
    player.y = player.moveTarget.y;
    player.moveTarget = null;
  }
}

function placeBomb(state, player) {
  const x = Math.floor(player.x / TILE_SIZE);
  const y = Math.floor(player.y / TILE_SIZE);
  const owned = state.bombs.filter((bomb) => bomb.ownerId === player.id).length;
  if (owned >= player.maxBombs || state.bombs.some((bomb) => bomb.x === x && bomb.y === y)) return;
  state.bombs.push({
    id: state.nextBombId++, ownerId: player.id, x, y, fuse: player.remote ? 99 : FUSE_SECONDS,
    range: player.fireRange, remote: player.remote, placedTick: state.tick, passThroughIds: [player.id],
  });
}

function remoteDetonate(state, player) {
  if (!player.remote) return;
  const bomb = state.bombs.filter((candidate) => candidate.ownerId === player.id).sort((a, b) => a.id - b.id)[0];
  if (bomb) bomb.fuse = 0;
}

function throwBomb(state, player) {
  if (!player.glove) return;
  const direction = facingDirection(player);
  const playerX = Math.floor(player.x / TILE_SIZE);
  const playerY = Math.floor(player.y / TILE_SIZE);
  const bomb = bombAt(state, playerX + direction.x, playerY + direction.y);
  if (!bomb) return;
  for (let distance = 3; distance >= 1; distance -= 1) {
    const targetX = bomb.x + direction.x * distance;
    const targetY = bomb.y + direction.y * distance;
    if (!canBombEnter(state, targetX, targetY, bomb.id)) continue;
    bomb.throwFromX = bomb.x;
    bomb.throwFromY = bomb.y;
    bomb.x = targetX;
    bomb.y = targetY;
    bomb.airborneTtl = BOMB_THROW_SECONDS;
    bomb.throwDuration = BOMB_THROW_SECONDS;
    bomb.slideDirection = null;
    bomb.passThroughIds = [];
    return;
  }
}

function advanceBombMotion(state) {
  for (const bomb of state.bombs) {
    if (bomb.airborneTtl > 0) {
      bomb.airborneTtl = Math.max(0, bomb.airborneTtl - TICK_SECONDS);
      continue;
    }
    if (bomb.slideVisualTtl > 0) bomb.slideVisualTtl = Math.max(0, bomb.slideVisualTtl - TICK_SECONDS);
    if (!bomb.slideDirection) continue;
    bomb.slideCooldown = (bomb.slideCooldown ?? BOMB_SLIDE_SECONDS) - TICK_SECONDS;
    if (bomb.slideCooldown > 0) continue;
    const nextX = bomb.x + bomb.slideDirection.x;
    const nextY = bomb.y + bomb.slideDirection.y;
    if (!canBombEnter(state, nextX, nextY, bomb.id)) {
      bomb.slideDirection = null;
      continue;
    }
    bomb.slideFromX = bomb.x;
    bomb.slideFromY = bomb.y;
    bomb.x = nextX;
    bomb.y = nextY;
    bomb.slideCooldown = BOMB_SLIDE_SECONDS;
    bomb.slideVisualTtl = BOMB_SLIDE_SECONDS;
  }
}

function blastTiles(state, bomb) {
  const tiles = [{ x: bomb.x, y: bomb.y }];
  for (const direction of DIRECTIONS) {
    for (let distance = 1; distance <= bomb.range; distance += 1) {
      const x = bomb.x + direction.x * distance;
      const y = bomb.y + direction.y * distance;
      const tile = tileAt(state.grid, x, y);
      if (tile === WALL || tile === undefined) break;
      tiles.push({ x, y });
      if (tile === CRATE) break;
    }
  }
  return tiles;
}

function choosePowerup(state) {
  const total = POWERUP_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = (state.random?.() ?? Math.random()) * total;
  for (const [type, weight] of POWERUP_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return "fire";
}

function maybeSpawnPowerup(state, x, y) {
  if (state.mode !== GAME_MODES.SUPER || (state.random?.() ?? Math.random()) >= POWERUP_DROP_CHANCE) return;
  state.powerups.push({ id: state.nextPowerupId++, type: choosePowerup(state), x, y });
}

function detonateBombs(state, initialIds) {
  const queue = [...initialIds];
  const detonated = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (detonated.has(id)) continue;
    const bomb = state.bombs.find((candidate) => candidate.id === id);
    if (!bomb) continue;
    detonated.add(id);
    for (const tile of blastTiles(state, bomb)) {
      const key = `${tile.x},${tile.y}`;
      const existing = state.blasts.find((blast) => `${blast.x},${blast.y}` === key);
      if (existing) existing.ttl = BLAST_SECONDS;
      else state.blasts.push({ ...tile, ttl: BLAST_SECONDS });
      const wasCrate = state.grid[indexOf(tile.x, tile.y)] === CRATE;
      if (wasCrate) {
        setTile(state, tile.x, tile.y, EMPTY);
        maybeSpawnPowerup(state, tile.x, tile.y);
      } else {
        state.powerups = state.powerups.filter((powerup) => powerup.x !== tile.x || powerup.y !== tile.y);
      }
      for (const chained of state.bombs) {
        if (chained.x === tile.x && chained.y === tile.y && !detonated.has(chained.id)) queue.push(chained.id);
      }
    }
  }
  if (detonated.size) state.bombs = state.bombs.filter((bomb) => !detonated.has(bomb.id));
}

function applyBlastDamage(state) {
  const lethal = new Set(state.blasts.map((blast) => `${blast.x},${blast.y}`));
  for (const player of state.players) {
    if (!player.alive || player.invincibleUntilTick > state.tick) continue;
    const tile = `${Math.floor(player.x / TILE_SIZE)},${Math.floor(player.y / TILE_SIZE)}`;
    if (lethal.has(tile)) player.alive = false;
  }
}

function applyPowerup(state, player, type) {
  if (type === "fire") player.fireRange = Math.min(MAX_FIRE_RANGE, player.fireRange + 1);
  else if (type === "bomb") player.maxBombs = Math.min(MAX_BOMBS_LIMIT, player.maxBombs + 1);
  else if (type === "speed") player.moveSpeed = Math.min(MAX_MOVE_SPEED, player.moveSpeed + SPEED_UP_AMOUNT);
  else if (type === "remote") player.remote = true;
  else if (type === "glove") player.glove = true;
  else if (type === "kick") player.kick = true;
  else if (type === "bombPass") player.bombPass = true;
  else if (type === "blockPass") player.blockPass = true;
  else if (type === "suit") player.invincibleUntilTick = state.tick + SUIT_SECONDS * TICK_RATE;
  else if (type === "fullFire") player.fireRange = MAX_FIRE_RANGE;
}

function collectPowerups(state, player) {
  const x = Math.floor(player.x / TILE_SIZE);
  const y = Math.floor(player.y / TILE_SIZE);
  const collected = state.powerups.filter((powerup) => powerup.x === x && powerup.y === y);
  if (!collected.length) return;
  for (const powerup of collected) applyPowerup(state, player, powerup.type);
  const ids = new Set(collected.map((powerup) => powerup.id));
  state.powerups = state.powerups.filter((powerup) => !ids.has(powerup.id));
}

function landDeathBlock(state, block) {
  setTile(state, block.x, block.y, WALL);
  state.bombs = state.bombs.filter((bomb) => bomb.x !== block.x || bomb.y !== block.y);
  state.powerups = state.powerups.filter((powerup) => powerup.x !== block.x || powerup.y !== block.y);
  state.blasts = state.blasts.filter((blast) => blast.x !== block.x || blast.y !== block.y);
  for (const player of state.players) {
    if (!player.alive) continue;
    const currentX = Math.floor(player.x / TILE_SIZE);
    const currentY = Math.floor(player.y / TILE_SIZE);
    if ((currentX === block.x && currentY === block.y)
      || (player.moveTarget?.tileX === block.x && player.moveTarget?.tileY === block.y)) player.alive = false;
  }
}

function advanceFallingBlocks(state) {
  const remaining = [];
  for (const block of state.fallingBlocks) {
    block.ttl -= TICK_SECONDS;
    if (block.ttl <= 0) landDeathBlock(state, block);
    else remaining.push(block);
  }
  state.fallingBlocks = remaining;
}

export function dropDeathBlock(state, x, y) {
  if (state.status !== "playing" || tileAt(state.grid, x, y) === WALL) return false;
  if (state.fallingBlocks.some((block) => block.x === x && block.y === y)) return false;
  state.suddenDeathActive = true;
  state.fallingBlocks.push({ x, y, ttl: DEATH_BLOCK_FALL_SECONDS, duration: DEATH_BLOCK_FALL_SECONDS });
  return true;
}

export function createSuddenDeathOrder(grid) {
  const order = [];
  let left = 1;
  let right = BOARD_WIDTH - 2;
  let top = 1;
  let bottom = BOARD_HEIGHT - 2;
  const add = (x, y) => { if (tileAt(grid, x, y) !== WALL) order.push({ x, y }); };
  while (left <= right && top <= bottom) {
    for (let x = left; x <= right; x += 1) add(x, top);
    top += 1;
    for (let y = top; y <= bottom; y += 1) add(right, y);
    right -= 1;
    if (top <= bottom) {
      for (let x = right; x >= left; x -= 1) add(x, bottom);
      bottom -= 1;
    }
    if (left <= right) {
      for (let y = bottom; y >= top; y -= 1) add(left, y);
      left += 1;
    }
  }
  return order;
}

function finishIfNeeded(state) {
  if (state.status !== "playing" || state.tick === 0) return;
  const alive = state.players.filter((player) => player.alive);
  if (alive.length <= 1) {
    state.status = "ended";
    state.winnerSlot = alive.length === 1 ? alive[0].slot : null;
  }
}

export function step(state, inputs = {}) {
  if (state.status !== "playing") return state;
  state.tick += 1;
  state.blasts = state.blasts.map((blast) => ({ ...blast, ttl: blast.ttl - TICK_SECONDS })).filter((blast) => blast.ttl > 0);
  advanceFallingBlocks(state);
  advanceBombMotion(state);
  applyBlastDamage(state);

  for (const player of state.players) {
    if (!player.alive) continue;
    const input = inputs[player.id] || {};
    movePlayer(state, player, input);
    if (input.intent) input.intent = null;
    collectPowerups(state, player);
    if (input.drop && !player.dropLatch) placeBomb(state, player);
    if (input.detonate && !player.detonateLatch) remoteDetonate(state, player);
    if (input.special && !player.specialLatch) throwBomb(state, player);
    player.dropLatch = Boolean(input.drop);
    player.detonateLatch = Boolean(input.detonate);
    player.specialLatch = Boolean(input.special);
  }
  releaseBombPassThrough(state);
  for (const bomb of state.bombs) {
    if (!bomb.remote) bomb.fuse -= TICK_SECONDS;
    else {
      const owner = state.players.find((candidate) => candidate.id === bomb.ownerId);
      if (owner?.kind === "bot" && state.tick - bomb.placedTick >= Math.ceil(2.4 * TICK_RATE)) bomb.fuse = 0;
    }
  }
  detonateBombs(state, state.bombs.filter((bomb) => bomb.fuse <= 0).map((bomb) => bomb.id));
  applyBlastDamage(state);
  finishIfNeeded(state);
  return state;
}

export function snapshot(state) {
  return {
    tick: state.tick,
    mode: state.mode,
    grid: state.grid,
    players: state.players.map(({ dropLatch, detonateLatch, specialLatch, invincibleUntilTick, queuedDirection, queuedDirectionUntilTick, ...player }) => ({
      ...player,
      protected: invincibleUntilTick > state.tick,
      protectionRemaining: Math.max(0, (invincibleUntilTick - state.tick) * TICK_SECONDS),
    })),
    bombs: state.bombs.map(({ passThroughIds, ...bomb }) => bomb),
    blasts: state.blasts,
    powerups: state.powerups,
    fallingBlocks: state.fallingBlocks,
    suddenDeathActive: state.suddenDeathActive,
  };
}

export function forceDetonate(state, bombIds) {
  detonateBombs(state, bombIds);
  applyBlastDamage(state);
  finishIfNeeded(state);
  return state;
}
