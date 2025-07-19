import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../socket';
import './quizControl.css';

function QuizControl() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { room, title } = state || {};

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [nextQuestion, setNextQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [canAdvance, setCanAdvance] = useState(false);

  useEffect(() => {
    if (!room || !title) {
      navigate('/host');
      return;
    }

    // Listen for questions
    socket.on('question', (question) => {
      setCurrentQuestion(question);
      setResponses([]);
      setCanAdvance(false);
    });

    // Listen for player answers
    socket.on('player_answered', ({ name }) => {
      setResponses(prev => [...prev, name]);
      setCanAdvance(true);
    });

    // Listen for game over
    socket.on('game_over', ({ scoreboard }) => {
      navigate('/scoreboard', { state: { scoreboard, room, isHost: true } });
    });

    return () => {
      socket.off('question');
      socket.off('player_answered');
      socket.off('game_over');
    };
  }, [room, title, navigate]);

  const handleNextQuestion = () => {
    socket.emit('next_question', { room });
  };

  if (!currentQuestion) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>クイズを準備中...</h2>
          <div className="loading">⌛</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="quiz-control">
        {/* Current Question Display */}
        <div className="main-question-card">
          <h2>現在の質問</h2>
          <div className="question-content">
            <h3>{currentQuestion.question}</h3>
            <ul className="options-list">
              {currentQuestion.options.map((option, i) => (
                <li key={i} className="option-item">{option}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Response Tracking */}
        <div className="responses-card">
          <h3>回答状況</h3>
          <div className="responses-list">
            {responses.map((name, i) => (
              <div key={i} className="response-item">
                <span className="position">#{i + 1}</span>
                <span className="name">{name}</span>
              </div>
            ))}
          </div>
          <button 
            className={`button next-button ${!canAdvance ? 'disabled' : ''}`}
            onClick={handleNextQuestion}
            disabled={!canAdvance}
          >
            次の質問へ
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizControl;
