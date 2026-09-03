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

function authoritativeDirection(target, input) {
  if (target.moveTarget) {
    return {
      x: Math.sign(target.moveTarget.x - target.x),
      y: Math.sign(target.moveTarget.y - target.y),
    };
  }
  return cardinalInput(input);
}

export function reconcileLocalPlayer(current, target, state, input, elapsedMs, predictionMs) {
  const hardDesync = Math.abs(current.x - target.x) > TILE_SIZE * 1.5
    || Math.abs(current.y - target.y) > TILE_SIZE * 1.5;
  if (hardDesync) return { x: target.x, y: target.y, facing: target.facing };

  const projected = projectLocalPlayer(target, state, input, predictionMs);
  const direction = authoritativeDirection(target, input);
  let dx = projected.x - current.x;
  let dy = projected.y - current.y;

  // Prediction may wait for the authoritative state to catch up, but must never
  // visibly rewind along the currently requested path (the classic rubber-band).
  if ((direction?.x > 0 && dx < 0) || (direction?.x < 0 && dx > 0)) dx = 0;
  if ((direction?.y > 0 && dy < 0) || (direction?.y < 0 && dy > 0)) dy = 0;

  const distance = Math.abs(dx) + Math.abs(dy);
  const playerSpeed = target.moveSpeed || MOVE_SPEED;
  const speed = playerSpeed + Math.min(playerSpeed, distance * 8);
  const travel = Math.min(speed * Math.max(0, elapsedMs) / 1000, distance);
  let x = current.x;
  let y = current.y;
  if (dx) x += Math.sign(dx) * travel;
  else if (dy) y += Math.sign(dy) * travel;
  return { x, y, facing: projected.facing };
}
