// Host Control Integration Service - Phase 6
// Connects frontend UX components with backend APIs

class HostControlIntegration {
  constructor(apiBaseUrl, socketConnection) {
    this.apiBaseUrl = apiBaseUrl;
    this.socket = socketConnection;
    this.gameId = null;
    this.hostToken = null;
    this.isConnected = false;
    
    this.setupSocketListeners();
  }

  // Initialize host control for a game
  async initializeHostControl(gameId, hostToken) {
    try {
      this.gameId = gameId;
      this.hostToken = hostToken;

      // Join host room via socket
      this.socket.emit('host:join', {
        gameId,
        hostToken
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to initialize host control:', error);
      return { success: false, error: error.message };
    }
  }

  // Game Control Methods
  async pauseGame(reason = 'host_action', message = null) {
    try {
      // Use socket for real-time action
      this.socket.emit('host:pause', {
        gameId: this.gameId,
        reason,
        message
      });

      // Also call HTTP API for persistence
      const response = await fetch(`${this.apiBaseUrl}/api/host/game/${this.gameId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ pauseReason: reason, message })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to pause game:', error);
      return { success: false, error: error.message };
    }
  }

  async resumeGame(countdown = 3, message = null) {
    try {
      // Use socket for real-time action
      this.socket.emit('host:resume', {
        gameId: this.gameId,
        countdown,
        message
      });

      // Also call HTTP API
      const response = await fetch(`${this.apiBaseUrl}/api/host/game/${this.gameId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ countdown, message })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to resume game:', error);
      return { success: false, error: error.message };
    }
  }

  async skipQuestion(reason = 'host_decision', showCorrectAnswer = true) {
    try {
      // Use socket for real-time action
      this.socket.emit('host:skip:question', {
        gameId: this.gameId,
        reason,
        showCorrectAnswer
      });

      // Also call HTTP API
      const response = await fetch(`${this.apiBaseUrl}/api/host/game/${this.gameId}/skip-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ skipReason: reason, showCorrectAnswer })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to skip question:', error);
      return { success: false, error: error.message };
    }
  }

  async emergencyStop(reason = 'host_emergency', saveProgress = true) {
    try {
      // Use socket for immediate action
      this.socket.emit('host:emergency:stop', {
        gameId: this.gameId,
        reason,
        saveProgress
      });

      // Also call HTTP API
      const response = await fetch(`${this.apiBaseUrl}/api/host/game/${this.gameId}/emergency-stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ reason, saveProgress })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to emergency stop:', error);
      return { success: false, error: error.message };
    }
  }

  // Timer Control Methods
  async adjustTimer(adjustment, reason = 'host_decision') {
    try {
      this.socket.emit('host:timer:adjust', {
        gameId: this.gameId,
        adjustment,
        reason
      });

      const response = await fetch(`${this.apiBaseUrl}/api/host/game/${this.gameId}/adjust-timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ adjustment, reason })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to adjust timer:', error);
      return { success: false, error: error.message };
    }
  }

  async resetTimer(newDuration = null, reason = 'restart_question') {
    try {
      this.socket.emit('host:timer:reset', {
        gameId: this.gameId,
        newDuration,
        reason
      });

      const response = await fetch(`${this.apiBaseUrl}/api/host/game/${this.gameId}/reset-timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ newDuration, reason })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to reset timer:', error);
      return { success: false, error: error.message };
    }
  }

