import { useEffect, useRef, useState } from "react";
import type { PlayerGameState, TargetKey } from "../../types/game";

type DartBoardProps = {
    player: PlayerGameState;
    onScoreTarget: (target: TargetKey, multiplier?: number) => void;
};

const BOARD_NUMBERS = [
    20, 1, 18, 4, 13,
    6, 10, 15, 2, 17,
    3, 19, 7, 16, 8,
    11, 14, 9, 12, 5,
];

const CRICKET_TARGETS = new Set<number>([
    15, 16, 17, 18, 19, 20,
]);

function polarToCartesian(
    cx: number,
    cy: number,
    radius: number,
    angle: number
) {
    const radians = ((angle - 90) * Math.PI) / 180;

    return {
        x: cx + radius * Math.cos(radians),
        y: cy + radius * Math.sin(radians),
    };
}

function describeRingSegment(
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
) {
    const outerStart = polarToCartesian(
        cx,
        cy,
        outerRadius,
        startAngle
    );

    const outerEnd = polarToCartesian(
        cx,
        cy,
        outerRadius,
        endAngle
    );

    const innerEnd = polarToCartesian(
        cx,
        cy,
        innerRadius,
        endAngle
    );

    const innerStart = polarToCartesian(
        cx,
        cy,
        innerRadius,
        startAngle
    );

    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
        "Z",
    ].join(" ");
}

function getHighlightClass(markCount: number) {
    if (markCount >= 3) return "";
    if (markCount === 2) return "dartboard__segment--one-left";
    if (markCount === 1) return "dartboard__segment--two-left";
    return "dartboard__segment--three-left";
}

function getBullHighlightClass(markCount: number) {
    if (markCount >= 3) return "";
    if (markCount === 2) return "dartboard__bull--one-left";
    if (markCount === 1) return "dartboard__bull--two-left";
    return "dartboard__bull--three-left";
}

