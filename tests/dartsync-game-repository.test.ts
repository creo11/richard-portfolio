// @vitest-environment node

import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  abandonGame,
  completeGame,
  GameAlreadyFinishedError,
  InvalidGameParticipantsError,
  InvalidGameResultsError,
  startGame,
  type GameDatabase,
  type GameStatement,
} from '../functions/lib/dartsync/gameRepository'

const migrationPaths = [
  '../migrations/0001_dartsync_initial_schema.sql',
  '../migrations/0002_unique_active_player_names.sql',
].map((path) => fileURLToPath(new URL(path, import.meta.url)))

type TestStatement = GameStatement & {
  query: string
  values: unknown[]
}

function createDatabase(): { sqlite: DatabaseSync; database: GameDatabase } {
  const sqlite = new DatabaseSync(':memory:')
  migrationPaths.forEach((path) => sqlite.exec(readFileSync(path, 'utf8')))

  const createStatement = (query: string, values: unknown[] = []): TestStatement => ({
    query,
    values,
    bind: (...nextValues: unknown[]) => createStatement(query, nextValues),
    all: async <T>() => ({
      results: sqlite.prepare(query).all(...values) as T[],
    }),
    first: async <T>() => (
      (sqlite.prepare(query).get(...values) as T | undefined) ?? null
    ),
    run: async <T>() => ({
      results: sqlite.prepare(query).all(...values) as T[],
    }),
  })

  return {
    sqlite,
    database: {
      prepare: (query) => createStatement(query),
      batch: async <T>(statements: GameStatement[]) => {
        sqlite.exec('BEGIN')

        try {
          const results = statements.map((statement) => {
            const testStatement = statement as TestStatement
            return {
              results: sqlite
                .prepare(testStatement.query)
                .all(...testStatement.values) as T[],
            }
          })
          sqlite.exec('COMMIT')
          return results
        } catch (error) {
          sqlite.exec('ROLLBACK')
          throw error
        }
      },
    },
  }
}

function addPlayers(sqlite: DatabaseSync): void {
  sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('rick', 'Rick')
  sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('jaie', 'Jaie')
  sqlite.prepare('INSERT INTO players (id, name, deleted_at) VALUES (?, ?, ?)')
    .run('enrique', 'Enrique', '2026-09-01T00:00:00.000Z')
}

