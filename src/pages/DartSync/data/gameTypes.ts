import { GAME_REGISTRY } from "../games/registry";
import type { GameOptionDefinition } from "../games/types";

export type GameType = {
    id: string;
    name: string;
    description: string;
    image: string;
    imageAlt: string;
    options: GameOptionDefinition[];
  };
  
export const GAME_TYPES: GameType[] = Object.values(GAME_REGISTRY).map(
  ({ id, name, description, image, imageAlt, options }) => ({
    id,
    name,
    description,
    image,
    imageAlt,
    options,
  })
);
