import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_REGISTRY, getGameRegistration, type GameId } from "../../games/registry";
import {
  loadPlayerStatistics,
  type HeadToHeadStatistics,
  type PlayerStatistics as PlayerStatisticsRecord,
} from "../../persistence/statisticsApi";
import { requestTurnstileToken } from "../../turnstile";
import "./PlayerStatistics.less";

type PlayerStatisticsProps = {
  onBack: () => void;
  onViewHistory: (playerId: string, playerName: string) => void;
};

type StatisticsFilter = "all" | GameId;

export default function PlayerStatistics({ onBack, onViewHistory }: PlayerStatisticsProps) {
  const [players, setPlayers] = useState<PlayerStatisticsRecord[]>([]);
  const [headToHead, setHeadToHead] = useState<HeadToHeadStatistics[]>([]);
  const [gameFilter, setGameFilter] = useState<StatisticsFilter>("all");
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
          setPlayers(statistics.players);
          setHeadToHead(statistics.headToHead);
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
            <>
            <div className="player-statistics__filters" role="group" aria-label="Filter statistics by game">
              <button
                type="button"
                aria-pressed={gameFilter === "all"}
                onClick={() => setGameFilter("all")}
              >
                All games
              </button>
              {(Object.values(GAME_REGISTRY)).map((game) => (
                <button
                  type="button"
                  aria-pressed={gameFilter === game.id}
                  key={game.id}
                  onClick={() => setGameFilter(game.id as GameId)}
                >
                  {game.name}
                </button>
              ))}
            </div>

            <div className="player-statistics__grid" aria-label={`${players.length} player statistics`}>
              {players.map((player) => {
                const filteredPlayer = gameFilter === "all"
                  ? player
                  : player.byGameType.find((game) => game.gameType === gameFilter);
                const playerTotals = filteredPlayer ?? {
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  winPercentage: 0,
                };
                const matchups = headToHead
                  .filter((record) => record.playerId === player.playerId)
                  .flatMap((record) => {
                    if (gameFilter === "all") return [record];
                    const game = record.byGameType.find((item) => item.gameType === gameFilter);
                    return game ? [{ ...record, ...game }] : [];
                  });
                const rateLabel = gameFilter === "all" ? "lifetime win rate" : "win rate";

                return (
                <article className="player-statistics__card" key={player.playerId}>
                  <div className="player-statistics__player">
                    <span>{player.playerName.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <h2>{player.playerName}</h2>
                      <p>{playerTotals.gamesPlayed === 0 ? "No completed games" : `${playerTotals.winPercentage}% ${rateLabel}`}</p>
                    </div>
                  </div>

                  <dl className="player-statistics__totals">
                    <div><dt>Games</dt><dd>{playerTotals.gamesPlayed}</dd></div>
                    <div><dt>Wins</dt><dd>{playerTotals.wins}</dd></div>
                    <div><dt>Losses</dt><dd>{playerTotals.losses}</dd></div>
                    <div><dt>Win rate</dt><dd>{playerTotals.winPercentage}%</dd></div>
                  </dl>

                  {gameFilter === "all" && player.byGameType.length > 0 && (
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

                  {matchups.length > 0 && (
                    <div className="player-statistics__breakdown">
                      <h3>Head to head</h3>
                      {matchups.map((matchup) => (
                        <div className="player-statistics__matchup" key={matchup.opponentId}>
                          <strong>{matchup.opponentName}</strong>
                          <span>{matchup.wins}W · {matchup.losses}L</span>
                          <em>{matchup.winPercentage}%</em>
                          {matchup.otherWinnerResults > 0 && (
                            <small>
                              {matchup.otherWinnerResults} other-winner {matchup.otherWinnerResults === 1 ? "result" : "results"}
                            </small>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className="player-statistics__history"
                    type="button"
                    onClick={() => onViewHistory(player.playerId, player.playerName)}
                  >
                    View game history
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M4 10h11M11 6l4 4-4 4" />
                    </svg>
                  </button>
                </article>
                );
              })}
            </div>
            </>
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
