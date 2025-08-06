import React from 'react';

/**
 * LeaderboardOnlyLayout - Layout for questions WITHOUT explanations
 * 
 * Shows:
 * - Leaderboard section (top 5 players, stats, correct answer)
 * - Own result section (player performance)
 */
const LeaderboardOnlyLayout = ({ displayData, timeLeft, progressPercent, isClosing }) => {
  const { leaderboard } = displayData;

  return (
    <div className={`pqd-overlay ${isClosing ? 'pqd-closing' : ''}`}>
      <div className="pqd-container pqd-leaderboard-only">
        
        {/* Timer Header */}
        <div className="pqd-timer-header">
          <div className="pqd-timer-circle">
            <svg className="pqd-timer-svg" viewBox="0 0 36 36">
              <path
                className="pqd-timer-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="pqd-timer-progress"
                strokeDasharray={`${progressPercent}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="pqd-timer-text">{Math.ceil(timeLeft / 1000)}</span>
          </div>
        </div>

        <div className="pqd-content">
          
          {/* Leaderboard Section */}
          <div className="pqd-leaderboard-section">
            <div className="pqd-section-header">
              <div className="pqd-section-icon">🏆</div>
              <h2 className="pqd-section-title">現在のリーダーボード</h2>
            </div>

            <div className="pqd-leaderboard-content">
              {/* Correct Answer for non-explanation questions */}
              <div className="pqd-answer-stats-compact">
                <div className="pqd-correct-answer-compact">
                  <span className="pqd-correct-label-compact">正解:</span>
                  <span className="pqd-correct-option-compact">{leaderboard.correctOption}</span>
                  {leaderboard.answerStats && (
                    <span className="pqd-percentage-compact">({leaderboard.answerStats.correctPercentage}%)</span>
                  )}
                </div>
              </div>

              {/* Top 5 Players */}
              {leaderboard.standings && leaderboard.standings.length > 0 ? (
                <div className="pqd-top-players">
                  <h3 className="pqd-subsection-title">トップ5</h3>
                  <div className="pqd-top-players-list">
                    {leaderboard.standings.slice(0, 5).map((player, index) => (
                      <div key={index} className={`pqd-player-item rank-${index + 1}`}>
                        <div className="pqd-player-rank">#{index + 1}</div>
                        <div className="pqd-player-info">
                          <div className="pqd-player-name">{player.name}</div>
                          <div className="pqd-player-score">{player.score}pts</div>
                        </div>
                        {player.streak > 1 && (
                          <div className="pqd-player-streak">🔥{player.streak}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pqd-no-data">
                  <p>リーダーボードデータを読み込み中...</p>
                </div>
              )}

              {/* Current Player Performance */}
              {leaderboard.currentPlayer && (
                <div className="pqd-own-result-section">
                  <h3 className="pqd-subsection-title">あなたの結果</h3>
                  <div className="pqd-player-performance-card">
                    <div className="pqd-performance-header">
                      <span className="pqd-performance-icon">
                        {leaderboard.currentPlayer.isCorrect ? '✅' : '❌'}
                      </span>
                      <span className="pqd-performance-text">
                        {leaderboard.currentPlayer.isCorrect ? '正解！' : '不正解'}
                      </span>
                    </div>
                    <div className="pqd-performance-stats">
                      <div className="pqd-stat">
                        <span className="pqd-stat-label">獲得</span>
                        <span className="pqd-stat-value">+{leaderboard.currentPlayer.questionScore || 0}</span>
                      </div>
                      <div className="pqd-stat">
                        <span className="pqd-stat-label">総スコア</span>
                        <span className="pqd-stat-value">{leaderboard.currentPlayer.score}</span>
                      </div>
                      {leaderboard.currentPlayer.streak > 1 && (
                        <div className="pqd-stat">
                          <span className="pqd-stat-label">連続</span>
                          <span className="pqd-stat-value pqd-streak">🔥{leaderboard.currentPlayer.streak}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LeaderboardOnlyLayout;
