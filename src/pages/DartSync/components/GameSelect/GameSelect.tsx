import { useState } from "react";
import { GAME_TYPES } from "../../data/gameTypes";
import { getGameRegistration } from "../../games/registry";
import type { GameSetupOptions } from "../../games/types";
import "./GameSelect.less";

type GameSelectProps = {
  onSelectGame: (gameId: string, options: GameSetupOptions) => void;
  onViewHistory: () => void;
  onViewStatistics: () => void;
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

export default function GameSelect({
  onSelectGame,
  onViewHistory,
  onViewStatistics,
}: GameSelectProps) {
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
            <div className="game-select__nav">
              <button type="button" className="game-select__history" onClick={onViewHistory}>
                Game History
              </button>
              <button type="button" className="game-select__statistics" onClick={onViewStatistics}>
                Statistics
              </button>
            </div>
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
                <img src={game.image} alt={game.imageAlt} />
              </div>

              <div className="game-select__content">
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
                    Select Game
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M4 10h11M11 6l4 4-4 4" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="game-select__action game-select__action--secondary"
                    onClick={() => setRulesGameId(game.id)}
                  >
                    View Rules
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
