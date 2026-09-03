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

function isStartedGame(value: unknown): value is StartedGame {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).id === 'string'
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
