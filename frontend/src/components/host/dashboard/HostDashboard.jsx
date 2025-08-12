import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaSkipForward, 
  FaClock, 
  FaUsers, 
  FaChartBar, 
  FaCog, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaTrophy,
  FaEye,
  FaHeart,
  FaFire,
  FaBolt
} from 'react-icons/fa';
import socket from '../../../socket';
import GameOverview from './GameOverview';
import QuickActions from './QuickActions';
import PlayerManagementPreview from './PlayerManagementPreview';
import AnalyticsSummary from './AnalyticsSummary';
import AnalyticsSummary from './AnalyticsSummary';
import './HostDashboard.css';

/**
 * HostDashboard - Central hub for host game control and monitoring
 * Phase 2.1: Core Control Panel Implementation
 * 
 * Features:
 * - Live Game Overview with current question preview
 * - Quick Action Panel with pause/resume/skip controls
 * - Player Management Preview with recent activity
 * - Analytics Summary with real-time insights
 */
function HostDashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { room, title, gameId, questionSetId } = state || {};
  
  // Core game state
  const [gameState, setGameState] = useState({
    status: 'waiting', // waiting, active, paused, finished
    currentQuestion: null,
    currentQuestionIndex: 0,
    totalQuestions: 0,
    timeRemaining: 0,
    isPaused: false
  });
  
  // Player management state
  const [players, setPlayers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    responseRate: 0,
    averageResponseTime: 0,
    engagementScore: 0,
    participationRate: 0
  });
  
  // UI state
  const [showEmergencyStop, setShowEmergencyStop] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Debug logging for development
  if (import.meta.env.DEV) {
    console.log('HostDashboard state:', { room, title, gameId, questionSetId });
    console.log('HostDashboard gameState:', gameState);
  }

  useEffect(() => {
    if (!room || !title) {
      navigate('/host');
      return;
    }

    // Initialize socket listeners for real-time updates
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('playerUpdate', handlePlayerUpdate);
    socket.on('analyticsUpdate', handleAnalyticsUpdate);
    socket.on('hostNotification', handleHostNotification);

    // Request initial game state
    socket.emit('requestGameState', { gameCode: room });

    return () => {
      socket.off('gameStateUpdate');
      socket.off('playerUpdate');
      socket.off('analyticsUpdate');
      socket.off('hostNotification');
    };
  }, [room, title, navigate]);

  const handleGameStateUpdate = (data) => {
    if (import.meta.env.DEV) {
      console.log('Game state update:', data);
    }
    setGameState(prev => ({
      ...prev,
      ...data
    }));
  };

  const handlePlayerUpdate = (data) => {
    if (import.meta.env.DEV) {
      console.log('Player update:', data);
    }
    
    if (data.type === 'join') {
      setPlayers(prev => [...prev, data.player]);
      setRecentActivity(prev => [
        { type: 'join', player: data.player.name, timestamp: Date.now() },
        ...prev.slice(0, 9)
      ]);
    } else if (data.type === 'leave') {
      setPlayers(prev => prev.filter(p => p.id !== data.player.id));
      setRecentActivity(prev => [
        { type: 'leave', player: data.player.name, timestamp: Date.now() },
        ...prev.slice(0, 9)
      ]);
    } else if (data.type === 'answer') {
      setRecentActivity(prev => [
        { type: 'answer', player: data.player.name, timestamp: Date.now() },
        ...prev.slice(0, 9)
      ]);
    }
  };

  const handleAnalyticsUpdate = (data) => {
    if (import.meta.env.DEV) {
      console.log('Analytics update:', data);
    }
    setAnalytics(prev => ({
      ...prev,
      ...data
    }));
  };

  const handleHostNotification = (notification) => {
    if (import.meta.env.DEV) {
      console.log('Host notification:', notification);
    }
    setNotifications(prev => [
      { ...notification, id: Date.now() },
      ...prev.slice(0, 4)
    ]);
    
    // Auto-remove notifications after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Game control handlers
  const handlePauseResume = () => {
    const action = gameState.isPaused ? 'resume' : 'pause';
    socket.emit(`host:game:${action}`, { gameCode: room });
  };

  const handleSkipQuestion = () => {
    socket.emit('host:game:skip', { gameCode: room });
  };

  const handleEmergencyStop = () => {
    socket.emit('host:game:emergency-stop', { gameCode: room });
    setShowEmergencyStop(false);
  };

  const handleTimerAdjust = (seconds) => {
    socket.emit('host:timer:adjust', { 
      gameCode: room, 
      adjustment: seconds 
    });
  };

  const handleSettings = () => {
    // Navigate to game settings or open settings modal
    console.log('Opening game settings...');
  };

  if (!room || !title) {
    return (
      <div className="host-dashboard host-dashboard--loading">
        <div className="host-dashboard__loading">
          <div className="host-loading-spinner"></div>
          <p>ゲームを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="host-dashboard">
      {/* Header with game info */}
      <div className="host-dashboard__header">
        <div className="host-dashboard__header-content">
          <div className="host-dashboard__game-info">
            <h1 className="host-dashboard__title">
              <FaEye className="host-dashboard__title-icon" />
              ホストダッシュボード
            </h1>
            <div className="host-dashboard__subtitle">
              <span className="host-dashboard__game-title">{title}</span>
              <span className="host-dashboard__room-code">
                ルーム: <strong>{room}</strong>
              </span>
            </div>
          </div>
          
          <div className="host-dashboard__header-actions">
            <button 
              className="host-button host-button--outline host-button--small"
              onClick={handleSettings}
            >
              <FaCog className="host-button__icon" />
              設定
            </button>
            
            <button 
              className="host-button host-button--danger host-button--small"
              onClick={() => setShowEmergencyStop(true)}
            >
              <FaExclamationTriangle className="host-button__icon" />
              緊急停止
            </button>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="host-dashboard__status">
          <div className={`host-status-badge host-status-badge--${gameState.status}`}>
            {gameState.status === 'waiting' && <FaClock className="host-status-badge__icon" />}
            {gameState.status === 'active' && <FaPlay className="host-status-badge__icon" />}
            {gameState.status === 'paused' && <FaPause className="host-status-badge__icon" />}
            {gameState.status === 'finished' && <FaCheckCircle className="host-status-badge__icon" />}
            
            <span className="host-status-badge__text">
              {gameState.status === 'waiting' && '待機中'}
              {gameState.status === 'active' && '進行中'}
              {gameState.status === 'paused' && '一時停止'}
              {gameState.status === 'finished' && '終了'}
            </span>
          </div>
        </div>
      </div>

      {/* Main dashboard grid */}
      <div className="host-dashboard__content">
        {/* Game Overview - Top section */}
        <div className="host-dashboard__section host-dashboard__section--overview">
          <GameOverview 
            gameState={gameState}
            onTimerAdjust={handleTimerAdjust}
          />
        </div>

        {/* Quick Actions - Left side */}
        <div className="host-dashboard__section host-dashboard__section--actions">
          <QuickActions 
            gameState={gameState}
            onPauseResume={handlePauseResume}
            onSkipQuestion={handleSkipQuestion}
            onTimerAdjust={handleTimerAdjust}
          />
        </div>

        {/* Player Management Preview - Center */}
        <div className="host-dashboard__section host-dashboard__section--players">
          <PlayerManagementPreview 
            players={players}
            recentActivity={recentActivity}
            gameState={gameState}
          />
        </div>

        {/* Analytics Summary - Right side */}
        <div className="host-dashboard__section host-dashboard__section--analytics">
          <AnalyticsSummary 
            analytics={analytics}
            players={players}
            gameState={gameState}
          />
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="host-dashboard__notifications">
          {notifications.map(notification => (
            <div 
              key={notification.id}
              className={`host-notification host-notification--${notification.type}`}
            >
              {notification.type === 'success' && <FaCheckCircle className="host-notification__icon" />}
              {notification.type === 'warning' && <FaExclamationTriangle className="host-notification__icon" />}
              {notification.type === 'info' && <FaEye className="host-notification__icon" />}
              
              <div className="host-notification__content">
                <div className="host-notification__title">{notification.title}</div>
                {notification.message && (
                  <div className="host-notification__message">{notification.message}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Emergency Stop Modal */}
      {showEmergencyStop && (
        <div className="host-modal-overlay">
          <div className="host-modal host-modal--emergency">
            <div className="host-modal__header">
              <FaExclamationTriangle className="host-modal__icon host-modal__icon--danger" />
              <h3 className="host-modal__title">緊急停止の確認</h3>
            </div>
            
            <div className="host-modal__content">
              <p>ゲームを緊急停止しますか？</p>
              <p>この操作は取り消すことができません。</p>
            </div>
            
            <div className="host-modal__actions">
              <button 
                className="host-button host-button--outline"
                onClick={() => setShowEmergencyStop(false)}
              >
                キャンセル
              </button>
              <button 
                className="host-button host-button--danger"
                onClick={handleEmergencyStop}
              >
                <FaStop className="host-button__icon" />
                緊急停止
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostDashboard;
