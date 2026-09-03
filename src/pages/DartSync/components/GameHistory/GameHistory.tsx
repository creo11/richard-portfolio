import { useCallback, useEffect, useRef, useState } from "react";
import { getGameRegistration } from "../../games/registry";
import {
  loadPersistedGameHistory,
  type PersistedGameHistoryItem,
} from "../../persistence/gameApi";
import { requestTurnstileToken } from "../../turnstile";
import GameHistoryDetail from "./GameHistoryDetail";
import "./GameHistory.less";

type GameHistoryProps = {
  onBack: () => void;
};

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function GameHistory({ onBack }: GameHistoryProps) {
  const [games, setGames] = useState<PersistedGameHistoryItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedGame, setSelectedGame] = useState<PersistedGameHistoryItem | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  const retry = useCallback(() => setLoadAttempt((attempt) => attempt + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let releaseVerification = () => {};
    let active = true;

    const loadHistory = async () => {
      if (!turnstileContainerRef.current) return;

      setStatus("loading");
      setError("");

      try {
        const verification = await requestTurnstileToken(
          turnstileContainerRef.current,
          "game_history"
        );
        releaseVerification = verification.release;
        const history = await loadPersistedGameHistory(
          verification.token,
          controller.signal
        );

        if (active) {
          setGames(history);
          setStatus("ready");
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        setStatus("error");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "DartSync could not load game history."
        );
      } finally {
        releaseVerification();
        releaseVerification = () => {};
      }
    };

    void loadHistory();

    return () => {
      active = false;
      controller.abort();
      releaseVerification();
    };
  }, [loadAttempt]);

  return (
    <div className="game-history">
      <header className="game-history__header">
        <div className="game-history__header-inner">
          <div className="game-history__topbar">
            <div className="game-history__brand">
              <span className="game-history__logo">
                <img src="/dartsync/favicon.svg" alt="" />
              </span>
              <span>DartSync</span>
            </div>

            <button className="game-history__back" type="button" onClick={onBack}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16 10H5M9 6l-4 4 4 4" />
              </svg>
              Back to games
            </button>
          </div>

          <div className="game-history__intro">
            <span className="game-history__eyebrow">Game records</span>
            <h1>Game history</h1>
            <p>Review completed games and player results.</p>
          </div>
        </div>
      </header>

      <main className="game-history__body">
        <div className="game-history__content">
          {status === "loading" && (
            <div className="game-history__message" role="status">
              <span className="game-history__spinner" aria-hidden="true" />
              Loading game history…
            </div>
          )}

          {status === "error" && (
            <div className="game-history__message game-history__message--error" role="alert">
              <strong>History could not be loaded</strong>
              <p>{error}</p>
              <button type="button" onClick={retry}>Try again</button>
            </div>
          )}

          {status === "ready" && games.length === 0 && (
            <div className="game-history__message">
              <strong>No completed games yet</strong>
              <p>Completed matches will appear here.</p>
            </div>
          )}

          {status === "ready" && games.length > 0 && (
            <div className="game-history__list" aria-label={`${games.length} completed games`}>
              {games.map((game) => {
                const gameName = getGameRegistration(game.gameType)?.name ?? game.gameType;
                const winner = game.participants.find((participant) => participant.isWinner);

                return (
                  <article className="game-history__card" key={game.id}>
                    <div className="game-history__card-heading">
                      <div>
                        <span>{gameName}</span>
                        <h2>{winner?.playerName ?? "Completed game"}</h2>
                        <p>Winner</p>
                      </div>
                      <time dateTime={game.completedAt}>
                        {formatCompletedAt(game.completedAt)}
                      </time>
                    </div>

                    <div className="game-history__participants">
                      {game.participants.map((participant) => (
                        <div
                          className={participant.isWinner ? "game-history__participant game-history__participant--winner" : "game-history__participant"}
                          key={participant.playerId}
                        >
                          <span>{participant.playerName}</span>
                          <strong>
                            {participant.isWinner
                              ? "Winner"
                              : participant.placement
                                ? `Place ${participant.placement}`
                                : "Played"}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="game-history__details"
                      onClick={() => setSelectedGame(game)}
                    >
                      View Details
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <div
        ref={turnstileContainerRef}
        className="game-history__turnstile"
        aria-live="polite"
      />

      {selectedGame && (
        <GameHistoryDetail game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  );
}
