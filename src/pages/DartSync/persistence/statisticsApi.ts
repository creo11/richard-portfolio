const STATISTICS_ENDPOINT = '/api/dartsync/statistics'
const TURNSTILE_TOKEN_HEADER = 'X-Turnstile-Token'

export type GameTypeStatistics = {
  gameType: string
  gamesPlayed: number
  wins: number
  losses: number
  winPercentage: number
}

export type PlayerStatistics = {
  playerId: string
  playerName: string
  gamesPlayed: number
  wins: number
  losses: number
  winPercentage: number
  byGameType: GameTypeStatistics[]
}

type ErrorResponse = {
  error?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function isPercentage(value: unknown): value is number {
  return isNonNegativeInteger(value) && value <= 100
}

function hasValidTotals(value: Record<string, unknown>): boolean {
  return isNonNegativeInteger(value.gamesPlayed)
    && isNonNegativeInteger(value.wins)
    && isNonNegativeInteger(value.losses)
    && value.wins + value.losses === value.gamesPlayed
    && isPercentage(value.winPercentage)
}

function isGameTypeStatistics(value: unknown): value is GameTypeStatistics {
  return isRecord(value)
    && typeof value.gameType === 'string'
    && hasValidTotals(value)
}

function isPlayerStatistics(value: unknown): value is PlayerStatistics {
  return isRecord(value)
    && typeof value.playerId === 'string'
    && typeof value.playerName === 'string'
    && hasValidTotals(value)
    && Array.isArray(value.byGameType)
    && value.byGameType.every(isGameTypeStatistics)
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as ErrorResponse
    if (typeof body.error === 'string') return body.error
  } catch {
    // Use the stable fallback when the response is not JSON.
  }

  return 'DartSync could not load player statistics.'
}

export async function loadPlayerStatistics(
  turnstileToken: string,
  signal?: AbortSignal,
): Promise<PlayerStatistics[]> {
  const response = await fetch(STATISTICS_ENDPOINT, {
    headers: {
      Accept: 'application/json',
      [TURNSTILE_TOKEN_HEADER]: turnstileToken,
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  const body = await response.json() as { players?: unknown }
  if (!Array.isArray(body.players) || !body.players.every(isPlayerStatistics)) {
    throw new Error('DartSync received an invalid player statistics response.')
  }

  return body.players
}
