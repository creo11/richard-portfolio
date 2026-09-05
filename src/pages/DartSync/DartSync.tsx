import { useEffect, useRef, useState } from "react";

import GameSelect from "./components/GameSelect/GameSelect";
import GameHistory from "./components/GameHistory/GameHistory";
import PlayerManagement from "./components/PlayerManagement/PlayerManagement";
import PlayerSelect from "./components/PlayerSelect/PlayerSelect";
import PlayerStatistics from "./components/PlayerStatistics/PlayerStatistics";
import { MOCK_PLAYERS } from "./data/mockPlayers";
import { getGameRegistration } from "./games/registry";
import type { DartboardTarget, GameSetupOptions } from "./games/types";
import {
    abandonPersistedGame,
    completePersistedGame,
    startPersistedGame,
} from "./persistence/gameApi";
import {
    createPlayer,
    deletePlayer,
    loadPlayers,
    resetPlayerStats,
    updatePlayer,
} from "./persistence/playerApi";

import type { Player } from "./types/player";
import { requestTurnstileToken } from "./turnstile";

import "./DartSync.less";



type DartSyncStep =
    | "game-select"
    | "game-history"
    | "player-statistics"
    | "player-management"
    | "player-select"
    | "scoring";

function shufflePlayers(players: Player[]) {
    const shuffled = [...players];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

export default function DartSync() {
    const [step, setStep] = useState<DartSyncStep>("game-select");
    const [historyPlayer, setHistoryPlayer] = useState<{ id: string; name: string } | null>(null);
    const [gamePlayers, setGamePlayers] = useState<Player[]>([]);
    const [game, setGame] = useState<unknown | null>(null);
    const persistedGameIdRef = useRef<string | null>(null);
    const completionAttemptsRef = useRef(new Set<string>());
    const lifecycleTurnstileRef = useRef<HTMLDivElement>(null);
    const [scoreHistory, setScoreHistory] = useState<unknown[]>([]);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [randomizeOrder, setRandomizeOrder] = useState(true);
    const [players, setPlayers] = useState<Player[]>(() => [...MOCK_PLAYERS]);
    const [playerPersistenceStatus, setPlayerPersistenceStatus] =
        useState<"loading" | "ready" | "fallback">("loading");
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [selectedGameOptions, setSelectedGameOptions] =
        useState<GameSetupOptions>({});
    const [resultPersistenceStatus, setResultPersistenceStatus] =
        useState<"idle" | "saving" | "saved" | "error">("idle");
    const [resultPersistenceError, setResultPersistenceError] = useState("");
    const [resultPersistenceRetry, setResultPersistenceRetry] = useState(0);

    useEffect(() => {
        const existingFavicon = document.querySelector(
            'link[rel="icon"]'
        ) as HTMLLinkElement | null;

        const originalHref = existingFavicon?.href;

        let favicon = existingFavicon;

        if (!favicon) {
            favicon = document.createElement("link");
            favicon.rel = "icon";
            document.head.appendChild(favicon);
        }

        favicon.href = "/dartsync/favicon.svg";

        const manifest = document.createElement("link");
        manifest.rel = "manifest";
        manifest.href = "/dartsync/site.webmanifest";
        document.head.appendChild(manifest);

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/dartsync/sw.js");
        }

        return () => {
            if (originalHref) {
                favicon!.href = originalHref;
            }

            manifest.remove();
        };
    }, []);

    useEffect(() => {
        const persistedGameId = persistedGameIdRef.current;
        const registration = selectedGameId
            ? getGameRegistration(selectedGameId)
            : undefined;
        const persistenceResult = registration && game
            ? registration.getPersistenceResult(game)
            : null;

        if (
            !persistedGameId
            || !persistenceResult
            || !lifecycleTurnstileRef.current
            || completionAttemptsRef.current.has(persistedGameId)
        ) {
            return;
        }

        completionAttemptsRef.current.add(persistedGameId);
        setResultPersistenceStatus("saving");
        setResultPersistenceError("");

        const saveResult = async () => {
            let releaseVerification = () => {};

            try {
                const verification = await requestTurnstileToken(
                    lifecycleTurnstileRef.current!,
                    "game_complete"
                );
                releaseVerification = verification.release;
                await completePersistedGame(
                    persistedGameId,
                    persistenceResult.winnerPlayerId,
                    persistenceResult.results,
                    verification.token
                );
                setResultPersistenceStatus("saved");

                try {
                    setPlayers(await loadPlayers());
                } catch {
                    // The saved result remains valid if refreshing summary stats fails.
                }
            } catch (error) {
                completionAttemptsRef.current.delete(persistedGameId);
                setResultPersistenceStatus("error");
                setResultPersistenceError(
                    error instanceof Error
                        ? error.message
                        : "DartSync could not save the game result."
                );
            } finally {
                releaseVerification();
            }
        };

        void saveResult();
    }, [game, selectedGameId, resultPersistenceRetry]);

    useEffect(() => {
        const controller = new AbortController();

        loadPlayers(controller.signal)
            .then((savedPlayers) => {
                setPlayers(savedPlayers);
                setPlayerPersistenceStatus("ready");
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                setPlayerPersistenceStatus("fallback");
            });

        return () => controller.abort();
    }, []);

    const handleGameSelect = (
        gameId: string,
        options: GameSetupOptions
    ) => {
        if (!getGameRegistration(gameId)) return;
        setSelectedGameId(gameId);
        setSelectedGameOptions(options);
        setStep("player-select");
    };

    const handleStartGame = async (
        players: Player[],
        randomizeOrder: boolean,
        turnstileToken: string
    ) => {
        const orderedPlayers = randomizeOrder
            ? shufflePlayers(players)
            : players;

        const gameRegistration = selectedGameId
            ? getGameRegistration(selectedGameId)
            : undefined;

        if (!gameRegistration) return;

        const newGame = gameRegistration.engine.createGame(
            orderedPlayers,
            selectedGameOptions
        );
        const persistedGame = await startPersistedGame(
            gameRegistration.id,
            selectedGameOptions,
            orderedPlayers.map(({ id }) => id),
            turnstileToken
        );

        setScoreHistory([]);
        setGamePlayers(orderedPlayers);
        persistedGameIdRef.current = persistedGame.id;
        setResultPersistenceStatus("idle");
        setResultPersistenceError("");
        setGame(newGame);

        setStep("scoring");
    };

    const handleScoreTarget = (target: DartboardTarget, multiplier = 1) => {
        if (!game) return;
        const registration = selectedGameId
            ? getGameRegistration(selectedGameId)
            : undefined;
        if (!registration) return;

        const result = registration.engine.scoreTarget(
            game,
            target,
            multiplier
        );

        if (result.action) {
            setScoreHistory((history) => [...history, result.action!]);
        }

        setGame(result.game);
    };

    const handleNextPlayer = () => {
        setScoreHistory([]);

        setGame((currentGame: unknown | null) => {
            if (!currentGame) return currentGame;
            const registration = selectedGameId
                ? getGameRegistration(selectedGameId)
                : undefined;
            return registration
                ? registration.engine.nextPlayer(currentGame)
                : currentGame;
        });
    };

    const handleUndo = () => {
        const lastAction = scoreHistory[scoreHistory.length - 1];

        if (!lastAction) return;

        setGame((currentGame: unknown | null) => {
            if (!currentGame) return currentGame;
            const registration = selectedGameId
                ? getGameRegistration(selectedGameId)
                : undefined;
            return registration
                ? registration.engine.undo(currentGame, lastAction)
                : currentGame;
        });

        setScoreHistory((history) => history.slice(0, -1));
    };

    const resetGame = () => {
        setScoreHistory([]);
        setGame(null);
        persistedGameIdRef.current = null;
        setGamePlayers([]);
        setSelectedPlayerIds([]);
        setRandomizeOrder(true);
        setSelectedGameId(null);
        setSelectedGameOptions({});
        setResultPersistenceStatus("idle");
        setResultPersistenceError("");
        setStep("game-select");
    };

    const handleEndGame = async () => {
        const persistedGameId = persistedGameIdRef.current;
        const registration = selectedGameId
            ? getGameRegistration(selectedGameId)
            : undefined;
        const persistenceResult = registration && game
            ? registration.getPersistenceResult(game)
            : null;

        if (!persistedGameId) {
            resetGame();
            return;
        }

        if (persistenceResult) {
            if (resultPersistenceStatus === "saved") resetGame();
            return;
        }

        if (!lifecycleTurnstileRef.current) return;

        setResultPersistenceStatus("saving");
        setResultPersistenceError("");
        let releaseVerification = () => {};

        try {
            const verification = await requestTurnstileToken(
                lifecycleTurnstileRef.current,
                "game_abandon"
            );
            releaseVerification = verification.release;
            await abandonPersistedGame(
                persistedGameId,
                verification.token
            );
            resetGame();
        } catch (error) {
            setResultPersistenceStatus("error");
            setResultPersistenceError(
                error instanceof Error
                    ? error.message
                    : "DartSync could not end the game."
            );
        } finally {
            releaseVerification();
        }
    };

    const handleBackToGames = () => {
        setSelectedPlayerIds([]);
        setRandomizeOrder(true);
        setSelectedGameId(null);
        setSelectedGameOptions({});
        setStep("game-select");
    };

    const handleCreatePlayer = async (name: string, description: string | undefined, turnstileToken: string) => {
        const player = await createPlayer(name, description, turnstileToken);
        setPlayers((currentPlayers) => [...currentPlayers, player]);
        setPlayerPersistenceStatus("ready");
    };

    const handleUpdatePlayer = async (
        playerId: string,
        name: string,
        description: string | undefined,
        turnstileToken: string
    ) => {
        const updatedPlayer = await updatePlayer(playerId, name, description, turnstileToken);
        setPlayers((currentPlayers) =>
            currentPlayers.map((player) =>
                player.id === playerId
                    ? updatedPlayer
                    : player
            )
        );
    };

    const handleResetPlayerStats = async (playerId: string, turnstileToken: string) => {
        const resetPlayer = await resetPlayerStats(playerId, turnstileToken);
        setPlayers((currentPlayers) =>
            currentPlayers.map((player) =>
                player.id === playerId
                    ? resetPlayer
                    : player
            )
        );
    };

    const handleDeletePlayer = async (playerId: string, turnstileToken: string) => {
        await deletePlayer(playerId, turnstileToken);
        setPlayers((currentPlayers) =>
            currentPlayers.filter((player) => player.id !== playerId)
        );
        setSelectedPlayerIds((currentIds) =>
            currentIds.filter((id) => id !== playerId)
        );
    };

    const selectedGameRegistration = selectedGameId
        ? getGameRegistration(selectedGameId)
        : undefined;
    const ScoringView = selectedGameRegistration?.ScoringView;

    return (
        <div className="dartsync-app">
            {step === "game-select" && (
                <GameSelect
                    onSelectGame={handleGameSelect}
                    onViewHistory={() => {
                        setHistoryPlayer(null);
                        setStep("game-history");
                    }}
                    onViewStatistics={() => setStep("player-statistics")}
                />
            )}

            {step === "game-history" && (
                <GameHistory
                    playerFilter={historyPlayer ?? undefined}
                    onBack={() => setStep(historyPlayer ? "player-statistics" : "game-select")}
                />
            )}

            {step === "player-statistics" && (
                <PlayerStatistics
                    onBack={() => setStep("game-select")}
                    onViewHistory={(id, name) => {
                        setHistoryPlayer({ id, name });
                        setStep("game-history");
                    }}
                />
            )}

            {step === "player-management" && (
                <PlayerManagement
                    players={players}
                    onBack={() => setStep("player-select")}
                    onCreatePlayer={handleCreatePlayer}
                    onUpdatePlayer={handleUpdatePlayer}
                    onResetPlayerStats={handleResetPlayerStats}
                    onDeletePlayer={handleDeletePlayer}
                    persistenceStatus={playerPersistenceStatus}
                />
            )}

            {step === "player-select" && (
                <PlayerSelect
                    gameName={selectedGameRegistration?.name ?? "DartSync"}
                    onBack={handleBackToGames}
                    onManagePlayers={() => setStep("player-management")}
                    onCreatePlayer={handleCreatePlayer}
                    onStartGame={handleStartGame}
                    selectedPlayerIds={selectedPlayerIds}
                    onSelectedPlayerIdsChange={setSelectedPlayerIds}
                    randomizeOrder={randomizeOrder}
                    onRandomizeOrderChange={setRandomizeOrder}
                    players={players}
                />
            )}

            {step === "scoring" && game !== null && ScoringView && (
                <ScoringView game={game}
                    players={gamePlayers}
                    onScoreTarget={handleScoreTarget}
                    onNextPlayer={handleNextPlayer}
                    onEndGame={handleEndGame}
                    onUndo={handleUndo}
                    canUndo={scoreHistory.length > 0}
                    resultPersistenceStatus={resultPersistenceStatus}
                    resultPersistenceError={resultPersistenceError}
                    onRetryResultPersistence={() =>
                        setResultPersistenceRetry((retry) => retry + 1)
                    } />
            )}

            <div
                ref={lifecycleTurnstileRef}
                className="dartsync-app__turnstile"
                aria-live="polite"
            />
        </div>
    );
}
