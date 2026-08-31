import type { Player } from "../types/player";

export type ScoreResult<TGame, TAction> = {
    game: TGame;
    action?: TAction;
};

export type GameEngine<TGame, TTarget, TAction> = {
    createGame: (players: Player[]) => TGame;
    scoreTarget: (
        game: TGame,
        target: TTarget,
        multiplier: number
    ) => ScoreResult<TGame, TAction>;
    nextPlayer: (game: TGame) => TGame;
    undo: (game: TGame, action: TAction) => TGame;
};
