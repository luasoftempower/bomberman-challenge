import {
  BLAST_RANGE,
  BLAST_SECONDS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CRATE,
  DIRECTIONS,
  EMPTY,
  FUSE_SECONDS,
  MAX_BOMBS,
  MOVE_SPEED,
  SPAWNS,
  TICK_SECONDS,
  TILE_SIZE,
  WALL,
} from "./constants.js";

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
    id,
    slot,
    name,
    kind,
    x: (spawn.x + 0.5) * TILE_SIZE,
    y: (spawn.y + 0.5) * TILE_SIZE,
    alive: true,
    dropLatch: false,
    moveTarget: null,
  };
}

export function createMatch(seed, slots) {
  return {
    tick: 0,
    seed,
    grid: createGrid(seed),
    players: slots.map(createPlayer),
    bombs: [],
    blasts: [],
    status: "playing",
    winnerSlot: undefined,
    nextBombId: 1,
  };
}

function isTileBlocked(state, x, y, movingPlayer) {
  if (tileAt(state.grid, x, y) !== EMPTY) return true;
  if (state.bombs.some((bomb) => bomb.x === x && bomb.y === y)) return true;
  return state.players.some((other) => {
    if (!other.alive || other.id === movingPlayer.id) return false;
    const currentX = Math.floor(other.x / TILE_SIZE);
    const currentY = Math.floor(other.y / TILE_SIZE);
    const occupiesCurrent = currentX === x && currentY === y;
    const reservedDestination = other.moveTarget?.tileX === x && other.moveTarget?.tileY === y;
    return occupiesCurrent || reservedDestination;
  });
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

function movePlayer(state, player, input) {
  if (!player.moveTarget) {
    const direction = cardinalDirection(input);
    if (!direction) return;
    const currentX = Math.round(player.x / TILE_SIZE - 0.5);
    const currentY = Math.round(player.y / TILE_SIZE - 0.5);
    const tileX = currentX + direction.x;
    const tileY = currentY + direction.y;
    if (isTileBlocked(state, tileX, tileY, player)) return;
    player.moveTarget = {
      tileX,
      tileY,
      x: (tileX + 0.5) * TILE_SIZE,
      y: (tileY + 0.5) * TILE_SIZE,
    };
  }

  const dx = player.moveTarget.x - player.x;
  const dy = player.moveTarget.y - player.y;
  const distance = Math.abs(dx) + Math.abs(dy);
  const travel = Math.min(MOVE_SPEED * TICK_SECONDS, distance);
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
  if (owned >= MAX_BOMBS || state.bombs.some((bomb) => bomb.x === x && bomb.y === y)) return;
  state.bombs.push({
    id: state.nextBombId++,
    ownerId: player.id,
    x,
    y,
    fuse: FUSE_SECONDS,
    range: BLAST_RANGE,
    passThroughIds: [player.id],
  });
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

function detonateBombs(state, initialIds) {
  const queue = [...initialIds];
  const detonated = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (detonated.has(id)) continue;
    const bomb = state.bombs.find((candidate) => candidate.id === id);
    if (!bomb) continue;
    detonated.add(id);

    const tiles = blastTiles(state, bomb);
    for (const tile of tiles) {
      const key = `${tile.x},${tile.y}`;
      const existing = state.blasts.find((blast) => `${blast.x},${blast.y}` === key);
      if (existing) existing.ttl = BLAST_SECONDS;
      else state.blasts.push({ ...tile, ttl: BLAST_SECONDS });

      const tileIndex = indexOf(tile.x, tile.y);
      if (state.grid[tileIndex] === CRATE) {
        const mutable = state.grid.split("");
        mutable[tileIndex] = EMPTY;
        state.grid = mutable.join("");
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
    if (!player.alive) continue;
    const tile = `${Math.floor(player.x / TILE_SIZE)},${Math.floor(player.y / TILE_SIZE)}`;
    if (lethal.has(tile)) player.alive = false;
  }
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
  state.blasts = state.blasts
    .map((blast) => ({ ...blast, ttl: blast.ttl - TICK_SECONDS }))
    .filter((blast) => blast.ttl > 0);
  applyBlastDamage(state);

  for (const player of state.players) {
    if (!player.alive) continue;
    const input = inputs[player.id] || {};
    movePlayer(state, player, input);
    if (input.drop && !player.dropLatch) placeBomb(state, player);
    player.dropLatch = Boolean(input.drop);
  }
  releaseBombPassThrough(state);

  for (const bomb of state.bombs) bomb.fuse -= TICK_SECONDS;
  detonateBombs(state, state.bombs.filter((bomb) => bomb.fuse <= 0).map((bomb) => bomb.id));
  applyBlastDamage(state);
  finishIfNeeded(state);
  return state;
}

export function snapshot(state) {
  return {
    tick: state.tick,
    grid: state.grid,
    players: state.players.map(({ dropLatch, ...player }) => player),
    bombs: state.bombs.map(({ passThroughIds, ...bomb }) => bomb),
    blasts: state.blasts,
  };
}

export function forceDetonate(state, bombIds) {
  detonateBombs(state, bombIds);
  applyBlastDamage(state);
  finishIfNeeded(state);
  return state;
}
