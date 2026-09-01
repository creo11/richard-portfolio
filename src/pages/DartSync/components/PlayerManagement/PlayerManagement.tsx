import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Player } from "../../types/player";
import { requestTurnstileToken, type TurnstileAction } from "../../turnstile";
import "./PlayerManagement.less";

type PlayerManagementProps = {
  players: Player[];
  persistenceStatus: "loading" | "ready" | "fallback";
  onBack: () => void;
  onCreatePlayer: (name: string, description: string | undefined, turnstileToken: string) => Promise<void>;
  onUpdatePlayer: (playerId: string, name: string, description: string | undefined, turnstileToken: string) => Promise<void>;
  onResetPlayerStats: (playerId: string, turnstileToken: string) => Promise<void>;
  onDeletePlayer: (playerId: string, turnstileToken: string) => Promise<void>;
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
  persistenceStatus,
  onBack,
  onCreatePlayer,
  onUpdatePlayer,
  onResetPlayerStats,
  onDeletePlayer,
}: PlayerManagementProps) {
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPlayerId, setResetPlayerId] = useState<string | null>(null);
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const resetPlayer = players.find((player) => player.id === resetPlayerId);
  const deletePlayer = players.find((player) => player.id === deletePlayerId);

  const runProtectedAction = async <T,>(
    action: TurnstileAction,
    operation: (turnstileToken: string) => Promise<T>,
  ): Promise<T> => {
    if (!turnstileContainerRef.current) {
      throw new Error("Cloudflare verification is unavailable. Please try again.");
    }

    const verification = await requestTurnstileToken(
      turnstileContainerRef.current,
      action,
    );

    try {
      return await operation(verification.token);
    } finally {
      verification.release();
    }
  };

  useEffect(() => {
    if (!formMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFormMode(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    nameInputRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [formMode]);

  useEffect(() => {
    if (!resetPlayerId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setResetPlayerId(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [resetPlayerId]);

  useEffect(() => {
    if (!deletePlayerId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeletePlayerId(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deletePlayerId]);

  const openCreatePlayer = () => {
    setName("");
    setDescription("");
    setError("");
    setEditingPlayerId(null);
    setFormMode("create");
  };

  const openEditPlayer = (player: Player) => {
    setName(player.name);
    setDescription(player.description ?? "");
    setError("");
    setEditingPlayerId(player.id);
    setFormMode("edit");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Enter a player name.");
      return;
    }

    if (players.some(
      (player) =>
        player.id !== editingPlayerId &&
        player.name.toLowerCase() === trimmedName.toLowerCase()
    )) {
      setError("A player with this name already exists.");
      return;
    }

    if (formMode === "edit" && editingPlayerId) {
      setIsSubmitting(true);

      try {
        await runProtectedAction("player_update", (turnstileToken) => onUpdatePlayer(
          editingPlayerId,
          trimmedName,
          trimmedDescription || undefined,
          turnstileToken,
        )
        );
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "DartSync could not save the player."
        );
        setIsSubmitting(false);
        return;
      }
    } else {
      setIsSubmitting(true);

      try {
        await runProtectedAction("player_create", (turnstileToken) => onCreatePlayer(
          trimmedName,
          trimmedDescription || undefined,
          turnstileToken,
        ));
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "DartSync could not save the player."
        );
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    setFormMode(null);
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
            <small role="status">
              {persistenceStatus === "loading" && "Loading saved players…"}
              {persistenceStatus === "ready" && "Players are saved to DartSync."}
              {persistenceStatus === "fallback" &&
                "Using starter players because saved players could not be loaded."}
            </small>
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
                    <button type="button" onClick={() => openEditPlayer(player)}>Edit</button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetError("");
                        setResetPlayerId(player.id);
                      }}
                    >
                      Reset stats
                    </button>
                    <button
                      type="button"
                      className="managed-player__delete"
                      onClick={() => {
                        setDeleteError("");
                        setDeletePlayerId(player.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      {formMode && (
        <div className="player-form-modal" role="presentation">
          <form
            className="player-form-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-form-title"
            onSubmit={handleSubmit}
          >
            <header>
              <span>{formMode === "edit" ? "Edit player" : "Create player"}</span>
              <h2 id="player-form-title">
                {formMode === "edit" ? "Update player details" : "Add a new player"}
              </h2>
              <p>
                {formMode === "edit"
                  ? "Statistics and game identity will remain unchanged."
                  : "They will be available immediately during game setup."}
              </p>
            </header>

            <div className="player-form-modal__fields">
              <label>
                <span>Player name</span>
                <input
                  ref={nameInputRef}
                  value={name}
                  maxLength={40}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "player-form-error" : undefined}
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
                <p id="player-form-error" className="player-form-modal__error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <footer>
              <button type="button" disabled={isSubmitting} onClick={() => setFormMode(null)}>Cancel</button>
              <button type="submit" disabled={isSubmitting} className="player-form-modal__submit">
                {isSubmitting
                  ? "Saving…"
                  : formMode === "edit" ? "Save changes" : "Create player"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {resetPlayer && (
        <div className="player-confirm-modal" role="presentation">
          <section
            className="player-confirm-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-player-title"
            aria-describedby="reset-player-description"
          >
            <span className="player-confirm-modal__eyebrow">Reset statistics</span>
            <h2 id="reset-player-title">Reset {resetPlayer.name}'s stats?</h2>
            <p id="reset-player-description">
              Wins and games played will return to zero. The player will remain available.
            </p>

            {resetError && (
              <p className="player-form-modal__error" role="alert">
                {resetError}
              </p>
            )}

            <div className="player-confirm-modal__actions">
              <button
                type="button"
                autoFocus
                disabled={isResetting}
                onClick={() => setResetPlayerId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                className="player-confirm-modal__confirm"
                onClick={async () => {
                  setResetError("");
                  setIsResetting(true);

                  try {
                    await runProtectedAction("player_reset", (turnstileToken) => (
                      onResetPlayerStats(resetPlayer.id, turnstileToken)
                    ));
                    setResetPlayerId(null);
                  } catch (submitError) {
                    setResetError(
                      submitError instanceof Error
                        ? submitError.message
                        : "DartSync could not reset the player's statistics."
                    );
                  } finally {
                    setIsResetting(false);
                  }
                }}
              >
                {isResetting ? "Resetting…" : "Reset stats"}
              </button>
            </div>
          </section>
        </div>
      )}

      {deletePlayer && (
        <div className="player-confirm-modal" role="presentation">
          <section
            className="player-confirm-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-player-title"
            aria-describedby="delete-player-description"
          >
            <span className="player-confirm-modal__eyebrow player-confirm-modal__eyebrow--danger">
              Delete player
            </span>
            <h2 id="delete-player-title">Delete {deletePlayer.name}?</h2>
            <p id="delete-player-description">
              This removes the player from the active list and current game setup.
              Existing game history and results will remain intact.
            </p>

            {deleteError && (
              <p className="player-form-modal__error" role="alert">
                {deleteError}
              </p>
            )}

            <div className="player-confirm-modal__actions">
              <button
                type="button"
                autoFocus
                disabled={isDeleting}
                onClick={() => setDeletePlayerId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                className="player-confirm-modal__confirm player-confirm-modal__confirm--danger"
                onClick={async () => {
                  setDeleteError("");
                  setIsDeleting(true);

                  try {
                    await runProtectedAction("player_delete", (turnstileToken) => (
                      onDeletePlayer(deletePlayer.id, turnstileToken)
                    ));
                    setDeletePlayerId(null);
                  } catch (submitError) {
                    setDeleteError(
                      submitError instanceof Error
                        ? submitError.message
                        : "DartSync could not delete the player."
                    );
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? "Deleting…" : "Delete player"}
              </button>
            </div>
          </section>
        </div>
      )}

      <div
        ref={turnstileContainerRef}
        className="player-management__turnstile"
        aria-live="polite"
      />
    </div>
  );
}
