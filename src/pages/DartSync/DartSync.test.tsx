import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DartSync from "./DartSync";

describe("DartSync scoring flow", () => {
  it("starts a two-player game, records a mark, and undoes it", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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
  });

  it("starts a tied Bullseye Showdown after a successful comeback", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    const confirm = vi.spyOn(window, "confirm");
    await user.click(screen.getByRole("button", { name: "Finish Game" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Select game" })
    ).toBeInTheDocument();
  });

  it("recalculates the showdown leader when a bull is undone", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

  it("records both dartboard bull rings as manual single taps", async () => {
    const user = userEvent.setup();
    const { container } = render(<DartSync />);

    await user.click(screen.getByRole("button", { name: "Select game" }));
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
      screen.getByRole("button", { name: "Bull, 2 of 3 marks" })
    ).toBeInTheDocument();
  });

  it("requires confirmation before ending an active game", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<DartSync />);

    await user.click(screen.getByRole("button", { name: "Select game" }));
    await user.click(screen.getByRole("button", { name: /Rick/ }));
    await user.click(screen.getByRole("button", { name: /Jaie/ }));
    await user.click(screen.getByRole("button", { name: "Start game" }));
    await user.click(screen.getByRole("button", { name: "End Game" }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "End Game" })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "End Game" }));

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("button", { name: "Select game" })
    ).toBeInTheDocument();
  });

  it("rotates through three players and wraps to the first player", async () => {
    const user = userEvent.setup();

    render(<DartSync />);

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));
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

    await user.click(screen.getByRole("button", { name: "Select game" }));

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
});
