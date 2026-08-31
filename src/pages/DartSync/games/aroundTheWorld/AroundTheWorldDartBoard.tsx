import { useEffect, useRef, useState } from "react";
import {
  BOARD_NUMBERS,
  describeRingSegment,
  polarToCartesian,
} from "../../components/Scoring/dartboardGeometry";
import type { AroundTheWorldTarget } from "./types";

type AroundTheWorldDartBoardProps = {
  currentTarget: AroundTheWorldTarget;
  onScoreTarget: (target: AroundTheWorldTarget, multiplier?: number) => void;
};

export default function AroundTheWorldDartBoard({
  currentTarget,
  onScoreTarget,
}: AroundTheWorldDartBoardProps) {
  const [feedback, setFeedback] = useState<{
    label: "DOUBLE" | "TRIPLE";
    key: number;
  } | null>(null);
  const feedbackTimer = useRef<number | undefined>(undefined);
  const cx = 300;
  const cy = 300;
  const doubleOuter = 245;
  const doubleInner = 225;
  const tripleOuter = 155;
  const tripleInner = 135;
  const bullOuter = 32;
  const bullInner = 14;
  const numberRadius = 275;

  const showFeedback = (label: "DOUBLE" | "TRIPLE") => {
    window.clearTimeout(feedbackTimer.current);
    setFeedback((current) => ({ label, key: (current?.key ?? 0) + 1 }));
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 650);
  };

  useEffect(() => {
    return () => window.clearTimeout(feedbackTimer.current);
  }, []);

  return (
    <svg
      className="dartboard"
      viewBox="0 0 600 600"
      role="img"
      aria-label="Around the World dartboard"
    >
      <circle cx={cx} cy={cy} r="292" className="dartboard__surround" />

      {BOARD_NUMBERS.map((number, index) => {
        const centerAngle = index * 18;
        const startAngle = centerAngle - 9;
        const endAngle = centerAngle + 9;
        const active = currentTarget === number;
        const highlightClass = active
          ? "dartboard__segment--three-left"
          : "";
        const segmentClass = index % 2 === 0
          ? "dartboard__segment--light"
          : "dartboard__segment--dark";
        const ringClass = index % 2 === 0
          ? "dartboard__ring--dark"
          : "dartboard__ring--light";
        const numberPosition = polarToCartesian(
          cx,
          cy,
          numberRadius,
          centerAngle
        );
        const score = (
          multiplier: 1 | 2 | 3,
          label?: "DOUBLE" | "TRIPLE"
        ) => {
          if (!active) return;
          onScoreTarget(number as AroundTheWorldTarget, multiplier);
          if (label) showFeedback(label);
        };

        return (
          <g
            key={number}
            className={active
              ? "dartboard__wedge dartboard__wedge--interactive"
              : "dartboard__wedge"}
          >
            <path
              d={describeRingSegment(cx, cy, bullOuter, tripleInner, startAngle, endAngle)}
              className={["dartboard__segment", segmentClass, highlightClass].filter(Boolean).join(" ")}
              data-target={number}
              data-multiplier="1"
              onClick={() => score(1)}
            />
            <path
              d={describeRingSegment(cx, cy, tripleInner, tripleOuter, startAngle, endAngle)}
              className={["dartboard__ring", ringClass, highlightClass].filter(Boolean).join(" ")}
              data-target={number}
              data-multiplier="3"
              onClick={() => score(3, "TRIPLE")}
            />
            <path
              d={describeRingSegment(cx, cy, tripleOuter, doubleInner, startAngle, endAngle)}
              className={["dartboard__segment", segmentClass, highlightClass].filter(Boolean).join(" ")}
              data-target={number}
              data-multiplier="1"
              onClick={() => score(1)}
            />
            <path
              d={describeRingSegment(cx, cy, doubleInner, doubleOuter, startAngle, endAngle)}
              className={["dartboard__ring", ringClass, highlightClass].filter(Boolean).join(" ")}
              data-target={number}
              data-multiplier="2"
              onClick={() => score(2, "DOUBLE")}
            />
            <text
              x={numberPosition.x}
              y={numberPosition.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={active
                ? "dartboard__number dartboard__number--active"
                : "dartboard__number"}
            >
              {number}
            </text>
          </g>
        );
      })}

      <circle
        cx={cx}
        cy={cy}
        r={bullOuter}
        className={[
          "dartboard__bull",
          "dartboard__bull--outer",
          currentTarget === "bull" ? "dartboard__bull--three-left" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => {
          if (currentTarget === "bull") onScoreTarget("bull", 1);
        }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={bullInner}
        className={[
          "dartboard__bull",
          "dartboard__bull--inner",
          currentTarget === "bull" ? "dartboard__bull--three-left" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => {
          if (currentTarget === "bull") {
            onScoreTarget("bull", 2);
            showFeedback("DOUBLE");
          }
        }}
      />

      {feedback && (
        <text
          key={feedback.key}
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="dartboard__score-feedback"
        >
          {feedback.label}
        </text>
      )}
    </svg>
  );
}
