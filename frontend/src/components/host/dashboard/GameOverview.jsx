import { useState } from 'react';
import { 
  FaPlay, 
  FaPause, 
  FaClock, 
  FaQuestionCircle,
  FaUsers,
  FaChartLine,
  FaTrophy,
  FaBolt,
  FaPlus,
  FaMinus
} from 'react-icons/fa';
import './GameOverview.css';

/**
 * GameOverview - Live game overview with current question preview
 * Phase 2.1: Host Dashboard Component
 * 
 * Features:
 * - Current question preview
 * - Player count with animations
 * - Game progress indicator
 * - Performance metrics cards
 * - Timer controls
 */
function GameOverview({ gameState, onTimerAdjust }) {
  const [showTimerControls, setShowTimerControls] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (gameState.totalQuestions === 0) return 0;
    return Math.round((gameState.currentQuestionIndex / gameState.totalQuestions) * 100);
  };

  const handleTimerAdjust = (seconds) => {
    onTimerAdjust(seconds);
    // Visual feedback
    setTimeout(() => setShowTimerControls(false), 2000);
  };

  return (
    <div className="game-overview">
      <div className="game-overview__header">
        <h2 className="game-overview__title">
          <FaPlay className="game-overview__title-icon" />
          ゲーム概要
        </h2>
        
        <div className="game-overview__status">
          <div className={`game-overview__indicator game-overview__indicator--${gameState.status}`}>
            <div className="game-overview__indicator-pulse"></div>
          </div>
          <span className="game-overview__status-text">
            {gameState.status === 'waiting' && 'プレイヤー待機中'}
            {gameState.status === 'active' && '進行中'}
            {gameState.status === 'paused' && '一時停止中'}
            {gameState.status === 'finished' && '終了'}
          </span>
        </div>
      </div>

      <div className="game-overview__content">
        {/* Current Question Preview */}
        <div className="game-overview__question-section">
          <div className="question-preview">
            <div className="question-preview__header">
              <FaQuestionCircle className="question-preview__icon" />
              <span className="question-preview__label">現在の問題</span>
              {gameState.totalQuestions > 0 && (
                <span className="question-preview__counter">
                  {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}
                </span>
              )}
            </div>
            
            <div className="question-preview__content">
              {gameState.currentQuestion ? (
                <>
                  <div className="question-preview__text">
                    {gameState.currentQuestion.text || '問題を読み込み中...'}
                  </div>
                  
                  {gameState.currentQuestion.image && (
                    <div className="question-preview__image">
                      <img 
                        src={gameState.currentQuestion.image} 
                        alt="問題画像"
                        className="question-preview__img"
                      />
                    </div>
                  )}
                  
                  <div className="question-preview__answers">
                    {gameState.currentQuestion.answers?.map((answer, index) => (
                      <div key={index} className="question-preview__answer">
                        <span className="question-preview__answer-label">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="question-preview__answer-text">
                          {answer.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="question-preview__empty">
                  <FaQuestionCircle className="question-preview__empty-icon" />
                  <p>問題が準備されていません</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress and Timer */}
        <div className="game-overview__metrics">
          {/* Game Progress */}
          <div className="metric-card metric-card--progress">
            <div className="metric-card__header">
              <FaChartLine className="metric-card__icon" />
              <span className="metric-card__label">進捗</span>
            </div>
            <div className="metric-card__content">
              <div className="progress-display">
                <div className="progress-display__bar">
                  <div 
                    className="progress-display__fill"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <div className="progress-display__text">
                  {getProgressPercentage()}%
                </div>
              </div>
            </div>
          </div>

          {/* Timer Display */}
          <div className="metric-card metric-card--timer">
            <div className="metric-card__header">
              <FaClock className="metric-card__icon" />
              <span className="metric-card__label">残り時間</span>
              
              {gameState.status === 'active' && (
                <button 
                  className="timer-controls-toggle"
                  onClick={() => setShowTimerControls(!showTimerControls)}
                  title="タイマー調整"
                >
                  <FaBolt className="timer-controls-toggle__icon" />
                </button>
              )}
            </div>
            
            <div className="metric-card__content">
              <div className={`timer-display ${gameState.timeRemaining <= 10 ? 'timer-display--warning' : ''}`}>
                <span className="timer-display__time">
                  {formatTime(gameState.timeRemaining)}
                </span>
                
                {gameState.timeRemaining <= 10 && gameState.status === 'active' && (
                  <div className="timer-display__warning">
                    <FaBolt className="timer-display__warning-icon" />
                  </div>
                )}
              </div>
              
              {showTimerControls && gameState.status === 'active' && (
                <div className="timer-controls">
                  <button 
                    className="timer-control-btn timer-control-btn--subtract"
                    onClick={() => handleTimerAdjust(-10)}
                    title="10秒減らす"
                  >
                    <FaMinus className="timer-control-btn__icon" />
                    10秒
                  </button>
                  
                  <button 
                    className="timer-control-btn timer-control-btn--add"
                    onClick={() => handleTimerAdjust(10)}
                    title="10秒追加"
                  >
                    <FaPlus className="timer-control-btn__icon" />
                    10秒
                  </button>
                  
                  <button 
                    className="timer-control-btn timer-control-btn--add"
                    onClick={() => handleTimerAdjust(30)}
                    title="30秒追加"
                  >
                    <FaPlus className="timer-control-btn__icon" />
                    30秒
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Player Count */}
          <div className="metric-card metric-card--players">
            <div className="metric-card__header">
              <FaUsers className="metric-card__icon" />
              <span className="metric-card__label">参加者</span>
            </div>
            <div className="metric-card__content">
              <div className="player-count-display">
                <span className="player-count-display__number">
                  {gameState.playerCount || 0}
                </span>
                <span className="player-count-display__label">人</span>
              </div>
            </div>
          </div>

          {/* Current Score Leader */}
          <div className="metric-card metric-card--leader">
            <div className="metric-card__header">
              <FaTrophy className="metric-card__icon" />
              <span className="metric-card__label">トップ</span>
            </div>
            <div className="metric-card__content">
              <div className="leader-display">
                {gameState.currentLeader ? (
                  <>
                    <div className="leader-display__name">
                      {gameState.currentLeader.name}
                    </div>
                    <div className="leader-display__score">
                      {gameState.currentLeader.score} pt
                    </div>
                  </>
                ) : (
                  <div className="leader-display__empty">
                    <span>未開始</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameOverview;
