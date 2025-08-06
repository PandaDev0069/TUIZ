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
  const [currentView, setCurrentView] = useState('explanation');

  // Determine what to show
  const hasExplanation = explanation && (explanation.title || explanation.text || explanation.image_url);
  const hasLeaderboard = leaderboard && leaderboard.answerStats;

  // Auto-advance logic
  useManagedInterval(
    () => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          if (currentView === 'explanation' && hasLeaderboard) {
            // Switch to leaderboard
            setCurrentView('leaderboard');
            setTimeLeft(3000); // 3 seconds for leaderboard
            return 3000;
          } else {
            // End the display
            setIsClosing(true);
            setTimeout(() => onComplete?.(), 300);
            return 0;
          }
        }
        return prev - 100;
      });
    },
    100,
    [currentView, hasLeaderboard, onComplete]
  );

  // Initialize view based on what's available
  useEffect(() => {
    if (hasExplanation) {
      setCurrentView('explanation');
      setTimeLeft(explanationDuration);
    } else if (hasLeaderboard) {
      setCurrentView('leaderboard');
      setTimeLeft(3000);
    } else {
      // Nothing to show, complete immediately
      onComplete?.();
    }
  }, [hasExplanation, hasLeaderboard, explanationDuration, onComplete]);

  const progressPercent = (timeLeft / (currentView === 'explanation' ? explanationDuration : 3000)) * 100;

  const renderExplanationView = () => (
    <div className="upq-content-section">
      <div className="upq-header">
        <div className="upq-header-icon">💡</div>
        <h2 className="upq-header-title">解説</h2>
        <div className="upq-timer">
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
  );

  const renderLeaderboardView = () => (
    <div className="upq-content-section">
      <div className="upq-header">
        <div className="upq-header-icon">🏆</div>
        <h2 className="upq-header-title">現在のランキング</h2>
        <div className="upq-timer">
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
      </div>

      <div className="upq-leaderboard-content">
        {leaderboard?.answerStats && (
          <div className="upq-answer-stats">
            <div className="upq-stat-item">
              <span className="upq-stat-label">正解</span>
              <span className="upq-stat-value">{leaderboard.correctOption}</span>
            </div>
            <div className="upq-stat-item">
              <span className="upq-stat-label">正解率</span>
              <span className="upq-stat-value">{leaderboard.answerStats.correctPercentage}%</span>
            </div>
          </div>
        )}

        {leaderboard?.currentPlayer && (
          <div className="upq-player-performance">
            <div className="upq-performance-card">
              <div className="upq-performance-header">
                <span className="upq-performance-icon">
                  {leaderboard.currentPlayer.isCorrect ? '✅' : '❌'}
                </span>
                <span className="upq-performance-text">
                  {leaderboard.currentPlayer.isCorrect ? '正解！' : '不正解'}
                </span>
              </div>
              <div className="upq-performance-details">
                <div className="upq-detail-item">
                  <span className="upq-detail-label">獲得ポイント</span>
                  <span className="upq-detail-value">+{leaderboard.currentPlayer.questionScore || 0}</span>
                </div>
                <div className="upq-detail-item">
                  <span className="upq-detail-label">総スコア</span>
                  <span className="upq-detail-value">{leaderboard.currentPlayer.score}</span>
                </div>
                {leaderboard.currentPlayer.streak > 1 && (
                  <div className="upq-detail-item">
                    <span className="upq-detail-label">連続正解</span>
                    <span className="upq-detail-value upq-streak">🔥 {leaderboard.currentPlayer.streak}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Don't render if nothing to show
  if (!hasExplanation && !hasLeaderboard) {
    useEffect(() => {
      onComplete?.();
    }, [onComplete]);
    return null;
  }

  return (
    <div className={`upq-overlay ${isClosing ? 'upq-closing' : ''}`}>
      <div className="upq-container">
        <div className="upq-background-pattern"></div>
        
        <div className="upq-view-indicator">
          {hasExplanation && (
            <div className={`upq-indicator-dot ${currentView === 'explanation' ? 'active' : ''}`}>
              💡
            </div>
          )}
          {hasLeaderboard && (
            <div className={`upq-indicator-dot ${currentView === 'leaderboard' ? 'active' : ''}`}>
              🏆
            </div>
          )}
        </div>

        {currentView === 'explanation' && hasExplanation && renderExplanationView()}
        {currentView === 'leaderboard' && hasLeaderboard && renderLeaderboardView()}
        
        <div className="upq-next-indicator">
          {currentView === 'explanation' && hasLeaderboard && (
            <span className="upq-next-text">次: ランキング</span>
          )}
          {currentView === 'leaderboard' && (
            <span className="upq-next-text">次の問題へ</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedPostQuestion;
