import { usePreview } from '../contexts/PreviewContext';
import './previewPlayerView.css';

function PreviewPlayerView() {
  const {
    currentQuestion,
    currentQuestionIndex,
    gamePhase,
    timer,
    isTimerRunning,
    selectedAnswer,
    playerScores,
    mockPlayers,
    isMobileView,
    hostAsPlayer,
    questions,
    settings,
    handleAnswerSelect
  } = usePreview();

  if (!currentQuestion) {
    return (
      <div className="preview-player-view">
        <div className="preview-no-question">
          <h3>問題がありません</h3>
          <p>プレビューを開始してください</p>
        </div>
      </div>
    );
  }

  // Get layout class based on question type and answers
  const getLayoutClass = () => {
    const answerCount = currentQuestion.answers?.length || 0;
    if (answerCount === 2) {
      // Check if it's true/false type
      const texts = currentQuestion.answers.map(a => a.text.toLowerCase().trim());
      if (texts.includes('true') && texts.includes('false') || 
          texts.includes('○') && texts.includes('×') ||
          texts.includes('はい') && texts.includes('いいえ')) {
        return 'large-buttons';
      }
      return 'horizontal';
    }
    return 'grid-2x2';
  };

  // Get current player stats (if host is playing)
  const hostPlayerStats = hostAsPlayer ? playerScores[1] : null;

  if (gamePhase === 'start') {
    return (
      <div className={`preview-player-view ${isMobileView ? 'mobile' : ''}`}>
        <div className="preview-game-start-screen">
          <h2>🎯 クイズが始まります！</h2>
          <div className="preview-quiz-info">
            <div className="preview-info-item">
              <span className="preview-info-icon">📝</span>
              <span className="preview-info-text">{questions.length} 問題</span>
            </div>
            <div className="preview-info-item">
              <span className="preview-info-icon">⏱️</span>
              <span className="preview-info-text">
                約 {Math.ceil(questions.reduce((total, q) => total + (q.timeLimit || 30), 0) / 60)} 分
              </span>
            </div>
            <div className="preview-info-item">
              <span className="preview-info-icon">👥</span>
              <span className="preview-info-text">{mockPlayers.length} 人参加</span>
            </div>
          </div>
          <div className="preview-ready-indicator">
            <div className="preview-pulse-circle">
              <span className="preview-ready-text">準備完了!</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'results') {
    const leaderboard = mockPlayers.map(player => ({
      ...player,
      ...playerScores[player.id]
    })).sort((a, b) => b.score - a.score);

    return (
      <div className={`preview-player-view ${isMobileView ? 'mobile' : ''}`}>
        <div className="preview-final-results">
          <h2>🏆 最終結果</h2>
          <div className="preview-final-leaderboard">
            {leaderboard.map((player, index) => (
              <div
                key={player.id}
                className={`preview-result-item ${index === 0 ? 'winner' : ''} ${player.isHost ? 'host-player' : ''}`}
              >
                <div className="preview-rank">{index + 1}</div>
                <div className="preview-player-info">
                  <div className="preview-player-name">
                    {player.name}
                    {player.isHost && <span className="preview-host-badge">HOST</span>}
                  </div>
                  <div className="preview-player-stats">
                    <span className="preview-score">{player.score}pt</span>
                    <span className="preview-correct">{player.totalCorrect}/{questions.length}</span>
                  </div>
                </div>
                {index === 0 && <div className="preview-winner-crown">👑</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`preview-player-view ${isMobileView ? 'mobile' : ''}`}>
      {/* Player Stats (if host is playing) */}
      {hostAsPlayer && hostPlayerStats && (
        <div className="preview-player-stats">
          <div className="preview-current-score">スコア: {hostPlayerStats.score}</div>
          {hostPlayerStats.streak > 1 && (
            <div className="preview-streak-badge">🔥 {hostPlayerStats.streak}連続!</div>
          )}
        </div>
      )}

      {/* Progress indicator */}
      {settings.game_settings?.showProgress && (
        <div className="preview-progress-indicator">
          問題 {currentQuestionIndex + 1} / {questions.length}
        </div>
      )}

      {/* Timer */}
      <div className={`preview-timer ${timer <= 5 ? 'warning' : ''} ${timer === 0 ? 'time-up' : ''}`}>
        {timer <= 0 ? '時間切れ!' : timer}
      </div>

      {/* Question */}
      <div className="preview-question-section">
        <h2 className="preview-question-text">{currentQuestion.text}</h2>
        {currentQuestion.image && (
          <div className="preview-question-image">
            <img src={currentQuestion.image} alt="問題画像" />
          </div>
        )}
      </div>

      {/* Answers */}
      <div className={`preview-answers-section ${getLayoutClass()}`}>
        {currentQuestion.answers?.map((answer, index) => (
          <button
            key={index}
            className={`preview-answer-option ${selectedAnswer === index ? 'selected' : ''} ${
              selectedAnswer !== null || timer <= 0 ? 'disabled' : ''
            } ${
              selectedAnswer !== null && answer.isCorrect ? 'correct' : ''
            } ${
              selectedAnswer === index && !answer.isCorrect ? 'incorrect' : ''
            }`}
            onClick={() => handleAnswerSelect(index)}
            disabled={selectedAnswer !== null || timer <= 0}
          >
            <div className="preview-answer-content">
              {answer.image && (
                <div className="preview-answer-image">
                  <img src={answer.image} alt={`選択肢 ${index + 1}`} />
                </div>
              )}
              <div className="preview-answer-text">{answer.text}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {selectedAnswer !== null && (
        <div className={`preview-feedback ${currentQuestion.answers[selectedAnswer]?.isCorrect ? 'correct' : 'incorrect'}`}>
          {currentQuestion.answers[selectedAnswer]?.isCorrect ? (
            <span>✅ 正解！</span>
          ) : (
            <span>❌ 不正解</span>
          )}
        </div>
      )}

      {/* Auto-advance indicator */}
      {settings.game_settings?.autoAdvance && selectedAnswer !== null && (
        <div className="preview-auto-advance-indicator">
          {settings.game_settings?.showExplanations ? 
            '解説画面に移動します...' : 
            '次の問題に移動します...'}
        </div>
      )}
    </div>
  );
}

export default PreviewPlayerView;
