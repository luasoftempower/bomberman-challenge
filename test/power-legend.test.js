import test from "node:test";
import assert from "node:assert/strict";
import { activePowers, powerListMarkup } from "../client/components/power-legend.js";
import { createMatch, step, snapshot } from "../shared/sim.js";
import { GAME_MODES, POWERUP_TYPES, TILE_SIZE } from "../shared/constants.js";
import { setLanguage } from "../client/i18n/index.js";

function match(count = 4) {
  return createMatch(123, Array.from({ length: count }, (_, slot) => ({ id: String(slot), slot, name: "Player" })), { mode: GAME_MODES.SUPER });
}
function collect(state, type) {
  const player = state.players[0];
  state.powerups.push({ id: type, type, x: Math.floor(player.x / TILE_SIZE), y: Math.floor(player.y / TILE_SIZE) });
  step(state);
  return snapshot(state).players[0];
}

test("legend reflects all ten powerups collected through the simulation", () => {
  for (const type of POWERUP_TYPES) {
    const state = match();
    const player = collect(state, type);
    assert.deepEqual(activePowers(player, state.grid).map(([key]) => key), [type]);
  }
});

test("legend removes expired protection and all powers on elimination or a fresh round", () => {
  const state = match();
  assert.deepEqual(activePowers(state.players[0], state.grid), []);
  collect(state, "remote");
  collect(state, "suit");
  state.tick = state.players[0].invincibleUntilTick;
  assert.deepEqual(activePowers(snapshot(state).players[0], state.grid).map(([key]) => key), ["remote"]);
  state.players[0].alive = false;
  assert.deepEqual(activePowers(snapshot(state).players[0], state.grid), []);
  const fresh = match();
  assert.deepEqual(activePowers(fresh.players[0], fresh.grid), []);
});

test("full fire uses the actual arena dimensions and replaces the normal fire entry", () => {
  const state = match(6);
  state.players[0].fireRange = 13;
  assert.deepEqual(activePowers(state.players[0], state.grid).map(([key]) => key), ["fire"]);
  const player = collect(state, "fullFire");
  assert.deepEqual(activePowers(player, state.grid).map(([key]) => key), ["fullFire"]);
});

test("legend translates instructions and shows keyboard and touch actions", () => {
  const state = match();
  collect(state, "remote");
  collect(state, "glove");
  const player = collect(state, "kick");
  for (const language of ["pt", "en"]) {
    setLanguage(language);
    const markup = powerListMarkup(player, state.grid);
    assert.ok(markup.includes("<kbd>E</kbd>"));
    assert.ok(markup.includes("<kbd>Q</kbd>"));
    assert.ok(markup.includes("WASD"));
    assert.ok(markup.includes(language === "pt" ? "Arremessa" : "Throws"));
    assert.ok(markup.includes('data-i18n="controls.glove"'));
    assert.ok(!markup.includes("undefined"));
  }
  setLanguage("pt");
});
