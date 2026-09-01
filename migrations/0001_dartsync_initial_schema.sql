PRAGMA foreign_keys = ON;

CREATE TABLE players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
    description TEXT,
    stats_reset_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE games (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL CHECK (length(trim(game_type)) > 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')),
    options_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(options_json)),
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    completed_at TEXT,
    CHECK (
        (status = 'completed' AND completed_at IS NOT NULL)
        OR (status != 'completed' AND completed_at IS NULL)
    )
);

CREATE TABLE game_players (
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL CHECK (length(trim(player_name)) > 0),
    turn_order INTEGER NOT NULL CHECK (turn_order >= 0),
    PRIMARY KEY (game_id, player_id),
    UNIQUE (game_id, turn_order),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE game_results (
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL CHECK (length(trim(player_name)) > 0),
    is_winner INTEGER NOT NULL DEFAULT 0 CHECK (is_winner IN (0, 1)),
    placement INTEGER CHECK (placement IS NULL OR placement > 0),
    result_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(result_json)),
    PRIMARY KEY (game_id, player_id),
    FOREIGN KEY (game_id, player_id)
        REFERENCES game_players(game_id, player_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_players_active_name
    ON players(name)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_games_status_completed_at
    ON games(status, completed_at DESC);

CREATE INDEX idx_game_players_player_id
    ON game_players(player_id);

CREATE INDEX idx_game_results_player_wins
    ON game_results(player_id, is_winner, game_id);