export default function DartBoard({
    player,
    onScoreTarget,
}: DartBoardProps) {
    const [scoreFeedback, setScoreFeedback] = useState<{
        label: "DOUBLE" | "TRIPLE";
        key: number;
    } | null>(null);
    const feedbackTimer = useRef<number | undefined>(undefined);
    const cx = 300;
    const cy = 300;

    /*
     * Approximate regulation dartboard proportions.
     *
     * Bull
     * Single inner
     * Triple
     * Single outer
     * Double
     */

    const doubleOuter = 245;
    const doubleInner = 225;

    const tripleOuter = 155;
    const tripleInner = 135;

    const bullOuter = 32;
    const bullInner = 14;

    const numberRadius = 275;

    const showScoreFeedback = (label: "DOUBLE" | "TRIPLE") => {
        window.clearTimeout(feedbackTimer.current);
        setScoreFeedback((current) => ({
            label,
            key: (current?.key ?? 0) + 1,
        }));
        feedbackTimer.current = window.setTimeout(
            () => setScoreFeedback(null),
            650
        );
    };

    useEffect(() => {
        return () => window.clearTimeout(feedbackTimer.current);
    }, []);

    return (
        <svg
            className="dartboard"
            viewBox="0 0 600 600"
            role="img"
            aria-label="Interactive dartboard"
        >
            {/* Board surround */}
            <circle
                cx={cx}
                cy={cy}
                r="292"
                className="dartboard__surround"
            />

            {BOARD_NUMBERS.map((number, index) => {
                const centerAngle = index * 18;
                const startAngle = centerAngle - 9;
                const endAngle = centerAngle + 9;

                const isCricketTarget =
                    CRICKET_TARGETS.has(number);

                const marks = isCricketTarget
                    ? player.marks[number as TargetKey]
                    : null;

                const highlightClass =
                    isCricketTarget && marks !== null
                        ? getHighlightClass(marks)
                        : "";

                const isLightWedge = index % 2 === 0;

                const segmentClass = isLightWedge
                    ? "dartboard__segment--light"
                    : "dartboard__segment--dark";

                const ringClass = isLightWedge
                    ? "dartboard__ring--dark"
                    : "dartboard__ring--light";

                const scoreTarget = (
                    multiplier: 1 | 2 | 3,
                    feedback?: "DOUBLE" | "TRIPLE"
                ) => {
                    if (!isCricketTarget || marks === null) return;

                    if (marks >= 3) return;

                    onScoreTarget(number as TargetKey, multiplier);
                    if (feedback) showScoreFeedback(feedback);
                };

                const numberPosition = polarToCartesian(
                    cx,
                    cy,
                    numberRadius,
                    centerAngle
                );

                return (
                    <g
                        key={number}
                        className={
                            isCricketTarget
                                ? "dartboard__wedge dartboard__wedge--interactive"
                                : "dartboard__wedge"
                        }
                    >
                        {/* Inner single */}
                        <path
                            d={describeRingSegment(
                                cx,
                                cy,
                                bullOuter,
                                tripleInner,
                                startAngle,
                                endAngle
                            )}
                            className={[
                                "dartboard__segment",
                                segmentClass,
                                highlightClass,
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            data-multiplier="1"
                            onClick={() => scoreTarget(1)}
                        />

                        {/* Triple */}
                        <path
                            d={describeRingSegment(
                                cx,
                                cy,
                                tripleInner,
                                tripleOuter,
                                startAngle,
                                endAngle
                            )}
                            className={[
                                "dartboard__ring",
                                ringClass,
                                highlightClass,
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            data-multiplier="3"
                            onClick={() => scoreTarget(3, "TRIPLE")}
                        />

                        {/* Outer single */}
                        <path
                            d={describeRingSegment(
                                cx,
                                cy,
                                tripleOuter,
                                doubleInner,
                                startAngle,
                                endAngle
                            )}
                            className={[
                                "dartboard__segment",
                                segmentClass,
                                highlightClass,
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            data-multiplier="1"
                            onClick={() => scoreTarget(1)}
                        />

                        {/* Double */}
                        <path
                            d={describeRingSegment(
                                cx,
                                cy,
                                doubleInner,
                                doubleOuter,
                                startAngle,
                                endAngle
                            )}
                            className={[
                                "dartboard__ring",
                                ringClass,
                                highlightClass,
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            data-multiplier="2"
                            onClick={() => scoreTarget(2, "DOUBLE")}
                        />

                        {/* Number */}
                        <text
                            x={numberPosition.x}
                            y={numberPosition.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={
                                isCricketTarget &&
                                    marks !== null && marks < 3
                                    ? "dartboard__number dartboard__number--active"
                                    : "dartboard__number"
                            }
                        >
                            {number}
                        </text>
                    </g>
                );
            })}

            {/* Outer bull */}
            <circle
                cx={cx}
                cy={cy}
                r={bullOuter}
                className={[
                    "dartboard__bull",
                    "dartboard__bull--outer",
                    player.marks.bull >= 3 && !player.isClosedOut
                        ? "dartboard__bull--closed"
                        : getBullHighlightClass(player.marks.bull),
                ].join(" ")}
                onClick={() => {
                    if (player.marks.bull < 3 || player.isClosedOut) {
                        onScoreTarget("bull", 1);
                    }
                }}
            />

            {/* Inner bull */}
            <circle
                cx={cx}
                cy={cy}
                r={bullInner}
                className={[
                    "dartboard__bull",
                    "dartboard__bull--inner",
                    player.marks.bull >= 3 && !player.isClosedOut
                        ? "dartboard__bull--closed"
                        : getBullHighlightClass(player.marks.bull),
                ].join(" ")}
                onClick={() => {
                    if (player.marks.bull < 3 || player.isClosedOut) {
                        onScoreTarget("bull", 2);
                        showScoreFeedback("DOUBLE");
                    }
                }}
            />

            {scoreFeedback && (
                <text
                    key={scoreFeedback.key}
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="dartboard__score-feedback"
                >
                    {scoreFeedback.label}
                </text>
            )}
        </svg>
    );
}
