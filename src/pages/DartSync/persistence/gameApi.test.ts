import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  abandonPersistedGame,
  completePersistedGame,
  startPersistedGame,
} from './gameApi'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('DartSync game API client', () => {
  it('starts a persisted game with its ordered players and Turnstile token', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({
      game: {
        id: 'game-1',
        gameType: 'around-the-world',
        options: { multiplierAdvance: true },
        participants: [],
      },
    }, { status: 201 }))

    await expect(startPersistedGame(
      'around-the-world',
      { multiplierAdvance: true },
      ['rick', 'jaie'],
      'game-start-token',
    )).resolves.toEqual({
      id: 'game-1',
      gameType: 'around-the-world',
      options: { multiplierAdvance: true },
      participants: [],
    })
    expect(fetch).toHaveBeenCalledWith('/api/dartsync/games', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Turnstile-Token': 'game-start-token',
      },
      body: JSON.stringify({
        gameType: 'around-the-world',
        options: { multiplierAdvance: true },
        playerIds: ['rick', 'jaie'],
      }),
    })
  })

  it('surfaces the API error when game creation fails', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: 'A selected player is no longer available.' },
      { status: 400 },
    ))

    await expect(startPersistedGame(
      'house-cricket',
      {},
      ['rick', 'missing'],
      'game-start-token',
    )).rejects.toThrow('A selected player is no longer available.')
  })

  it('rejects a malformed successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ game: { status: 'active' } }))

    await expect(startPersistedGame(
      'house-cricket',
      {},
      ['rick', 'jaie'],
      'game-start-token',
    )).rejects.toThrow('invalid game response')
  })

  it('completes a persisted game with its final result', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    const results = [
      { playerId: 'rick', placement: 1, data: { showdownBulls: 2 } },
      { playerId: 'jaie', placement: null, data: { showdownBulls: 1 } },
    ]

    await expect(completePersistedGame(
      'game/1',
      'rick',
      results,
      'complete-token',
    )).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith('/api/dartsync/games/game%2F1/complete', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Turnstile-Token': 'complete-token',
      },
      body: JSON.stringify({ winnerPlayerId: 'rick', results }),
    })
  })

  it('abandons a persisted game through its action endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    await expect(abandonPersistedGame('game-1', 'abandon-token'))
      .resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith('/api/dartsync/games/game-1/abandon', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-Turnstile-Token': 'abandon-token',
      },
    })
  })
})
