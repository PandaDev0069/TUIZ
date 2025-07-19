import { useEffect, useState } from 'react';
import './intermediatescoreboard.css';

function IntermediateScoreboard({ top5, currentPlayer, totalPlayers, onComplete }) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    setShowAnimation(true);
  }, []);

  const getRankChangeIcon = (change) => {
    switch (change) {
      case 'up': return '⬆️';
      case 'down': return '⬇️';
      case 'same': return '➖';
      default: return '🆕';
    }
  };

  const getStreakEmoji = (streak) => {
    if (streak >= 5) return '🔥';
    if (streak >= 3) return '✨';
    return '';
  };

  return (
    <div className="intermediate-scoreboard-overlay">
      <div className="intermediate-scoreboard">
        <div className="header">
          <h2>現在のリーダーボード</h2>
          <div className="timer">ホストが次の質問を開始するまでお待ちください...</div>
        </div>

        <div className="top5-list">
          {top5.map((player, index) => (
            <div 
              key={player.id}
              className={`score-item rank-${index + 1}`}
            >
              <div className="rank">#{index + 1}</div>
              <div className="player-info">
                <span className="name">
                  {player.name} {getStreakEmoji(player.streak)}
                </span>
                <span className="score">{player.score}</span>
              </div>
              <div className="rank-change">
                {getRankChangeIcon(player.rankChange)}
              </div>
            </div>
          ))}
        </div>

        {currentPlayer && (
          <div className="current-player-info">
            <div className="your-rank">
              <span>あなたの順位: #{currentPlayer.rank}</span>
              <span>スコア: {currentPlayer.score}</span>
              <span>{getStreakEmoji(currentPlayer.streak)}</span>
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
