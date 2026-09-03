// @vitest-environment node

import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { handleListGames, handleStartGame } from '../functions/api/dartsync/games'
import { handleCompleteGame } from '../functions/api/dartsync/games/[id]/complete'
import { handleAbandonGame } from '../functions/api/dartsync/games/[id]/abandon'
import type {
  GameDatabase,
  GameStatement,
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
    all: async <T>() => ({ results: sqlite.prepare(query).all(...values) as T[] }),
    first: async <T>() => (
      (sqlite.prepare(query).get(...values) as T | undefined) ?? null
    ),
    run: async <T>() => ({ results: sqlite.prepare(query).all(...values) as T[] }),
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
              results: sqlite.prepare(testStatement.query)
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

function seedPlayers(sqlite: DatabaseSync): void {
  sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('rick', 'Rick')
  sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('jaie', 'Jaie')
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validStartBody = {
  gameType: 'around-the-world',
  options: { multiplierAdvance: true },
  playerIds: ['rick', 'jaie'],
}

const validCompletionBody = {
  winnerPlayerId: 'rick',
  results: [
    { playerId: 'rick', placement: 1, data: { targetIndex: 20 } },
    { playerId: 'jaie', placement: 2, data: { targetIndex: 17 } },
  ],
}

describe('POST /api/dartsync/games', () => {
  it('starts a supported game and returns its database identity', async () => {
    const { database, sqlite } = createDatabase()
    seedPlayers(sqlite)

    const response = await handleStartGame(
      jsonRequest('/api/dartsync/games', validStartBody),
      database,
      () => 'game-1',
    )

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      game: {
        id: 'game-1',
        gameType: 'around-the-world',
        options: { multiplierAdvance: true },
        participants: [
          { playerId: 'rick', playerName: 'Rick', turnOrder: 0 },
          { playerId: 'jaie', playerName: 'Jaie', turnOrder: 1 },
        ],
      },
    })
  })

  it.each([
    { label: 'unsupported game', body: { ...validStartBody, gameType: 'cricket' } },
    { label: 'invalid House Rules options', body: {
      gameType: 'house-cricket',
      options: { multiplierAdvance: true },
      playerIds: ['rick', 'jaie'],
    } },
    { label: 'invalid Around the World options', body: {
      gameType: 'around-the-world',
      options: {},
      playerIds: ['rick', 'jaie'],
    } },
    { label: 'too few players', body: { ...validStartBody, playerIds: ['rick'] } },
  ])('rejects $label', async ({ body }) => {
    const { database, sqlite } = createDatabase()
    seedPlayers(sqlite)

    const response = await handleStartGame(
      jsonRequest('/api/dartsync/games', body),
      database,
    )

    expect(response.status).toBe(400)
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM games').get())
      .toEqual({ count: 0 })
  })

  it('rejects a player who is unavailable', async () => {
    const { database, sqlite } = createDatabase()
    seedPlayers(sqlite)

    const response = await handleStartGame(
      jsonRequest('/api/dartsync/games', {
        ...validStartBody,
        playerIds: ['rick', 'missing'],
      }),
      database,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'A game requires at least two distinct active players.',
    })
  })

  it('rejects non-JSON and oversized requests before reading the body', async () => {
    const { database } = createDatabase()
    const nonJsonResponse = await handleStartGame(
      new Request('http://localhost/api/dartsync/games', {
        method: 'POST',
        body: 'game=house-cricket',
      }),
      database,
    )
    const oversizedResponse = await handleStartGame(
      new Request('http://localhost/api/dartsync/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '32769',
        },
        body: '{}',
      }),
      database,
    )

    expect(nonJsonResponse.status).toBe(415)
    expect(oversizedResponse.status).toBe(413)
  })
})

