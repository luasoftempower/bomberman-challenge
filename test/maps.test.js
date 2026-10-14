import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_FAMILIES, STANDARD_MAPS, presetMap, protectedMapCells, validateCustomMap } from '../shared/maps.js';
import { ARENA_TYPES, arenaDimensions, spawnsForArena } from '../shared/arena.js';
import { createMatch, createGrid, snapshot, tileAt, step } from '../shared/sim.js';
import { Room } from '../server/room.js';
import { TILE_SIZE } from '../shared/constants.js';
import { loadMapLibrary, saveMapLibrary } from '../client/map-library.js';

const slots = (count) => Array.from({ length: count }, (_, slot) => ({ id: `p${slot}`, slot, name: `Player ${slot}` }));
const custom = () => ({ ...presetMap('circuit'), name: 'Arena teste' });

test('random selection resolves to a standard map once per match for 4, 5 and 6 players', () => {
  const expectedIds = STANDARD_MAPS.map((map) => map.id);
  for (const count of [4, 5, 6]) {
    const seen = new Set();
    for (let seed = 1; seed <= 512; seed++) {
      const state = createMatch(seed, slots(count), { mode: 'super', mapId: 'random' });
      assert.ok(expectedIds.includes(state.mapId));
      seen.add(state.mapId);
      const expected = createMatch(seed, slots(count), { mode: 'super', mapId: state.mapId });
      assert.equal(state.grid, expected.grid);
      assert.equal(state.mapTheme, expected.mapTheme);
      assert.equal(state.blockColors, expected.blockColors);
      assert.equal(snapshot(state).mapId, state.mapId);
      assert.equal(createMatch(seed, slots(count), { mode: 'super', mapId: 'random' }).mapId, state.mapId);
    }
    assert.deepEqual([...seen].sort(), expectedIds.sort());
  }
  const classic = createMatch(12, slots(4), { mode: 'classic', mapId: 'random' });
  assert.equal(classic.mapId, 'original');
  assert.equal(classic.grid, createGrid(12));
});
class Socket {
  readyState = 1; messages = [];
  send(raw) { this.messages.push(JSON.parse(raw)); }
}
function roomWithHost() {
  const room = new Room('ABC234', 'secret'), socket = new Socket();
  const host = room.addHuman(socket, { name: 'Host', hostToken: 'secret' }).id;
  return { room, socket, host };
}

test('random is host-only in Super and stays selected after resolving the match map', () => {
  const { room, host } = roomWithHost();
  assert.equal(room.setMap(host, { mapId: 'random' }), false);
  room.setGameMode(host, 'super');
  const guest = room.addHuman(new Socket(), { name: 'Guest' }).id;
  assert.equal(room.setMap(guest, { mapId: 'random' }), false);
  assert.equal(room.setMap(host, { mapId: 'random' }), true);
  assert.equal(room.lobbyPayload().mapId, 'random');
  room.setReady(host, true); room.setReady(guest, true); room.start(host);
  assert.ok(STANDARD_MAPS.some((map) => map.id === room.state.mapId));
  assert.equal(room.mapId, 'random');
  assert.equal(room.setMap(host, { mapId: 'random' }), false);
});

test('all presets have safe spawns and connected layouts for both sizes', () => {
  for (const type of Object.values(ARENA_TYPES)) {
    for (const preset of STANDARD_MAPS) {
      const map = presetMap(preset.id, type);
      const { width, height } = arenaDimensions(type);
      assert.equal(map.grid.length, width * height);
      for (const index of protectedMapCells(type)) assert.equal(map.grid[index], '.');
      assert.ok(map.grid.includes('o'));
      if (type === ARENA_TYPES.RECTANGLE) assert.ok(validateCustomMap({ ...map, name: preset.id }).map, preset.id);
    }
  }
});

test('catalog contains the original plus 36 distinct reference arenas in six families', () => {
  assert.equal(STANDARD_MAPS.length, 37);
  assert.equal(new Set(STANDARD_MAPS.map((map) => map.id)).size, 37);
  for (const family of MAP_FAMILIES) {
    const maps = STANDARD_MAPS.filter((map) => map.family === family.id);
    assert.equal(maps.length, 6);
    for (const arenaType of Object.values(ARENA_TYPES)) {
      const layouts = maps.map((map) => presetMap(map.id, arenaType));
      assert.equal(new Set(layouts.map((map) => map.grid)).size, 6, `${family.id}:${arenaType}`);
    }
  }
});

test('every reference map can be selected by the host and started with six room participants', () => {
  for (const preset of STANDARD_MAPS.filter((map) => map.id !== 'original')) {
    const { room, host } = roomWithHost();
    room.setGameMode(host, 'super');
    for (let count = 0; count < 5; count++) room.addBot(host);
    assert.equal(room.setMap(host, { mapId: preset.id }), true);
    room.setReady(host, true); room.start(host);
    assert.equal(room.state.players.length, 6, preset.id);
    assert.equal(room.state.arenaType, 'rectangle');
    assert.equal(room.state.mapId, preset.id);
    assert.equal(room.state.grid, presetMap(preset.id, 'rectangle').grid);
  }
});

