import { useCallback, useEffect, useRef, useState } from "react";
import { getGameRegistration } from "../../games/registry";
import {
  loadPlayerStatistics,
  type PlayerStatistics as PlayerStatisticsRecord,
} from "../../persistence/statisticsApi";
import { requestTurnstileToken } from "../../turnstile";
import "./PlayerStatistics.less";

type PlayerStatisticsProps = {
  onBack: () => void;
};

export default function PlayerStatistics({ onBack }: PlayerStatisticsProps) {
  const [players, setPlayers] = useState<PlayerStatisticsRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  const retry = useCallback(() => setLoadAttempt((attempt) => attempt + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let releaseVerification = () => {};
    let active = true;

    const loadStatistics = async () => {
      if (!turnstileContainerRef.current) return;
      setStatus("loading");
      setError("");

      try {
        const verification = await requestTurnstileToken(
          turnstileContainerRef.current,
          "statistics_read"
        );
        releaseVerification = verification.release;
        const statistics = await loadPlayerStatistics(
          verification.token,
          controller.signal
        );

        if (active) {
          setPlayers(statistics);
          setStatus("ready");
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        setStatus("error");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "DartSync could not load player statistics."
        );
      } finally {
        releaseVerification();
        releaseVerification = () => {};
      }
    };

    void loadStatistics();

    return () => {
      active = false;
      controller.abort();
      releaseVerification();
    };
  }, [loadAttempt]);

  return (
    <div className="player-statistics">
      <header className="player-statistics__header">
        <div className="player-statistics__header-inner">
          <div className="player-statistics__topbar">
            <div className="player-statistics__brand">
              <span className="player-statistics__logo">
                <img src="/dartsync/favicon.svg" alt="" />
              </span>
              <span>DartSync</span>
            </div>

            <button className="player-statistics__back" type="button" onClick={onBack}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16 10H5M9 6l-4 4 4 4" />
              </svg>
              Back to games
            </button>
          </div>

          <div className="player-statistics__intro">
            <span className="player-statistics__eyebrow">Performance</span>
            <h1>Player statistics</h1>
            <p>Lifetime results since each player&apos;s most recent statistics reset.</p>
          </div>
        </div>
      </header>

      <main className="player-statistics__body">
        <div className="player-statistics__content">
          {status === "loading" && (
            <div className="player-statistics__message" role="status">
              <span className="player-statistics__spinner" aria-hidden="true" />
              Loading player statistics…
            </div>
          )}

          {status === "error" && (
            <div className="player-statistics__message player-statistics__message--error" role="alert">
              <strong>Statistics could not be loaded</strong>
              <p>{error}</p>
              <button type="button" onClick={retry}>Try again</button>
            </div>
          )}

          {status === "ready" && players.length === 0 && (
            <div className="player-statistics__message">
              <strong>No players yet</strong>
              <p>Add players and complete a game to begin tracking statistics.</p>
            </div>
          )}

          {status === "ready" && players.length > 0 && (
            <div className="player-statistics__grid" aria-label={`${players.length} player statistics`}>
              {players.map((player) => (
                <article className="player-statistics__card" key={player.playerId}>
                  <div className="player-statistics__player">
                    <span>{player.playerName.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <h2>{player.playerName}</h2>
                      <p>{player.gamesPlayed === 0 ? "No completed games" : `${player.winPercentage}% lifetime win rate`}</p>
                    </div>
                  </div>

                  <dl className="player-statistics__totals">
                    <div><dt>Games</dt><dd>{player.gamesPlayed}</dd></div>
                    <div><dt>Wins</dt><dd>{player.wins}</dd></div>
                    <div><dt>Losses</dt><dd>{player.losses}</dd></div>
                    <div><dt>Win rate</dt><dd>{player.winPercentage}%</dd></div>
                  </dl>

                  {player.byGameType.length > 0 && (
                    <div className="player-statistics__breakdown">
                      <h3>By game</h3>
                      {player.byGameType.map((game) => (
                        <div className="player-statistics__game" key={game.gameType}>
                          <strong>{getGameRegistration(game.gameType)?.name ?? game.gameType}</strong>
                          <span>{game.wins}W · {game.losses}L</span>
                          <em>{game.winPercentage}%</em>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <div
        ref={turnstileContainerRef}
        className="player-statistics__turnstile"
        aria-live="polite"
      />
    </div>
  );
}
