import type { DartSyncGame, TargetKey } from "../../types/game";
import type { Player } from "../../types/player";
import CricketMarks from "./CricketMarks";
import DartBoard from "./DartBoard";

import "./Scoring.less";

type ScoringProps = {
    game: DartSyncGame;
    players: Player[];
    onScoreTarget: (target: TargetKey) => void;
    onNextPlayer: () => void;
    onEndGame: () => void;
    onUndo: () => void;
    canUndo: boolean;
};

const TARGETS: TargetKey[] = [15, 16, 17, 18, 19, 20];

function getMark(markCount: number) {
  switch (markCount) {
    case 1:
      return "/";
    case 2:
      return "X";
    case 3:
      return "ⓧ";
    default:
      return "";
  }
}

export default function Scoring({
    game,
    players,
    onScoreTarget,
    onNextPlayer,
    onEndGame,
    onUndo,
    canUndo,
}: ScoringProps) {
  const activeGamePlayer = game.players[game.activePlayerIndex];

  const waitingGamePlayers = [
    ...game.players.slice(game.activePlayerIndex + 1),
    ...game.players.slice(0, game.activePlayerIndex),
  ];

  const activePlayer = players.find(
    (player) => player.id === activeGamePlayer.playerId
  );

  return (
    <div className="scoring">
        <header className="scoring__header">
            <div>
                <span>House Rules Cricket</span>
                <h1>{activePlayer?.name}</h1>
            </div>
            <div className="scoring__header-actions">
                <button type="button"
                        onClick={onUndo}
                        disabled={!canUndo}>Undo</button>
                <button type="button"
                        className="scoring__end-game"
                        onClick={onEndGame}>
                    End Game
                </button>
            </div>
        </header>

      <div className="scoring__layout">
        <aside className="scoring__panel">
          <div className="score-grid">
            <div className="score-grid__numbers">
              {TARGETS.slice(0, 3).map((target) => (
                <button
                  key={target}
                  type="button"
                  className="score-target"
                  onClick={() => onScoreTarget(target)}
                >
                  <span className="score-target__mark">
                    {getMark(activeGamePlayer.marks[target])}
                  </span>

                  <span className="score-target__number">
                    {target}
                  </span>
                </button>
              ))}

              {TARGETS.slice(3).map((target) => (
                <button
                  key={target}
                  type="button"
                  className="score-target"
                  onClick={() => onScoreTarget(target)}
                >
                  <span className="score-target__mark">
                    {getMark(activeGamePlayer.marks[target])}
                  </span>

                  <span className="score-target__number">
                    {target}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="score-target score-target--bull"
              onClick={() => onScoreTarget("bull")}
            >
              <span className="score-target__mark">
                {getMark(activeGamePlayer.marks.bull)}
              </span>

              <span className="score-target__number">
                B
              </span>
            </button>
          </div>

          <button
            type="button"
            className="scoring__next"
            onClick={onNextPlayer}
          >
            Next Player
          </button>
          <div className="scoring__waiting">
  <h2>Up Next</h2>

  <div className="waiting-players">
    {waitingGamePlayers.map((gamePlayer, index) => {
      const player = players.find(
        (player) => player.id === gamePlayer.playerId
      );

      if (!player) return null;

      return (
        <div
          className="waiting-player"
          key={gamePlayer.playerId}
        >
          <div className="waiting-player__header">
            <div className="waiting-player__avatar">
              {player.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div>
              <strong>{player.name}</strong>

              {index === 0 && (
                <span className="waiting-player__next">
                  Next
                </span>
              )}
            </div>
          </div>

          <CricketMarks
            player={gamePlayer}
            compact
          />
        </div>
      );
    })}
  </div>
</div>
        </aside>

        <main className="scoring__dartboard">
  <DartBoard
    player={activeGamePlayer}
    onScoreTarget={onScoreTarget}
  />
</main>
      </div>
    </div>
  );
}