test('Super presets adapt to 4, 5 and 6 players and snapshots retain visual metadata', () => {
  for (const count of [4, 5, 6]) {
    for (const { id } of STANDARD_MAPS) {
      const state = createMatch(123, slots(count), { mode: 'super', mapId: id });
      assert.equal(state.players.length, count);
      assert.equal(state.arenaType, count > 4 ? 'rectangle' : 'square');
      assert.equal(snapshot(state).mapId, id);
      assert.equal(snapshot(state).blockColors, state.blockColors);
      for (const player of state.players) assert.equal(tileAt(state.grid, Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE)), '.');
      step(state, {});
    }
  }
});

test('Classic ignores all custom selections and keeps its original seeded layout', () => {
  const state = createMatch(12, slots(4), { mode: 'classic', mapId: 'custom', customMap: custom() });
  assert.equal(state.mapId, 'original');
  assert.equal(state.grid, createGrid(12));
  assert.equal(state.arenaType, 'square');
});

test('custom maps preserve all six spawns even with fewer active players', () => {
  const map = custom();
  const state = createMatch(11, slots(2), { mode: 'super', mapId: 'custom', customMap: map });
  assert.equal(state.arenaType, 'rectangle');
  assert.equal(state.grid, map.grid);
  assert.equal(state.blockColors, map.colors);
  for (const spawn of spawnsForArena('rectangle')) assert.equal(tileAt(state.grid, spawn.x, spawn.y), '.');
});

test('validation rejects malformed payloads, broken borders, spawns and isolated floor', () => {
  assert.ok(validateCustomMap({ ...custom(), theme: { toString: null } }).error);
  for (const value of [null, {}, { ...custom(), name: '' }, { ...custom(), name: 'x'.repeat(33) }, { ...custom(), theme: '__proto__' }, { ...custom(), grid: '.'.repeat(344) }, { ...custom(), colors: '6'.repeat(345) }, { ...custom(), grid: 'x'.repeat(345) }]) assert.ok(validateCustomMap(value).error);
  const modify = (map, index, tile) => ({ ...map, grid: map.grid.slice(0, index) + tile + map.grid.slice(index + 1) });
  assert.equal(validateCustomMap(modify(custom(), 0, '.')).error, 'maps.borderError');
  assert.equal(validateCustomMap(modify(custom(), 24, 'o')).error, 'maps.spawnError');
  let map = modify(custom(), 7 * 23 + 11, '.');
  for (const index of [6 * 23 + 11, 8 * 23 + 11, 7 * 23 + 10, 7 * 23 + 12]) map = modify(map, index, '#');
  assert.equal(validateCustomMap(map).error, 'maps.disconnected');
  assert.throws(() => createMatch(1, slots(4), { mode: 'super', mapId: 'custom', customMap: map }));
});

test('only the host in a Super lobby can change maps and invalid maps preserve selection', () => {
  const { room, host, socket } = roomWithHost();
  assert.equal(room.setMap(host, { mapId: 'garden' }), false);
  room.setGameMode(host, 'super');
  const guest = room.addHuman(new Socket(), { name: 'Guest' }).id;
  assert.equal(room.setMap(guest, { mapId: 'garden' }), false);
  assert.equal(room.setMap(host, { mapId: 'garden' }), true);
  assert.equal(room.setMap(host, { mapId: 'custom', customMap: {} }), false);
  assert.equal(room.mapId, 'garden');
  assert.equal(socket.messages.at(-1).type, 'mapError');
  assert.equal(room.setMap(host, { mapId: 'missing' }), false);
  assert.equal(room.setMap(host, { mapId: 'custom', customMap: custom() }), true);
  assert.equal(room.lobbyPayload().customMap.name, 'Arena teste');
  room.setReady(host, true); room.setReady(guest, true); room.start(host);
  assert.equal(room.state.mapId, 'custom');
  assert.equal(room.state.grid, custom().grid);
  assert.equal(room.setMap(host, { mapId: 'original' }), false);
});

test('switching to Classic hides custom map data and switching back restores selection', () => {
  const { room, host } = roomWithHost();
  room.setGameMode(host, 'super'); room.setMap(host, { mapId: 'custom', customMap: custom() });
  room.setGameMode(host, 'classic');
  assert.equal(room.lobbyPayload().mapId, 'original'); assert.equal(room.lobbyPayload().customMap, null);
  room.setGameMode(host, 'super'); assert.equal(room.lobbyPayload().mapId, 'custom');
});

test('map library survives reload, filters corrupt data and reports storage failures', () => {
  let raw = null;
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const map = { ...custom(), localId: 'test-id' };
  saveMapLibrary([map], storage); assert.deepEqual(loadMapLibrary(storage), [map]);
  raw = '{bad'; assert.deepEqual(loadMapLibrary(storage), []);
  raw = JSON.stringify([map, { ...map, grid: 'bad' }]); assert.deepEqual(loadMapLibrary(storage), [map]);
  assert.throws(() => saveMapLibrary([map], { setItem: () => { throw new Error('quota'); } }));
  assert.throws(() => saveMapLibrary(Array(13).fill(map), storage), /maps.limit/);
});