describe('DartSync game repository', () => {
  it('starts a game with ordered player snapshots and options', async () => {
    const { database, sqlite } = createDatabase()
    addPlayers(sqlite)

    const game = await startGame(database, {
      id: 'game-1',
      gameType: 'around-the-world',
      options: { multiplierAdvance: true },
      playerIds: ['jaie', 'rick'],
    })

    expect(game).toEqual({
      id: 'game-1',
      gameType: 'around-the-world',
      options: { multiplierAdvance: true },
      participants: [
        { playerId: 'jaie', playerName: 'Jaie', turnOrder: 0 },
        { playerId: 'rick', playerName: 'Rick', turnOrder: 1 },
      ],
    })
    expect(sqlite.prepare(`
      SELECT game_type, status, options_json
      FROM games
      WHERE id = ?
    `).get('game-1')).toEqual({
      game_type: 'around-the-world',
      status: 'active',
      options_json: '{"multiplierAdvance":true}',
    })
  })

  it.each([
    { label: 'fewer than two players', playerIds: ['rick'] },
    { label: 'duplicate players', playerIds: ['rick', 'rick'] },
    { label: 'a missing player', playerIds: ['rick', 'missing'] },
    { label: 'a deleted player', playerIds: ['rick', 'enrique'] },
  ])('rejects $label without creating a game', async ({ playerIds }) => {
    const { database, sqlite } = createDatabase()
    addPlayers(sqlite)

    await expect(startGame(database, {
      id: 'game-1',
      gameType: 'house-cricket',
      options: {},
      playerIds,
    })).rejects.toBeInstanceOf(InvalidGameParticipantsError)
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM games').get())
      .toEqual({ count: 0 })
  })

  it('completes a game with one result per participant and preserved names', async () => {
    const { database, sqlite } = createDatabase()
    addPlayers(sqlite)
    await startGame(database, {
      id: 'game-1',
      gameType: 'house-cricket',
      options: {},
      playerIds: ['rick', 'jaie'],
    })
    sqlite.prepare('UPDATE players SET name = ? WHERE id = ?').run('Richard', 'rick')

    await completeGame(database, {
      gameId: 'game-1',
      winnerPlayerId: 'rick',
      results: [
        { playerId: 'rick', placement: 1, data: { showdownBulls: 2 } },
        { playerId: 'jaie', placement: 2, data: { showdownBulls: 1 } },
      ],
    })

    expect(sqlite.prepare(`
      SELECT status, completed_at
      FROM games
      WHERE id = ?
    `).get('game-1')).toMatchObject({
      status: 'completed',
      completed_at: expect.any(String),
    })
    expect(sqlite.prepare(`
      SELECT player_id, player_name, is_winner, placement, result_json
      FROM game_results
      ORDER BY placement ASC
    `).all()).toEqual([
      {
        player_id: 'rick',
        player_name: 'Rick',
        is_winner: 1,
        placement: 1,
        result_json: '{"showdownBulls":2}',
      },
      {
        player_id: 'jaie',
        player_name: 'Jaie',
        is_winner: 0,
        placement: 2,
        result_json: '{"showdownBulls":1}',
      },
    ])
  })

  it.each([
    {
      label: 'a winner outside the game',
      winnerPlayerId: 'enrique',
      results: [
        { playerId: 'rick', placement: 2, data: {} },
        { playerId: 'jaie', placement: 1, data: {} },
      ],
    },
    {
      label: 'a missing participant result',
      winnerPlayerId: 'rick',
      results: [{ playerId: 'rick', placement: 1, data: {} }],
    },
    {
      label: 'a duplicate participant result',
      winnerPlayerId: 'rick',
      results: [
        { playerId: 'rick', placement: 1, data: {} },
        { playerId: 'rick', placement: 2, data: {} },
      ],
    },
    {
      label: 'a winner without first place',
      winnerPlayerId: 'rick',
      results: [
        { playerId: 'rick', placement: 2, data: {} },
        { playerId: 'jaie', placement: 1, data: {} },
      ],
    },
  ])('rejects $label without completing the game', async ({ winnerPlayerId, results }) => {
    const { database, sqlite } = createDatabase()
    addPlayers(sqlite)
    await startGame(database, {
      id: 'game-1',
      gameType: 'house-cricket',
      options: {},
      playerIds: ['rick', 'jaie'],
    })

    await expect(completeGame(database, {
      gameId: 'game-1',
      winnerPlayerId,
      results,
    })).rejects.toBeInstanceOf(InvalidGameResultsError)
    expect(sqlite.prepare('SELECT status FROM games WHERE id = ?').get('game-1'))
      .toEqual({ status: 'active' })
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM game_results').get())
      .toEqual({ count: 0 })
  })

  it('does not complete the same game twice', async () => {
    const { database, sqlite } = createDatabase()
    addPlayers(sqlite)
    await startGame(database, {
      id: 'game-1',
      gameType: 'house-cricket',
      options: {},
      playerIds: ['rick', 'jaie'],
    })
    const completion = {
      gameId: 'game-1',
      winnerPlayerId: 'rick',
      results: [
        { playerId: 'rick', placement: 1, data: {} },
        { playerId: 'jaie', placement: 2, data: {} },
      ],
    }

    await completeGame(database, completion)

    await expect(completeGame(database, completion))
      .rejects.toBeInstanceOf(GameAlreadyFinishedError)
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM game_results').get())
      .toEqual({ count: 2 })
  })

  it('abandons an active game without creating results', async () => {
    const { database, sqlite } = createDatabase()
    addPlayers(sqlite)
    await startGame(database, {
      id: 'game-1',
      gameType: 'house-cricket',
      options: {},
      playerIds: ['rick', 'jaie'],
    })

    await abandonGame(database, 'game-1')

    expect(sqlite.prepare('SELECT status, completed_at FROM games WHERE id = ?')
      .get('game-1')).toEqual({ status: 'abandoned', completed_at: null })
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM game_results').get())
      .toEqual({ count: 0 })
    await expect(abandonGame(database, 'game-1'))
      .rejects.toBeInstanceOf(GameAlreadyFinishedError)
  })
})
