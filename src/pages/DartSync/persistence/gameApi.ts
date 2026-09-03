import type { GameSetupOptions } from '../games/types'

const GAMES_ENDPOINT = '/api/dartsync/games'
const TURNSTILE_TOKEN_HEADER = 'X-Turnstile-Token'

type StartedGame = {
  id: string
}

type ErrorResponse = {
  error?: unknown
}

export type PersistedPlayerGameResult = {
  playerId: string
  placement: number | null
  data: Record<string, unknown>
}

export type PersistedGameHistoryParticipant = {
  playerId: string
  playerName: string
  turnOrder: number
  isWinner: boolean
  placement: number | null
  data: Record<string, unknown>
}

export type PersistedGameHistoryItem = {
  id: string
  gameType: string
  options: GameSetupOptions
  startedAt: string
  completedAt: string
  participants: PersistedGameHistoryParticipant[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStartedGame(value: unknown): value is StartedGame {
  return isRecord(value) && typeof value.id === 'string'
}

function isGameSetupOptions(value: unknown): value is GameSetupOptions {
  return isRecord(value) && Object.values(value).every(
    (option) => typeof option === 'boolean',
  )
}

function isHistoryParticipant(value: unknown): value is PersistedGameHistoryParticipant {
  if (!isRecord(value)) return false

  return typeof value.playerId === 'string'
    && typeof value.playerName === 'string'
    && Number.isInteger(value.turnOrder)
    && (value.turnOrder as number) >= 0
    && typeof value.isWinner === 'boolean'
    && (value.placement === null
      || (Number.isInteger(value.placement) && (value.placement as number) > 0))
    && isRecord(value.data)
}

function isHistoryItem(value: unknown): value is PersistedGameHistoryItem {
  if (!isRecord(value)) return false

  return typeof value.id === 'string'
    && typeof value.gameType === 'string'
    && isGameSetupOptions(value.options)
    && typeof value.startedAt === 'string'
    && typeof value.completedAt === 'string'
    && Array.isArray(value.participants)
    && value.participants.every(isHistoryParticipant)
}

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = await response.json() as ErrorResponse
    if (typeof body.error === 'string') return body.error
  } catch {
    // Use the stable fallback when the response is not JSON.
  }

  return fallback
}

export async function startPersistedGame(
  gameType: string,
  options: GameSetupOptions,
  playerIds: string[],
  turnstileToken: string,
): Promise<StartedGame> {
  const response = await fetch(GAMES_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [TURNSTILE_TOKEN_HEADER]: turnstileToken,
    },
    body: JSON.stringify({ gameType, options, playerIds }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'DartSync could not start the game.'))
  }

  const body = await response.json() as { game?: unknown }
  if (!isStartedGame(body.game)) {
    throw new Error('DartSync received an invalid game response.')
  }

  return body.game
}

export async function completePersistedGame(
  gameId: string,
  winnerPlayerId: string,
  results: PersistedPlayerGameResult[],
  turnstileToken: string,
): Promise<void> {
  const response = await fetch(
    `${GAMES_ENDPOINT}/${encodeURIComponent(gameId)}/complete`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        [TURNSTILE_TOKEN_HEADER]: turnstileToken,
      },
      body: JSON.stringify({ winnerPlayerId, results }),
    },
  )

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'DartSync could not save the game result.'))
  }
}

export async function abandonPersistedGame(
  gameId: string,
  turnstileToken: string,
): Promise<void> {
  const response = await fetch(
    `${GAMES_ENDPOINT}/${encodeURIComponent(gameId)}/abandon`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        [TURNSTILE_TOKEN_HEADER]: turnstileToken,
      },
    },
  )

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'DartSync could not end the game.'))
  }
}

export async function loadPersistedGameHistory(
  turnstileToken: string,
  signal?: AbortSignal,
): Promise<PersistedGameHistoryItem[]> {
  const response = await fetch(GAMES_ENDPOINT, {
    headers: {
      Accept: 'application/json',
      [TURNSTILE_TOKEN_HEADER]: turnstileToken,
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'DartSync could not load game history.'))
  }

  const body = await response.json() as { games?: unknown }
  if (!Array.isArray(body.games) || !body.games.every(isHistoryItem)) {
    throw new Error('DartSync received an invalid game history response.')
  }

  return body.games
}
