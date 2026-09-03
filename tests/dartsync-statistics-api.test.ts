// @vitest-environment node

import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { handleListStatistics } from '../functions/api/dartsync/statistics'
import type { PlayerDatabase } from '../functions/lib/dartsync/playerRepository'

const migrationPaths = [
  '../migrations/0001_dartsync_initial_schema.sql',
  '../migrations/0002_unique_active_player_names.sql',
].map((path) => fileURLToPath(new URL(path, import.meta.url)))

function createDatabase(): { sqlite: DatabaseSync; database: PlayerDatabase } {
  const sqlite = new DatabaseSync(':memory:')
  migrationPaths.forEach((path) => sqlite.exec(readFileSync(path, 'utf8')))

  return {
    sqlite,
    database: {
      prepare: (query) => {
        const createStatement = (values: unknown[] = []) => ({
          bind: (...nextValues: unknown[]) => createStatement(nextValues),
          all: async <T>() => ({ results: sqlite.prepare(query).all(...values) as T[] }),
          first: async <T>() => (
            (sqlite.prepare(query).get(...values) as T | undefined) ?? null
          ),
          run: async <T>() => ({ results: sqlite.prepare(query).all(...values) as T[] }),
        })
        return createStatement()
      },
    },
  }
}

it('returns reset-aware lifetime and per-game statistics for active players', async () => {
  const { database, sqlite } = createDatabase()
  sqlite.exec(`
    INSERT INTO players (id, name, stats_reset_at, created_at)
    VALUES ('rick', 'Rick', '2026-08-02T00:00:00.000Z', '2026-08-01T00:00:00.000Z');
    INSERT INTO players (id, name, created_at)
    VALUES ('jaie', 'Jaie', '2026-08-01T00:01:00.000Z');
    INSERT INTO players (id, name, created_at)
    VALUES ('enrique', 'Enrique', '2026-08-01T00:02:00.000Z');
    INSERT INTO players (id, name, deleted_at, created_at)
    VALUES ('deleted', 'Deleted', '2026-08-05T00:00:00.000Z', '2026-08-01T00:03:00.000Z');

    INSERT INTO games (id, game_type, status, completed_at)
    VALUES ('old-game', 'house-cricket', 'completed', '2026-08-01T12:00:00.000Z');
    INSERT INTO games (id, game_type, status, completed_at)
    VALUES ('new-game', 'around-the-world', 'completed', '2026-08-03T12:00:00.000Z');

    INSERT INTO game_players (game_id, player_id, player_name, turn_order)
    VALUES ('old-game', 'rick', 'Rick', 0), ('old-game', 'jaie', 'Jaie', 1),
           ('new-game', 'rick', 'Rick', 0), ('new-game', 'jaie', 'Jaie', 1);
    INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement)
    VALUES ('old-game', 'rick', 'Rick', 1, 1), ('old-game', 'jaie', 'Jaie', 0, 2),
           ('new-game', 'rick', 'Rick', 0, 2), ('new-game', 'jaie', 'Jaie', 1, 1);
  `)

  const response = await handleListStatistics(database)

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({
    players: [
      {
        playerId: 'rick',
        playerName: 'Rick',
        gamesPlayed: 1,
        wins: 0,
        losses: 1,
        winPercentage: 0,
        byGameType: [{
          gameType: 'around-the-world',
          gamesPlayed: 1,
          wins: 0,
          losses: 1,
          winPercentage: 0,
        }],
      },
      {
        playerId: 'jaie',
        playerName: 'Jaie',
        gamesPlayed: 2,
        wins: 1,
        losses: 1,
        winPercentage: 50,
        byGameType: [
          {
            gameType: 'around-the-world',
            gamesPlayed: 1,
            wins: 1,
            losses: 0,
            winPercentage: 100,
          },
          {
            gameType: 'house-cricket',
            gamesPlayed: 1,
            wins: 0,
            losses: 1,
            winPercentage: 0,
          },
        ],
      },
      {
        playerId: 'enrique',
        playerName: 'Enrique',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winPercentage: 0,
        byGameType: [],
      },
    ],
  })
})
