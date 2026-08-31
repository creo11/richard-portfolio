import { GAME_REGISTRY } from "../games/registry";

export type GameType = {
    id: string;
    name: string;
    description: string;
  };
  
export const GAME_TYPES: GameType[] = Object.values(GAME_REGISTRY).map(
  ({ id, name, description }) => ({ id, name, description })
);
