import test from "node:test";
import assert from "node:assert/strict";
import { resolveInput } from "../client/input.js";

test("the most recently pressed direction wins across both axes", () => {
  const held = new Set(["right", "down"]);
  assert.deepEqual(resolveInput(held, ["right", "down"]), {
    dx: 0, dy: 1, drop: false, detonate: false, special: false,
  });
  assert.deepEqual(resolveInput(held, ["down", "right"]), {
    dx: 1, dy: 0, drop: false, detonate: false, special: false,
  });
});

test("releasing the newest direction falls back to the still-held direction", () => {
  const held = new Set(["up"]);
  assert.deepEqual(resolveInput(held, ["up", "left"]), {
    dx: 0, dy: -1, drop: false, detonate: false, special: false,
  });
});
