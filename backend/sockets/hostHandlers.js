// Socket.IO Host Event Handlers - Backend Implementation
// Phase 6: Complete Missing Backend Infrastructure

const { RoomManager } = require('../utils/RoomManager');
const logger = require('../utils/logger');

/**
 * Host-specific Socket.IO event handlers
 * Implements real-time host control functionality
 */
class HostSocketHandlers {
  constructor(io) {
    this.io = io;
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.io.on('connection', (socket) => {
      this.setupHostEventHandlers(socket);
    });
  }

  setupHostEventHandlers(socket) {
    // Host joins game room with elevated privileges
    socket.on('host:join', (data) => {
      this.handleHostJoin(socket, data);
    });

    // Real-time game control events
    socket.on('host:pause', (data) => {
      this.handleHostPause(socket, data);
    });

    socket.on('host:resume', (data) => {
      this.handleHostResume(socket, data);
    });

    socket.on('host:skip:question', (data) => {
      this.handleHostSkipQuestion(socket, data);
    });

    socket.on('host:emergency:stop', (data) => {
      this.handleHostEmergencyStop(socket, data);
    });

    // Timer control events
    socket.on('host:timer:adjust', (data) => {
      this.handleHostTimerAdjust(socket, data);
    });

    socket.on('host:timer:reset', (data) => {
      this.handleHostTimerReset(socket, data);
    });

    // Player management events
    socket.on('host:kick:player', (data) => {
      this.handleHostKickPlayer(socket, data);
    });

    socket.on('host:mute:player', (data) => {
      this.handleHostMutePlayer(socket, data);
    });

    socket.on('host:unmute:player', (data) => {
      this.handleHostUnmutePlayer(socket, data);
    });

    socket.on('host:transfer', (data) => {
      this.handleHostTransfer(socket, data);
    });

    // Real-time settings updates
    socket.on('host:settings:update', (data) => {
      this.handleHostSettingsUpdate(socket, data);
    });

    // Host analytics events
    socket.on('host:analytics:request', (data) => {
      this.handleHostAnalyticsRequest(socket, data);
    });

    // Host disconnect handling
    socket.on('disconnect', () => {
      this.handleHostDisconnect(socket);
    });
  }

