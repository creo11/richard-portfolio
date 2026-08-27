export type TargetKey = 15 | 16 | 17 | 18 | 19 | 20 | "bull";

export type PlayerMarks = Record<TargetKey, number>;

export type GamePhase =
  | "normal"
  | "comeback"
  | "bullseye-showdown"
  | "complete";

export type PlayerGameState = {
  playerId: string;
  marks: PlayerMarks;
  isClosedOut: boolean;
  showdownBulls: number;
};

export type DartSyncGame = {
  id: string;
  gameType: "house-cricket";
  phase: GamePhase;
  activePlayerIndex: number;
  players: PlayerGameState[];
  provisionalWinnerId?: string;
  winnerId?: string;
};

export type ScoreAction = {
    playerId: string;
    target: TargetKey;
};