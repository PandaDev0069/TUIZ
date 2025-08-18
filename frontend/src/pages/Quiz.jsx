import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useManagedInterval } from "../utils/timerManager";
import { usePlayerSocket, useConnectionStatus } from "../hooks/useSocket";
import socketManager from "../utils/SocketManager";
import QuizContent from "../components/quiz/QuizContent";
import PostQuestionDisplay from "../components/quiz/PostQuestionDisplay/PostQuestionDisplay";
import LoadingSkeleton from "../components/LoadingSkeleton";
import "./quiz.css";

function Quiz({ previewMode = false, mockData = null }) {
  const { state } = useLocation();
  const { name, room } = (previewMode && mockData) ? mockData : (state || {});
  const navigate = useNavigate();

  // Use the player socket hook with session persistence - skip in preview mode
  const socketHookResult = usePlayerSocket(
    previewMode ? null : name, 
    previewMode ? null : room, 
    previewMode ? null : (state?.gameId)
  );
  
  const { 
    isConnected, 
    playerState, 
    sessionRestored, 
    emit, 
    on, 
    off 
  } = previewMode ? {
    isConnected: true,
    playerState: { connected: true },
    sessionRestored: true,
    emit: () => {},
    on: () => {},
    off: () => {}
  } : socketHookResult;
  
  // Use connection status hook - skip in preview mode
  const { connectionState } = previewMode ? { connectionState: 'connected' } : useConnectionStatus();

  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [timer, setTimer] = useState(10);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [questionScore, setQuestionScore] = useState(0);
  
  // New state for explanation system
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationData, setExplanationData] = useState(null);
  const [explanationTimer, setExplanationTimer] = useState(0);
  const [initialExplanationDuration, setInitialExplanationDuration] = useState(0); // Store original duration
  const [gameExplanationTime, setGameExplanationTime] = useState(30); // Store game's explanation time setting
  const [answerResult, setAnswerResult] = useState(null);
  const [latestStandings, setLatestStandings] = useState(null); // Store latest leaderboard standings
  const [currentPlayerAnswerData, setCurrentPlayerAnswerData] = useState(null); // Store current player's answer data for accuracy

  useEffect(() => {
    // Skip socket setup in preview mode
    if (previewMode) {
      // Set up mock data for preview
      if (mockData?.mockQuestion) {
        setQuestion(mockData.mockQuestion);
        setTimer(mockData.mockQuestion.timeLimit || 30);
      }
      return;
    }

    if (!name || !room) {
      navigate('/join');
      return;
    }

    // Handle session restoration for active games
    on('playerSessionRestored', (data) => {
      if (import.meta.env.DEV) {
        console.log('🔄 Player session restored:', data);
      }
      
      // Update session data with complete information from server
      if (data.playerState && data.gameState) {
        socketManager.storeSessionData({
          gameId: data.playerState.gameId || data.gameState.gameId,
          room: data.playerState.gameCode || data.gameState.gameCode,
          playerName: data.playerState.name,
          isHost: false
        });
      }
      
      if (data.type === 'activeGame' && data.gameState) {
        const { gameState } = data;
        
        // Update player score and state from restored data
        if (data.playerState) {
          setScore(data.playerState.score || 0);
          setStreak(data.playerState.streak || 0);
        }
        
        // If there's a current question, restore it
        if (gameState.currentQuestion) {
          if (import.meta.env.DEV) {
            console.log('📋 Restoring current question:', gameState.currentQuestion);
            console.log('📷 Question image URL:', gameState.currentQuestion.imageUrl);
          }
          
          setQuestion(gameState.currentQuestion);
          setSelected(null);
          setFeedback("");
          setShowExplanation(false);
          setExplanationData(null);
          setAnswerResult(null);
          setLatestStandings(null);
          setCurrentPlayerAnswerData(null);
          
          // Calculate remaining time based on server state
          let remainingTime = 10; // default
          if (gameState.timeRemaining && gameState.timeRemaining > 0) {
            remainingTime = Math.ceil(gameState.timeRemaining / 1000);
          } else if (gameState.currentQuestion.timeLimit) {
            remainingTime = Math.ceil(gameState.currentQuestion.timeLimit / 1000);
          }
          
          setTimer(remainingTime);
          setQuestionScore(0);
          
          if (import.meta.env.DEV) {
            console.log('⏰ Restored timer with remaining time:', remainingTime);
          }
        }
        
        // If showing results/explanation, handle that state
        if (gameState.showingResults) {
          if (import.meta.env.DEV) {
            console.log('📊 Game is showing results, waiting for server events...');
          }
          // Don't set question to null here, let server events handle the explanation
        }
        
        if (import.meta.env.DEV) {
          console.log('✅ Successfully restored to active game');
        }
      }
    });

    // Handle session restore errors
    on('sessionRestoreError', (error) => {
      if (import.meta.env.DEV) {
        console.error('❌ Session restore error:', error);
      }
      // Could redirect to join page or show error message
    });

    // Handle session expiration
    on('sessionExpired', (data) => {
      if (import.meta.env.DEV) {
        console.log('⏰ Session expired:', data);
      }
      if (data.shouldRedirect) {
        navigate(data.shouldRedirect);
      } else {
        navigate('/join');
      }
    });

    // Receive question from server
    on('question', (q) => {
      if (import.meta.env.DEV) {
        console.log('📋 Received question:', q);
      }
      setQuestion(q);
      setSelected(null);
      setFeedback("");
      setShowExplanation(false);
      setExplanationData(null);
      setAnswerResult(null);
      setLatestStandings(null); // Reset standings for new question
      setCurrentPlayerAnswerData(null); // Reset answer data for new question
      
      // Use dynamic timer from question or default to 10
      const questionTimer = q.timeLimit ? Math.round(q.timeLimit / 1000) : 10;
      setTimer(questionTimer);
      
      setQuestionScore(0);
      
      // Auto-scroll to quiz content on mobile when new question arrives
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          if (import.meta.env.DEV) {
            console.log('📱 Auto-scrolling to new quiz question');
          }
          const quizContent = document.querySelector('.quiz-question-content-wrapper');
          if (quizContent) {
            quizContent.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 500); // Delay to allow DOM update and image loading
      }
    });

    // Handle answer result from server
    on('answerResult', (result) => {
      if (import.meta.env.DEV) {
        console.log('✅ Answer result:', result);
      }
      setAnswerResult(result);
      setScore(result.newScore);
      setStreak(result.streak);
      setQuestionScore(result.points);
      
      if (result.isCorrect) {
        setFeedback(`正解！ +${result.points}点 ${result.streak > 1 ? `🔥 ${result.streak}連続!` : ''}`);
      } else {
        setFeedback("不正解...");
      }
    });

    // Handle explanation display
    on('showExplanation', (data) => {
      if (import.meta.env.DEV) {
        console.log('📖 Received showExplanation event:', data);
      }
      setExplanationData(data);
      setShowExplanation(true);
      
      // Set explanation timer - use remainingTime for reconnection sync, or full time for new explanations
      let timerValue;
      if (data.remainingTime !== undefined && data.remainingTime > 0) {
        // Reconnection scenario - use remaining time from server
        timerValue = Math.ceil(data.remainingTime / 1000);
        if (import.meta.env.DEV) {
          console.log('⏰ Using remaining explanation time from server:', timerValue, 'seconds');
        }
      } else {
        // New explanation - use full time
        timerValue = Math.round(data.explanationTime / 1000) || 30;
        if (import.meta.env.DEV) {
          console.log('⏰ Using full explanation time:', timerValue, 'seconds');
        }
      }
      
      setExplanationTimer(timerValue);
      setInitialExplanationDuration(data.explanationTime); // Store in milliseconds (backend already converted)
      
      // Store the game's explanation time setting for use in leaderboard displays
      setGameExplanationTime(Math.round(data.explanationTime / 1000) || 30);
      
      // Hide question interface during explanation
      setQuestion(null);
      
      // Auto-scroll to explanation on mobile
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          if (import.meta.env.DEV) {
            console.log('📱 Auto-scrolling to explanation');
          }
          const explanationContent = document.querySelector('.explanation-content, .quiz-explanation');
          if (explanationContent) {
            explanationContent.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 300);
      }
    });

    // Handle individual player answer data for accurate status
    on('playerAnswerData', (data) => {
      if (import.meta.env.DEV) {
        console.log('🎯 Received player answer data:', data);
      }
      setCurrentPlayerAnswerData(data);
    });

    // Handle intermediate scoreboard - for questions without explanations
    on('showLeaderboard', (data) => {
      if (import.meta.env.DEV) {
        console.log('🏆 Received intermediate leaderboard data:', data);
        console.log('Current player state:', { score, streak, questionScore, answerResult, feedback });
      }
      
      // Store the latest standings for use in explanations
      setLatestStandings(data.standings);
      
      // Create unified leaderboard data - same structure as explanation mode
      const leaderboardData = {
        // No explanation data for intermediate
        // Answer stats and correct answer (if available)
        correctAnswer: data.correctAnswer,
        correctOption: data.correctOption,
        answerStats: data.answerStats,
        
        // Current player data using server standings
        currentPlayer: (() => {
          const currentPlayerData = data.standings.find(p => p.name === name);
          if (currentPlayerData) {
            return { 
              ...currentPlayerData, 
              id: currentPlayerData.name,
              name: currentPlayerData.name,
              score: currentPlayerData.score,
              streak: currentPlayerData.streak,
              rank: currentPlayerData.rank,
              questionScore: questionScore || 0,
              isCorrect: currentPlayerAnswerData?.isCorrect ?? answerResult?.isCorrect ?? (feedback?.includes('正解') || false)
            };
          }
          return { 
            id: name,
            name, 
            score: score, 
            rank: data.standings.length + 1,
            questionScore: questionScore || 0,
            isCorrect: currentPlayerAnswerData?.isCorrect ?? answerResult?.isCorrect ?? (feedback?.includes('正解') || false),
            streak: streak
          };
        })(),
        
        // Always include standings
        standings: data.standings.map((player, index) => ({
          ...player,
          id: player.name,
          rank: index + 1
        })),
        totalPlayers: data.standings.length,
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions,
        isIntermediate: true
      };
      
      if (import.meta.env.DEV) {
        console.log('Unified intermediate leaderboard data:', leaderboardData);
      }
      
      // Use the same explanation system but with no explanation content
      setExplanationData({ 
        explanation: null, // No explanation content
        ...leaderboardData 
      });
      setShowExplanation(true);
      
      // Set leaderboard timer - use remainingTime for reconnection sync, or full time for new leaderboards
      let timerValue;
      if (data.remainingTime !== undefined && data.remainingTime > 0) {
        // Reconnection scenario - use remaining time from server
        timerValue = Math.ceil(data.remainingTime / 1000);
        if (import.meta.env.DEV) {
          console.log('⏰ Using remaining leaderboard time from server:', timerValue, 'seconds');
        }
      } else {
        // New leaderboard - use full time
        timerValue = data.explanationTime / 1000;
        if (import.meta.env.DEV) {
          console.log('⏰ Using full leaderboard time:', timerValue, 'seconds');
        }
      }
      
      setExplanationTimer(timerValue); // Convert to seconds for display
      setInitialExplanationDuration(data.explanationTime); // Store in milliseconds (backend already converted)
    });

    // Handle game over
    on('game_over', ({ scoreboard }) => {
      navigate('/scoreboard', { state: { scoreboard, name, room } });
    });

    return () => {
      // Skip cleanup in preview mode
      if (previewMode) return;
      
      off('playerSessionRestored');
      off('sessionRestoreError');
      off('sessionExpired');
      off('question');
      off('answerResult');
      off('showExplanation');
      off('playerAnswerData');
      off('showLeaderboard');
      off('game_over');
    };
  }, [name, room, navigate, on, off, previewMode, sessionRestored, isConnected]);

  // Separate useEffect for reconnection timeout to avoid infinite loops
  useEffect(() => {
    // Skip in preview mode
    if (previewMode) return;
    
    // Only apply timeout if we're in a potential stuck state:
    // - Connected to server
    // - Have session data (name and room)
    // - But no question AND no explanation showing AND not restored
    // This indicates we're stuck in loading, not in normal game flow
    const isStuckInLoading = isConnected && name && room && 
                           !question && !showExplanation && !sessionRestored;
    
    if (isStuckInLoading) {
      if (import.meta.env.DEV) {
        console.log('🕐 Player appears stuck in loading state, setting timeout...');
      }
      
      const timeout = setTimeout(() => {
        // Final check before redirecting
        if (!question && !showExplanation && !sessionRestored) {
          if (import.meta.env.DEV) {
            console.log('⏰ Reconnection timeout, redirecting to join page');
          }
          navigate('/join');
        }
      }, 15000); // 15 second timeout
      
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [sessionRestored, isConnected, name, room, question, previewMode, navigate, showExplanation]);

  // Timer effect for questions - using managed interval
  useManagedInterval(
    () => {
      if (!question || timer <= 0 || showExplanation) return;
      
      setTimer(prev => {
        if (prev <= 1) {
          // Time's up, auto-submit null answer if not already answered
          if (selected === null) {
            handleAnswer(null);
          }
          // Check if explanation should be shown when time is up
          if (question._dbData?.explanation_title || question._dbData?.explanation_text || question._dbData?.explanation_image_url) {
            // Wait for server explanation event - do not redirect immediately
            return 0;
          }
          return 0;
        }
        return prev - 1;
      });
    },
    1000,
    [question, selected, timer, showExplanation]
  );

  // Timer effect for explanations - using managed interval
  useManagedInterval(
    () => {
      if (!showExplanation || explanationTimer <= 0) return;
      
      setExplanationTimer(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    },
    1000,
    [showExplanation, explanationTimer]
  );

  const handleAnswer = (index) => {
    if (selected !== null) return; // Prevent multiple selections
    if (timer <= 0) return; // Prevent answers after time is up
    if (showExplanation) return; // Prevent answers during explanation
    
    setSelected(index);
    
    const timeTaken = question ? Math.round((question.timeLimit / 1000) - timer) : 0;
    
    emit("answer", { 
      gameCode: room, 
      questionId: question.id,
      selectedOption: index,
      timeTaken: timeTaken
    });
  };

  useEffect(() => {
    // Receive result from server
    on('answer_result', ({ correct }) => {
      setFeedback(correct ? "正解！" : " 残念!");
    });

    return () => {
      off('answer_result');
    };
  }, [on, off]);

  const handleExplanationComplete = () => {
    setShowExplanation(false);
    setExplanationData(null);
    setExplanationTimer(0);
    setInitialExplanationDuration(0); // Reset the duration
  };

  // Unified explanation/leaderboard display
  if (showExplanation && explanationData) {
    // Create unified displayData structure for PostQuestionDisplay
    const displayData = {
      // Explanation data (null if none exists)
      explanation: explanationData.explanation ? {
        title: explanationData.explanation.title,
        text: explanationData.explanation.text,
        image_url: explanationData.explanation.image_url
      } : null,
      
      // Leaderboard data (always present)
      leaderboard: {
        // Answer stats and correct answer
        correctAnswer: explanationData.correctAnswer,
        correctOption: explanationData.correctOption,
        answerStats: explanationData.answerStats,
        
        // Current player data - prioritize server data over local state
        currentPlayer: (() => {
          // First try to get current player from server standings (most accurate)
          const serverPlayerData = explanationData.standings?.find(p => p.name === name);
          if (serverPlayerData) {
            return {
              ...serverPlayerData,
              id: serverPlayerData.name,
              name: serverPlayerData.name,
              score: serverPlayerData.score,
              streak: serverPlayerData.streak,
              rank: serverPlayerData.rank || (explanationData.standings?.findIndex(p => p.name === name) + 1),
              questionScore: questionScore || 0,
              isCorrect: currentPlayerAnswerData?.isCorrect ?? answerResult?.isCorrect ?? (feedback?.includes('正解') || false)
            };
          }
          
          // Fallback to explanationData.currentPlayer if provided
          if (explanationData.currentPlayer) {
            return {
              ...explanationData.currentPlayer,
              questionScore: questionScore || 0,
              isCorrect: currentPlayerAnswerData?.isCorrect ?? answerResult?.isCorrect ?? (feedback?.includes('正解') || false)
            };
          }
          
          // Final fallback to local state (least accurate)
          return {
            id: name,
            name: name,
            score: score,
            streak: streak,
            rank: (explanationData.standings?.length || 0) + 1,
            questionScore: questionScore || 0,
            isCorrect: currentPlayerAnswerData?.isCorrect ?? answerResult?.isCorrect ?? (feedback?.includes('正解') || false)
          };
        })(),
        
        // Standings data
        standings: explanationData.standings || (latestStandings && latestStandings.map((player, index) => ({
          ...player,
          id: player.name,
          rank: index + 1
        }))),
        totalPlayers: explanationData.totalPlayers || latestStandings?.length || 0,
        isIntermediate: explanationData.isIntermediate || false
      },
      
      // Duration for timer - use current explanationTimer state (accounts for restored time)
      duration: explanationTimer * 1000, // Convert seconds back to milliseconds for PostQuestionDisplay
      initialDuration: initialExplanationDuration // Keep the original duration for reference
    };

    return (
      <PostQuestionDisplay
        displayData={displayData}
        onComplete={handleExplanationComplete}
      />
    );
  }

  if (!question) return (
    <div className="page-container">
      <div className="card">
        {!sessionRestored && isConnected && !showExplanation ? (
          <div className="quiz-loading reconnecting">
            <div className="quiz-loading-skeleton">
              <div className="loading-bar"></div>
              <div className="loading-text">ゲームに再接続中...</div>
              <div className="loading-subtext">
                接続が復旧するまでお待ちください
              </div>
            </div>
          </div>
        ) : (
          <LoadingSkeleton type="question" count={1} />
        )}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <QuizContent
        question={question}
        selected={selected}
        answerResult={answerResult}
        timer={timer}
        score={score}
        streak={streak}
        questionScore={questionScore}
        onAnswer={handleAnswer}
        showConnectionStatus={true}
        previewMode={false}
      />
    </div>
  );
}

export default Quiz;