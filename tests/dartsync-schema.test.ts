// @vitest-environment node

import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../migrations/0001_dartsync_initial_schema.sql", import.meta.url)
);
const uniquePlayerNamesMigrationPath = fileURLToPath(
  new URL("../migrations/0002_unique_active_player_names.sql", import.meta.url)
);

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(migrationPath, "utf8"));
  database.exec(readFileSync(uniquePlayerNamesMigrationPath, "utf8"));
  return database;
}

describe("DartSync D1 schema", () => {
  it("creates the initial persistence tables", () => {
    const database = createDatabase();
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = ? ORDER BY name")
      .all("table")
      .map((row) => row.name);

    expect(tables).toEqual([
      "game_players",
      "game_results",
      "games",
      "players",
    ]);
  });

  it("preserves historical results when a player is soft deleted", () => {
    const database = createDatabase();

    database
      .prepare("INSERT INTO players (id, name) VALUES (?, ?)")
      .run("rick", "Rick");
    database
      .prepare(
        "INSERT INTO games (id, game_type, status, completed_at) VALUES (?, ?, ?, ?)"
      )
      .run(
        "game-1",
        "around-the-world",
        "completed",
        "2026-08-31T00:00:00Z"
      );
    database
      .prepare(
        "INSERT INTO game_players (game_id, player_id, player_name, turn_order) VALUES (?, ?, ?, ?)"
      )
      .run("game-1", "rick", "Rick", 0);
    database
      .prepare(
        "INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement) VALUES (?, ?, ?, ?, ?)"
      )
      .run("game-1", "rick", "Rick", 1, 1);
    database
      .prepare("UPDATE players SET deleted_at = ? WHERE id = ?")
      .run("2026-08-31T01:00:00Z", "rick");

    expect(
      database
        .prepare(
          "SELECT player_name, is_winner FROM game_results WHERE game_id = ?"
        )
        .get("game-1")
    ).toMatchObject({ player_name: "Rick", is_winner: 1 });
  });
});
