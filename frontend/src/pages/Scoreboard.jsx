import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../socket';
import './scoreboard.css';

function Scoreboard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { scoreboard = [], room, isHost } = state || {};
  const [showAnimation, setShowAnimation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    setShowAnimation(true);
    
    // Detect if we're on mobile for performance optimization
    const isMobile = window.innerWidth <= 768;
    
    // Staggered podium animation - 3rd, 2nd, then 1st (Kahoot style)
    const podiumElements = document.querySelectorAll('.podium-place');
    podiumElements.forEach((element, index) => {
      const order = [2, 0, 1]; // 3rd, 1st, 2nd for dramatic effect
      const delay = order[index] * (isMobile ? 600 : 800); // Faster on mobile
      setTimeout(() => {
        element.classList.add('show');
      }, delay + (isMobile ? 800 : 1000)); // Start sooner on mobile
    });

    // Show confetti for celebration (less confetti on mobile)
    setTimeout(() => setShowConfetti(true), isMobile ? 2500 : 3000);
    
    // Hide confetti after duration
    setTimeout(() => setShowConfetti(false), isMobile ? 6000 : 7000);

    // Animate leaderboard rows
    setTimeout(() => {
      const scoreRows = document.querySelectorAll('.score-row');
      scoreRows.forEach((row, index) => {
        setTimeout(() => {
          row.classList.add('show');
        }, index * (isMobile ? 100 : 150)); // Faster stagger on mobile
      });
    }, isMobile ? 3200 : 4000); // Start sooner on mobile
  }, []);

  const handleRestart = () => {
    if (isHost) {
      navigate('/host');
    } else {
      navigate('/join');
    }
  };

  const getMedalEmoji = (position) => {
    switch (position) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  };

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

  const getScoreColor = (position) => {
    switch (position) {
      case 0: return '#FFD700'; // Gold
      case 1: return '#C0C0C0'; // Silver
      case 2: return '#CD7F32'; // Bronze
      default: return '#10B981'; // Default green
    }
  };

  const createConfetti = () => {
    const isMobile = window.innerWidth <= 768;
    const confettiCount = isMobile ? 80 : 150; // Less confetti on mobile for performance
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3'];
    
    return Array.from({ length: confettiCount }, (_, i) => (
      <div
        key={i}
        className="confetti-piece"
        style={{
          left: `${Math.random() * 100}vw`,
          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${isMobile ? 2.5 + Math.random() * 1.5 : 3 + Math.random() * 2}s`,
          '--drift': `${(Math.random() - 0.5) * (isMobile ? 300 : 500)}px`
        }}
      />
    ));
  };

  // Get top 3 players for podium
  const topPlayers = scoreboard.slice(0, 3);
  // Get remaining players
  const remainingPlayers = scoreboard.slice(3);

  return (
    <div className="page-container">
      {showConfetti && (
        <div className="confetti">
          {createConfetti()}
        </div>
      )}
      
      <div className="scoreboard-container">
        <h1 className="title">ゲーム終了！</h1>
        <p className="subtitle">最終結果発表 🎉</p>

        {/* Podium for top 3 */}
        <div className="podium-container">
          {topPlayers.map((player, index) => (
            <div 
              key={player.id || index}
              className={`podium-place place-${index + 1}`}
            >
              <div className="player-info">
                <span className="player-medal">{getMedalEmoji(index)}</span>
                <span className="player-name">
                  {player.name} {getStreakEmoji(player.streak)}
                </span>
                <span 
                  className="player-score"
                  style={{ 
                    color: getScoreColor(index),
                    borderColor: `${getScoreColor(index)}50`
                  }}
                >
                  {player.score?.toLocaleString() || 0}
                </span>
                {player.rankChange && (
                  <span className="rank-change">{getRankChangeIcon(player.rankChange)}</span>
                )}
              </div>
              <div className="podium-block" />
            </div>
          ))}
        </div>

        {/* Scoreboard list for other players */}
        {remainingPlayers.length > 0 && (
          <div className="scores-list">
            <h3>その他のプレイヤー</h3>
            {remainingPlayers.map((player, index) => (
              <div 
                key={player.id || index}
                className="score-row"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="position">#{index + 4}</span>
                <span className="medal">{getMedalEmoji(index + 3)}</span>
                <span className="name">
                  {player.name} {getStreakEmoji(player.streak)}
                </span>
                {player.rankChange && (
                  <span className="rank-change">{getRankChangeIcon(player.rankChange)}</span>
                )}
                <span className="score">{player.score?.toLocaleString() || 0}</span>
              </div>
            ))}
          </div>
        )}

        <button className="restart-button" onClick={handleRestart}>
          {isHost ? '🎮 新しいクイズを作成' : '🚀 別のクイズに参加'}
        </button>
      </div>
    </div>
  );
}

export default Scoreboard;
