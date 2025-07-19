import { useEffect, useState } from 'react';
import './intermediatescoreboard.css';

function IntermediateScoreboard({ top5, currentPlayer, totalPlayers, onComplete }) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    setShowAnimation(true);
  }, []);

  return (
    <div className="intermediate-scoreboard-overlay">
      <div className="intermediate-scoreboard">
        <div className="header">
          <h2>現在のリーダーボード</h2>
          <div className="timer">ホストが次の質問を開始するまでお待ちください...</div>
        </div>

        <div className="leaderboard-section">
          <h3>上位5位</h3>
          <div className="top5-grid">
            {top5.map((player, index) => (
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

        {currentPlayer && currentPlayer.rank > 5 && (
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

        <div className="total-players">
          合計 {totalPlayers} 人のプレイヤー
        </div>
      </div>
    </div>
  );
}

export default IntermediateScoreboard;
