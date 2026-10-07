import { tileAt } from "../shared/sim.js";
import { CRATE, EMPTY, MOVE_SPEED, TILE_SIZE } from "../shared/constants.js";

export function cardinalInput(input) {
  if (input?.dx) return { x: Math.sign(input.dx), y: 0 };
  if (input?.dy) return { x: 0, y: Math.sign(input.dy) };
  return null;
}

function tileBlocked(state, self, tileX, tileY) {
  const tile = state.grid ? tileAt(state.grid, tileX, tileY) : undefined;
  if (tile !== EMPTY && !(tile === CRATE && self.blockPass)) return true;
  const bomb = state.bombs?.find((candidate) => (
    candidate.x === tileX
    && candidate.y === tileY
    && !candidate.airborneTtl
  ));
  if (bomb && !self.bombPass) return true;
  return state.players.some((candidate) => {
    if (!candidate.alive || candidate.id === self.id) return false;
    const occupiesTile = Math.floor(candidate.x / TILE_SIZE) === tileX && Math.floor(candidate.y / TILE_SIZE) === tileY;
    const reservesTile = candidate.moveTarget?.tileX === tileX && candidate.moveTarget?.tileY === tileY;
    return occupiesTile || reservesTile;
  });
}

const DIRECTION_VECTORS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

function pendingDirection(player, input) {
  const sequence = Number.isSafeInteger(input?.directionSequence)
    ? input.directionSequence
    : 0;
  if (sequence <= (player.predictedDirectionSequence || 0)) return null;
  return DIRECTION_VECTORS[input.direction] || null;
}

function directionToTarget(player) {
  if (!player.moveTarget) return null;
  const dx = player.moveTarget.x - player.x;
  const dy = player.moveTarget.y - player.y;
  if (Math.abs(dx) > 0.001) return { x: Math.sign(dx), y: 0 };
  if (Math.abs(dy) > 0.001) return { x: 0, y: Math.sign(dy) };
  return null;
}

function sameDirection(first, second) {
  return Boolean(first && second && first.x === second.x && first.y === second.y);
}

function canSlideBomb(state, self, bomb, direction) {
  if (!self.kick || !direction) return false;
  const nextX = bomb.x + direction.x;
  const nextY = bomb.y + direction.y;
  if (tileAt(state.grid, nextX, nextY) !== EMPTY) return false;
  if (state.bombs?.some((candidate) => (
    candidate.id !== bomb.id
    && candidate.x === nextX
    && candidate.y === nextY
    && !candidate.airborneTtl
  ))) return false;
  return !state.players.some((candidate) => {
    if (!candidate.alive || candidate.id === self.id) return false;
    const occupiesTile = Math.floor(candidate.x / TILE_SIZE) === nextX
      && Math.floor(candidate.y / TILE_SIZE) === nextY;
    const reservesTile = candidate.moveTarget?.tileX === nextX
      && candidate.moveTarget?.tileY === nextY;
    return occupiesTile || reservesTile;
  });
}

function startPredictedMove(state, player, direction) {
  if (!direction) return false;
  const currentTileX = Math.round(player.x / TILE_SIZE - 0.5);
  const currentTileY = Math.round(player.y / TILE_SIZE - 0.5);
  const tileX = currentTileX + direction.x;
  const tileY = currentTileY + direction.y;
  const bomb = state.bombs?.find((candidate) => (
    candidate.x === tileX
    && candidate.y === tileY
    && !candidate.airborneTtl
  ));
  if (tileBlocked(state, player, tileX, tileY)) {
    // A predição não movimenta a bomba; apenas confirma que o mesmo chute que o
    // servidor executará é possível. O snapshot seguinte traz a posição da bomba.
    if (!bomb || !canSlideBomb(state, player, bomb, direction)) return false;
  }
  player.moveTarget = {
    tileX,
    tileY,
    x: (tileX + 0.5) * TILE_SIZE,
    y: (tileY + 0.5) * TILE_SIZE,
  };
  player.facing = facingFor(direction, player.facing);
  return true;
}

function startNextPredictedMove(state, player, input) {
  const intent = pendingDirection(player, input);
  if (intent && startPredictedMove(state, player, intent)) {
    player.predictedDirectionSequence = input.directionSequence;
    return true;
  }
  return startPredictedMove(state, player, cardinalInput(input));
}

function facingFor(direction, fallback = "down") {
  if (direction?.x > 0) return "right";
  if (direction?.x < 0) return "left";
  if (direction?.y > 0) return "down";
  if (direction?.y < 0) return "up";
  return fallback;
}

