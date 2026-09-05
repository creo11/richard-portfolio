import { useMemo, useRef, useState } from "react";
import { requestTurnstileToken } from "../../turnstile";
import type { Player } from "../../types/player";
import QuickAddPlayerModal from "./QuickAddPlayerModal";
import "./PlayerSelect.less";

type PlayerSelectProps = {
  gameName: string;
  onBack: () => void;
  onManagePlayers: () => void;
  onCreatePlayer: (
    name: string,
    description: string | undefined,
    turnstileToken: string
  ) => Promise<void>;
  onStartGame: (
    players: Player[],
    randomize: boolean,
    turnstileToken: string
  ) => Promise<void>;
  selectedPlayerIds: string[];
  onSelectedPlayerIdsChange: (playerIds: string[]) => void;
  randomizeOrder: boolean;
  onRandomizeOrderChange: (randomize: boolean) => void;
  players: Player[];
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
  gameName,
  onBack,
  onManagePlayers,
  onCreatePlayer,
  onStartGame,
  selectedPlayerIds,
  onSelectedPlayerIdsChange,
  randomizeOrder,
  onRandomizeOrderChange,
  players,
}: PlayerSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [startError, setStartError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  const selectedPlayers = useMemo(
    () =>
      selectedPlayerIds
        .map((id) => players.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player)),
    [players, selectedPlayerIds]
  );

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) return players;

    return players.filter((player) =>
      [player.name, player.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery))
    );
  }, [players, searchQuery]);

  const togglePlayer = (playerId: string) => {
    onSelectedPlayerIdsChange(
      selectedPlayerIds.includes(playerId)
        ? selectedPlayerIds.filter((id) => id !== playerId)
        : [...selectedPlayerIds, playerId]
    );
  };

  const handleStartGame = async () => {
    if (!turnstileContainerRef.current || selectedPlayers.length < 2) return;

    setStartError("");
    setIsStarting(true);

    try {
      const verification = await requestTurnstileToken(
        turnstileContainerRef.current,
        "game_start"
      );

      try {
        await onStartGame(selectedPlayers, randomizeOrder, verification.token);
      } finally {
        verification.release();
      }
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "DartSync could not start the game."
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="player-select">
      <header className="player-select__header">
        <div className="player-select__header-inner">
          <div className="player-select__topbar">
            <div className="player-select__brand">
              <span className="player-select__logo">
                <img src="/dartsync/favicon.svg" alt="" />
              </span>
              <span>DartSync</span>
            </div>

            <div className="player-select__topbar-actions">
              <button
                className="player-select__manage"
                type="button"
                onClick={onManagePlayers}
              >
                Manage players
              </button>

              <button className="player-select__back" type="button" onClick={onBack}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M16 10H5M9 6l-4 4 4 4" />
                </svg>
                Back to games
              </button>
            </div>
          </div>

          <div className="player-select__intro">
            <span className="player-select__eyebrow">Game setup</span>
            <h1>Select players</h1>
            <p>Choose at least two players for {gameName}.</p>
          </div>
        </div>
      </header>

      <div className="player-select__body">
        <div className="player-select__body-inner">
          <div className="player-select__search-row">
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

            <button
              className="player-select__add"
              type="button"
              onClick={() => setIsAddingPlayer(true)}
            >
              Add Player
              <span aria-hidden="true">+</span>
            </button>
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
                    onChange={(event) => onRandomizeOrderChange(event.target.checked)}
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
                disabled={selectedPlayers.length < 2 || isStarting}
                onClick={handleStartGame}
              >
                {isStarting ? "Starting…" : "Start game"}
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 10h11M11 6l4 4-4 4" />
                </svg>
              </button>
            </div>
          </div>

          {startError && (
            <p className="player-select__start-error" role="alert">
              {startError}
            </p>
          )}
        </div>
      </div>

      <div
        ref={turnstileContainerRef}
        className="player-select__turnstile"
        aria-live="polite"
      />

      {isAddingPlayer && (
        <QuickAddPlayerModal
          players={players}
          onClose={() => setIsAddingPlayer(false)}
          onCreatePlayer={async (...args) => {
            await onCreatePlayer(...args);
            setSearchQuery("");
          }}
        />
      )}
    </div>
  );
}
