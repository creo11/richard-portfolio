import { describe, expect, it } from "vitest";
import type { Player } from "../../types/player";
import { aroundTheClockEngine } from "./engine";

const players: Player[] = [
  { id: "rick", name: "Rick", wins: 0, gamesPlayed: 0 },
  { id: "jaie", name: "Jaie", wins: 0, gamesPlayed: 0 },
];

describe("Around the Clock engine", () => {
  it("uses multipliers to advance and undoes the full dart", () => {
    const game = aroundTheClockEngine.createGame(players, {
      multiplierAdvance: true,
    });
    const result = aroundTheClockEngine.scoreTarget(game, 1, 3);

    expect(result.game.players[0].targetIndex).toBe(3);
    expect(result.game.activePlayerIndex).toBe(0);
    expect(result.action).toBeDefined();

    const undone = aroundTheClockEngine.undo(result.game, result.action!);
    expect(undone.players[0].targetIndex).toBe(0);
  });

  it("advances one target when multiplier advancement is disabled", () => {
    const game = aroundTheClockEngine.createGame(players, {
      multiplierAdvance: false,
    });
    const result = aroundTheClockEngine.scoreTarget(game, 1, 3);

    expect(result.game.players[0].targetIndex).toBe(1);
  });

  it("ignores incorrect targets and advances turns only when requested", () => {
    const game = aroundTheClockEngine.createGame(players, {
      multiplierAdvance: true,
    });
    const ignored = aroundTheClockEngine.scoreTarget(game, 2, 1);

    expect(ignored.action).toBeUndefined();
    expect(ignored.game).toBe(game);

    const nextTurn = aroundTheClockEngine.nextPlayer(game);
    expect(nextTurn.activePlayerIndex).toBe(1);
  });

  it("allows a double 20 to advance through Bull and win", () => {
    const game = aroundTheClockEngine.createGame(players, {
      multiplierAdvance: true,
    });
    game.players[0].targetIndex = 19;

    const result = aroundTheClockEngine.scoreTarget(game, 20, 2);

    expect(result.game.phase).toBe("complete");
    expect(result.game.winnerId).toBe("rick");
  });
});
