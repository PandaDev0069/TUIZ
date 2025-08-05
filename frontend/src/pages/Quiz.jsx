import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import IntermediateScoreboard from "../components/IntermediateScoreboard";
import QuestionRenderer from "../components/quiz/QuestionRenderer";
import PostQuestionDisplay from "../components/quiz/PostQuestionDisplay";
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
    });

    // Handle intermediate scoreboard
    socket.on('show_intermediate_scores', (data) => {
      setIntermediateData(data);
      setShowIntermediateScores(true);
    });

    // Handle game over
    socket.on('game_over', ({ scoreboard }) => {
      navigate('/scoreboard', { state: { scoreboard, name, room } });
    });

    return () => {
      socket.off('question');
      socket.off('answerResult');
      socket.off('showExplanation');
      socket.off('show_intermediate_scores');
      socket.off('game_over');
    };
  }, [name, room, navigate]);

  // Timer effect for questions
  useEffect(() => {
    if (!question || selected !== null || timer <= 0 || showExplanation) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Time's up, auto-submit null answer
          handleAnswer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question, selected, timer, showExplanation]);

  // Timer effect for explanations
  useEffect(() => {
    if (!showExplanation || explanationTimer <= 0) return;

    const interval = setInterval(() => {
      setExplanationTimer(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showExplanation, explanationTimer]);

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
    return (
      <IntermediateScoreboard 
        top5={intermediateData.top5}
        currentPlayer={intermediateData.currentPlayer}
        totalPlayers={intermediateData.totalPlayers}
        onComplete={handleIntermediateComplete}
      />
    );
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
      <PostQuestionDisplay
        explanation={explanation}
        leaderboard={leaderboard}
        showExplanation={!!explanation.title || !!explanation.text || !!explanation.image_url}
        showLeaderboard={!!leaderboard}
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