import { useEffect, useState } from "react";

import GameSelect from "./components/GameSelect/GameSelect";
import PlayerManagement from "./components/PlayerManagement/PlayerManagement";
import PlayerSelect from "./components/PlayerSelect/PlayerSelect";
import { MOCK_PLAYERS } from "./data/mockPlayers";
import { getGameRegistration } from "./games/registry";

import type { Player } from "./types/player";
import type {
    DartSyncGame,
    TargetKey,
    ScoreAction,
} from "./types/game";

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
    const [game, setGame] = useState<DartSyncGame | null>(null);
    const [scoreHistory, setScoreHistory] = useState<ScoreAction[]>([]);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [randomizeOrder, setRandomizeOrder] = useState(true);
    const [players, setPlayers] = useState<Player[]>(() => [...MOCK_PLAYERS]);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

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

    const handleGameSelect = (gameId: string) => {
        if (!getGameRegistration(gameId)) return;
        setSelectedGameId(gameId);
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

        const newGame = gameRegistration.engine.createGame(orderedPlayers);
        setGame(newGame);

        setStep("scoring");
    };

    const handleScoreTarget = (target: TargetKey, multiplier = 1) => {
        if (!game) return;
        const registration = getGameRegistration(game.gameType);
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

        setGame((currentGame) => {
            if (!currentGame) return currentGame;
            const registration = getGameRegistration(currentGame.gameType);
            return registration
                ? registration.engine.nextPlayer(currentGame)
                : currentGame;
        });
    };

    const handleUndo = () => {
        const lastAction = scoreHistory[scoreHistory.length - 1];

        if (!lastAction) return;

        setGame((currentGame) => {
            if (!currentGame) return currentGame;
            const registration = getGameRegistration(currentGame.gameType);
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
        setStep("game-select");
    };

    const handleBackToGames = () => {
        setSelectedPlayerIds([]);
        setRandomizeOrder(true);
        setSelectedGameId(null);
        setStep("game-select");
    };

    const handleCreatePlayer = (name: string, description?: string) => {
        setPlayers((currentPlayers) => [
            ...currentPlayers,
            {
                id: crypto.randomUUID(),
                name,
                description,
                wins: 0,
                gamesPlayed: 0,
            },
        ]);
    };

    const handleUpdatePlayer = (
        playerId: string,
        name: string,
        description?: string
    ) => {
        setPlayers((currentPlayers) =>
            currentPlayers.map((player) =>
                player.id === playerId
                    ? { ...player, name, description }
                    : player
            )
        );
    };

    const handleResetPlayerStats = (playerId: string) => {
        setPlayers((currentPlayers) =>
            currentPlayers.map((player) =>
                player.id === playerId
                    ? { ...player, wins: 0, gamesPlayed: 0 }
                    : player
            )
        );
    };

    const handleDeletePlayer = (playerId: string) => {
        setPlayers((currentPlayers) =>
            currentPlayers.filter((player) => player.id !== playerId)
        );
        setSelectedPlayerIds((currentIds) =>
            currentIds.filter((id) => id !== playerId)
        );
    };

    const activeGameRegistration = game
        ? getGameRegistration(game.gameType)
        : undefined;
    const ScoringView = activeGameRegistration?.ScoringView;

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
                />
            )}

            {step === "player-select" && (
                <PlayerSelect
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

            {step === "scoring" && game && ScoringView && (
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
