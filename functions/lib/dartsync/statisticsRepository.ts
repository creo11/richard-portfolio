import type { PlayerDatabase } from './playerRepository'

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

type PlayerStatisticsRow = {
  player_id: string
  player_name: string
  game_type: string | null
  games_played: number
  wins: number
}

function percentage(wins: number, gamesPlayed: number): number {
  return gamesPlayed === 0 ? 0 : Math.round((wins / gamesPlayed) * 100)
}

export async function listPlayerStatistics(
  database: PlayerDatabase,
): Promise<PlayerStatistics[]> {
  const result = await database.prepare(`
    SELECT
      players.id AS player_id,
      players.name AS player_name,
      games.game_type,
      COUNT(games.id) AS games_played,
      SUM(
        CASE
          WHEN games.id IS NOT NULL AND game_results.is_winner = 1 THEN 1
          ELSE 0
        END
      ) AS wins
    FROM players
    LEFT JOIN game_results ON game_results.player_id = players.id
    LEFT JOIN games
      ON games.id = game_results.game_id
      AND games.status = 'completed'
      AND (
        players.stats_reset_at IS NULL
        OR games.completed_at >= players.stats_reset_at
      )
    WHERE players.deleted_at IS NULL
    GROUP BY players.id, players.name, players.created_at, games.game_type
    ORDER BY players.created_at ASC, players.name COLLATE NOCASE ASC, games.game_type ASC
  `).all<PlayerStatisticsRow>()

  const players = new Map<string, PlayerStatistics>()

  result.results.forEach((row) => {
    let player = players.get(row.player_id)
    if (!player) {
      player = {
        playerId: row.player_id,
        playerName: row.player_name,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winPercentage: 0,
        byGameType: [],
      }
      players.set(row.player_id, player)
    }

    if (!row.game_type || row.games_played === 0) return

    const losses = row.games_played - row.wins
    player.gamesPlayed += row.games_played
    player.wins += row.wins
    player.losses += losses
    player.byGameType.push({
      gameType: row.game_type,
      gamesPlayed: row.games_played,
      wins: row.wins,
      losses,
      winPercentage: percentage(row.wins, row.games_played),
    })
  })

  players.forEach((player) => {
    player.winPercentage = percentage(player.wins, player.gamesPlayed)
  })

  return [...players.values()]
}
