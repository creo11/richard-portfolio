import { useState } from "react";

import GameSelect from "./components/GameSelect/GameSelect";
import PlayerSelect from "./components/PlayerSelect/PlayerSelect";
import Scoring from "./components/Scoring/Scoring";

import type { Player } from "./types/player";
import type {
    DartSyncGame,
    TargetKey,
    ScoreAction,
} from "./types/game";

import { createGameState } from "./utils/createGameState";

import "./DartSync.less";



type DartSyncStep = "game-select" | "player-select" | "scoring";

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

  const handleGameSelect = (_gameId: string) => {
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

    const newGame = createGameState(orderedPlayers);
    setGame(newGame);

    setStep("scoring");
  };

  const handleScoreTarget = (target: TargetKey) => {
    if (!game) return;
  
    const activePlayerIndex = game.activePlayerIndex;
    const activePlayer = game.players[activePlayerIndex];
    const currentMarks = activePlayer.marks[target];
  
    if (currentMarks >= 3) return;
  
    // Record one history action per scoring tap
    setScoreHistory((history) => [
      ...history,
      {
        playerId: activePlayer.playerId,
        target,
      },
    ]);
  
    const updatedPlayer = {
      ...activePlayer,
      marks: {
        ...activePlayer.marks,
        [target]: currentMarks + 1,
      },
    };
  
    const updatedPlayers = [...game.players];
    updatedPlayers[activePlayerIndex] = updatedPlayer;
  
    setGame({
      ...game,
      players: updatedPlayers,
    });
  };
  
  const handleNextPlayer = () => {
    setScoreHistory([]);
    setGame((currentGame) => {
      if (!currentGame) return currentGame;
  
      return {
        ...currentGame,
        activePlayerIndex:
          (currentGame.activePlayerIndex + 1) %
          currentGame.players.length,
      };
    });
  };

  const handleUndo = () => {
    const lastAction = scoreHistory[scoreHistory.length - 1];
  
    if (!lastAction) return;
  
    setGame((currentGame) => {
      if (!currentGame) return currentGame;
  
      const playerIndex = currentGame.players.findIndex(
        (player) => player.playerId === lastAction.playerId
      );
  
      if (playerIndex === -1) return currentGame;
  
      const player = currentGame.players[playerIndex];
      const currentMarks = player.marks[lastAction.target];
  
      const updatedPlayer = {
        ...player,
        marks: {
          ...player.marks,
          [lastAction.target]: Math.max(0, currentMarks - 1),
        },
      };
  
      const updatedPlayers = [...currentGame.players];
      updatedPlayers[playerIndex] = updatedPlayer;
  
      return {
        ...currentGame,
        players: updatedPlayers,
      };
    });
  
    setScoreHistory((history) => history.slice(0, -1));
  };

  const handleEndGame = () => {
    setScoreHistory([]);
    const confirmed = window.confirm(
      "Are you sure you want to end this game?"
    );
  
    if (!confirmed) return;
  
    setGame(null);
    setGamePlayers([]);
    setStep("game-select");
  };

  return (
    <div className="dartsync-app">
      {step === "game-select" && (
        <GameSelect onSelectGame={handleGameSelect} />
      )}

      {step === "player-select" && (
        <PlayerSelect
          onBack={() => setStep("game-select")}
          onStartGame={handleStartGame}
        />
      )}
      
      {step === "scoring" && game && (
        <Scoring game={game}
                 players={gamePlayers}
                 onScoreTarget={handleScoreTarget}
                 onNextPlayer={handleNextPlayer}
                 onEndGame={handleEndGame}
                 onUndo={handleUndo}
                 canUndo={scoreHistory.length > 0}/>
      )}
    </div>
  );
}