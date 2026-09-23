import test from "node:test";
import assert from "node:assert/strict";
import { resolveInput, createInputController } from "../client/input.js";

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

test("Space on the language control keeps native button activation and does not drop a bomb", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const listeners = new Map();
  globalThis.window = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
  };
  globalThis.document = { querySelectorAll: () => [], addEventListener: () => {}, removeEventListener: () => {} };
  const inputs = [];
  let stop;
  try {
    stop = createInputController((input) => inputs.push(input));
    let prevented = false;
    const buttonEvent = { key: " ", code: "Space", target: { closest: () => true }, preventDefault: () => { prevented = true; } };
    listeners.get("keydown")(buttonEvent);
    listeners.get("keyup")(buttonEvent);
    assert.equal(prevented, false);
    assert.ok(inputs.every((input) => !input.drop));

    const gameEvent = { ...buttonEvent, target: { closest: () => false } };
    listeners.get("keydown")(gameEvent);
    assert.equal(prevented, true);
    assert.equal(inputs.at(-1).drop, true);
    // Soltar Espaço depois de mudar o foco deve liberar a ação anterior.
    listeners.get("keyup")(buttonEvent);
    assert.equal(inputs.at(-1).drop, false);
  } finally {
    stop?.();
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
