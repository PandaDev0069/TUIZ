import { useState, useEffect, useRef } from 'react';
import PlayerDetailsModal from './PlayerDetailsModal';
import { 
  FaUsers,
  FaUserPlus,
  FaUserMinus,
  FaUserCog,
  FaSearch,
  FaFilter,
  FaSort,
  FaBan,
  FaUndo,
  FaMicrophone,
  FaMicrophoneSlash,
  FaEye,
  FaEyeSlash,
  FaFlag,
  FaCrown,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTrophy,
  FaChartLine,
  FaDownload,
  FaSyncAlt,
  FaUserShield,
  FaComments,
  FaHeart,
  FaThumbsUp,
  FaThumbsDown
} from 'react-icons/fa';
import socket from '../../../socket';
import './RealTimePlayerManagement.css';
import './PlayerDetailsModal.css';

/**
 * RealTimePlayerManagement - Advanced Real-time Player Management
 * Phase 2.3: Real-time Player Management
 * 
 * Features:
 * - Live player list with real-time updates
 * - Advanced filtering and sorting
 * - Individual player controls (kick/mute/promote)
 * - Bulk actions for multiple players
 * - Player performance analytics
 * - Communication tools
 * - Session management
 */
function RealTimePlayerManagement({ gameState, players = [], onPlayerAction }) {
  // Player state
  const [filteredPlayers, setFilteredPlayers] = useState(players);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('joinTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterBy, setFilterBy] = useState('all');
  
  // UI state
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showPlayerDetails, setShowPlayerDetails] = useState(null);
  const [showKickModal, setShowKickModal] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(null);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  
  // Analytics state
  const [playerStats, setPlayerStats] = useState({});
  const [connectionStats, setConnectionStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    banned: 0
  });
  
  // Real-time updates
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [notifications, setNotifications] = useState([]);
  
  // Refs
  const playerListRef = useRef(null);
  const searchInputRef = useRef(null);

  // Initialize and update players
  useEffect(() => {
    filterAndSortPlayers();
    updateConnectionStats();
    setLastUpdate(Date.now());
  }, [players, searchTerm, sortBy, sortOrder, filterBy]);

  // Socket event handlers
  useEffect(() => {
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('playerUpdated', handlePlayerUpdated);
    socket.on('playerAction', handlePlayerActionResponse);
    socket.on('playerStats', handlePlayerStats);
    socket.on('bulkActionComplete', handleBulkActionComplete);

    return () => {
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('playerUpdated');
      socket.off('playerAction');
      socket.off('playerStats');
      socket.off('bulkActionComplete');
    };
  }, []);

  // Event handlers
  const handlePlayerJoined = (player) => {
    addNotification(`${player.name} が参加しました`, 'success');
    if (onPlayerAction) {
      onPlayerAction('playerJoined', player);
    }
  };

  const handlePlayerLeft = (player) => {
    addNotification(`${player.name} が退出しました`, 'info');
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      newSet.delete(player.id);
      return newSet;
    });
    if (onPlayerAction) {
      onPlayerAction('playerLeft', player);
    }
  };

  const handlePlayerUpdated = (player) => {
    if (onPlayerAction) {
      onPlayerAction('playerUpdated', player);
    }
  };

  const handlePlayerActionResponse = (response) => {
    if (response.success) {
      addNotification(response.message, 'success');
    } else {
      addNotification(response.error, 'error');
    }
  };

  const handlePlayerStats = (stats) => {
    setPlayerStats(stats);
  };

  const handleBulkActionComplete = (result) => {
    addNotification(`一括操作完了: ${result.processed}人処理`, 'success');
    setSelectedPlayers(new Set());
    setShowBulkActions(false);
  };

  // Utility functions
  const filterAndSortPlayers = () => {
    let filtered = [...players];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (filterBy) {
      case 'active':
        filtered = filtered.filter(p => p.isActive && !p.isBanned);
        break;
      case 'inactive':
        filtered = filtered.filter(p => !p.isActive && !p.isBanned);
        break;
      case 'banned':
        filtered = filtered.filter(p => p.isBanned);
        break;
      case 'muted':
        filtered = filtered.filter(p => p.isMuted);
        break;
      case 'moderators':
        filtered = filtered.filter(p => p.role === 'moderator');
        break;
      default:
        // Show all
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'score':
          aVal = a.score || 0;
          bVal = b.score || 0;
          break;
        case 'joinTime':
          aVal = new Date(a.joinTime || 0);
          bVal = new Date(b.joinTime || 0);
          break;
        case 'lastActivity':
          aVal = new Date(a.lastActivity || 0);
          bVal = new Date(b.lastActivity || 0);
          break;
        case 'correctAnswers':
          aVal = a.correctAnswers || 0;
          bVal = b.correctAnswers || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredPlayers(filtered);
  };

  const updateConnectionStats = () => {
    const stats = {
      total: players.length,
      active: players.filter(p => p.isActive && !p.isBanned).length,
      inactive: players.filter(p => !p.isActive && !p.isBanned).length,
      banned: players.filter(p => p.isBanned).length
    };
    setConnectionStats(stats);
  };

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Player actions
  const handlePlayerSelect = (playerId, isSelected) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(playerId);
      } else {
        newSet.delete(playerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPlayers.size === filteredPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  const handleKickPlayer = (player) => {
    socket.emit('hostAction:kickPlayer', {
      gameId: gameState?.id,
      playerId: player.id,
      reason: 'Kicked by host'
    });
    setShowKickModal(null);
  };

  const handleMutePlayer = (player) => {
    socket.emit('hostAction:mutePlayer', {
      gameId: gameState?.id,
      playerId: player.id,
      muted: !player.isMuted
    });
  };

  const handleBanPlayer = (player) => {
    socket.emit('hostAction:banPlayer', {
      gameId: gameState?.id,
      playerId: player.id,
      banned: !player.isBanned
    });
  };

  const handlePromotePlayer = (player, role) => {
    socket.emit('hostAction:promotePlayer', {
      gameId: gameState?.id,
      playerId: player.id,
      role: role
    });
    setShowPromoteModal(null);
  };

  const handleBulkAction = (action) => {
    if (selectedPlayers.size === 0) return;

    socket.emit('hostAction:bulkPlayerAction', {
      gameId: gameState?.id,
      playerIds: Array.from(selectedPlayers),
      action: action
    });
  };

  const handleSendMessage = (message, targetPlayers = []) => {
    socket.emit('hostAction:sendMessage', {
      gameId: gameState?.id,
      message: message,
      targetPlayers: targetPlayers.length > 0 ? targetPlayers : Array.from(selectedPlayers),
      type: 'host_announcement'
    });
    setShowCommunicationModal(false);
  };

  // Handle actions from PlayerDetailsModal
  const handlePlayerAction = (action, data) => {
    const { playerId } = data;
    const player = players.find(p => p.id === playerId);
    
    if (!player) return;

    switch (action) {
      case 'mute':
        handleMutePlayer(player);
        break;
      case 'unmute':
        socket.emit('player_action', {
          action: 'unmute',
          playerId: playerId,
          gameId: gameState?.id
        });
        break;
      case 'kick':
        handleKickPlayer(player);
        break;
      case 'ban':
        handleBanPlayer(player);
        break;
      case 'unban':
        socket.emit('player_action', {
          action: 'unban',
          playerId: playerId,
          gameId: gameState?.id
        });
        break;
      case 'grantModerator':
        handlePromotePlayer(player, 'moderator');
        break;
      case 'removeModerator':
        handlePromotePlayer(player, 'player');
        break;
      case 'sendMessage':
        handleSendMessage(data.message, [playerId]);
        break;
      case 'flag':
        socket.emit('player_action', {
          action: 'flag',
          playerId: playerId,
          gameId: gameState?.id,
          reason: data.reason || 'Flagged by host'
        });
        break;
      default:
        console.warn('Unknown player action:', action);
    }
  };

  const exportPlayerData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      gameId: gameState?.id,
      totalPlayers: players.length,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        correctAnswers: p.correctAnswers,
        incorrectAnswers: p.incorrectAnswers,
        joinTime: p.joinTime,
        lastActivity: p.lastActivity,
        isActive: p.isActive,
        isMuted: p.isMuted,
        isBanned: p.isBanned,
        role: p.role
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `players-${gameState?.roomCode || 'game'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (timestamp) => {
    if (!timestamp) return 'N/A';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '< 1分';
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    return `${hours}時間${minutes % 60}分`;
  };

  const getPlayerStatusIcon = (player) => {
    if (player.isBanned) return <FaBan className="player-status-icon player-status-icon--banned" />;
    if (player.isMuted) return <FaMicrophoneSlash className="player-status-icon player-status-icon--muted" />;
    if (player.role === 'moderator') return <FaUserShield className="player-status-icon player-status-icon--moderator" />;
    if (!player.isActive) return <FaClock className="player-status-icon player-status-icon--inactive" />;
    return <FaCheckCircle className="player-status-icon player-status-icon--active" />;
  };

  const getPlayerStatusText = (player) => {
    if (player.isBanned) return 'バン済み';
    if (player.isMuted) return 'ミュート中';
    if (player.role === 'moderator') return 'モデレーター';
    if (!player.isActive) return '非アクティブ';
    return 'アクティブ';
  };

  return (
    <div className="realtime-player-management">
      {/* Header */}
      <div className="player-management__header">
        <div className="player-management__title">
          <FaUsers className="player-management__icon" />
          <h2>リアルタイム プレイヤー管理</h2>
          <span className="player-count-badge">{filteredPlayers.length}</span>
        </div>

        <div className="player-management__actions">
          <button
            className="player-btn player-btn--icon"
            onClick={() => window.location.reload()}
            title="更新"
          >
            <FaSyncAlt />
          </button>

          <button
            className="player-btn player-btn--secondary"
            onClick={exportPlayerData}
            title="データエクスポート"
          >
            <FaDownload />
            エクスポート
          </button>

          <button
            className="player-btn player-btn--primary"
            onClick={() => setShowCommunicationModal(true)}
            disabled={selectedPlayers.size === 0}
          >
            <FaComments />
            メッセージ送信
          </button>
        </div>
      </div>

      {/* Connection Stats */}
      <div className="connection-stats">
        <div className="connection-stat">
          <span className="connection-stat__label">総計</span>
          <span className="connection-stat__value">{connectionStats.total}</span>
        </div>
        <div className="connection-stat connection-stat--success">
          <span className="connection-stat__label">アクティブ</span>
          <span className="connection-stat__value">{connectionStats.active}</span>
        </div>
        <div className="connection-stat connection-stat--warning">
          <span className="connection-stat__label">非アクティブ</span>
          <span className="connection-stat__value">{connectionStats.inactive}</span>
        </div>
        <div className="connection-stat connection-stat--danger">
          <span className="connection-stat__label">バン済み</span>
          <span className="connection-stat__value">{connectionStats.banned}</span>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="player-controls">
        <div className="player-search">
          <FaSearch className="player-search__icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="プレイヤー名またはIDで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="player-search__input"
          />
        </div>

        <div className="player-filters">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="player-filter player-filter--status"
          >
            <option value="all">すべて</option>
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
            <option value="banned">バン済み</option>
            <option value="muted">ミュート中</option>
            <option value="moderators">モデレーター</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-');
              setSortBy(sort);
              setSortOrder(order);
            }}
            className="player-filter player-filter--sort"
          >
            <option value="joinTime-desc">参加順（新しい順）</option>
            <option value="joinTime-asc">参加順（古い順）</option>
            <option value="name-asc">名前順（A-Z）</option>
            <option value="name-desc">名前順（Z-A）</option>
            <option value="score-desc">スコア順（高い順）</option>
            <option value="score-asc">スコア順（低い順）</option>
            <option value="lastActivity-desc">最終活動順</option>
            <option value="correctAnswers-desc">正解数順</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPlayers.size > 0 && (
        <div className="bulk-actions">
          <div className="bulk-actions__info">
            <span>{selectedPlayers.size}人選択中</span>
            <button
              className="bulk-clear"
              onClick={() => setSelectedPlayers(new Set())}
            >
              選択解除
            </button>
          </div>

          <div className="bulk-actions__buttons">
            <button
              className="player-btn player-btn--small player-btn--warning"
              onClick={() => handleBulkAction('mute')}
            >
              <FaMicrophoneSlash />
              一括ミュート
            </button>

            <button
              className="player-btn player-btn--small player-btn--danger"
              onClick={() => handleBulkAction('kick')}
            >
              <FaUserMinus />
              一括キック
            </button>

            <button
              className="player-btn player-btn--small player-btn--secondary"
              onClick={() => setShowCommunicationModal(true)}
            >
              <FaComments />
              メッセージ
            </button>
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="player-list-container">
        <div className="player-list-header">
          <label className="player-select-all">
            <input
              type="checkbox"
              checked={selectedPlayers.size === filteredPlayers.length && filteredPlayers.length > 0}
              onChange={handleSelectAll}
            />
            <span>すべて選択</span>
          </label>

          <div className="player-list-columns">
            <span className="column-header column-header--name">プレイヤー</span>
            <span className="column-header column-header--status">状態</span>
            <span className="column-header column-header--score">スコア</span>
            <span className="column-header column-header--activity">活動</span>
            <span className="column-header column-header--actions">操作</span>
          </div>
        </div>

        <div className="player-list" ref={playerListRef}>
          {filteredPlayers.map(player => (
            <div
              key={player.id}
              className={`player-item ${selectedPlayers.has(player.id) ? 'player-item--selected' : ''} ${!player.isActive ? 'player-item--inactive' : ''}`}
            >
              <div className="player-item__select">
                <input
                  type="checkbox"
                  checked={selectedPlayers.has(player.id)}
                  onChange={(e) => handlePlayerSelect(player.id, e.target.checked)}
                />
              </div>

              <div className="player-item__info">
                <div className="player-avatar">
                  <img
                    src={player.avatar || `/api/placeholder/32/32`}
                    alt={player.name}
                    className="player-avatar__image"
                  />
                  {getPlayerStatusIcon(player)}
                </div>

                <div className="player-details">
                  <div 
                    className="player-name"
                    onClick={() => setShowPlayerDetails(player)}
                    style={{ cursor: 'pointer' }}
                  >
                    {player.name}
                    {player.role === 'moderator' && <FaCrown className="player-crown" />}
                  </div>
                  <div className="player-id">ID: {player.id}</div>
                  <div className="player-join-time">
                    参加: {formatTime(player.joinTime)}
                  </div>
                </div>
              </div>

              <div className="player-item__status">
                <span className={`player-status player-status--${player.isActive ? 'active' : 'inactive'}`}>
                  {getPlayerStatusText(player)}
                </span>
                <div className="player-connection">
                  最終活動: {formatDuration(player.lastActivity)}
                </div>
              </div>

              <div className="player-item__score">
                <div className="player-score-main">{player.score || 0}</div>
                <div className="player-score-details">
                  <span className="correct-answers">
                    <FaCheckCircle /> {player.correctAnswers || 0}
                  </span>
                  <span className="incorrect-answers">
                    <FaExclamationTriangle /> {player.incorrectAnswers || 0}
                  </span>
                </div>
              </div>

              <div className="player-item__activity">
                <div className="activity-indicator">
                  {player.isActive ? (
                    <span className="activity-status activity-status--online">オンライン</span>
                  ) : (
                    <span className="activity-status activity-status--offline">
                      {formatDuration(player.lastActivity)}
                    </span>
                  )}
                </div>
                <div className="player-actions-quick">
                  {player.hasUnreadMessages && (
                    <FaComments className="player-notification" title="未読メッセージあり" />
                  )}
                  {player.needsAttention && (
                    <FaFlag className="player-flag" title="注意が必要" />
                  )}
                </div>
              </div>

              <div className="player-item__actions">
                <div className="player-actions">
                  <button
                    className={`player-action-btn ${player.isMuted ? 'player-action-btn--active' : ''}`}
                    onClick={() => handleMutePlayer(player)}
                    title={player.isMuted ? 'ミュート解除' : 'ミュート'}
                  >
                    {player.isMuted ? <FaMicrophone /> : <FaMicrophoneSlash />}
                  </button>

                  <button
                    className="player-action-btn"
                    onClick={() => setShowPlayerDetails(player)}
                    title="詳細表示"
                  >
                    <FaEye />
                  </button>

                  <button
                    className="player-action-btn player-action-btn--danger"
                    onClick={() => setShowKickModal(player)}
                    title="キック"
                    disabled={player.role === 'moderator'}
                  >
                    <FaUserMinus />
                  </button>

                  <button
                    className="player-action-btn"
                    onClick={() => setShowPromoteModal(player)}
                    title="権限変更"
                  >
                    <FaUserCog />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredPlayers.length === 0 && (
            <div className="player-list-empty">
              <FaUsers className="empty-icon" />
              <h3>プレイヤーが見つかりません</h3>
              <p>
                {searchTerm || filterBy !== 'all'
                  ? '検索条件に一致するプレイヤーがいません'
                  : 'まだプレイヤーが参加していません'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Notifications */}
      <div className="player-notifications">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`player-notification player-notification--${notification.type}`}
          >
            <span className="notification-message">{notification.message}</span>
            <span className="notification-time">
              {formatTime(notification.timestamp)}
            </span>
          </div>
        ))}
      </div>

      {/* Player Details Modal */}
      {showPlayerDetails && (
        <div className="player-modal-overlay" onClick={() => setShowPlayerDetails(null)}>
          <div className="player-modal" onClick={(e) => e.stopPropagation()}>
            <div className="player-modal__header">
              <h3>プレイヤー詳細: {showPlayerDetails.name}</h3>
              <button
                className="player-modal__close"
                onClick={() => setShowPlayerDetails(null)}
              >
                ×
              </button>
            </div>

            <div className="player-modal__content">
              <div className="player-details-grid">
                <div className="player-detail-item">
                  <label>プレイヤーID</label>
                  <span>{showPlayerDetails.id}</span>
                </div>
                <div className="player-detail-item">
                  <label>参加時刻</label>
                  <span>{formatTime(showPlayerDetails.joinTime)}</span>
                </div>
                <div className="player-detail-item">
                  <label>最終活動</label>
                  <span>{formatTime(showPlayerDetails.lastActivity)}</span>
                </div>
                <div className="player-detail-item">
                  <label>現在のスコア</label>
                  <span>{showPlayerDetails.score || 0}ポイント</span>
                </div>
                <div className="player-detail-item">
                  <label>正解数</label>
                  <span>{showPlayerDetails.correctAnswers || 0}問</span>
                </div>
                <div className="player-detail-item">
                  <label>不正解数</label>
                  <span>{showPlayerDetails.incorrectAnswers || 0}問</span>
                </div>
                <div className="player-detail-item">
                  <label>平均回答時間</label>
                  <span>{showPlayerDetails.averageResponseTime || 'N/A'}秒</span>
                </div>
                <div className="player-detail-item">
                  <label>接続状態</label>
                  <span className={`connection-status connection-status--${showPlayerDetails.isActive ? 'active' : 'inactive'}`}>
                    {showPlayerDetails.isActive ? 'アクティブ' : '非アクティブ'}
                  </span>
                </div>
              </div>

              <div className="player-actions-extended">
                <button
                  className="player-btn player-btn--primary"
                  onClick={() => handleSendMessage('', [showPlayerDetails.id])}
                >
                  <FaComments />
                  個別メッセージ
                </button>
                <button
                  className="player-btn player-btn--warning"
                  onClick={() => handleMutePlayer(showPlayerDetails)}
                >
                  <FaMicrophoneSlash />
                  {showPlayerDetails.isMuted ? 'ミュート解除' : 'ミュート'}
                </button>
                <button
                  className="player-btn player-btn--danger"
                  onClick={() => setShowKickModal(showPlayerDetails)}
                >
                  <FaUserMinus />
                  キック
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kick Confirmation Modal */}
      {showKickModal && (
        <div className="player-modal-overlay">
          <div className="player-modal player-modal--small">
            <div className="player-modal__header">
              <h3>プレイヤーのキック</h3>
            </div>

            <div className="player-modal__content">
              <p>
                <strong>{showKickModal.name}</strong> をゲームからキックしますか？
              </p>
              <p>この操作は元に戻せません。</p>

              <div className="player-modal__actions">
                <button
                  className="player-btn player-btn--outline"
                  onClick={() => setShowKickModal(null)}
                >
                  キャンセル
                </button>
                <button
                  className="player-btn player-btn--danger"
                  onClick={() => handleKickPlayer(showKickModal)}
                >
                  キック実行
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Communication Modal */}
      {showCommunicationModal && (
        <div className="player-modal-overlay">
          <div className="player-modal">
            <div className="player-modal__header">
              <h3>プレイヤーへメッセージ送信</h3>
              <button
                className="player-modal__close"
                onClick={() => setShowCommunicationModal(false)}
              >
                ×
              </button>
            </div>

            <div className="player-modal__content">
              <div className="message-form">
                <label htmlFor="message-text">メッセージ内容</label>
                <textarea
                  id="message-text"
                  placeholder="プレイヤーに送信するメッセージを入力..."
                  rows="4"
                  className="message-textarea"
                ></textarea>

                <div className="message-targets">
                  <p>送信対象: {selectedPlayers.size}人のプレイヤー</p>
                </div>

                <div className="player-modal__actions">
                  <button
                    className="player-btn player-btn--outline"
                    onClick={() => setShowCommunicationModal(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    className="player-btn player-btn--primary"
                    onClick={() => {
                      const message = document.getElementById('message-text').value;
                      if (message.trim()) {
                        handleSendMessage(message);
                      }
                    }}
                  >
                    <FaComments />
                    送信
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Details Modal */}
      <PlayerDetailsModal
        player={showPlayerDetails}
        isOpen={showPlayerDetails !== null}
        onClose={() => setShowPlayerDetails(null)}
        onAction={handlePlayerAction}
        gameStats={playerStats[showPlayerDetails?.id]}
        actionHistory={[]} // This would come from props or state
        connectionData={{
          ping: Math.floor(Math.random() * 100) + 20,
          quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)]
        }}
      />
    </div>
  );
}

export default RealTimePlayerManagement;
