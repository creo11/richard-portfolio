import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Player } from "../../types/player";
import "./PlayerManagement.less";

type PlayerManagementProps = {
  players: Player[];
  onBack: () => void;
  onCreatePlayer: (name: string, description?: string) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PlayerManagement({
  players,
  onBack,
  onCreatePlayer,
}: PlayerManagementProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!createOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCreateOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    nameInputRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [createOpen]);

  const openCreatePlayer = () => {
    setName("");
    setDescription("");
    setError("");
    setCreateOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Enter a player name.");
      return;
    }

    if (players.some((player) => player.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("A player with this name already exists.");
      return;
    }

    onCreatePlayer(trimmedName, trimmedDescription || undefined);
    setCreateOpen(false);
  };

  return (
    <div className="player-management">
      <header className="player-management__header">
        <div className="player-management__header-inner">
          <div className="player-management__topbar">
            <div className="player-management__brand">
              <span className="player-management__logo">
                <img src="/dartsync/favicon.svg" alt="" />
              </span>
              <span>DartSync</span>
            </div>

            <button type="button" className="player-management__back" onClick={onBack}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16 10H5M9 6l-4 4 4 4" />
              </svg>
              Back to player selection
            </button>
          </div>

          <div className="player-management__intro">
            <div>
              <span className="player-management__eyebrow">Player management</span>
              <h1>Players</h1>
              <p>View the players available for DartSync games.</p>
            </div>

            <button type="button" onClick={openCreatePlayer}>
              Add player
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      </header>

      <main className="player-management__body">
        <div className="player-management__body-inner">
          <div
            className="player-management__summary"
            aria-label={`${players.length} active players`}
          >
            <strong>{players.length}</strong>
            <span>active players</span>
            <small>Players are stored for this session until persistence is connected.</small>
          </div>

          <div className="player-management__grid">
            {players.map((player) => {
              const winRate = player.gamesPlayed
                ? Math.round((player.wins / player.gamesPlayed) * 100)
                : 0;

              return (
                <article className="managed-player" key={player.id}>
                  <div className="managed-player__header">
                    <span className="managed-player__avatar">
                      {getInitials(player.name)}
                    </span>
                    <div>
                      <h2>{player.name}</h2>
                      <p>{player.description}</p>
                    </div>
                    {player.lastWinner && (
                      <span className="managed-player__badge">Last winner</span>
                    )}
                  </div>

                  <div className="managed-player__stats">
                    <span><strong>{player.wins}</strong><small>Wins</small></span>
                    <span><strong>{player.gamesPlayed}</strong><small>Games</small></span>
                    <span><strong>{winRate}%</strong><small>Win rate</small></span>
                  </div>

                  <div className="managed-player__actions" aria-label={`${player.name} actions`}>
                    <button type="button" disabled>Edit</button>
                    <button type="button" disabled>Reset stats</button>
                    <button type="button" disabled className="managed-player__delete">Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      {createOpen && (
        <div className="player-form-modal" role="presentation">
          <form
            className="player-form-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-player-title"
            onSubmit={handleSubmit}
          >
            <header>
              <span>Create player</span>
              <h2 id="create-player-title">Add a new player</h2>
              <p>They will be available immediately during game setup.</p>
            </header>

            <div className="player-form-modal__fields">
              <label>
                <span>Player name</span>
                <input
                  ref={nameInputRef}
                  value={name}
                  maxLength={40}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "create-player-error" : undefined}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                />
              </label>

              <label>
                <span>Description <small>Optional</small></span>
                <input
                  value={description}
                  maxLength={80}
                  placeholder="Playing style or nickname"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              {error && (
                <p id="create-player-error" className="player-form-modal__error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <footer>
              <button type="button" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="submit" className="player-form-modal__submit">Create player</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
