import { BOARD_WIDTH, CRATE, EMPTY, MOVE_SPEED, TILE_SIZE } from "../shared/constants.js";

export function cardinalInput(input) {
  if (input?.dx) return { x: Math.sign(input.dx), y: 0 };
  if (input?.dy) return { x: 0, y: Math.sign(input.dy) };
  return null;
}

function tileBlocked(state, self, tileX, tileY) {
  const tile = state.grid?.[tileY * BOARD_WIDTH + tileX];
  if (tile !== EMPTY && !(tile === CRATE && self.blockPass)) return true;
  if (!self.bombPass && state.bombs?.some((bomb) => bomb.x === tileX && bomb.y === tileY)) return true;
  return state.players.some((candidate) => {
    if (!candidate.alive || candidate.id === self.id) return false;
    const occupiesTile = Math.floor(candidate.x / TILE_SIZE) === tileX && Math.floor(candidate.y / TILE_SIZE) === tileY;
    const reservesTile = candidate.moveTarget?.tileX === tileX && candidate.moveTarget?.tileY === tileY;
    return occupiesTile || reservesTile;
  });
}

function facingFor(direction, fallback = "down") {
  if (direction?.x > 0) return "right";
  if (direction?.x < 0) return "left";
  if (direction?.y > 0) return "down";
  if (direction?.y < 0) return "up";
  return fallback;
}

export function projectLocalPlayer(target, state, input, horizonMs) {
  const projected = { ...target, moveTarget: target.moveTarget ? { ...target.moveTarget } : null };
  let remaining = Math.max(0, horizonMs) / 1000;
  let segments = 0;
  while (remaining > 0.0001 && segments < 3) {
    if (!projected.moveTarget) {
      const direction = cardinalInput(input);
      if (!direction) break;
      const currentTileX = Math.round(projected.x / TILE_SIZE - 0.5);
      const currentTileY = Math.round(projected.y / TILE_SIZE - 0.5);
      const tileX = currentTileX + direction.x;
      const tileY = currentTileY + direction.y;
      if (tileBlocked(state, projected, tileX, tileY)) break;
      projected.moveTarget = { tileX, tileY, x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
      projected.facing = facingFor(direction, projected.facing);
    }

    const dx = projected.moveTarget.x - projected.x;
    const dy = projected.moveTarget.y - projected.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    const playerSpeed = projected.moveSpeed || MOVE_SPEED;
    const availableTravel = playerSpeed * remaining;
    if (availableTravel < distance) {
      if (dx) projected.x += Math.sign(dx) * availableTravel;
      else if (dy) projected.y += Math.sign(dy) * availableTravel;
      break;
    }
    projected.x = projected.moveTarget.x;
    projected.y = projected.moveTarget.y;
    projected.moveTarget = null;
    remaining -= distance / playerSpeed;
    segments += 1;
  }
  return projected;
}

export function advanceLocalPlayer(current, state, input, elapsedMs) {
  const advanced = { ...current, moveTarget: current.moveTarget ? { ...current.moveTarget } : null };
  let remaining = Math.max(0, elapsedMs) / 1000;
  let segments = 0;

  // The local player advances from the last rendered position. Network snapshots
  // therefore cannot reset the prediction clock and produce a pause at tile edges.
  while (remaining > 0.0001 && segments < 3) {
    if (!advanced.moveTarget) {
      const direction = cardinalInput(input);
      if (!direction) break;
      const currentTileX = Math.round(advanced.x / TILE_SIZE - 0.5);
      const currentTileY = Math.round(advanced.y / TILE_SIZE - 0.5);
      const tileX = currentTileX + direction.x;
      const tileY = currentTileY + direction.y;
      if (tileBlocked(state, advanced, tileX, tileY)) break;
      advanced.moveTarget = { tileX, tileY, x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
      advanced.facing = facingFor(direction, advanced.facing);
    }

    const dx = advanced.moveTarget.x - advanced.x;
    const dy = advanced.moveTarget.y - advanced.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    const playerSpeed = advanced.moveSpeed || MOVE_SPEED;
    const availableTravel = playerSpeed * remaining;
    if (availableTravel < distance) {
      if (dx) advanced.x += Math.sign(dx) * availableTravel;
      else if (dy) advanced.y += Math.sign(dy) * availableTravel;
      break;
    }

    advanced.x = advanced.moveTarget.x;
    advanced.y = advanced.moveTarget.y;
    advanced.moveTarget = null;
    remaining -= distance / playerSpeed;
    segments += 1;
  }
  return advanced;
}

export function reconcileLocalPlayer(current, target, state, input, elapsedMs, predictionMs) {
  const advanced = advanceLocalPlayer(current, state, input, elapsedMs);
  const projected = projectLocalPlayer(target, state, input, predictionMs);
  const dx = projected.x - advanced.x;
  const dy = projected.y - advanced.y;
  const hardDesync = Math.abs(dx) > TILE_SIZE * 1.5 || Math.abs(dy) > TILE_SIZE * 1.5;
  if (hardDesync) return projected;

  const localTravel = Math.abs(advanced.x - current.x) + Math.abs(advanced.y - current.y);
  const serverTravel = Math.abs(projected.x - target.x) + Math.abs(projected.y - target.y);
  const separation = Math.abs(dx) + Math.abs(dy);
  const strandedPrediction = cardinalInput(input)
    && localTravel < 0.001
    && serverTravel > 0.001
    && separation > TILE_SIZE * 0.65;

  // While a tile is being crossed, local integration owns the visual position.
  // This removes both rollback and the small wait introduced whenever a fresh
  // snapshot resets its age. The exception repairs an invalid prediction: if the
  // local player is blocked on one tile while the server is moving on another,
  // it must converge instead of remaining permanently stranded there.
  if ((advanced.moveTarget || cardinalInput(input)) && !strandedPrediction) return advanced;

  const distance = Math.abs(dx) + Math.abs(dy);
  const playerSpeed = target.moveSpeed || MOVE_SPEED;
  const recoveryBoost = strandedPrediction ? playerSpeed * 1.5 : 0;
  const speed = playerSpeed + recoveryBoost + Math.min(playerSpeed, distance * 8);
  const travel = Math.min(speed * Math.max(0, elapsedMs) / 1000, distance);
  let x = advanced.x;
  let y = advanced.y;
  if (dx) x += Math.sign(dx) * travel;
  else if (dy) y += Math.sign(dy) * travel;
  return { ...advanced, x, y, facing: projected.facing, moveTarget: strandedPrediction ? null : advanced.moveTarget };
}
