import { GAME_REGISTRY } from "../games/registry";
import type { GameOptionDefinition } from "../games/types";

export type GameType = {
    id: string;
    name: string;
    description: string;
    options: GameOptionDefinition[];
  };
  
export const GAME_TYPES: GameType[] = Object.values(GAME_REGISTRY).map(
  ({ id, name, description, options }) => ({ id, name, description, options })
);
