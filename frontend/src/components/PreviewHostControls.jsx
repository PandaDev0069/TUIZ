import { usePreview } from '../contexts/PreviewContext';
import { useState } from 'react';
import './previewHostControls.css';

function PreviewHostControls() {
  const {
    gamePhase,
    currentQuestion,
    currentQuestionIndex,
    timer,
    isTimerRunning,
    questions,
    settings,
    previewMode,
    handleNextQuestion,
    handlePreviousQuestion,
    handleSkipToExplanation,
    setGamePhase,
    setTimer,
    setIsTimerRunning,
    startPreview,
    mockPlayers,
    playerScores,
    addSimulatedPlayer,
    removeSimulatedPlayer,
    setActivePlayer,
    activePlayerId
  } = usePreview();

  const [newPlayerName, setNewPlayerName] = useState('');

  // Get quick stats
  const getQuickStats = () => {
    const totalPlayers = mockPlayers.length;
    const playersAnswered = Object.values(playerScores).filter(p => p.score > 0 || p.totalCorrect > 0).length;
    const averageScore = Object.values(playerScores).reduce((sum, p) => sum + p.score, 0) / totalPlayers;

    return { totalPlayers, playersAnswered, averageScore: Math.round(averageScore) };
  };

  const stats = getQuickStats();

  return (
    <div className="preview-host-controls">
      <div className="preview-controls-header">
        <h3>🎮 ホストコントロール</h3>
        <div className="preview-game-status">
          <span className={`preview-status-badge ${gamePhase}`}>
            {gamePhase === 'start' && '🎯 開始前'}
            {gamePhase === 'question' && '❓ 問題中'}
            {gamePhase === 'explanation' && '📖 解説中'}
            {gamePhase === 'results' && '🏆 結果'}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="preview-quick-stats">
        <div className="preview-stat-card">
          <div className="preview-stat-value">{stats.totalPlayers}</div>
          <div className="preview-stat-label">参加者</div>
        </div>
        <div className="preview-stat-card">
          <div className="preview-stat-value">{currentQuestionIndex + 1}</div>
          <div className="preview-stat-label">/ {questions.length} 問</div>
        </div>
        <div className="preview-stat-card">
          <div className="preview-stat-value">{stats.averageScore}</div>
          <div className="preview-stat-label">平均スコア</div>
        </div>
      </div>

      {/* Current Question Info */}
      {currentQuestion && (
        <div className="preview-current-question-info">
          <h4>現在の問題</h4>
          <div className="preview-question-details">
            <div className="preview-question-preview">
              {currentQuestion.text.substring(0, 80)}...
            </div>
            <div className="preview-question-meta">
              <span className="time-limit">⏱️ {currentQuestion.timeLimit || 30}秒</span>
              <span className="points">🎯 {currentQuestion.points || 100}pt</span>
              <span className="difficulty">📊 {currentQuestion.difficulty || 'medium'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Timer Controls */}
      {gamePhase === 'question' && (
        <div className="preview-timer-controls">
          <h4>タイマー制御</h4>
          <div className="preview-timer-display">
            <span className={`preview-timer-value ${timer <= 5 ? 'warning' : ''}`}>
              {timer}秒
            </span>
            <div className="preview-timer-actions">
              <button
                className={`preview-timer-button ${isTimerRunning ? 'pause' : 'play'}`}
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                title={isTimerRunning ? 'タイマーを一時停止' : 'タイマーを再開'}
              >
                {isTimerRunning ? '⏸️' : '▶️'}
              </button>
              <button
                className="preview-timer-button reset"
                onClick={() => {
                  setTimer(currentQuestion?.timeLimit || 30);
                  setIsTimerRunning(false);
                }}
                title="タイマーをリセット"
              >
                🔄
              </button>
              <button
                className="preview-timer-button add"
                onClick={() => setTimer(timer + 10)}
                title="10秒追加"
              >
                +10
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="preview-navigation-controls">
        <h4>問題ナビゲーション</h4>
        <div className="preview-nav-buttons">
          {previewMode !== 'single' && (
            <button
              className="preview-nav-button secondary"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              title="前の問題"
            >
              ⬅️ 前の問題
            </button>
          )}
          
          {gamePhase === 'question' && settings.game_settings?.showExplanations && (
            <button
              className="preview-nav-button primary"
              onClick={handleSkipToExplanation}
              title="解説画面に移動"
            >
              📖 解説を表示
            </button>
          )}

          <button
            className="preview-nav-button primary"
            onClick={handleNextQuestion}
            disabled={previewMode !== 'single' && currentQuestionIndex >= questions.length - 1 && gamePhase === 'results'}
            title={previewMode === 'single' ? '問題をリセット' : '次の問題'}
          >
            {previewMode === 'single' ? '🔄 リセット' : 
             currentQuestionIndex >= questions.length - 1 ? '🏆 結果表示' : '➡️ 次の問題'}
          </button>
        </div>
      </div>

      {/* Game Flow Controls */}
      <div className="preview-game-flow-controls">
        <h4>ゲーム制御</h4>
        <div className="preview-flow-buttons">
          <button
            className="preview-flow-button restart"
            onClick={startPreview}
            title="プレビューを最初から開始"
          >
            🔄 最初から開始
          </button>
          
          {gamePhase !== 'start' && (
            <button
              className="preview-flow-button pause"
              onClick={() => setGamePhase('start')}
              title="開始画面に戻る"
            >
              ⏸️ 一時停止
            </button>
          )}
        </div>
      </div>

      {/* Settings Summary */}
      <div className="preview-settings-summary">
        <h4>設定サマリー</h4>
        <div className="preview-settings-list">
          <div className="preview-setting-item">
            <span className="preview-setting-name">自動進行:</span>
            <span className="preview-setting-value">
              {settings.game_settings?.autoAdvance ? '✅' : '❌'}
            </span>
          </div>
          <div className="preview-setting-item">
            <span className="preview-setting-name">解説表示:</span>
            <span className="preview-setting-value">
              {settings.game_settings?.showExplanations ? '✅' : '❌'}
            </span>
          </div>
          <div className="preview-setting-item">
            <span className="preview-setting-name">リーダーボード:</span>
            <span className="preview-setting-value">
              {settings.game_settings?.showLeaderboard ? '✅' : '❌'}
            </span>
          </div>
          <div className="preview-setting-item">
            <span className="preview-setting-name">進捗表示:</span>
            <span className="preview-setting-value">
              {settings.game_settings?.showProgress ? '✅' : '❌'}
            </span>
          </div>
          <div className="preview-setting-item">
            <span className="preview-setting-name">ポイント計算:</span>
            <span className="preview-setting-value">
              {settings.game_settings?.pointCalculation === 'time-bonus' ? '時間ボーナス' : '固定'}
            </span>
          </div>
        </div>
      </div>

      {/* Mock Players List */}
      <div className="preview-mock-players">
        <h4>プレイヤー管理</h4>
        
        {/* Active Player Selector */}
        <div className="preview-active-player-section">
          <label className="preview-control-label">現在操作中のプレイヤー:</label>
          <select 
            value={activePlayerId || ''} 
            onChange={(e) => setActivePlayer(e.target.value ? parseInt(e.target.value) : null)}
            className="preview-active-player-selector"
          >
            <option value="">観戦のみ (AI自動)</option>
            {mockPlayers.map(player => (
              <option key={player.id} value={player.id}>
                {player.name} {player.isHost ? '(HOST)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Add New Player */}
        <div className="preview-add-player-section">
          <div className="preview-add-player-form">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="新しいプレイヤー名"
              className="preview-player-name-input"
              maxLength={20}
            />
            <button
              onClick={() => {
                if (newPlayerName.trim() && addSimulatedPlayer) {
                  const success = addSimulatedPlayer(newPlayerName.trim());
                  if (success) {
                    setNewPlayerName('');
                  } else {
                    console.warn('Failed to add player:', newPlayerName.trim());
                  }
                }
              }}
              disabled={!newPlayerName.trim() || mockPlayers.length >= 10 || !addSimulatedPlayer}
              className="preview-add-player-button"
              title="プレイヤーを追加"
            >
              ➕ 追加
            </button>
          </div>
          {mockPlayers.length >= 10 && (
            <span className="preview-player-limit-warning">最大10人まで追加できます</span>
          )}
        </div>

        {/* Players List */}
        <div className="preview-players-list">
          {mockPlayers.map(player => {
            const playerScore = playerScores[player.id] || { score: 0, streak: 0, totalCorrect: 0 };
            const isActive = activePlayerId === player.id;
            
            return (
              <div key={player.id} className={`preview-player-item ${player.isHost ? 'host' : ''} ${isActive ? 'active-player' : ''}`}>
                <div className="preview-player-info">
                  <div className="preview-player-name">
                    {player.name}
                    {player.isHost && <span className="preview-host-badge">HOST</span>}
                    {isActive && <span className="preview-active-badge">操作中</span>}
                  </div>
                  <div className="preview-player-score">
                    <span className="preview-score">{playerScore.score}pt</span>
                    {playerScore.streak > 1 && (
                      <span className="preview-streak">🔥{playerScore.streak}</span>
                    )}
                  </div>
                </div>
                {!player.isHost && (
                  <button
                    onClick={() => removeSimulatedPlayer(player.id)}
                    className="preview-remove-player-button"
                    title="プレイヤーを削除"
                  >
                    ❌
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Player Control Instructions */}
        <div className="preview-player-instructions">
          <p className="preview-instruction-text">
            💡 <strong>操作方法:</strong>
          </p>
          <ul className="preview-instruction-list">
            <li><strong>観戦のみ:</strong> 全プレイヤーがAI自動回答</li>
            <li><strong>プレイヤー選択:</strong> 選択したプレイヤーを手動操作、他は AI</li>
            <li><strong>HOST選択:</strong> ホストとしてプレイ</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PreviewHostControls;
