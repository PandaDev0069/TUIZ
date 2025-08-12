import { useState, useEffect } from 'react';
import { 
  FaPlay, 
  FaPause, 
  FaStepForward, 
  FaStepBackward, 
  FaRedo,
  FaClock,
  FaPlus,
  FaMinus,
  FaStop,
  FaSave,
  FaList,
  FaCog,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaBolt,
  FaEdit,
  FaEye,
  FaBookmark
} from 'react-icons/fa';
import './GameControlPanel.css';

/**
 * GameControlPanel - Comprehensive Game Management Interface
 * Phase 2.2: Core Control Panel
 * 
 * Features:
 * - Playback Controls (Play/Pause/Skip/Previous/Restart)
 * - Timer Management (Add/Remove time, custom settings)
 * - Question Navigation (Sidebar, jump to question, notes)
 * - Game State Controls (Emergency stop, save checkpoint)
 */
function GameControlPanel({ 
  gameState, 
  onGameAction, 
  questions = [], 
  socket,
  isGameActive = false 
}) {
  // Component state
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [showTimerControls, setShowTimerControls] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [customTimerValue, setCustomTimerValue] = useState(30);
  const [confirmAction, setConfirmAction] = useState(null);
  const [questionNotes, setQuestionNotes] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState(new Set());

  // Timer state
  const [currentTimer, setCurrentTimer] = useState(gameState?.timeRemaining || 30);
  const [timerRunning, setTimerRunning] = useState(false);

  // Question navigation state
  const [selectedQuestion, setSelectedQuestion] = useState(gameState?.currentQuestionIndex || 0);

  useEffect(() => {
    if (socket) {
      // Listen for timer updates
      socket.on('timer-update', handleTimerUpdate);
      socket.on('game-state-update', handleGameStateUpdate);
      socket.on('question-changed', handleQuestionChanged);

      return () => {
        socket.off('timer-update');
        socket.off('game-state-update');
        socket.off('question-changed');
      };
    }
  }, [socket]);

  // Event handlers
  const handleTimerUpdate = (data) => {
    setCurrentTimer(data.timeRemaining);
    setTimerRunning(data.isRunning);
  };

  const handleGameStateUpdate = (data) => {
    if (onGameAction) {
      onGameAction('state-update', data);
    }
  };

  const handleQuestionChanged = (data) => {
    setSelectedQuestion(data.questionIndex);
  };

  // Game control actions
  const handlePlayPause = () => {
    const action = gameState?.status === 'active' ? 'pause' : 'resume';
    executeGameAction(action);
  };

  const handleSkipQuestion = () => {
    if (gameState?.currentQuestionIndex < questions.length - 1) {
      executeGameAction('skip-question');
    }
  };

  const handlePreviousQuestion = () => {
    if (gameState?.currentQuestionIndex > 0) {
      executeGameAction('previous-question');
    }
  };

  const handleRestartQuestion = () => {
    setConfirmAction({
      type: 'restart-question',
      title: '問題をリスタート',
      message: '現在の問題を最初からやり直しますか？プレイヤーの回答はリセットされます。',
      confirmText: 'リスタート',
      action: () => executeGameAction('restart-question')
    });
  };

  const handleTimerAdjustment = (adjustment) => {
    const newTime = Math.max(5, Math.min(300, currentTimer + adjustment));
    executeGameAction('adjust-timer', { time: newTime });
  };

  const handleCustomTimer = () => {
    if (customTimerValue >= 5 && customTimerValue <= 300) {
      executeGameAction('set-timer', { time: customTimerValue });
      setShowTimerControls(false);
    }
  };

  const handleEmergencyStop = () => {
    setConfirmAction({
      type: 'emergency-stop',
      title: '緊急停止',
      message: 'ゲームを緊急停止しますか？この操作は取り消せません。',
      confirmText: '緊急停止',
      action: () => executeGameAction('emergency-stop'),
      danger: true
    });
  };

  const handleSaveCheckpoint = () => {
    executeGameAction('save-checkpoint');
  };

  const handleJumpToQuestion = (questionIndex) => {
    if (questionIndex !== gameState?.currentQuestionIndex) {
      setConfirmAction({
        type: 'jump-question',
        title: '問題にジャンプ',
        message: `問題 ${questionIndex + 1} にジャンプしますか？現在の進行状況は保存されます。`,
        confirmText: 'ジャンプ',
        action: () => executeGameAction('jump-to-question', { questionIndex })
      });
    }
  };

  const handleMarkQuestion = (questionIndex) => {
    const newMarked = new Set(markedQuestions);
    if (newMarked.has(questionIndex)) {
      newMarked.delete(questionIndex);
    } else {
      newMarked.add(questionIndex);
    }
    setMarkedQuestions(newMarked);
  };

  const handleQuestionNote = (questionIndex, note) => {
    setQuestionNotes(prev => ({
      ...prev,
      [questionIndex]: note
    }));
  };

  const executeGameAction = (action, data = {}) => {
    if (socket) {
      socket.emit(`host:${action}`, {
        gameId: gameState?.id,
        roomCode: gameState?.roomCode,
        ...data
      });
    }
    if (onGameAction) {
      onGameAction(action, data);
    }
    setConfirmAction(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentQuestion = () => {
    return questions[gameState?.currentQuestionIndex] || {};
  };

  const getGameStatusColor = () => {
    switch (gameState?.status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'finished': return 'info';
      default: return 'neutral';
    }
  };

  return (
    <div className="game-control-panel">
      {/* Main Control Header */}
      <div className="game-control-panel__header">
        <div className="control-header__status">
          <div className={`status-indicator status-indicator--${getGameStatusColor()}`}>
            <div className="status-indicator__dot"></div>
            <span className="status-indicator__text">
              {gameState?.status === 'active' && '進行中'}
              {gameState?.status === 'paused' && '一時停止'}
              {gameState?.status === 'waiting' && '待機中'}
              {gameState?.status === 'finished' && '終了'}
            </span>
          </div>
        </div>

        <div className="control-header__info">
          <span className="current-question">
            問題 {(gameState?.currentQuestionIndex || 0) + 1} / {questions.length}
          </span>
          <span className="timer-display">
            <FaClock className="timer-icon" />
            {formatTime(currentTimer)}
          </span>
        </div>

        <div className="control-header__actions">
          <button
            className="control-btn control-btn--secondary"
            onClick={() => setShowQuestionNav(!showQuestionNav)}
            title="問題一覧"
          >
            <FaList />
          </button>
          <button
            className="control-btn control-btn--secondary"
            onClick={() => setShowGameSettings(!showGameSettings)}
            title="ゲーム設定"
          >
            <FaCog />
          </button>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="game-control-panel__section">
        <h3 className="section-title">
          <FaPlay className="section-icon" />
          再生コントロール
        </h3>
        
        <div className="playback-controls">
          <button
            className="control-btn control-btn--primary control-btn--large"
            onClick={handlePlayPause}
            disabled={!isGameActive}
          >
            {gameState?.status === 'active' ? <FaPause /> : <FaPlay />}
            <span>{gameState?.status === 'active' ? '一時停止' : '再生'}</span>
          </button>

          <div className="control-group">
            <button
              className="control-btn control-btn--secondary"
              onClick={handlePreviousQuestion}
              disabled={!isGameActive || gameState?.currentQuestionIndex === 0}
              title="前の問題"
            >
              <FaStepBackward />
            </button>

            <button
              className="control-btn control-btn--accent"
              onClick={handleRestartQuestion}
              disabled={!isGameActive}
              title="問題をリスタート"
            >
              <FaRedo />
            </button>

            <button
              className="control-btn control-btn--secondary"
              onClick={handleSkipQuestion}
              disabled={!isGameActive || gameState?.currentQuestionIndex >= questions.length - 1}
              title="次の問題"
            >
              <FaStepForward />
            </button>
          </div>
        </div>
      </div>

      {/* Timer Management */}
      <div className="game-control-panel__section">
        <h3 className="section-title">
          <FaClock className="section-icon" />
          タイマー管理
        </h3>

        <div className="timer-controls">
          <div className="timer-display-large">
            <span className="timer-value">{formatTime(currentTimer)}</span>
            <div className={`timer-status timer-status--${timerRunning ? 'running' : 'paused'}`}>
              {timerRunning ? '実行中' : '停止中'}
            </div>
          </div>

          <div className="timer-adjustments">
            <button
              className="control-btn control-btn--small"
              onClick={() => handleTimerAdjustment(-10)}
              disabled={!isGameActive}
              title="10秒減らす"
            >
              <FaMinus />
              10秒
            </button>

            <button
              className="control-btn control-btn--small"
              onClick={() => handleTimerAdjustment(-5)}
              disabled={!isGameActive}
              title="5秒減らす"
            >
              <FaMinus />
              5秒
            </button>

            <button
              className="control-btn control-btn--small"
              onClick={() => handleTimerAdjustment(5)}
              disabled={!isGameActive}
              title="5秒追加"
            >
              <FaPlus />
              5秒
            </button>

            <button
              className="control-btn control-btn--small"
              onClick={() => handleTimerAdjustment(10)}
              disabled={!isGameActive}
              title="10秒追加"
            >
              <FaPlus />
              10秒
            </button>
          </div>

          <button
            className="control-btn control-btn--outline"
            onClick={() => setShowTimerControls(!showTimerControls)}
          >
            <FaCog />
            カスタム設定
          </button>
        </div>

        {/* Custom Timer Controls */}
        {showTimerControls && (
          <div className="custom-timer-controls">
            <div className="custom-timer-input">
              <label htmlFor="custom-timer">カスタムタイマー (秒)</label>
              <input
                id="custom-timer"
                type="number"
                min="5"
                max="300"
                value={customTimerValue}
                onChange={(e) => setCustomTimerValue(parseInt(e.target.value))}
              />
              <button
                className="control-btn control-btn--primary"
                onClick={handleCustomTimer}
              >
                設定
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game State Controls */}
      <div className="game-control-panel__section">
        <h3 className="section-title">
          <FaBolt className="section-icon" />
          ゲーム制御
        </h3>

        <div className="game-state-controls">
          <button
            className="control-btn control-btn--success"
            onClick={handleSaveCheckpoint}
            disabled={!isGameActive}
          >
            <FaSave />
            チェックポイント保存
          </button>

          <button
            className="control-btn control-btn--danger"
            onClick={handleEmergencyStop}
            disabled={!isGameActive}
          >
            <FaStop />
            緊急停止
          </button>
        </div>
      </div>

      {/* Question Navigation Sidebar */}
      {showQuestionNav && (
        <div className="question-navigation">
          <div className="question-nav__header">
            <h3>問題一覧</h3>
            <button
              className="close-btn"
              onClick={() => setShowQuestionNav(false)}
            >
              ×
            </button>
          </div>

          <div className="question-nav__list">
            {questions.map((question, index) => (
              <div
                key={index}
                className={`question-nav__item ${
                  index === gameState?.currentQuestionIndex ? 'active' : ''
                } ${markedQuestions.has(index) ? 'marked' : ''}`}
              >
                <div className="question-nav__main" onClick={() => handleJumpToQuestion(index)}>
                  <div className="question-number">
                    {index + 1}
                    {index === gameState?.currentQuestionIndex && (
                      <FaPlay className="current-indicator" />
                    )}
                  </div>
                  <div className="question-preview">
                    <div className="question-text">{question.text}</div>
                    <div className="question-type">{question.type}</div>
                  </div>
                </div>

                <div className="question-nav__actions">
                  <button
                    className={`nav-action-btn ${markedQuestions.has(index) ? 'active' : ''}`}
                    onClick={() => handleMarkQuestion(index)}
                    title="ブックマーク"
                  >
                    <FaBookmark />
                  </button>
                  
                  <button
                    className="nav-action-btn"
                    onClick={() => {
                      const note = prompt('問題にメモを追加:', questionNotes[index] || '');
                      if (note !== null) {
                        handleQuestionNote(index, note);
                      }
                    }}
                    title="メモ追加"
                  >
                    <FaEdit />
                  </button>
                </div>

                {questionNotes[index] && (
                  <div className="question-note">
                    <FaInfoCircle className="note-icon" />
                    {questionNotes[index]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="confirmation-modal">
          <div className="modal-overlay" onClick={() => setConfirmAction(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <FaExclamationTriangle 
                className={`modal-icon ${confirmAction.danger ? 'danger' : 'warning'}`} 
              />
              <h3>{confirmAction.title}</h3>
            </div>
            
            <div className="modal-body">
              <p>{confirmAction.message}</p>
            </div>
            
            <div className="modal-actions">
              <button
                className="control-btn control-btn--outline"
                onClick={() => setConfirmAction(null)}
              >
                キャンセル
              </button>
              <button
                className={`control-btn ${confirmAction.danger ? 'control-btn--danger' : 'control-btn--primary'}`}
                onClick={confirmAction.action}
              >
                {confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameControlPanel;
