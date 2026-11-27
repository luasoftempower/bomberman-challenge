import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function openLeaderboard(path) {
  const filename = resolve(path);
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA busy_timeout = 1000;
    CREATE TABLE IF NOT EXISTS leaderboard (
      player_key TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      score INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS leaderboard_score ON leaderboard(score DESC);
  `);

  const add = db.prepare(`
    INSERT INTO leaderboard (player_key, name, score) VALUES (?, ?, ?)
    ON CONFLICT (player_key) DO UPDATE SET
      name = excluded.name,
      score = leaderboard.score + excluded.score
  `);
  const list = db.prepare("SELECT name, score FROM leaderboard ORDER BY score DESC, rowid LIMIT 5");

  return {
    recordMatch(players) {
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const { rankingKey, name, score } of players) add.run(rankingKey, name, score);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    topFive: () => list.all(),
    close: () => db.close(),
  };
}
