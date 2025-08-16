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
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    const handleReconnect = (attemptNumber) => {
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(attemptNumber);
    };

    const handleError = (error) => {
      setConnectionState('error');
    };

    socketManager.onConnect(handleConnect);
    socketManager.onDisconnect(handleDisconnect);
    socketManager.onReconnect(handleReconnect);
    socketManager.onError(handleError);

    // Initial state
    setIsConnected(socketManager.isConnected());
    setConnectionState(socketManager.getConnectionState());

    return () => {
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

    const handleHostRestored = (state) => {
      setHostState(state);
    };

    on('hostRestored', handleHostRestored);

    // Request host restoration if connected
    if (isConnected && gameId && room) {
      emit('requestHostRestoration', { gameId, room, questionSetId });
    }

    return () => {
      off('hostRestored', handleHostRestored);
    };
  }, [gameId, room, questionSetId, isConnected, emit, on, off]);

  return {
    isConnected,
    hostState,
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

    const handlePlayerRestored = (state) => {
      setPlayerState(state);
    };

    on('playerRestored', handlePlayerRestored);

    // Request player restoration if connected
    if (isConnected && playerName && room) {
      emit('requestPlayerRestoration', { playerName, room, gameId });
    }

    return () => {
      off('playerRestored', handlePlayerRestored);
    };
  }, [playerName, room, gameId, isConnected, emit, on, off]);

  return {
    isConnected,
    playerState,
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
