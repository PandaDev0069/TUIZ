/**
 * Socket Connection Manager
 * 
 * Handles automatic reconnection, state restoration, and connection health
 * for the TUIZ application. Provides robust socket connectivity across
 * page reloads, network issues, and temporary disconnections.
 */

import { io } from 'socket.io-client';
import { apiConfig } from './apiConfig';

class SocketManager {
  constructor() {
    this.socket = null;
    this.connectionState = 'disconnected'; // 'disconnected', 'connecting', 'connected'
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.reconnectTimer = null;
    this.listeners = new Map(); // Store event listeners for re-registration
    this.gameState = null; // Store current game state for restoration
    this.callbacks = {
      onConnect: [],
      onDisconnect: [],
      onReconnect: [],
      onError: []
    };

    // Development logging
    this.debug = import.meta.env.DEV;

    this.init();
  }

  init() {
    this.connect();
    this.setupWindowHandlers();
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.connectionState = 'connecting';
    this.log('🔌 Connecting to socket server...');

    this.socket = io(apiConfig.socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false, // Allow reconnection to existing session
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      autoConnect: true
    });

    this.setupSocketHandlers();
    return this.socket;
  }

  setupSocketHandlers() {
    this.socket.on('connect', () => {
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
      
      this.log('✅ Socket connected');
      this.notifyCallbacks('onConnect');
      
      // Re-register all stored listeners
      this.reregisterListeners();
      
      // Attempt to restore game state if available
      this.restoreGameState();
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionState = 'disconnected';
      this.log(`❌ Socket disconnected: ${reason}`);
      this.notifyCallbacks('onDisconnect', reason);

      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected us, don't auto-reconnect
        this.log('🚫 Server disconnected client, manual reconnection required');
      } else {
        // Network issues, attempt reconnection
        this.attemptReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.log(`🔥 Connection error: ${error.message}`);
      this.notifyCallbacks('onError', error);
      this.attemptReconnection();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.notifyCallbacks('onReconnect', attemptNumber);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_failed', () => {
      this.log('💥 Reconnection failed after maximum attempts');
    });

    // Game state restoration events
    this.socket.on('gameStateSnapshot', (state) => {
      this.gameState = state;
      this.log('📸 Game state snapshot received');
    });

    this.socket.on('hostRestored', (data) => {
      this.log('🏠 Host session restored');
    });

    this.socket.on('playerRestored', (data) => {
      this.log('👤 Player session restored');
    });
  }

  attemptReconnection() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('💥 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

    this.log(`⏱️ Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      if (this.connectionState !== 'connected') {
        this.connect();
      }
    }, delay);
  }

  // Store event listeners for re-registration after reconnection
  on(event, callback, persistent = true) {
    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Store for re-registration after reconnection
    if (persistent) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data, callback) {
    if (this.socket && this.socket.connected) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    } else {
      this.log(`⚠️ Cannot emit '${event}' - socket not connected`);
      // Queue the emission for when reconnected
      this.on('connect', () => {
        this.socket.emit(event, data, callback);
      }, false); // Don't persist this listener
    }
  }

  reregisterListeners() {
    this.log('🔄 Re-registering event listeners...');
    for (const [event, callbacks] of this.listeners.entries()) {
      for (const callback of callbacks) {
        this.socket.on(event, callback);
      }
    }
  }

  restoreGameState() {
    // Request current game state from server
    const sessionData = this.getSessionData();
    
    if (sessionData.gameId || sessionData.room) {
      this.log('🔄 Requesting game state restoration...');
      this.emit('requestStateRestoration', sessionData);
    }
  }

  // Get session data from localStorage for restoration
  getSessionData() {
    try {
      return {
        gameId: localStorage.getItem('tuiz_current_game_id'),
        room: localStorage.getItem('tuiz_current_room'),
        playerName: localStorage.getItem('tuiz_player_name'),
        isHost: localStorage.getItem('tuiz_is_host') === 'true',
        questionSetId: localStorage.getItem('tuiz_question_set_id')
      };
    } catch (error) {
      this.log('❌ Error reading session data:', error);
      return {};
    }
  }

  // Store session data for restoration after reconnection
  storeSessionData(data) {
    try {
      if (data.gameId) localStorage.setItem('tuiz_current_game_id', data.gameId);
      if (data.room) localStorage.setItem('tuiz_current_room', data.room);
      if (data.playerName) localStorage.setItem('tuiz_player_name', data.playerName);
      if (data.isHost !== undefined) localStorage.setItem('tuiz_is_host', data.isHost.toString());
      if (data.questionSetId) localStorage.setItem('tuiz_question_set_id', data.questionSetId);
    } catch (error) {
      this.log('❌ Error storing session data:', error);
    }
  }

  // Clear session data (call when game ends)
  clearSessionData() {
    try {
      localStorage.removeItem('tuiz_current_game_id');
      localStorage.removeItem('tuiz_current_room');
      localStorage.removeItem('tuiz_player_name');
      localStorage.removeItem('tuiz_is_host');
      localStorage.removeItem('tuiz_question_set_id');
    } catch (error) {
      this.log('❌ Error clearing session data:', error);
    }
  }

  setupWindowHandlers() {
    // Handle page visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.connectionState === 'disconnected') {
        this.log('👁️ Page visible again, checking connection...');
        this.connect();
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      this.log('🌐 Network back online, reconnecting...');
      this.connect();
    });

    window.addEventListener('offline', () => {
      this.log('📡 Network offline');
    });

    // Handle page beforeunload (but don't interfere with normal navigation)
    window.addEventListener('beforeunload', () => {
      // Don't clear session data on normal page reload/navigation
      // Only clear when explicitly logging out or ending game
    });
  }

  // Callback management
  onConnect(callback) {
    this.callbacks.onConnect.push(callback);
  }

  onDisconnect(callback) {
    this.callbacks.onDisconnect.push(callback);
  }

  onReconnect(callback) {
    this.callbacks.onReconnect.push(callback);
  }

  onError(callback) {
    this.callbacks.onError.push(callback);
  }

  notifyCallbacks(type, data) {
    this.callbacks[type].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this.log(`Error in ${type} callback:`, error);
      }
    });
  }

  // Utility methods
  isConnected() {
    return this.socket && this.socket.connected;
  }

  getConnectionState() {
    return this.connectionState;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  log(...args) {
    if (this.debug) {
      console.log('[SocketManager]', ...args);
    }
  }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager;
export { SocketManager };
