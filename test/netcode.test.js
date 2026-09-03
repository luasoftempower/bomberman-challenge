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

test("local reconciliation never rewinds a player moving right", () => {
  const target = { id: "self", x: 80, y: 60, moveSpeed: 112, facing: "right", moveTarget: { x: 100, y: 60, tileX: 2, tileY: 1 } };
  const current = { ...target, x: 90 };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 1, dy: 0 }, 16, 0);
  assert.equal(result.x, current.x);
});

test("local reconciliation never rewinds a player moving down", () => {
  const target = { id: "self", x: 60, y: 80, moveSpeed: 112, facing: "down", moveTarget: { x: 60, y: 100, tileX: 1, tileY: 2 } };
  const current = { ...target, y: 90 };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 0, dy: 1 }, 16, 0);
  assert.equal(result.y, current.y);
});

test("an idle player still converges to an authoritative correction", () => {
  const target = { id: "self", x: 80, y: 60, moveSpeed: 112, facing: "left", moveTarget: null };
  const current = { ...target, x: 90 };
  const result = reconcileLocalPlayer(current, target, stateWith(target), { dx: 0, dy: 0 }, 16, 0);
  assert(result.x < current.x);
  assert(result.x > target.x);
});
