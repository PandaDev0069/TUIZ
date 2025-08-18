import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FaTrophy, 
  FaMedal, 
  FaArrowUp, 
  FaArrowDown, 
  FaMinus, 
  FaStar, 
  FaChartBar, 
  FaRocket,
  FaFire,
  FaClock,
  FaBullseye,
  FaGift
} from 'react-icons/fa';
import { useManagedTimeout } from '../utils/timerManager';
import socket from '../socket';
import './scoreboard.css';

function Scoreboard({ state: propState } = {}) {
  const { state: locationState } = useLocation();
  const navigate = useNavigate();
  
  // Use prop state if provided (for component usage), otherwise use location state (for route usage)
  const state = propState || locationState || {};
  
  const { 
    scoreboard = [], 
    room, 
    isHost,
    // Enhanced: Accept rich analytics data from database
    gameAnalytics,
    gameInfo,
    playerStats,
    performanceStats
  } = state || {};
  const [showAnimation, setShowAnimation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Debug logging for development
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🏆 Scoreboard component data:', {
        scoreboard: scoreboard?.length || 0,
        scoreboardData: scoreboard,
        gameAnalytics,
        gameInfo,
        playerStats,
        performanceStats,
        propState,
        locationState,
        finalState: state
      });
    }
  }, [scoreboard, gameAnalytics, gameInfo, playerStats, performanceStats, propState, locationState, state]);
  
  useEffect(() => {
    setShowAnimation(true);
    
    // Detect if we're on mobile for performance optimization
    const isMobile = window.innerWidth <= 768;
    
    // Collect all timeouts for cleanup
    const timeouts = [];
    
    // Staggered podium animation - 3rd, 2nd, then 1st (Kahoot style)
    const podiumElements = document.querySelectorAll('.podium-place');
    podiumElements.forEach((element, index) => {
      const order = [2, 0, 1]; // 3rd, 1st, 2nd for dramatic effect
      const delay = order[index] * (isMobile ? 600 : 800); // Faster on mobile
      const timeout = setTimeout(() => {
        element.classList.add('show');
      }, delay + (isMobile ? 800 : 1000)); // Start sooner on mobile
      timeouts.push(timeout);
    });

    // Show confetti for celebration (less confetti on mobile)
    const showConfettiTimeout = setTimeout(() => setShowConfetti(true), isMobile ? 2500 : 3000);
    timeouts.push(showConfettiTimeout);
    
    // Hide confetti after duration
    const hideConfettiTimeout = setTimeout(() => setShowConfetti(false), isMobile ? 6000 : 7000);
    timeouts.push(hideConfettiTimeout);

    // Animate leaderboard rows
    const leaderboardTimeout = setTimeout(() => {
      const scoreRows = document.querySelectorAll('.score-row');
      scoreRows.forEach((row, index) => {
        const rowTimeout = setTimeout(() => {
          row.classList.add('show');
        }, index * (isMobile ? 100 : 150)); // Faster stagger on mobile
        timeouts.push(rowTimeout);
      });
    }, isMobile ? 3200 : 4000); // Start sooner on mobile
    timeouts.push(leaderboardTimeout);

    // Cleanup all timeouts on unmount
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const handleRestart = () => {
    if (isHost) {
      navigate('/dashboard');
    } else {
      navigate('/join');
    }
  };

  const getMedalIcon = (position) => {
    switch (position) {
      case 0: return <FaTrophy className="medal-icon gold" />;
      case 1: return <FaTrophy className="medal-icon silver" />;
      case 2: return <FaTrophy className="medal-icon bronze" />;
      default: return <FaMedal className="medal-icon default" />;
    }
  };

  const getRankChangeIcon = (change) => {
    switch (change) {
      case 'up': return <FaArrowUp className="rank-change-icon up" />;
      case 'down': return <FaArrowDown className="rank-change-icon down" />;
      case 'same': return <FaMinus className="rank-change-icon same" />;
      default: return <FaStar className="rank-change-icon new" />;
    }
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

  // Use database analytics data if available, otherwise fall back to live data
  let finalScoreboard = scoreboard;
  let analyticsAvailable = false;
  
  // Debug: Log initial scoreboard data
  if (import.meta.env.DEV) {
    console.log('🔍 Initial scoreboard data:', {
      scoreboardLength: scoreboard?.length || 0,
      scoreboardData: scoreboard,
      hasGameAnalytics: !!gameAnalytics?.leaderboard,
      gameAnalyticsLength: gameAnalytics?.leaderboard?.length || 0
    });
  }
  
  if (gameAnalytics?.leaderboard && gameAnalytics.leaderboard.length > 0) {
    // Use comprehensive database analytics
    finalScoreboard = gameAnalytics.leaderboard.map((player, index) => ({
      id: player.id,
      name: player.name,
      score: player.total_score,
      rank: index + 1,
      correctAnswers: player.correct_answers,
      totalAnswers: player.total_answers,
      averageResponseTime: player.avg_response_time,
      streak: player.longest_streak,
      completionRate: ((player.total_answers / (gameInfo?.total_questions || 1)) * 100).toFixed(1),
      // Add rich analytics
      ...(playerStats && playerStats[player.id] ? {
        improvement: playerStats[player.id].improvement_trend,
        accuracy: ((player.correct_answers / Math.max(player.total_answers, 1)) * 100).toFixed(1)
      } : {})
    }));
    analyticsAvailable = true;
  }

  // Get top 3 players for podium
  const topPlayers = finalScoreboard.slice(0, 3);
  // Get remaining players
  const remainingPlayers = finalScoreboard.slice(3);

  // Debug: Log final scoreboard processing
  if (import.meta.env.DEV) {
    console.log('📊 Final scoreboard processing:', {
      finalScoreboardLength: finalScoreboard?.length || 0,
      topPlayersLength: topPlayers?.length || 0,
      topPlayers,
      analyticsAvailable,
      remainingPlayersLength: remainingPlayers?.length || 0
    });
  }

  return (
    <div className="page-container">
      {showConfetti && (
        <div className="confetti">
          {createConfetti()}
        </div>
      )}
      
      <div className="scoreboard-container">
        <h1 className="title">ゲーム終了！</h1>
        <p className="subtitle">
          最終結果発表 
          <FaGift className="celebration-icon" />
        </p>

        {/* Game analytics summary */}
        {analyticsAvailable && gameInfo && (
          <div className="game-summary">
            <div className="summary-stats">
              <div className="summary-stat">
                <FaChartBar className="summary-icon" />
                <span className="summary-value">{gameInfo.total_questions}</span>
                <span className="summary-label">質問数</span>
              </div>
              <div className="summary-stat">
                <FaStar className="summary-icon" />
                <span className="summary-value">{finalScoreboard.length}</span>
                <span className="summary-label">参加者</span>
              </div>
              {gameInfo.avg_completion_rate && (
                <div className="summary-stat">
                  <FaBullseye className="summary-icon" />
                  <span className="summary-value">{gameInfo.avg_completion_rate.toFixed(1)}%</span>
                  <span className="summary-label">完了率</span>
                </div>
              )}
              {gameInfo.avg_score && (
                <div className="summary-stat">
                  <FaTrophy className="summary-icon" />
                  <span className="summary-value">{Math.round(gameInfo.avg_score)}</span>
                  <span className="summary-label">平均スコア</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Podium for top 3 */}
        <div className="podium-container">
          {topPlayers.map((player, index) => (
            <div 
              key={player.id || index}
              className={`podium-place place-${index + 1}`}
            >
              <div className="player-info">
                <span className="player-medal">{getMedalIcon(index)}</span>
                <span className="player-name">
                  {player.name}
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
                
                {/* Enhanced analytics display for database data */}
                {analyticsAvailable && (
                  <div className="player-analytics">
                    {player.accuracy && (
                      <div className="stat-badge accuracy">
                        <FaBullseye className="stat-icon" />
                        {player.accuracy}%
                      </div>
                    )}
                    {player.averageResponseTime && (
                      <div className="stat-badge response-time">
                        <FaClock className="stat-icon" />
                        {(player.averageResponseTime / 1000).toFixed(1)}s
                      </div>
                    )}
                    {player.streak > 0 && (
                      <div className="stat-badge streak">
                        <FaFire className="stat-icon" />
                        {player.streak}
                      </div>
                    )}
                  </div>
                )}
                
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
                <span className="medal">{getMedalIcon(index + 3)}</span>
                <span className="name">
                  {player.name}
                </span>
                
                {/* Enhanced analytics for remaining players */}
                {analyticsAvailable && (
                  <div className="player-analytics-compact">
                    {player.accuracy && (
                      <span className="stat-compact accuracy">
                        {player.accuracy}% <FaBullseye />
                      </span>
                    )}
                    {player.streak > 0 && (
                      <span className="stat-compact streak">
                        {player.streak} <FaFire />
                      </span>
                    )}
                  </div>
                )}
                
                {player.rankChange && (
                  <span className="rank-change">{getRankChangeIcon(player.rankChange)}</span>
                )}
                <span className="score">{player.score?.toLocaleString() || 0}</span>
              </div>
            ))}
          </div>
        )}

        <button className="restart-button" onClick={handleRestart}>
          {isHost ? (
            <>
              <FaChartBar className="button-icon" />
              ダッシュボードに戻る
            </>
          ) : (
            <>
              <FaRocket className="button-icon" />
              別のクイズに参加
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Scoreboard;
