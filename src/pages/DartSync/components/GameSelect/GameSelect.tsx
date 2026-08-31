import { useState } from "react";
import { GAME_TYPES } from "../../data/gameTypes";
import { getGameRegistration } from "../../games/registry";
import type { GameSetupOptions } from "../../games/types";
import "./GameSelect.less";

type GameSelectProps = {
  onSelectGame: (gameId: string, options: GameSetupOptions) => void;
};

function createDefaultOptions() {
  return Object.fromEntries(
    GAME_TYPES.map((game) => [
      game.id,
      Object.fromEntries(
        game.options.map((option) => [option.key, option.defaultValue])
      ),
    ])
  ) as Record<string, GameSetupOptions>;
}

export default function GameSelect({ onSelectGame }: GameSelectProps) {
  const [rulesGameId, setRulesGameId] = useState<string | null>(null);
  const [gameOptions, setGameOptions] = useState(createDefaultOptions);
  const rulesRegistration = rulesGameId
    ? getGameRegistration(rulesGameId)
    : undefined;
  const RulesView = rulesRegistration?.RulesView;

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
            <article key={game.id} className="game-select__card">
              <div className="game-select__graphic">
                <svg viewBox="0 0 240 240" role="img" aria-label="Stylized dartboard">
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

                {game.options.map((option) => (
                  <label className="game-select__option" key={option.key}>
                    <span className="game-select__option-switch">
                      <input
                        type="checkbox"
                        checked={gameOptions[game.id]?.[option.key] ?? option.defaultValue}
                        onChange={(event) =>
                          setGameOptions((current) => ({
                            ...current,
                            [game.id]: {
                              ...current[game.id],
                              [option.key]: event.target.checked,
                            },
                          }))
                        }
                      />
                      <span aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}

                <div className="game-select__actions">
                  <button
                    type="button"
                    className="game-select__action game-select__action--primary"
                    onClick={() => onSelectGame(game.id, gameOptions[game.id] ?? {})}
                  >
                    {game.id === "house-cricket"
                      ? "Select game"
                      : `Select ${game.name}`}
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M4 10h11M11 6l4 4-4 4" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="game-select__action game-select__action--secondary"
                    onClick={() => setRulesGameId(game.id)}
                  >
                    {game.id === "house-cricket"
                      ? "View rules"
                      : `View ${game.name} rules`}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {RulesView && <RulesView onClose={() => setRulesGameId(null)} />}
    </div>
  );
}
