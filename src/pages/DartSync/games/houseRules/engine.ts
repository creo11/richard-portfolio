import { hasClosedAllTargets } from "../../types/game";
import type {
    DartSyncGame,
    PlayerGameState,
    ScoreAction,
    TargetKey,
} from "../../types/game";
import type { Player } from "../../types/player";
import type { GameEngine, ScoreResult } from "../types";

function createPlayerGameState(player: Player): PlayerGameState {
    return {
        playerId: player.id,
        marks: {
            15: 0,
            16: 0,
            17: 0,
            18: 0,
            19: 0,
            20: 0,
            bull: 0,
        },
        isClosedOut: false,
        showdownBulls: 0,
    };
}

function createGame(players: Player[]): DartSyncGame {
    return {
        id: crypto.randomUUID(),
        gameType: "house-cricket",
        phase: "normal",
        activePlayerIndex: 0,
        players: players.map(createPlayerGameState),
        comebackQueue: [],
        showdownQueue: [],
    };
}

function scoreTarget(
    game: DartSyncGame,
    target: TargetKey,
    multiplier: number
): ScoreResult<DartSyncGame, ScoreAction> {
    const activePlayerIndex = game.activePlayerIndex;
    const activePlayer = game.players[activePlayerIndex];

    if (activePlayer.isClosedOut) {
        if (target !== "bull") return { game };

        const action: ScoreAction = {
            playerId: activePlayer.playerId,
            target,
            type: "showdown-bull",
            marksAdded: multiplier,
        };
        const updatedPlayer = {
            ...activePlayer,
            showdownBulls: activePlayer.showdownBulls + multiplier,
        };
        const updatedPlayers = [...game.players];
        updatedPlayers[activePlayerIndex] = updatedPlayer;
        const showdownPlayers = updatedPlayers.filter((player) =>
            game.showdownQueue.includes(player.playerId)
        );
        const showdownLeader = showdownPlayers.reduce(
            (leader, player) =>
                !leader || player.showdownBulls > leader.showdownBulls
                    ? player
                    : leader,
            undefined as PlayerGameState | undefined
        );

        return {
            action,
            game: {
                ...game,
                players: updatedPlayers,
                showdownLeaderId:
                    showdownLeader &&
                    showdownPlayers.filter(
                        (player) =>
                            player.showdownBulls === showdownLeader.showdownBulls
                    ).length === 1
                        ? showdownLeader.playerId
                        : undefined,
            },
        };
    }

    const currentMarks = activePlayer.marks[target];
    if (currentMarks >= 3) return { game };

    const marksAdded = Math.min(multiplier, 3 - currentMarks);
    const action: ScoreAction = {
        playerId: activePlayer.playerId,
        target,
        type: "mark",
        marksAdded,
    };
    const updatedPlayer = {
        ...activePlayer,
        marks: {
            ...activePlayer.marks,
            [target]: currentMarks + marksAdded,
        },
    };
    const justClosedOut = hasClosedAllTargets(updatedPlayer);
    const completedPlayer = {
        ...updatedPlayer,
        isClosedOut: justClosedOut,
    };
    const updatedPlayers = [...game.players];
    updatedPlayers[activePlayerIndex] = completedPlayer;
    const isFirstCloseOut = justClosedOut && !game.provisionalWinnerId;
    const comebackQueue = isFirstCloseOut
        ? [
            ...game.players.slice(activePlayerIndex + 1),
            ...game.players.slice(0, activePlayerIndex),
        ].map((player) => player.playerId)
        : game.comebackQueue;

    return {
        action,
        game: {
            ...game,
            players: updatedPlayers,
            provisionalWinnerId: isFirstCloseOut
                ? activePlayer.playerId
                : game.provisionalWinnerId,
            phase: isFirstCloseOut ? "comeback" : game.phase,
            comebackQueue,
        },
    };
}

