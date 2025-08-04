import { useEffect, useState } from 'react';
import './intermediatescoreboard.css';

function IntermediateScoreboard({ 
  top5, 
  currentPlayer, 
  totalPlayers, 
  onComplete, 
  compact = false,
  leaderboard = null,
  gameSettings = {} 
}) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    setShowAnimation(true);
  }, []);

  return (
    <div className={`intermediate-scoreboard-overlay ${compact ? 'compact' : ''}`}>
      <div className="intermediate-scoreboard">
        <div className="header">
          <h2>{compact ? 'スコア' : '現在のリーダーボード'}</h2>
          {!compact && (
            <div className="timer">ホストが次の質問を開始するまでお待ちください...</div>
          )}
        </div>

        {leaderboard?.answerStats && (
          <div className="answer-stats-section">
            <h3>回答統計</h3>
            <div className="stats-summary">
              正解: <strong>{leaderboard.correctOption}</strong>
              <br />
              正解率: <strong>{leaderboard.answerStats.correctPercentage}%</strong>
            </div>
          </div>
        )}

        <div className="leaderboard-section">
          <h3>{compact ? 'トップ3' : '上位5位'}</h3>
          <div className={`top5-grid ${compact ? 'compact-grid' : ''}`}>
            {(compact ? top5?.slice(0, 3) : top5)?.map((player, index) => (
              <div 
                key={player.id}
                className={`score-box rank-${index + 1} ${currentPlayer?.id === player.id ? 'current-player' : ''}`}
              >
                <div className="rank-badge">#{index + 1}</div>
                <div className="player-content">
                  <div className="player-name">
                    {player.name}
                  </div>
                  <div className="player-score">{player.score}pt</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {currentPlayer && currentPlayer.rank > (compact ? 3 : 5) && (
          <div className="current-player-section">
            <h3>あなたの順位</h3>
            <div className="score-box current-player-highlight">
              <div className="rank-badge">#{currentPlayer.rank}</div>
              <div className="player-content">
                <div className="player-name">
                  {currentPlayer.name}
                </div>
                <div className="player-score">{currentPlayer.score}pt</div>
              </div>
            </div>
          </div>
        )}

        {leaderboard?.currentPlayer && (
          <div className="player-result-section">
            <div className={`result-badge ${leaderboard.currentPlayer.isCorrect ? 'correct' : 'incorrect'}`}>
              {leaderboard.currentPlayer.isCorrect ? '正解!' : '不正解'}
              {leaderboard.currentPlayer.questionScore > 0 && 
                ` +${leaderboard.currentPlayer.questionScore}pt`}
            </div>
            {leaderboard.currentPlayer.streak > 1 && (
              <div className="streak-display">
                🔥 {leaderboard.currentPlayer.streak}連続!
              </div>
            )}
          </div>
        )}

        <div className="total-players">
          {compact ? `${totalPlayers}人` : `合計 ${totalPlayers} 人のプレイヤー`}
        </div>
      </div>
    </div>
  );
}

export default IntermediateScoreboard;
