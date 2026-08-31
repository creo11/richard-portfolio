export const AROUND_THE_WORLD_TARGETS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    "bull",
] as const;

export type AroundTheWorldTarget =
    (typeof AROUND_THE_WORLD_TARGETS)[number];

export type AroundTheWorldOptions = {
    multiplierAdvance: boolean;
};

export type AroundTheWorldPlayer = {
    playerId: string;
    targetIndex: number;
};

export type AroundTheWorldGame = {
    id: string;
    gameType: "around-the-world";
    phase: "active" | "complete";
    activePlayerIndex: number;
    players: AroundTheWorldPlayer[];
    winnerId?: string;
    options: AroundTheWorldOptions;
};

export type AroundTheWorldAction = {
    playerId: string;
    type: "advance";
    previousTargetIndex: number;
};
