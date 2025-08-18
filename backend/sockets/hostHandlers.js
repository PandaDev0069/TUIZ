// Socket.IO Host Event Handlers - Backend Implementation
// Phase 6: Complete Missing Backend Infrastructure

const RoomManager = require('../utils/RoomManager');
const logger = require('../utils/logger');
const QuestionFormatAdapter = require('../adapters/QuestionFormatAdapter');
const QuestionService = require('../services/QuestionService');
const GameSettingsService = require('../services/GameSettingsService');

/**
 * Host-specific Socket.IO event handlers
 * Implements real-time host control functionality
 */
class HostSocketHandlers {
  constructor(io, activeGames = null) {
    this.io = io;
    this.activeGames = activeGames;
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.io.on('connection', (socket) => {
      this.setupHostEventHandlers(socket);
    });
  }

  // Setup host socket for specific game (called from server.js)
  setupHostSocket(socket, gameCode, gameId) {
    try {
      if (!socket || !gameCode || !gameId) {
        logger.warn('Invalid parameters for host socket setup', {
          socket: !!socket,
          gameCode,
          gameId
        });
        return;
      }

      // Mark socket as host control enabled
      socket.hostControlEnabled = true;
      socket.hostGameId = gameId;
      socket.hostGameCode = gameCode;

      // Setup additional host-specific event handlers if needed
      // (The main event handlers are already set up in setupHostEventHandlers)

      logger.info('Host socket setup completed', {
        socketId: socket.id,
        gameCode,
        gameId
      });

    } catch (error) {
      logger.error('Host socket setup error:', error);
    }
  }

