import React, { useState, useEffect } from 'react';
import { useManagedInterval } from '../../utils/timerManager';
import './UnifiedPostQuestion.css';

const UnifiedPostQuestion = ({ 
  explanation, 
  leaderboard, 
  explanationDuration = 10000,
  onComplete,
  gameSettings = {}
}) => {
  const [timeLeft, setTimeLeft] = useState(explanationDuration);
  const [isClosing, setIsClosing] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Determine what to show
  const hasExplanation = explanation && (explanation.title || explanation.text || explanation.image_url);
  const hasLeaderboardData = leaderboard && (leaderboard.answerStats || leaderboard.currentPlayer);

  // Auto-advance logic
  useManagedInterval(
    () => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          // End the display
          setIsClosing(true);
          setTimeout(() => onComplete?.(), 300);
          return 0;
        }
        
        // Show leaderboard in the last 5 seconds if we have explanation
        if (hasExplanation && prev <= 5000 && !showLeaderboard) {
          setShowLeaderboard(true);
        }
        
        return prev - 100;
      });
    },
    100,
    [showLeaderboard, hasExplanation, onComplete]
  );

  // Initialize based on what's available
  useEffect(() => {
    if (hasExplanation) {
      setTimeLeft(explanationDuration);
      setShowLeaderboard(false);
    } else if (hasLeaderboardData) {
      setTimeLeft(5000); // 5 seconds for leaderboard only
      setShowLeaderboard(true);
    } else {
      // Nothing to show, complete immediately
      onComplete?.();
    }
  }, [hasExplanation, hasLeaderboardData, explanationDuration, onComplete]);

  const progressPercent = (timeLeft / explanationDuration) * 100;

  // Don't render if nothing to show
  if (!hasExplanation && !hasLeaderboardData) {
    useEffect(() => {
      onComplete?.();
    }, [onComplete]);
    return null;
  }

  return (
    <div className={`upq-overlay ${isClosing ? 'upq-closing' : ''}`}>
      <div className="upq-container">
        <div className="upq-background-pattern"></div>
        
        {/* Timer Header */}
        <div className="upq-timer-header">
          <div className="upq-timer-circle">
            <svg className="upq-timer-svg" viewBox="0 0 36 36">
              <path
                className="upq-timer-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="upq-timer-progress"
                strokeDasharray={`${progressPercent}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="upq-timer-text">{Math.ceil(timeLeft / 1000)}</span>
          </div>
        </div>

        <div className="upq-content">
          {/* Explanation Section - Always show if available */}
          {hasExplanation && (
            <div className="upq-explanation-section">
              <div className="upq-section-header">
                <div className="upq-section-icon">💡</div>
                <h2 className="upq-section-title">解説</h2>
              </div>

              <div className="upq-explanation-content">
                {explanation.title && (
                  <h3 className="upq-explanation-title">{explanation.title}</h3>
                )}

                <div className="upq-explanation-body">
                  {explanation.image_url && (
                    <div className="upq-explanation-image-container">
                      <img 
                        src={explanation.image_url} 
                        alt={explanation.title || "解説画像"}
                        className="upq-explanation-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {explanation.text && (
                    <div className="upq-explanation-text">
                      {explanation.text.split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Correct answer section */}
                {leaderboard?.correctOption && (
                  <div className="upq-correct-answer">
                    <div className="upq-correct-label">正解</div>
                    <div className="upq-correct-option">{leaderboard.correctOption}</div>
                    {leaderboard.answerStats && (
                      <div className="upq-stats-summary">
                        正解率: <span className="upq-percentage">{leaderboard.answerStats.correctPercentage}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Leaderboard Section - Show when time is up or no explanation */}
          {hasLeaderboardData && (showLeaderboard || !hasExplanation) && (
            <div className="upq-leaderboard-section">
              <div className="upq-section-header">
                <div className="upq-section-icon">🏆</div>
                <h2 className="upq-section-title">ランキング</h2>
              </div>

              <div className="upq-leaderboard-content">
                {/* Answer stats for explanation-less questions */}
                {!hasExplanation && leaderboard?.answerStats && (
                  <div className="upq-answer-stats-compact">
                    <div className="upq-correct-answer-compact">
                      <span className="upq-correct-label-compact">正解:</span>
                      <span className="upq-correct-option-compact">{leaderboard.correctOption}</span>
                      <span className="upq-percentage-compact">({leaderboard.answerStats.correctPercentage}%)</span>
                    </div>
                  </div>
                )}

                {/* Top 5 Players */}
                {leaderboard?.standings && (
                  <div className="upq-top-players">
                    <h3 className="upq-subsection-title">トップ5</h3>
                    <div className="upq-top-players-list">
                      {leaderboard.standings.slice(0, 5).map((player, index) => (
                        <div key={index} className={`upq-player-item rank-${index + 1}`}>
                          <div className="upq-player-rank">#{index + 1}</div>
                          <div className="upq-player-info">
                            <div className="upq-player-name">{player.name}</div>
                            <div className="upq-player-score">{player.score}pts</div>
                          </div>
                          {player.streak > 1 && (
                            <div className="upq-player-streak">🔥{player.streak}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Player Performance */}
                {leaderboard?.currentPlayer && (
                  <div className="upq-current-player">
                    <h3 className="upq-subsection-title">あなたの結果</h3>
                    <div className="upq-player-performance-card">
                      <div className="upq-performance-header">
                        <span className="upq-performance-icon">
                          {leaderboard.currentPlayer.isCorrect ? '✅' : '❌'}
                        </span>
                        <span className="upq-performance-text">
                          {leaderboard.currentPlayer.isCorrect ? '正解！' : '不正解'}
                        </span>
                      </div>
                      <div className="upq-performance-stats">
                        <div className="upq-stat">
                          <span className="upq-stat-label">獲得</span>
                          <span className="upq-stat-value">+{leaderboard.currentPlayer.questionScore || 0}</span>
                        </div>
                        <div className="upq-stat">
                          <span className="upq-stat-label">総スコア</span>
                          <span className="upq-stat-value">{leaderboard.currentPlayer.score}</span>
                        </div>
                        {leaderboard.currentPlayer.streak > 1 && (
                          <div className="upq-stat">
                            <span className="upq-stat-label">連続</span>
                            <span className="upq-stat-value upq-streak">🔥{leaderboard.currentPlayer.streak}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Next indicator */}
        <div className="upq-next-indicator">
          {hasExplanation && !showLeaderboard && (
            <span className="upq-next-text">まもなくランキング表示</span>
          )}
          {(showLeaderboard || !hasExplanation) && (
            <span className="upq-next-text">次の問題へ</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedPostQuestion;