function nextPlayer(game: DartSyncGame): DartSyncGame {
    if (game.phase === "normal") {
        return {
            ...game,
            activePlayerIndex:
                (game.activePlayerIndex + 1) % game.players.length,
        };
    }

    if (game.phase === "comeback") {
        const activePlayer = game.players[game.activePlayerIndex];
        const isProvisionalWinner =
            activePlayer.playerId === game.provisionalWinnerId;

        if (isProvisionalWinner) {
            const nextPlayerId = game.comebackQueue[0];
            if (!nextPlayerId) return game;

            return {
                ...game,
                activePlayerIndex: game.players.findIndex(
                    (player) => player.playerId === nextPlayerId
                ),
            };
        }

        const remainingQueue = game.comebackQueue.filter(
            (playerId) => playerId !== activePlayer.playerId
        );

        if (remainingQueue.length > 0) {
            const nextPlayerId = remainingQueue[0];
            return {
                ...game,
                comebackQueue: remainingQueue,
                activePlayerIndex: game.players.findIndex(
                    (player) => player.playerId === nextPlayerId
                ),
            };
        }

        const tiedPlayers = game.players.filter(
            (player) =>
                player.playerId !== game.provisionalWinnerId &&
                player.isClosedOut
        );

        if (tiedPlayers.length === 0) {
            return {
                ...game,
                comebackQueue: [],
                phase: "complete",
                winnerId: game.provisionalWinnerId,
            };
        }

        const provisionalWinnerIndex = game.players.findIndex(
            (player) => player.playerId === game.provisionalWinnerId
        );
        const showdownPlayers = game.players.filter(
            (player) =>
                player.playerId === game.provisionalWinnerId ||
                tiedPlayers.some(
                    (tiedPlayer) => tiedPlayer.playerId === player.playerId
                )
        );
        const showdownLeader = showdownPlayers.reduce((leader, player) =>
            player.showdownBulls > leader.showdownBulls ? player : leader
        );

        return {
            ...game,
            comebackQueue: [],
            showdownQueue: [
                game.provisionalWinnerId!,
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

    if (game.phase === "bullseye-showdown") {
        const currentPlayerId = game.players[game.activePlayerIndex].playerId;
        const currentPlayer = game.players[game.activePlayerIndex];
        const otherShowdownPlayers = game.players.filter(
            (player) =>
                game.showdownQueue.includes(player.playerId) &&
                player.playerId !== currentPlayerId
        );
        const highestOpponentScore = Math.max(
            ...otherShowdownPlayers.map((player) => player.showdownBulls)
        );

        if (currentPlayer.showdownBulls < highestOpponentScore) {
            const remainingQueue = game.showdownQueue.filter(
                (playerId) => playerId !== currentPlayerId
            );

            if (remainingQueue.length === 1) {
                return {
                    ...game,
                    showdownQueue: remainingQueue,
                    phase: "complete",
                    winnerId: remainingQueue[0],
                };
            }

            const eliminatedPlayerQueueIndex =
                game.showdownQueue.indexOf(currentPlayerId);
            const nextPlayerId =
                remainingQueue[
                    eliminatedPlayerQueueIndex % remainingQueue.length
                ];

            return {
                ...game,
                showdownQueue: remainingQueue,
                activePlayerIndex: game.players.findIndex(
                    (player) => player.playerId === nextPlayerId
                ),
            };
        }

        const currentQueueIndex = game.showdownQueue.indexOf(currentPlayerId);
        const nextPlayerId =
            game.showdownQueue[
                (currentQueueIndex + 1) % game.showdownQueue.length
            ];

        return {
            ...game,
            activePlayerIndex: game.players.findIndex(
                (player) => player.playerId === nextPlayerId
            ),
        };
    }

    return game;
}

function undo(game: DartSyncGame, action: ScoreAction): DartSyncGame {
    const playerIndex = game.players.findIndex(
        (player) => player.playerId === action.playerId
    );
    if (playerIndex === -1) return game;

    const player = game.players[playerIndex];

    if (action.type === "showdown-bull") {
        const updatedPlayers = [...game.players];
        updatedPlayers[playerIndex] = {
            ...player,
            showdownBulls: Math.max(
                0,
                player.showdownBulls - action.marksAdded
            ),
        };
        const showdownPlayers = updatedPlayers.filter((showdownPlayer) =>
            game.showdownQueue.includes(showdownPlayer.playerId)
        );
        const highestScore = Math.max(
            ...showdownPlayers.map((showdownPlayer) =>
                showdownPlayer.showdownBulls
            )
        );
        const leaders = showdownPlayers.filter(
            (showdownPlayer) =>
                showdownPlayer.showdownBulls === highestScore
        );

        return {
            ...game,
            players: updatedPlayers,
            showdownLeaderId:
                leaders.length === 1 ? leaders[0].playerId : undefined,
        };
    }

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = {
        ...player,
        marks: {
            ...player.marks,
            [action.target]: Math.max(
                0,
                player.marks[action.target] - action.marksAdded
            ),
        },
        isClosedOut: false,
    };
    const wasProvisionalWinner =
        game.provisionalWinnerId === player.playerId;

    return {
        ...game,
        players: updatedPlayers,
        provisionalWinnerId: wasProvisionalWinner
            ? undefined
            : game.provisionalWinnerId,
        phase: wasProvisionalWinner ? "normal" : game.phase,
        comebackQueue: wasProvisionalWinner ? [] : game.comebackQueue,
    };
}

export const houseRulesEngine: GameEngine<
    DartSyncGame,
    TargetKey,
    ScoreAction,
    Record<string, never>
> = {
    createGame,
    scoreTarget,
    nextPlayer,
    undo,
};
