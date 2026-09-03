import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DartSync from "./DartSync";
import { MOCK_PLAYERS } from "./data/mockPlayers";

beforeEach(() => {
  let verificationCallback: ((token: string) => void) | undefined;

  window.turnstile = {
    render: vi.fn((_container, options) => {
      verificationCallback = options.callback;
      return "dartsync-test-widget";
    }),
    execute: vi.fn(() => verificationCallback?.("test-turnstile-token")),
    remove: vi.fn(),
  };

  vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (!init?.method && String(_input) === "/api/dartsync/statistics") {
      return Response.json({
        players: [
          {
            playerId: "rick",
            playerName: "Rick",
            gamesPlayed: 4,
            wins: 3,
            losses: 1,
            winPercentage: 75,
            byGameType: [{
              gameType: "around-the-world",
              gamesPlayed: 2,
              wins: 1,
              losses: 1,
              winPercentage: 50,
            }],
          },
          {
            playerId: "jaie",
            playerName: "Jaie",
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            winPercentage: 0,
            byGameType: [],
          },
        ],
        headToHead: [
          {
            playerId: "rick",
            playerName: "Rick",
            opponentId: "jaie",
            opponentName: "Jaie",
            gamesPlayed: 4,
            wins: 3,
            losses: 1,
            otherWinnerResults: 0,
            winPercentage: 75,
          },
          {
            playerId: "rick",
            playerName: "Rick",
            opponentId: "enrique",
            opponentName: "Enrique",
            gamesPlayed: 2,
            wins: 1,
            losses: 0,
            otherWinnerResults: 1,
            winPercentage: 50,
          },
        ],
      });
    }

    if (!init?.method && String(_input) === "/api/dartsync/games") {
      return Response.json({
        games: [{
          id: "history-game-1",
          gameType: "around-the-world",
          options: { multiplierAdvance: true },
          startedAt: "2026-09-02T01:00:00.000Z",
          completedAt: "2026-09-02T01:05:00.000Z",
          participants: [
            {
              playerId: "rick",
              playerName: "Rick",
              turnOrder: 0,
              isWinner: true,
              placement: 1,
              data: { targetIndex: 21 },
            },
            {
              playerId: "jaie",
              playerName: "Jaie",
              turnOrder: 1,
              isWinner: false,
              placement: null,
              data: { targetIndex: 12 },
            },
          ],
        }],
        nextCursor: null,
      });
    }

    if (
      init?.method === "POST"
      && (String(_input).endsWith("/complete") || String(_input).endsWith("/abandon"))
    ) {
      return new Response(null, { status: 204 });
    }

    if (init?.method === "POST" && String(_input) === "/api/dartsync/games") {
      return Response.json({
        game: {
          id: "game-test",
          gameType: "house-cricket",
          options: {},
          participants: [],
        },
      }, { status: 201 });
    }

    if (init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    if (init?.method === "POST" && String(_input).endsWith("/reset-stats")) {
      const playerId = String(_input).split("/").at(-2);
      const existingPlayer = MOCK_PLAYERS.find(({ id }) => id === playerId);

      return Response.json({
        player: {
          ...existingPlayer,
          wins: 0,
          gamesPlayed: 0,
          lastWinner: false,
        },
      });
    }

    if (init?.method === "POST" || init?.method === "PATCH") {
      const input = JSON.parse(String(init.body)) as {
        name: string;
        description?: string;
      };
      const playerId = init.method === "PATCH"
        ? String(_input).split("/").at(-1)
        : "player-created";
      const existingPlayer = MOCK_PLAYERS.find(({ id }) => id === playerId);

      return Response.json({
        player: {
          ...existingPlayer,
          id: playerId,
          name: input.name,
          description: input.description,
          wins: existingPlayer?.wins ?? 0,
          gamesPlayed: existingPlayer?.gamesPlayed ?? 0,
          lastWinner: false,
        },
      }, { status: 201 });
    }

    return Response.json({ players: MOCK_PLAYERS });
  }));
});

function getGameAction(gameName: string, actionName: string) {
  const heading = screen.getByRole("heading", { level: 2, name: gameName });
  const card = heading.closest("article");

  if (!card) throw new Error(`Could not find the ${gameName} game card`);

  return within(card).getByRole("button", { name: actionName });
}