  // Player Management Methods
  async kickPlayer(playerId, reason = 'host_decision', banDuration = null) {
    try {
      this.socket.emit('host:kick:player', {
        gameId: this.gameId,
        playerId,
        reason,
        banDuration
      });

      const response = await fetch(`${this.apiBaseUrl}/api/host/player/${this.gameId}/kick-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ playerId, reason, banDuration })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to kick player:', error);
      return { success: false, error: error.message };
    }
  }

  async mutePlayer(playerId, duration = 300000, reason = 'host_moderation') {
    try {
      this.socket.emit('host:mute:player', {
        gameId: this.gameId,
        playerId,
        duration,
        reason
      });

      const response = await fetch(`${this.apiBaseUrl}/api/host/player/${this.gameId}/mute-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ playerId, duration, reason })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to mute player:', error);
      return { success: false, error: error.message };
    }
  }

  async unmutePlayer(playerId, reason = 'host_decision') {
    try {
      this.socket.emit('host:unmute:player', {
        gameId: this.gameId,
        playerId,
        reason
      });

      const response = await fetch(`${this.apiBaseUrl}/api/host/player/${this.gameId}/unmute-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ playerId, reason })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to unmute player:', error);
      return { success: false, error: error.message };
    }
  }

  async transferHost(newHostId, reason = 'host_transfer') {
    try {
      this.socket.emit('host:transfer', {
        gameId: this.gameId,
        newHostId,
        reason
      });

      const response = await fetch(`${this.apiBaseUrl}/api/host/player/${this.gameId}/transfer-host`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hostToken}`
        },
        body: JSON.stringify({ newHostId, reason })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to transfer host:', error);
      return { success: false, error: error.message };
    }
  }

  // Analytics Methods
  async getPlayerManagementStatus() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/host/player/${this.gameId}/player-management`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.hostToken}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get player management status:', error);
      return { success: false, error: error.message };
    }
  }

  async requestAnalytics(analyticsType = 'full') {
    try {
      this.socket.emit('host:analytics:request', {
        gameId: this.gameId,
        analyticsType
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to request analytics:', error);
      return { success: false, error: error.message };
    }
  }

  // Settings Update Methods
  async updateGameSettings(settings) {
    try {
      this.socket.emit('host:settings:update', {
        gameId: this.gameId,
        settings
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update game settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Socket Event Listeners
  setupSocketListeners() {
    // Host connection events
    this.socket.on('host:joined', (data) => {
      this.isConnected = true;
      this.onHostJoined?.(data);
    });

    this.socket.on('host:join:error', (error) => {
      this.isConnected = false;
      this.onHostJoinError?.(error);
    });

    // Host action confirmations
    this.socket.on('host:action:success', (data) => {
      this.onHostActionSuccess?.(data);
    });

    this.socket.on('host:action:error', (error) => {
      this.onHostActionError?.(error);
    });

    // Game state events
    this.socket.on('game:paused', (data) => {
      this.onGamePaused?.(data);
    });

    this.socket.on('game:resumed', (data) => {
      this.onGameResumed?.(data);
    });

    this.socket.on('game:resuming:countdown', (data) => {
      this.onGameResumeCountdown?.(data);
    });

    this.socket.on('question:skipped', (data) => {
      this.onQuestionSkipped?.(data);
    });

    this.socket.on('game:emergency:stopped', (data) => {
      this.onGameEmergencyStopped?.(data);
    });

    // Timer events
    this.socket.on('timer:adjusted', (data) => {
      this.onTimerAdjusted?.(data);
    });

    this.socket.on('timer:reset', (data) => {
      this.onTimerReset?.(data);
    });

    // Player management events
    this.socket.on('player:kicked', (data) => {
      this.onPlayerKicked?.(data);
    });

    this.socket.on('player:removed', (data) => {
      this.onPlayerRemoved?.(data);
    });

    this.socket.on('player:status:updated', (data) => {
      this.onPlayerStatusUpdated?.(data);
    });

    this.socket.on('host:changed', (data) => {
      this.onHostChanged?.(data);
    });

    this.socket.on('host:transferred:to', (data) => {
      this.onHostTransferredTo?.(data);
    });

    this.socket.on('host:transferred:from', (data) => {
      this.onHostTransferredFrom?.(data);
    });

    // Host disconnect events
    this.socket.on('host:disconnected', (data) => {
      this.isConnected = false;
      this.onHostDisconnected?.(data);
    });

    this.socket.on('game:abandoned', (data) => {
      this.onGameAbandoned?.(data);
    });
  }

  // Event handler setters (to be used by frontend components)
  setHostJoinedHandler(handler) { this.onHostJoined = handler; }
  setHostJoinErrorHandler(handler) { this.onHostJoinError = handler; }
  setHostActionSuccessHandler(handler) { this.onHostActionSuccess = handler; }
  setHostActionErrorHandler(handler) { this.onHostActionError = handler; }
  setGamePausedHandler(handler) { this.onGamePaused = handler; }
  setGameResumedHandler(handler) { this.onGameResumed = handler; }
  setGameResumeCountdownHandler(handler) { this.onGameResumeCountdown = handler; }
  setQuestionSkippedHandler(handler) { this.onQuestionSkipped = handler; }
  setGameEmergencyStoppedHandler(handler) { this.onGameEmergencyStopped = handler; }
  setTimerAdjustedHandler(handler) { this.onTimerAdjusted = handler; }
  setTimerResetHandler(handler) { this.onTimerReset = handler; }
  setPlayerKickedHandler(handler) { this.onPlayerKicked = handler; }
  setPlayerRemovedHandler(handler) { this.onPlayerRemoved = handler; }
  setPlayerStatusUpdatedHandler(handler) { this.onPlayerStatusUpdated = handler; }
  setHostChangedHandler(handler) { this.onHostChanged = handler; }
  setHostTransferredToHandler(handler) { this.onHostTransferredTo = handler; }
  setHostTransferredFromHandler(handler) { this.onHostTransferredFrom = handler; }
  setHostDisconnectedHandler(handler) { this.onHostDisconnected = handler; }
  setGameAbandonedHandler(handler) { this.onGameAbandoned = handler; }

  // Cleanup
  disconnect() {
    this.isConnected = false;
    this.gameId = null;
    this.hostToken = null;
  }

  // Status getters
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      gameId: this.gameId,
      hasToken: !!this.hostToken
    };
  }
}

export default HostControlIntegration;
