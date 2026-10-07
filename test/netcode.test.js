import test from "node:test";
import assert from "node:assert/strict";
import { reconcileLocalPlayer } from "../client/netcode.js";
import { BOARD_HEIGHT, BOARD_WIDTH, EMPTY, WALL } from "../shared/constants.js";

function stateWith(player) {
  return {
    grid: EMPTY.repeat(BOARD_WIDTH * BOARD_HEIGHT),
    bombs: [],
    players: [player],
  };
}

test("local movement keeps advancing while an authoritative snapshot is stale", () => {
  const target = { id: "self", x: 80, y: 60, moveSpeed: 112, facing: "right", moveTarget: { x: 100, y: 60, tileX: 2, tileY: 1 } };
  const current = { ...target, x: 90, moveTarget: { ...target.moveTarget } };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 1, dy: 0 }, 16, 0);
  assert(result.x > current.x);
  assert.equal(result.y, current.y);
});

test("local movement crosses a tile boundary without waiting for the next snapshot", () => {
  const target = { id: "self", x: 98, y: 60, moveSpeed: 112, facing: "right", moveTarget: { x: 100, y: 60, tileX: 2, tileY: 1 } };
  const current = { ...target, x: 100, moveTarget: null };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 1, dy: 0 }, 16, 0);
  assert(result.x > 100);
  assert.equal(result.moveTarget?.tileX, 3);
});

test("a buffered turn does not rewind while the server finishes the previous tile", () => {
  const target = { id: "self", x: 97, y: 60, moveSpeed: 112, facing: "right", moveTarget: { x: 100, y: 60, tileX: 2, tileY: 1 } };
  const current = { ...target, x: 100, y: 70, facing: "down", moveTarget: { x: 100, y: 100, tileX: 2, tileY: 2 } };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 0, dy: 1 }, 16, 20);
  assert.equal(result.x, current.x);
  assert(result.y > current.y);
});

test("a prediction stranded on the wrong tile recovers toward the server", () => {
  const target = { id: "self", x: 60, y: 60, moveSpeed: 112, facing: "down", moveTarget: { x: 60, y: 100, tileX: 1, tileY: 2 } };
  const current = { ...target, x: 100, moveTarget: null };
  const state = stateWith(target);
  const blockedIndex = 2 * BOARD_WIDTH + 2;
  state.grid = `${state.grid.slice(0, blockedIndex)}${WALL}${state.grid.slice(blockedIndex + 1)}`;

  const result = reconcileLocalPlayer(current, target, state, { dx: 0, dy: 1 }, 16, 20);

  assert(result.x < current.x);
  assert(result.x > target.x);
  assert.equal(result.moveTarget, null);
});

test("an idle player still converges to an authoritative correction", () => {
  const target = { id: "self", x: 80, y: 60, moveSpeed: 112, facing: "left", moveTarget: null };
  const current = { ...target, x: 90 };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 0, dy: 0 }, 16, 0);
  assert(result.x < current.x);
  assert(result.x > target.x);
});

test("continuous local prediction stays within a bounded lead of a delayed server", () => {
  const target = { id: "self", x: 80, y: 60, moveSpeed: 112, facing: "right", moveTarget: { x: 100, y: 60, tileX: 2, tileY: 1 } };
  const state = stateWith(target);
  let current = { ...target, moveTarget: { ...target.moveTarget } };

  // Simula dois segundos de frames sem receber uma posição autoritativa nova.
  // Antes deste limite, o cliente atravessava várias casas e voltava de uma vez.
  for (let frame = 0; frame < 125; frame += 1) {
    current = reconcileLocalPlayer(current, target, state, { dx: 1, dy: 0 }, 16, 160);
  }

  const projected = 80 + 112 * 0.16;
  assert.ok(current.x <= projected + 20.01);
});

test("a divergent predicted turn corrects one axis at a time", () => {
  const target = { id: "self", x: 95, y: 60, moveSpeed: 112, facing: "right", moveTarget: { x: 100, y: 60, tileX: 2, tileY: 1 } };
  const current = { ...target, x: 100, y: 72, facing: "down", moveTarget: { x: 100, y: 100, tileX: 2, tileY: 2 } };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 0, dy: 1 }, 16, 30);

  assert.ok(result.y < current.y);
  assert.equal(result.x, current.x);
  assert.equal(result.moveTarget?.tileX, target.moveTarget.tileX);
  assert.equal(result.moveTarget?.tileY, target.moveTarget.tileY);
});

