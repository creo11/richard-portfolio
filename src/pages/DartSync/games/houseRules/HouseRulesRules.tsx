import { useEffect, useRef } from "react";
import type { GameRulesViewProps } from "../types";

export default function HouseRulesRules({ onClose }: GameRulesViewProps) {
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
    <div
      className="rules-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="rules-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="house-cricket-rules-title"
      >
        <header className="rules-modal__header">
          <div>
            <span className="rules-modal__eyebrow">How to play</span>
            <h2 id="house-cricket-rules-title">Rick's House Rules Cricket</h2>
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
              Close 15, 16, 17, 18, 19, 20, and Bull before your opponents.
              Every target requires three marks to close. There is no point
              scoring in this version of Cricket.
            </p>
          </section>

          <section>
            <h3>Recording throws</h3>
            <ul>
              <li>A single counts as one mark.</li>
              <li>A double counts as two marks.</li>
              <li>A triple counts as three marks.</li>
            </ul>
            <p>
              The interactive dartboard detects double and triple rings. The
              scoring-panel controls remain manual one-mark buttons, so a
              triple 20 can also be entered by tapping 20 three times. The
              scorer advances the turn after all three darts are thrown.
            </p>
          </section>

          <section>
            <h3>Closing out and comeback turns</h3>
            <p>
              The first player to close every target becomes the provisional
              winner, but the game does not end immediately. Each other player
              receives one final three-dart comeback turn. A comeback player
              must close every remaining target to stay in contention.
            </p>
            <p>
              If nobody closes during their comeback turn, the provisional
              winner wins. Anyone who does close joins the provisional winner
              in the Bullseye Showdown.
            </p>
          </section>

          <section>
            <h3>Bullseye Showdown</h3>
            <p>
              Showdown Bull counting begins the moment a player closes all
              Cricket targets. Bulls hit before closing do not count. After
              closing, a single Bull adds one showdown bull and a double Bull
              adds two. The inner bull records the double automatically.
            </p>
            <div className="rules-modal__example">
              <strong>Example</strong>
              <p>
                A player closes their final target with dart one, hits a single
                Bull with dart two, and misses dart three. They enter the formal
                showdown with one bull already recorded.
              </p>
            </div>
          </section>

          <section>
            <h3>Elimination and ties</h3>
            <p>
              At the end of a showdown turn, a player is eliminated if their
              showdown-bull total is lower than the highest opposing total.
              Tied leaders remain alive and continue playing. The showdown
              continues in order until only one player remains.
            </p>
          </section>

          <section>
            <h3>Corrections and ending the game</h3>
            <p>
              Undo removes the most recent scoring entry from the current turn,
              including Cricket marks and showdown bulls. Next Player confirms
              the current turn. Manually ending an active game requires
              confirmation; a completed game can be finished immediately.
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
