import type { PlayerGameState, TargetKey } from "../../types/game";

type CricketMarksProps = {
  player: PlayerGameState;
  compact?: boolean;
};

const TARGETS: TargetKey[] = [15, 16, 17, 18, 19, 20, "bull"];

function getMark(markCount: number) {
  switch (markCount) {
    case 1:
      return "/";
    case 2:
      return "X";
    case 3:
      return "ⓧ";
    default:
      return "—";
  }
}

export default function CricketMarks({
  player,
  compact = false,
}: CricketMarksProps) {
  return (
    <div
      className={`cricket-marks ${
        compact ? "cricket-marks--compact" : ""
      }`}
    >
      {TARGETS.map((target) => (
        <div className="cricket-marks__target" key={target}>
          <span className="cricket-marks__mark">
            {getMark(player.marks[target])}
          </span>

          <span className="cricket-marks__number">
            {target === "bull" ? "B" : target}
          </span>
        </div>
      ))}
    </div>
  );
}