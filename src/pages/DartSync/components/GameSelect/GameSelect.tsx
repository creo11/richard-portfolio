import { useEffect, useRef, useState } from "react";
import { GAME_TYPES } from "../../data/gameTypes";
import "./GameSelect.less";

type GameSelectProps = {
  onSelectGame: (gameId: string) => void;
};

export default function GameSelect({
  onSelectGame,
}: GameSelectProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const closeRulesButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!rulesOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRulesOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    closeRulesButtonRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [rulesOpen]);

  return (
    <div className="game-select">
      <header className="game-select__header">
        <div className="game-select__header-inner">
          <div className="game-select__brand">
            <span className="game-select__logo">
              <img src="/dartsync/favicon.svg" alt="" />
            </span>
            <span>DartSync</span>
          </div>

          <div className="game-select__intro">
            <span className="game-select__eyebrow">Game Lobby</span>
            <h1>Select a game</h1>
            <p>Choose your format and get ready to play.</p>
          </div>
        </div>
      </header>

      <div className="game-select__body">
        <div className="game-select__games">
          {GAME_TYPES.map((game) => (
            <article
              key={game.id}
              className="game-select__card"
            >
              <div className="game-select__graphic">
                <svg
                  viewBox="0 0 240 240"
                  role="img"
                  aria-label="Stylized dartboard"
                >
                  <circle className="board-surround" cx="120" cy="120" r="92" />
                  <circle className="board-ring board-ring--outer" cx="120" cy="120" r="72" />
                  <path className="board-wedge board-wedge--accent" d="M120 48 A72 72 0 0 1 171 69 L151 89 A44 44 0 0 0 120 76Z" />
                  <path className="board-wedge" d="M171 69 A72 72 0 0 1 192 120 L164 120 A44 44 0 0 0 151 89Z" />
                  <path className="board-wedge board-wedge--accent" d="M192 120 A72 72 0 0 1 171 171 L151 151 A44 44 0 0 0 164 120Z" />
                  <path className="board-wedge" d="M171 171 A72 72 0 0 1 120 192 L120 164 A44 44 0 0 0 151 151Z" />
                  <path className="board-wedge board-wedge--accent" d="M120 192 A72 72 0 0 1 69 171 L89 151 A44 44 0 0 0 120 164Z" />
                  <path className="board-wedge" d="M69 171 A72 72 0 0 1 48 120 L76 120 A44 44 0 0 0 89 151Z" />
                  <path className="board-wedge board-wedge--accent" d="M48 120 A72 72 0 0 1 69 69 L89 89 A44 44 0 0 0 76 120Z" />
                  <path className="board-wedge" d="M69 69 A72 72 0 0 1 120 48 L120 76 A44 44 0 0 0 89 89Z" />
                  <circle className="board-center board-center--outer" cx="120" cy="120" r="25" />
                  <circle className="board-center" cx="120" cy="120" r="10" />
                </svg>
              </div>

              <div className="game-select__content">
                <span className="game-select__status">
                  <span aria-hidden="true" />
                  Available now
                </span>
                <h2>{game.name}</h2>
                <p>{game.description}</p>

                <div className="game-select__actions">
                  <button
                    type="button"
                    className="game-select__action game-select__action--primary"
                    onClick={() => onSelectGame(game.id)}
                  >
                    Select game
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M4 10h11M11 6l4 4-4 4" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="game-select__action game-select__action--secondary"
                    onClick={() => setRulesOpen(true)}
                  >
                    View rules
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {rulesOpen && (
        <div
          className="rules-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRulesOpen(false);
            }
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
                <h2 id="house-cricket-rules-title">
                  Rick's House Rules Cricket
                </h2>
              </div>

              <button
                ref={closeRulesButtonRef}
                type="button"
                className="rules-modal__close"
                aria-label="Close rules"
                onClick={() => setRulesOpen(false)}
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
                  Close 15, 16, 17, 18, 19, 20, and Bull before your
                  opponents. Every target requires three marks to close.
                  There is no point scoring in this version of Cricket.
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
                  DartSync records marks rather than dart multipliers. Tap a
                  target once for every mark scored—for example, tap 20 three
                  times for a triple 20. The scorer advances the turn after
                  all three darts have been thrown.
                </p>
              </section>

              <section>
                <h3>Closing out and comeback turns</h3>
                <p>
                  The first player to close every target becomes the
                  provisional winner, but the game does not end immediately.
                  Each other player receives one final three-dart comeback
                  turn. A comeback player must close every remaining target to
                  stay in contention.
                </p>
                <p>
                  If nobody closes during their comeback turn, the provisional
                  winner wins. Anyone who does close joins the provisional
                  winner in the Bullseye Showdown.
                </p>
              </section>

              <section>
                <h3>Bullseye Showdown</h3>
                <p>
                  Showdown Bull counting begins the moment a player closes all
                  Cricket targets. Bulls hit before closing do not count.
                  After closing, a single Bull adds one showdown bull and a
                  double Bull adds two; enter these with one or two taps.
                </p>
                <div className="rules-modal__example">
                  <strong>Example</strong>
                  <p>
                    A player closes their final target with dart one, hits a
                    single Bull with dart two, and misses dart three. They enter
                    the formal showdown with one bull already recorded.
                  </p>
                </div>
              </section>

              <section>
                <h3>Elimination and ties</h3>
                <p>
                  At the end of a showdown turn, a player is eliminated if
                  their showdown-bull total is lower than the highest opposing
                  total. Tied leaders remain alive and continue playing. The
                  showdown continues in order until only one player remains.
                </p>
              </section>

              <section>
                <h3>Corrections and ending the game</h3>
                <p>
                  Undo removes the most recent scoring entry from the current
                  turn, including Cricket marks and showdown bulls. Next Player
                  confirms the current turn. Manually ending an active game
                  requires confirmation; a completed game can be finished
                  immediately.
                </p>
              </section>
            </div>

            <footer className="rules-modal__footer">
              <button type="button" onClick={() => setRulesOpen(false)}>
                Got it
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
