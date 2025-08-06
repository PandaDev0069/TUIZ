import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useManagedInterval } from "../utils/timerManager";
import socket from "../socket";
import QuestionRenderer from "../components/quiz/QuestionRenderer";
import UnifiedPostQuestion from "../components/quiz/UnifiedPostQuestion";
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
  const [showIntermediateScores, setShowIntermediateScores] = useState(false);
  const [intermediateData, setIntermediateData] = useState(null);
  
  // New state for explanation system
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationData, setExplanationData] = useState(null);
  const [explanationTimer, setExplanationTimer] = useState(0);
  const [answerResult, setAnswerResult] = useState(null);

  useEffect(() => {
    if (!name || !room) {
      navigate('/join');
      return;
    }

    // Receive question from server
    socket.on('question', (q) => {
      console.log('📋 Received question:', q);
      setQuestion(q);
      setSelected(null);
      setFeedback("");
      setShowExplanation(false);
      setExplanationData(null);
      setAnswerResult(null);
      
      // Use dynamic timer from question or default to 10
      const questionTimer = q.timeLimit ? Math.round(q.timeLimit / 1000) : 10;
      setTimer(questionTimer);
      
      setQuestionScore(0);
      setShowIntermediateScores(false);
      
      // Auto-scroll to quiz content on mobile when new question arrives
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          console.log('📱 Auto-scrolling to new quiz question');
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
      console.log('✅ Answer result:', result);
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
      console.log('💡 Showing explanation:', data);
      setExplanationData(data);
      setShowExplanation(true);
      
      // Set explanation timer
      const explainTimer = Math.round(data.explanationTime / 1000) || 30;
      setExplanationTimer(explainTimer);
      
      // Hide question interface during explanation
      setQuestion(null);
      
      // Auto-scroll to explanation on mobile
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          console.log('📱 Auto-scrolling to explanation');
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

    // Handle intermediate scoreboard - DISABLED (conflicts with explanation system)
    // The explanation system in UnifiedPostQuestion already handles leaderboard display
    /*
    socket.on('showLeaderboard', (data) => {
      console.log('🏆 Received intermediate leaderboard data:', data);
      console.log('Current question state:', { question, showIntermediateScores, showExplanation });
      
      // Transform the data to match UnifiedPostQuestion expectations for intermediate display
      const leaderboardData = {
        standings: data.standings.map((player, index) => ({
          ...player,
          id: player.name, // Component expects id field
        })),
        currentPlayer: (() => {
          const currentPlayerData = data.standings.find(p => p.name === name);
          if (currentPlayerData) {
            return { 
              ...currentPlayerData, 
              id: currentPlayerData.name,
              score: score, // Use local score state for accuracy
              questionScore: questionScore, // Recent question score
              isCorrect: feedback?.startsWith('正解'), // Determine from feedback
              streak: streak
            };
          }
          return { 
            id: name,
            name, 
            score, 
            rank: data.standings.length + 1,
            questionScore: questionScore,
            isCorrect: feedback?.startsWith('正解'),
            streak: streak
          };
        })(),
        totalPlayers: data.standings.length,
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions,
        isIntermediate: true // Flag to indicate this is intermediate, not post-question
      };
      
      console.log('Transformed intermediate leaderboard data:', leaderboardData);
      setIntermediateData(leaderboardData);
      setShowIntermediateScores(true);
      console.log('Set showIntermediateScores to true');
    });
    */

    // Handle game over
    socket.on('game_over', ({ scoreboard }) => {
      navigate('/scoreboard', { state: { scoreboard, name, room } });
    });

    return () => {
      socket.off('question');
      socket.off('answerResult');
      socket.off('showExplanation');
      // socket.off('showLeaderboard'); // Commented out - not used anymore
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

  const handleIntermediateComplete = () => {
    setShowIntermediateScores(false);
  };

  // Get question type display name
  const getQuestionTypeName = (questionType) => {
    switch (questionType) {
      case 'multiple_choice_4':
        return '4択問題';
      case 'multiple_choice_2':
        return '2択問題';
      case 'true_false':
        return '○×問題';
      default:
        return '問題';
    }
  };

  if (showIntermediateScores && intermediateData) {
    // Intermediate leaderboard is now handled by the explanation system
    // This code path should not be used anymore
    console.log('⚠️ Intermediate leaderboard triggered - this should be handled by explanation system');
    setShowIntermediateScores(false);
    return null;
  }

  // Show explanation with leaderboard if available
  if (showExplanation && explanationData) {
    const explanation = {
      title: explanationData.explanation?.title,
      text: explanationData.explanation?.text,
      image_url: explanationData.explanation?.image_url
    };

    const leaderboard = explanationData.answerStats ? {
      correctAnswer: explanationData.correctAnswer,
      correctOption: explanationData.correctOption,
      answerStats: explanationData.answerStats,
      currentPlayer: {
        score: score,
        streak: streak,
        questionScore: questionScore,
        isCorrect: answerResult?.isCorrect
      }
    } : null;

    const handleExplanationComplete = () => {
      setShowExplanation(false);
      setExplanationData(null);
      setExplanationTimer(0);
    };

    return (
      <UnifiedPostQuestion
        explanation={explanation}
        leaderboard={leaderboard}
        explanationDuration={explanationTimer * 1000}
        onComplete={handleExplanationComplete}
        gameSettings={{}}
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
        
        {feedback && (
          <p className={`quiz-feedback ${feedback.startsWith('正解') ? 'correct' : 'wrong'}`}>
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}

export default Quiz;