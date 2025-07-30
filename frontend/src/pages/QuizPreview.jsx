import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PreviewContext from '../contexts/PreviewContext';
import PreviewPlayerView from '../components/PreviewPlayerView';
import PreviewHostControls from '../components/PreviewHostControls';
import PreviewModeSelector from '../components/PreviewModeSelector';
import PreviewExplanationDisplay from '../components/PreviewExplanationDisplay';
import IntermediateScoreboard from '../components/IntermediateScoreboard';
import { showSuccess, showError } from '../utils/toast';
import './quizPreview.css';

function QuizPreview() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if we have quiz data
  const { questions = [], settings = {}, metadata = {}, currentQuizId = null } = state || {};

  useEffect(() => {
    if (!questions.length) {
      navigate('/create-quiz');
      return;
    }
  }, [questions, navigate]);

  // Preview modes
  const [previewMode, setPreviewMode] = useState('full'); // 'full', 'single', 'dual'
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  const [hostAsPlayer, setHostAsPlayer] = useState(false);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState('start'); // 'start', 'question', 'explanation', 'results'
  const [timer, setTimer] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Enhanced player management
  const [mockPlayers, setMockPlayers] = useState([
    { id: 1, name: user?.username || 'プレビューユーザー', score: 0, streak: 0, isHost: true },
    { id: 2, name: 'AI プレイヤー 1', score: 0, streak: 0 },
    { id: 3, name: 'AI プレイヤー 2', score: 0, streak: 0 }
  ]);
  const [activePlayerId, setActivePlayerId] = useState(null); // null = AI auto mode, number = manual control
  
  // Initialize playerScores based on initial mockPlayers
  const [playerScores, setPlayerScores] = useState(() => {
    const initialPlayers = [
      { id: 1, name: user?.username || 'プレビューユーザー', score: 0, streak: 0, isHost: true },
      { id: 2, name: 'AI プレイヤー 1', score: 0, streak: 0 },
      { id: 3, name: 'AI プレイヤー 2', score: 0, streak: 0 }
    ];
    return initialPlayers.reduce((acc, player) => ({
      ...acc,
      [player.id]: { score: 0, streak: 0, totalCorrect: 0 }
    }), {});
  });

  // Player management functions
  const addSimulatedPlayer = (playerName) => {
    if (!playerName || playerName.trim() === '') {
      console.warn('Player name cannot be empty');
      return false;
    }

    // Check if name already exists
    if (mockPlayers.some(player => player.name.toLowerCase() === playerName.toLowerCase())) {
      console.warn('Player name already exists');
      return false;
    }

    const newPlayerId = Math.max(...mockPlayers.map(p => p.id)) + 1;
    const newPlayer = {
      id: newPlayerId,
      name: playerName.trim(),
      score: 0,
      streak: 0
    };
    
    setMockPlayers(prev => [...prev, newPlayer]);
    setPlayerScores(prev => ({
      ...prev,
      [newPlayerId]: { score: 0, streak: 0, totalCorrect: 0 }
    }));

    return true;
  };

  const removeSimulatedPlayer = (playerId) => {
    // Don't allow removing the host
    const playerToRemove = mockPlayers.find(p => p.id === playerId);
    if (playerToRemove?.isHost) {
      console.warn('Cannot remove the host player');
      return false;
    }

    // Ensure at least 2 players remain (host + 1)
    if (mockPlayers.length <= 2) {
      console.warn('Cannot remove player - minimum 2 players required');
      return false;
    }

    setMockPlayers(prev => prev.filter(p => p.id !== playerId));
    setPlayerScores(prev => {
      const newScores = { ...prev };
      delete newScores[playerId];
      return newScores;
    });

    // Reset active player if the removed player was active
    if (activePlayerId === playerId) {
      setActivePlayerId(null);
    }

    return true;
  };

  const setActivePlayer = (playerId) => {
    // playerId can be null (AI auto mode) or a valid player ID
    if (playerId !== null && !mockPlayers.some(p => p.id === playerId)) {
      console.warn('Invalid player ID');
      return false;
    }

    setActivePlayerId(playerId);
    return true;
  };

  // Timer ref
  const timerRef = useRef(null);

  // Get current question
  const currentQuestion = previewMode === 'single' ? 
    questions[selectedQuestionIndex] : 
    questions[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timer > 0 && gamePhase === 'question') {
      timerRef.current = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0 && gamePhase === 'question') {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer, isTimerRunning, gamePhase]);

  // Handle timer reaching zero
  const handleTimeUp = () => {
    setIsTimerRunning(false);
    if (settings.game_settings?.autoAdvance) {
      simulateAnswers();
      setTimeout(() => {
        if (settings.game_settings?.showExplanations) {
          setGamePhase('explanation');
        } else {
          handleNextQuestion();
        }
      }, 1000);
    }
  };

  // Start preview
  const startPreview = () => {
    setGamePhase('question');
    setCurrentQuestionIndex(0);
    setTimer(currentQuestion?.timeLimit || 30);
    setIsTimerRunning(true);
    setSelectedAnswer(null);
    setShowResults(false);
    // Reset all player scores
    setPlayerScores(
      mockPlayers.reduce((acc, player) => ({
        ...acc,
        [player.id]: { score: 0, streak: 0, totalCorrect: 0 }
      }), {})
    );
  };

  // Handle answer selection
  const handleAnswerSelect = (answerIndex) => {
    if (selectedAnswer !== null || !isTimerRunning) return;
    
    setSelectedAnswer(answerIndex);
    setIsTimerRunning(false);
    
    // Simulate other players answering
    simulateAnswers();
    
    // Check if answer is correct and update scores
    const isCorrect = currentQuestion.answers[answerIndex]?.isCorrect || false;
    updatePlayerScore(1, isCorrect, timer); // Player 1 is the host
    
    // Auto advance based on settings
    setTimeout(() => {
      if (settings.game_settings?.showExplanations) {
        setGamePhase('explanation');
      } else {
        handleNextQuestion();
      }
    }, 1500);
  };

  // Simulate AI players answering (enhanced for player control)
  const simulateAnswers = () => {
    mockPlayers.slice(1).forEach((player) => {
      // Skip if this player is actively controlled
      if (activePlayerId === player.id) {
        return;
      }

      // Random answer with some bias towards correct answers
      const correctAnswerIndex = currentQuestion.answers.findIndex(a => a.isCorrect);
      const isCorrect = Math.random() < 0.6; // 60% chance of correct answer
      const answerIndex = isCorrect ? correctAnswerIndex : Math.floor(Math.random() * currentQuestion.answers.length);
      const responseTime = Math.floor(Math.random() * timer) + 1;
      
      updatePlayerScore(player.id, isCorrect, responseTime);
    });
  };

  // Update player score
  const updatePlayerScore = (playerId, isCorrect, responseTime) => {
    setPlayerScores(prev => {
      const currentPlayer = prev[playerId];
      const basePoints = currentQuestion.points || 100;
      let pointsEarned = 0;
      
      if (isCorrect) {
        // Calculate points based on settings
        if (settings.game_settings?.pointCalculation === 'time-bonus') {
          const timeBonus = Math.floor((timer / (currentQuestion.timeLimit || 30)) * basePoints * 0.5);
          pointsEarned = basePoints + timeBonus;
        } else {
          pointsEarned = basePoints;
        }
        
        // Streak bonus
        const newStreak = currentPlayer.streak + 1;
        if (settings.game_settings?.streakBonus && newStreak > 1) {
          pointsEarned += Math.floor(pointsEarned * 0.1 * Math.min(newStreak, 5));
        }
        
        return {
          ...prev,
          [playerId]: {
            score: currentPlayer.score + pointsEarned,
            streak: newStreak,
            totalCorrect: currentPlayer.totalCorrect + 1
          }
        };
      } else {
        return {
          ...prev,
          [playerId]: {
            ...currentPlayer,
            streak: 0
          }
        };
      }
    });
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (previewMode === 'single') {
      setGamePhase('question');
      setTimer(currentQuestion?.timeLimit || 30);
      setIsTimerRunning(true);
      setSelectedAnswer(null);
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setGamePhase('question');
      setTimer(questions[currentQuestionIndex + 1]?.timeLimit || 30);
      setIsTimerRunning(true);
      setSelectedAnswer(null);
    } else {
      setGamePhase('results');
      setShowResults(true);
    }
  };

  // Handle previous question (for host controls)
  const handlePreviousQuestion = () => {
    if (previewMode === 'single') return;
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setGamePhase('question');
      setTimer(questions[currentQuestionIndex - 1]?.timeLimit || 30);
      setIsTimerRunning(false);
      setSelectedAnswer(null);
    }
  };

  // Handle skip to explanation
  const handleSkipToExplanation = () => {
    setIsTimerRunning(false);
    setGamePhase('explanation');
  };

  // Handle explanation close
  const handleExplanationClose = () => {
    if (settings.game_settings?.showLeaderboard) {
      setShowResults(true);
    } else {
      handleNextQuestion();
    }
  };

  // Get leaderboard data
  const getLeaderboardData = () => {
    return mockPlayers.map(player => ({
      ...player,
      ...playerScores[player.id]
    })).sort((a, b) => b.score - a.score);
  };

  // Get current player data for intermediate scoreboard
  const getCurrentPlayerData = () => {
    const hostPlayer = mockPlayers.find(p => p.id === 1);
    const hostScore = playerScores[1];
    const leaderboard = getLeaderboardData();
    const rank = leaderboard.findIndex(p => p.id === 1) + 1;
    
    return {
      ...hostPlayer,
      ...hostScore,
      rank
    };
  };

  if (!questions.length) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>プレビューデータが見つかりません</h2>
          <p>クイズ作成画面に戻ってください。</p>
          <button onClick={() => navigate('/create-quiz')}>戻る</button>
        </div>
      </div>
    );
  }

  const previewContextValue = {
    questions,
    settings,
    metadata,
    currentQuestion,
    currentQuestionIndex,
    gamePhase,
    timer,
    isTimerRunning,
    selectedAnswer,
    playerScores,
    mockPlayers,
    activePlayerId,
    previewMode,
    selectedQuestionIndex,
    isMobileView,
    hostAsPlayer,
    // Actions
    setPreviewMode,
    setSelectedQuestionIndex,
    setIsMobileView,
    setHostAsPlayer,
    startPreview,
    handleAnswerSelect,
    handleNextQuestion,
    handlePreviousQuestion,
    handleSkipToExplanation,
    setGamePhase,
    setTimer,
    setIsTimerRunning,
    // Player management
    addSimulatedPlayer,
    removeSimulatedPlayer,
    setActivePlayer
  };

  return (
    <PreviewContext.Provider value={previewContextValue}>
      <div className={`quiz-preview-container ${isMobileView ? 'mobile-view' : ''}`}>
        {/* Header */}
        <header className="preview-header">
          <div className="preview-header-left">
            <button 
              className="preview-back-button"
              onClick={() => navigate('/create-quiz', { 
                state: { 
                  questions, 
                  settings, 
                  metadata, 
                  currentQuizId, // 🔧 CRITICAL FIX: Preserve currentQuizId
                  returnFromPreview: true 
                } 
              })}
            >
              ← エディターに戻る
            </button>
            <h1 className="preview-page-title">📱プレビュー  {metadata.title}</h1>
          </div>
          <div className="header-right">
            <span className="preview-question-count">
              {questions.length} 問題
            </span>
          </div>
        </header>

        {/* Preview Mode Selector */}
        <PreviewModeSelector />

        {/* Main Preview Area */}
        <main className="preview-main">
          {previewMode === 'dual' ? (
            <div className="preview-dual-view-layout">
              <div className="preview-player-view-section">
                <h3>👥 プレイヤービュー</h3>
                <PreviewPlayerView />
              </div>
              <div className="preview-host-controls-section">
                <h3>🎮 ホストコントロール</h3>
                <PreviewHostControls />
              </div>
            </div>
          ) : (
            <div className="preview-single-view-layout">
              <PreviewPlayerView />
              <PreviewHostControls />
            </div>
          )}
        </main>

        {/* Modals */}
        {gamePhase === 'explanation' && currentQuestion && (currentQuestion.explanation_text || currentQuestion.explanation) && (
          <PreviewExplanationDisplay
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onClose={handleExplanationClose}
            isVisible={gamePhase === 'explanation'}
          />
        )}

        {showResults && settings.game_settings?.showLeaderboard && (
          <IntermediateScoreboard
            top5={getLeaderboardData().slice(0, 5)}
            currentPlayer={getCurrentPlayerData()}
            totalPlayers={mockPlayers.length}
            onComplete={() => {
              setShowResults(false);
              handleNextQuestion();
            }}
          />
        )}
      </div>
    </PreviewContext.Provider>
  );
}

export default QuizPreview;
