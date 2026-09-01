CREATE UNIQUE INDEX idx_players_unique_active_name
    ON players(lower(name))
    WHERE deleted_at IS NULL;
