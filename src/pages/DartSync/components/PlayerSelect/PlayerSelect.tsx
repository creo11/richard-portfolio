import { useMemo, useState } from "react";
import { MOCK_PLAYERS } from "../../data/mockPlayers";
import type { Player } from "../../types/player";
import "./PlayerSelect.less";

type PlayerSelectProps = {
  onBack: () => void;
  onStartGame: (players: Player[], randomize: boolean) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PlayerSelect({
  onBack,
  onStartGame,
}: PlayerSelectProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [randomizeOrder, setRandomizeOrder] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedPlayers = useMemo(
    () =>
      selectedPlayerIds
        .map((id) => MOCK_PLAYERS.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player)),
    [selectedPlayerIds]
  );

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) return MOCK_PLAYERS;

    return MOCK_PLAYERS.filter((player) =>
      [player.name, player.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery))
    );
  }, [searchQuery]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  return (
    <div className="player-select">
      <header className="player-select__header">
        <div className="player-select__topbar">
          <div className="player-select__brand">
            <span className="player-select__logo">
              <img src="/dartsync/favicon.svg" alt="" />
            </span>
            <span>DartSync</span>
          </div>

          <button className="player-select__back" type="button" onClick={onBack}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M16 10H5M9 6l-4 4 4 4" />
            </svg>
            Back to games
          </button>
        </div>

        <div className="player-select__intro">
          <span className="player-select__eyebrow">Game setup</span>
          <h1>Select players</h1>
          <p>Choose at least two players for Rick's House Rules Cricket.</p>
        </div>
      </header>

      <div className="player-select__search">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13 13 3.5 3.5" />
        </svg>

        <input
          type="search"
          value={searchQuery}
          placeholder="Search players"
          aria-label="Search players"
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        {searchQuery && (
          <button
            type="button"
            aria-label="Clear player search"
            onClick={() => setSearchQuery("")}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        )}
      </div>

      <div className="player-select__grid">
        {filteredPlayers.map((player) => {
          const isSelected = selectedPlayerIds.includes(player.id);
          const winRate =
            player.gamesPlayed > 0
              ? Math.round((player.wins / player.gamesPlayed) * 100)
              : 0;

          return (
            <button
              key={player.id}
              type="button"
              className={`player-card ${
                isSelected ? "player-card--selected" : ""
              }`}
              aria-pressed={isSelected}
              onClick={() => togglePlayer(player.id)}
            >
              {player.lastWinner && (
                <span className="player-card__badge">Last Winner</span>
              )}

              <div className="player-card__top">
                <div className="player-card__avatar">
                  {getInitials(player.name)}
                </div>

                <span className="player-card__check" aria-hidden="true">
                  {isSelected ? (
                    <svg viewBox="0 0 20 20">
                      <path d="m5 10 3 3 7-7" />
                    </svg>
                  ) : (
                    <span />
                  )}
                </span>
              </div>

              <div className="player-card__content">
                <h2>{player.name}</h2>

                {player.description && <p>{player.description}</p>}

                <div className="player-card__stats">
                  <span>
                    <strong>{player.wins}</strong>
                    <small>Wins</small>
                  </span>

                  <span>
                    <strong>{player.gamesPlayed}</strong>
                    <small>Games</small>
                  </span>

                  <span>
                    <strong>{winRate}%</strong>
                    <small>Win rate</small>
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {filteredPlayers.length === 0 && (
          <div className="player-select__empty">
            <strong>No players found</strong>
            <span>Try a different name or description.</span>
          </div>
        )}
      </div>

      <div className="player-select__controls">
        <div className="player-select__selection-summary">
          <strong>{selectedPlayers.length}</strong>
          <span>
            {selectedPlayers.length === 1 ? "player selected" : "players selected"}
          </span>
        </div>

        <div className="player-select__control-actions">
          <label className="player-select__randomize">
            <span className="player-select__switch">
              <input
                type="checkbox"
                checked={randomizeOrder}
                onChange={(event) => setRandomizeOrder(event.target.checked)}
              />
              <span aria-hidden="true" />
            </span>

            <span>
              <strong>Randomize order</strong>
              <small>Shuffle players before starting</small>
            </span>
          </label>

          <button
            className="player-select__start"
            type="button"
            disabled={selectedPlayers.length < 2}
            onClick={() => onStartGame(selectedPlayers, randomizeOrder)}
          >
            Start game
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10h11M11 6l4 4-4 4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
