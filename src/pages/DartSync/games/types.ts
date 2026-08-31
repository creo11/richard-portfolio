import type { ComponentType } from "react";
import type { Player } from "../types/player";

export type DartboardTarget = number | "bull";
export type GameSetupOptions = Record<string, boolean>;

export type ScoreResult<TGame, TAction> = {
    game: TGame;
    action?: TAction;
};

export type GameEngine<TGame, TTarget, TAction, TOptions> = {
    createGame: (players: Player[], options: TOptions) => TGame;
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

export type GameOptionDefinition = {
    key: string;
    label: string;
    description: string;
    defaultValue: boolean;
};

export type GameDefinition<TGame, TTarget, TAction, TOptions> = {
    id: string;
    name: string;
    description: string;
    image: string;
    imageAlt: string;
    engine: GameEngine<TGame, TTarget, TAction, TOptions>;
    ScoringView: ComponentType<GameScoringViewProps<TGame, TTarget>>;
    RulesView: ComponentType<GameRulesViewProps>;
    options?: GameOptionDefinition[];
};

export type RegisteredGame = {
    id: string;
    name: string;
    description: string;
    image: string;
    imageAlt: string;
    engine: GameEngine<unknown, DartboardTarget, unknown, GameSetupOptions>;
    ScoringView: ComponentType<GameScoringViewProps<unknown, DartboardTarget>>;
    RulesView: ComponentType<GameRulesViewProps>;
    options: GameOptionDefinition[];
};

export function defineGame<
    TGame,
    TTarget extends DartboardTarget,
    TAction,
    TOptions extends object,
>(definition: GameDefinition<TGame, TTarget, TAction, TOptions>): RegisteredGame {
    return {
        ...definition,
        options: definition.options ?? [],
        engine: {
            createGame: (players, options) =>
                definition.engine.createGame(players, options as TOptions),
            scoreTarget: (game, target, multiplier) =>
                definition.engine.scoreTarget(
                    game as TGame,
                    target as TTarget,
                    multiplier
                ),
            nextPlayer: (game) => definition.engine.nextPlayer(game as TGame),
            undo: (game, action) =>
                definition.engine.undo(game as TGame, action as TAction),
        },
        ScoringView: definition.ScoringView as ComponentType<
            GameScoringViewProps<unknown, DartboardTarget>
        >,
    };
}
