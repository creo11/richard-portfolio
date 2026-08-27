import type { DartSyncGame, PlayerGameState } from "../types/game";
import type { Player } from "../types/player";

function createPlayerGameState(player: Player): PlayerGameState {
  return {
    playerId: player.id,
    marks: {
      15: 0,
      16: 0,
      17: 0,
      18: 0,
      19: 0,
      20: 0,
      bull: 0,
    },
    isClosedOut: false,
    showdownBulls: 0,
  };
}

export function createGameState(players: Player[]): DartSyncGame {
  return {
    id: crypto.randomUUID(),
    gameType: "house-cricket",
    phase: "normal",
    activePlayerIndex: 0,
    players: players.map(createPlayerGameState),
  };
}