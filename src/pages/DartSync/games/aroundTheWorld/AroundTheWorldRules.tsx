import { useEffect, useRef } from "react";
import type { GameRulesViewProps } from "../types";

export default function AroundTheWorldRules({ onClose }: GameRulesViewProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="rules-modal" role="presentation">
      <section
        className="rules-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="around-world-rules-title"
      >
        <header className="rules-modal__header">
          <div>
            <span className="rules-modal__eyebrow">How to play</span>
            <h2 id="around-world-rules-title">Around the World</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="rules-modal__close"
            aria-label="Close rules"
            onClick={onClose}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </header>

        <div className="rules-modal__content">
          <section>
            <h3>Objective</h3>
            <p>
              Be the first player to advance through 1 to 20 in order and then
              finish on Bull.
            </p>
          </section>
          <section>
            <h3>Scoring</h3>
            <p>
              Only the active player's current target counts. Hits on any other
              number are ignored. Bull becomes active after 20 is cleared.
            </p>
          </section>
          <section>
            <h3>Multiplier advancement</h3>
            <p>
              When enabled on the game card, a single advances one target, a
              double advances two, and a triple advances three. When disabled,
              any valid hit advances one target. Multiplier advancement stops
              at Bull and can never skip it. Once Bull is the current target,
              the player must hit either a single or double Bull to win.
            </p>
          </section>
          <section>
            <h3>Turns and corrections</h3>
            <p>
              DartSync does not record misses or advance turns automatically.
              Select Next Player after all three darts are thrown. Undo restores
              the target from before the most recent successful dart.
            </p>
          </section>
        </div>

        <footer className="rules-modal__footer">
          <button type="button" onClick={onClose}>Got it</button>
        </footer>
      </section>
    </div>
  );
}
