import { useEffect, useState } from "react";

import GameSelect from "./components/GameSelect/GameSelect";
import PlayerManagement from "./components/PlayerManagement/PlayerManagement";
import PlayerSelect from "./components/PlayerSelect/PlayerSelect";
import { MOCK_PLAYERS } from "./data/mockPlayers";
import { getGameRegistration } from "./games/registry";
import type { DartboardTarget, GameSetupOptions } from "./games/types";
import {
    createPlayer,
    deletePlayer,
    loadPlayers,
    resetPlayerStats,
    updatePlayer,
} from "./persistence/playerApi";

import type { Player } from "./types/player";

import "./DartSync.less";



type DartSyncStep =
    | "game-select"
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
    const [gamePlayers, setGamePlayers] = useState<Player[]>([]);
    const [game, setGame] = useState<unknown | null>(null);
    const [scoreHistory, setScoreHistory] = useState<unknown[]>([]);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [randomizeOrder, setRandomizeOrder] = useState(true);
    const [players, setPlayers] = useState<Player[]>(() => [...MOCK_PLAYERS]);
    const [playerPersistenceStatus, setPlayerPersistenceStatus] =
        useState<"loading" | "ready" | "fallback">("loading");
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [selectedGameOptions, setSelectedGameOptions] =
        useState<GameSetupOptions>({});

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

    const handleStartGame = (
        players: Player[],
        randomizeOrder: boolean
    ) => {
        setScoreHistory([]);
        const orderedPlayers = randomizeOrder
            ? shufflePlayers(players)
            : players;

        setGamePlayers(orderedPlayers);

        const gameRegistration = selectedGameId
            ? getGameRegistration(selectedGameId)
            : undefined;

        if (!gameRegistration) return;

        const newGame = gameRegistration.engine.createGame(
            orderedPlayers,
            selectedGameOptions
        );
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

    const handleEndGame = () => {
        setScoreHistory([]);
        setGame(null);
        setGamePlayers([]);
        setSelectedPlayerIds([]);
        setRandomizeOrder(true);
        setSelectedGameId(null);
        setSelectedGameOptions({});
        setStep("game-select");
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
                <GameSelect onSelectGame={handleGameSelect} />
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
                    canUndo={scoreHistory.length > 0} />
            )}
        </div>
    );
}
