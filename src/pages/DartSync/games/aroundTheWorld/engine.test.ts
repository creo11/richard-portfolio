import { describe, expect, it } from "vitest";
import type { Player } from "../../types/player";
import { aroundTheWorldEngine } from "./engine";

const players: Player[] = [
  { id: "rick", name: "Rick", wins: 0, gamesPlayed: 0 },
  { id: "jaie", name: "Jaie", wins: 0, gamesPlayed: 0 },
];

describe("Around the World engine", () => {
  it("uses multipliers to advance and undoes the full dart", () => {
    const game = aroundTheWorldEngine.createGame(players, {
      multiplierAdvance: true,
    });
    const result = aroundTheWorldEngine.scoreTarget(game, 1, 3);

    expect(result.game.players[0].targetIndex).toBe(3);
    expect(result.game.activePlayerIndex).toBe(0);
    expect(result.action).toBeDefined();

    const undone = aroundTheWorldEngine.undo(result.game, result.action!);
    expect(undone.players[0].targetIndex).toBe(0);
  });

  it("advances one target when multiplier advancement is disabled", () => {
    const game = aroundTheWorldEngine.createGame(players, {
      multiplierAdvance: false,
    });
    const result = aroundTheWorldEngine.scoreTarget(game, 1, 3);

    expect(result.game.players[0].targetIndex).toBe(1);
  });

  it("ignores incorrect targets and advances turns only when requested", () => {
    const game = aroundTheWorldEngine.createGame(players, {
      multiplierAdvance: true,
    });
    const ignored = aroundTheWorldEngine.scoreTarget(game, 2, 1);

    expect(ignored.action).toBeUndefined();
    expect(ignored.game).toBe(game);

    const nextTurn = aroundTheWorldEngine.nextPlayer(game);
    expect(nextTurn.activePlayerIndex).toBe(1);
  });

  it("stops multiplier advancement at Bull instead of ending the game", () => {
    const game = aroundTheWorldEngine.createGame(players, {
      multiplierAdvance: true,
    });
    game.players[0].targetIndex = 19;

    const result = aroundTheWorldEngine.scoreTarget(game, 20, 2);

    expect(result.game.players[0].targetIndex).toBe(20);
    expect(result.game.phase).toBe("active");
    expect(result.game.winnerId).toBeUndefined();
  });

  it("does not let a triple 19 skip the required Bull finish", () => {
    const game = aroundTheWorldEngine.createGame(players, {
      multiplierAdvance: true,
    });
    game.players[0].targetIndex = 18;

    const result = aroundTheWorldEngine.scoreTarget(game, 19, 3);

    expect(result.game.players[0].targetIndex).toBe(20);
    expect(result.game.phase).toBe("active");
  });

  it("ends the game when the current target is hit with a double Bull", () => {
    const game = aroundTheWorldEngine.createGame(players, {
      multiplierAdvance: true,
    });
    game.players[0].targetIndex = 20;

    const result = aroundTheWorldEngine.scoreTarget(game, "bull", 2);

    expect(result.game.phase).toBe("complete");
    expect(result.game.winnerId).toBe("rick");
  });
});
