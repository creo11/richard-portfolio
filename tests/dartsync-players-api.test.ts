// @vitest-environment node

import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  handleCreatePlayer,
  handleListPlayers,
} from '../functions/api/dartsync/players'
import {
  handleDeletePlayer,
  handleUpdatePlayer,
} from '../functions/api/dartsync/players/[id]'
import { handleResetPlayerStats } from '../functions/api/dartsync/players/[id]/reset-stats'
import type { PlayerDatabase } from '../functions/lib/dartsync/playerRepository'

const migrationPath = fileURLToPath(
  new URL('../migrations/0001_dartsync_initial_schema.sql', import.meta.url),
)
const uniquePlayerNamesMigrationPath = fileURLToPath(
  new URL('../migrations/0002_unique_active_player_names.sql', import.meta.url),
)

function createDatabase(): { sqlite: DatabaseSync; database: PlayerDatabase } {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(migrationPath, 'utf8'))
  sqlite.exec(readFileSync(uniquePlayerNamesMigrationPath, 'utf8'))

  return {
    sqlite,
    database: {
      prepare: (query) => {
        const createStatement = (values: unknown[] = []) => ({
          bind: (...nextValues: unknown[]) => createStatement(nextValues),
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

        return createStatement()
      },
    },
  }
}

describe('GET /api/dartsync/players', () => {
  it('returns active players with statistics derived from completed games', async () => {
    const { database, sqlite } = createDatabase()

    sqlite.prepare(`
        INSERT INTO players (id, name, description, stats_reset_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('rick', 'Rick', 'The host', '2026-08-02T00:00:00.000Z', '2026-08-01T00:00:00.000Z')
    sqlite.prepare(`
        INSERT INTO players (id, name, created_at)
        VALUES (?, ?, ?)
      `).run('jaie', 'Jaie', '2026-08-01T00:01:00.000Z')
    sqlite.prepare(`
        INSERT INTO players (id, name, deleted_at, created_at)
        VALUES (?, ?, ?, ?)
      `).run('enrique', 'Enrique', '2026-08-04T00:00:00.000Z', '2026-08-01T00:02:00.000Z')
    sqlite.prepare(`
        INSERT INTO games (id, game_type, status, completed_at)
        VALUES (?, ?, 'completed', ?)
      `).run('old-game', 'house-rules-cricket', '2026-08-01T12:00:00.000Z')
    sqlite.prepare(`
        INSERT INTO games (id, game_type, status, completed_at)
        VALUES (?, ?, 'completed', ?)
      `).run('latest-game', 'around-the-world', '2026-08-03T12:00:00.000Z')

    sqlite.prepare(`
        INSERT INTO game_players (game_id, player_id, player_name, turn_order)
        VALUES (?, ?, ?, ?)
      `).run('old-game', 'rick', 'Rick', 0)
    sqlite.prepare(`
        INSERT INTO game_players (game_id, player_id, player_name, turn_order)
        VALUES (?, ?, ?, ?)
      `).run('old-game', 'jaie', 'Jaie', 1)
    sqlite.prepare(`
        INSERT INTO game_players (game_id, player_id, player_name, turn_order)
        VALUES (?, ?, ?, ?)
      `).run('latest-game', 'rick', 'Rick', 0)
    sqlite.prepare(`
        INSERT INTO game_players (game_id, player_id, player_name, turn_order)
        VALUES (?, ?, ?, ?)
      `).run('latest-game', 'jaie', 'Jaie', 1)

    sqlite.prepare(`
        INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement)
        VALUES (?, ?, ?, ?, ?)
      `).run('old-game', 'rick', 'Rick', 1, 1)
    sqlite.prepare(`
        INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement)
        VALUES (?, ?, ?, ?, ?)
      `).run('old-game', 'jaie', 'Jaie', 0, 2)
    sqlite.prepare(`
        INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement)
        VALUES (?, ?, ?, ?, ?)
      `).run('latest-game', 'rick', 'Rick', 0, 2)
    sqlite.prepare(`
        INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement)
        VALUES (?, ?, ?, ?, ?)
      `).run('latest-game', 'jaie', 'Jaie', 1, 1)

    const response = await handleListPlayers(database)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      players: [
        {
          id: 'rick',
          name: 'Rick',
          description: 'The host',
          wins: 0,
          gamesPlayed: 1,
          lastWinner: false,
        },
        {
          id: 'jaie',
          name: 'Jaie',
          wins: 1,
          gamesPlayed: 2,
          lastWinner: true,
        },
      ],
    })
  })

  it('returns an empty list when no players exist', async () => {
    const { database } = createDatabase()
    const response = await handleListPlayers(database)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ players: [] })
  })

  it('creates a normalized player', async () => {
    const { database } = createDatabase()
    const request = new Request('http://localhost/api/dartsync/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '  Shelly  ',
        description: '  Consistent on doubles  ',
      }),
    })

    const response = await handleCreatePlayer(
      request,
      database,
      () => 'player-shelly',
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      player: {
        id: 'player-shelly',
        name: 'Shelly',
        description: 'Consistent on doubles',
        wins: 0,
        gamesPlayed: 0,
        lastWinner: false,
      },
    })
  })

  it('rejects an active player name regardless of letter case', async () => {
    const { database, sqlite } = createDatabase()
    sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('rick', 'Rick')
    const request = new Request('http://localhost/api/dartsync/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'rick' }),
    })

    const response = await handleCreatePlayer(request, database)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'An active player already uses that name.',
    })
  })

  it.each([
    { label: 'missing name', body: {} },
    { label: 'blank name', body: { name: '   ' } },
    { label: 'long name', body: { name: 'a'.repeat(81) } },
    { label: 'non-string description', body: { name: 'Rick', description: 42 } },
    { label: 'long description', body: { name: 'Rick', description: 'a'.repeat(241) } },
  ])('rejects $label', async ({ body }) => {
    const { database } = createDatabase()
    const request = new Request('http://localhost/api/dartsync/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const response = await handleCreatePlayer(request, database)

    expect(response.status).toBe(400)
  })

  it('rejects requests that are not JSON', async () => {
    const { database } = createDatabase()
    const request = new Request('http://localhost/api/dartsync/players', {
      method: 'POST',
      body: 'name=Rick',
    })

    const response = await handleCreatePlayer(request, database)

    expect(response.status).toBe(415)
  })

  it('updates an active player while preserving statistics', async () => {
    const { database, sqlite } = createDatabase()
    sqlite.prepare(`
      INSERT INTO players (id, name, description)
      VALUES (?, ?, ?)
    `).run('rick', 'Rick', 'Aggressive closer')
    sqlite.prepare(`
      INSERT INTO games (id, game_type, status, completed_at)
      VALUES (?, ?, 'completed', ?)
    `).run('game-1', 'house-rules-cricket', '2026-08-31T12:00:00.000Z')
    sqlite.prepare(`
      INSERT INTO game_players (game_id, player_id, player_name, turn_order)
      VALUES (?, ?, ?, ?)
    `).run('game-1', 'rick', 'Rick', 0)
    sqlite.prepare(`
      INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement)
      VALUES (?, ?, ?, ?, ?)
    `).run('game-1', 'rick', 'Rick', 1, 1)
    const request = new Request('http://localhost/api/dartsync/players/rick', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rick James',
        description: 'Aggressive finisher',
      }),
    })

    const response = await handleUpdatePlayer(request, database, 'rick')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      player: {
        id: 'rick',
        name: 'Rick James',
        description: 'Aggressive finisher',
        wins: 1,
        gamesPlayed: 1,
        lastWinner: true,
      },
    })
  })

  it('rejects an update that duplicates another active player name', async () => {
    const { database, sqlite } = createDatabase()
    sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('rick', 'Rick')
    sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('jaie', 'Jaie')
    const request = new Request('http://localhost/api/dartsync/players/rick', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'jaie' }),
    })

    const response = await handleUpdatePlayer(request, database, 'rick')

    expect(response.status).toBe(409)
  })

  it('returns not found when updating a player who is not active', async () => {
    const { database } = createDatabase()
    const request = new Request('http://localhost/api/dartsync/players/missing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Missing' }),
    })

    const response = await handleUpdatePlayer(request, database, 'missing')

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Player not found.' })
  })

  it('resets derived statistics without deleting historical results', async () => {
    const { database, sqlite } = createDatabase()
    sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('rick', 'Rick')
    sqlite.prepare(`
      INSERT INTO games (id, game_type, status, completed_at)
      VALUES (?, ?, 'completed', ?)
    `).run('game-1', 'house-rules-cricket', '2026-08-01T12:00:00.000Z')
    sqlite.prepare(`
      INSERT INTO game_players (game_id, player_id, player_name, turn_order)
      VALUES (?, ?, ?, ?)
    `).run('game-1', 'rick', 'Rick', 0)
    sqlite.prepare(`
      INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement)
      VALUES (?, ?, ?, ?, ?)
    `).run('game-1', 'rick', 'Rick', 1, 1)

    const response = await handleResetPlayerStats(database, 'rick')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      player: {
        id: 'rick',
        name: 'Rick',
        wins: 0,
        gamesPlayed: 0,
        lastWinner: true,
      },
    })
    expect(sqlite.prepare(`
      SELECT player_name, is_winner
      FROM game_results
      WHERE game_id = ?
    `).get('game-1')).toMatchObject({ player_name: 'Rick', is_winner: 1 })
  })

  it('returns not found when resetting a player who is not active', async () => {
    const { database } = createDatabase()

    const response = await handleResetPlayerStats(database, 'missing')

    expect(response.status).toBe(404)
  })

  it('soft deletes a player while retaining historical participation and results', async () => {
    const { database, sqlite } = createDatabase()
    sqlite.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run('rick', 'Rick')
    sqlite.prepare(`
      INSERT INTO games (id, game_type, status, completed_at)
      VALUES (?, ?, 'completed', ?)
    `).run('game-1', 'house-rules-cricket', '2026-08-31T12:00:00.000Z')
    sqlite.prepare(`
      INSERT INTO game_players (game_id, player_id, player_name, turn_order)
      VALUES (?, ?, ?, ?)
    `).run('game-1', 'rick', 'Rick', 0)
    sqlite.prepare(`
      INSERT INTO game_results (game_id, player_id, player_name, is_winner, placement)
      VALUES (?, ?, ?, ?, ?)
    `).run('game-1', 'rick', 'Rick', 1, 1)

    const response = await handleDeletePlayer(database, 'rick')

    expect(response.status).toBe(204)
    expect(sqlite.prepare('SELECT deleted_at FROM players WHERE id = ?').get('rick'))
      .toMatchObject({ deleted_at: expect.any(String) })
    expect(sqlite.prepare(`
      SELECT player_name, is_winner
      FROM game_results
      WHERE game_id = ?
    `).get('game-1')).toMatchObject({ player_name: 'Rick', is_winner: 1 })

    const listResponse = await handleListPlayers(database)
    await expect(listResponse.json()).resolves.toEqual({ players: [] })
  })

  it('returns not found when deleting a player who is not active', async () => {
    const { database } = createDatabase()

    const response = await handleDeletePlayer(database, 'missing')

    expect(response.status).toBe(404)
  })
})
