import test from "node:test";
import assert from "node:assert/strict";
import { makeCode, MATCH_DURATION_MS, Room, SUPER_MATCH_DURATION_MS } from "../server/room.js";

class FakeSocket {
  constructor() { this.readyState = 1; this.messages = []; }
  send(message) { this.messages.push(JSON.parse(message)); }
}

test("room codes use six unambiguous characters", () => {
  for (let count = 0; count < 50; count += 1) assert.match(makeCode(), /^[A-HJ-NP-Z2-9]{6}$/);
});

test("the fifth human receives ROOM_FULL", () => {
  const room = new Room("ABC234", "host-secret");
  for (let count = 0; count < 4; count += 1) assert(room.addHuman(new FakeSocket(), { name: `P${count}`, hostToken: count === 0 ? "host-secret" : null }).id);
  const fifth = room.addHuman(new FakeSocket(), { name: "Fifth" });
  assert.equal(fifth.error.code, "ROOM_FULL");
});

test("stale input packets cannot overwrite a newer direction", () => {
  const room = new Room("ABC234", "host-secret");
  const host = room.addHuman(new FakeSocket(), { name: "Host", hostToken: "host-secret" });
  room.updateInput(host.id, { sequence: 2, dx: 0, dy: 1, direction: "down", directionSequence: 1 });
  room.updateInput(host.id, { sequence: 1, dx: 1, dy: 0, direction: "right", directionSequence: 2 });
  assert.equal(room.inputs[host.id].dx, 0);
  assert.equal(room.inputs[host.id].dy, 1);
  assert.deepEqual(room.inputs[host.id].intent, { dx: 0, dy: 1 });
});

test("a network direction intent is consumed by the simulation", () => {
  const room = new Room("ABC234", "host-secret");
  const host = room.addHuman(new FakeSocket(), { name: "Host", hostToken: "host-secret" });
  room.start(host.id);
  room.updateInput(host.id, { sequence: 1, dx: 0, dy: 0, direction: "right", directionSequence: 1 });
  room.tick(room.startsAt);
  const player = room.state.players.find((candidate) => candidate.id === host.id);
  assert.equal(player.moveTarget?.tileX, 2);
  assert(player.x > 1.5 * 40);
});

test("starting with two humans creates exactly two bots", () => {
  const room = new Room("ABC234", "host-secret");
  const host = room.addHuman(new FakeSocket(), { name: "Host", hostToken: "host-secret" });
  room.addHuman(new FakeSocket(), { name: "Friend" });
  room.start(host.id);
  assert.equal(room.slots.filter((slot) => slot.kind === "bot").length, 2);
  assert.equal(room.state.players.length, 4);
});

test("only the lone host can choose the bot difficulty", () => {
  const room = new Room("ABC234", "host-secret");
  const hostSocket = new FakeSocket();
  const host = room.addHuman(hostSocket, { name: "Host", hostToken: "host-secret" });

  room.setBotDifficulty(host.id, "hard");
  assert.equal(room.botDifficulty, "hard");
  assert.equal(hostSocket.messages.at(-1).botDifficulty, "hard");

  const guest = room.addHuman(new FakeSocket(), { name: "Friend" });
  room.setBotDifficulty(host.id, "easy");
  room.setBotDifficulty(guest.id, "normal");
  assert.equal(room.botDifficulty, "hard");
});
test("the simulation waits for the animated match countdown", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.start(host.id);
  const matchStart = socket.messages.find((message) => message.type === "matchStart");
  assert.equal(matchStart.countdownMs, 4420);
  assert.equal(matchStart.durationMs, 90_000);
  assert.equal(room.endsAt - room.startsAt, MATCH_DURATION_MS);
  room.tick(room.startsAt - 1);
  assert.equal(room.state.tick, 0);
  room.tick(room.startsAt);
  assert.equal(room.state.tick, 1);
});

