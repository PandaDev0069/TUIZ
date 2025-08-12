/* PlayerDetailsModal.jsx - Enhanced Player Details Modal */
/* Phase 2.3: Real-time Player Management - Supporting Component */

import React, { useState, useEffect } from 'react';
import { 
  FaTimes, FaEnvelope, FaFlag, FaShieldAlt, FaHistory, 
  FaExclamationTriangle, FaBan, FaUndo, FaCrown,
  FaMicrophone, FaMicrophoneSlash, FaEye, FaEyeSlash
} from 'react-icons/fa';
import PropTypes from 'prop-types';

const PlayerDetailsModal = ({ 
  player, 
  isOpen, 
  onClose, 
  onAction, 
  gameStats,
  actionHistory = [],
  connectionData = {}
}) => {
  const [messageText, setMessageText] = useState('');
  const [selectedTab, setSelectedTab] = useState('details');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setMessageText('');
      setSelectedTab('details');
      setConfirmAction(null);
    }
  }, [isOpen]);

  if (!isOpen || !player) return null;

  const handleAction = (action, data = {}) => {
    if (['kick', 'ban', 'removePermissions'].includes(action)) {
      setConfirmAction({ action, data });
    } else {
      onAction(action, { ...data, playerId: player.id });
      if (action === 'sendMessage' && messageText) {
        setMessageText('');
      }
    }
  };

  const handleConfirm = () => {
    if (confirmAction) {
      onAction(confirmAction.action, { 
        ...confirmAction.data, 
        playerId: player.id 
      });
      setConfirmAction(null);
    }
  };

  const getActionHistory = () => {
    return actionHistory
      .filter(action => action.playerId === player.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  };

  const getPlayerStatus = () => {
    if (player.banned) return { label: 'Banned', class: 'danger' };
    if (player.muted) return { label: 'Muted', class: 'warning' };
    if (player.moderator) return { label: 'Moderator', class: 'accent' };
    if (player.connected) return { label: 'Active', class: 'success' };
    return { label: 'Inactive', class: 'tertiary' };
  };

  const status = getPlayerStatus();
  const history = getActionHistory();

  return (
    <div className="player-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="player-modal">
        <div className="player-modal__header">
          <div className="player-modal__title">
            <div className="player-avatar">
              <img 
                src={player.avatar || '/api/placeholder/40/40'} 
                alt={player.name}
                className="player-avatar__image"
              />
              <div className={`player-status-icon player-status-icon--${player.connected ? 'active' : 'inactive'}`}>
                <FaEye />
              </div>
            </div>
            <div>
              <h3>
                {player.name}
                {player.moderator && <FaCrown className="player-crown" />}
              </h3>
              <div className={`connection-status connection-status--${status.class}`}>
                {status.label}
              </div>
            </div>
          </div>
          <button className="player-modal__close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="player-modal__tabs">
          <button 
            className={`tab-btn ${selectedTab === 'details' ? 'tab-btn--active' : ''}`}
            onClick={() => setSelectedTab('details')}
          >
            Details
          </button>
          <button 
            className={`tab-btn ${selectedTab === 'history' ? 'tab-btn--active' : ''}`}
            onClick={() => setSelectedTab('history')}
          >
            History ({history.length})
          </button>
          <button 
            className={`tab-btn ${selectedTab === 'actions' ? 'tab-btn--active' : ''}`}
            onClick={() => setSelectedTab('actions')}
          >
            Actions
          </button>
        </div>

        <div className="player-modal__content">
          {selectedTab === 'details' && (
            <div className="player-details-tab">
              <div className="player-details-grid">
                <div className="player-detail-item">
                  <label>Player ID</label>
                  <span className="player-id-code">{player.id}</span>
                </div>
                <div className="player-detail-item">
                  <label>Join Time</label>
                  <span>{new Date(player.joinTime).toLocaleString()}</span>
                </div>
                <div className="player-detail-item">
                  <label>Session Duration</label>
                  <span>{Math.floor((Date.now() - new Date(player.joinTime)) / 60000)} minutes</span>
                </div>
                <div className="player-detail-item">
                  <label>Connection Quality</label>
                  <div className="connection-quality">
                    <div className={`quality-indicator quality-${connectionData.quality || 'good'}`}>
                      {connectionData.quality || 'Good'} ({connectionData.ping || 45}ms)
                    </div>
                  </div>
                </div>
              </div>

              <div className="performance-stats">
                <h4>Performance Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <label>Score</label>
                    <span className="stat-value">{player.score || 0}</span>
                  </div>
                  <div className="stat-item">
                    <label>Correct Answers</label>
                    <span className="stat-value stat-value--success">{player.correctAnswers || 0}</span>
                  </div>
                  <div className="stat-item">
                    <label>Total Answers</label>
                    <span className="stat-value">{(player.correctAnswers || 0) + (player.incorrectAnswers || 0)}</span>
                  </div>
                  <div className="stat-item">
                    <label>Accuracy</label>
                    <span className="stat-value">
                      {player.correctAnswers ? 
                        Math.round((player.correctAnswers / (player.correctAnswers + (player.incorrectAnswers || 0))) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <label>Avg Response Time</label>
                    <span className="stat-value">{gameStats?.avgResponseTime || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <label>Streak</label>
                    <span className="stat-value">{gameStats?.currentStreak || 0}</span>
                  </div>
                </div>
              </div>

              <div className="player-permissions">
                <h4>Permissions & Status</h4>
                <div className="permission-list">
                  <div className={`permission-item ${player.moderator ? 'permission-item--active' : ''}`}>
                    <FaShieldAlt />
                    <span>Moderator Privileges</span>
                    {player.moderator && <span className="permission-badge">Active</span>}
                  </div>
                  <div className={`permission-item ${player.muted ? 'permission-item--restricted' : ''}`}>
                    <FaMicrophone />
                    <span>Chat Access</span>
                    {player.muted && <span className="permission-badge permission-badge--danger">Muted</span>}
                  </div>
                  <div className={`permission-item ${player.banned ? 'permission-item--restricted' : ''}`}>
                    <FaEye />
                    <span>Game Access</span>
                    {player.banned && <span className="permission-badge permission-badge--danger">Banned</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'history' && (
            <div className="player-history-tab">
              <h4>Action History</h4>
              {history.length > 0 ? (
                <div className="action-history">
                  {history.map((action, index) => (
                    <div key={index} className="history-item">
                      <div className="history-time">
                        {new Date(action.timestamp).toLocaleString()}
                      </div>
                      <div className={`history-action history-action--${action.type}`}>
                        <span className="action-type">{action.action}</span>
                        <span className="action-description">{action.description}</span>
                        {action.moderator && (
                          <span className="action-moderator">by {action.moderator}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-history">
                  <FaHistory className="empty-icon" />
                  <p>No actions recorded for this player</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'actions' && (
            <div className="player-actions-tab">
              <div className="actions-section">
                <h4>Communication</h4>
                <div className="message-form">
                  <label htmlFor="message-input">Send Private Message</label>
                  <textarea
                    id="message-input"
                    className="message-textarea"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    rows="3"
                  />
                  <button 
                    className="player-btn player-btn--primary"
                    onClick={() => handleAction('sendMessage', { message: messageText })}
                    disabled={!messageText.trim()}
                  >
                    <FaEnvelope /> Send Message
                  </button>
                </div>
              </div>

              <div className="actions-section">
                <h4>Moderation Actions</h4>
                <div className="player-actions-extended">
                  {!player.muted ? (
                    <button 
                      className="player-btn player-btn--warning"
                      onClick={() => handleAction('mute')}
                    >
                      <FaMicrophoneSlash /> Mute Player
                    </button>
                  ) : (
                    <button 
                      className="player-btn player-btn--secondary"
                      onClick={() => handleAction('unmute')}
                    >
                      <FaMicrophone /> Unmute Player
                    </button>
                  )}

                  <button 
                    className="player-btn player-btn--outline"
                    onClick={() => handleAction('flag')}
                  >
                    <FaFlag /> Flag for Review
                  </button>

                  {!player.moderator ? (
                    <button 
                      className="player-btn player-btn--primary"
                      onClick={() => handleAction('grantModerator')}
                    >
                      <FaShieldAlt /> Grant Moderator
                    </button>
                  ) : (
                    <button 
                      className="player-btn player-btn--secondary"
                      onClick={() => handleAction('removeModerator')}
                    >
                      <FaShieldAlt /> Remove Moderator
                    </button>
                  )}
                </div>
              </div>

              <div className="actions-section actions-section--danger">
                <h4>Severe Actions</h4>
                <div className="player-actions-extended">
                  <button 
                    className="player-btn player-btn--warning"
                    onClick={() => handleAction('kick')}
                  >
                    <FaExclamationTriangle /> Kick Player
                  </button>

                  {!player.banned ? (
                    <button 
                      className="player-btn player-btn--danger"
                      onClick={() => handleAction('ban')}
                    >
                      <FaBan /> Ban Player
                    </button>
                  ) : (
                    <button 
                      className="player-btn player-btn--secondary"
                      onClick={() => handleAction('unban')}
                    >
                      <FaUndo /> Unban Player
                    </button>
                  )}
                </div>
                <p className="actions-warning">
                  <FaExclamationTriangle /> These actions will immediately affect the player's game experience
                </p>
              </div>
            </div>
          )}
        </div>

        {confirmAction && (
          <div className="confirmation-overlay">
            <div className="confirmation-modal">
              <h4>Confirm Action</h4>
              <p>
                Are you sure you want to <strong>{confirmAction.action}</strong> {player.name}?
                {confirmAction.action === 'ban' && ' This will permanently remove them from the game.'}
                {confirmAction.action === 'kick' && ' They will be disconnected but can rejoin.'}
              </p>
              <div className="confirmation-actions">
                <button 
                  className="player-btn player-btn--secondary"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </button>
                <button 
                  className="player-btn player-btn--danger"
                  onClick={handleConfirm}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

PlayerDetailsModal.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    avatar: PropTypes.string,
    score: PropTypes.number,
    correctAnswers: PropTypes.number,
    incorrectAnswers: PropTypes.number,
    joinTime: PropTypes.string,
    connected: PropTypes.bool,
    muted: PropTypes.bool,
    banned: PropTypes.bool,
    moderator: PropTypes.bool
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAction: PropTypes.func.isRequired,
  gameStats: PropTypes.object,
  actionHistory: PropTypes.array,
  connectionData: PropTypes.object
};

export default PlayerDetailsModal;
