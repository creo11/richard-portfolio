import type { Player } from '../../../src/pages/DartSync/types/player'

type PlayerSummaryRow = {
  id: string
  name: string
  description: string | null
  wins: number
  games_played: number
  last_winner: number
}

export type PlayerDatabase = {
  prepare(query: string): PlayerStatement
}

type PlayerStatement = {
  bind(...values: unknown[]): PlayerStatement
  all<T>(): Promise<{ results: T[] }>
  first<T>(): Promise<T | null>
  run<T>(): Promise<{ results: T[] }>
}

const LIST_ACTIVE_PLAYERS_SQL = `
  WITH latest_completed_game AS (
    SELECT id
    FROM games
    WHERE status = 'completed'
    ORDER BY completed_at DESC, id DESC
    LIMIT 1
  )
  SELECT
    p.id,
    p.name,
    p.description,
    SUM(
      CASE
        WHEN g.status = 'completed'
          AND (p.stats_reset_at IS NULL OR g.completed_at >= p.stats_reset_at)
        THEN 1
        ELSE 0
      END
    ) AS games_played,
    SUM(
      CASE
        WHEN g.status = 'completed'
          AND r.is_winner = 1
          AND (p.stats_reset_at IS NULL OR g.completed_at >= p.stats_reset_at)
        THEN 1
        ELSE 0
      END
    ) AS wins,
    CASE WHEN EXISTS (
      SELECT 1
      FROM game_results AS latest_result
      WHERE latest_result.game_id = (SELECT id FROM latest_completed_game)
        AND latest_result.player_id = p.id
        AND latest_result.is_winner = 1
    ) THEN 1 ELSE 0 END AS last_winner
  FROM players AS p
  LEFT JOIN game_results AS r ON r.player_id = p.id
  LEFT JOIN games AS g ON g.id = r.game_id
  WHERE p.deleted_at IS NULL
  GROUP BY p.id, p.name, p.description, p.created_at
  ORDER BY p.created_at ASC, p.name COLLATE NOCASE ASC
`

export async function listPlayers(database: PlayerDatabase): Promise<Player[]> {
  const result = await database
    .prepare(LIST_ACTIVE_PLAYERS_SQL)
    .all<PlayerSummaryRow>()

  return result.results.map((row) => ({
    id: row.id,
    name: row.name,
    ...(row.description === null ? {} : { description: row.description }),
    wins: row.wins,
    gamesPlayed: row.games_played,
    lastWinner: row.last_winner === 1,
  }))
}

type NewPlayerRow = {
  id: string
  name: string
  description: string | null
}

export class DuplicatePlayerNameError extends Error {
  constructor() {
    super('An active player already uses that name.')
    this.name = 'DuplicatePlayerNameError'
  }
}

export class PlayerNotFoundError extends Error {
  constructor() {
    super('Player not found.')
    this.name = 'PlayerNotFoundError'
  }
}

export async function createPlayer(
  database: PlayerDatabase,
  input: { id: string; name: string; description: string | null },
): Promise<Player> {
  const existingPlayer = await database
    .prepare(`
      SELECT id
      FROM players
      WHERE deleted_at IS NULL
        AND lower(name) = lower(?1)
      LIMIT 1
    `)
    .bind(input.name)
    .first<{ id: string }>()

  if (existingPlayer !== null) {
    throw new DuplicatePlayerNameError()
  }

  try {
    const result = await database
      .prepare(`
        INSERT INTO players (id, name, description)
        VALUES (?1, ?2, ?3)
        RETURNING id, name, description
      `)
      .bind(input.id, input.name, input.description)
      .run<NewPlayerRow>()
    const row = result.results[0]

    if (!row) {
      throw new Error('Player insert returned no result.')
    }

    return {
      id: row.id,
      name: row.name,
      ...(row.description === null ? {} : { description: row.description }),
      wins: 0,
      gamesPlayed: 0,
      lastWinner: false,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new DuplicatePlayerNameError()
    }

    throw error
  }
}

export async function updatePlayer(
  database: PlayerDatabase,
  input: { id: string; name: string; description: string | null },
): Promise<Player> {
  const existingPlayer = await database
    .prepare(`
      SELECT id
      FROM players
      WHERE deleted_at IS NULL
        AND id != ?1
        AND lower(name) = lower(?2)
      LIMIT 1
    `)
    .bind(input.id, input.name)
    .first<{ id: string }>()

  if (existingPlayer !== null) {
    throw new DuplicatePlayerNameError()
  }

  try {
    const result = await database
      .prepare(`
        UPDATE players
        SET name = ?2,
            description = ?3,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?1
          AND deleted_at IS NULL
        RETURNING id
      `)
      .bind(input.id, input.name, input.description)
      .run<{ id: string }>()

    if (!result.results[0]) {
      throw new PlayerNotFoundError()
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new DuplicatePlayerNameError()
    }

    throw error
  }

  const player = (await listPlayers(database)).find(({ id }) => id === input.id)
  if (!player) {
    throw new PlayerNotFoundError()
  }

  return player
}

export async function resetPlayerStats(
  database: PlayerDatabase,
  playerId: string,
): Promise<Player> {
  const result = await database
    .prepare(`
      UPDATE players
      SET stats_reset_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?1
        AND deleted_at IS NULL
      RETURNING id
    `)
    .bind(playerId)
    .run<{ id: string }>()

  if (!result.results[0]) {
    throw new PlayerNotFoundError()
  }

  const player = (await listPlayers(database)).find(({ id }) => id === playerId)
  if (!player) {
    throw new PlayerNotFoundError()
  }

  return player
}

export async function softDeletePlayer(
  database: PlayerDatabase,
  playerId: string,
): Promise<void> {
  const result = await database
    .prepare(`
      UPDATE players
      SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?1
        AND deleted_at IS NULL
      RETURNING id
    `)
    .bind(playerId)
    .run<{ id: string }>()

  if (!result.results[0]) {
    throw new PlayerNotFoundError()
  }
}
