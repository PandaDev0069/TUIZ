import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTimerManager } from '../utils/timerManager';
import socket from '../socket';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './quizControl.css';

function QuizControl() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { room, title } = state || {};

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [nextQuestion, setNextQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [canAdvance, setCanAdvance] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [hostTimer, setHostTimer] = useState(0);
  
  // Use managed timer manager
  const timerManager = useTimerManager();
  let questionTimerId = null;
  let timerIntervalId = null;

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
      
      // Set up timer to automatically enable advancement after question time limit
      const timeLimit = question.timeLimit || 10000; // Default 10 seconds
      const timeLimitSeconds = Math.floor(timeLimit / 1000);
      setHostTimer(timeLimitSeconds);
      
      // Clear existing timers
      if (questionTimerId) {
        timerManager.clearTimeout(questionTimerId);
      }
      if (timerIntervalId) {
        timerManager.clearInterval(timerIntervalId);
      }
      
      // Visual countdown timer
      timerIntervalId = timerManager.setInterval(() => {
        setHostTimer(prev => {
          if (prev <= 1) {
            timerManager.clearInterval(timerIntervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000, 'hostCountdown');
      
      // Auto-enable advancement timer
      questionTimerId = timerManager.setTimeout(() => {
        setCanAdvance(true);
      }, timeLimit, 'questionTimeout');
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

    // Listen for host analytics
    socket.on('show_host_analytics', (data) => {
      setAnalyticsData(data);
      setShowAnalytics(true);
    });

    return () => {
      socket.off('question');
      socket.off('player_answered');
      socket.off('game_over');
      socket.off('show_host_analytics');
      
      // Clean up timers - handled automatically by timerManager
      // No need for manual cleanup
    };
  }, [room, title, navigate]);

  const handleNextQuestion = () => {
    socket.emit('next_question', { room });
    setResponses([]);
    setCanAdvance(false);
    
    // Clear existing timers using timerManager
    if (questionTimerId) {
      timerManager.clearTimeout(questionTimerId);
      questionTimerId = null;
    }
    if (timerIntervalId) {
      timerManager.clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
    setHostTimer(0);
  };

  const handleContinueGame = () => {
    socket.emit('continue_game', { room });
    setShowAnalytics(false);
    setAnalyticsData(null);
    setResponses([]);
    setCanAdvance(false);
    
    // Clear existing timers using timerManager
    if (questionTimerId) {
      timerManager.clearTimeout(questionTimerId);
      questionTimerId = null;
    }
    if (timerIntervalId) {
      timerManager.clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
    setHostTimer(0);
  };

  // Get layout class based on question type
  const getLayoutClass = (questionType) => {
    switch (questionType) {
      case 'multiple_choice_4':
        return 'grid-2x2';
      case 'multiple_choice_2':
        return 'horizontal';
      case 'true_false':
        return 'large-buttons';
      default:
        return 'grid-2x2';
    }
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

  if (!currentQuestion) {
    return (
      <div className="page-container">
        <div className="card">
          <LoadingSkeleton type="question" count={1} />
        </div>
      </div>
    );
  }

  // Analytics Modal Component
  const AnalyticsModal = () => (
    <div className="analytics-overlay">
      <div className="analytics-modal">
        <div className="analytics-header">
          <h2>📊 質問結果分析</h2>
          <div className="analytics-summary">
            {analyticsData?.analytics && (
              <>
                <div className="stat-item">
                  <span className="stat-label">回答率:</span>
                  <span className="stat-value">{analyticsData.analytics.responseRate}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">正解率:</span>
                  <span className="stat-value">{analyticsData.analytics.correctRate}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">回答者数:</span>
                  <span className="stat-value">{analyticsData.analytics.totalResponses}/{analyticsData.analytics.totalPlayers}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="analytics-content">
          <div className="answer-distribution">
            <h3>回答分布 ({getQuestionTypeName(analyticsData?.analytics?.questionType)})</h3>
            {analyticsData?.analytics?.answerDistribution?.map((count, index) => {
              const questionType = analyticsData?.analytics?.questionType;
              let optionLabel = `選択肢 ${index + 1}`;
              
              // Custom labels for true/false questions
              if (questionType === 'true_false') {
                optionLabel = index === 0 ? '正解 (○)' : '不正解 (×)';
              }
              
              return (
                <div key={index} className="answer-bar">
                  <span className="answer-label">{optionLabel}</span>
                  <div className="bar-container">
                    <div 
                      className={`bar ${currentQuestion?.correctIndex === index ? 'correct' : ''}`}
                      style={{ width: `${analyticsData.analytics.totalResponses > 0 ? (count / analyticsData.analytics.totalResponses) * 100 : 0}%` }}
                    ></div>
                    <span className="count">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="top-players">
            <h3>現在の上位プレイヤー</h3>
            {analyticsData?.leaderboard?.slice(0, 5).map((player, index) => (
              <div key={player.id} className="player-rank">
                <span className="rank">#{index + 1}</span>
                <span className="name">{player.name}</span>
                <span className="score">{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-actions">
          <button className="continue-button" onClick={handleContinueGame}>
            次の質問へ進む ➡️
          </button>
        </div>
      </div>
    </div>
  );

  if (showAnalytics && analyticsData) {
    return <AnalyticsModal />;
  }

  return (
    <div className="page-container">
      <div className="quiz-control">
        {/* Current Question Display */}
        <div className="main-question-card">
          <div className="question-header">
            <h2>現在の質問</h2>
            <div className={`host-timer ${hostTimer <= 0 ? 'time-up' : ''}`}>
              {hostTimer <= 0 ? '時間切れ!' : `残り ${hostTimer}秒`}
            </div>
          </div>
          
          <div className="question-content">
            <h3>{currentQuestion.question}</h3>
            <ul className={`quiz-options-list ${getLayoutClass(currentQuestion.type)}`}>
              {currentQuestion.options.map((option, i) => (
                <li key={i} className="quiz-option-item">
                  {currentQuestion.type === 'true_false' ? '' : option}
                </li>
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
          
          {/* Manual override button */}
          {!canAdvance && responses.length > 0 && (
            <button 
              className="button override-button"
              onClick={() => setCanAdvance(true)}
            >
              手動で次へ ({responses.length}人が回答済み)
            </button>
          )}
          
          <button 
            className={`button next-button ${!canAdvance ? 'disabled' : ''}`}
            onClick={handleNextQuestion}
            disabled={!canAdvance}
          >
            {hostTimer <= 0 ? '次の質問へ' : `次の質問へ (${hostTimer}秒後に有効)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizControl;
