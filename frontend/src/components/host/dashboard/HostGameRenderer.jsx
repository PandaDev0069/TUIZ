import React from 'react';
import { 
  FaPlay, 
  FaPause, 
  FaClock, 
  FaQuestionCircle,
  FaUsers,
  FaEye,
  FaExclamationTriangle,
  FaWifi
} from 'react-icons/fa';
import QuestionRenderer from '../../quiz/QuestionRenderer';
import PostQuestionDisplay from '../../quiz/PostQuestionDisplay/PostQuestionDisplay';
import LoadingSkeleton from '../../LoadingSkeleton';
import './HostGameRenderer.css';

/**
 * HostGameRenderer - Mini Quiz Page Renderer for Host Dashboard
 * 
 * This component renders the actual Quiz page experience within the host dashboard,
 * showing exactly what players see in their browser as a scaled-down mini-renderer.
 * 
 * Features:
 * - Complete Quiz page structure (header, content, footer)
 * - Player stats display matching Quiz.jsx
 * - Real-time game state synchronization
 * - Scaled UI for dashboard integration
 */
function HostGameRenderer({ gameState, roomCode, timeRemaining, playerStats = {} }) {
  const {
    currentQuestionIndex = -1,
    showExplanation = false,
    showLeaderboard = false,
    gamePhase = 'waiting',
    questions = [],
    connectedPlayers = 0,
    gameSettings = {}
  } = gameState || {};

  const currentQuestion = questions[currentQuestionIndex];
  const isGameInProgress = gamePhase === 'inProgress';
  const isQuestionPhase = isGameInProgress && !showExplanation && !showLeaderboard;
  const isExplanationPhase = isGameInProgress && showExplanation;
  const isLeaderboardPhase = isGameInProgress && showLeaderboard;

  // Player stats for mini quiz header (matching Quiz.jsx structure)
  const totalPlayers = playerStats.totalPlayers || connectedPlayers || 0;
  const answered = playerStats.answered || 0;
  const correctAnswers = playerStats.correctAnswers || 0;
  const avgScore = playerStats.avgScore || 0;

  // Connection status (simulated for host view)
  const connectionStatus = 'connected';

  // Render mini quiz header (matching Quiz.jsx header structure)
  const renderMiniQuizHeader = () => (
    <div className="mini-quiz-header">
      <div className="mini-quiz-header-content">
        <div className="mini-quiz-left">
          <div className="mini-room-info">
            <span className="mini-room-label">Room:</span>
            <span className="mini-room-code">{roomCode || 'Loading...'}</span>
          </div>
        </div>
        
        <div className="mini-quiz-center">
          <div className="mini-connection-status">
            <FaWifi className={`mini-connection-icon ${connectionStatus}`} />
            <span className="mini-connection-text">
              {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
        
        <div className="mini-quiz-right">
          <div className="mini-player-stats">
            <div className="mini-stat-group">
              <div className="mini-stat">
                <FaUsers className="mini-stat-icon" />
                <span className="mini-stat-value">{totalPlayers}</span>
                <span className="mini-stat-label">Players</span>
              </div>
              
              <div className="mini-stat">
                <FaEye className="mini-stat-icon" />
                <span className="mini-stat-value">{answered}</span>
                <span className="mini-stat-label">Answered</span>
              </div>
              
              {isGameInProgress && (
                <div className="mini-stat">
                  <FaQuestionCircle className="mini-stat-icon" />
                  <span className="mini-stat-value">
                    {currentQuestionIndex + 1}/{questions.length}
                  </span>
                  <span className="mini-stat-label">Progress</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render main quiz content (matching Quiz.jsx main structure)
  const renderMiniQuizMain = () => {
    if (!isGameInProgress) {
      return (
        <div className="mini-quiz-waiting">
          <div className="mini-waiting-content">
            <div className="mini-waiting-icon">
              <FaPause />
            </div>
            <h2 className="mini-waiting-title">Waiting for Game to Start</h2>
            <p className="mini-waiting-subtitle">Players will see this screen</p>
            <div className="mini-waiting-room">
              <div className="mini-room-display">
                <span className="mini-room-text">Room Code: {roomCode}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (isQuestionPhase && currentQuestion) {
      // Convert backend question format for QuestionRenderer
      const questionForRenderer = {
        id: currentQuestion.id,
        question: currentQuestion.question || currentQuestion.text,
        options: currentQuestion.options || currentQuestion.answers || [],
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        type: currentQuestion.type || 'multiple-choice',
        points: currentQuestion.points || 1,
        image: currentQuestion.image_url || currentQuestion.image
      };

      return (
        <div className="mini-quiz-question">
          <div className="mini-question-header">
            <div className="mini-question-progress">
              <span className="mini-question-counter">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <div className="mini-progress-bar">
                <div 
                  className="mini-progress-fill"
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`
                  }}
                />
              </div>
            </div>
            
            {timeRemaining !== null && (
              <div className="mini-timer-display">
                <FaClock className="mini-timer-icon" />
                <span className="mini-timer-value">{timeRemaining}</span>
                <span className="mini-timer-label">seconds</span>
              </div>
            )}
          </div>
          
          <div className="mini-question-content">
            <QuestionRenderer
              question={questionForRenderer}
              timeRemaining={timeRemaining}
              questionIndex={currentQuestionIndex}
              totalQuestions={questions.length}
              isHost={true}
              showAnswers={false}
              className="mini-question-renderer"
            />
          </div>
        </div>
      );
    }

    if (isExplanationPhase && currentQuestion) {
      const questionForDisplay = {
        id: currentQuestion.id,
        question: currentQuestion.question || currentQuestion.text,
        options: currentQuestion.options || currentQuestion.answers || [],
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        type: currentQuestion.type || 'multiple-choice'
      };

      return (
        <div className="mini-quiz-explanation">
          <PostQuestionDisplay
            question={questionForDisplay}
            playerStats={playerStats}
            isHost={true}
            className="mini-post-question"
          />
        </div>
      );
    }

    if (isLeaderboardPhase) {
      return (
        <div className="mini-quiz-leaderboard">
          <div className="mini-leaderboard-content">
            <h2 className="mini-leaderboard-title">Current Standings</h2>
            <div className="mini-leaderboard-stats">
              <div className="mini-leaderboard-stat">
                <span className="mini-stat-label">Total Players:</span>
                <span className="mini-stat-value">{totalPlayers}</span>
              </div>
              <div className="mini-leaderboard-stat">
                <span className="mini-stat-label">Average Score:</span>
                <span className="mini-stat-value">{Math.round(avgScore)}%</span>
              </div>
              <div className="mini-leaderboard-stat">
                <span className="mini-stat-label">Questions Completed:</span>
                <span className="mini-stat-value">{currentQuestionIndex + 1}</span>
              </div>
            </div>
            <div className="mini-leaderboard-message">
              <p>Players are viewing the leaderboard</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mini-quiz-loading">
        <LoadingSkeleton />
        <p className="mini-loading-text">Loading quiz content...</p>
      </div>
    );
  };

  // Render mini quiz footer (matching Quiz.jsx footer structure)
  const renderMiniQuizFooter = () => (
    <div className="mini-quiz-footer">
      <div className="mini-footer-content">
        <div className="mini-footer-left">
          <div className="mini-game-info">
            <span className="mini-game-phase">
              {gamePhase === 'waiting' && 'Waiting'}
              {gamePhase === 'inProgress' && 'In Progress'}
              {gamePhase === 'finished' && 'Completed'}
            </span>
          </div>
        </div>
        
        <div className="mini-footer-center">
          {isGameInProgress && (
            <div className="mini-footer-stats">
              <span className="mini-footer-stat">
                {answered}/{totalPlayers} answered
              </span>
            </div>
          )}
        </div>
        
        <div className="mini-footer-right">
          <div className="mini-host-indicator">
            <FaEye className="mini-host-icon" />
            <span className="mini-host-text">Host View</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="host-game-renderer">
      {/* Host View Header */}
      <div className="renderer-header">
        <h3>Live Quiz Player View</h3>
        <div className="game-status">
          <span className={`status-indicator ${gamePhase}`}>
            {gamePhase === 'waiting' && <FaPause />}
            {gamePhase === 'inProgress' && <FaPlay />}
            {gamePhase === 'finished' && <FaExclamationTriangle />}
          </span>
          <span className="status-text">
            {gamePhase === 'waiting' && 'Waiting to Start'}
            {gamePhase === 'inProgress' && 'Game in Progress'}
            {gamePhase === 'finished' && 'Game Completed'}
          </span>
        </div>
      </div>

      {/* Mini Quiz Container (simulating full Quiz page) */}
      <div className="mini-quiz-container">
        {renderMiniQuizHeader()}
        
        <main className="mini-quiz-main">
          {renderMiniQuizMain()}
        </main>
        
        {renderMiniQuizFooter()}
      </div>
    </div>
  );
}

export default HostGameRenderer;
