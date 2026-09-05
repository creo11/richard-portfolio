import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { requestTurnstileToken } from "../../turnstile";
import type { Player } from "../../types/player";
import "./QuickAddPlayerModal.less";

type QuickAddPlayerModalProps = {
  players: Player[];
  onClose: () => void;
  onCreatePlayer: (
    name: string,
    description: string | undefined,
    turnstileToken: string
  ) => Promise<void>;
};

export default function QuickAddPlayerModal({
  players,
  onClose,
  onCreatePlayer,
}: QuickAddPlayerModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    nameInputRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!turnstileContainerRef.current) return;

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

    setIsSubmitting(true);
    setError("");

    try {
      const verification = await requestTurnstileToken(
        turnstileContainerRef.current,
        "player_create"
      );

      try {
        await onCreatePlayer(
          trimmedName,
          trimmedDescription || undefined,
          verification.token
        );
      } finally {
        verification.release();
      }

      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "DartSync could not save the player."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="quick-add-player" role="presentation">
      <form
        className="quick-add-player__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-player-title"
        onSubmit={handleSubmit}
      >
        <header>
          <span>Create player</span>
          <h2 id="quick-add-player-title">Add a new player</h2>
          <p>They will be available immediately for this game.</p>
        </header>

        <div className="quick-add-player__fields">
          <label>
            <span>Player name</span>
            <input
              ref={nameInputRef}
              value={name}
              maxLength={40}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "quick-add-player-error" : undefined}
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
            <p id="quick-add-player-error" className="quick-add-player__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer>
          <button type="button" disabled={isSubmitting} onClick={onClose}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className="quick-add-player__submit">
            {isSubmitting ? "Saving…" : "Create player"}
          </button>
        </footer>
      </form>

      <div
        ref={turnstileContainerRef}
        className="quick-add-player__turnstile"
        aria-live="polite"
      />
    </div>
  );
}
