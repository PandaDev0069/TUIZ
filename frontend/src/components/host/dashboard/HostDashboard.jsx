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
  FaBolt,
  FaFileExport,
  FaChartLine,
  FaFileAlt
} from 'react-icons/fa';
import socket from '../../../socket';
import GameOverview from './GameOverview';
import QuickActions from './QuickActions';
import PlayerManagementPreview from './PlayerManagementPreview';
import AnalyticsSummary from './AnalyticsSummary';
import ControlPanelContainer from '../control/ControlPanelContainer';
import RealTimePlayerManagement from '../player/RealTimePlayerManagement';
import AdvancedAnalytics from '../analytics/AdvancedAnalytics';
import ReportingSystem from '../analytics/ReportingSystem';
import DataExport from '../analytics/DataExport';
import LiveAnalytics from '../analytics/LiveAnalytics';
import EnhancedResults from '../analytics/EnhancedResults';
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
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);
  const [showReportingSystem, setShowReportingSystem] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showLiveAnalytics, setShowLiveAnalytics] = useState(false);
  const [showEnhancedResults, setShowEnhancedResults] = useState(false);
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

  const handleControlPanel = () => {
    setShowControlPanel(true);
  };

  const handleGameStateChange = (newState) => {
    setGameState(prev => ({
      ...prev,
      ...newState
    }));
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
              className="host-button host-button--primary host-button--small"
              onClick={handleControlPanel}
            >
              <FaCog className="host-button__icon" />
              制御パネル
            </button>

            <button 
              className="host-button host-button--secondary host-button--small"
              onClick={() => setShowLiveAnalytics(true)}
            >
              <FaEye className="host-button__icon" />
              ライブ分析
            </button>

            <button 
              className="host-button host-button--secondary host-button--small"
              onClick={() => setShowEnhancedResults(true)}
            >
              <FaTrophy className="host-button__icon" />
              詳細結果
            </button>

            <button 
              className="host-button host-button--secondary host-button--small"
              onClick={() => setShowAdvancedAnalytics(true)}
            >
              <FaChartLine className="host-button__icon" />
              詳細分析
            </button>

            <button 
              className="host-button host-button--secondary host-button--small"
              onClick={() => setShowReportingSystem(true)}
            >
              <FaFileAlt className="host-button__icon" />
              レポート
            </button>

            <button 
              className="host-button host-button--secondary host-button--small"
              onClick={() => setShowDataExport(true)}
            >
              <FaFileExport className="host-button__icon" />
              データ出力
            </button>

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
            onOpenPlayerManagement={() => setShowPlayerManagement(true)}
          />
        </div>

        {/* Analytics Summary - Right side */}
        <div className="host-dashboard__section host-dashboard__section--analytics">
          <AnalyticsSummary 
            analytics={analytics}
            players={players}
            gameState={gameState}
            onOpenAdvancedAnalytics={() => setShowAdvancedAnalytics(true)}
            onOpenReportingSystem={() => setShowReportingSystem(true)}
            onOpenDataExport={() => setShowDataExport(true)}
            onOpenLiveAnalytics={() => setShowLiveAnalytics(true)}
            onOpenEnhancedResults={() => setShowEnhancedResults(true)}
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

      {/* Control Panel Modal */}
      {showControlPanel && (
        <div className="host-modal-overlay host-modal-overlay--fullscreen">
          <div className="host-modal host-modal--fullscreen">
            <div className="host-modal__header">
              <h3 className="host-modal__title">
                <FaCog className="host-modal__icon" />
                ゲーム制御パネル
              </h3>
              <button 
                className="host-modal__close"
                onClick={() => setShowControlPanel(false)}
              >
                ×
              </button>
            </div>
            
            <div className="host-modal__content host-modal__content--no-padding">
              <ControlPanelContainer
                gameState={{
                  ...gameState,
                  id: gameId,
                  roomCode: room
                }}
                onGameStateChange={handleGameStateChange}
                players={players}
                questions={[]} // TODO: Pass actual questions when available
              />
            </div>
          </div>
        </div>
      )}

      {/* Player Management Modal */}
      {showPlayerManagement && (
        <div className="host-modal-overlay host-modal-overlay--fullscreen">
          <div className="host-modal host-modal--fullscreen">
            <div className="host-modal__header">
              <h3 className="host-modal__title">
                <FaUsers className="host-modal__icon" />
                リアルタイムプレイヤー管理
              </h3>
              <button 
                className="host-modal__close"
                onClick={() => setShowPlayerManagement(false)}
              >
                ×
              </button>
            </div>
            
            <div className="host-modal__content host-modal__content--no-padding">
              <RealTimePlayerManagement
                gameState={{
                  ...gameState,
                  id: gameId,
                  roomCode: room
                }}
                players={players}
                onPlayersUpdate={setPlayers}
                notifications={notifications}
                onNotification={(notification) => {
                  setNotifications(prev => [...prev, notification]);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Analytics Modal - Phase 3 */}
      {showAdvancedAnalytics && (
        <div className="host-modal-overlay host-modal-overlay--fullscreen">
          <div className="host-modal host-modal--fullscreen">
            <div className="host-modal__header">
              <h3 className="host-modal__title">
                <FaChartLine className="host-modal__icon" />
                詳細分析ダッシュボード
              </h3>
              <button 
                className="host-modal__close"
                onClick={() => setShowAdvancedAnalytics(false)}
              >
                ×
              </button>
            </div>
            
            <div className="host-modal__content host-modal__content--no-padding">
              <AdvancedAnalytics
                gameState={{
                  ...gameState,
                  id: gameId,
                  roomCode: room,
                  title: title
                }}
                players={players}
                analytics={analytics}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reporting System Modal - Phase 3 */}
      {showReportingSystem && (
        <div className="host-modal-overlay host-modal-overlay--fullscreen">
          <div className="host-modal host-modal--fullscreen">
            <div className="host-modal__header">
              <h3 className="host-modal__title">
                <FaFileAlt className="host-modal__icon" />
                レポートシステム
              </h3>
              <button 
                className="host-modal__close"
                onClick={() => setShowReportingSystem(false)}
              >
                ×
              </button>
            </div>
            
            <div className="host-modal__content host-modal__content--no-padding">
              <ReportingSystem
                gameState={{
                  ...gameState,
                  id: gameId,
                  roomCode: room,
                  title: title
                }}
                players={players}
                analytics={analytics}
              />
            </div>
          </div>
        </div>
      )}

      {/* Data Export Modal - Phase 3 */}
      {showDataExport && (
        <div className="host-modal-overlay host-modal-overlay--fullscreen">
          <div className="host-modal host-modal--fullscreen">
            <div className="host-modal__header">
              <h3 className="host-modal__title">
                <FaFileExport className="host-modal__icon" />
                データエクスポート
              </h3>
              <button 
                className="host-modal__close"
                onClick={() => setShowDataExport(false)}
              >
                ×
              </button>
            </div>
            
            <div className="host-modal__content host-modal__content--no-padding">
              <DataExport
                gameState={{
                  ...gameState,
                  id: gameId,
                  roomCode: room,
                  title: title
                }}
                players={players}
                analytics={analytics}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Analytics Modal - Phase 4 */}
      {showLiveAnalytics && (
        <div className="host-modal-overlay host-modal-overlay--fullscreen">
          <div className="host-modal host-modal--fullscreen">
            <div className="host-modal__header">
              <h3 className="host-modal__title">
                <FaEye className="host-modal__icon" />
                ライブ分析ダッシュボード
              </h3>
              <button 
                className="host-modal__close"
                onClick={() => setShowLiveAnalytics(false)}
              >
                ×
              </button>
            </div>
            
            <div className="host-modal__content host-modal__content--no-padding">
              <LiveAnalytics
                gameState={{
                  ...gameState,
                  id: gameId,
                  roomCode: room,
                  title: title
                }}
                players={players}
                analytics={analytics}
                realTimeData={{
                  currentResponses: [], // TODO: Add real-time response data
                  engagementMetrics: {}, // TODO: Add engagement metrics
                  performanceData: {} // TODO: Add performance data
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Results Modal - Phase 4 */}
      {showEnhancedResults && (
        <div className="host-modal-overlay host-modal-overlay--fullscreen">
          <div className="host-modal host-modal--fullscreen">
            <div className="host-modal__header">
              <h3 className="host-modal__title">
                <FaTrophy className="host-modal__icon" />
                詳細結果プレゼンテーション
              </h3>
              <button 
                className="host-modal__close"
                onClick={() => setShowEnhancedResults(false)}
              >
                ×
              </button>
            </div>
            
            <div className="host-modal__content host-modal__content--no-padding">
              <EnhancedResults
                gameState={{
                  ...gameState,
                  id: gameId,
                  roomCode: room,
                  title: title
                }}
                players={players}
                gameResults={{
                  leaderboard: players.sort((a, b) => (b.score || 0) - (a.score || 0)),
                  questionResults: [], // TODO: Add question results
                  achievements: [], // TODO: Add achievements
                  analytics: analytics
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostDashboard;
