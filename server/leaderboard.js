import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEMO_RECORDS = [
  { name: "Moreira", score: 40, demo: true },
  { name: "Saniel", score: 30, demo: true },
  { name: "Luana", score: 20, demo: true },
  { name: "Felipe", score: 10, demo: true },
];

export function openLeaderboard(path) {
  const filename = resolve(path);
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA busy_timeout = 1000;
    CREATE TABLE IF NOT EXISTS match_records (
      player_key TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      score INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS match_records_score ON match_records(score DESC);
  `);

  const saveBest = db.prepare(`
    INSERT INTO match_records (player_key, name, score) VALUES (?, ?, ?)
    ON CONFLICT (player_key) DO UPDATE SET
      name = excluded.name,
      score = excluded.score
    WHERE excluded.score > match_records.score
  `);
  const list = db.prepare("SELECT name, score FROM match_records ORDER BY score DESC, rowid LIMIT 5");

  return {
    recordMatch(players) {
      if (!players.length) return;
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const { rankingKey, name, score } of players) saveBest.run(rankingKey, name, score);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    topFive() {
      // A ordenação estável mantém o exemplo à frente quando há empate.
      return [...DEMO_RECORDS, ...list.all()]
        .sort((left, right) => right.score - left.score)
        .slice(0, 5);
    },
    close: () => db.close(),
  };
}
