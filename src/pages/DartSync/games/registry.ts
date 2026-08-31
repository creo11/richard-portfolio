import Scoring from "../components/Scoring/Scoring";
import AroundTheClockRules from "./aroundTheClock/AroundTheClockRules";
import AroundTheClockScoring from "./aroundTheClock/AroundTheClockScoring";
import { aroundTheClockEngine } from "./aroundTheClock/engine";
import HouseRulesRules from "./houseRules/HouseRulesRules";
import { houseRulesEngine } from "./houseRules/engine";
import { defineGame } from "./types";

export const GAME_REGISTRY = {
    "house-cricket": defineGame({
        id: "house-cricket",
        name: "Rick's House Rules Cricket",
        description:
            "Close 15–20 and Bull. First player to close out wins, with a chance for opponents to force a bullseye showdown.",
        engine: houseRulesEngine,
        ScoringView: Scoring,
        RulesView: HouseRulesRules,
    }),
    "around-the-clock": defineGame({
        id: "around-the-clock",
        name: "Around the Clock",
        description:
            "Race from 1 through 20 and finish on Bull. Only your current target counts.",
        engine: aroundTheClockEngine,
        ScoringView: AroundTheClockScoring,
        RulesView: AroundTheClockRules,
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
