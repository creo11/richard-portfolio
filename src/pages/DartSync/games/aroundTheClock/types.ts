export const AROUND_THE_CLOCK_TARGETS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    "bull",
] as const;

export type AroundTheClockTarget =
    (typeof AROUND_THE_CLOCK_TARGETS)[number];

export type AroundTheClockOptions = {
    multiplierAdvance: boolean;
};

export type AroundTheClockPlayer = {
    playerId: string;
    targetIndex: number;
};

export type AroundTheClockGame = {
    id: string;
    gameType: "around-the-clock";
    phase: "active" | "complete";
    activePlayerIndex: number;
    players: AroundTheClockPlayer[];
    winnerId?: string;
    options: AroundTheClockOptions;
};

export type AroundTheClockAction = {
    playerId: string;
    type: "advance";
    previousTargetIndex: number;
};
