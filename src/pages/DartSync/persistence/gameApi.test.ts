import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  abandonPersistedGame,
  completePersistedGame,
  loadPersistedGameHistory,
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

  it('loads protected completed game history', async () => {
    const games = [{
      id: 'game-1',
      gameType: 'around-the-world',
      options: { multiplierAdvance: true },
      startedAt: '2026-09-02T01:00:00.000Z',
      completedAt: '2026-09-02T01:05:00.000Z',
      participants: [
        {
          playerId: 'rick',
          playerName: 'Rick',
          turnOrder: 0,
          isWinner: true,
          placement: 1,
          data: { targetIndex: 20 },
        },
        {
          playerId: 'jaie',
          playerName: 'Jaie',
          turnOrder: 1,
          isWinner: false,
          placement: null,
          data: { targetIndex: 12 },
        },
      ],
    }]
    vi.mocked(fetch).mockResolvedValue(Response.json({ games, nextCursor: '20' }))

    await expect(loadPersistedGameHistory('history-token')).resolves.toEqual({
      games,
      nextCursor: '20',
    })
    expect(fetch).toHaveBeenCalledWith('/api/dartsync/games', {
      headers: {
        Accept: 'application/json',
        'X-Turnstile-Token': 'history-token',
      },
      signal: undefined,
    })
  })

  it('surfaces an API error when game history cannot load', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: 'History is temporarily unavailable.' },
      { status: 503 },
    ))

    await expect(loadPersistedGameHistory('history-token'))
      .rejects.toThrow('History is temporarily unavailable.')
  })

  it('loads the next history page using its cursor', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ games: [], nextCursor: null }))

    await expect(loadPersistedGameHistory('history-token', undefined, '20'))
      .resolves.toEqual({ games: [], nextCursor: null })
    expect(fetch).toHaveBeenCalledWith('/api/dartsync/games?cursor=20', {
      headers: {
        Accept: 'application/json',
        'X-Turnstile-Token': 'history-token',
      },
      signal: undefined,
    })
  })

  it('requests history for one player while preserving pagination', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ games: [], nextCursor: null }))

    await expect(loadPersistedGameHistory('history-token', undefined, '20', 'rick'))
      .resolves.toEqual({ games: [], nextCursor: null })
    expect(fetch).toHaveBeenCalledWith('/api/dartsync/games?cursor=20&playerId=rick', {
      headers: {
        Accept: 'application/json',
        'X-Turnstile-Token': 'history-token',
      },
      signal: undefined,
    })
  })

  it('rejects malformed game history responses', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({
      games: [{
        id: 'game-1',
        gameType: 'house-cricket',
        options: {},
        startedAt: '2026-09-02T01:00:00.000Z',
        completedAt: '2026-09-02T01:05:00.000Z',
        participants: [{ playerId: 'rick', isWinner: true }],
      }],
      nextCursor: null,
    }))

    await expect(loadPersistedGameHistory('history-token'))
      .rejects.toThrow('invalid game history response')
  })
})
