import React from 'react';
import { 
  FaPlay, 
  FaPause, 
  FaClock, 
  FaQuestionCircle,
  FaUsers,
  FaEye,
  FaExclamationTriangle
} from 'react-icons/fa';
import QuestionRenderer from '../../quiz/QuestionRenderer';
import PostQuestionDisplay from '../../quiz/PostQuestionDisplay/PostQuestionDisplay';
import './HostGameRenderer.css';

/**
 * HostGameRenderer - Renders the actual game content in the Host Dashboard
 * 
 * This component displays what players are currently seeing:
 * - Current question during quiz phase
 * - Explanation/leaderboard during post-question phase
 * - Waiting states and game status
 * 
 * Features:
 * - Read-only view of the actual game
 * - Visual indication that this is host view
 * - Proper scaling and layout for dashboard integration
 */
function HostGameRenderer({ gameState, players = [] }) {
  // Determine what phase the game is in
  const getGamePhase = () => {
    if (!gameState) return 'waiting';
    
    switch (gameState.status) {
      case 'waiting':
        return 'waiting';
      case 'active':
        // Check if we're showing explanation/results
        if (gameState.showingExplanation || gameState.phase === 'explanation') {
          return 'explanation';
        }
        return 'question';
      case 'paused':
        return 'paused';
      case 'finished':
        return 'finished';
      default:
        return 'waiting';
    }
  };

  const phase = getGamePhase();

  // Render waiting state
  const renderWaitingState = () => (
    <div className="host-game-renderer__waiting">
      <div className="host-game-renderer__waiting-content">
        <FaUsers className="host-game-renderer__waiting-icon" />
        <h3 className="host-game-renderer__waiting-title">プレイヤー待機中</h3>
        <p className="host-game-renderer__waiting-message">
          {players.length}人のプレイヤーが参加中
        </p>
        <div className="host-game-renderer__waiting-hint">
          ゲームを開始するとここに問題が表示されます
        </div>
      </div>
    </div>
  );

  // Render paused state
  const renderPausedState = () => (
    <div className="host-game-renderer__paused">
      <div className="host-game-renderer__paused-content">
        <FaPause className="host-game-renderer__paused-icon" />
        <h3 className="host-game-renderer__paused-title">ゲーム一時停止中</h3>
        <p className="host-game-renderer__paused-message">
          問題 {(gameState.currentQuestionIndex || 0) + 1} / {gameState.totalQuestions || 0}
        </p>
        {gameState.currentQuestion && (
          <div className="host-game-renderer__paused-preview">
            <div className="host-game-renderer__paused-question">
              {gameState.currentQuestion.text || gameState.currentQuestion.question}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render finished state
  const renderFinishedState = () => (
    <div className="host-game-renderer__finished">
      <div className="host-game-renderer__finished-content">
        <FaQuestionCircle className="host-game-renderer__finished-icon" />
        <h3 className="host-game-renderer__finished-title">ゲーム終了</h3>
        <p className="host-game-renderer__finished-message">
          全{gameState.totalQuestions || 0}問が完了しました
        </p>
        <div className="host-game-renderer__finished-stats">
          <span>参加者: {players.length}人</span>
        </div>
      </div>
    </div>
  );

  // Render current question
  const renderQuestion = () => {
    if (!gameState.currentQuestion) {
      return (
        <div className="host-game-renderer__no-question">
          <FaExclamationTriangle className="host-game-renderer__no-question-icon" />
          <p>問題データを読み込み中...</p>
        </div>
      );
    }

    // Convert gameState format to QuestionRenderer format
    const questionForRenderer = {
      ...gameState.currentQuestion,
      // Ensure we have the right properties
      id: gameState.currentQuestion.id || `q_${gameState.currentQuestionIndex}`,
      question: gameState.currentQuestion.text || gameState.currentQuestion.question,
      options: gameState.currentQuestion.options || gameState.currentQuestion.answers?.map(a => a.text) || [],
      type: gameState.currentQuestion.type || 'multiple_choice',
      timeLimit: (gameState.currentQuestion.timeLimit || 30) * 1000, // Convert to ms
      questionNumber: (gameState.currentQuestionIndex || 0) + 1,
      totalQuestions: gameState.totalQuestions || 0,
      showProgress: true,
      // Add any image data
      image: gameState.currentQuestion.image_url || gameState.currentQuestion.image,
      _dbData: gameState.currentQuestion._dbData || {}
    };

    return (
      <div className="host-game-renderer__question-container">
        <QuestionRenderer
          question={questionForRenderer}
          selected={null} // Host view doesn't show selections
          answerResult={null}
          timer={gameState.timeRemaining || 0}
          onAnswer={() => {}} // No-op for host view
          showProgress={true}
          showTimer={true}
        />
      </div>
    );
  };

  // Render explanation/results phase
  const renderExplanation = () => {
    if (!gameState.explanationData) {
      return (
        <div className="host-game-renderer__no-explanation">
          <FaClock className="host-game-renderer__no-explanation-icon" />
          <p>説明/結果を準備中...</p>
        </div>
      );
    }

    // Convert to PostQuestionDisplay format
    const displayData = {
      explanation: gameState.explanationData.explanation || null,
      leaderboard: {
        correctAnswer: gameState.explanationData.correctAnswer,
        correctOption: gameState.explanationData.correctOption,
        answerStats: gameState.explanationData.answerStats,
        currentPlayer: null, // Host doesn't have a current player
        standings: gameState.explanationData.standings || [],
        totalPlayers: players.length,
        isIntermediate: gameState.explanationData.isIntermediate || false
      },
      duration: gameState.explanationData.duration || 30000 // 30 seconds default
    };

    return (
      <div className="host-game-renderer__explanation-container">
        <PostQuestionDisplay
          displayData={displayData}
          onComplete={() => {}} // No-op for host view
        />
      </div>
    );
  };

  return (
    <div className="host-game-renderer">
      {/* Host View Indicator */}
      <div className="host-game-renderer__header">
        <div className="host-game-renderer__indicator">
          <FaEye className="host-game-renderer__indicator-icon" />
          <span className="host-game-renderer__indicator-text">ホストビュー</span>
        </div>
        <div className="host-game-renderer__status">
          <div className={`host-game-renderer__status-badge host-game-renderer__status-badge--${phase}`}>
            {phase === 'waiting' && <FaUsers className="host-game-renderer__status-icon" />}
            {phase === 'question' && <FaPlay className="host-game-renderer__status-icon" />}
            {phase === 'explanation' && <FaClock className="host-game-renderer__status-icon" />}
            {phase === 'paused' && <FaPause className="host-game-renderer__status-icon" />}
            {phase === 'finished' && <FaQuestionCircle className="host-game-renderer__status-icon" />}
            
            <span className="host-game-renderer__status-text">
              {phase === 'waiting' && '待機中'}
              {phase === 'question' && '問題表示中'}
              {phase === 'explanation' && '説明/結果表示中'}
              {phase === 'paused' && '一時停止'}
              {phase === 'finished' && '終了'}
            </span>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="host-game-renderer__content">
        {phase === 'waiting' && renderWaitingState()}
        {phase === 'question' && renderQuestion()}
        {phase === 'explanation' && renderExplanation()}
        {phase === 'paused' && renderPausedState()}
        {phase === 'finished' && renderFinishedState()}
      </div>

      {/* Game Info Footer */}
      {(phase === 'question' || phase === 'explanation' || phase === 'paused') && (
        <div className="host-game-renderer__footer">
          <div className="host-game-renderer__progress">
            <span className="host-game-renderer__question-counter">
              問題 {(gameState.currentQuestionIndex || 0) + 1} / {gameState.totalQuestions || 0}
            </span>
            <div className="host-game-renderer__progress-bar">
              <div 
                className="host-game-renderer__progress-fill"
                style={{
                  width: `${gameState.totalQuestions > 0 ? 
                    ((gameState.currentQuestionIndex || 0) / gameState.totalQuestions) * 100 : 0}%`
                }}
              />
            </div>
          </div>
          <div className="host-game-renderer__player-count">
            <FaUsers className="host-game-renderer__player-count-icon" />
            <span>{players.length}人参加中</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostGameRenderer;
