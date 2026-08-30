import { useEffect, useState } from "react";

import GameSelect from "./components/GameSelect/GameSelect";
import PlayerSelect from "./components/PlayerSelect/PlayerSelect";
import Scoring from "./components/Scoring/Scoring";
import { hasClosedAllTargets } from "./types/game";

import type { Player } from "./types/player";
import type {
    DartSyncGame,
    TargetKey,
    ScoreAction,
} from "./types/game";

import { createGameState } from "./utils/createGameState";

import "./DartSync.less";



type DartSyncStep = "game-select" | "player-select" | "scoring";

function shufflePlayers(players: Player[]) {
    const shuffled = [...players];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

export default function DartSync() {
    const [step, setStep] = useState<DartSyncStep>("game-select");
    const [gamePlayers, setGamePlayers] = useState<Player[]>([]);
    const [game, setGame] = useState<DartSyncGame | null>(null);
    const [scoreHistory, setScoreHistory] = useState<ScoreAction[]>([]);

    useEffect(() => {
        const existingFavicon = document.querySelector(
            'link[rel="icon"]'
        ) as HTMLLinkElement | null;

        const originalHref = existingFavicon?.href;

        let favicon = existingFavicon;

        if (!favicon) {
            favicon = document.createElement("link");
            favicon.rel = "icon";
            document.head.appendChild(favicon);
        }

        favicon.href = "/dartsync/favicon.svg";

        const manifest = document.createElement("link");
        manifest.rel = "manifest";
        manifest.href = "/dartsync/site.webmanifest";
        document.head.appendChild(manifest);

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/dartsync/sw.js");
        }

        return () => {
            if (originalHref) {
                favicon!.href = originalHref;
            }

            manifest.remove();
        };
    }, []);

    const handleGameSelect = (_gameId: string) => {
        setStep("player-select");
    };

    const handleStartGame = (
        players: Player[],
        randomizeOrder: boolean
    ) => {
        setScoreHistory([]);
        const orderedPlayers = randomizeOrder
            ? shufflePlayers(players)
            : players;

        setGamePlayers(orderedPlayers);

        const newGame = createGameState(orderedPlayers);
        setGame(newGame);

        setStep("scoring");
    };

    const handleScoreTarget = (target: TargetKey) => {
        if (!game) return;

        const activePlayerIndex = game.activePlayerIndex;
        const activePlayer = game.players[activePlayerIndex];

        /*
         * Once a player has closed everything,
         * additional Bull taps count toward
         * the Bullseye Showdown.
         */
        if (activePlayer.isClosedOut) {
            if (target !== "bull") return;

            setScoreHistory((history) => [
                ...history,
                {
                    playerId: activePlayer.playerId,
                    target,
                    type: "showdown-bull",
                },
            ]);

            const updatedPlayer = {
                ...activePlayer,
                showdownBulls: activePlayer.showdownBulls + 1,
            };

            const updatedPlayers = [...game.players];
            updatedPlayers[activePlayerIndex] = updatedPlayer;

            const showdownLeader =
                updatedPlayers
                    .filter((player) =>
                        game.showdownQueue.includes(player.playerId)
                    )
                    .reduce(
                        (leader, player) =>
                            !leader ||
                                player.showdownBulls > leader.showdownBulls
                                ? player
                                : leader,
                        undefined as typeof updatedPlayer | undefined
                    );

            setGame({
                ...game,
                players: updatedPlayers,
                showdownLeaderId:
                    showdownLeader && updatedPlayers.filter((player) =>
                        game.showdownQueue.includes(player.playerId)
                    ).filter(
                        (player) =>
                            player.showdownBulls === showdownLeader.showdownBulls
                    ).length === 1
                        ? showdownLeader.playerId
                        : undefined,
            });

            return;
        }

        const currentMarks = activePlayer.marks[target];

        if (currentMarks >= 3) return;

        setScoreHistory((history) => [
            ...history,
            {
                playerId: activePlayer.playerId,
                target,
                type: "mark",
            },
        ]);

        const updatedMarks = {
            ...activePlayer.marks,
            [target]: currentMarks + 1,
        };

        const updatedPlayer = {
            ...activePlayer,
            marks: updatedMarks,
        };

        /*
         * Check whether THIS tap completed
         * the player's final required target.
         */
        const justClosedOut = hasClosedAllTargets(updatedPlayer);

        const completedPlayer = {
            ...updatedPlayer,
            isClosedOut: justClosedOut,
        };

        const updatedPlayers = [...game.players];
        updatedPlayers[activePlayerIndex] = completedPlayer;

        /*
         * If this is the first player to close,
         * create the comeback queue starting
         * with the next player in turn order.
         */
        const isFirstCloseOut =
            justClosedOut && !game.provisionalWinnerId;

        const comebackQueue = isFirstCloseOut
            ? [
                ...game.players.slice(activePlayerIndex + 1),
                ...game.players.slice(0, activePlayerIndex),
            ].map((player) => player.playerId)
            : game.comebackQueue;

        setGame({
            ...game,
            players: updatedPlayers,

            provisionalWinnerId: isFirstCloseOut
                ? activePlayer.playerId
                : game.provisionalWinnerId,

            phase: isFirstCloseOut
                ? "comeback"
                : game.phase,

            comebackQueue,
        });
    };

    const handleNextPlayer = () => {
        setScoreHistory([]);

        setGame((currentGame) => {
            if (!currentGame) return currentGame;

            /*
             * Normal game rotation
             */
            if (currentGame.phase === "normal") {
                return {
                    ...currentGame,
                    activePlayerIndex:
                        (currentGame.activePlayerIndex + 1) %
                        currentGame.players.length,
                };
            }

            /*
             * Comeback phase
             */
            if (currentGame.phase === "comeback") {
                const activePlayer =
                    currentGame.players[currentGame.activePlayerIndex];

                const isProvisionalWinner =
                    activePlayer.playerId ===
                    currentGame.provisionalWinnerId;

                /*
                 * The provisional winner has finished
                 * the turn in which they closed out.
                 *
                 * Start the first opponent's comeback turn.
                 */
                if (isProvisionalWinner) {
                    const nextPlayerId =
                        currentGame.comebackQueue[0];

                    if (!nextPlayerId) {
                        return currentGame;
                    }

                    const nextPlayerIndex =
                        currentGame.players.findIndex(
                            (player) =>
                                player.playerId === nextPlayerId
                        );

                    return {
                        ...currentGame,
                        activePlayerIndex: nextPlayerIndex,
                    };
                }

                /*
                 * The active opponent just finished
                 * their comeback turn.
                 */
                const remainingQueue =
                    currentGame.comebackQueue.filter(
                        (playerId) =>
                            playerId !== activePlayer.playerId
                    );

                /*
                 * There are still opponents waiting
                 * for their comeback turn.
                 */
                if (remainingQueue.length > 0) {
                    const nextPlayerId = remainingQueue[0];

                    const nextPlayerIndex =
                        currentGame.players.findIndex(
                            (player) =>
                                player.playerId === nextPlayerId
                        );

                    return {
                        ...currentGame,
                        comebackQueue: remainingQueue,
                        activePlayerIndex: nextPlayerIndex,
                    };
                }

                /*
                 * All comeback turns are finished.
                 */
                const tiedPlayers =
                    currentGame.players.filter(
                        (player) =>
                            player.playerId !==
                            currentGame.provisionalWinnerId &&
                            player.isClosedOut
                    );

                /*
                 * Nobody managed to close.
                 * The provisional winner wins.
                 */
                if (tiedPlayers.length === 0) {
                    return {
                        ...currentGame,
                        comebackQueue: [],
                        phase: "complete",
                        winnerId:
                            currentGame.provisionalWinnerId,
                    };
                }

                /*
                 * At least one opponent closed.
                 * Move into the Bullseye Showdown.
                 *
                 * We'll build the actual showdown
                 * rotation next.
                 */
                const provisionalWinnerIndex = currentGame.players.findIndex(
                    (player) =>
                        player.playerId ===
                        currentGame.provisionalWinnerId
                );

                const showdownPlayers = currentGame.players.filter(
                    (player) =>
                        player.playerId === currentGame.provisionalWinnerId ||
                        tiedPlayers.some(
                            (tiedPlayer) => tiedPlayer.playerId === player.playerId
                        )
                );

                const showdownLeader = showdownPlayers.reduce((leader, player) =>
                    player.showdownBulls > leader.showdownBulls
                        ? player
                        : leader
                );

                return {
                    ...currentGame,
                    comebackQueue: [],
                    showdownQueue: [
                        currentGame.provisionalWinnerId!,
                        ...tiedPlayers.map((player) => player.playerId),
                    ],
                    showdownLeaderId:
                        showdownPlayers.filter(
                            (player) =>
                                player.showdownBulls === showdownLeader.showdownBulls
                        ).length === 1
                            ? showdownLeader.playerId
                            : undefined,
                    phase: "bullseye-showdown",
                    activePlayerIndex: provisionalWinnerIndex,
                };
            }

            if (currentGame.phase === "bullseye-showdown") {
                const currentPlayerId =
                    currentGame.players[currentGame.activePlayerIndex].playerId;

                const currentPlayer =
                    currentGame.players[currentGame.activePlayerIndex];

                const otherShowdownPlayers =
                    currentGame.players.filter(
                        (player) =>
                            currentGame.showdownQueue.includes(player.playerId) &&
                            player.playerId !== currentPlayerId
                    );

                const highestOpponentScore = Math.max(
                    ...otherShowdownPlayers.map(
                        (player) => player.showdownBulls
                    )
                );

                if (currentPlayer.showdownBulls < highestOpponentScore) {
                    const remainingQueue =
                        currentGame.showdownQueue.filter(
                            (playerId) => playerId !== currentPlayerId
                        );

                    if (remainingQueue.length === 1) {
                        return {
                            ...currentGame,
                            showdownQueue: remainingQueue,
                            phase: "complete",
                            winnerId: remainingQueue[0],
                        };
                    }

                    const eliminatedPlayerQueueIndex =
                        currentGame.showdownQueue.indexOf(currentPlayerId);

                    const nextPlayerId =
                        remainingQueue[
                            eliminatedPlayerQueueIndex % remainingQueue.length
                        ];

                    const nextPlayerIndex =
                        currentGame.players.findIndex(
                            (player) => player.playerId === nextPlayerId
                        );

                    return {
                        ...currentGame,
                        showdownQueue: remainingQueue,
                        activePlayerIndex: nextPlayerIndex,
                    };
                }

                const currentQueueIndex =
                    currentGame.showdownQueue.indexOf(currentPlayerId);

                const nextQueueIndex =
                    (currentQueueIndex + 1) % currentGame.showdownQueue.length;

                const nextPlayerId =
                    currentGame.showdownQueue[nextQueueIndex];

                const nextPlayerIndex =
                    currentGame.players.findIndex(
                        (player) => player.playerId === nextPlayerId
                    );

                return {
                    ...currentGame,
                    activePlayerIndex: nextPlayerIndex,
                };
            }

            return currentGame;
        });
    };

    const handleUndo = () => {
        const lastAction = scoreHistory[scoreHistory.length - 1];

        if (!lastAction) return;

        setGame((currentGame) => {
            if (!currentGame) return currentGame;

            const playerIndex = currentGame.players.findIndex(
                (player) => player.playerId === lastAction.playerId
            );

            if (playerIndex === -1) return currentGame;

            const player = currentGame.players[playerIndex];

            if (lastAction.type === "showdown-bull") {
                const updatedPlayer = {
                    ...player,
                    showdownBulls: Math.max(0, player.showdownBulls - 1),
                };

                const updatedPlayers = [...currentGame.players];
                updatedPlayers[playerIndex] = updatedPlayer;

                const showdownPlayers = updatedPlayers.filter((player) =>
                    currentGame.showdownQueue.includes(player.playerId)
                );

                const highestScore = Math.max(
                    ...showdownPlayers.map((player) => player.showdownBulls)
                );

                const leaders = showdownPlayers.filter(
                    (player) => player.showdownBulls === highestScore
                );

                return {
                    ...currentGame,
                    players: updatedPlayers,
                    showdownLeaderId:
                        leaders.length === 1
                            ? leaders[0].playerId
                            : undefined,
                };
            }

            const currentMarks = player.marks[lastAction.target];

            const updatedMarks = {
                ...player.marks,
                [lastAction.target]: Math.max(0, currentMarks - 1),
            };

            const updatedPlayer = {
                ...player,
                marks: updatedMarks,
                isClosedOut: false,
            };

            const updatedPlayers = [...currentGame.players];
            updatedPlayers[playerIndex] = updatedPlayer;

            const wasProvisionalWinner =
                currentGame.provisionalWinnerId === player.playerId;

            return {
                ...currentGame,
                players: updatedPlayers,

                provisionalWinnerId: wasProvisionalWinner
                    ? undefined
                    : currentGame.provisionalWinnerId,

                phase: wasProvisionalWinner
                    ? "normal"
                    : currentGame.phase,

                comebackQueue: wasProvisionalWinner
                    ? []
                    : currentGame.comebackQueue,
            };
        });

        setScoreHistory((history) => history.slice(0, -1));
    };

    const handleEndGame = () => {
        if (game?.phase !== "complete") {
            const confirmed = window.confirm(
                "Are you sure you want to end this game?"
            );

            if (!confirmed) return;
        }

        setScoreHistory([]);
        setGame(null);
        setGamePlayers([]);
        setStep("game-select");
    };

    return (
        <div className="dartsync-app">
            {step === "game-select" && (
                <GameSelect onSelectGame={handleGameSelect} />
            )}

            {step === "player-select" && (
                <PlayerSelect
                    onBack={() => setStep("game-select")}
                    onStartGame={handleStartGame}
                />
            )}

            {step === "scoring" && game && (
                <Scoring game={game}
                    players={gamePlayers}
                    onScoreTarget={handleScoreTarget}
                    onNextPlayer={handleNextPlayer}
                    onEndGame={handleEndGame}
                    onUndo={handleUndo}
                    canUndo={scoreHistory.length > 0} />
            )}
        </div>
    );
}
