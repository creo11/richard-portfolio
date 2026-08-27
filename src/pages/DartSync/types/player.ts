export type Player = {
    id: string;
    name: string;
    description?: string;
    wins: number;
    gamesPlayed: number;
    lastWinner?: boolean;
};