import Scoring from "../components/Scoring/Scoring";
import aroundTheWorldImage from "../../../assets/dartSync/game-images/around-the-world.webp";
import houseCricketImage from "../../../assets/dartSync/game-images/house-cricket.webp";
import AroundTheWorldRules from "./aroundTheWorld/AroundTheWorldRules";
import AroundTheWorldScoring from "./aroundTheWorld/AroundTheWorldScoring";
import { aroundTheWorldEngine } from "./aroundTheWorld/engine";
import HouseRulesRules from "./houseRules/HouseRulesRules";
import { houseRulesEngine } from "./houseRules/engine";
import { defineGame } from "./types";

export const GAME_REGISTRY = {
    "house-cricket": defineGame({
        id: "house-cricket",
        name: "Rick's House Rules Cricket",
        description:
            "Close 15–20 and Bull. First player to close out wins, with a chance for opponents to force a bullseye showdown.",
        image: houseCricketImage,
        imageAlt: "Rick's House Rules dartboard artwork",
        engine: houseRulesEngine,
        getPersistenceResult: (game) => {
            if (game.phase !== "complete" || !game.winnerId) return null;

            return {
                winnerPlayerId: game.winnerId,
                results: game.players.map((player) => ({
                    playerId: player.playerId,
                    placement: player.playerId === game.winnerId ? 1 : null,
                    data: {
                        marks: player.marks,
                        isClosedOut: player.isClosedOut,
                        showdownBulls: player.showdownBulls,
                    },
                })),
            };
        },
        ScoringView: Scoring,
        RulesView: HouseRulesRules,
    }),
    "around-the-world": defineGame({
        id: "around-the-world",
        name: "Around the World",
        description:
            "Race from 1 through 20 and finish on Bull. Only your current target counts.",
        image: aroundTheWorldImage,
        imageAlt: "Earth viewed from space",
        engine: aroundTheWorldEngine,
        getPersistenceResult: (game) => {
            if (game.phase !== "complete" || !game.winnerId) return null;

            return {
                winnerPlayerId: game.winnerId,
                results: game.players.map((player) => ({
                    playerId: player.playerId,
                    placement: player.playerId === game.winnerId ? 1 : null,
                    data: { targetIndex: player.targetIndex },
                })),
            };
        },
        ScoringView: AroundTheWorldScoring,
        RulesView: AroundTheWorldRules,
        options: [
            {
                key: "multiplierAdvance",
                label: "Multiplier advancement",
                description: "Doubles skip 2 targets and triples skip 3.",
                defaultValue: true,
            },
        ],
    }),
} as const;

export type GameId = keyof typeof GAME_REGISTRY;

export function getGameRegistration(gameId: string) {
    if (!(gameId in GAME_REGISTRY)) return undefined;
    return GAME_REGISTRY[gameId as GameId];
}
