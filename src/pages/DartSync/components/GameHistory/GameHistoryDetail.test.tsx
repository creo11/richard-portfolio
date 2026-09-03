import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import GameHistoryDetail from "./GameHistoryDetail";

it("shows House Rules Cricket marks and showdown results", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();

  render(
    <GameHistoryDetail
      game={{
        id: "game-1",
        gameType: "house-cricket",
        options: {},
        startedAt: "2026-09-02T01:00:00.000Z",
        completedAt: "2026-09-02T01:08:00.000Z",
        participants: [{
          playerId: "rick",
          playerName: "Rick",
          turnOrder: 0,
          isWinner: true,
          placement: 1,
          data: {
            marks: { 15: 3, 16: 3, 17: 3, 18: 3, 19: 3, 20: 3, bull: 3 },
            isClosedOut: true,
            showdownBulls: 2,
          },
        }],
      }}
      onClose={onClose}
    />
  );

  const dialog = screen.getByRole("dialog", { name: "Rick's House Rules Cricket" });
  expect(within(dialog).getByText("7 of 7")).toBeInTheDocument();
  expect(within(dialog).getByText("Showdown bulls")).toBeInTheDocument();
  expect(within(dialog).getByText("2")).toBeInTheDocument();
  expect(within(dialog).getAllByText("3/3")).toHaveLength(7);

  await user.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledOnce();
});
