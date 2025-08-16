/**
 * React Hook for Socket Management
 * 
 * Provides easy-to-use hooks for socket connectivity, state management,
 * and automatic reconnection handling in React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import socketManager from '../utils/SocketManager';

/**
 * Main socket hook for connection management
 */
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socketManager.isConnected());
  const [connectionState, setConnectionState] = useState(socketManager.getConnectionState());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(socketManager.isConnected());
      setConnectionState(socketManager.getConnectionState());
      setReconnectAttempts(0);
    };

    const handleDisconnect = (reason) => {
      setIsConnected(socketManager.isConnected());
      setConnectionState(socketManager.getConnectionState());
    };

    const handleReconnect = (attemptNumber) => {
      setIsConnected(socketManager.isConnected());
      setConnectionState(socketManager.getConnectionState());
      setReconnectAttempts(attemptNumber);
    };

    const handleError = (error) => {
      setIsConnected(socketManager.isConnected());
      setConnectionState(socketManager.getConnectionState());
    };

    socketManager.onConnect(handleConnect);
    socketManager.onDisconnect(handleDisconnect);
    socketManager.onReconnect(handleReconnect);
    socketManager.onError(handleError);

    // Initial state
    setIsConnected(socketManager.isConnected());
    setConnectionState(socketManager.getConnectionState());

    // Periodic sync to ensure state consistency (every 1 second)
    const syncInterval = setInterval(() => {
      const currentState = socketManager.getConnectionState();
      const currentConnected = socketManager.isConnected();
      
      setIsConnected(currentConnected);
      setConnectionState(currentState);
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      // Cleanup is handled by the SocketManager
    };
  }, []);

  const emit = useCallback((event, data, callback) => {
    socketManager.emit(event, data, callback);
  }, []);

  const on = useCallback((event, callback, persistent = true) => {
    socketManager.on(event, callback, persistent);
  }, []);

  const off = useCallback((event, callback) => {
    socketManager.off(event, callback);
  }, []);

  return {
    isConnected,
    connectionState,
    reconnectAttempts,
    emit,
    on,
    off,
    socket: socketManager.socket
  };
};

/**
 * Hook for game session management
 */
export const useGameSession = (gameData) => {
  const { isConnected, emit, on, off } = useSocket();
  const [sessionRestored, setSessionRestored] = useState(false);
  const gameDataRef = useRef(gameData);

  // Update ref when gameData changes
  useEffect(() => {
    gameDataRef.current = gameData;
  }, [gameData]);

  // Store session data when game starts
  useEffect(() => {
    if (gameData && (gameData.gameId || gameData.room)) {
      socketManager.storeSessionData(gameData);
    }
  }, [gameData]);

  // Handle session restoration
  useEffect(() => {
    const handleSessionRestored = (restoredData) => {
      setSessionRestored(true);
      // Trigger any necessary UI updates
    };

    const handleGameStateSnapshot = (state) => {
      // Update local state with server state
      if (gameDataRef.current && state) {
        // Merge or update game state as needed
      }
    };

    on('gameSessionRestored', handleSessionRestored);
    on('gameStateSnapshot', handleGameStateSnapshot);

    // Request restoration if we have session data but aren't restored
    if (isConnected && gameData && !sessionRestored) {
      const sessionData = socketManager.getSessionData();
      if (sessionData.gameId || sessionData.room) {
        emit('requestSessionRestoration', sessionData);
      }
    }

    return () => {
      off('gameSessionRestored', handleSessionRestored);
      off('gameStateSnapshot', handleGameStateSnapshot);
    };
  }, [isConnected, gameData, sessionRestored, emit, on, off]);

  const clearSession = useCallback(() => {
    socketManager.clearSessionData();
    setSessionRestored(false);
  }, []);

  return {
    sessionRestored,
    clearSession,
    isConnected
  };
};

/**
 * Hook for host-specific functionality
 */