test("the fixed-step clock catches up after a short server stall", () => {
  const room = new Room("ABC234", "host-secret");
  const host = room.addHuman(new FakeSocket(), { name: "Host", hostToken: "host-secret" });
  room.start(host.id);
  room.tick(room.startsAt);
  room.tick(room.nextSimulationAt + 75);
  assert.equal(room.state.tick, 5);
});

test("snapshots are throttled below the simulation rate", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.start(host.id);
  const startAt = room.startsAt;
  for (let count = 0; count < 5; count += 1) room.tick(startAt + count * 25);
  const snapshots = socket.messages.filter((message) => message.type === "snapshot");
  assert.equal(room.state.tick, 5);
  assert.equal(snapshots.length, 3);
  assert.equal(snapshots.at(-1).networkRate, 20);
});

test("returning from the result announces the lobby transition first", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.start(host.id);
  room.phase = "ended";
  room.rematch(host.id);
  assert.deepEqual(socket.messages.slice(-2).map((message) => message.type), ["lobbyReturn", "lobby"]);
  assert.equal(socket.messages.at(-2).transitionMs, 1320);
});

test("the winner earns one persistent trophy across a rematch", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.start(host.id);
  room.state.status = "ended";
  room.state.winnerSlot = room.state.players.find((candidate) => candidate.id === host.id).slot;
  room.tick(room.startsAt);
  const result = socket.messages.find((message) => message.type === "matchEnd");
  assert.equal(result.reason, "elimination");
  assert.equal(result.standings.find((entry) => entry.id === host.id).trophies, 1);
  room.rematch(host.id);
  const lobby = socket.messages.at(-1);
  assert.equal(lobby.slots.find((entry) => entry.id === host.id).trophies, 1);
});

test("the 90-second limit ends in a draw when multiple players survive", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.start(host.id);

  room.tick(room.startsAt);
  const firstSnapshot = socket.messages.filter((message) => message.type === "snapshot").at(-1);
  assert.equal(firstSnapshot.remainingMs, MATCH_DURATION_MS);

  room.tick(room.endsAt);
  const finalSnapshot = socket.messages.filter((message) => message.type === "snapshot").at(-1);
  const result = socket.messages.find((message) => message.type === "matchEnd");
  assert.equal(finalSnapshot.remainingMs, 0);
  assert.equal(room.phase, "ended");
  assert.equal(result.winnerSlot, null);
  assert.equal(result.reason, "timeout");
  assert.equal(result.standings.every((entry) => entry.trophies === 0), true);
});

test("a disconnected human becomes a bot during play", () => {
  const room = new Room("ABC234", "host-secret");
  const host = room.addHuman(new FakeSocket(), { name: "Host", hostToken: "host-secret" });
  const friend = room.addHuman(new FakeSocket(), { name: "Friend" });
  room.start(host.id);
  room.disconnect(friend.id);
  assert.equal(room.slots.find((slot) => slot.id === friend.id).kind, "bot");
  assert.equal(room.state.players.find((candidate) => candidate.id === friend.id).kind, "bot");
});

test("the host can select Super Bomberlan with a three-minute round", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.setGameMode(host.id, "super");
  assert.equal(socket.messages.at(-1).gameMode, "super");

  room.start(host.id);
  const start = socket.messages.find((message) => message.type === "matchStart");
  assert.equal(start.mode, "super");
  assert.equal(start.durationMs, SUPER_MATCH_DURATION_MS);
  assert.equal(room.endsAt - room.startsAt, 180_000);
});

test("Super Bomberlan starts dropping death blocks in the final 45 seconds", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.setGameMode(host.id, "super");
  room.start(host.id);

  room.tick(room.nextDeathBlockAt);
  assert.equal(room.state.suddenDeathActive, true);
  assert.equal(room.state.fallingBlocks.length, 1);
  assert.equal(socket.messages.filter((message) => message.type === "snapshot").at(-1).suddenDeathActive, true);
});