export function projectLocalPlayer(target, state, input, horizonMs, predictionState = target) {
  const projected = {
    ...target,
    moveTarget: target.moveTarget ? { ...target.moveTarget } : null,
    predictedDirectionSequence: predictionState.predictedDirectionSequence || 0,
  };
  const authoritativeDirection = directionToTarget(projected);
  const intent = pendingDirection(projected, input);
  if (intent && sameDirection(intent, authoritativeDirection)) {
    projected.predictedDirectionSequence = input.directionSequence;
  }
  let remaining = Math.max(0, horizonMs) / 1000;
  let segments = 0;
  while (remaining > 0.0001 && segments < 3) {
    if (!projected.moveTarget) {
      if (!startNextPredictedMove(state, projected, input)) break;
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
      if (!startNextPredictedMove(state, advanced, input)) break;
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

function sameMoveTarget(first, second) {
  if (!first || !second) return first === second;
  return first.tileX === second.tileX && first.tileY === second.tileY;
}

/**
 * Aproxima duas posições sem criar movimento diagonal.
 *
 * A simulação do Bomberlan anda apenas em um eixo por vez. Fazer uma
 * interpolação comum em X e Y produziria um corte diagonal perceptível quando
 * cliente e servidor discordassem sobre uma curva. Por isso corrigimos primeiro
 * o eixo que possui o maior erro.
 */
function correctAlongOneAxis(current, target, maximumTravel, useTargetRoute = false) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const travel = Math.max(0, maximumTravel);
  let x = current.x;
  let y = current.y;

  if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 0.001) {
    x += Math.sign(dx) * Math.min(Math.abs(dx), travel);
  } else if (Math.abs(dy) > 0.001) {
    y += Math.sign(dy) * Math.min(Math.abs(dy), travel);
  }

  return {
    ...current,
    x,
    y,
    facing: useTargetRoute ? target.facing : current.facing,
    moveTarget: useTargetRoute
      ? (target.moveTarget ? { ...target.moveTarget } : null)
      : current.moveTarget,
  };
}

export function reconcileLocalPlayer(current, target, state, input, elapsedMs, predictionMs) {
  const advanced = advanceLocalPlayer(current, state, input, elapsedMs);
  const projected = projectLocalPlayer(target, state, input, predictionMs, current);
  const dx = projected.x - advanced.x;
  const dy = projected.y - advanced.y;
  const separation = Math.abs(dx) + Math.abs(dy);
  const playerSpeed = target.moveSpeed || MOVE_SPEED;
  const elapsedSeconds = Math.max(0, elapsedMs) / 1000;
  const hardDesync = separation > TILE_SIZE * 1.25;
  if (separation > TILE_SIZE * 3 || target.alive === false) return projected;
  if (hardDesync) {
    // Depois de um pico longo de rede, recupera em alta velocidade sem saltar
    // instantaneamente várias casas. Desvios extremos ainda são reposicionados.
    return correctAlongOneAxis(
      advanced,
      projected,
      playerSpeed * 4 * elapsedSeconds,
      true,
    );
  }

  const localTravel = Math.abs(advanced.x - current.x) + Math.abs(advanced.y - current.y);
  const serverTravel = Math.abs(projected.x - target.x) + Math.abs(projected.y - target.y);
  const strandedPrediction = cardinalInput(input)
    && localTravel < 0.001
    && serverTravel > 0.001
    && separation > TILE_SIZE * 0.65;

  const routeDiverged = !sameMoveTarget(advanced.moveTarget, projected.moveTarget)
    && separation > TILE_SIZE * 0.35;

  /*
   * Uma curva aceita em momentos diferentes pode colocar cliente e servidor em
   * rotas distintas. Nesse caso a rota autoritativa vence, mas a correção anda
   * por somente um eixo para não atravessar paredes visualmente na diagonal.
   */
  if (routeDiverged || strandedPrediction) {
    return correctAlongOneAxis(
      advanced,
      projected,
      playerSpeed * (strandedPrediction ? 3 : 2.25) * elapsedSeconds,
      // Quando a previsão ficou presa, copiar imediatamente a rota remota faria
      // o personagem tentar cumprir um destino que ainda não alcança a partir da
      // casa local. Primeiro alinhamos a posição; divergências normais já podem
      // adotar o próximo destino confirmado pelo servidor.
      routeDiverged && !strandedPrediction,
    );
  }

  const direction = cardinalInput(input);
  if (advanced.moveTarget || direction) {
    /*
     * A previsão continua respondendo imediatamente ao teclado, porém agora há
     * um limite para quanto ela pode ficar à frente do servidor. Esse limite é
     * proporcional à janela de rede e nunca passa de meia casa. Assim um pico de
     * latência vira uma correção suave, em vez de um teleporte para trás.
     */
    const maximumLead = Math.min(
      TILE_SIZE * 0.5,
      Math.max(8, playerSpeed * Math.max(0, predictionMs) / 2000 + 5),
    );
    if (separation <= maximumLead) return advanced;

    const serverIsAhead = direction
      ? dx * direction.x + dy * direction.y > 0
      : false;
    const correctionSpeed = playerSpeed * (serverIsAhead ? 2 : 0.65);
    const excess = separation - maximumLead;
    return correctAlongOneAxis(
      advanced,
      projected,
      Math.min(excess, correctionSpeed * elapsedSeconds),
    );
  }

  // Ao soltar as teclas, converge rapidamente para o ponto confirmado.
  const speed = playerSpeed + Math.min(playerSpeed, separation * 8);
  return correctAlongOneAxis(
    advanced,
    projected,
    Math.min(speed * elapsedSeconds, separation),
    true,
  );
}
