import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGame } from '../client/render.js';
import { reconcileLocalPlayer } from '../client/netcode.js';
import { ARENA_TYPES, arenaDimensions } from '../shared/arena.js';
import { EMPTY, TILE_SIZE, WALL } from '../shared/constants.js';
import { portalsForMap, presetMap, validateCustomMap, validatePortalLayout } from '../shared/maps.js';
import { createMatch, snapshot, step, tileAt } from '../shared/sim.js';

const slots = (count = 4) => Array.from({ length: count }, (_, slot) => ({
  id: `p${slot}`,
  slot,
  name: `Player ${slot}`,
}));

function portalMatch(mapId = 'circuit-6') {
  return createMatch(123, slots(4), { mode: 'super', mapId });
}

function placePlayer(state, player, x, y) {
  player.x = (x + 0.5) * TILE_SIZE;
  player.y = (y + 0.5) * TILE_SIZE;
  player.moveTarget = null;
}

test('only opted-in terrains expose valid reciprocal portal pairs', () => {
  const expectedCounts = new Map([
    ['circuit-6', 2],
    ['plasma-4', 2],
    ['station-5', 4],
  ]);
  for (const arenaType of Object.values(ARENA_TYPES)) {
    for (const [mapId, count] of expectedCounts) {
      const map = presetMap(mapId, arenaType);
      assert.equal(map.portals.length, count, `${mapId}:${arenaType}`);
      assert.equal(validatePortalLayout(map.portals, map.grid), true);
      for (const portal of map.portals) {
        assert.equal(tileAt(map.grid, portal.x, portal.y), EMPTY);
        assert.equal(tileAt(map.grid, portal.targetX, portal.targetY), EMPTY);
      }
    }
    for (const mapId of ['original', 'circuit-5', 'garden-3', 'temple-2']) {
      assert.equal(portalsForMap(mapId, arenaType).length, 0, `${mapId}:${arenaType}`);
      assert.equal(presetMap(mapId, arenaType).portals?.length || 0, 0);
    }
  }
});

test('portal layout validation rejects malformed, overlapping and blocked endpoints', () => {
  const map = presetMap('circuit-6');
  const selfTarget = structuredClone(map.portals);
  selfTarget[0].targetX = selfTarget[0].x;
  selfTarget[0].targetY = selfTarget[0].y;
  assert.equal(validatePortalLayout(selfTarget, map.grid), false);

  const overlapping = structuredClone(map.portals);
  overlapping[1].x = overlapping[0].x;
  overlapping[1].y = overlapping[0].y;
  assert.equal(validatePortalLayout(overlapping, map.grid), false);

  const blockedIndex = map.portals[0].y * arenaDimensions(ARENA_TYPES.RECTANGLE).width + map.portals[0].x;
  const blockedGrid = `${map.grid.slice(0, blockedIndex)}${WALL}${map.grid.slice(blockedIndex + 1)}`;
  assert.equal(validatePortalLayout(map.portals, blockedGrid), false);
});

test('entering a portal teleports once, clears movement and emits synchronized effects', () => {
  const state = portalMatch();
  const player = state.players[0];
  const portal = state.portals[0];
  placePlayer(state, player, portal.x, portal.y);
  player.moveTarget = { x: 0, y: 0, tileX: 0, tileY: 0 };

  step(state, {});

  assert.equal(player.x, (portal.targetX + 0.5) * TILE_SIZE);
  assert.equal(player.y, (portal.targetY + 0.5) * TILE_SIZE);
  assert.equal(player.moveTarget, null);
  assert.equal(player.portalSequence, 1);
  assert.equal(state.portalBursts.length, 2);
  assert.deepEqual(snapshot(state).portals, state.portals);
  assert.deepEqual(snapshot(state).portalBursts, state.portalBursts);

  step(state, {});
  assert.equal(player.portalSequence, 1, 'the destination must not immediately bounce the player back');
});

