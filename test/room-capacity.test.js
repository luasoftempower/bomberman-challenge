import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "../server/room.js";

const socket = () => ({ readyState: 1, send() {} });
function setup(mode = "classic") {
  const room = new Room("ABC234", "secret");
  const host = room.addHuman(socket(), { name: "Host", hostToken: "secret" });
  room.setGameMode(host.id, mode);
  return { room, host };
}

for (const [mode, capacity] of [["classic", 4], ["super", 6]]) {
  test(`${mode} limits humans and manual bots to ${capacity} participants`, () => {
    const { room, host } = setup(mode);
    const guest = room.addHuman(socket(), { name: "Guest" });
    assert.ok(guest.id);
    for (let i = 0; i < capacity; i++) room.addBot(host.id);
    assert.equal(room.slots.length, capacity);
    assert.equal(room.slots.filter(s => s.kind === "bot").length, capacity - 2);
    assert.equal(room.addHuman(socket(), { name: "Extra" }).error.code, "ROOM_FULL");
    assert.equal(room.lobbyPayload().capacity, capacity);
    room.removeBot(host.id);
    assert.ok(room.addHuman(socket(), { name: "Replacement" }).id);
    room.start(host.id);
    assert.equal(room.state.players.length, capacity);
    assert.equal(room.state.arenaType, mode === "classic" ? "square" : "rectangle");
    const before = room.slots.map(s => s.id);
    room.addBot(host.id);
    room.removeBot(host.id);
    room.setGameMode(host.id, mode === "classic" ? "super" : "classic");
    assert.deepEqual(room.slots.map(s => s.id), before);
    assert.equal(room.gameMode, mode);
  });
}

test("Classic rejects a fifth human", () => {
  const { room } = setup();
  for (let i = 0; i < 3; i++) assert.ok(room.addHuman(socket(), { name: `P${i}` }).id);
  assert.equal(room.addHuman(socket(), { name: "Fifth" }).error.code, "ROOM_FULL");
});

test("only the host can add or remove bots and change capacity", () => {
  const { room, host } = setup();
  const guest = room.addHuman(socket(), { name: "Guest" });
  room.addBot(guest.id);
  assert.equal(room.slots.filter(s => s.kind === "bot").length, 0);
  room.addBot(host.id);
  room.removeBot(guest.id);
  room.setGameMode(guest.id, "super");
  assert.equal(room.slots.filter(s => s.kind === "bot").length, 1);
  assert.equal(room.slots.length, 4);
});

test("switching to Classic rejects overcrowding and preserves high-slot humans when space is freed", () => {
  const { room, host } = setup("super");
  const guests = Array.from({ length: 5 }, (_, i) => room.addHuman(socket(), { name: `P${i}` }));
  room.setGameMode(host.id, "classic");
  assert.equal(room.gameMode, "super");
  room.disconnect(guests[0].id);
  room.disconnect(guests[1].id);
  room.trophies.set(guests[4].id, 3);
  room.setGameMode(host.id, "classic");
  assert.equal(room.slots.length, 4);
  assert.equal(room.humanCount(), 4);
  assert.equal(room.trophies.get(guests[4].id), 3);
  assert.equal(room.hostId, host.id);
  room.slots.forEach((s, i) => assert.equal(s.slot, i));
});

test("manual bots survive rematches and retain unique IDs after shrinking and expanding", () => {
  const { room, host } = setup("super");
  for (let i = 0; i < 5; i++) room.addBot(host.id);
  room.setGameMode(host.id, "classic");
  assert.equal(room.gameMode, "super");
  room.removeBot(host.id);
  room.removeBot(host.id);
  room.setGameMode(host.id, "classic");
  room.setGameMode(host.id, "super");
  room.addBot(host.id);
  room.addBot(host.id);
  const ids = room.slots.map(s => s.id);
  assert.equal(new Set(ids).size, 6);
  assert.equal(room.lobbyPayload().slots.filter(s => s.manual).length, 5);
  room.start(host.id);
  room.phase = "ended";
  room.rematch(host.id);
  assert.deepEqual(room.slots.map(s => s.id), ids);
  room.removeBot(host.id);
  assert.equal(room.slots.filter(s => s.kind === "bot").length, 4);
});
