import { houseRulesEngine } from "./houseRules/engine";

export const GAME_REGISTRY = {
    "house-cricket": {
        id: "house-cricket",
        name: "Rick's House Rules Cricket",
        description:
            "Close 15–20 and Bull. First player to close out wins, with a chance for opponents to force a bullseye showdown.",
        engine: houseRulesEngine,
    },
} as const;

export type GameId = keyof typeof GAME_REGISTRY;

export function getGameRegistration(gameId: string) {
    if (!(gameId in GAME_REGISTRY)) return undefined;
    return GAME_REGISTRY[gameId as GameId];
}