describe('POST /api/dartsync/games/:id/complete', () => {
  it('completes an active game and stores bounded participant results', async () => {
    const { database, sqlite } = createDatabase()
    seedPlayers(sqlite)
    await handleStartGame(
      jsonRequest('/api/dartsync/games', validStartBody),
      database,
      () => 'game-1',
    )

    const response = await handleCompleteGame(
      jsonRequest('/api/dartsync/games/game-1/complete', validCompletionBody),
      database,
      'game-1',
    )

    expect(response.status).toBe(204)
    expect(sqlite.prepare('SELECT status FROM games WHERE id = ?').get('game-1'))
      .toEqual({ status: 'completed' })
    expect(sqlite.prepare(`
      SELECT player_id, is_winner, result_json
      FROM game_results
      ORDER BY placement ASC
    `).all()).toEqual([
      { player_id: 'rick', is_winner: 1, result_json: '{"targetIndex":20}' },
      { player_id: 'jaie', is_winner: 0, result_json: '{"targetIndex":17}' },
    ])
  })

  it.each([
    { label: 'missing winner', body: { results: validCompletionBody.results } },
    { label: 'invalid placement', body: {
      ...validCompletionBody,
      results: [
        { playerId: 'rick', placement: 0, data: {} },
        { playerId: 'jaie', placement: 2, data: {} },
      ],
    } },
    { label: 'missing result data', body: {
      ...validCompletionBody,
      results: [
        { playerId: 'rick', placement: 1 },
        { playerId: 'jaie', placement: 2, data: {} },
      ],
    } },
  ])('rejects $label', async ({ body }) => {
    const { database } = createDatabase()
    const response = await handleCompleteGame(
      jsonRequest('/api/dartsync/games/game-1/complete', body),
      database,
      'game-1',
    )

    expect(response.status).toBe(400)
  })

  it('returns not found for an unknown game', async () => {
    const { database } = createDatabase()

    const response = await handleCompleteGame(
      jsonRequest('/api/dartsync/games/missing/complete', validCompletionBody),
      database,
      'missing',
    )

    expect(response.status).toBe(404)
  })

  it('returns conflict when the game was already completed', async () => {
    const { database, sqlite } = createDatabase()
    seedPlayers(sqlite)
    await handleStartGame(
      jsonRequest('/api/dartsync/games', validStartBody),
      database,
      () => 'game-1',
    )
    await handleCompleteGame(
      jsonRequest('/api/dartsync/games/game-1/complete', validCompletionBody),
      database,
      'game-1',
    )

    const response = await handleCompleteGame(
      jsonRequest('/api/dartsync/games/game-1/complete', validCompletionBody),
      database,
      'game-1',
    )

    expect(response.status).toBe(409)
  })
})

describe('POST /api/dartsync/games/:id/abandon', () => {
  it('abandons an active game', async () => {
    const { database, sqlite } = createDatabase()
    seedPlayers(sqlite)
    await handleStartGame(
      jsonRequest('/api/dartsync/games', validStartBody),
      database,
      () => 'game-1',
    )

    const response = await handleAbandonGame(database, 'game-1')

    expect(response.status).toBe(204)
    expect(sqlite.prepare('SELECT status FROM games WHERE id = ?').get('game-1'))
      .toEqual({ status: 'abandoned' })
  })

  it('returns not found for an unknown game', async () => {
    const { database } = createDatabase()

    const response = await handleAbandonGame(database, 'missing')

    expect(response.status).toBe(404)
  })
})

describe('GET /api/dartsync/games', () => {
  it('returns completed game history without active or abandoned games', async () => {
    const { database, sqlite } = createDatabase()
    seedPlayers(sqlite)
    await handleStartGame(
      jsonRequest('/api/dartsync/games', validStartBody),
      database,
      () => 'game-1',
    )
    await handleCompleteGame(
      jsonRequest('/api/dartsync/games/game-1/complete', validCompletionBody),
      database,
      'game-1',
    )

    const response = await handleListGames(
      new Request('http://localhost/api/dartsync/games'),
      database,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      games: [{
        id: 'game-1',
        gameType: 'around-the-world',
        options: { multiplierAdvance: true },
        participants: [
          { playerId: 'rick', playerName: 'Rick', isWinner: true, placement: 1 },
          { playerId: 'jaie', playerName: 'Jaie', isWinner: false, placement: 2 },
        ],
      }],
      nextCursor: null,
    })
  })

  it('rejects an invalid history cursor', async () => {
    const { database } = createDatabase()

    const response = await handleListGames(
      new Request('http://localhost/api/dartsync/games?cursor=invalid'),
      database,
    )

    expect(response.status).toBe(400)
  })
})
