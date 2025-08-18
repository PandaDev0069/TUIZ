import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaStepForward, 
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
import MobileViewPort from './MobileViewPort';
import InlineQuizPreview from './InlineQuizPreview';
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
// Phase 5: Enhanced UX & Polish Systems
import { AnimationProvider } from '../animations/AnimationSystem';
import { AudioProvider } from '../audio/AudioSystem';
import { MobileOptimizationProvider } from '../mobile/MobileOptimization';
// Phase 6: Host Control Integration
import HostControlIntegration from '../../../services/HostControlIntegration';
import { useAuth } from '../../../contexts/AuthContext';
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
  const { user, token } = useAuth();
  const { room, title, gameId, questionSetId } = state || {};
  
  // Phase 6: Host Control Integration
  const hostControlRef = useRef(null);
  const [hostControlStatus, setHostControlStatus] = useState({
    isConnected: false,
    hasPermissions: false,
    lastAction: null
  });
  
  // Core game state - games are already active when entering dashboard
  const [gameState, setGameState] = useState({
    status: 'active', // waiting, active, paused, finished
    currentQuestion: null,
    currentQuestionIndex: 0,
    totalQuestions: 0,
    timeRemaining: 0,
    isPaused: false,
    showingExplanation: false,
    explanationData: null,
    phase: 'question' // 'question', 'explanation', 'waiting'
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

  // Debug logging for development (throttled to reduce noise)
  useEffect(() => {
    if (import.meta.env.DEV) {
      const logThrottle = setTimeout(() => {
        console.log('🎮 HostDashboard state:', { room, title, gameId, questionSetId });
        console.log('📊 HostDashboard gameState:', gameState?.status, gameState?.currentQuestionIndex, gameState?.timeRemaining);
      }, 1000); // Log once per second max
      
      return () => clearTimeout(logThrottle);
    }
  }, [room, title, gameId, questionSetId, gameState?.status, gameState?.currentQuestionIndex]);

  useEffect(() => {
    if (!room || !title) {
      navigate('/dashboard');
      return;
    }

    // Phase 6: Initialize Host Control Integration
    if (user && token && gameId) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      hostControlRef.current = new HostControlIntegration(apiBaseUrl, socket);
      
      // Initialize host control
      hostControlRef.current.initializeHostControl(gameId, token)
        .then(result => {
          if (result.success) {
            console.log('Host control initialized successfully');
            setHostControlStatus(prev => ({
              ...prev,
              isConnected: true,
              hasPermissions: true
            }));
          } else {
            console.error('Failed to initialize host control:', result.error);
          }
        });

      // Set up event handlers
      hostControlRef.current.setHostJoinedHandler((data) => {
        console.log('Host joined successfully:', data);
        setGameState(prev => ({ ...prev, ...data.gameState }));
        setPlayers(data.players || []);
        setAnalytics(data.analytics || {});
      });

      hostControlRef.current.setHostActionSuccessHandler((data) => {
        console.log('Host action successful:', data);
        setHostControlStatus(prev => ({
          ...prev,
          lastAction: data.action,
          lastActionTime: Date.now()
        }));
        
        // Handle specific action responses
        if (data.gameState) {
          setGameState(prev => ({ ...prev, ...data.gameState }));
        }
      });

      hostControlRef.current.setHostActionErrorHandler((error) => {
        console.error('Host action failed:', error);
        setNotifications(prev => [
          {
            id: Date.now(),
            type: 'error',
            title: 'ホストアクション失敗',
            message: error.error || 'アクションの実行に失敗しました',
            timestamp: Date.now()
          },
          ...prev.slice(0, 4)
        ]);
      });

      // Game state event handlers
      hostControlRef.current.setGamePausedHandler((data) => {
        setGameState(prev => ({ ...prev, status: 'paused', isPaused: true }));
        setNotifications(prev => [
          {
            id: Date.now(),
            type: 'info',
            title: 'ゲーム一時停止',
            message: data.message || 'ゲームが一時停止されました',
            timestamp: Date.now()
          },
          ...prev.slice(0, 4)
        ]);
      });

      hostControlRef.current.setGameResumedHandler((data) => {
        setGameState(prev => ({ ...prev, status: 'active', isPaused: false }));
        setNotifications(prev => [
          {
            id: Date.now(),
            type: 'success',
            title: 'ゲーム再開',
            message: 'ゲームが再開されました',
            timestamp: Date.now()
          },
          ...prev.slice(0, 4)
        ]);
      });

      hostControlRef.current.setQuestionSkippedHandler((data) => {
        setGameState(prev => ({ 
          ...prev, 
          currentQuestionIndex: data.nextQuestion - 1 
        }));
        setNotifications(prev => [
          {
            id: Date.now(),
            type: 'warning',
            title: '質問スキップ',
            message: `質問 ${data.skippedQuestion} をスキップしました`,
            timestamp: Date.now()
          },
          ...prev.slice(0, 4)
        ]);
      });

      hostControlRef.current.setPlayerKickedHandler((data) => {
        setPlayers(prev => prev.filter(p => p.id !== data.playerId));
        setRecentActivity(prev => [
          { 
            type: 'kick', 
            player: data.playerName, 
            reason: data.reason,
            timestamp: Date.now() 
          },
          ...prev.slice(0, 9)
        ]);
      });

      // Real-time question and game state socket listeners
      socket.on('question', (questionData) => {
        console.log('📝 Received question:', questionData);
        setGameState(prev => ({
          ...prev,
          currentQuestion: questionData,
          currentQuestionIndex: (questionData.questionNumber || 1) - 1,
          totalQuestions: questionData.totalQuestions || prev.totalQuestions,
          timeRemaining: Math.floor((questionData.timeLimit || 30000) / 1000),
          showingExplanation: false,
          explanationData: null,
          phase: 'question'
        }));
      });

      socket.on('showExplanation', (explanationData) => {
        console.log('📊 Received explanation:', explanationData);
        setGameState(prev => ({
          ...prev,
          showingExplanation: true,
          explanationData: explanationData,
          timeRemaining: Math.floor((explanationData.explanationTime || 30000) / 1000),
          phase: 'explanation'
        }));
      });

      socket.on('showLeaderboard', (leaderboardData) => {
        console.log('🏆 Received leaderboard:', leaderboardData);
        setGameState(prev => ({
          ...prev,
          showingExplanation: true,
          explanationData: leaderboardData,
          timeRemaining: Math.floor((leaderboardData.displayTime || 15000) / 1000),
          phase: 'explanation'
        }));
      });

      socket.on('gameStarted', (data) => {
        console.log('🎮 Game started:', data);
        setGameState(prev => ({
          ...prev,
          status: 'active',
          totalQuestions: data.totalQuestions || prev.totalQuestions
        }));
      });

      socket.on('game_over', (data) => {
        console.log('🏁 Game over:', data);
        setGameState(prev => ({
          ...prev,
          status: 'finished',
          phase: 'finished',
          scoreboard: data.scoreboard,
          finalScoreboard: data.scoreboard
        }));
      });

      // Player list updates
      socket.on('player_joined', (data) => {
        console.log('👋 Player joined:', data);
        setPlayers(prev => {
          const existing = prev.find(p => p.id === data.playerId);
          if (existing) return prev;
          return [...prev, {
            id: data.playerId,
            name: data.playerName,
            score: 0,
            isConnected: true,
            joinedAt: Date.now()
          }];
        });
        setRecentActivity(prev => [
          { type: 'join', player: data.playerName, timestamp: Date.now() },
          ...prev.slice(0, 9)
        ]);
      });

      socket.on('player_left', (data) => {
        console.log('👋 Player left:', data);
        setPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, isConnected: false }
            : p
        ));
        setRecentActivity(prev => [
          { type: 'leave', player: data.playerName, timestamp: Date.now() },
          ...prev.slice(0, 9)
        ]);
      });

      socket.on('scoreboard_update', (data) => {
        console.log('📊 Scoreboard update:', data);
        if (data.standings) {
          setPlayers(prev => {
            const updatedPlayers = [...prev];
            data.standings.forEach(standing => {
              const playerIndex = updatedPlayers.findIndex(p => p.name === standing.name || p.id === standing.id);
              if (playerIndex !== -1) {
                updatedPlayers[playerIndex] = {
                  ...updatedPlayers[playerIndex],
                  score: standing.score,
                  streak: standing.streak || 0
                };
              }
            });
            return updatedPlayers;
          });
        }
      });

      // Request initial game state from server
      socket.emit('host:requestGameState', { gameId, room });
      
      // Request initial player list
      socket.emit('host:requestPlayerList', { room });

    }

    // Cleanup function
    return () => {
      if (hostControlRef.current) {
        hostControlRef.current.disconnect();
      }
      
      // Remove socket listeners
      socket.off('question');
      socket.off('showExplanation');
      socket.off('showLeaderboard');
      socket.off('gameStarted');
      socket.off('game_over');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('scoreboard_update');
    };
  }, [room, title, navigate, user, token, gameId]);

  // Timer countdown effect
  useEffect(() => {
    let interval;
    
    if (gameState.timeRemaining > 0 && (gameState.phase === 'question' || gameState.phase === 'explanation')) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeRemaining: Math.max(0, prev.timeRemaining - 1)
        }));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [gameState.timeRemaining, gameState.phase]);

  // Add host-specific socket event listeners for game state updates
  useEffect(() => {
    const handleHostGameStateUpdate = (data) => {
      console.log('🎮 Host game state update:', data);
      setGameState(prev => ({
        ...prev,
        status: data.status || prev.status,
        currentQuestionIndex: data.currentQuestionIndex ?? prev.currentQuestionIndex,
        totalQuestions: data.totalQuestions || prev.totalQuestions
      }));
      
      if (data.players) {
        setPlayers(data.players);
      }
    };

    const handleHostPlayerListUpdate = (data) => {
      console.log('👥 Host player list update:', data);
      if (data.players) {
        setPlayers(data.players);
      }
    };

    // Listen for host-specific events
    socket.on('host:gameStateUpdate', handleHostGameStateUpdate);
    socket.on('host:playerListUpdate', handleHostPlayerListUpdate);

    return () => {
      socket.off('host:gameStateUpdate', handleHostGameStateUpdate);
      socket.off('host:playerListUpdate', handleHostPlayerListUpdate);
    };
  }, []);

  // Calculate real-time analytics based on player data
  useEffect(() => {
    const connectedPlayers = players.filter(p => p.isConnected);
    const totalPlayers = players.length;
    
    if (totalPlayers > 0) {
      const participationRate = (connectedPlayers.length / totalPlayers) * 100;
      const averageScore = connectedPlayers.reduce((sum, p) => sum + (p.score || 0), 0) / connectedPlayers.length;
      
      // Calculate engagement based on recent activity
      const recentActivityCount = recentActivity.filter(
        activity => Date.now() - activity.timestamp < 60000 // Last minute
      ).length;
      const engagementScore = Math.min(100, (recentActivityCount / connectedPlayers.length) * 100);
      
      // Response rate calculation (simplified)
      const responseRate = connectedPlayers.length > 0 ? Math.random() * 20 + 80 : 0; // Mock calculation
      
      setAnalytics({
        responseRate: Math.round(responseRate),
        averageResponseTime: Math.round(3 + Math.random() * 7), // Mock: 3-10 seconds
        engagementScore: Math.round(engagementScore),
        participationRate: Math.round(participationRate)
      });

      // Calculate current leader for gameState
      const sortedPlayers = connectedPlayers.sort((a, b) => (b.score || 0) - (a.score || 0));
      const currentLeader = sortedPlayers.length > 0 ? sortedPlayers[0] : null;
      
      setGameState(prev => ({
        ...prev,
        currentLeader
      }));
    }
  }, [players, recentActivity]);

  // Game control handlers - Phase 6: Enhanced with backend integration
  const handlePauseResume = async () => {
    if (!hostControlRef.current) {
      console.error('Host control not initialized');
      return;
    }

    try {
      if (gameState.isPaused) {
        await hostControlRef.current.resumeGame(3, 'ホストによる再開');
      } else {
        await hostControlRef.current.pauseGame('host_action', 'ホストによる一時停止');
      }
    } catch (error) {
      console.error('Failed to pause/resume game:', error);
    }
  };

  const handleSkipQuestion = async () => {
    if (!hostControlRef.current) {
      console.error('Host control not initialized');
      return;
    }

    try {
      await hostControlRef.current.skipQuestion('host_decision', true);
    } catch (error) {
      console.error('Failed to skip question:', error);
    }
  };

  const handleEmergencyStop = async () => {
    if (!hostControlRef.current) {
      console.error('Host control not initialized');
      return;
    }

    try {
      await hostControlRef.current.emergencyStop('host_emergency', true);
      setShowEmergencyStop(false);
    } catch (error) {
      console.error('Failed to emergency stop:', error);
    }
  };

  const handleTimerAdjust = async (seconds) => {
    if (!hostControlRef.current) {
      console.error('Host control not initialized');
      return;
    }

    try {
      await hostControlRef.current.adjustTimer(seconds * 1000, 'host_timer_adjustment');
    } catch (error) {
      console.error('Failed to adjust timer:', error);
    }
  };

  const handleKickPlayer = async (playerId, reason = 'host_decision') => {
    if (!hostControlRef.current) {
      console.error('Host control not initialized');
      return;
    }

    try {
      await hostControlRef.current.kickPlayer(playerId, reason);
    } catch (error) {
      console.error('Failed to kick player:', error);
    }
  };

  const handleMutePlayer = async (playerId, duration = 300000, reason = 'host_moderation') => {
    if (!hostControlRef.current) {
      console.error('Host control not initialized');
      return;
    }

    try {
      await hostControlRef.current.mutePlayer(playerId, duration, reason);
    } catch (error) {
      console.error('Failed to mute player:', error);
    }
  };

  const handleUnmutePlayer = async (playerId, reason = 'host_decision') => {
    if (!hostControlRef.current) {
      console.error('Host control not initialized');
      return;
    }

    try {
      await hostControlRef.current.unmutePlayer(playerId, reason);
    } catch (error) {
      console.error('Failed to unmute player:', error);
    }
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
    <AnimationProvider>
      <AudioProvider>
        <MobileOptimizationProvider>
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
      </div>

      {/* Main dashboard grid */}
      <div className="host-dashboard__content">
        {/* Game Overview - Top section */}
        <div className="host-dashboard__section host-dashboard__section--overview">
          <div className="game-overview game-overview--mobile">
            <div className="game-overview__header">
              <h3 className="game-overview__title">Game Preview</h3>
              <div className="game-overview__room-info">
                Room: <strong>{room}</strong>
              </div>
            </div>
            
            <div className="game-overview__content">
              <MobileViewPort mode="scale-to-fit" className="host-game-renderer__viewport">
                <InlineQuizPreview 
                  gameState={gameState}
                  gameId={gameId}
                  questionSetId={questionSetId}
                  disableInteraction={true}
                />
              </MobileViewPort>
            </div>
          </div>
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
        </MobileOptimizationProvider>
      </AudioProvider>
    </AnimationProvider>
  );
}

export default HostDashboard;