describe("DartSync scoring flow", () => {
  it("opens player statistics and returns to the game lobby", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(screen.getByRole("button", { name: "Statistics" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Player statistics" })
    ).toBeInTheDocument();
    const statistics = screen.getByLabelText("2 player statistics");
    expect(within(statistics).getByRole("heading", { name: "Rick" }))
      .toBeInTheDocument();
    expect(within(statistics).getByText("75% lifetime win rate"))
      .toBeInTheDocument();
    expect(within(statistics).getByText("1W · 1L"))
      .toBeInTheDocument();
    expect(within(statistics).getByText("3W · 1L"))
      .toBeInTheDocument();
    expect(within(statistics).getByText("Enrique"))
      .toBeInTheDocument();
    expect(within(statistics).getByText("1 other-winner result"))
      .toBeInTheDocument();
    expect(within(statistics).getByText("No completed games"))
      .toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/dartsync/statistics", {
      headers: {
        Accept: "application/json",
        "X-Turnstile-Token": "test-turnstile-token",
      },
      signal: expect.any(AbortSignal),
    });

    await user.click(screen.getByRole("button", { name: "Back to games" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Select a game" })
    ).toBeInTheDocument();
  });

  it("opens completed game history and returns to the game lobby", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(screen.getByRole("button", { name: "Game History" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Game history" })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Rick" })
    ).toBeInTheDocument();
    const historyList = screen.getByLabelText("1 completed games");
    expect(within(historyList).getByText("Around the World")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/dartsync/games", {
      headers: {
        Accept: "application/json",
        "X-Turnstile-Token": "test-turnstile-token",
      },
      signal: expect.any(AbortSignal),
    });

    await user.click(screen.getByRole("button", { name: "View Details" }));
    const detail = screen.getByRole("dialog", { name: "Around the World" });
    expect(within(detail).getByText("Multiplier advancement")).toBeInTheDocument();
    expect(within(detail).getByText("21 of 21")).toBeInTheDocument();
    expect(within(detail).getByText("Finished")).toBeInTheDocument();
    expect(within(detail).getByText("#1 in throwing order")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close game details" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const historySearch = screen.getByRole("searchbox", { name: "Search by player" });
    await user.type(historySearch, "Enrique");
    expect(screen.getByText("No matching games")).toBeInTheDocument();
    await user.clear(historySearch);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Game type" }),
      "house-cricket"
    );
    expect(screen.getByText("No matching games")).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Game type" }),
      "around-the-world"
    );
    expect(screen.getByLabelText("1 completed games")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to games" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Select a game" })
    ).toBeInTheDocument();
  });

  it("renders the selected game's registered rules view", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    expect(
      screen.getByRole("img", { name: "Rick's House Rules dartboard artwork" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Earth viewed from space" })
    ).toBeInTheDocument();

    await user.click(getGameAction("Rick's House Rules Cricket", "View Rules"));

    expect(
      screen.getByRole("dialog", { name: "Rick's House Rules Cricket" })
    ).toBeInTheDocument();
    expect(screen.getByText("Bullseye Showdown")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("plays Around the World with multiplier advancement and manual turns", async () => {
    const user = userEvent.setup();
    const { container } = render(<DartSync />);

    expect(
      screen.getByRole("checkbox", { name: /Multiplier advancement/ })
    ).toBeChecked();
    await user.click(
      getGameAction("Around the World", "View Rules")
    );
    expect(
      screen.getByRole("dialog", { name: "Around the World" })
    ).toBeInTheDocument();
    expect(screen.getByText(/does not record misses/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Got it" }));

    await user.click(
      getGameAction("Around the World", "Select Game")
    );
    expect(
      screen.getByText("Choose at least two players for Around the World.")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    expect(screen.getByText("Around the World")).toBeInTheDocument();
    expect(screen.getByText("Multiplier advancement: On")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Single 1" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Double 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Triple 1" })).toBeInTheDocument();

    const tripleOne = container.querySelector(
      '[data-target="1"][data-multiplier="3"]'
    );
    expect(tripleOne).not.toBeNull();
    await user.click(tripleOne!);

    expect(screen.getByText("TRIPLE")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Single 4" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next Player" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Jaie" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Single 1" })
    ).toBeInTheDocument();
  });

  it("can disable Around the World multiplier advancement", async () => {
    const user = userEvent.setup();
    const { container } = render(<DartSync />);

    await user.click(
      screen.getByRole("checkbox", { name: /Multiplier advancement/ })
    );
    await user.click(
      getGameAction("Around the World", "Select Game")
    );
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    const tripleOne = container.querySelector(
      '[data-target="1"][data-multiplier="3"]'
    );
    expect(tripleOne).not.toBeNull();
    await user.click(tripleOne!);

    expect(screen.getByText("Multiplier advancement: Off")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Score 2" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Double 2" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Triple 2" })
    ).not.toBeInTheDocument();
  });

  it("does not offer a triple when Bull is the Around the World target", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Around the World", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const target of [1, 4, 7, 10, 13, 16, 19]) {
      await user.click(
        screen.getByRole("button", { name: `Triple ${target}` })
      );
    }

    expect(screen.getByRole("button", { name: "Single Bull" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Double Bull" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Triple Bull" })
    ).not.toBeInTheDocument();
  });

  it("opens player management from selection and preserves setup state", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    expect(screen.queryByRole("button", { name: "Manage players" })).not.toBeInTheDocument();
    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Manage players" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Players" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("3 active players")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add player" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3);

    await user.click(
      screen.getByRole("button", { name: "Back to player selection" })
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Select players" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rick/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    ).not.toBeChecked();
  });

  it("validates, persists, and cancels new players", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: "Manage players" }));
    await user.click(screen.getByRole("button", { name: "Add player" }));

    let dialog = screen.getByRole("dialog", { name: "Add a new player" });
    await user.click(within(dialog).getByRole("button", { name: "Create player" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a player name.");

    const nameInput = within(dialog).getByRole("textbox", { name: "Player name" });
    await user.type(nameInput, "Rick");
    await user.click(within(dialog).getByRole("button", { name: "Create player" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i);

    await user.clear(nameInput);
    await user.type(nameInput, "Casey");
    await user.type(
      within(dialog).getByRole("textbox", { name: /Description/ }),
      "Steady finisher"
    );
    await user.click(within(dialog).getByRole("button", { name: "Create player" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("4 active players")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Casey" })).toBeInTheDocument();
    expect(screen.getByText("Steady finisher")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/dartsync/players",
      expect.objectContaining({ method: "POST" })
    );

    await user.click(screen.getByRole("button", { name: "Add player" }));
    dialog = screen.getByRole("dialog", { name: "Add a new player" });
    await user.type(
      within(dialog).getByRole("textbox", { name: "Player name" }),
      "Not saved"
    );
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Not saved")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Back to player selection" })
    );
    expect(screen.getByRole("button", { name: /Casey/ })).toBeInTheDocument();
  });

  it("edits player details while preserving identity, selection, and statistics", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: "Manage players" }));

    await user.click(
      within(screen.getByLabelText("Rick actions")).getByRole("button", {
        name: "Edit",
      })
    );

    let dialog = screen.getByRole("dialog", { name: "Update player details" });
    const nameInput = within(dialog).getByRole("textbox", { name: "Player name" });
    const descriptionInput = within(dialog).getByRole("textbox", { name: /Description/ });

    expect(nameInput).toHaveValue("Rick");
    expect(descriptionInput).toHaveValue("Aggressive closer");

    await user.clear(nameInput);
    await user.type(nameInput, "Enrique");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i);

    await user.clear(nameInput);
    await user.type(nameInput, "Rick James");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Aggressive finisher");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    const updatedHeading = screen.getByRole("heading", {
      level: 2,
      name: "Rick James",
    });
    const updatedCard = updatedHeading.closest("article");
    expect(updatedCard).not.toBeNull();
    expect(within(updatedCard!).getByText("Aggressive finisher")).toBeInTheDocument();
    expect(within(updatedCard!).getByText("18")).toBeInTheDocument();
    expect(within(updatedCard!).getByText("32")).toBeInTheDocument();

    await user.click(
      within(screen.getByLabelText("Rick James actions")).getByRole("button", {
        name: "Edit",
      })
    );
    dialog = screen.getByRole("dialog", { name: "Update player details" });
    await user.clear(within(dialog).getByRole("textbox", { name: "Player name" }));
    await user.type(
      within(dialog).getByRole("textbox", { name: "Player name" }),
      "Not saved"
    );
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { level: 2, name: "Rick James" })).toBeInTheDocument();
    expect(screen.queryByText("Not saved")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Back to player selection" })
    );
    expect(screen.getByRole("button", { name: /Rick James/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("resets player statistics without removing the player or selection", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: "Manage players" }));

    const rickActions = screen.getByLabelText("Rick actions");
    await user.click(within(rickActions).getByRole("button", { name: "Reset stats" }));

    let dialog = screen.getByRole("dialog", { name: "Reset Rick's stats?" });
    expect(within(dialog).getByText(/player will remain available/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    const originalCard = screen.getByRole("heading", { level: 2, name: "Rick" }).closest("article");
    expect(originalCard).not.toBeNull();
    expect(within(originalCard!).getByText("18")).toBeInTheDocument();
    expect(within(originalCard!).getByText("32")).toBeInTheDocument();

    await user.click(
      within(screen.getByLabelText("Rick actions")).getByRole("button", {
        name: "Reset stats",
      })
    );
    dialog = screen.getByRole("dialog", { name: "Reset Rick's stats?" });
    await user.click(within(dialog).getByRole("button", { name: "Reset stats" }));

    const resetCard = screen.getByRole("heading", { level: 2, name: "Rick" }).closest("article");
    expect(resetCard).not.toBeNull();
    expect(within(resetCard!).getAllByText("0")).toHaveLength(2);
    expect(within(resetCard!).getByText("0%")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Back to player selection" })
    );
    expect(screen.getByRole("button", { name: /Rick/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("deletes a player from the active list and current selection", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(screen.getByRole("button", { name: "Manage players" }));

    await user.click(
      within(screen.getByLabelText("Rick actions")).getByRole("button", {
        name: "Delete",
      })
    );

    let dialog = screen.getByRole("dialog", { name: "Delete Rick?" });
    expect(within(dialog).getByText(/game history and results will remain intact/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { level: 2, name: "Rick" })).toBeInTheDocument();

    await user.click(
      within(screen.getByLabelText("Rick actions")).getByRole("button", {
        name: "Delete",
      })
    );
    dialog = screen.getByRole("dialog", { name: "Delete Rick?" });
    await user.click(
      within(dialog).getByRole("button", { name: "Delete player" })
    );

    expect(screen.getByLabelText("2 active players")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Rick" })).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Back to player selection" })
    );
    expect(screen.queryByRole("button", { name: /Rick/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Jaie/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
  });

  it("starts a two-player game, records a mark, and undoes it", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "20, 0 of 3 marks" })
    );

    expect(
      screen.getByRole("button", { name: "20, 1 of 3 marks" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(
      screen.getByRole("button", { name: "20, 0 of 3 marks" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("creates a provisional winner and starts the comeback turn", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    expect(screen.getByText(/Closed Out/)).toBeInTheDocument();
    expect(screen.getByText(/Provisional Winner/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Jaie" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Provisional Winner/)).not.toBeInTheDocument();
  });

  it("returns to normal play when the provisional closing mark is undone", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.queryByText(/Closed Out/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Provisional Winner/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bull, 2 of 3 marks" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next Player" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Jaie" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next Player" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  it("declares the provisional winner after a failed comeback turn", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    await user.click(screen.getByRole("button", { name: "Next Player" }));

    await user.click(
      screen.getByRole("button", { name: "20, 0 of 3 marks" })
    );
    await user.click(
      screen.getByRole("button", { name: "20, 1 of 3 marks" })
    );
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Rick's House Rules Cricket Champion")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finish Game" })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/dartsync/games/game-test/complete",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-Turnstile-Token": "test-turnstile-token",
          }),
        })
      );
    });

    const completionCall = vi.mocked(fetch).mock.calls.find(([input]) =>
      String(input).endsWith("/complete")
    );
    const completionBody = JSON.parse(String(completionCall?.[1]?.body)) as {
      winnerPlayerId: string;
      results: Array<{ playerId: string; data: Record<string, unknown> }>;
    };
    expect(completionBody.winnerPlayerId).toBe(MOCK_PLAYERS[0].id);
    expect(completionBody.results).toHaveLength(2);
    expect(completionBody.results[0]?.data).toEqual(expect.objectContaining({
      marks: expect.any(Object),
      isClosedOut: true,
      showdownBulls: 0,
    }));
  });

  it("starts a tied Bullseye Showdown after a successful comeback", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    await user.click(screen.getByRole("button", { name: "Next Player" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    expect(screen.getByText(/Closed Out/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(screen.getByText("Bullseye Showdown")).toBeInTheDocument();
    expect(screen.getByText("Showdown Leader: Tied")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();
    expect(screen.getByText("Jaie")).toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  it("preserves bulls scored after closing before the formal showdown", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    await user.click(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    );

    expect(screen.getByText("Showdown Bulls: 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next Player" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(screen.getByText("Bullseye Showdown")).toBeInTheDocument();
    expect(screen.getByText("Showdown Bulls: 1")).toBeInTheDocument();
    expect(screen.getByText("Showdown Leader: Rick")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bull, 1 showdown bulls" })
    ).toBeInTheDocument();
  });

  it("continues to the next surviving player after a showdown elimination", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(screen.getByRole("button", { name: /Enrique/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (let player = 0; player < 3; player += 1) {
      for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
        for (let mark = 0; mark < 3; mark += 1) {
          await user.click(
            screen.getByRole("button", {
              name: `${target}, ${mark} of 3 marks`,
            })
          );
        }
      }

      await user.click(screen.getByRole("button", { name: "Next Player" }));
    }

    expect(screen.getByText("Bullseye Showdown")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    );
    await user.click(
      screen.getByRole("button", { name: "Bull, 1 showdown bulls" })
    );
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Jaie" })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    );
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Enrique" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Jaie")).not.toBeInTheDocument();
    expect(screen.getByText("Rick")).toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  it("keeps tied leaders alive when a lower-scoring player is eliminated", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(screen.getByRole("button", { name: /Enrique/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (let player = 0; player < 3; player += 1) {
      for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
        for (let mark = 0; mark < 3; mark += 1) {
          await user.click(
            screen.getByRole("button", {
              name: `${target}, ${mark} of 3 marks`,
            })
          );
        }
      }

      await user.click(screen.getByRole("button", { name: "Next Player" }));
    }

    for (let bull = 0; bull < 2; bull += 1) {
      await user.click(
        screen.getByRole("button", {
          name: `Bull, ${bull} showdown bulls`,
        })
      );
    }
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    for (let bull = 0; bull < 2; bull += 1) {
      await user.click(
        screen.getByRole("button", {
          name: `Bull, ${bull} showdown bulls`,
        })
      );
    }
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(screen.getByText("Showdown Leader: Tied")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    );
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();
    expect(screen.getByText("Showdown Leader: Tied")).toBeInTheDocument();
    expect(screen.getByText("Jaie")).toBeInTheDocument();
    expect(screen.queryByText("Enrique")).not.toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  it("declares the final surviving showdown player as the winner", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(screen.getByRole("button", { name: /Enrique/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (let player = 0; player < 3; player += 1) {
      for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
        for (let mark = 0; mark < 3; mark += 1) {
          await user.click(
            screen.getByRole("button", {
              name: `${target}, ${mark} of 3 marks`,
            })
          );
        }
      }

      await user.click(screen.getByRole("button", { name: "Next Player" }));
    }

    for (let bull = 0; bull < 2; bull += 1) {
      await user.click(
        screen.getByRole("button", {
          name: `Bull, ${bull} showdown bulls`,
        })
      );
    }
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    await user.click(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    );
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    await user.click(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    );
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finish Game" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Finish Game" }));

    expect(
      getGameAction("Rick's House Rules Cricket", "Select Game")
    ).toBeInTheDocument();
  });

  it("recalculates the showdown leader when a bull is undone", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (let player = 0; player < 2; player += 1) {
      for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
        for (let mark = 0; mark < 3; mark += 1) {
          await user.click(
            screen.getByRole("button", {
              name: `${target}, ${mark} of 3 marks`,
            })
          );
        }
      }
      await user.click(screen.getByRole("button", { name: "Next Player" }));
    }

    await user.click(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    );
    expect(screen.getByText("Showdown Leader: Rick")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByText("Showdown Leader: Tied")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    ).toBeInTheDocument();
  });

  it("removes comeback eligibility when a closing mark is undone", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }
    await user.click(screen.getByRole("button", { name: "Next Player" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.queryByText(/Closed Out/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bull, 2 of 3 marks" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next Player" }));
    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();
  });

  it("scores the outer bull as one and the inner bull as two", async () => {
    const user = userEvent.setup();
    const { container } = render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    const outerBull = container.querySelector(".dartboard__bull--outer");
    const innerBull = container.querySelector(".dartboard__bull--inner");

    expect(outerBull).not.toBeNull();
    expect(innerBull).not.toBeNull();

    await user.click(outerBull!);
    expect(
      screen.getByRole("button", { name: "Bull, 1 of 3 marks" })
    ).toBeInTheDocument();

    await user.click(innerBull!);
    expect(
      screen.getByRole("button", { name: "Bull, 3 of 3 marks" })
    ).toBeInTheDocument();
    expect(screen.getByText("DOUBLE")).toBeInTheDocument();
  });

  it("scores ring multipliers, shows feedback, and undoes the full dart", async () => {
    const user = userEvent.setup();
    const { container } = render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    const tripleTwenty = container.querySelector(
      ".dartboard__wedge--interactive [data-multiplier='3']"
    );
    expect(tripleTwenty).not.toBeNull();

    await user.click(tripleTwenty!);

    expect(screen.getByText("TRIPLE")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "20, 3 of 3 marks" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen.getByRole("button", { name: "20, 0 of 3 marks" })
    ).toBeInTheDocument();

    const doubleTwenty = container.querySelector(
      ".dartboard__wedge--interactive [data-multiplier='2']"
    );
    expect(doubleTwenty).not.toBeNull();

    await user.click(doubleTwenty!);

    expect(screen.getByText("DOUBLE")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "20, 2 of 3 marks" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen.getByRole("button", { name: "20, 0 of 3 marks" })
    ).toBeInTheDocument();
  });

  it("scores and undoes a double bull after closing out", async () => {
    const user = userEvent.setup();
    const { container } = render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const target of ["15", "16", "17", "18", "19", "20", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    const innerBull = container.querySelector(".dartboard__bull--inner");
    expect(innerBull).not.toBeNull();
    await user.click(innerBull!);

    expect(screen.getByText("Showdown Bulls: 2")).toBeInTheDocument();
    expect(screen.getByText("DOUBLE")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByText(/Showdown Bulls:/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bull, 0 showdown bulls" })
    ).toBeInTheDocument();
  });

  it("requires modal confirmation before ending an active game", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(screen.getByRole("button", { name: "Start game" }));
    await user.click(screen.getByRole("button", { name: "End Game" }));

    let dialog = screen.getByRole("dialog", { name: "Leave this game?" });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/all recorded marks will be lost/i)
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End Game" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "End Game" }));
    dialog = screen.getByRole("dialog", { name: "Leave this game?" });
    await user.click(within(dialog).getByRole("button", { name: "End Game" }));

    expect(
      getGameAction("Rick's House Rules Cricket", "Select Game")
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/dartsync/games/game-test/abandon",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-Turnstile-Token": "test-turnstile-token",
        },
      }
    );
  });

  it("rotates through three players and wraps to the first player", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(screen.getByRole("button", { name: /Enrique/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (const player of ["Rick", "Jaie", "Enrique"]) {
      expect(
        screen.getByRole("heading", { level: 1, name: player })
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Next Player" }));
    }

    expect(
      screen.getByRole("heading", { level: 1, name: "Rick" })
    ).toBeInTheDocument();
  });

  it("caps Cricket marks at three while allowing showdown bulls to increase", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(
      screen.getByRole("checkbox", { name: /Randomize order/ })
    );
    await user.click(screen.getByRole("button", { name: "Start game" }));

    for (let mark = 0; mark < 3; mark += 1) {
      await user.click(
        screen.getByRole("button", { name: `20, ${mark} of 3 marks` })
      );
    }
    await user.click(screen.getByRole("button", { name: "20, 3 of 3 marks" }));
    expect(
      screen.getByRole("button", { name: "20, 3 of 3 marks" })
    ).toBeInTheDocument();

    for (const target of ["15", "16", "17", "18", "19", "Bull"]) {
      for (let mark = 0; mark < 3; mark += 1) {
        await user.click(
          screen.getByRole("button", {
            name: `${target}, ${mark} of 3 marks`,
          })
        );
      }
    }

    for (let bull = 0; bull < 5; bull += 1) {
      await user.click(
        screen.getByRole("button", {
          name: `Bull, ${bull} showdown bulls`,
        })
      );
    }
    expect(screen.getByText("Showdown Bulls: 5")).toBeInTheDocument();
  });

  it("validates player selection and preserves selections while searching", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));

    const startGame = screen.getByRole("button", { name: "Start game" });
    expect(startGame).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Rick/ }));
    expect(startGame).toBeDisabled();

    await user.type(screen.getByRole("searchbox", { name: "Search players" }), "Jaie");
    expect(screen.queryByRole("button", { name: /Rick/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    expect(startGame).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Clear player search" }));
    expect(screen.getByRole("button", { name: /Rick/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /Jaie/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("stays on player selection when the game cannot be persisted", async () => {
    const user = userEvent.setup();

    render(<DartSync />);
    await user.click(getGameAction("Rick's House Rules Cricket", "Select Game"));
    await screen.findByRole("button", { name: /Rick/ });
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));

    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: "DartSync could not save this game." },
      { status: 500 }
    ));

    await user.click(screen.getByRole("button", { name: "Start game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "DartSync could not save this game."
    );
    expect(screen.getByRole("button", { name: "Start game" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "Select players" })).toBeInTheDocument();
  });
});
