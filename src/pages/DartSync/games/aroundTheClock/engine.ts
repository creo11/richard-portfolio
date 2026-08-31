import type { Player } from "../../types/player";
import type { GameEngine, ScoreResult } from "../types";
import {
    AROUND_THE_CLOCK_TARGETS,
} from "./types";
import type {
    AroundTheClockAction,
    AroundTheClockGame,
    AroundTheClockOptions,
    AroundTheClockTarget,
} from "./types";

function createGame(
    players: Player[],
    options: AroundTheClockOptions
): AroundTheClockGame {
    return {
        id: crypto.randomUUID(),
        gameType: "around-the-clock",
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
    game: AroundTheClockGame,
    target: AroundTheClockTarget,
    multiplier: number
): ScoreResult<AroundTheClockGame, AroundTheClockAction> {
    if (game.phase === "complete") return { game };

    const player = game.players[game.activePlayerIndex];
    const requiredTarget = AROUND_THE_CLOCK_TARGETS[player.targetIndex];
    if (target !== requiredTarget) return { game };

    const action: AroundTheClockAction = {
        playerId: player.playerId,
        type: "advance",
        previousTargetIndex: player.targetIndex,
    };
    const advancement = game.options.multiplierAdvance
        ? Math.max(1, Math.min(3, multiplier))
        : 1;
    const nextTargetIndex = Math.min(
        AROUND_THE_CLOCK_TARGETS.length,
        player.targetIndex + advancement
    );
    const updatedPlayers = [...game.players];
    updatedPlayers[game.activePlayerIndex] = {
        ...player,
        targetIndex: nextTargetIndex,
    };
    const completed = nextTargetIndex >= AROUND_THE_CLOCK_TARGETS.length;

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

function nextPlayer(game: AroundTheClockGame): AroundTheClockGame {
    if (game.phase === "complete") return game;

    return {
        ...game,
        activePlayerIndex:
            (game.activePlayerIndex + 1) % game.players.length,
    };
}

function undo(
    game: AroundTheClockGame,
    action: AroundTheClockAction
): AroundTheClockGame {
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

export const aroundTheClockEngine: GameEngine<
    AroundTheClockGame,
    AroundTheClockTarget,
    AroundTheClockAction,
    AroundTheClockOptions
> = {
    createGame,
    scoreTarget,
    nextPlayer,
    undo,
};
