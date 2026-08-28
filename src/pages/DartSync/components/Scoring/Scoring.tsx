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
            {game.phase === "complete" && winner && (
                <div className="scoring__winner-overlay">
                    <div className="scoring__winner">
                        <span className="scoring__winner-label">
                            Winner
                        </span>

                        <h1>{winner.name}</h1>

                        <p>House Rules Cricket Champion</p>

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
                        <span>
                            {game.phase === "bullseye-showdown"
                                ? "Bullseye Showdown"
                                : "House Rules Cricket"}
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
                            onClick={onEndGame}
                        >
                            End Game
                        </button>
                    </div>
                    <DartBoard
                        player={activeGamePlayer}
                        onScoreTarget={onScoreTarget}
                    />
                </main>
            </div>
        </div>
    );
}