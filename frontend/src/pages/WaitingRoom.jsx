import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { FaGamepad, FaBookOpen, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa'
import { usePlayerSocket } from "../hooks/useSocket"
import socketManager from "../utils/SocketManager"
import ConnectionStatus from "../components/ConnectionStatus"
import useQuestionPreload from "../hooks/useQuestionPreload"
// New player universal styles (BEM)
import "../styles/player/player-components.css"
import "../styles/player/player-animations.css"
import "../styles/player/waiting-room.css"

function WaitingRoom() {
  const location = useLocation()
  const navigate = useNavigate()
  const { name, room, initialPlayers = [], serverPlayerCount } = location.state || {}
  const [players, setPlayers] = useState(initialPlayers)
  const [currentPlayerId, setCurrentPlayerId] = useState(null)

  // Use player socket hook with session restoration
  const { 
    isConnected, 
    playerState, 
    sessionRestored, 
    requestGameState, 
    emit, 
    on, 
    off 
  } = usePlayerSocket(name, room, null)

  // Use the preloading hook
  const {
    isPreloading,
    isComplete,
    hasError,
    error,
    progress,
    stats,
    questions
  } = useQuestionPreload(room, true); // true indicates this is waiting room

  useEffect(() => {
    if (!name || !room) {
      navigate("/join")
      return
    }

    // Debug: Log socket information
    console.log('🔌 WaitingRoom useEffect - Socket state:', {
      isConnected,
      sessionRestored,
      playerState,
      room,
      name
    });

    // Handle session restoration
    if (sessionRestored && playerState) {
      if (import.meta.env.DEV) {
        console.log('🔄 Processing player session restoration:', playerState);
      }
      
      // Restore player list if available
      if (playerState.players && Array.isArray(playerState.players)) {
        setPlayers(playerState.players);
      }
      
      // Restore current player ID if available
      if (playerState.currentPlayerId) {
        setCurrentPlayerId(playerState.currentPlayerId);
      }
    }

    // Set initial players if provided
    if (initialPlayers.length > 0) {
      setPlayers(initialPlayers)
      
      // If we have a server player count that's higher than initial players,
      // request the complete player list immediately
      if (serverPlayerCount && serverPlayerCount > initialPlayers.length) {
        setTimeout(() => {
          emit('getPlayerList', { gameCode: room });
        }, 100);
      }
    }

    // Listen for successful join response
    const handleJoinedGame = ({ gameCode, gameId, playerCount, gameStatus, player }) => {
      if (import.meta.env.DEV) {
        console.log('🎯 handleJoinedGame called with:', { gameCode, gameId, playerCount, gameStatus, player });
      }

      // Store gameId for session restoration
      if (gameId) {
        // Update session data with the gameId using socketManager directly
        socketManager.storeSessionData({
          playerName: name,
          room,
          gameId, // Now we have the actual gameId
          isHost: false
        });
        
        if (import.meta.env.DEV) {
          console.log('💾 Updated session data with gameId:', gameId);
          // Also log what's actually stored
          const storedData = socketManager.getSessionData();
          console.log('📋 Current stored session data:', storedData);
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('⚠️ No gameId provided in joinedGame event!');
        }
      }

      // Add the current player to the players list if not already present
      setPlayers(prev => {
        // Always trust the server's playerCount
        const currentPlayerData = {
          id: player.id,
          name: player.name || name,
          score: player.score || 0,
          isAuthenticated: player.isAuthenticated || false,
          isHost: player.isHost || false,
          isConnected: true
        };
        
        // Check if current player is already in the list
        const currentPlayerExists = prev.some(p => p.id === player.id || p.name === player.name);
        
        if (currentPlayerExists) {
          // Update existing player data
          const updatedPlayers = prev.map(p => 
            (p.id === player.id || p.name === player.name) ? currentPlayerData : p
          );
          return updatedPlayers;
        } else {
          // Add new player
          const updatedPlayers = [...prev, currentPlayerData];
          return updatedPlayers;
        }
      });
      
      // Track current player id for future actions
      setCurrentPlayerId(player.id)
      
      // Request complete player list for synchronization
      try {
        emit('getPlayerList', { gameCode });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error requesting player list:', error);
        }
      }
    };

    // Listen for session restoration success
    const handlePlayerSessionRestored = ({ type, playerState, gameState, lobbyState, message }) => {
      if (import.meta.env.DEV) {
        console.log('🔄 Player session restored:', { type, playerState, gameState, lobbyState });
      }

      // If restored to an active game (game is actually running), navigate to quiz immediately
      if (type === 'activeGame' && gameState && 
          (gameState.status === 'active' || gameState.status === 'in-progress')) {
        if (import.meta.env.DEV) {
          console.log('🎮 Player restored to active game, navigating to quiz');
        }
        navigate('/quiz', { state: { name, room, gameState } });
        return;
      }

      // If restored to lobby, stay in waiting room and update player ID + player list
      if (type === 'lobby') {
        if (import.meta.env.DEV) {
          console.log('🏠 Player restored to lobby, staying in waiting room');
          console.log('📊 Current players before restoration:', players);
        }
        
        // Update current player ID
        if (playerState && playerState.id) {
          setCurrentPlayerId(playerState.id);
        }

        // Add current player to the players list if not already present
        const currentPlayerData = {
          id: playerState?.id || `${name}_${Date.now()}`,
          name: name,
          score: 0,
          isAuthenticated: true,
          isHost: false,
          isConnected: true
        };

        setPlayers(prev => {
          // Check if current player is already in the list
          const currentPlayerExists = prev.some(p => p.name === name);
          
          if (currentPlayerExists) {
            // Update existing player data
            const updated = prev.map(p => 
              p.name === name ? { ...p, ...currentPlayerData, isConnected: true } : p
            );
            if (import.meta.env.DEV) {
              console.log('📊 Updated existing player in list:', updated);
            }
            return updated;
          } else {
            // Add current player
            const updated = [...prev, currentPlayerData];
            if (import.meta.env.DEV) {
              console.log('📊 Added new player to list:', updated);
            }
            return updated;
          }
        });

        // Request updated player list from server
        setTimeout(() => {
          if (import.meta.env.DEV) {
            console.log('🔄 Requesting updated player list from server');
          }
          emit('getPlayerList', { gameCode: room });
        }, 100);
      }

      // Handle other playerState updates
      if (playerState && playerState.id && type !== 'lobby') {
        setCurrentPlayerId(playerState.id);
      }

      // If restored to completed game, we might want to handle this differently
      if (type === 'completed') {
        if (import.meta.env.DEV) {
          console.log('🏁 Player restored to completed game');
        }
        // Could navigate to results page or back to join page
        // For now, staying in waiting room
      }
    };

    // Listen for player list response
    const handlePlayerList = ({ players }) => {
      if (import.meta.env.DEV) {
        console.log('📋 Received player list update:', players);
        console.log('📊 Current players before update:', players);
      }
      
      setPlayers(players);
      
      if (import.meta.env.DEV) {
        console.log('📊 Players state updated to:', players);
      }
    };

    // Listen for new players joining
    const handlePlayerJoined = ({ player, totalPlayers, allPlayers }) => {
      if (allPlayers && allPlayers.length > 0) {
        setPlayers(allPlayers);
      } else {
        // Fallback: Add the new player to the existing list
        setPlayers(prev => {
          const updated = [...prev];
          // Check if player already exists
          const existingIndex = updated.findIndex(p => p.id === player.id);
          if (existingIndex >= 0) {
            updated[existingIndex] = player;
          } else {
            updated.push(player);
          }
          return updated;
        });
      }
    };

    // Listen for players disconnecting
    const handlePlayerDisconnected = ({ playerId, playerName, remainingPlayers, allPlayers }) => {
      if (allPlayers && allPlayers.length >= 0) {
        setPlayers(allPlayers);
      } else {
        // Fallback: Remove the disconnected player from existing list
        setPlayers(prev => {
          const updated = prev.filter(p => p.id !== playerId);
          return updated;
        });
      }
    };

    // Listen for game start
    const handleGameStarted = (data) => {
      navigate('/quiz', { state: { name, room } })
    };

    // Register event handlers
    on('joinedGame', handleJoinedGame);
    on('playerList', handlePlayerList);
    on('playerJoined', handlePlayerJoined);
    on('playerDisconnected', handlePlayerDisconnected);
    on('gameStarted', handleGameStarted);
    on('playerSessionRestored', handlePlayerSessionRestored);

    // Cleanup listeners
    return () => {
      if (import.meta.env.DEV) {
        console.log('WaitingRoom: Cleaning up socket listeners');
      }
      off('joinedGame', handleJoinedGame);
      off('playerList', handlePlayerList);
      off('playerJoined', handlePlayerJoined);
      off('playerDisconnected', handlePlayerDisconnected);
      off('gameStarted', handleGameStarted);
      off('playerSessionRestored', handlePlayerSessionRestored);
    }
  }, [name, room, navigate, initialPlayers, serverPlayerCount, isConnected, sessionRestored, playerState, emit, on, off])

  // Persist player session data when state changes
  useEffect(() => {
    if (isConnected && name && room) {
      const sessionDataToSave = {
        players: players.slice(0, 50), // Keep last 50 players to avoid too much data
        currentPlayerId,
        playerName: name,
        room,
        lastActivity: Date.now()
      }
      
      // The socket manager will handle persistence
      emit('player:saveSession', sessionDataToSave)
    }
  }, [players, currentPlayerId, emit, isConnected, name, room])

  // Removed rejoin helpers and countdown

  const goBackToJoin = () => {
    navigate('/join', { state: { name, room } })
  }

  return (
    <div className="player-page waiting-room" role="region" aria-live="polite">
      {/* Connection Status Indicator */}
      <ConnectionStatus 
        position="top-right"
        showText={true}
        autoHide={true}
        autoHideDelay={2000}
        isConnected={isConnected}
        connectionState={isConnected ? 'connected' : 'disconnected'}
        reconnectAttempts={0}
      />
      
      <div className="player-card tuiz-animate-entrance">
        <h1 className="player-card__title">こんにちは、{name}さん！</h1>
        <div className="player-pill" aria-label="room code">
          ルームコード: <strong className="player-pill__code" aria-live="polite">{room}</strong>
        </div>
        <h2 className="waiting tuiz-animate-fade-in">
          ホストがクイズを開始するのを待っています...
        </h2>
        
        {/* Preloading Progress */}
        {isPreloading && (
          <div className="preload tuiz-animate-fade-in" role="status" aria-label="preloading quiz">
            <h3 className="preload__title">
              <FaBookOpen className="anim-pulse" />
              クイズの準備中...
            </h3>
            <div className="preload__progress">
              <div className="preload__row">
                <span className="preload__label">質問データ:</span>
                <div className="preload__bar" aria-hidden="true">
                  <div className="preload__fill" style={{ width: `${progress.questions}%` }}></div>
                </div>
                <span className="preload__percent" aria-live="polite">{progress.questions}%</span>
              </div>
              <div className="preload__row">
                <span className="preload__label">画像 ({stats.totalImages}枚):</span>
                <div className="preload__bar" aria-hidden="true">
                  <div className="preload__fill" style={{ width: `${progress.images}%` }}></div>
                </div>
                <span className="preload__percent" aria-live="polite">{progress.images}%</span>
              </div>
              <div className="preload__row preload__row--overall">
                <span className="preload__label">全体の進行:</span>
                <div className="preload__bar" aria-hidden="true">
                  <div className="preload__fill" style={{ width: `${progress.overall}%` }}></div>
                </div>
                <span className="preload__percent" aria-live="polite">{progress.overall}%</span>
              </div>
            </div>
            {stats.totalImages > 0 && (
              <div className="preload__stats">
                <small>
                  画像: {stats.loadedImages}枚読み込み完了
                  {stats.failedImages > 0 && `, ${stats.failedImages}枚失敗`}
                </small>
              </div>
            )}
          </div>
        )}

        {/* Completion Status */}
        {isComplete && (
          <div className="preload-complete tuiz-animate-scale-in" role="status">
            <div className="preload-complete__icon">
              <FaCheckCircle />
            </div>
            <p>クイズの準備が完了しました！</p>
            {questions.length > 0 && (
              <small>{questions.length}問の質問が読み込まれました</small>
            )}
          </div>
        )}

        {/* Error Handling */}
        {hasError && (
          <div className="preload-error tuiz-animate-fade-in" role="alert">
            <div className="preload-error__icon">
              <FaExclamationTriangle />
            </div>
            <p>準備中にエラーが発生しました</p>
            <small>{error}</small>
          </div>
        )}

        {/* Default Loading for Non-Preload State */}
        {!isPreloading && !isComplete && !hasError && (
          <div className="player-loading anim-bounce-in" aria-live="polite">
            <FaClock />
          </div>
        )}
        
        {/* Players List */}
        <div className="player-roster" aria-live="polite">
          <p>参加者: {players.filter(p => p.name !== 'HOST').length}人</p>
          {/* Debug Info */}
          {/* {import.meta.env.DEV && (
            <div style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
              <details>
                <summary>Debug: Players ({players.length} total)</summary>
                <pre style={{ fontSize: '0.7em', maxHeight: '100px', overflow: 'auto' }}>
                  {JSON.stringify(players, null, 2)}
                </pre>
              </details>
            </div>
          )} */}
        </div>
      </div>
    </div>
  )
}

export default WaitingRoom

