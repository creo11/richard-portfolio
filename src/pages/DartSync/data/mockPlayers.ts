import type { Player } from "../types/player";

export const MOCK_PLAYERS: Player[] = [
  {
    id: "player-1",
    name: "Rick",
    description: "Aggressive closer",
    wins: 18,
    gamesPlayed: 32,
    lastWinner: true,
  },
  {
    id: "player-2",
    name: "Jaie",
    description: "Bullseye specialist",
    wins: 14,
    gamesPlayed: 29,
  },
  {
    id: "player-3",
    name: "Enrique",
    description: "Consistent scorer",
    wins: 11,
    gamesPlayed: 27,
  },
];
