import test from "node:test";
import assert from "node:assert/strict";
import { makeCode, Room } from "../server/room.js";

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

test("starting with two humans creates exactly two bots", () => {
  const room = new Room("ABC234", "host-secret");
  const host = room.addHuman(new FakeSocket(), { name: "Host", hostToken: "host-secret" });
  room.addHuman(new FakeSocket(), { name: "Friend" });
  room.start(host.id);
  assert.equal(room.slots.filter((slot) => slot.kind === "bot").length, 2);
  assert.equal(room.state.players.length, 4);
});

<<<<<<< HEAD
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
=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
test("the simulation waits for the animated match countdown", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.start(host.id);
  const matchStart = socket.messages.find((message) => message.type === "matchStart");
<<<<<<< HEAD
  assert.equal(matchStart.countdownMs, 4420);
=======
  assert.equal(matchStart.countdownMs, 2400);
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
  room.tick(room.startsAt - 1);
  assert.equal(room.state.tick, 0);
  room.tick(room.startsAt);
  assert.equal(room.state.tick, 1);
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

<<<<<<< HEAD
test("the winner earns one persistent trophy across a rematch", () => {
  const room = new Room("ABC234", "host-secret");
  const socket = new FakeSocket();
  const host = room.addHuman(socket, { name: "Host", hostToken: "host-secret" });
  room.start(host.id);
  room.state.status = "ended";
  room.state.winnerSlot = room.state.players.find((candidate) => candidate.id === host.id).slot;
  room.tick(room.startsAt);
  const result = socket.messages.find((message) => message.type === "matchEnd");
  assert.equal(result.standings.find((entry) => entry.id === host.id).trophies, 1);
  room.rematch(host.id);
  const lobby = socket.messages.at(-1);
  assert.equal(lobby.slots.find((entry) => entry.id === host.id).trophies, 1);
});

=======
>>>>>>> e1d4b9e6430ba42826193cf0423b78a20eded43a
test("a disconnected human becomes a bot during play", () => {
  const room = new Room("ABC234", "host-secret");
  const host = room.addHuman(new FakeSocket(), { name: "Host", hostToken: "host-secret" });
  const friend = room.addHuman(new FakeSocket(), { name: "Friend" });
  room.start(host.id);
  room.disconnect(friend.id);
  assert.equal(room.slots.find((slot) => slot.id === friend.id).kind, "bot");
  assert.equal(room.state.players.find((candidate) => candidate.id === friend.id).kind, "bot");
});
