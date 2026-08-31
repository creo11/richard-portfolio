import type { ComponentType } from "react";
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

export type GameScoringViewProps<TGame, TTarget> = {
    game: TGame;
    players: Player[];
    onScoreTarget: (target: TTarget, multiplier?: number) => void;
    onNextPlayer: () => void;
    onEndGame: () => void;
    onUndo: () => void;
    canUndo: boolean;
};

export type GameRulesViewProps = {
    onClose: () => void;
};

export type GameDefinition<TGame, TTarget, TAction> = {
    id: string;
    name: string;
    description: string;
    engine: GameEngine<TGame, TTarget, TAction>;
    ScoringView: ComponentType<GameScoringViewProps<TGame, TTarget>>;
    RulesView: ComponentType<GameRulesViewProps>;
};