test('leaving a portal rearms it and allows the reciprocal return trip', () => {
  const state = portalMatch();
  const player = state.players[0];
  const origin = state.portals[0];
  placePlayer(state, player, origin.x, origin.y);
  step(state, {});
  assert.equal(player.portalSequence, 1);

  const { width } = arenaDimensions(state.arenaType);
  const clearIndex = [...state.grid].findIndex((tile, index) => tile === EMPTY
    && !state.portals.some((portal) => portal.x === index % width && portal.y === Math.floor(index / width)));
  placePlayer(state, player, clearIndex % width, Math.floor(clearIndex / width));
  step(state, {});

  placePlayer(state, player, origin.targetX, origin.targetY);
  step(state, {});
  assert.equal(player.portalSequence, 2);
  assert.equal(player.x, (origin.x + 0.5) * TILE_SIZE);
  assert.equal(player.y, (origin.y + 0.5) * TILE_SIZE);
});

test('unsafe destinations block teleport until collisions and hazards clear', () => {
  const cases = [
    ['player', (state, portal) => placePlayer(state, state.players[1], portal.targetX, portal.targetY)],
    ['bomb', (state, portal) => state.bombs.push({ id: 99, ownerId: 'p1', x: portal.targetX, y: portal.targetY, fuse: 99, remote: false, passThroughIds: [] })],
    ['blast', (state, portal) => state.blasts.push({ x: portal.targetX, y: portal.targetY, ttl: 1, ownerIds: [] })],
    ['falling block', (state, portal) => state.fallingBlocks.push({ x: portal.targetX, y: portal.targetY, ttl: 1, duration: 1 })],
    ['solid terrain', (state, portal) => {
      const { width } = arenaDimensions(state.arenaType);
      const index = portal.targetY * width + portal.targetX;
      state.grid = `${state.grid.slice(0, index)}${WALL}${state.grid.slice(index + 1)}`;
    }],
  ];

  for (const [name, block] of cases) {
    const state = portalMatch();
    const player = state.players[0];
    const portal = state.portals[0];
    placePlayer(state, player, portal.x, portal.y);
    block(state, portal);
    step(state, {});
    assert.equal(player.portalSequence, 0, name);
    assert.equal(Math.floor(player.x / TILE_SIZE), portal.x, name);
    assert.equal(Math.floor(player.y / TILE_SIZE), portal.y, name);
  }
});

test('custom map payloads cannot inject portal metadata', () => {
  const base = presetMap('circuit');
  const result = validateCustomMap({ ...base, name: 'Sem atalhos', portals: portalsForMap('circuit-6') });
  assert.ok(result.map);
  assert.equal(result.map.portals, undefined);
  const state = createMatch(5, slots(4), { mode: 'super', mapId: 'custom', customMap: { ...base, name: 'Sem atalhos', portals: portalsForMap('circuit-6') } });
  assert.deepEqual(state.portals, []);
});

test('client reconciliation snaps an intentional teleport instead of crossing walls', () => {
  const state = snapshot(portalMatch());
  const current = { ...state.players[0], x: 60, y: 60, portalSequence: 0, predictedDirectionSequence: 7 };
  const target = { ...current, x: 380, y: 300, portalSequence: 1 };
  state.players[0] = target;

  const result = reconcileLocalPlayer(current, target, state, { dx: 1, dy: 0 }, 16, 100);

  assert.equal(result.x, target.x);
  assert.equal(result.y, target.y);
  assert.equal(result.portalSequence, 1);
  assert.equal(result.predictedDirectionSequence, 7);
});

test('renderer communicates paired portals with their matching label', () => {
  const labels = [];
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => {
        if (key === 'fillText') labels.push(args[0]);
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value));
      };
    },
  });
  const canvas = { width: 1, height: 1, getContext: () => context };
  canvas.ownerDocument = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  const state = snapshot(portalMatch());
  const before = structuredClone(state);

  renderGame(canvas, state);

  assert.equal(labels.filter((label) => label === 'A').length, 2);
  assert.deepEqual(state, before);
});
