import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ControlPanelContainer from '../components/host/control/ControlPanelContainer';
import socket from '../socket';

/**
 * HostControlPage - Standalone Control Panel Page
 * Phase 2.2: Game Control Panel
 * 
 * Features:
 * - Full-page control panel interface
 * - Direct navigation from host dashboard
 * - Real-time game state synchronization
 */
function HostControlPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  
  const [gameState, setGameState] = useState({
    status: 'waiting',
    currentQuestionIndex: 0,
    totalQuestions: 0,
    timeRemaining: 30,
    id: null,
    roomCode: roomCode
  });
  
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize game data
    if (roomCode) {
      loadGameData();
    }

    // Socket listeners
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('playersUpdate', handlePlayersUpdate);
    socket.on('questionsLoaded', handleQuestionsLoaded);

    return () => {
      socket.off('gameStateUpdate');
      socket.off('playersUpdate');
      socket.off('questionsLoaded');
    };
  }, [roomCode]);

  const loadGameData = async () => {
    try {
      setIsLoading(true);
      
      // Emit request for game data
      socket.emit('getGameData', { roomCode });
      
      // Mock data for development
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          id: `game_${roomCode}`,
          totalQuestions: 10,
          status: 'waiting'
        }));
        
        setPlayers([
          { id: '1', name: 'プレイヤー1', score: 150, isActive: true },
          { id: '2', name: 'プレイヤー2', score: 120, isActive: true },
          { id: '3', name: 'プレイヤー3', score: 90, isActive: false }
        ]);
        
        setQuestions([
          { id: 1, text: 'サンプル問題1', type: 'multiple-choice', options: ['A', 'B', 'C', 'D'] },
          { id: 2, text: 'サンプル問題2', type: 'true-false', options: ['True', 'False'] }
        ]);
        
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to load game data:', error);
      setIsLoading(false);
    }
  };

  const handleGameStateUpdate = (newState) => {
    setGameState(prev => ({
      ...prev,
      ...newState
    }));
  };

  const handlePlayersUpdate = (newPlayers) => {
    setPlayers(newPlayers);
  };

  const handleQuestionsLoaded = (newQuestions) => {
    setQuestions(newQuestions);
  };

  const handleGameStateChange = (action, data = {}) => {
    // Handle game control actions
    console.log('Game action:', action, data);
    
    switch (action) {
      case 'start':
      case 'resume':
        setGameState(prev => ({ ...prev, status: 'active' }));
        break;
      case 'pause':
        setGameState(prev => ({ ...prev, status: 'paused' }));
        break;
      case 'stop':
        setGameState(prev => ({ ...prev, status: 'waiting' }));
        break;
      case 'nextQuestion':
        setGameState(prev => ({
          ...prev,
          currentQuestionIndex: Math.min(prev.currentQuestionIndex + 1, prev.totalQuestions - 1)
        }));
        break;
      case 'previousQuestion':
        setGameState(prev => ({
          ...prev,
          currentQuestionIndex: Math.max(prev.currentQuestionIndex - 1, 0)
        }));
        break;
      default:
        break;
    }

    // Emit to server
    socket.emit(`hostAction:${action}`, {
      roomCode,
      gameId: gameState.id,
      ...data
    });
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-background-primary)',
        color: 'var(--color-text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid var(--color-background-tertiary)',
            borderTop: '4px solid var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>ゲームデータを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (!roomCode) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-background-primary)',
        color: 'var(--color-text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>無効なルームコード</h2>
          <p>有効なルームコードが必要です</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              background: 'var(--color-accent)',
              color: 'var(--color-accent-contrast)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: 'var(--color-background-primary)' }}>
      <ControlPanelContainer
        gameState={gameState}
        onGameStateChange={handleGameStateChange}
        players={players}
        questions={questions}
      />
    </div>
  );
}

export default HostControlPage;
