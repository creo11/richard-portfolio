import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import GameHistory from "./GameHistory";

function historyGame(id: string, winner: string) {
  return {
    id,
    gameType: "around-the-world",
    options: { multiplierAdvance: true },
    startedAt: "2026-09-02T01:00:00.000Z",
    completedAt: "2026-09-02T01:05:00.000Z",
    participants: [{
      playerId: winner.toLowerCase(),
      playerName: winner,
      turnOrder: 0,
      isWinner: true,
      placement: 1,
      data: { targetIndex: 21 },
    }],
  };
}

beforeEach(() => {
  let verificationCallback: ((token: string) => void) | undefined;
  window.turnstile = {
    render: vi.fn((_container, options) => {
      verificationCallback = options.callback;
      return "history-widget";
    }),
    execute: vi.fn(() => verificationCallback?.("history-token")),
    remove: vi.fn(),
  };
});

it("loads additional history pages", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes("cursor=20")) {
      return Response.json({ games: [historyGame("game-2", "Jaie")], nextCursor: null });
    }
    return Response.json({ games: [historyGame("game-1", "Rick")], nextCursor: "20" });
  }));

  render(<GameHistory onBack={vi.fn()} />);

  expect(await screen.findByRole("heading", { level: 2, name: "Rick" }))
    .toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Load More" }));

  expect(await screen.findByRole("heading", { level: 2, name: "Jaie" }))
    .toBeInTheDocument();
  expect(screen.getByLabelText("2 completed games")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Load More" })).not.toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
});
