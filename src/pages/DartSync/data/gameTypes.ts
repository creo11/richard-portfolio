export type GameType = {
    id: string;
    name: string;
    description: string;
  };
  
  export const GAME_TYPES: GameType[] = [
    {
      id: "house-cricket",
      name: "House Rules Cricket",
      description:
        "Close 15–20 and Bull. First player to close out wins, with a chance for opponents to force a bullseye showdown.",
    },
  ];