import { useState } from 'react';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaStepForward,
  FaRedo,
  FaClock,
  FaBolt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCog
} from 'react-icons/fa';
import './QuickActions.css';

/**
 * QuickActions - Quick Action Panel with game controls
 * Phase 2.1: Host Dashboard Component
 * 
 * Features:
 * - Pause/Resume controls
 * - Skip question button
 * - Emergency stop
 * - Timer adjustments
 * - Question navigation
 */
function QuickActions({ gameState, onPauseResume, onSkipQuestion, onTimerAdjust }) {
  const [showConfirmSkip, setShowConfirmSkip] = useState(false);
  const [showTimerAdjust, setShowTimerAdjust] = useState(false);

  const canPause = gameState.status === 'active';
  const canResume = gameState.status === 'paused';
  const canSkip = gameState.status === 'active' && gameState.currentQuestion;
  const canAdjustTimer = gameState.status === 'active';

  const handleSkipConfirm = () => {
    onSkipQuestion();
    setShowConfirmSkip(false);
  };

  const handleTimerAdjust = (seconds) => {
    onTimerAdjust(seconds);
    setShowTimerAdjust(false);
  };

  return (
    <div className="quick-actions">
      <div className="quick-actions__header">
        <h3 className="quick-actions__title">
          <FaBolt className="quick-actions__title-icon" />
          クイック操作
        </h3>
        
        <div className="quick-actions__status">
          <div className={`quick-actions__indicator quick-actions__indicator--${gameState.status}`}>
            {gameState.status === 'active' && <FaPlay />}
            {gameState.status === 'paused' && <FaPause />}
            {gameState.status === 'waiting' && <FaClock />}
            {gameState.status === 'finished' && <FaCheckCircle />}
          </div>
        </div>
      </div>

      <div className="quick-actions__content">
        {/* Primary Game Controls */}
        <div className="quick-actions__section">
          <h4 className="quick-actions__section-title">ゲーム制御</h4>
          
          <div className="quick-actions__controls">
            {/* Pause/Resume Button */}
            <button 
              className={`quick-action-btn quick-action-btn--primary ${
                canPause ? 'quick-action-btn--pause' : 'quick-action-btn--resume'
              }`}
              onClick={onPauseResume}
              disabled={!canPause && !canResume}
              title={canPause ? 'ゲームを一時停止' : 'ゲームを再開'}
            >
              {canPause ? (
                <>
                  <FaPause className="quick-action-btn__icon" />
                  <span className="quick-action-btn__text">一時停止</span>
                </>
              ) : (
                <>
                  <FaPlay className="quick-action-btn__icon" />
                  <span className="quick-action-btn__text">再開</span>
                </>
              )}
            </button>

            {/* Skip Question Button */}
            <button 
              className="quick-action-btn quick-action-btn--warning"
              onClick={() => setShowConfirmSkip(true)}
              disabled={!canSkip}
              title="現在の問題をスキップ"
            >
              <FaStepForward className="quick-action-btn__icon" />
              <span className="quick-action-btn__text">問題スキップ</span>
            </button>

            {/* Restart Question Button */}
            <button 
              className="quick-action-btn quick-action-btn--secondary"
              disabled={gameState.status !== 'active'}
              title="現在の問題をやり直し"
            >
              <FaRedo className="quick-action-btn__icon" />
              <span className="quick-action-btn__text">やり直し</span>
            </button>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="quick-actions__section">
          <h4 className="quick-actions__section-title">タイマー制御</h4>
          
          <div className="quick-actions__controls">
            <button 
              className="quick-action-btn quick-action-btn--timer"
              onClick={() => setShowTimerAdjust(!showTimerAdjust)}
              disabled={!canAdjustTimer}
              title="タイマー調整"
            >
              <FaClock className="quick-action-btn__icon" />
              <span className="quick-action-btn__text">時間調整</span>
            </button>
          </div>

          {/* Timer Adjustment Controls */}
          {showTimerAdjust && canAdjustTimer && (
            <div className="timer-adjustment-panel">
              <div className="timer-adjustment-panel__header">
                <span className="timer-adjustment-panel__title">時間調整</span>
                <span className="timer-adjustment-panel__current">
                  現在: {Math.floor(gameState.timeRemaining / 60)}:{(gameState.timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              <div className="timer-adjustment-panel__controls">
                <button 
                  className="timer-adjust-btn timer-adjust-btn--subtract"
                  onClick={() => handleTimerAdjust(-30)}
                  title="30秒減らす"
                >
                  -30秒
                </button>
                
                <button 
                  className="timer-adjust-btn timer-adjust-btn--subtract"
                  onClick={() => handleTimerAdjust(-10)}
                  title="10秒減らす"
                >
                  -10秒
                </button>
                
                <button 
                  className="timer-adjust-btn timer-adjust-btn--add"
                  onClick={() => handleTimerAdjust(10)}
                  title="10秒追加"
                >
                  +10秒
                </button>
                
                <button 
                  className="timer-adjust-btn timer-adjust-btn--add"
                  onClick={() => handleTimerAdjust(30)}
                  title="30秒追加"
                >
                  +30秒
                </button>
                
                <button 
                  className="timer-adjust-btn timer-adjust-btn--add"
                  onClick={() => handleTimerAdjust(60)}
                  title="1分追加"
                >
                  +1分
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Controls */}
        <div className="quick-actions__section">
          <h4 className="quick-actions__section-title">詳細操作</h4>
          
          <div className="quick-actions__controls">
            <button 
              className="quick-action-btn quick-action-btn--info"
              title="ゲーム設定を開く"
            >
              <FaCog className="quick-action-btn__icon" />
              <span className="quick-action-btn__text">設定</span>
            </button>

            <button 
              className="quick-action-btn quick-action-btn--danger"
              title="ゲームを緊急停止"
              disabled={gameState.status === 'finished'}
            >
              <FaStop className="quick-action-btn__icon" />
              <span className="quick-action-btn__text">緊急停止</span>
            </button>
          </div>
        </div>

        {/* Game Status Info */}
        <div className="quick-actions__info">
          <div className="game-status-info">
            <div className="game-status-info__item">
              <span className="game-status-info__label">状態:</span>
              <span className={`game-status-info__value game-status-info__value--${gameState.status}`}>
                {gameState.status === 'waiting' && '待機中'}
                {gameState.status === 'active' && '進行中'}
                {gameState.status === 'paused' && '一時停止'}
                {gameState.status === 'finished' && '終了'}
              </span>
            </div>
            
            {gameState.currentQuestion && (
              <div className="game-status-info__item">
                <span className="game-status-info__label">問題:</span>
                <span className="game-status-info__value">
                  {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}
                </span>
              </div>
            )}
            
            <div className="game-status-info__item">
              <span className="game-status-info__label">残り時間:</span>
              <span className={`game-status-info__value ${gameState.timeRemaining <= 10 ? 'game-status-info__value--warning' : ''}`}>
                {Math.floor(gameState.timeRemaining / 60)}:{(gameState.timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Skip Confirmation Modal */}
      {showConfirmSkip && (
        <div className="quick-actions-modal-overlay">
          <div className="quick-actions-modal">
            <div className="quick-actions-modal__header">
              <FaExclamationTriangle className="quick-actions-modal__icon" />
              <h4 className="quick-actions-modal__title">問題スキップの確認</h4>
            </div>
            
            <div className="quick-actions-modal__content">
              <p>現在の問題をスキップしますか？</p>
              <p>プレイヤーの回答は保存され、次の問題に進みます。</p>
            </div>
            
            <div className="quick-actions-modal__actions">
              <button 
                className="quick-action-btn quick-action-btn--outline"
                onClick={() => setShowConfirmSkip(false)}
              >
                キャンセル
              </button>
              <button 
                className="quick-action-btn quick-action-btn--warning"
                onClick={handleSkipConfirm}
              >
                <FaStepForward className="quick-action-btn__icon" />
                スキップ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickActions;
