import type { Player } from "../../types/player";
import type { GameEngine, ScoreResult } from "../types";
import {
    AROUND_THE_WORLD_TARGETS,
} from "./types";
import type {
    AroundTheWorldAction,
    AroundTheWorldGame,
    AroundTheWorldOptions,
    AroundTheWorldTarget,
} from "./types";

function createGame(
    players: Player[],
    options: AroundTheWorldOptions
): AroundTheWorldGame {
    return {
        id: crypto.randomUUID(),
        gameType: "around-the-world",
        phase: "active",
        activePlayerIndex: 0,
        players: players.map((player) => ({
            playerId: player.id,
            targetIndex: 0,
        })),
        options,
    };
}

function scoreTarget(
    game: AroundTheWorldGame,
    target: AroundTheWorldTarget,
    multiplier: number
): ScoreResult<AroundTheWorldGame, AroundTheWorldAction> {
    if (game.phase === "complete") return { game };

    const player = game.players[game.activePlayerIndex];
    const requiredTarget = AROUND_THE_WORLD_TARGETS[player.targetIndex];
    if (target !== requiredTarget) return { game };

    const action: AroundTheWorldAction = {
        playerId: player.playerId,
        type: "advance",
        previousTargetIndex: player.targetIndex,
    };
    const advancement = game.options.multiplierAdvance
        ? Math.max(1, Math.min(3, multiplier))
        : 1;
    const bullIndex = AROUND_THE_WORLD_TARGETS.length - 1;
    const completed = requiredTarget === "bull";
    const nextTargetIndex = completed
        ? AROUND_THE_WORLD_TARGETS.length
        : Math.min(bullIndex, player.targetIndex + advancement);
    const updatedPlayers = [...game.players];
    updatedPlayers[game.activePlayerIndex] = {
        ...player,
        targetIndex: nextTargetIndex,
    };
    return {
        action,
        game: {
            ...game,
            players: updatedPlayers,
            phase: completed ? "complete" : "active",
            winnerId: completed ? player.playerId : undefined,
        },
    };
}

function nextPlayer(game: AroundTheWorldGame): AroundTheWorldGame {
    if (game.phase === "complete") return game;

    return {
        ...game,
        activePlayerIndex:
            (game.activePlayerIndex + 1) % game.players.length,
    };
}

function undo(
    game: AroundTheWorldGame,
    action: AroundTheWorldAction
): AroundTheWorldGame {
    const playerIndex = game.players.findIndex(
        (player) => player.playerId === action.playerId
    );
    if (playerIndex === -1) return game;

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        targetIndex: action.previousTargetIndex,
    };

    return {
        ...game,
        players: updatedPlayers,
        activePlayerIndex: playerIndex,
        phase: "active",
        winnerId: undefined,
    };
}

export const aroundTheWorldEngine: GameEngine<
    AroundTheWorldGame,
    AroundTheWorldTarget,
    AroundTheWorldAction,
    AroundTheWorldOptions
> = {
    createGame,
    scoreTarget,
    nextPlayer,
    undo,
};
