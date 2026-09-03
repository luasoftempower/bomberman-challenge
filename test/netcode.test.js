import test from "node:test";
import assert from "node:assert/strict";
import { reconcileLocalPlayer } from "../client/netcode.js";
import { BOARD_HEIGHT, BOARD_WIDTH, EMPTY } from "../shared/constants.js";

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

test("an idle player still converges to an authoritative correction", () => {
  const target = { id: "self", x: 80, y: 60, moveSpeed: 112, facing: "left", moveTarget: null };
  const current = { ...target, x: 90 };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 0, dy: 0 }, 16, 0);
  assert(result.x < current.x);
  assert(result.x > target.x);
});