test("a quick released turn is buffered until the next tile center", () => {
  const target = { id: "self", x: 90, y: 60, moveSpeed: 112, facing: "right", moveTarget: { x: 100, y: 60, tileX: 2, tileY: 1 } };
  const input = { dx: 0, dy: 0, direction: "down", directionSequence: 1 };
  const result = reconcileLocalPlayer(target, target, stateWith(target), input, 100, 100);

  assert.equal(result.x, 100);
  assert.ok(result.y > 60);
  assert.equal(result.moveTarget?.tileX, 2);
  assert.equal(result.moveTarget?.tileY, 2);
  assert.equal(result.predictedDirectionSequence, 1);
});

test("an airborne bomb does not stall local movement", () => {
  const target = { id: "self", x: 60, y: 60, moveSpeed: 112, facing: "right", moveTarget: null };
  const state = stateWith(target);
  state.bombs = [{ id: 1, x: 2, y: 1, airborneTtl: 0.2 }];
  const result = reconcileLocalPlayer(target, target, state, { dx: 1, dy: 0 }, 16, 35);

  assert.ok(result.x > target.x);
  assert.equal(result.moveTarget?.tileX, 2);
});

test("a valid kick does not wait for a server round trip", () => {
  const target = { id: "self", x: 60, y: 60, moveSpeed: 112, facing: "right", moveTarget: null, kick: true };
  const state = stateWith(target);
  state.bombs = [{ id: 1, x: 2, y: 1 }];
  const result = reconcileLocalPlayer(target, target, state, { dx: 1, dy: 0 }, 16, 35);

  assert.ok(result.x > target.x);
  assert.equal(result.moveTarget?.tileX, 2);
});

test("a large same-axis correction catches up without teleporting", () => {
  const target = { id: "self", x: 160, y: 60, moveSpeed: 112, facing: "right", moveTarget: { x: 180, y: 60, tileX: 4, tileY: 1 } };
  const current = { ...target, x: 60, moveTarget: { x: 100, y: 60, tileX: 2, tileY: 1 } };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 1, dy: 0 }, 16, 100);

  assert.ok(result.x > current.x);
  assert.ok(result.x < 80);
  assert.equal(result.y, current.y);
});

test("Render-like jitter does not freeze or rewind continuous movement", () => {
  const playerAt = (milliseconds) => {
    const x = 60 + 112 * milliseconds / 1000;
    const tileX = Math.floor((x - 60 + 0.001) / 40) + 2;
    return {
      id: "self",
      x,
      y: 60,
      moveSpeed: 112,
      facing: "right",
      moveTarget: { x: (tileX + 0.5) * 40, y: 60, tileX, tileY: 1 },
    };
  };
  const queued = [];
  let previousDelivery = 0;
  for (let sentAt = 0, index = 0; sentAt <= 2400; sentAt += 50, index += 1) {
    // Um pico de 430 ms bloqueia temporariamente os pacotes seguintes, como
    // pode ocorrer em uma conexão WebSocket passando por um proxy do Render.
    const delay = index === 16 ? 430 : 70 + (index % 4) * 9;
    const arrivesAt = Math.max(sentAt + delay, previousDelivery + 0.01);
    queued.push({ arrivesAt, sentAt, player: playerAt(sentAt) });
    previousDelivery = arrivesAt;
  }

  let latest = playerAt(0);
  let receivedAt = 0;
  let current = { ...latest, moveTarget: { ...latest.moveTarget } };
  let lastX = current.x;
  let stalledFrames = 0;
  let longestStall = 0;
  let largestFrameTravel = 0;

  for (let now = 16; now <= 2400; now += 16) {
    while (queued.length && queued[0].arrivesAt <= now) {
      const delivered = queued.shift();
      latest = delivered.player;
      receivedAt = now;
    }
    const snapshotState = stateWith(latest);
    const predictionMs = Math.min(650, Math.max(0, now - receivedAt) + 50);
    current = reconcileLocalPlayer(
      current,
      latest,
      snapshotState,
      { dx: 1, dy: 0 },
      16,
      predictionMs,
    );
    const travel = current.x - lastX;
    assert.ok(travel >= -0.01, `movement rewound by ${travel} pixels at ${now} ms`);
    largestFrameTravel = Math.max(largestFrameTravel, travel);
    stalledFrames = travel < 0.2 ? stalledFrames + 1 : 0;
    longestStall = Math.max(longestStall, stalledFrames);
    lastX = current.x;
  }

  assert.ok(longestStall <= 2, `movement froze for ${longestStall} frames`);
  assert.ok(largestFrameTravel < 8, `movement jumped ${largestFrameTravel} pixels in one frame`);
});
