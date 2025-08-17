import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import Frame from 'react-frame-component';
import { 
  FaPlay, 
  FaPause, 
  FaExclamationTriangle,
  FaEye
} from 'react-icons/fa';
import { usePlayerSocket } from '../../../hooks/useSocket';
import QuestionRenderer from '../../quiz/QuestionRenderer';
import PostQuestionDisplay from '../../quiz/PostQuestionDisplay/PostQuestionDisplay';
import ConnectionStatus from '../../ConnectionStatus';
import LoadingSkeleton from '../../LoadingSkeleton';
import './HostGameRenderer.css';

/**
 * IframePreview - Bullet-proof scaling component using iframe isolation
 * 
 * Renders content inside an iframe with perfect scaling and style isolation
 * No conflicts with dashboard styles, pixel-perfect miniature rendering
 */
function IframePreview({ children, designWidth = 400, designHeight = 300, style }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.8); // Start with a reasonable default scale

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const updateScale = () => {
      const { width, height } = el.getBoundingClientRect();
      // Calculate scale with some padding and cap at reasonable values
      const scaleX = (width - 20) / designWidth;  // 20px padding
      const scaleY = (height - 20) / designHeight; // 20px padding
      const newScale = Math.min(scaleX, scaleY, 1, 0.8); // Cap between 0 and 0.8
      setScale(Math.max(newScale, 0.3)); // Minimum scale of 0.3
    };

    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    
    // Initial scale calculation
    updateScale();
    
    return () => ro.disconnect();
  }, [designWidth, designHeight]);

  return (
    <div 
      ref={wrapRef} 
      style={{ 
        ...style, 
        overflow: "hidden", 
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Frame
        style={{
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          border: "0",
          pointerEvents: "none",        // mirror only - no interactions
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        head={
          <>
            {/* Reset iframe styles and import app styles */}
            <style>{`
              html, body { 
                margin: 0; 
                padding: 0; 
                background: transparent;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                overflow: hidden;
              }
            `}</style>
            {/* Import the main app CSS */}
            <link rel="stylesheet" href="/src/App.css" />
            <link rel="stylesheet" href="/src/pages/quiz.css" />
            <link rel="stylesheet" href="/src/styles/universal-theme.css" />
          </>
        }
      >
        {children}
      </Frame>
    </div>
  );
}

/**
 * QuizPageMirror - Exact replica of Quiz.jsx page structure
 * 
 * Renders the complete Quiz page experience exactly as players see it
 * Uses the actual Quiz.jsx components and structure without modifications
 */
function QuizPageMirror({ gameState, timeRemaining, playerStats = {} }) {
  const {
    currentQuestionIndex = -1,
    showExplanation = false,
    explanationData = null,
    questions = [],
    connectedPlayers = 0,
    currentQuestion: rawQuestion,
    status = 'waiting'
  } = gameState || {};

  const currentQuestion = rawQuestion || questions[currentQuestionIndex];
  
  // Simulate player stats for realistic display
  const playerScore = Math.round(playerStats.avgScore || 75);
  const playerStreak = Math.min(Math.floor(playerStats.correctAnswers / playerStats.totalPlayers * 3) || 1, 5);
  const lastPoints = showExplanation ? Math.floor(Math.random() * 100) + 50 : 0;

  // Create the exact question format that Quiz.jsx expects
  const getFormattedQuestion = () => {
    if (!currentQuestion) return null;
    
    return {
      id: currentQuestion.id,
      question: currentQuestion.question || currentQuestion.text,
      options: currentQuestion.options || [],
      type: currentQuestion.type || 'multiple_choice',
      questionNumber: currentQuestionIndex + 1,
      totalQuestions: questions.length,
      timeLimit: currentQuestion.timeLimit || 10000,
      image_url: currentQuestion.image_url || currentQuestion.image,
      _dbData: currentQuestion._dbData || {},
      correctAnswer: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      points: currentQuestion.points || 1
    };
  };

  // Show explanation if we're in explanation phase - REUSE Quiz.jsx logic
  if (showExplanation && explanationData) {
    // Create the exact displayData structure that Quiz.jsx uses for PostQuestionDisplay
    const displayData = {
      // Explanation data (null if none exists) - matches Quiz.jsx structure
      explanation: explanationData.explanation ? {
        title: explanationData.explanation.title,
        text: explanationData.explanation.text,
        image_url: explanationData.explanation.image_url
      } : null,
      
      // Leaderboard data (always present) - matches Quiz.jsx structure
      leaderboard: {
        correctAnswer: explanationData.correctAnswer,
        correctOption: explanationData.correctOption,
        answerStats: explanationData.answerStats,
        currentPlayer: {
          id: 'host-mirror',
          name: 'Player Mirror',
          score: playerScore,
          streak: playerStreak,
          rank: 1,
          questionScore: lastPoints,
          isCorrect: Math.random() > 0.3 // Simulate 70% correct rate
        },
        standings: explanationData.standings || [],
        totalPlayers: playerStats.totalPlayers || connectedPlayers || 1,
        isIntermediate: explanationData.isIntermediate || false
      },
      
      // Duration for timer - matches Quiz.jsx expectation (milliseconds)
      duration: explanationData.duration || 30000
    };

    // Return PostQuestionDisplay with exact Quiz.jsx structure
    return (
      <PostQuestionDisplay
        displayData={displayData}
        onComplete={() => {}} // No-op for host view
      />
    );
  }

  const question = getFormattedQuestion();

  // Show loading if no question
  if (!question) {
    return (
      <div className="page-container">
        <div className="card">
          <LoadingSkeleton type="question" count={1} />
        </div>
      </div>
    );
  }

  // Render the exact Quiz page structure - matches Quiz.jsx exactly
  return (
    <div className="page-container">
      {/* Exact ConnectionStatus component */}
      <ConnectionStatus 
        position="top-left"
        showText={false}
        compact={true}
        className="quiz__connection-status"
      />
      
      <div className="quiz-page">
        {/* Exact quiz header with player stats */}
        <div className="quiz-header">
          <div className="quiz-player-stats">
            <div className="quiz-current-score">スコア: {playerScore}</div>
            {playerStreak > 1 && <div className="quiz-streak-badge">🔥 {playerStreak}連続!</div>}
            {lastPoints > 0 && <div className="quiz-last-points">+{lastPoints}</div>}
          </div>
        </div>

        {/* Exact QuestionRenderer component */}
        <QuestionRenderer
          key={question.id || question.questionNumber}
          question={question}
          selected={null} // Host view shows unselected state
          answerResult={null}
          timer={timeRemaining || 0}
          onAnswer={() => {}} // No-op for host view
          showProgress={true}
          showTimer={true}
        />
      </div>
    </div>
  );
}

/**
 * HostGameRenderer - Host Dashboard Game Content Renderer with Iframe Scaling
 * 
 * Features:
 * - Perfect iframe-based scaling with no style conflicts
 * - Exact Quiz.jsx page mirroring with complete isolation
 * - Responsive scaling that maintains aspect ratio
 * - Bullet-proof rendering that can't break dashboard layout
 */
function HostGameRenderer({ gameState, roomCode, timeRemaining, playerStats = {} }) {
  const { status = 'waiting' } = gameState || {};

  return (
    <div className="host-game-renderer">
      {/* Host View Header */}
      <div className="host-game-renderer__header">
        <div className="host-game-renderer__indicator">
          <FaEye className="host-game-renderer__indicator-icon" />
          <span className="host-game-renderer__indicator-text">Player Screen Mirror</span>
        </div>
        
        <div className={`host-game-renderer__status-badge host-game-renderer__status-badge--${status}`}>
          <span className="host-game-renderer__status-icon">
            {status === 'waiting' && <FaPause />}
            {status === 'active' && <FaPlay />}
            {status === 'finished' && <FaExclamationTriangle />}
          </span>
          <span>Room: {roomCode} • {playerStats.totalPlayers || 0} Players</span>
        </div>
      </div>

      {/* Iframe-based Quiz Mirror - Perfect Scaling */}
      <div className="host-game-renderer__content">
        <IframePreview 
          designWidth={320} 
          designHeight={240}
          style={{ 
            width: '100%', 
            height: '100%',
            minHeight: '200px',
            maxWidth: '500px',
            maxHeight: '375px'
          }}
        >
          <QuizPageMirror 
            gameState={gameState}
            timeRemaining={timeRemaining}
            playerStats={playerStats}
          />
        </IframePreview>
      </div>
    </div>
  );
}

export default HostGameRenderer;