export const useHostSocket = (gameId, room, questionSetId) => {
  const { isConnected, emit, on, off } = useSocket();
  const [hostState, setHostState] = useState(null);
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    // Store host session data
    if (gameId && room) {
      socketManager.storeSessionData({
        gameId,
        room,
        questionSetId,
        isHost: true
      });
    }

    const handleHostSessionRestored = (data) => {
      setHostState(data);
      setSessionRestored(true);
    };

    const handlePlayerListUpdate = (data) => {
      setHostState(prev => ({
        ...prev,
        connectedPlayers: data.players || [],
        playerCount: data.playerCount || 0
      }));
    };

    const handleGameStateUpdate = (data) => {
      setHostState(prev => ({
        ...prev,
        gameState: data
      }));
    };

    const handleSessionRestoreError = (_error) => {
      setSessionRestored(false);
    };

    const handleSessionExpired = (data) => {
      setSessionRestored(false);
      if (data.shouldRedirect) {
        window.location.href = data.shouldRedirect;
      }
    };

    // Legacy handlers for backward compatibility
    const handleHostReconnected = (data) => {
      setHostState({
        connectedPlayers: data.players || [],
        gameSettings: data.game?.game_settings || {},
        gameStatus: data.game?.status || 'waiting',
        gameCode: data.gameCode || room,
        gameId: data.game?.id || gameId,
        capabilities: data.game?.capabilities || {}
      });
    };

    const handleGameRestored = (data) => {
      if (data.players) {
        setHostState(prev => ({
          ...prev,
          connectedPlayers: data.players,
          gameSettings: data.gameSettings || prev?.gameSettings,
          gameStatus: data.status || prev?.gameStatus
        }));
      }
    };

    // Register event handlers
    on('hostSessionRestored', handleHostSessionRestored);
    on('host:playerListUpdate', handlePlayerListUpdate);
    on('host:gameStateUpdate', handleGameStateUpdate);
    on('sessionRestoreError', handleSessionRestoreError);
    on('sessionExpired', handleSessionExpired);
    
    // Legacy events for backward compatibility
    on('hostReconnected', handleHostReconnected);
    on('gameRestored', handleGameRestored);
    on('hostRestored', handleGameRestored);

    // Request session restoration automatically when connected
    if (isConnected && gameId && room && !sessionRestored) {
      emit('restoreSession', { gameId, room, questionSetId, isHost: true });
    }

    return () => {
      off('hostSessionRestored', handleHostSessionRestored);
      off('host:playerListUpdate', handlePlayerListUpdate);
      off('host:gameStateUpdate', handleGameStateUpdate);
      off('sessionRestoreError', handleSessionRestoreError);
      off('sessionExpired', handleSessionExpired);
      off('hostReconnected', handleHostReconnected);
      off('gameRestored', handleGameRestored);
      off('hostRestored', handleGameRestored);
    };
  }, [gameId, room, questionSetId, isConnected, sessionRestored, emit, on, off]);

  const requestPlayerList = useCallback(() => {
    if (isConnected && room) {
      emit('host:requestPlayerList', { gameId, room });
    }
  }, [isConnected, gameId, room, emit]);

  const requestGameState = useCallback(() => {
    if (isConnected && room) {
      emit('host:requestGameState', { gameId, room });
    }
  }, [isConnected, gameId, room, emit]);

  return {
    isConnected,
    hostState,
    sessionRestored,
    requestPlayerList,
    requestGameState,
    emit,
    on,
    off
  };
};

/**
 * Hook for player-specific functionality
 */
export const usePlayerSocket = (playerName, room, gameId) => {
  const { isConnected, emit, on, off } = useSocket();
  const [playerState, setPlayerState] = useState(null);
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    // Store player session data
    if (playerName && room) {
      socketManager.storeSessionData({
        playerName,
        room,
        gameId,
        isHost: false
      });
    }

    const handlePlayerSessionRestored = (data) => {
      setPlayerState(data);
      setSessionRestored(true);
    };

    const handleGameStateUpdate = (data) => {
      setPlayerState(prev => ({
        ...prev,
        gameState: data
      }));
    };

    const handleSessionRestoreError = (_error) => {
      setSessionRestored(false);
    };

    const handleSessionExpired = (data) => {
      setSessionRestored(false);
      if (data.shouldRedirect) {
        window.location.href = data.shouldRedirect;
      }
    };

    const handlePlayerNotInGame = (_data) => {
      setSessionRestored(false);
    };

    const handleGameNotFound = (_data) => {
      setSessionRestored(false);
    };

    // Legacy handler for backward compatibility
    const handlePlayerRestored = (state) => {
      setPlayerState(state);
    };

    // Register event handlers
    on('playerSessionRestored', handlePlayerSessionRestored);
    on('player:gameStateUpdate', handleGameStateUpdate);
    on('sessionRestoreError', handleSessionRestoreError);
    on('sessionExpired', handleSessionExpired);
    on('player:notInGame', handlePlayerNotInGame);
    on('player:gameNotFound', handleGameNotFound);
    
    // Legacy event for backward compatibility
    on('playerRestored', handlePlayerRestored);

    // Request player restoration if connected
    if (isConnected && playerName && room && !sessionRestored) {
      emit('restoreSession', { playerName, room, gameId, isHost: false });
    }

    return () => {
      off('playerSessionRestored', handlePlayerSessionRestored);
      off('player:gameStateUpdate', handleGameStateUpdate);
      off('sessionRestoreError', handleSessionRestoreError);
      off('sessionExpired', handleSessionExpired);
      off('player:notInGame', handlePlayerNotInGame);
      off('player:gameNotFound', handleGameNotFound);
      off('playerRestored', handlePlayerRestored);
    };
  }, [playerName, room, gameId, isConnected, sessionRestored, emit, on, off]);

  const requestGameState = useCallback(() => {
    if (isConnected && playerName && room) {
      emit('player:requestGameState', { playerName, room, gameId });
    }
  }, [isConnected, playerName, room, gameId, emit]);

  return {
    isConnected,
    playerState,
    sessionRestored,
    requestGameState,
    emit,
    on,
    off
  };
};

/**
 * Hook for connection status display
 */
export const useConnectionStatus = () => {
  const { isConnected, connectionState, reconnectAttempts } = useSocket();

  const getStatusInfo = () => {
    switch (connectionState) {
      case 'connected':
        return {
          status: 'connected',
          message: '接続済み',
          color: 'green',
          icon: '🟢'
        };
      case 'connecting':
        return {
          status: 'connecting',
          message: '接続中...',
          color: 'orange',
          icon: '🟡'
        };
      case 'disconnected':
        return {
          status: 'disconnected',
          message: reconnectAttempts > 0 ? `再接続中... (${reconnectAttempts}回目)` : '切断済み',
          color: 'red',
          icon: '🔴'
        };
      case 'error':
        return {
          status: 'error',
          message: '接続エラー',
          color: 'red',
          icon: '❌'
        };
      default:
        return {
          status: 'unknown',
          message: '状態不明',
          color: 'gray',
          icon: '⚪'
        };
    }
  };

  return {
    isConnected,
    connectionState,
    reconnectAttempts,
    statusInfo: getStatusInfo()
  };
};
