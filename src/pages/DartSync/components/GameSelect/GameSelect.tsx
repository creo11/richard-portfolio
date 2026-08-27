import { GAME_TYPES } from "../../data/gameTypes";
import "./GameSelect.less";

type GameSelectProps = {
  onSelectGame: (gameId: string) => void;
};

export default function GameSelect({
  onSelectGame,
}: GameSelectProps) {
  return (
    <div className="game-select">
      <header className="game-select__header">
        <h1>Select Game</h1>
        <p>Choose a game to get started.</p>
      </header>

      <div className="game-select__games">
        {GAME_TYPES.map((game) => (
          <button
            key={game.id}
            className="game-select__card"
            type="button"
            onClick={() => onSelectGame(game.id)}
          >
            <div className="game-select__graphic">
              {/* We'll replace this with artwork */}
              🎯
            </div>

            <div className="game-select__content">
              <h2>{game.name}</h2>
              <p>{game.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}