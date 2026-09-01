import { BLAST_RANGE, BOARD_HEIGHT, BOARD_WIDTH, CRATE, DIRECTIONS, EMPTY, FUSE_SECONDS, MOVE_SPEED, TILE_SIZE, WALL } from "./constants.js";
import { indexOf, tileAt } from "./sim.js";

const keyOf = (x, y) => `${x},${y}`;

function projectedBlastTiles(state, bomb, cratesBlock = false) {
  const tiles = [{ x: bomb.x, y: bomb.y }];
  for (const direction of DIRECTIONS) {
    for (let distance = 1; distance <= (bomb.range ?? BLAST_RANGE); distance += 1) {
      const x = bomb.x + direction.x * distance;
      const y = bomb.y + direction.y * distance;
      const tile = tileAt(state.grid, x, y);
      if (tile === WALL || tile === undefined) break;
      tiles.push({ x, y });
      if (cratesBlock && tile === CRATE) break;
    }
  }
  return tiles;
}

export function dangerDeadlines(state, extraBomb = null) {
  const bombs = extraBomb ? [...state.bombs, extraBomb] : state.bombs;
  const times = new Map(bombs.map((bomb) => [bomb.id, Math.max(0, bomb.fuse ?? FUSE_SECONDS)]));

  for (let pass = 0; pass < bombs.length; pass += 1) {
    let changed = false;
    for (const source of bombs) {
      const sourceTime = times.get(source.id);
      const reached = new Set(projectedBlastTiles(state, source).map((tile) => keyOf(tile.x, tile.y)));
      for (const target of bombs) {
        if (source.id === target.id || !reached.has(keyOf(target.x, target.y))) continue;
        if (sourceTime < times.get(target.id)) {
          times.set(target.id, sourceTime);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const deadlines = new Map(state.blasts.map((blast) => [keyOf(blast.x, blast.y), 0]));
  for (const bomb of bombs) {
    const deadline = times.get(bomb.id);
    for (const tile of projectedBlastTiles(state, bomb)) {
      const key = keyOf(tile.x, tile.y);
      deadlines.set(key, Math.min(deadlines.get(key) ?? Infinity, deadline));
    }
  }
  return deadlines;
}

export function dangerTiles(state, extraBomb = null) {
  return new Set(dangerDeadlines(state, extraBomb).keys());
}

function traversable(state, x, y, start, extraBlocked = null, player = null) {
  if (x < 0 || y < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return false;
  const tile = tileAt(state.grid, x, y);
  if (tile !== EMPTY && !(tile === CRATE && player?.blockPass)) return false;
  if (extraBlocked && keyOf(x, y) === extraBlocked && keyOf(x, y) !== keyOf(start.x, start.y)) return false;
  if (player?.bombPass) return true;
  return !state.bombs.some((bomb) => bomb.x === x && bomb.y === y && keyOf(x, y) !== keyOf(start.x, start.y));
}

function bfs(state, start, isGoal, blocked = new Set(), extraBlocked = null, player = null) {
  const queue = [{ ...start, path: [] }];
  const visited = new Set([keyOf(start.x, start.y)]);
  while (queue.length) {
    const current = queue.shift();
    if (isGoal(current) && current.path.length) return current.path;
    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = keyOf(next.x, next.y);
      if (visited.has(key) || blocked.has(key) || !traversable(state, next.x, next.y, start, extraBlocked, player)) continue;
      visited.add(key);
      queue.push({ ...next, path: [...current.path, next] });
    }
  }
  return null;
}

function timedEscapeBfs(state, start, deadlines, extraBlocked = null, trafficBlocked = new Set(), player = null) {
  const secondsPerTile = TILE_SIZE / (player?.moveSpeed || MOVE_SPEED);
  const safetyMargin = 0.28;
  const queue = [{ ...start, path: [] }];
  const visited = new Set([keyOf(start.x, start.y)]);
  while (queue.length) {
    const current = queue.shift();
    const currentKey = keyOf(current.x, current.y);
    if (current.path.length && !deadlines.has(currentKey)) return current.path;
    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = keyOf(next.x, next.y);
      if (visited.has(key) || trafficBlocked.has(key) || !traversable(state, next.x, next.y, start, extraBlocked, player)) continue;
      const arrival = (current.path.length + 1) * secondsPerTile;
      const deadline = deadlines.get(key);
      if (deadline !== undefined && deadline <= arrival + safetyMargin) continue;
      visited.add(key);
      queue.push({ ...next, path: [...current.path, next] });
    }
  }
  return null;
}

export function findEscapePath(state, player, bombTile = null) {
  const start = { x: Math.floor(player.x / TILE_SIZE), y: Math.floor(player.y / TILE_SIZE) };
  const range = player.fireRange || BLAST_RANGE;
  const bomb = bombTile ? { id: -1, ownerId: player.id, ...bombTile, range, fuse: FUSE_SECONDS } : { id: -1, ownerId: player.id, ...start, range, fuse: FUSE_SECONDS };
  return timedEscapeBfs(state, start, dangerDeadlines(state, bomb), keyOf(bomb.x, bomb.y), new Set(), player);
}

export function hasEscapeRoute(state, player, bombTile = null) {
  return Boolean(findEscapePath(state, player, bombTile));
}

function occupiedAndReservedTiles(state, player, additionalReservations) {
  const startKey = keyOf(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE));
  const blocked = new Set(additionalReservations);
  for (const other of state.players) {
    if (!other.alive || other.id === player.id) continue;
    const currentKey = keyOf(Math.floor(other.x / TILE_SIZE), Math.floor(other.y / TILE_SIZE));
    if (currentKey !== startKey) blocked.add(currentKey);
    if (other.moveTarget) {
      const destinationKey = keyOf(other.moveTarget.tileX, other.moveTarget.tileY);
      if (destinationKey !== startKey) blocked.add(destinationKey);
    }
  }
  blocked.delete(startKey);
  return blocked;
}

function usefulBombTarget(state, player, start) {
  for (const direction of DIRECTIONS) {
    for (let distance = 1; distance <= (player.fireRange || BLAST_RANGE); distance += 1) {
      const x = start.x + direction.x * distance;
      const y = start.y + direction.y * distance;
      const tile = tileAt(state.grid, x, y);
      if (tile === WALL || tile === undefined) break;
      if (tile === CRATE) return true;
      if (state.players.some((other) => other.alive && other.id !== player.id && Math.floor(other.x / TILE_SIZE) === x && Math.floor(other.y / TILE_SIZE) === y)) return true;
    }
  }
  return false;
}

function inputToward(player, next, drop = false) {
  const targetX = (next.x + 0.5) * TILE_SIZE;
  const targetY = (next.y + 0.5) * TILE_SIZE;
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const tolerance = 2.5;
  if (Math.abs(dx) > tolerance && (Math.abs(dx) >= Math.abs(dy) || Math.abs(dy) <= tolerance)) {
    return { dx: Math.sign(dx), dy: 0, drop };
  }
  if (Math.abs(dy) > tolerance) return { dx: 0, dy: Math.sign(dy), drop };
  return { dx: 0, dy: 0, drop };
}

export function decideBotInput(state, playerId, additionalReservations = new Set()) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player?.alive) return { input: { dx: 0, dy: 0, drop: false }, path: [], urgent: false };
  const start = { x: Math.floor(player.x / TILE_SIZE), y: Math.floor(player.y / TILE_SIZE) };
  const deadlines = dangerDeadlines(state);
  const danger = new Set(deadlines.keys());
  const trafficBlocked = occupiedAndReservedTiles(state, player, additionalReservations);
  const centered = !player.moveTarget && Math.abs(player.x - (start.x + 0.5) * TILE_SIZE) < 0.1 && Math.abs(player.y - (start.y + 0.5) * TILE_SIZE) < 0.1;

  if (danger.has(keyOf(start.x, start.y))) {
    const path = timedEscapeBfs(state, start, deadlines, null, trafficBlocked, player)
      || timedEscapeBfs(state, start, deadlines, null, new Set(), player);
    return path ? { input: inputToward(player, path[0]), path, urgent: true } : { input: { dx: 0, dy: 0, drop: false }, path: [], urgent: true };
  }

  const ownedBombs = state.bombs.filter((bomb) => bomb.ownerId === player.id).length;
  const botBombLimit = Math.max(1, (player.maxBombs || 2) - 1);
  const escapePath = centered && ownedBombs < botBombLimit && usefulBombTarget(state, player, start) ? findEscapePath(state, player, start) : null;
  if (escapePath) {
    return { input: { dx: 0, dy: 0, drop: true }, path: escapePath, urgent: true };
  }

  const targets = new Set();
  for (let y = 1; y < BOARD_HEIGHT - 1; y += 1) {
    for (let x = 1; x < BOARD_WIDTH - 1; x += 1) {
      if (tileAt(state.grid, x, y) !== EMPTY || trafficBlocked.has(keyOf(x, y)) || (x === start.x && y === start.y)) continue;
      const candidate = { ...player, x: (x + 0.5) * TILE_SIZE, y: (y + 0.5) * TILE_SIZE, moveTarget: null };
      if (usefulBombTarget(state, candidate, { x, y }) && findEscapePath(state, candidate, { x, y })) targets.add(keyOf(x, y));
    }
  }
  const routeBlocks = new Set([...danger, ...trafficBlocked]);
  const path = bfs(state, start, (tile) => targets.has(keyOf(tile.x, tile.y)), routeBlocks, null, player);
  return path ? { input: inputToward(player, path[0]), path, urgent: false } : { input: { dx: 0, dy: 0, drop: false }, path: [], urgent: false };
}
