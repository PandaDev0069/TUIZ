import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../../../socket';
import MobileViewPort from './MobileViewPort';
import InlineQuizPreview from './InlineQuizPreview';
import { useAuth } from '../../../contexts/AuthContext';
import './HostDashboard.css';

/**
 * HostDashboard - Clean canvas for host game monitoring
 * 
 * Core Features:
 * - Game preview with current question display
 * - Socket connection management
 * - Auth context integration
 * - Session persistence for page reloads
 * 
 * Preserved:
 * - Auth API integration
 * - Socket connections
 * - Game state management for preview
 */
function HostDashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // Enhanced session persistence - restore from localStorage if state is lost
  const getHostSessionData = () => {
    // First try to get from navigation state
    if (state?.gameId) {
      // Save to localStorage for reload persistence
      const sessionData = {
        room: state.room,
        title: state.title,
        gameId: state.gameId,
        questionSetId: state.questionSetId,
        timestamp: Date.now()
      };
      localStorage.setItem('tuiz_host_session', JSON.stringify(sessionData));
      return state;
    }
    
    // Fallback to localStorage if navigation state is lost (page reload)
    const savedSession = localStorage.getItem('tuiz_host_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        // Check if session is not too old (24 hours max)
        const isRecent = Date.now() - sessionData.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent && sessionData.gameId) {
          console.log('🔄 Restored host session from localStorage:', sessionData);
          return sessionData;
        } else {
          // Clean up old session
          localStorage.removeItem('tuiz_host_session');
        }
      } catch (error) {
        console.error('Failed to parse saved host session:', error);
        localStorage.removeItem('tuiz_host_session');
      }
    }
    
    return {};
  };
  
  const { room, title, gameId, questionSetId } = getHostSessionData();
  
  // Minimal game state for preview functionality
  const [gameState, setGameState] = useState({
    status: 'active',
    currentQuestion: null,
    currentQuestionIndex: 0,
    totalQuestions: 0,
    timeRemaining: 0,
    phase: 'question' // 'question', 'explanation', 'waiting'
  });
  
  // Show restoration message if this looks like a reload scenario
  const isRestoringSession = !state?.gameId && gameId; // We have gameId from localStorage but not from navigation state
  
  // Show loading/restoration UI early in render
  if (isRestoringSession) {
    return (
      <div className="host-dashboard__loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <h3>🔄 Restoring Host Session...</h3>
          <p>Reconnecting to game room: <strong>{room}</strong></p>
          <p>Game: <strong>{title}</strong></p>
          <small>This happens automatically after page reload</small>
        </div>
      </div>
    );
  }

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
    if (!room || !title || !gameId) {
      console.log('⚠️ Missing host session data, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }

    if (user && token && gameId) {
      // Simple socket listeners for game events
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

      // Note: Player management removed for clean canvas

      // Request initial state
      socket.emit('host:requestGameState', { gameId, room });
      
      // Add retry logic for cases where the initial requests fail (e.g., after reload)
      const retryTimeout = setTimeout(() => {
        console.log('🔄 Retrying initial state requests after reload...');
        socket.emit('host:requestGameState', { gameId, room });
      }, 3000);
      
      // Clean up retry timeout on component unmount
      return () => clearTimeout(retryTimeout);
    }

    // Cleanup function
    return () => {
      // Remove socket listeners
      socket.off('question');
      socket.off('showExplanation');
      socket.off('showLeaderboard');
      socket.off('gameStarted');
      socket.off('game_over');
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
    };

    const handleHostPlayerListUpdate = (data) => {
      console.log('👥 Host player list update:', data);
      // Player management removed for clean canvas
    };

    // Listen for host-specific events
    socket.on('host:gameStateUpdate', handleHostGameStateUpdate);
    socket.on('host:playerListUpdate', handleHostPlayerListUpdate);

    return () => {
      socket.off('host:gameStateUpdate', handleHostGameStateUpdate);
      socket.off('host:playerListUpdate', handleHostPlayerListUpdate);
    };
  }, []);


  const handleSettings = () => {
    // Navigate to game settings or open settings modal
    console.log('Opening game settings...');
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
                    ホストダッシュボード
                  </h1>
                  <div className="host-dashboard__subtitle">
                    <span className="host-dashboard__game-title">{title}</span>
                  </div>
                </div>

                <div className="host-dashboard__header-actions">
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
      </div>
    </div>
  );
}

export default HostDashboard;
