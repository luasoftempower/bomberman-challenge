import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openLeaderboard } from "../server/leaderboard.js";
import { Room } from "../server/room.js";

test("the overall top five accumulate completed matches and survive a database reopen", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "raivolt-ranking-"));
  const filename = join(directory, "leaderboard.sqlite");
  let leaderboard = openLeaderboard(filename);
  t.after(() => {
    leaderboard.close();
    rmSync(directory, { recursive: true, force: true });
  });

  assert.deepEqual(leaderboard.topFive(), []);
  leaderboard.recordMatch(Array.from({ length: 6 }, (_, index) => ({
    rankingKey: String(index),
    name: "Jogador",
    score: index * 10,
  })));
  leaderboard.recordMatch([{ rankingKey: "0", name: "Novo apelido", score: 70 }]);
  leaderboard.close();
  leaderboard = openLeaderboard(filename);

  const entries = leaderboard.topFive();
  assert.deepEqual(entries.map(({ score }) => score), [70, 50, 40, 30, 20]);
  assert.equal(entries[0].name, "Novo apelido");
  assert.deepEqual(Object.keys(entries[0]), ["name", "score"]);
});

test("round standings include bots and rank by score while history counts humans once", () => {
  const rounds = [];
  const messages = [];
  const socket = { readyState: 1, send: (payload) => messages.push(JSON.parse(payload)) };
  const rankingToken = "a".repeat(32);
  const room = new Room("RANKED", "secret", (scores) => rounds.push(scores));
  const { id } = room.addHuman(socket, { name: "Primeiro apelido", rankingToken });
  const guest = room.addHuman({ ...socket }, { name: "Visitante" });
  room.start(id);

  const [host, visitor, bot] = room.state.players;
  host.score = 10;
  visitor.score = 25;
  room.disconnect(guest.id);
  visitor.score += 100;
  bot.score = 150;
  room.state.status = "ended";
  room.state.winnerSlot = host.slot;
  room.tick(room.startsAt);
  room.tick();

  const result = messages.find(({ type }) => type === "matchEnd");
  assert.deepEqual(result.standings.map(({ score }) => score), [150, 125, 10, 0]);
  assert.equal(result.standings.at(-2).trophies, 1);
  assert.equal(result.winnerSlot, host.slot);
  assert.equal(rounds.length, 1);
  assert.deepEqual(rounds[0].map(({ name, score }) => [name, score]), [
    ["Visitante", 25],
    ["Primeiro apelido", 10],
  ]);

  room.rematch(id);
  room.start(id);
  assert(room.state.players.every(({ score }) => score === 0));

  const anotherRoom = new Room("SECOND", "other-secret", (scores) => rounds.push(scores));
  const returning = anotherRoom.addHuman(socket, { name: "Novo apelido", rankingToken });
  anotherRoom.start(returning.id);
  anotherRoom.state.status = "ended";
  anotherRoom.tick(anotherRoom.startsAt);
  assert.equal(rounds[1][0].rankingKey, rounds[0][1].rankingKey);
  assert.equal(rounds[1][0].name, "Novo apelido");
});