  setupHostEventHandlers(socket) {
    // Host joins game room with elevated privileges
    socket.on('host:join', (data) => {
      this.handleHostJoin(socket, data);
    });

    // Game start event
    socket.on('startGame', (data) => {
      this.handleStartGame(socket, data);
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

  // Handle game start request
  async handleStartGame(socket, data) {
    try {
      const { gameCode } = data;
      
      if (!gameCode) {
        socket.emit('host:action:error', { 
          action: 'start_game',
          error: 'Game code required' 
        });
        return;
      }

      // Use activeGames instead of RoomManager if available
      const activeGame = this.activeGames ? this.activeGames.get(gameCode) : RoomManager.getRoom(gameCode);
      
      if (!activeGame) {
        socket.emit('host:action:error', { 
          action: 'start_game',
          error: 'Game room not found' 
        });
        return;
      }

      // Validate host permissions
      if (this.activeGames) {
        // For activeGames structure
        if (socket.hostOfGame !== gameCode) {
          socket.emit('host:action:error', { 
            action: 'start_game',
            error: 'Only the host can start the game' 
          });
          return;
        }
      } else {
        // For RoomManager structure
        if (activeGame.hostSocketId !== socket.id) {
          socket.emit('host:action:error', { 
            action: 'start_game',
            error: 'Host permissions required' 
          });
          return;
        }
      }

      if (activeGame.status !== 'waiting') {
        socket.emit('host:action:error', { 
          action: 'start_game',
          error: 'Game must be in waiting state to start' 
        });
        return;
      }

      // Check if there are players
      const playerCount = this.activeGames ? activeGame.players.size : Object.keys(activeGame.players).length;
      if (playerCount === 0) {
        socket.emit('host:action:error', { 
          action: 'start_game',
          error: 'Cannot start game without players' 
        });
        return;
      }

      // Load questions from database if not already loaded
      if (!activeGame.questions || activeGame.questions.length === 0) {
        const questionSetId = this.activeGames ? activeGame.question_set_id : activeGame.questionSetId;
        
        if (!questionSetId) {
          socket.emit('host:action:error', { 
            action: 'start_game',
            error: 'No question set configured for this game' 
          });
          return;
        }

        logger.info(`Loading questions for game ${gameCode} from question set ${questionSetId}`);
        
        const questionService = new QuestionService();
        const questionResult = await questionService.getQuestionSetForGame(questionSetId);
        
        if (!questionResult.success || questionResult.questions.length === 0) {
          logger.error(`Failed to load questions: ${questionResult.error}`);
          socket.emit('host:action:error', { 
            action: 'start_game',
            error: 'Failed to load questions for this game',
            details: questionResult.error 
          });
          return;
        }

        const dbQuestions = questionResult.questions;
        logger.info(`Successfully loaded ${dbQuestions.length} questions from database`);

        // Transform questions using QuestionFormatAdapter
        const questionAdapter = new QuestionFormatAdapter();
        const gameSettings = this.activeGames ? activeGame.game_settings : activeGame.gameSettings;
        const transformResult = questionAdapter.transformMultipleQuestions(dbQuestions, gameSettings);
        
        if (!transformResult.success || transformResult.questions.length === 0) {
          logger.error(`Failed to transform questions: ${transformResult.error}`);
          socket.emit('host:action:error', { 
            action: 'start_game',
            error: 'Failed to process questions for this game',
            details: transformResult.error 
          });
          return;
        }

        const questions = transformResult.questions;
        logger.info(`Transformed ${questions.length} questions to game format`);

        // Apply game settings to questions using GameSettingsService
        const settingsResult = GameSettingsService.applySettingsToGame(gameSettings, questions);
        
        if (!settingsResult.success) {
          logger.error(`Failed to apply game settings: ${settingsResult.error}`);
          logger.warn(`Falling back to questions without enhanced settings`);
        }

        const finalQuestions = settingsResult.questions || questions;
        const gameFlowConfig = settingsResult.gameFlowConfig;

        if (finalQuestions.length === 0) {
          socket.emit('host:action:error', { 
            action: 'start_game',
            error: 'No valid questions available for this game',
            details: 'All questions failed validation' 
          });
          return;
        }

        // Store questions in game
        activeGame.questions = finalQuestions;
        if (gameFlowConfig) {
          activeGame.gameFlowConfig = gameFlowConfig;
        }
      }

      const startedAt = new Date().toISOString();
      
      // Update game state
      activeGame.status = 'active';
      activeGame.started_at = startedAt;
      activeGame.currentQuestionIndex = 0;
      
      if (this.activeGames) {
        // Update current_players for activeGames structure
        activeGame.current_players = activeGame.players.size;
      }

      // Notify all players that the game has started
      this.io.to(gameCode).emit('gameStarted', {
        gameCode,
        message: 'Game has started!',
        totalQuestions: activeGame.questions.length,
        playerCount,
        startedAt
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'start_game',
        gameCode,
        startedAt,
        playerCount,
        totalQuestions: activeGame.questions.length,
        gameState: {
          status: activeGame.status,
          startedAt,
          currentQuestion: 1,
          totalQuestions: activeGame.questions.length
        }
      });

      logger.info(`Game ${gameCode} started by host via socket`, {
        gameCode,
        hostSocketId: socket.id,
        playerCount,
        totalQuestions: activeGame.questions.length,
        startedAt
      });

    } catch (error) {
      logger.error('Host start game error:', error);
      socket.emit('host:action:error', { 
        action: 'start_game', 
        error: 'Failed to start game',
        details: error.message
      });
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

  // Handle timer adjustment request
  handleHostTimerAdjust(socket, data) {
    try {
      const { gameId, adjustment, questionIndex, newTimeLimit } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      if (room.gameState?.status !== 'active') {
        socket.emit('host:action:error', { 
          action: 'timer_adjust',
          error: 'Game must be active to adjust timer' 
        });
        return;
      }

      const adjustedAt = new Date().toISOString();
      
      // Apply timer adjustment
      if (newTimeLimit) {
        // Set specific time limit
        room.gameState.timeRemaining = newTimeLimit;
      } else if (adjustment) {
        // Adjust current time by amount
        room.gameState.timeRemaining = Math.max(0, (room.gameState.timeRemaining || 0) + adjustment);
      }

      // Broadcast timer update to all players
      this.io.to(gameId).emit('timer:adjusted', {
        gameId,
        timeRemaining: room.gameState.timeRemaining,
        adjustment,
        adjustedAt,
        message: `Timer ${adjustment > 0 ? 'extended' : 'reduced'} by host`
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'timer_adjust',
        timeRemaining: room.gameState.timeRemaining,
        adjustment,
        adjustedAt
      });

      logger.info(`Timer adjusted in game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        adjustment,
        newTimeRemaining: room.gameState.timeRemaining,
        adjustedAt
      });

    } catch (error) {
      logger.error('Host timer adjust error:', error);
      socket.emit('host:action:error', { action: 'timer_adjust', error: 'Failed to adjust timer' });
    }
  }

  // Handle timer reset request
  handleHostTimerReset(socket, data) {
    try {
      const { gameId, resetToOriginal = true, newTimeLimit } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      if (room.gameState?.status !== 'active') {
        socket.emit('host:action:error', { 
          action: 'timer_reset',
          error: 'Game must be active to reset timer' 
        });
        return;
      }

      const resetAt = new Date().toISOString();
      const currentQuestion = room.questions?.[room.gameState?.currentQuestion - 1];
      
      // Reset timer to original or specified value
      let newTime;
      if (newTimeLimit) {
        newTime = newTimeLimit;
      } else if (resetToOriginal && currentQuestion?.timeLimit) {
        newTime = currentQuestion.timeLimit;
      } else {
        newTime = 30000; // Default 30 seconds
      }

      room.gameState.timeRemaining = newTime;

      // Broadcast timer reset to all players
      this.io.to(gameId).emit('timer:reset', {
        gameId,
        timeRemaining: newTime,
        resetAt,
        message: 'Timer reset by host'
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'timer_reset',
        timeRemaining: newTime,
        resetAt
      });

      logger.info(`Timer reset in game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        newTimeRemaining: newTime,
        resetAt
      });

    } catch (error) {
      logger.error('Host timer reset error:', error);
      socket.emit('host:action:error', { action: 'timer_reset', error: 'Failed to reset timer' });
    }
  }

  // Handle mute player request
  handleHostMutePlayer(socket, data) {
    try {
      const { gameId, playerId, reason, duration } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      const player = room.players[playerId];
      if (!player) {
        socket.emit('host:action:error', { 
          action: 'mute_player',
          error: 'Player not found' 
        });
        return;
      }

      const mutedAt = new Date().toISOString();
      
      // Track muted player
      room.mutedPlayers = room.mutedPlayers || {};
      room.mutedPlayers[playerId] = {
        mutedAt,
        reason: reason || 'host_decision',
        duration
      };

      // Update player status
      player.isMuted = true;
      player.mutedAt = mutedAt;

      // Notify muted player
      if (player.socketId) {
        this.io.to(player.socketId).emit('player:muted', {
          gameId,
          reason: reason || 'host_decision',
          mutedAt,
          duration,
          message: 'You have been muted by the host'
        });
      }

      // Broadcast to other players (optional)
      socket.broadcast.to(gameId).emit('player:status:updated', {
        gameId,
        playerId,
        playerName: player.name,
        status: 'muted'
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'mute_player',
        mutedPlayer: {
          playerId,
          playerName: player.name,
          mutedAt,
          reason
        }
      });

      // Auto-unmute after duration if specified
      if (duration && duration > 0) {
        setTimeout(() => {
          this.handleHostUnmutePlayer(socket, { gameId, playerId, reason: 'auto_unmute' });
        }, duration);
      }

      logger.info(`Player ${playerId} muted in game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        playerId,
        playerName: player.name,
        reason,
        mutedAt
      });

    } catch (error) {
      logger.error('Host mute player error:', error);
      socket.emit('host:action:error', { action: 'mute_player', error: 'Failed to mute player' });
    }
  }

  // Handle unmute player request
  handleHostUnmutePlayer(socket, data) {
    try {
      const { gameId, playerId, reason } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      const player = room.players[playerId];
      if (!player) {
        socket.emit('host:action:error', { 
          action: 'unmute_player',
          error: 'Player not found' 
        });
        return;
      }

      const unmutedAt = new Date().toISOString();
      
      // Remove from muted players
      if (room.mutedPlayers && room.mutedPlayers[playerId]) {
        delete room.mutedPlayers[playerId];
      }

      // Update player status
      player.isMuted = false;
      player.unmutedAt = unmutedAt;

      // Notify unmuted player
      if (player.socketId) {
        this.io.to(player.socketId).emit('player:unmuted', {
          gameId,
          reason: reason || 'host_decision',
          unmutedAt,
          message: 'You have been unmuted by the host'
        });
      }

      // Broadcast to other players (optional)
      socket.broadcast.to(gameId).emit('player:status:updated', {
        gameId,
        playerId,
        playerName: player.name,
        status: 'active'
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'unmute_player',
        unmutedPlayer: {
          playerId,
          playerName: player.name,
          unmutedAt,
          reason
        }
      });

      logger.info(`Player ${playerId} unmuted in game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        playerId,
        playerName: player.name,
        reason,
        unmutedAt
      });

    } catch (error) {
      logger.error('Host unmute player error:', error);
      socket.emit('host:action:error', { action: 'unmute_player', error: 'Failed to unmute player' });
    }
  }

  // Handle host transfer request
  handleHostTransfer(socket, data) {
    try {
      const { gameId, newHostPlayerId, reason } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      const newHostPlayer = room.players[newHostPlayerId];
      if (!newHostPlayer) {
        socket.emit('host:action:error', { 
          action: 'transfer_host',
          error: 'Target player not found' 
        });
        return;
      }

      const transferredAt = new Date().toISOString();
      
      // Transfer host privileges
      const oldHostSocketId = room.hostSocketId;
      room.hostSocketId = newHostPlayer.socketId;
      room.hostTransferHistory = room.hostTransferHistory || [];
      room.hostTransferHistory.push({
        fromSocketId: oldHostSocketId,
        toPlayerId: newHostPlayerId,
        transferredAt,
        reason: reason || 'host_decision'
      });

      // Notify new host
      if (newHostPlayer.socketId) {
        this.io.to(newHostPlayer.socketId).emit('host:transferred:to:you', {
          gameId,
          transferredAt,
          message: 'You are now the host of this game',
          hostPrivileges: true
        });
      }

      // Notify all players
      this.io.to(gameId).emit('host:transferred', {
        gameId,
        newHostName: newHostPlayer.name,
        transferredAt,
        message: `${newHostPlayer.name} is now the host`
      });

      // Confirm to old host
      socket.emit('host:action:success', {
        action: 'transfer_host',
        newHost: {
          playerId: newHostPlayerId,
          playerName: newHostPlayer.name,
          transferredAt
        }
      });

      logger.info(`Host transferred in game ${gameId}`, {
        gameId,
        oldHostSocketId,
        newHostPlayerId,
        newHostPlayerName: newHostPlayer.name,
        transferredAt
      });

    } catch (error) {
      logger.error('Host transfer error:', error);
      socket.emit('host:action:error', { action: 'transfer_host', error: 'Failed to transfer host' });
    }
  }

  // Handle settings update request
  handleHostSettingsUpdate(socket, data) {
    try {
      const { gameId, settings, applyImmediately = false } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      const updatedAt = new Date().toISOString();
      
      // Update game settings
      room.gameSettings = {
        ...room.gameSettings,
        ...settings,
        updatedAt
      };

      // Apply settings immediately if requested and game is active
      if (applyImmediately && room.gameState?.status === 'active') {
        // Apply settings to current state
        if (settings.timeLimit && room.gameState.timeRemaining) {
          room.gameState.timeRemaining = settings.timeLimit;
        }
      }

      // Broadcast settings update to players
      this.io.to(gameId).emit('game:settings:updated', {
        gameId,
        settings: room.gameSettings,
        updatedAt,
        applyImmediately
      });

      // Confirm to host
      socket.emit('host:action:success', {
        action: 'update_settings',
        settings: room.gameSettings,
        updatedAt
      });

      logger.info(`Game settings updated in ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        settingsKeys: Object.keys(settings),
        updatedAt
      });

    } catch (error) {
      logger.error('Host settings update error:', error);
      socket.emit('host:action:error', { action: 'update_settings', error: 'Failed to update settings' });
    }
  }

  // Handle analytics request
  handleHostAnalyticsRequest(socket, data) {
    try {
      const { gameId, analyticsType = 'all' } = data;
      const room = RoomManager.getRoom(gameId);
      
      if (!this.validateHostAction(socket, room, gameId)) return;

      const analytics = this.getGameAnalytics(room);
      
      // Enhanced analytics based on type
      const enhancedAnalytics = {
        basic: analytics,
        players: Object.values(room.players).map(player => ({
          id: player.id,
          name: player.name,
          score: player.score || 0,
          questionsAnswered: player.questionsAnswered || 0,
          correctAnswers: player.correctAnswers || 0,
          averageResponseTime: player.averageResponseTime || 0,
          joinedAt: player.joinedAt,
          isActive: player.isActive !== false
        })),
        questions: room.questions?.map((q, index) => ({
          questionNumber: index + 1,
          questionText: q.question,
          totalResponses: q.responses?.length || 0,
          correctResponses: q.responses?.filter(r => r.isCorrect).length || 0,
          averageResponseTime: q.averageResponseTime || 0
        })) || [],
        timeline: room.gameTimeline || []
      };

      // Send requested analytics
      const responseData = analyticsType === 'all' 
        ? enhancedAnalytics 
        : enhancedAnalytics[analyticsType] || analytics;

      socket.emit('host:analytics:response', {
        gameId,
        analyticsType,
        data: responseData,
        generatedAt: new Date().toISOString()
      });

      logger.info(`Analytics requested for game ${gameId}`, {
        gameId,
        hostSocketId: socket.id,
        analyticsType
      });

    } catch (error) {
      logger.error('Host analytics request error:', error);
      socket.emit('host:action:error', { action: 'analytics_request', error: 'Failed to get analytics' });
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
      const rooms = RoomManager.getAllRoomsMap();
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
  validateHostAction(socket, gameData, gameCode) {
    if (!gameData) {
      socket.emit('host:action:error', { error: 'Game room not found' });
      return false;
    }

    // Check host permissions based on data structure
    if (this.activeGames) {
      // For activeGames structure
      if (socket.hostOfGame !== gameCode) {
        socket.emit('host:action:error', { error: 'Host permissions required' });
        return false;
      }
    } else {
      // For RoomManager structure
      if (gameData.hostSocketId !== socket.id) {
        socket.emit('host:action:error', { error: 'Host permissions required' });
        return false;
      }
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
