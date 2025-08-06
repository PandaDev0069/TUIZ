import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useManagedInterval } from "../utils/timerManager";
import socket from "../socket";
import QuestionRenderer from "../components/quiz/QuestionRenderer";
import PostQuestionDisplay from "../components/quiz/PostQuestionDisplay/PostQuestionDisplay";
import LoadingSkeleton from "../components/LoadingSkeleton";
import "./quiz.css";

function Quiz() {
  const { state } = useLocation();
  const { name, room } = state || {};
  const navigate = useNavigate();

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
    if (!name || !room) {
      navigate('/join');
      return;
    }

    // Receive question from server
    socket.on('question', (q) => {
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
    socket.on('answerResult', (result) => {
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
    socket.on('showExplanation', (data) => {
      if (import.meta.env.DEV) {
        console.log('💡 Showing explanation:', data);
      }
      setExplanationData(data);
      setShowExplanation(true);
      
      // Set explanation timer
      const explainTimer = Math.round(data.explanationTime / 1000) || 30;
      setExplanationTimer(explainTimer);
      setInitialExplanationDuration(explainTimer); // Store the original duration
      
      // Store the game's explanation time setting for use in leaderboard displays
      setGameExplanationTime(explainTimer);
      
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
    socket.on('playerAnswerData', (data) => {
      if (import.meta.env.DEV) {
        console.log('🎯 Received player answer data:', data);
      }
      setCurrentPlayerAnswerData(data);
    });

    // Handle intermediate scoreboard - for questions without explanations
    socket.on('showLeaderboard', (data) => {
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
      setExplanationTimer(data.explanationTime); // Use explanation time from server
      setInitialExplanationDuration(data.explanationTime); // Store the original duration
    });

    // Handle game over
    socket.on('game_over', ({ scoreboard }) => {
      navigate('/scoreboard', { state: { scoreboard, name, room } });
    });

    return () => {
      socket.off('question');
      socket.off('answerResult');
      socket.off('showExplanation');
      socket.off('playerAnswerData');
      socket.off('showLeaderboard');
      socket.off('game_over');
    };
  }, [name, room, navigate]);

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
    
    socket.emit("answer", { 
      gameCode: room, 
      questionId: question.id,
      selectedOption: index,
      timeTaken: timeTaken
    });
  };

  useEffect(() => {
    // Receive result from server
    socket.on('answer_result', ({ correct }) => {
      setFeedback(correct ? "正解！" : " 残念!");
    });

    return () => {
      socket.off('answer_result');
    };
  }, []);

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
      
      // Duration for timer - USE INITIAL DURATION, not current timer
      duration: initialExplanationDuration * 1000
    };

    if (import.meta.env.DEV) {
      console.log('🔍 PostQuestionDisplay data:', {
        hasExplanation: !!displayData.explanation,
        hasAnswerStats: !!displayData.leaderboard.answerStats,
        hasStandings: !!(displayData.leaderboard.standings && displayData.leaderboard.standings.length > 0),
        standingsCount: displayData.leaderboard.standings?.length || 0,
        currentPlayer: displayData.leaderboard.currentPlayer,
        isIntermediate: displayData.leaderboard.isIntermediate,
        duration: displayData.duration
      });
    }

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
        <LoadingSkeleton type="question" count={1} />
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="quiz-page">
        <div className="quiz-header">
          <div className="quiz-player-stats">
            <div className="quiz-current-score">スコア: {score}</div>
            {streak > 1 && <div className="quiz-streak-badge">🔥 {streak}連続!</div>}
            {questionScore > 0 && <div className="quiz-last-points">+{questionScore}</div>}
          </div>
        </div>

        
        <QuestionRenderer
          key={question?.id || question?.questionNumber}
          question={question}
          selected={selected}
          answerResult={answerResult}
          timer={timer}
          onAnswer={handleAnswer}
          showProgress={true}
          showTimer={true}
        />
      </div>
    </div>
  );
}

export default Quiz;