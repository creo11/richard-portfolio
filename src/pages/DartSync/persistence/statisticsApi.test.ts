import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPlayerStatistics } from './statisticsApi'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('DartSync statistics API client', () => {
  it('loads protected player statistics', async () => {
    const players = [{
      playerId: 'rick',
      playerName: 'Rick',
      gamesPlayed: 4,
      wins: 3,
      losses: 1,
      winPercentage: 75,
      byGameType: [{
        gameType: 'around-the-world',
        gamesPlayed: 2,
        wins: 1,
        losses: 1,
        winPercentage: 50,
      }],
    }]
    vi.mocked(fetch).mockResolvedValue(Response.json({ players }))

    await expect(loadPlayerStatistics('statistics-token')).resolves.toEqual(players)
    expect(fetch).toHaveBeenCalledWith('/api/dartsync/statistics', {
      headers: {
        Accept: 'application/json',
        'X-Turnstile-Token': 'statistics-token',
      },
      signal: undefined,
    })
  })

  it('surfaces the API error when statistics cannot load', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: 'Statistics are temporarily unavailable.' },
      { status: 503 },
    ))

    await expect(loadPlayerStatistics('statistics-token'))
      .rejects.toThrow('Statistics are temporarily unavailable.')
  })

  it.each([
    {
      label: 'inconsistent totals',
      player: {
        playerId: 'rick', playerName: 'Rick', gamesPlayed: 2,
        wins: 2, losses: 1, winPercentage: 100, byGameType: [],
      },
    },
    {
      label: 'an invalid win percentage',
      player: {
        playerId: 'rick', playerName: 'Rick', gamesPlayed: 1,
        wins: 1, losses: 0, winPercentage: 101, byGameType: [],
      },
    },
    {
      label: 'a malformed game breakdown',
      player: {
        playerId: 'rick', playerName: 'Rick', gamesPlayed: 1,
        wins: 1, losses: 0, winPercentage: 100,
        byGameType: [{ gameType: 'house-cricket', gamesPlayed: 1 }],
      },
    },
  ])('rejects $label', async ({ player }) => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ players: [player] }))

    await expect(loadPlayerStatistics('statistics-token'))
      .rejects.toThrow('invalid player statistics response')
  })
})
