import type { PlayerGameResult } from './gameRepository'

export const MAX_GAME_REQUEST_BYTES = 32_768

export type StartGameInput = {
  gameType: 'house-cricket' | 'around-the-world'
  options: Record<string, boolean>
  playerIds: string[]
}

export type CompleteGameInput = {
  winnerPlayerId: string
  results: PlayerGameResult[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
}

function validateOptions(
  gameType: StartGameInput['gameType'],
  value: unknown,
): Record<string, boolean> | null {
  if (!isRecord(value)) return null

  if (gameType === 'house-cricket') {
    return Object.keys(value).length === 0 ? {} : null
  }

  return Object.keys(value).length === 1
    && typeof value.multiplierAdvance === 'boolean'
    ? { multiplierAdvance: value.multiplierAdvance }
    : null
}

export function validateStartGame(value: unknown): StartGameInput | null {
  if (!isRecord(value)) return null
  if (value.gameType !== 'house-cricket' && value.gameType !== 'around-the-world') {
    return null
  }
  if (
    !Array.isArray(value.playerIds)
    || value.playerIds.length < 2
    || !value.playerIds.every(isIdentifier)
  ) {
    return null
  }

  const options = validateOptions(value.gameType, value.options)
  if (!options) return null

  return {
    gameType: value.gameType,
    options,
    playerIds: [...value.playerIds],
  }
}

export function validateCompleteGame(value: unknown): CompleteGameInput | null {
  if (!isRecord(value) || !isIdentifier(value.winnerPlayerId)) return null
  if (!Array.isArray(value.results) || value.results.length < 2) return null

  const results: PlayerGameResult[] = []
  for (const candidate of value.results) {
    if (!isRecord(candidate) || !isIdentifier(candidate.playerId)) return null
    if (
      candidate.placement !== null
      && (!Number.isInteger(candidate.placement) || Number(candidate.placement) < 1)
    ) {
      return null
    }
    if (!isRecord(candidate.data)) return null

    results.push({
      playerId: candidate.playerId,
      placement: candidate.placement as number | null,
      data: candidate.data,
    })
  }

  return {
    winnerPlayerId: value.winnerPlayerId,
    results,
  }
}
