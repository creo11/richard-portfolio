export type PersistedGameStatus = "active" | "completed" | "abandoned";

export type PlayerRow = {
  id: string;
  name: string;
  description: string | null;
  stats_reset_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GameRow = {
  id: string;
  game_type: string;
  status: PersistedGameStatus;
  options_json: string;
  started_at: string;
  completed_at: string | null;
};

export type GamePlayerRow = {
  game_id: string;
  player_id: string;
  player_name: string;
  turn_order: number;
};

export type GameResultRow = {
  game_id: string;
  player_id: string;
  player_name: string;
  is_winner: 0 | 1;
  placement: number | null;
  result_json: string;
};
