import type { PlayerGameState, TargetKey } from "../../types/game";

type CricketMarksProps = {
  player: PlayerGameState;
  compact?: boolean;
};

const TARGETS: TargetKey[] = [15, 16, 17, 18, 19, 20, "bull"];

function getMark(markCount: number) {
  switch (markCount) {
    case 1:
      return "1";
    case 2:
      return "2";
    case 3:
      return "3";
    default:
      return "0";
  }
}

export default function CricketMarks({
  player,
  compact = false,
}: CricketMarksProps) {
  return (
    <div
      className={`cricket-marks ${compact ? "cricket-marks--compact" : ""
        }`}
    >
      {TARGETS.map((target) => (
        <div
          className="cricket-marks__target"
          key={target}
          aria-label={`${target === "bull" ? "Bull" : target}: ${player.marks[target]} of 3 marks`}
        >
          <span
            className={`cricket-marks__mark cricket-marks__mark--${getMark(
              player.marks[target]
            )}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              aria-hidden="true"
            >
              <path
                className="state-3"
                d="M25,128c0-23.9,8.19-45.93,21.9-63.42l-17.81-17.81C10.91,68.86,0,97.16,0,128s10.91,59.14,29.08,81.24l17.81-17.81c-13.71-17.5-21.9-39.52-21.9-63.42ZM226.92,46.76l-17.81,17.81c13.71,17.5,21.9,39.52,21.9,63.42s-8.19,45.93-21.9,63.42l17.81,17.81c18.17-22.1,29.08-50.39,29.08-81.24s-10.91-59.14-29.08-81.24ZM128,25c23.9,0,45.93,8.19,63.42,21.9l17.81-17.81C187.14,10.91,158.84,0,128,0s-59.14,10.91-81.24,29.08l17.81,17.81c17.5-13.71,39.52-21.9,63.42-21.9ZM128,231c-23.9,0-45.93-8.19-63.42-21.9l-17.81,17.81c22.1,18.17,50.39,29.08,81.24,29.08s59.14-10.91,81.24-29.08l-17.81-17.81c-17.5,13.71-39.52,21.9-63.42,21.9Z"
              />

              <path
                className="state-2"
                d="M46.9,191.42l-17.81,17.81c5.3,6.45,11.23,12.37,17.68,17.68l17.81-17.81,63.42-63.42-17.68-17.68-63.42,63.42ZM209.24,29.08l-17.81,17.81-63.42,63.42,17.68,17.68,63.42-63.42,17.81-17.81c-5.3-6.45-11.23-12.37-17.68-17.68Z"
              />

              <path
                className="state-1"
                d="M209.1,191.42l-63.42-63.42-17.68-17.68-63.42-63.42-17.81-17.81c-6.45,5.3-12.37,11.23-17.68,17.68l17.81,17.81,63.42,63.42,17.68,17.68,63.42,63.42,17.81,17.81c6.45-5.3,12.37-11.23,17.68-17.68l-17.81-17.81Z"
              />
            </svg>
          </span>

          <span className="cricket-marks__number">
            {target === "bull" ? "B" : target}
          </span>
        </div>
      ))}
    </div>
  );
}
