import type { Player } from '../types/player'

const PLAYERS_ENDPOINT = '/api/dartsync/players'
const TURNSTILE_TOKEN_HEADER = 'X-Turnstile-Token'

type ErrorResponse = {
  error?: unknown
}

function isPlayer(value: unknown): value is Player {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const player = value as Record<string, unknown>

  return typeof player.id === 'string'
    && typeof player.name === 'string'
    && (player.description === undefined || typeof player.description === 'string')
    && typeof player.wins === 'number'
    && typeof player.gamesPlayed === 'number'
    && (player.lastWinner === undefined || typeof player.lastWinner === 'boolean')
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as ErrorResponse
    if (typeof body.error === 'string') return body.error
  } catch {
    // Use the stable fallback message below when the response is not JSON.
  }

  return 'DartSync could not save the player.'
}

export async function loadPlayers(signal?: AbortSignal): Promise<Player[]> {
  const response = await fetch(PLAYERS_ENDPOINT, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error('DartSync could not load saved players.')
  }

  const body = await response.json() as { players?: unknown }
  if (!Array.isArray(body.players) || !body.players.every(isPlayer)) {
    throw new Error('DartSync received an invalid player response.')
  }

  return body.players
}

export async function createPlayer(
  name: string,
  description: string | undefined,
  turnstileToken: string,
): Promise<Player> {
  const response = await fetch(PLAYERS_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [TURNSTILE_TOKEN_HEADER]: turnstileToken,
    },
    body: JSON.stringify({ name, description }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  const body = await response.json() as { player?: unknown }
  if (!isPlayer(body.player)) {
    throw new Error('DartSync received an invalid player response.')
  }

  return body.player
}

export async function updatePlayer(
  playerId: string,
  name: string,
  description: string | undefined,
  turnstileToken: string,
): Promise<Player> {
  const response = await fetch(`${PLAYERS_ENDPOINT}/${encodeURIComponent(playerId)}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [TURNSTILE_TOKEN_HEADER]: turnstileToken,
    },
    body: JSON.stringify({ name, description }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  const body = await response.json() as { player?: unknown }
  if (!isPlayer(body.player)) {
    throw new Error('DartSync received an invalid player response.')
  }

  return body.player
}

export async function resetPlayerStats(
  playerId: string,
  turnstileToken: string,
): Promise<Player> {
  const response = await fetch(
    `${PLAYERS_ENDPOINT}/${encodeURIComponent(playerId)}/reset-stats`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        [TURNSTILE_TOKEN_HEADER]: turnstileToken,
      },
    },
  )

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  const body = await response.json() as { player?: unknown }
  if (!isPlayer(body.player)) {
    throw new Error('DartSync received an invalid player response.')
  }

  return body.player
}

export async function deletePlayer(
  playerId: string,
  turnstileToken: string,
): Promise<void> {
  const response = await fetch(`${PLAYERS_ENDPOINT}/${encodeURIComponent(playerId)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      [TURNSTILE_TOKEN_HEADER]: turnstileToken,
    },
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
}
