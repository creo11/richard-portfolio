type GameQueryResult<T = unknown> = {
  results: T[]
}

export type GameStatement = {
  bind(...values: unknown[]): GameStatement
  all<T>(): Promise<GameQueryResult<T>>
  first<T>(): Promise<T | null>
  run<T>(): Promise<GameQueryResult<T>>
}

export type GameDatabase = {
  prepare(query: string): GameStatement
  batch<T = unknown>(statements: GameStatement[]): Promise<GameQueryResult<T>[]>
}

export type GameParticipantSnapshot = {
  playerId: string
  playerName: string
  turnOrder: number
}

export type StartedGame = {
  id: string
  gameType: string
  options: Record<string, boolean>
  participants: GameParticipantSnapshot[]
}

export type PlayerGameResult = {
  playerId: string
  placement: number | null
  data: Record<string, unknown>
}

export class GameNotFoundError extends Error {
  constructor() {
    super('Game not found.')
    this.name = 'GameNotFoundError'
  }
}

export class GameAlreadyFinishedError extends Error {
  constructor() {
    super('Game is no longer active.')
    this.name = 'GameAlreadyFinishedError'
  }
}

export class InvalidGameParticipantsError extends Error {
  constructor() {
    super('A game requires at least two distinct active players.')
    this.name = 'InvalidGameParticipantsError'
  }
}

export class InvalidGameResultsError extends Error {
  constructor() {
    super('Game results must include every participant and exactly one winner.')
    this.name = 'InvalidGameResultsError'
  }
}

type ActivePlayerRow = {
  id: string
  name: string
}

type GameStatusRow = {
  status: 'active' | 'completed' | 'abandoned'
}

type ParticipantRow = {
  player_id: string
  player_name: string
  turn_order: number
}

function createPlaceholders(count: number): string {
  return Array.from({ length: count }, (_, index) => `?${index + 1}`).join(', ')
}

function hasDistinctValues(values: string[]): boolean {
  return new Set(values).size === values.length
}

export async function startGame(
  database: GameDatabase,
  input: {
    id: string
    gameType: string
    options: Record<string, boolean>
    playerIds: string[]
  },
): Promise<StartedGame> {
  if (input.playerIds.length < 2 || !hasDistinctValues(input.playerIds)) {
    throw new InvalidGameParticipantsError()
  }

  const playerResult = await database
    .prepare(`
      SELECT id, name
      FROM players
      WHERE deleted_at IS NULL
        AND id IN (${createPlaceholders(input.playerIds.length)})
    `)
    .bind(...input.playerIds)
    .all<ActivePlayerRow>()

  const playersById = new Map(playerResult.results.map((player) => [player.id, player]))
  if (playersById.size !== input.playerIds.length) {
    throw new InvalidGameParticipantsError()
  }

  const participants = input.playerIds.map((playerId, turnOrder) => {
    const player = playersById.get(playerId)
    if (!player) throw new InvalidGameParticipantsError()

    return {
      playerId,
      playerName: player.name,
      turnOrder,
    }
  })

  const statements = [
    database
      .prepare(`
        INSERT INTO games (id, game_type, status, options_json)
        VALUES (?1, ?2, 'active', ?3)
      `)
      .bind(input.id, input.gameType, JSON.stringify(input.options)),
    ...participants.map((participant) => database
      .prepare(`
        INSERT INTO game_players (game_id, player_id, player_name, turn_order)
        VALUES (?1, ?2, ?3, ?4)
      `)
      .bind(
        input.id,
        participant.playerId,
        participant.playerName,
        participant.turnOrder,
      )),
  ]

  await database.batch(statements)

  return {
    id: input.id,
    gameType: input.gameType,
    options: { ...input.options },
    participants,
  }
}

export async function completeGame(
  database: GameDatabase,
  input: {
    gameId: string
    winnerPlayerId: string
    results: PlayerGameResult[]
  },
): Promise<void> {
  const game = await database
    .prepare('SELECT status FROM games WHERE id = ?1')
    .bind(input.gameId)
    .first<GameStatusRow>()

  if (!game) throw new GameNotFoundError()
  if (game.status !== 'active') throw new GameAlreadyFinishedError()

  const participantResult = await database
    .prepare(`
      SELECT player_id, player_name, turn_order
      FROM game_players
      WHERE game_id = ?1
      ORDER BY turn_order ASC
    `)
    .bind(input.gameId)
    .all<ParticipantRow>()

  const participants = participantResult.results
  const participantIds = participants.map((participant) => participant.player_id)
  const resultIds = input.results.map((result) => result.playerId)
  const hasEveryParticipant = participantIds.length === resultIds.length
    && hasDistinctValues(resultIds)
    && resultIds.every((playerId) => participantIds.includes(playerId))
  const winnerResult = input.results.find(
    (result) => result.playerId === input.winnerPlayerId,
  )

  if (
    participants.length < 2
    || !hasEveryParticipant
    || !winnerResult
    || winnerResult.placement !== 1
  ) {
    throw new InvalidGameResultsError()
  }

  const participantsById = new Map(
    participants.map((participant) => [participant.player_id, participant]),
  )
  const statements = [
    database
      .prepare(`
        UPDATE games
        SET status = 'completed',
            completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?1
          AND status = 'active'
      `)
      .bind(input.gameId),
    ...input.results.map((result) => {
      const participant = participantsById.get(result.playerId)
      if (!participant) throw new InvalidGameResultsError()

      return database
        .prepare(`
          INSERT INTO game_results (
            game_id,
            player_id,
            player_name,
            is_winner,
            placement,
            result_json
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        `)
        .bind(
          input.gameId,
          result.playerId,
          participant.player_name,
          result.playerId === input.winnerPlayerId ? 1 : 0,
          result.placement,
          JSON.stringify(result.data),
        )
    }),
  ]

  await database.batch(statements)
}

export async function abandonGame(
  database: GameDatabase,
  gameId: string,
): Promise<void> {
  const result = await database
    .prepare(`
      UPDATE games
      SET status = 'abandoned'
      WHERE id = ?1
        AND status = 'active'
      RETURNING id
    `)
    .bind(gameId)
    .run<{ id: string }>()

  if (result.results[0]) return

  const game = await database
    .prepare('SELECT status FROM games WHERE id = ?1')
    .bind(gameId)
    .first<GameStatusRow>()

  if (!game) throw new GameNotFoundError()
  throw new GameAlreadyFinishedError()
}
