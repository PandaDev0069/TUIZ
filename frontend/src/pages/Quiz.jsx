import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import IntermediateScoreboard from "../components/IntermediateScoreboard";
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

  useEffect(() => {
    if (!name || !room) {
      navigate('/join');
      return;
    }

    // Receive question from server
    socket.on('question', (q) => {
      setQuestion(q);
      setSelected(null);
      setFeedback("");
      setTimer(10); // Reset timer for new question
      setQuestionScore(0);
      setShowIntermediateScores(false);
    });

    // Handle answer result
    socket.on('answer_result', (result) => {
      setScore(result.score);
      setStreak(result.streak);
      setQuestionScore(result.questionScore);
      
      if (result.correct) {
        setFeedback(`正解！ +${result.questionScore}点 ${result.streak > 1 ? `🔥 ${result.streak}連続!` : ''}`);
      } else {
        setFeedback("不正解...");
      }
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
      socket.off('answer_result');
      socket.off('show_intermediate_scores');
      socket.off('game_over');
    };
  }, [name, room, navigate]);

  // Timer effect
  useEffect(() => {
    if (!question || selected !== null || timer <= 0) return;

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
  }, [question, selected, timer]);

  const handleAnswer = (index) => {
    if (selected !== null) return; // Prevent multiple selections
    setSelected(index);
    
    socket.emit("submit_answer", { 
      room, 
      name, 
      answer: index 
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

  if (!question) return (
    <div className="page-container">
      <div className="card">
        <h2>次の質問を待っています...</h2>
        <div className="loading">⌛</div>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="quiz-page">
        <div className="player-stats">
          <div className="current-score">スコア: {score}</div>
          {streak > 1 && <div className="streak-badge">🔥 {streak}連続!</div>}
          {questionScore > 0 && <div className="last-points">+{questionScore}</div>}
        </div>
        
        <div className="timer">{timer}</div>
        <h2>{question.question}</h2>
        <ul className="options-list">
          {question.options.map((opt, i) => (
            <li
              key={i}
              onClick={() => handleAnswer(i)}
              className={`option-item ${selected === i ? 'selected' : ''} ${
                selected !== null ? 'disabled' : ''
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
        {feedback && (
          <p className={`feedback ${feedback.includes('正解') ? 'correct' : 'wrong'}`}>
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}

export default Quiz;