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

export type HeadToHeadStatistics = {
  playerId: string
  playerName: string
  opponentId: string
  opponentName: string
  gamesPlayed: number
  wins: number
  losses: number
  otherWinnerResults: number
  winPercentage: number
  byGameType: HeadToHeadGameTypeStatistics[]
}

export type HeadToHeadGameTypeStatistics = {
  gameType: string
  gamesPlayed: number
  wins: number
  losses: number
  otherWinnerResults: number
  winPercentage: number
}

type PlayerStatisticsRow = {
  player_id: string
  player_name: string
  game_type: string | null
  games_played: number
  wins: number
}

type HeadToHeadStatisticsRow = {
  player_id: string
  player_name: string
  opponent_id: string
  opponent_name: string
  game_type: string
  games_played: number
  wins: number
  losses: number
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

export async function listHeadToHeadStatistics(
  database: PlayerDatabase,
): Promise<HeadToHeadStatistics[]> {
  const result = await database.prepare(`
    SELECT
      subject.id AS player_id,
      subject.name AS player_name,
      opponent.id AS opponent_id,
      opponent.name AS opponent_name,
      games.game_type,
      COUNT(games.id) AS games_played,
      SUM(CASE WHEN subject_result.is_winner = 1 THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN opponent_result.is_winner = 1 THEN 1 ELSE 0 END) AS losses
    FROM players AS subject
    INNER JOIN game_results AS subject_result
      ON subject_result.player_id = subject.id
    INNER JOIN games
      ON games.id = subject_result.game_id
      AND games.status = 'completed'
      AND (
        subject.stats_reset_at IS NULL
        OR games.completed_at >= subject.stats_reset_at
      )
    INNER JOIN game_results AS opponent_result
      ON opponent_result.game_id = games.id
      AND opponent_result.player_id != subject.id
    INNER JOIN players AS opponent
      ON opponent.id = opponent_result.player_id
    WHERE subject.deleted_at IS NULL
    GROUP BY subject.id, subject.name, subject.created_at, opponent.id, opponent.name,
      games.game_type
    ORDER BY subject.created_at ASC, subject.name COLLATE NOCASE ASC,
      games_played DESC, opponent.name COLLATE NOCASE ASC, games.game_type ASC
  `).all<HeadToHeadStatisticsRow>()

  const matchups = new Map<string, HeadToHeadStatistics>()

  result.results.forEach((row) => {
    const key = `${row.player_id}:${row.opponent_id}`
    let matchup = matchups.get(key)
    if (!matchup) {
      matchup = {
        playerId: row.player_id,
        playerName: row.player_name,
        opponentId: row.opponent_id,
        opponentName: row.opponent_name,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        otherWinnerResults: 0,
        winPercentage: 0,
        byGameType: [],
      }
      matchups.set(key, matchup)
    }

    const otherWinnerResults = row.games_played - row.wins - row.losses
    matchup.gamesPlayed += row.games_played
    matchup.wins += row.wins
    matchup.losses += row.losses
    matchup.otherWinnerResults += otherWinnerResults
    matchup.byGameType.push({
      gameType: row.game_type,
      gamesPlayed: row.games_played,
      wins: row.wins,
      losses: row.losses,
      otherWinnerResults,
      winPercentage: percentage(row.wins, row.games_played),
    })
  })

  matchups.forEach((matchup) => {
    matchup.winPercentage = percentage(matchup.wins, matchup.gamesPlayed)
  })

  return [...matchups.values()]
}
