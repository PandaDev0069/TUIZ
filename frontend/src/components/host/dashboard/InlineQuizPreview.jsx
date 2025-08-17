import React, { useState, useEffect, useRef } from 'react';
import QuestionRenderer from '../../quiz/QuestionRenderer';
import PostQuestionDisplay from '../../quiz/PostQuestionDisplay/PostQuestionDisplay';
import LoadingSkeleton from '../../LoadingSkeleton';
import Scoreboard from '../../../pages/Scoreboard';
import useQuizData from '../../../hooks/useQuizData';
import './InlineQuizPreview.css';

/**
 * InlineQuizPreview - Real quiz preview with actual question data
 * Enhanced to fetch and display actual quiz content
 * Now supports live game synchronization with players
 */
function InlineQuizPreview({ 
  disableInteraction = true,
  gameState = null,
  gameId = null,
  questionSetId = null
}) {
  // Fetch real quiz data
  const {
    questions,
    gameSettings,
    questionSetMetadata,
    getPreviewQuestion,
    getLeaderboardData,
    isLoading,
    hasError,
    errorMessage
  } = useQuizData(questionSetId, gameId);

  // Preview state management (fallback for non-live games)
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [previewTimer, setPreviewTimer] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const intervalRef = useRef(null);

  // Live game state - prioritize gameState over preview state
  const isLiveGame = gameState && gameState.status === 'active' && gameState.currentQuestion;
  const isGameEnded = gameState && (gameState.status === 'finished' || gameState.status === 'ended' || gameState.status === 'completed');
  const liveQuestionIndex = gameState?.currentQuestionIndex || 0;
  
  // Get current question - live game takes priority
  const currentQuestionIndex = isLiveGame ? liveQuestionIndex : previewQuestionIndex;
  const currentQuestion = isLiveGame ? 
    gameState.currentQuestion : 
    getPreviewQuestion(previewQuestionIndex);
 
  // Auto-cycle through questions if not disabled and not live game
  useEffect(() => {
    if (!disableInteraction && questions.length > 1 && !isLiveGame) {
      intervalRef.current = setInterval(() => {
        setPreviewQuestionIndex(prev => (prev + 1) % questions.length);
        setSelectedAnswer(null);
        setPreviewTimer(currentQuestion?.timeLimit ? currentQuestion.timeLimit / 1000 : 30);
      }, 6000); // Change question every 6 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [disableInteraction, questions.length, currentQuestion, isLiveGame]);

  // Timer countdown - use live game timer if available
  useEffect(() => {
    if (!isLiveGame) {
      const interval = setInterval(() => {
        setPreviewTimer(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isLiveGame]);

  // Reset timer when question changes (preview mode only)
  useEffect(() => {
    if (currentQuestion && !isLiveGame) {
      setPreviewTimer(currentQuestion.timeLimit ? currentQuestion.timeLimit / 1000 : 30);
    }
  }, [currentQuestion, isLiveGame]);

  // Reset selected answer when live question changes
  useEffect(() => {
    if (isLiveGame) {
      setSelectedAnswer(null);
    }
  }, [gameState?.currentQuestion?.id, isLiveGame]);

  // Mock answer handler
  const handleAnswer = (selectedIndex) => {
    if (disableInteraction) return;
    
    setSelectedAnswer(selectedIndex);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="inline-quiz-preview inline-quiz-preview--loading">
        <div className="preview-loading">
          <div className="preview-loading__spinner"></div>
          <p>Loading quiz content...</p>
        </div>
      </div>
    );
  }

  // Game finished state - show scoreboard with final results
  if (isGameEnded) {
    // Prepare scoreboard data from gameState
    const scoreboardData = gameState.finalScoreboard || gameState.scoreboard || [];
    const room = gameState.room || gameState.gameId || gameId;
    
    return (
      <div className="inline-quiz-preview inline-quiz-preview--finished">
        {/* Interaction blocker overlay */}
        {disableInteraction && (
          <div 
            className="inline-quiz-preview__interaction-blocker"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Game finished badge */}
        <div className="inline-quiz-preview__badge inline-quiz-preview__badge--finished">
          <span className="badge-text">GAME FINISHED</span>
          <span className="badge-info">Final Results</span>
        </div>

        {/* Scoreboard component for final results */}
        <div className="inline-quiz-preview__content inline-quiz-preview__content--scoreboard">
          <Scoreboard 
            // Pass state prop as expected by Scoreboard component
            state={{
              scoreboard: scoreboardData,
              room: room,
              isHost: true // Preview is always from host perspective
            }}
          />
        </div>
      </div>
    );
  }

  // Show skeleton when not synced with live game (preview mode with limited data)
  if (!isLiveGame && !isGameEnded) {
    return (
      <div className="inline-quiz-preview inline-quiz-preview--skeleton">
        {/* Interaction blocker overlay */}
        {disableInteraction && (
          <div 
            className="inline-quiz-preview__interaction-blocker"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Preview badge */}
        <div className="inline-quiz-preview__badge">
          <span className="badge-text">NOT SYNCED</span>
          <span className="badge-info">Preview Mode</span>
        </div>

        {/* Status indicator showing not synced */}
        <div className="inline-quiz-preview__status">
          <div className="status-indicator">
            <span className="status-dot status-dot--offline"></span>
            <span className="status-text">Waiting for live data...</span>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="inline-quiz-preview__content inline-quiz-preview__content--skeleton">
          <LoadingSkeleton 
            type="question" 
            count={1} 
            className="preview-skeleton"
            animated={true}
          />
        </div>

        <div className="preview-sync-notice">
          🔄 Waiting for game synchronization
        </div>
      </div>
    );
  }

  // Error state with fallback - only show when we have data but something went wrong
  if (hasError || (!currentQuestion && !isLiveGame && questions.length === 0)) {
    return (
      <div className="inline-quiz-preview inline-quiz-preview--fallback">
        {/* Interaction blocker overlay */}
        {disableInteraction && (
          <div 
            className="inline-quiz-preview__interaction-blocker"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Preview badge */}
        <div className="inline-quiz-preview__badge">
          PREVIEW {hasError && '(DEMO)'}
        </div>

        {/* Fallback Quiz content */}
        <div className="inline-quiz-preview__content">
          <QuestionRenderer
            question={{
              id: 1,
              question: hasError ? 
                "デモ質問: どの技術がフロントエンド開発に最適ですか？" :
                "プレビューを読み込み中...",
              type: "multiple_choice",
              options: [
                'React - コンポーネントベースのライブラリ',
                'Vue.js - プログレッシブフレームワーク', 
                'Angular - フルフィーチャーフレームワーク',
                'Svelte - コンパイルタイムフレームワーク'
              ],
              timeLimit: 30000, // QuestionRenderer expects milliseconds
              questionNumber: 1,
              totalQuestions: 4,
              showProgress: true,
              _dbData: {
                image_url: null,
                answers: Array(4).fill({ image_url: null })
              }
            }}
            selected={selectedAnswer}
            answerResult={selectedAnswer !== null ? { correct: selectedAnswer === 0, correctAnswer: 0 } : null}
            timer={previewTimer}
            onAnswer={handleAnswer}
            showProgress={true}
            showTimer={true}
          />
        </div>

        {hasError && (
          <div className="preview-error-notice">
            ⚠️ {errorMessage} - Showing demo content
          </div>
        )}
      </div>
    );
  }

  // Handle live game explanation/leaderboard phase
  if (isLiveGame && gameState.phase === 'explanation' && gameState.explanationData) {
    // Transform backend data to PostQuestionDisplay format
    const transformedDisplayData = {
      duration: (gameState.explanationData.explanationTime || 30000), // Keep in milliseconds as expected
      explanation: gameState.explanationData.explanation ? {
        title: gameState.explanationData.explanation.title || null,
        text: gameState.explanationData.explanation.text || null,
        image_url: gameState.explanationData.explanation.image_url || null
      } : null,
      leaderboard: {
        currentPlayer: {
          name: "Host", // Host doesn't have player data, but component expects this
          score: 0,
          streak: 0,
          isCorrect: false,
          questionScore: 0
        },
        standings: gameState.explanationData.leaderboard?.standings || gameState.explanationData.standings || [],
        correctAnswer: gameState.explanationData.leaderboard?.correctAnswer || gameState.explanationData.correctAnswer || 'N/A',
        correctOption: gameState.explanationData.leaderboard?.correctOption || gameState.explanationData.correctOption || 'N/A',
        answerStats: gameState.explanationData.leaderboard?.answerStats || gameState.explanationData.answerStats || { correctPercentage: 0 }
      }
    };

    return (
      <div className="inline-quiz-preview inline-quiz-preview--explanation">
        {/* Interaction blocker overlay */}
        {disableInteraction && (
          <div 
            className="inline-quiz-preview__interaction-blocker"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Live explanation badge */}
        <div className="inline-quiz-preview__badge inline-quiz-preview__badge--live">
          <span className="badge-text">LIVE</span>
          <span className="badge-info">
            {transformedDisplayData.explanation ? 'EXPLANATION' : 'LEADERBOARD'}
          </span>
        </div>

        {/* Use the actual PostQuestionDisplay component for perfect synchronization */}
        <div className="inline-quiz-preview__content inline-quiz-preview__content--pqd">
          <PostQuestionDisplay
            displayData={transformedDisplayData}
            onComplete={() => {
              // Host view doesn't need to do anything on completion
              // The backend will handle transitioning to next question
            }}
          />
        </div>
      </div>
    );
  }

  // Transform question data - use live game data if available
  const transformedQuestion = isLiveGame ? {
    id: gameState.currentQuestion.id,
    question: gameState.currentQuestion.question || gameState.currentQuestion.question_text,
    type: gameState.currentQuestion.type || gameState.currentQuestion.question_type,
    options: gameState.currentQuestion.options || gameState.currentQuestion.answers?.map(a => a.text) || [],
    timeLimit: (gameState.timeRemaining || 30) * 1000, // QuestionRenderer expects milliseconds
    questionNumber: gameState.currentQuestion.questionNumber || (gameState.currentQuestionIndex + 1),
    totalQuestions: gameState.totalQuestions || 0,
    showProgress: true,
    // Use the _dbData directly from backend if available, otherwise construct it
    _dbData: gameState.currentQuestion._dbData || {
      image_url: gameState.currentQuestion.image_url,
      answers: gameState.currentQuestion.answers?.map(answer => ({ 
        image_url: answer.image_url || null 
      })) || gameState.currentQuestion.options?.map(opt => ({ 
        image_url: opt.image_url || null 
      })) || []
    }
  } : {
    id: currentQuestion.id,
    question: currentQuestion.question,
    type: currentQuestion.type,
    options: currentQuestion.options.map(opt => opt.text),
    timeLimit: currentQuestion.timeLimit, // Already in milliseconds
    questionNumber: currentQuestion.questionNumber,
    totalQuestions: questions.length,
    showProgress: true,
    _dbData: {
      image_url: currentQuestion.imageUrl,
      answers: currentQuestion.options.map((opt, index) => ({ 
        image_url: opt.imageUrl || null 
      }))
    }
  };

  return (
    <div className={`inline-quiz-preview ${disableInteraction ? 'inline-quiz-preview--disabled' : ''}`}>
      {/* Interaction blocker overlay */}
      {disableInteraction && (
        <div 
          className="inline-quiz-preview__interaction-blocker"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Preview badge with real data indicator */}
      <div className="inline-quiz-preview__badge">
        <span className="badge-text">
          {isLiveGame ? 'LIVE' : (gameId ? 'ACTIVE' : 'PREVIEW')}
        </span>
        {isLiveGame && (
          <span className="badge-live-indicator">
            🔴 SYNCHRONIZED
          </span>
        )}
      </div>

      {/* Quiz content with real data using actual QuestionRenderer */}
      <div className="inline-quiz-preview__content inline-quiz-preview__content--question">
        <QuestionRenderer
          question={transformedQuestion}
          selected={selectedAnswer}
          answerResult={selectedAnswer !== null ? { 
            correct: currentQuestion.options[selectedAnswer]?.isCorrect || false,
            correctAnswer: currentQuestion.options.findIndex(opt => opt.isCorrect)
          } : null}
          timer={isLiveGame ? gameState.timeRemaining : Math.ceil(previewTimer)}
          onAnswer={handleAnswer}
          showProgress={true}
          showTimer={true}
        />
      </div>

      {/* Question navigation for preview - only show in non-live mode */}
      {questions.length > 1 && !disableInteraction && !isLiveGame && (
        <div className="inline-quiz-preview__navigation">
          <button 
            className="nav-btn nav-btn--prev"
            onClick={() => setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1))}
            disabled={previewQuestionIndex === 0}
          >
            ‹
          </button>
          
          <span className="nav-counter">
            {previewQuestionIndex + 1} / {questions.length}
          </span>
          
          <button 
            className="nav-btn nav-btn--next"
            onClick={() => setPreviewQuestionIndex(Math.min(questions.length - 1, previewQuestionIndex + 1))}
            disabled={previewQuestionIndex === questions.length - 1}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default InlineQuizPreview;
