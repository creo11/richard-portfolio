import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPlayer,
  deletePlayer,
  loadPlayers,
  resetPlayerStats,
  updatePlayer,
} from './playerApi'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('DartSync player API client', () => {
  it('loads persisted players', async () => {
    const players = [{
      id: 'player-rick',
      name: 'Rick',
      wins: 3,
      gamesPlayed: 5,
      lastWinner: true,
    }]
    vi.mocked(fetch).mockResolvedValue(Response.json({ players }))

    await expect(loadPlayers()).resolves.toEqual(players)
    expect(fetch).toHaveBeenCalledWith(
      '/api/dartsync/players',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('rejects a malformed player response', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ players: [{ name: 'Rick' }] }))

    await expect(loadPlayers()).rejects.toThrow('invalid player response')
  })

  it('returns the player confirmed by the create endpoint', async () => {
    const player = {
      id: 'player-jaie',
      name: 'Jaie',
      description: 'Bullseye specialist',
      wins: 0,
      gamesPlayed: 0,
      lastWinner: false,
    }
    vi.mocked(fetch).mockResolvedValue(Response.json({ player }, { status: 201 }))

    await expect(createPlayer('Jaie', 'Bullseye specialist', 'create-token')).resolves.toEqual(player)
    expect(fetch).toHaveBeenCalledWith(
      '/api/dartsync/players',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Turnstile-Token': 'create-token' }),
        body: JSON.stringify({
          name: 'Jaie',
          description: 'Bullseye specialist',
        }),
      }),
    )
  })

  it('surfaces the API error when creation fails', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: 'An active player already uses that name.' },
      { status: 409 },
    ))

    await expect(createPlayer('Rick', undefined, 'create-token')).rejects.toThrow(
      'An active player already uses that name.',
    )
  })

  it('updates a player through its encoded resource URL', async () => {
    const player = {
      id: 'player/rick',
      name: 'Rick James',
      wins: 3,
      gamesPlayed: 5,
      lastWinner: false,
    }
    vi.mocked(fetch).mockResolvedValue(Response.json({ player }))

    await expect(updatePlayer('player/rick', 'Rick James', undefined, 'update-token')).resolves.toEqual(player)
    expect(fetch).toHaveBeenCalledWith(
      '/api/dartsync/players/player%2Frick',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'X-Turnstile-Token': 'update-token' }),
        body: JSON.stringify({ name: 'Rick James', description: undefined }),
      }),
    )
  })

  it('resets statistics through the player action endpoint', async () => {
    const player = {
      id: 'player-rick',
      name: 'Rick',
      wins: 0,
      gamesPlayed: 0,
      lastWinner: false,
    }
    vi.mocked(fetch).mockResolvedValue(Response.json({ player }))

    await expect(resetPlayerStats('player-rick', 'reset-token')).resolves.toEqual(player)
    expect(fetch).toHaveBeenCalledWith(
      '/api/dartsync/players/player-rick/reset-stats',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-Turnstile-Token': 'reset-token',
        },
      },
    )
  })

  it('soft deletes a player through its resource endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deletePlayer('player-rick', 'delete-token')).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      '/api/dartsync/players/player-rick',
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-Turnstile-Token': 'delete-token',
        },
      },
    )
  })
})
