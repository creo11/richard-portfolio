import { useEffect } from "react";
import { getGameRegistration } from "../../games/registry";
import { AROUND_THE_WORLD_TARGETS } from "../../games/aroundTheWorld/types";
import type { PersistedGameHistoryItem, PersistedGameHistoryParticipant } from "../../persistence/gameApi";

type GameHistoryDetailProps = {
  game: PersistedGameHistoryItem;
  onClose: () => void;
};

const CRICKET_TARGETS = ["15", "16", "17", "18", "19", "20", "bull"];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(startedAt: string, completedAt: string) {
  const durationMs = Math.max(0, Date.parse(completedAt) - Date.parse(startedAt));
  const minutes = Math.max(1, Math.round(durationMs / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${minutes} min`;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function numberFromData(participant: PersistedGameHistoryParticipant, key: string) {
  const value = participant.data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getMarks(participant: PersistedGameHistoryParticipant) {
  const marks = participant.data.marks;
  if (typeof marks !== "object" || marks === null || Array.isArray(marks)) return {};
  return marks as Record<string, unknown>;
}

function formatAroundTarget(targetIndex: number) {
  if (targetIndex >= AROUND_THE_WORLD_TARGETS.length) return "Finished";
  const target = AROUND_THE_WORLD_TARGETS[Math.max(0, targetIndex)];
  return target === "bull" ? "Bull" : `Target ${target}`;
}

export default function GameHistoryDetail({ game, onClose }: GameHistoryDetailProps) {
  const gameName = getGameRegistration(game.gameType)?.name ?? game.gameType;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="game-history-detail"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="game-history-detail__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-history-detail-title"
      >
        <header className="game-history-detail__header">
          <div>
            <span>Completed game</span>
            <h2 id="game-history-detail-title">{gameName}</h2>
          </div>
          <button type="button" aria-label="Close game details" autoFocus onClick={onClose}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        </header>

        <div className="game-history-detail__body">
          <dl className="game-history-detail__summary">
            <div><dt>Started</dt><dd>{formatDateTime(game.startedAt)}</dd></div>
            <div><dt>Completed</dt><dd>{formatDateTime(game.completedAt)}</dd></div>
            <div><dt>Duration</dt><dd>{formatDuration(game.startedAt, game.completedAt)}</dd></div>
            {game.gameType === "around-the-world" && (
              <div>
                <dt>Multiplier advancement</dt>
                <dd>{game.options.multiplierAdvance ? "On" : "Off"}</dd>
              </div>
            )}
          </dl>

          <div className="game-history-detail__results">
            <h3>Player results</h3>
            {game.participants.map((participant) => {
              const marks = getMarks(participant);
              const closedTargets = CRICKET_TARGETS.filter(
                (target) => typeof marks[target] === "number" && marks[target] >= 3
              ).length;
              const targetIndex = numberFromData(participant, "targetIndex");

              return (
                <article
                  className={participant.isWinner ? "game-history-detail__player game-history-detail__player--winner" : "game-history-detail__player"}
                  key={participant.playerId}
                >
                  <div className="game-history-detail__player-heading">
                    <div>
                      <h4>{participant.playerName}</h4>
                      <span>{participant.isWinner ? "Winner" : participant.placement ? `Place ${participant.placement}` : "Participant"}</span>
                    </div>
                    <strong>#{participant.turnOrder + 1} in throwing order</strong>
                  </div>

                  {game.gameType === "around-the-world" && (
                    <div className="game-history-detail__metrics">
                      <div><span>Progress</span><strong>{Math.min(targetIndex, 21)} of 21</strong></div>
                      <div><span>Final target</span><strong>{formatAroundTarget(targetIndex)}</strong></div>
                    </div>
                  )}

                  {game.gameType === "house-cricket" && (
                    <>
                      <div className="game-history-detail__metrics">
                        <div><span>Targets closed</span><strong>{closedTargets} of 7</strong></div>
                        <div><span>Showdown bulls</span><strong>{numberFromData(participant, "showdownBulls")}</strong></div>
                      </div>
                      <div className="game-history-detail__marks" aria-label={`${participant.playerName} Cricket marks`}>
                        {CRICKET_TARGETS.map((target) => (
                          <div key={target}>
                            <span>{target === "bull" ? "Bull" : target}</span>
                            <strong>{typeof marks[target] === "number" ? Math.min(marks[target] as number, 3) : 0}/3</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
