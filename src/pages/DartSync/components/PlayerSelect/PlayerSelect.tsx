import { useMemo, useState } from "react";
import { MOCK_PLAYERS } from "../../data/mockPlayers";
import type { Player } from "../../types/player";
import "./PlayerSelect.less";

type PlayerSelectProps = {
  onBack: () => void;
  onStartGame: (players: Player[], randomize: boolean) => void;
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
  onBack,
  onStartGame,
}: PlayerSelectProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [randomizeOrder, setRandomizeOrder] = useState(true);

  const selectedPlayers = useMemo(
    () =>
      selectedPlayerIds
        .map((id) => MOCK_PLAYERS.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player)),
    [selectedPlayerIds]
  );

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  return (
    <div className="player-select">
      <header className="player-select__header">
        <div>
          <h1>Select Players</h1>
          <p>Choose at least two players for this game.</p>
        </div>

        <button type="button" onClick={onBack}>
          Back
        </button>
      </header>

      <div className="player-select__grid">
        {MOCK_PLAYERS.map((player) => {
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
              onClick={() => togglePlayer(player.id)}
            >
              {player.lastWinner && (
                <span className="player-card__badge">Last Winner</span>
              )}

              <div className="player-card__avatar">
                {getInitials(player.name)}
              </div>

              <div className="player-card__content">
                <h2>{player.name}</h2>

                {player.description && <p>{player.description}</p>}

                <div className="player-card__stats">
                  <span>
                    <strong>{player.wins}</strong>
                    Wins
                  </span>

                  <span>
                    <strong>{player.gamesPlayed}</strong>
                    Games
                  </span>

                  <span>
                    <strong>{winRate}%</strong>
                    Win Rate
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="player-select__controls">
        <label>
          <input
            type="checkbox"
            checked={randomizeOrder}
            onChange={(event) => setRandomizeOrder(event.target.checked)}
          />
          Randomize player order
        </label>

        <button
          type="button"
          disabled={selectedPlayers.length < 2}
          onClick={() => onStartGame(selectedPlayers, randomizeOrder)}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}