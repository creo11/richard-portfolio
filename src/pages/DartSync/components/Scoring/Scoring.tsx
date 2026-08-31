import { useState } from "react";
import type { DartSyncGame, TargetKey } from "../../types/game";
import type { Player } from "../../types/player";
import CricketMarks from "./CricketMarks";
import DartBoard from "./DartBoard";

import "./Scoring.less";

type ScoringProps = {
    game: DartSyncGame;
    players: Player[];
    onScoreTarget: (target: TargetKey, multiplier?: number) => void;
    onNextPlayer: () => void;
    onEndGame: () => void;
    onUndo: () => void;
    canUndo: boolean;
};

const TARGETS: TargetKey[] = [15, 16, 17, 18, 19, 20];

function getMark(markCount: number) {
    switch (markCount) {
        case 1:
            return "1";
        case 2:
            return "2";
        case 3:
            return "3";
        default:
            return "0";
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
    const [showEndGameModal, setShowEndGameModal] = useState(false);
    const activeGamePlayer = game.players[game.activePlayerIndex];

    const waitingGamePlayers =
        game.phase === "bullseye-showdown"
            ? game.showdownQueue
                .filter(
                    (playerId) =>
                        playerId !== activeGamePlayer.playerId
                )
                .map((playerId) =>
                    game.players.find(
                        (player) => player.playerId === playerId
                    )
                )
                .filter(
                    (player): player is (typeof game.players)[number] =>
                        player !== undefined
                )
            : [
                ...game.players.slice(game.activePlayerIndex + 1),
                ...game.players.slice(0, game.activePlayerIndex),
            ];

    const activePlayer = players.find(
        (player) => player.id === activeGamePlayer.playerId
    );

    const winner = game.winnerId
        ? players.find((player) => player.id === game.winnerId)
        : undefined;

    const showdownLeader = game.showdownLeaderId
        ? players.find((player) => player.id === game.showdownLeaderId)
        : undefined;

    return (
        <div className="scoring">
            {showEndGameModal && (
                <div
                    className="scoring__modal-overlay"
                    role="presentation"
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setShowEndGameModal(false);
                        }
                    }}
                >
                    <div
                        className="scoring__modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="end-game-title"
                        aria-describedby="end-game-description"
                    >
                        <span className="scoring__modal-label">End game</span>
                        <h2 id="end-game-title">Leave this game?</h2>
                        <p id="end-game-description">
                            The current game and all recorded marks will be lost.
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
                                onClick={() => {
                                    setShowEndGameModal(false);
                                    onEndGame();
                                }}
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
                        <span className="scoring__winner-label">
                            Winner
                        </span>

                        <h1>{winner.name}</h1>

                        <p>Rick's House Rules Cricket Champion</p>

                        <button
                            type="button"
                            onClick={onEndGame}
                        >
                            Finish Game
                        </button>
                    </div>
                </div>
            )}

            <div className="scoring__layout">
                <aside className="scoring__panel">
                    <div className="scoring__player-info">
                        <span className="scoring__game-label">
                            {game.phase === "bullseye-showdown"
                                ? "Bullseye Showdown"
                                : "Rick's House Rules Cricket"}
                        </span>
                        <h1>{activePlayer?.name}</h1>
                        {activeGamePlayer.showdownBulls > 0 && (
                            <div className="scoring__showdown-score">
                                Showdown Bulls: {activeGamePlayer.showdownBulls}
                            </div>
                        )}
                        {game.phase === "bullseye-showdown" && (
                            <div className="scoring__showdown-leader">
                                Showdown Leader: {showdownLeader?.name ?? "Tied"}
                            </div>
                        )}
                        {activeGamePlayer.isClosedOut && (
                            <>
                                <div className="scoring__provisional">
                                    Closed Out
                                    {game.provisionalWinnerId === activeGamePlayer.playerId &&
                                        " • Provisional Winner"}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="score-grid">
                        <div className="score-grid__numbers">
                            {TARGETS.slice(0, 3).map((target) => (
                                <button
                                    key={target}
                                    type="button"
                                    className={`score-target ${activeGamePlayer.marks[target] >= 3
                                        ? "score-target--closed"
                                        : ""
                                        }`}
                                    aria-label={`${target}, ${activeGamePlayer.marks[target]} of 3 marks`}
                                    onClick={() => onScoreTarget(target)}
                                >
                                    <span className={`score-target__mark score-target__mark--${getMark(activeGamePlayer.marks[target])}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                                            <path className="state-3" d="M25,128c0-23.9,8.19-45.93,21.9-63.42l-17.81-17.81C10.91,68.86,0,97.16,0,128s10.91,59.14,29.08,81.24l17.81-17.81c-13.71-17.5-21.9-39.52-21.9-63.42ZM226.92,46.76l-17.81,17.81c13.71,17.5,21.9,39.52,21.9,63.42s-8.19,45.93-21.9,63.42l17.81,17.81c18.17-22.1,29.08-50.39,29.08-81.24s-10.91-59.14-29.08-81.24ZM128,25c23.9,0,45.93,8.19,63.42,21.9l17.81-17.81C187.14,10.91,158.84,0,128,0s-59.14,10.91-81.24,29.08l17.81,17.81c17.5-13.71,39.52-21.9,63.42-21.9ZM128,231c-23.9,0-45.93-8.19-63.42-21.9l-17.81,17.81c22.1,18.17,50.39,29.08,81.24,29.08s59.14-10.91,81.24-29.08l-17.81-17.81c-17.5,13.71-39.52,21.9-63.42,21.9Z" />
                                            <path className="state-2" d="M46.9,191.42l-17.81,17.81c5.3,6.45,11.23,12.37,17.68,17.68l17.81-17.81,63.42-63.42-17.68-17.68-63.42,63.42ZM209.24,29.08l-17.81,17.81-63.42,63.42,17.68,17.68,63.42-63.42,17.81-17.81c-5.3-6.45-11.23-12.37-17.68-17.68Z" />
                                            <path className="state-1" d="M209.1,191.42l-63.42-63.42-17.68-17.68-63.42-63.42-17.81-17.81c-6.45,5.3-12.37,11.23-17.68,17.68l17.81,17.81,63.42,63.42,17.68,17.68,63.42,63.42,17.81,17.81c6.45-5.3,12.37-11.23,17.68-17.68l-17.81-17.81Z" />
                                        </svg>
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
                                    className={`score-target ${activeGamePlayer.marks[target] >= 3
                                        ? "score-target--closed"
                                        : ""
                                        }`}
                                    aria-label={`${target}, ${activeGamePlayer.marks[target]} of 3 marks`}
                                    onClick={() => onScoreTarget(target)}
                                >
                                    <span className={`score-target__mark score-target__mark--${getMark(activeGamePlayer.marks[target])}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                                            <path className="state-3" d="M25,128c0-23.9,8.19-45.93,21.9-63.42l-17.81-17.81C10.91,68.86,0,97.16,0,128s10.91,59.14,29.08,81.24l17.81-17.81c-13.71-17.5-21.9-39.52-21.9-63.42ZM226.92,46.76l-17.81,17.81c13.71,17.5,21.9,39.52,21.9,63.42s-8.19,45.93-21.9,63.42l17.81,17.81c18.17-22.1,29.08-50.39,29.08-81.24s-10.91-59.14-29.08-81.24ZM128,25c23.9,0,45.93,8.19,63.42,21.9l17.81-17.81C187.14,10.91,158.84,0,128,0s-59.14,10.91-81.24,29.08l17.81,17.81c17.5-13.71,39.52-21.9,63.42-21.9ZM128,231c-23.9,0-45.93-8.19-63.42-21.9l-17.81,17.81c22.1,18.17,50.39,29.08,81.24,29.08s59.14-10.91,81.24-29.08l-17.81-17.81c-17.5,13.71-39.52,21.9-63.42,21.9Z" />
                                            <path className="state-2" d="M46.9,191.42l-17.81,17.81c5.3,6.45,11.23,12.37,17.68,17.68l17.81-17.81,63.42-63.42-17.68-17.68-63.42,63.42ZM209.24,29.08l-17.81,17.81-63.42,63.42,17.68,17.68,63.42-63.42,17.81-17.81c-5.3-6.45-11.23-12.37-17.68-17.68Z" />
                                            <path className="state-1" d="M209.1,191.42l-63.42-63.42-17.68-17.68-63.42-63.42-17.81-17.81c-6.45,5.3-12.37,11.23-17.68,17.68l17.81,17.81,63.42,63.42,17.68,17.68,63.42,63.42,17.81,17.81c6.45-5.3,12.37-11.23,17.68-17.68l-17.81-17.81Z" />
                                        </svg>
                                    </span>

                                    <span className="score-target__number">
                                        {target}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            className={`score-target score-target--bull ${activeGamePlayer.isClosedOut
                                ? "score-target--showdown"
                                : activeGamePlayer.marks.bull >= 3
                                    ? "score-target--closed"
                                    : ""
                                }`}
                            aria-label={activeGamePlayer.isClosedOut
                                ? `Bull, ${activeGamePlayer.showdownBulls} showdown bulls`
                                : `Bull, ${activeGamePlayer.marks.bull} of 3 marks`
                            }
                            onClick={() => onScoreTarget("bull")}
                        >
                            <span className={`score-target__mark score-target__mark--${getMark(activeGamePlayer.marks.bull)}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                                    <path className="state-3" d="M25,128c0-23.9,8.19-45.93,21.9-63.42l-17.81-17.81C10.91,68.86,0,97.16,0,128s10.91,59.14,29.08,81.24l17.81-17.81c-13.71-17.5-21.9-39.52-21.9-63.42ZM226.92,46.76l-17.81,17.81c13.71,17.5,21.9,39.52,21.9,63.42s-8.19,45.93-21.9,63.42l17.81,17.81c18.17-22.1,29.08-50.39,29.08-81.24s-10.91-59.14-29.08-81.24ZM128,25c23.9,0,45.93,8.19,63.42,21.9l17.81-17.81C187.14,10.91,158.84,0,128,0s-59.14,10.91-81.24,29.08l17.81,17.81c17.5-13.71,39.52-21.9,63.42-21.9ZM128,231c-23.9,0-45.93-8.19-63.42-21.9l-17.81,17.81c22.1,18.17,50.39,29.08,81.24,29.08s59.14-10.91,81.24-29.08l-17.81-17.81c-17.5,13.71-39.52,21.9-63.42,21.9Z" />
                                    <path className="state-2" d="M46.9,191.42l-17.81,17.81c5.3,6.45,11.23,12.37,17.68,17.68l17.81-17.81,63.42-63.42-17.68-17.68-63.42,63.42ZM209.24,29.08l-17.81,17.81-63.42,63.42,17.68,17.68,63.42-63.42,17.81-17.81c-5.3-6.45-11.23-12.37-17.68-17.68Z" />
                                    <path className="state-1" d="M209.1,191.42l-63.42-63.42-17.68-17.68-63.42-63.42-17.81-17.81c-6.45,5.3-12.37,11.23-17.68,17.68l17.81,17.81,63.42,63.42,17.68,17.68,63.42,63.42,17.81,17.81c6.45-5.3,12.37-11.23,17.68-17.68l-17.81-17.81Z" />
                                </svg>
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
                    <div className="scoring__dartboard-toolbar">
                        <div className="scoring__dartboard-heading">
                            <span aria-hidden="true" />
                            <div>
                                <strong>Live board</strong>
                                <small>Tap Cricket targets to record marks</small>
                            </div>
                        </div>

                        <div className="scoring__dartboard-actions">
                            <button
                                type="button"
                                onClick={onUndo}
                                disabled={!canUndo}
                            >
                                Undo
                            </button>

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
                        <DartBoard
                            player={activeGamePlayer}
                            onScoreTarget={onScoreTarget}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
