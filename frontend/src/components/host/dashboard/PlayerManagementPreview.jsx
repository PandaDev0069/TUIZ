import { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaUserPlus, 
  FaUserMinus, 
  FaEye, 
  FaMicrophone,
  FaMicrophoneSlash,
  FaCheck,
  FaTimes,
  FaClock,
  FaBolt,
  FaTrophy,
  FaChevronRight
} from 'react-icons/fa';
import './PlayerManagementPreview.css';

/**
 * PlayerManagementPreview - Player management preview with recent activity
 * Phase 2.1: Host Dashboard Component
 * 
 * Features:
 * - Recent joins display
 * - Activity indicators  
 * - Quick actions for players
 * - Live player statistics
 */
function PlayerManagementPreview({ players, recentActivity, gameState }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  // Show only recent 5 players by default
  const displayPlayers = showAllPlayers ? players : players.slice(-5);
  const displayActivity = recentActivity.slice(0, 6);

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    return `${hours}時間前`;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'join': return <FaUserPlus className="activity-icon activity-icon--join" />;
      case 'leave': return <FaUserMinus className="activity-icon activity-icon--leave" />;
      case 'answer': return <FaCheck className="activity-icon activity-icon--answer" />;
      default: return <FaBolt className="activity-icon" />;
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'join': return `${activity.player} が参加しました`;
      case 'leave': return `${activity.player} が退室しました`;
      case 'answer': return `${activity.player} が回答しました`;
      default: return `${activity.player} のアクティビティ`;
    }
  };

  return (
    <div className="player-management-preview">
      <div className="player-management-preview__header">
        <h3 className="player-management-preview__title">
          <FaUsers className="player-management-preview__title-icon" />
          プレイヤー管理
        </h3>
        
        <div className="player-management-preview__stats">
          <div className="player-stat player-stat--online">
            <FaUsers className="player-stat__icon" />
            <span className="player-stat__value">{players.length}</span>
            <span className="player-stat__label">人接続中</span>
          </div>
        </div>
      </div>

      <div className="player-management-preview__content">
        {/* Recent Activity Feed */}
        <div className="activity-feed">
          <div className="activity-feed__header">
            <FaBolt className="activity-feed__icon" />
            <span className="activity-feed__title">最近のアクティビティ</span>
          </div>
          
          <div className="activity-feed__list">
            {displayActivity.length > 0 ? (
              displayActivity.map((activity, index) => (
                <div key={`${activity.timestamp}-${index}`} className="activity-item">
                  <div className="activity-item__icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-item__content">
                    <div className="activity-item__text">
                      {getActivityText(activity)}
                    </div>
                    <div className="activity-item__time">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="activity-feed__empty">
                <FaClock className="activity-feed__empty-icon" />
                <span>アクティビティがありません</span>
              </div>
            )}
          </div>
        </div>

        {/* Current Players List */}
        <div className="current-players">
          <div className="current-players__header">
            <span className="current-players__title">接続中のプレイヤー</span>
            
            {players.length > 5 && (
              <button 
                className="current-players__toggle"
                onClick={() => setShowAllPlayers(!showAllPlayers)}
              >
                {showAllPlayers ? '簡易表示' : `全て表示 (${players.length})`}
                <FaChevronRight className={`current-players__toggle-icon ${showAllPlayers ? 'current-players__toggle-icon--rotated' : ''}`} />
              </button>
            )}
          </div>
          
          <div className="current-players__list">
            {displayPlayers.length > 0 ? (
              displayPlayers.map((player, index) => (
                <div 
                  key={player.id || index} 
                  className={`player-card ${expandedPlayer === player.id ? 'player-card--expanded' : ''}`}
                  onClick={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
                >
                  <div className="player-card__main">
                    <div className="player-card__avatar">
                      <div className="player-avatar">
                        <span className="player-avatar__initial">
                          {(player.name || `Player${index + 1}`).charAt(0).toUpperCase()}
                        </span>
                        <div className="player-avatar__status player-avatar__status--online"></div>
                      </div>
                    </div>
                    
                    <div className="player-card__info">
                      <div className="player-card__name">
                        {player.name || `Player ${index + 1}`}
                      </div>
                      <div className="player-card__meta">
                        <span className="player-card__score">
                          {player.score || 0} pt
                        </span>
                        {gameState.status === 'active' && (
                          <span className="player-card__status player-card__status--active">
                            参加中
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="player-card__actions">
                      <button 
                        className="player-action-btn player-action-btn--view"
                        title="プレイヤー詳細"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('View player details:', player);
                        }}
                      >
                        <FaEye />
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedPlayer === player.id && (
                    <div className="player-card__details">
                      <div className="player-details">
                        <div className="player-details__stats">
                          <div className="player-detail-stat">
                            <FaTrophy className="player-detail-stat__icon" />
                            <span className="player-detail-stat__label">スコア</span>
                            <span className="player-detail-stat__value">{player.score || 0}</span>
                          </div>
                          
                          <div className="player-detail-stat">
                            <FaCheck className="player-detail-stat__icon" />
                            <span className="player-detail-stat__label">正解数</span>
                            <span className="player-detail-stat__value">{player.correctAnswers || 0}</span>
                          </div>
                          
                          <div className="player-detail-stat">
                            <FaClock className="player-detail-stat__icon" />
                            <span className="player-detail-stat__label">平均時間</span>
                            <span className="player-detail-stat__value">
                              {player.averageTime ? `${player.averageTime}秒` : 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="player-details__actions">
                          <button 
                            className="player-action-btn player-action-btn--mute"
                            title="ミュート/ミュート解除"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Toggle mute for:', player);
                            }}
                          >
                            {player.muted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                          </button>
                          
                          <button 
                            className="player-action-btn player-action-btn--kick"
                            title="プレイヤーを退室"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Kick player:', player);
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="current-players__empty">
                <FaUsers className="current-players__empty-icon" />
                <span>プレイヤーが接続されていません</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="player-quick-stats">
          <div className="quick-stat">
            <div className="quick-stat__value">{players.length}</div>
            <div className="quick-stat__label">総参加者</div>
          </div>
          
          <div className="quick-stat">
            <div className="quick-stat__value">
              {players.filter(p => p.score > 0).length}
            </div>
            <div className="quick-stat__label">アクティブ</div>
          </div>
          
          <div className="quick-stat">
            <div className="quick-stat__value">
              {Math.round((players.filter(p => p.score > 0).length / Math.max(players.length, 1)) * 100)}%
            </div>
            <div className="quick-stat__label">参加率</div>
          </div>
        </div>
      </div>
      
      {/* View All Players Button */}
      {players.length > 0 && (
        <div className="player-management-preview__footer">
          <button className="view-all-players-btn">
            <FaUsers className="view-all-players-btn__icon" />
            <span>プレイヤー管理画面を開く</span>
            <FaChevronRight className="view-all-players-btn__arrow" />
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayerManagementPreview;