  // Host joins game with validation
  handleHostJoin(socket, data) {
    try {
      const { gameId, hostToken } = data;
      
      if (!gameId || !hostToken) {
        socket.emit('host:join:error', { error: 'Game ID and host token required' });
        return;
      }

      const room = RoomManager.getRoom(gameId);
      if (!room) {
        socket.emit('host:join:error', { error: 'Game room not found' });
        return;
      }

      // Validate host token (simplified - should use JWT validation)
      if (room.hostToken !== hostToken) {
        socket.emit('host:join:error', { error: 'Invalid host token' });
        return;
      }

      // Join room and set host socket
      socket.join(gameId);
      room.hostSocketId = socket.id;
      
      // Send current game state to host
      socket.emit('host:joined', {
        gameId,
        gameState: room.gameState,
        players: Object.values(room.players),
        settings: room.gameSettings,
        analytics: this.getGameAnalytics(room)
      });

      logger.info(`Host joined game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        playerCount: Object.keys(room.players).length
      });

    } catch (error) {
      logger.error('Host join error:', error);
      socket.emit('host:join:error', { error: 'Failed to join as host' });
    }
  }

  // Handle host pause request
  handleHostPause(socket, data) {
    try {
      const { gameId, reason, message } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      if (room.gameState?.status !== 'active') {
        socket.emit('host:action:error', { 
          action: 'pause',
          error: 'Game must be active to pause' 
        });
        return;
      }

      const pausedAt = new Date().toISOString();
      room.gameState = {
        ...room.gameState,
        status: 'paused',
        pausedAt,
        pauseReason: reason || 'host_action'
      };

      // Broadcast to all players
      this.io.to(gameId).emit('game:paused', {
        gameId,
        pausedAt,
        reason: reason || 'host_action',
        message: message || 'Game paused by host'
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'pause',
        timestamp: pausedAt,
        gameState: room.gameState
      });

      logger.info(`Game ${gameId} paused by host via socket`, {
        gameId,
        hostSocketId: socket.id,
        reason,
        pausedAt
      });

    } catch (error) {
      logger.error('Host pause error:', error);
      socket.emit('host:action:error', { action: 'pause', error: 'Failed to pause game' });
    }
  }

  // Handle host resume request
  handleHostResume(socket, data) {
    try {
      const { gameId, countdown = 3, message } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      if (room.gameState?.status !== 'paused') {
        socket.emit('host:action:error', { 
          action: 'resume',
          error: 'Game must be paused to resume' 
        });
        return;
      }

      const resumedAt = new Date().toISOString();
      room.gameState = {
        ...room.gameState,
        status: 'resuming',
        resumedAt
      };

      // Start countdown
      let countdownValue = countdown;
      const countdownInterval = setInterval(() => {
        this.io.to(gameId).emit('game:resuming:countdown', {
          gameId,
          countdown: countdownValue,
          message: message || `Game resuming in ${countdownValue}...`
        });

        countdownValue--;
        
        if (countdownValue < 0) {
          clearInterval(countdownInterval);
          
          // Actually resume
          room.gameState.status = 'active';
          this.io.to(gameId).emit('game:resumed', {
            gameId,
            resumedAt,
            currentQuestion: room.gameState.currentQuestion
          });
        }
      }, 1000);

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'resume',
        timestamp: resumedAt,
        countdown,
        gameState: room.gameState
      });

      logger.info(`Game ${gameId} resumed by host via socket`, {
        gameId,
        hostSocketId: socket.id,
        resumedAt
      });

    } catch (error) {
      logger.error('Host resume error:', error);
      socket.emit('host:action:error', { action: 'resume', error: 'Failed to resume game' });
    }
  }

  // Handle skip question request
  handleHostSkipQuestion(socket, data) {
    try {
      const { gameId, reason, showCorrectAnswer = true } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      const currentQuestion = room.gameState?.currentQuestion || 1;
      const nextQuestion = currentQuestion + 1;
      
      // Update game state
      room.gameState = {
        ...room.gameState,
        currentQuestion: nextQuestion,
        skippedQuestions: [...(room.gameState.skippedQuestions || []), currentQuestion]
      };

      // Broadcast to players
      this.io.to(gameId).emit('question:skipped', {
        gameId,
        skippedQuestion: currentQuestion,
        nextQuestion,
        reason: reason || 'host_decision',
        showCorrectAnswer
      });

      // Advance to next question if not last
      if (nextQuestion <= room.totalQuestions) {
        setTimeout(() => {
          this.io.to(gameId).emit('question:next', {
            gameId,
            questionNumber: nextQuestion,
            question: room.questions[nextQuestion - 1]
          });
        }, 2000);
      } else {
        // Game complete
        room.gameState.status = 'completed';
        this.io.to(gameId).emit('game:completed', { gameId });
      }

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'skip_question',
        skippedQuestion: currentQuestion,
        nextQuestion,
        gameState: room.gameState
      });

      logger.info(`Question ${currentQuestion} skipped in game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        questionNumber: currentQuestion,
        reason
      });

    } catch (error) {
      logger.error('Host skip question error:', error);
      socket.emit('host:action:error', { action: 'skip_question', error: 'Failed to skip question' });
    }
  }

  // Handle emergency stop
  handleHostEmergencyStop(socket, data) {
    try {
      const { gameId, reason, saveProgress = true } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      const stoppedAt = new Date().toISOString();
      
      // Update room state
      room.gameState = {
        ...room.gameState,
        status: 'stopped',
        stoppedAt,
        stopReason: reason || 'host_emergency',
        emergencyStop: true
      };

      // Create final leaderboard
      const finalLeaderboard = Object.values(room.players)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map((player, index) => ({
          rank: index + 1,
          playerId: player.id,
          playerName: player.name,
          score: player.score || 0
        }));

      // Broadcast emergency stop
      this.io.to(gameId).emit('game:emergency:stopped', {
        gameId,
        reason: reason || 'host_emergency',
        stoppedAt,
        finalLeaderboard,
        message: 'Game stopped by host due to emergency'
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'emergency_stop',
        stoppedAt,
        finalLeaderboard,
        gameState: room.gameState
      });

      logger.warn(`Emergency stop triggered for game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        reason,
        stoppedAt
      });

    } catch (error) {
      logger.error('Host emergency stop error:', error);
      socket.emit('host:action:error', { action: 'emergency_stop', error: 'Failed to stop game' });
    }
  }

  // Handle kick player request
  handleHostKickPlayer(socket, data) {
    try {
      const { gameId, playerId, reason, banDuration } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      const player = room.players[playerId];
      if (!player) {
        socket.emit('host:action:error', { 
          action: 'kick_player',
          error: 'Player not found' 
        });
        return;
      }

      const kickedAt = new Date().toISOString();
      
      // Track kicked player
      room.kickedPlayers = room.kickedPlayers || {};
      room.kickedPlayers[playerId] = {
        playerId,
        playerName: player.name,
        reason: reason || 'host_decision',
        kickedAt,
        banDuration
      };

      // Remove from active players
      delete room.players[playerId];

      // Notify kicked player
      if (player.socketId) {
        this.io.to(player.socketId).emit('player:kicked', {
          gameId,
          reason: reason || 'host_decision',
          kickedAt,
          banDuration,
          message: 'You have been removed from the game by the host'
        });

        // Remove from room
        const playerSocket = this.io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.leave(gameId);
        }
      }

      // Broadcast to remaining players
      this.io.to(gameId).emit('player:removed', {
        gameId,
        playerId,
        playerName: player.name,
        reason: 'kicked_by_host',
        remainingPlayers: Object.keys(room.players).length
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'kick_player',
        kickedPlayer: {
          playerId,
          playerName: player.name,
          kickedAt,
          reason
        },
        remainingPlayers: Object.keys(room.players).length
      });

      logger.info(`Player ${playerId} kicked from game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        playerId,
        playerName: player.name,
        reason,
        kickedAt
      });

    } catch (error) {
      logger.error('Host kick player error:', error);
      socket.emit('host:action:error', { action: 'kick_player', error: 'Failed to kick player' });
    }
  }

  // Handle host disconnect
  handleHostDisconnect(socket) {
    try {
      // Find room where this socket is the host
      const rooms = RoomManager.getAllRooms();
      for (const [gameId, room] of rooms) {
        if (room.hostSocketId === socket.id) {
          // Mark host as disconnected
          room.hostDisconnected = true;
          room.hostDisconnectedAt = new Date().toISOString();

          // Notify players
          this.io.to(gameId).emit('host:disconnected', {
            gameId,
            message: 'Host has disconnected',
            reconnectionWindow: 300000 // 5 minutes
          });

          logger.warn(`Host disconnected from game ${gameId}`, {
            gameId,
            hostSocketId: socket.id,
            playerCount: Object.keys(room.players).length
          });

          // Set auto-cleanup timer
          setTimeout(() => {
            if (room.hostDisconnected) {
              this.handleHostTimeoutCleanup(gameId, room);
            }
          }, 300000); // 5 minutes
          
          break;
        }
      }
    } catch (error) {
      logger.error('Host disconnect handling error:', error);
    }
  }

  // Helper method to validate host actions
  validateHostAction(socket, room, gameId) {
    if (!room) {
      socket.emit('host:action:error', { error: 'Game room not found' });
      return false;
    }

    if (room.hostSocketId !== socket.id) {
      socket.emit('host:action:error', { error: 'Host permissions required' });
      return false;
    }

    return true;
  }

  // Helper method to get game analytics
  getGameAnalytics(room) {
    const players = Object.values(room.players);
    return {
      totalPlayers: players.length,
      averageScore: players.reduce((sum, p) => sum + (p.score || 0), 0) / players.length || 0,
      questionsCompleted: room.gameState?.currentQuestion || 0,
      questionsSkipped: room.gameState?.skippedQuestions?.length || 0,
      gameStatus: room.gameState?.status || 'waiting'
    };
  }

  // Handle host timeout cleanup
  handleHostTimeoutCleanup(gameId, room) {
    try {
      // Check if game should be auto-ended
      if (room.gameState?.status === 'active' || room.gameState?.status === 'paused') {
        room.gameState.status = 'abandoned';
        room.gameState.abandonedAt = new Date().toISOString();
        room.gameState.abandonReason = 'host_timeout';

        // Notify players
        this.io.to(gameId).emit('game:abandoned', {
          gameId,
          reason: 'host_timeout',
          message: 'Game ended due to host disconnection',
          finalLeaderboard: Object.values(room.players)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((player, index) => ({
              rank: index + 1,
              playerId: player.id,
              playerName: player.name,
              score: player.score || 0
            }))
        });
      }

      // Clean up room after some time
      setTimeout(() => {
        RoomManager.removeRoom(gameId);
      }, 60000); // 1 minute cleanup delay

      logger.info(`Game ${gameId} cleaned up due to host timeout`, {
        gameId,
        cleanupReason: 'host_timeout'
      });

    } catch (error) {
      logger.error('Host timeout cleanup error:', error);
    }
  }
}

module.exports = HostSocketHandlers;
