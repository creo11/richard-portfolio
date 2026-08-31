import { useState } from "react";
import type { GameScoringViewProps } from "../types";
import AroundTheWorldDartBoard from "./AroundTheWorldDartBoard";
import { AROUND_THE_WORLD_TARGETS } from "./types";
import type {
  AroundTheWorldGame,
  AroundTheWorldTarget,
} from "./types";
import "../../components/Scoring/Scoring.less";
import "./AroundTheWorldScoring.less";

type AroundTheWorldScoringProps = GameScoringViewProps<
  AroundTheWorldGame,
  AroundTheWorldTarget
>;

function displayTarget(target: AroundTheWorldTarget | undefined) {
  return target === "bull" ? "Bull" : target;
}

export default function AroundTheWorldScoring({
  game,
  players,
  onScoreTarget,
  onNextPlayer,
  onEndGame,
  onUndo,
  canUndo,
}: AroundTheWorldScoringProps) {
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const activeGamePlayer = game.players[game.activePlayerIndex];
  const activePlayer = players.find(
    (player) => player.id === activeGamePlayer.playerId
  );
  const currentTarget = AROUND_THE_WORLD_TARGETS[
    activeGamePlayer.targetIndex
  ] ?? "bull";
  const winner = game.winnerId
    ? players.find((player) => player.id === game.winnerId)
    : undefined;
  const waitingPlayers = [
    ...game.players.slice(game.activePlayerIndex + 1),
    ...game.players.slice(0, game.activePlayerIndex),
  ];

  return (
    <div className="scoring around-world">
      {showEndGameModal && (
        <div
          className="scoring__modal-overlay"
          role="presentation"
          onKeyDown={(event) => {
            if (event.key === "Escape") setShowEndGameModal(false);
          }}
        >
          <div
            className="scoring__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="around-end-game-title"
            aria-describedby="around-end-game-description"
          >
            <span className="scoring__modal-label">End game</span>
            <h2 id="around-end-game-title">Leave this game?</h2>
            <p id="around-end-game-description">
              The current progress will be lost.
            </p>
            <div className="scoring__modal-actions">
              <button
                type="button"
                className="scoring__modal-cancel"
                autoFocus
                onClick={() => setShowEndGameModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="scoring__modal-confirm"
                onClick={onEndGame}
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}

      {game.phase === "complete" && winner && (
        <div className="scoring__winner-overlay">
          <div className="scoring__winner">
            <span className="scoring__winner-label">Winner</span>
            <h1>{winner.name}</h1>
            <p>Around the World Champion</p>
            <button type="button" onClick={onEndGame}>Finish Game</button>
          </div>
        </div>
      )}

      <div className="scoring__layout">
        <aside className="scoring__panel">
          <div className="scoring__player-info">
            <span className="scoring__game-label">Around the World</span>
            <h1>{activePlayer?.name}</h1>
          </div>

          <section className="around-world__target-card">
            <span>Current target</span>
            <strong>{displayTarget(currentTarget)}</strong>
            <small>
              {activeGamePlayer.targetIndex} of {AROUND_THE_WORLD_TARGETS.length} cleared
            </small>
            <div className="around-world__progress" aria-hidden="true">
              <span
                style={{
                  width: `${(activeGamePlayer.targetIndex / AROUND_THE_WORLD_TARGETS.length) * 100}%`,
                }}
              />
            </div>
          </section>

          <div className="around-world__option-status">
            Multiplier advancement: {game.options.multiplierAdvance ? "On" : "Off"}
          </div>

          <div
            className={`around-world__score-actions${
              game.options.multiplierAdvance
                ? ""
                : " around-world__score-actions--single"
            }`}
          >
            <button type="button" onClick={() => onScoreTarget(currentTarget, 1)}>
              {game.options.multiplierAdvance ? "Single" : "Score"}{" "}
              {displayTarget(currentTarget)}
            </button>
            {game.options.multiplierAdvance && (
              <>
                <button type="button" onClick={() => onScoreTarget(currentTarget, 2)}>
                  Double {displayTarget(currentTarget)}
                </button>
                <button type="button" onClick={() => onScoreTarget(currentTarget, 3)}>
                  Triple {displayTarget(currentTarget)}
                </button>
              </>
            )}
          </div>

          <button type="button" className="scoring__next" onClick={onNextPlayer}>
            Next Player
          </button>

          <div className="scoring__waiting">
            <h2>Up Next</h2>
            <div className="around-world__waiting-list">
              {waitingPlayers.map((gamePlayer, index) => {
                const player = players.find(
                  (candidate) => candidate.id === gamePlayer.playerId
                );
                const target = AROUND_THE_WORLD_TARGETS[gamePlayer.targetIndex];
                if (!player) return null;

                return (
                  <div className="around-world__waiting-card" key={gamePlayer.playerId}>
                    <span>{player.name.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <strong>{player.name}</strong>
                      <small>Target {displayTarget(target)}</small>
                    </div>
                    {index === 0 && <em>Next</em>}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="scoring__dartboard">
          <div className="scoring__dartboard-toolbar">
            <div className="scoring__dartboard-heading">
              <span aria-hidden="true" />
              <div>
                <strong>Live board</strong>
                <small>Hit the highlighted target, then advance turns manually</small>
              </div>
            </div>
            <div className="scoring__dartboard-actions">
              <button type="button" onClick={onUndo} disabled={!canUndo}>Undo</button>
              <button
                type="button"
                className="scoring__end-game"
                onClick={() => setShowEndGameModal(true)}
              >
                End Game
              </button>
            </div>
          </div>
          <div className="scoring__dartboard-frame">
            <AroundTheWorldDartBoard
              currentTarget={currentTarget}
              onScoreTarget={onScoreTarget}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
