/**
 * Session Restoration Handlers for TUIZ
 * 
 * Handles session restoration for all user types:
 * - Host in lobby (waiting for players)
 * - Host in quiz control (active game)
 * - Players in lobby (waiting for game)
 * - Players in quiz (active game)
 */

const logger = require('../utils/logger');

// Environment detection for debug logging
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
const isLocalhost = process.env.NODE_ENV === 'development' || 
                   process.env.HOSTNAME === 'localhost' || 
                   process.env.HOST === 'localhost';

class SessionRestoreHandlers {
  constructor(io, activeGames, db) {
    this.io = io;
    this.activeGames = activeGames;
    this.db = db;
  }

  /**
   * Main session restoration handler
   * Determines session type and restores appropriate state
   */
  async handleSessionRestore(socket, sessionData) {
    try {
      // Prevent duplicate restorations for the same socket
      if (socket.sessionRestored) {
        logger.warn(`⚠️ Session already restored for socket ${socket.id}, ignoring duplicate request`);
        return;
      }
      
      logger.info(`🔄 Session restoration request from ${socket.id}:`, {
        gameId: sessionData.gameId,
        room: sessionData.room,
        isHost: sessionData.isHost,
        playerName: sessionData.playerName
      });

      // Validate session data
      if (!sessionData.room && !sessionData.gameId) {
        socket.emit('sessionRestoreError', { 
          error: 'Invalid session data - missing room or gameId' 
        });
        return;
      }

      // Mark socket as restored to prevent duplicates
      socket.sessionRestored = true;

      if (sessionData.isHost) {
        await this.restoreHostSession(socket, sessionData);
      } else {
        await this.restorePlayerSession(socket, sessionData);
      }

    } catch (error) {
      logger.error('❌ Error during session restoration:', error);
      socket.emit('sessionRestoreError', { 
        error: 'Session restoration failed',
        details: error.message 
      });
    }
  }

  /**
   * Restore host session (lobby or active game)
   */
  async restoreHostSession(socket, sessionData) {
    const { gameId, room, questionSetId } = sessionData;
    
    // First, check if there's an active game
    let activeGame = null;
    
    // Check by room code first (most common case)
    if (room) {
      activeGame = this.activeGames.get(room);
    }
    
    // If not found by room, check by gameId
    if (!activeGame && gameId) {
      for (const [code, game] of this.activeGames.entries()) {
        if (game.gameId === gameId) {
          activeGame = game;
          break;
        }
      }
    }

    if (activeGame) {
      // Check the actual game status to determine restoration type
      const gameStatus = activeGame.status || 'waiting'; // Default to waiting if no status
      
      logger.info(`🎮 Active game found in memory - Status: ${gameStatus}, Players: ${activeGame.players?.size || 0}`);
      
      if (gameStatus === 'active' || gameStatus === 'in-progress') {
        // Game is actively running
        logger.info(`🎮 Restoring host to ACTIVE game: ${activeGame.gameCode}`);
        await this.restoreHostToActiveGame(socket, activeGame, sessionData);
      } else if (gameStatus === 'completed' || gameStatus === 'finished') {
        // Game is completed
        logger.info(`🏁 Restoring host to COMPLETED game: ${activeGame.gameCode}`);
        await this.restoreHostToCompletedGame(socket, activeGame, sessionData);
      } else {
        // Game is in lobby/waiting state
        logger.info(`🏠 Restoring host to LOBBY: ${activeGame.gameCode} (status: ${gameStatus})`);
        await this.restoreHostToLobby(socket, activeGame, sessionData);
      }
    } else {
      // Check database for game info
      const gameFromDb = await this.getGameFromDatabase(gameId, room);
      
      if (gameFromDb) {
        if (gameFromDb.status === 'active' || gameFromDb.status === 'completed') {
          // Game exists but not in memory - could be completed or server restart
          await this.restoreHostToCompletedGame(socket, gameFromDb, sessionData);
        } else {
          // Game exists in lobby state - restore lobby
          await this.restoreHostToLobby(socket, gameFromDb, sessionData);
        }
      } else {
        // No game found - session expired
        socket.emit('sessionExpired', { 
          message: 'Game session not found or has expired',
          shouldRedirect: '/dashboard'
        });
      }
    }
  }

  /**
   * Restore host to active game (quiz control)
   */
  async restoreHostToActiveGame(socket, activeGame, _sessionData) {
    logger.info(`🎮 Restoring host to active game: ${activeGame.gameCode}`);

    // Set socket properties
    socket.gameCode = activeGame.gameCode;
    socket.hostOfGame = activeGame.gameCode;
    socket.hostGameId = activeGame.gameId;
    socket.isHost = true;

    // Join socket to game room
    socket.join(activeGame.gameCode);

    // Get current game state
    const connectedPlayers = Array.from(activeGame.players.values())
      .filter(p => p.isConnected)
      .map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        currentAnswer: p.currentAnswer,
        isReady: p.isReady,
        responseTime: p.responseTime,
        isAuthenticated: p.isAuthenticated
      }));

    const gameState = {
      gameId: activeGame.gameId,
      gameCode: activeGame.gameCode,
      title: activeGame.title,
      status: activeGame.status,
      currentQuestionIndex: activeGame.currentQuestionIndex,
      totalQuestions: activeGame.totalQuestions,
      timeRemaining: activeGame.timeRemaining,
      isTimerRunning: activeGame.isTimerRunning,
      questionStartTime: activeGame.questionStartTime,
      showingResults: activeGame.showingResults,
      gameStartTime: activeGame.gameStartTime,
      connectedPlayers,
      playerCount: connectedPlayers.length,
      settings: activeGame.settings,
      questionSetId: activeGame.questionSetId
    };

    // Add current question if available
    if (activeGame.currentQuestion) {
      gameState.currentQuestion = {
        id: activeGame.currentQuestion.id,
        question: activeGame.currentQuestion.question,
        options: activeGame.currentQuestion.options,
        type: activeGame.currentQuestion.type,
        timeLimit: activeGame.currentQuestion.timeLimit || activeGame.settings?.timeLimit || 30,
        imageUrl: activeGame.currentQuestion.imageUrl
      };
    }

    // Emit restoration success
    socket.emit('hostSessionRestored', {
      type: 'activeGame',
      gameState,
      message: 'Host session restored to active game'
    });

    logger.info(`✅ Host restored to active game ${activeGame.gameCode} with ${connectedPlayers.length} players`);
  }

  /**
   * Restore host to lobby (waiting for players)
   */
  async restoreHostToLobby(socket, gameData, sessionData) {
    logger.info(`🏠 Restoring host to lobby for game: ${gameData.id || gameData.gameId || sessionData.room}`);

    // Handle both database objects (game_code) and active game objects (gameCode)
    const gameCode = gameData.game_code || gameData.gameCode || sessionData.room;
    const gameId = gameData.id || gameData.gameId || gameData.uuid;
    
    // Set socket properties for lobby
    socket.gameCode = gameCode;
    socket.hostOfGame = gameCode;
    socket.hostGameId = gameId;
    socket.isHost = true;

    // Join socket to game room
    socket.join(gameCode);
    
    // Debug: Verify socket is in room
    logger.info(`🔍 Host socket ${socket.id} joined room ${gameCode}, rooms: ${Array.from(socket.rooms)}`);

    // Check if there's an active game in memory
    const activeGame = this.activeGames.get(gameCode);
    let currentPlayers = [];
    
    if (activeGame) {
      // Get current players from active game
      currentPlayers = Array.from(activeGame.players.values())
        .filter(p => p.isConnected)
        .map(p => ({
          id: p.id,
          name: p.name,
          joinedAt: p.joinedAt || Date.now(),
          score: p.score || 0,
          isAuthenticated: p.isAuthenticated || false
        }));
      
      logger.info(`📋 Found ${currentPlayers.length} active players in game ${gameCode}`);
    }

    // Reconstruct lobby state - handle both database and active game objects
    const lobbyState = {
      gameId: gameId,
      room: gameCode,
      title: gameData.title || gameData.gameName || 'Game',
      questionSetId: gameData.question_set_id || gameData.questionSetId || sessionData.questionSetId,
      status: 'lobby',
      connectedPlayers: currentPlayers,
      playerCount: currentPlayers.length,
      createdAt: gameData.created_at || gameData.createdAt || Date.now(),
      settings: gameData.settings || gameData.gameSettings || {}
    };

    // Emit restoration success
    socket.emit('hostSessionRestored', {
      type: 'lobby',
      lobbyState,
      message: 'Host session restored to lobby'
    });

    // Immediately send current player list
    if (currentPlayers.length > 0) {
      socket.emit('host:playerListUpdate', {
        gameCode,
        players: currentPlayers,
        playerCount: currentPlayers.length
      });
      
      logger.info(`📤 Sent current player list to restored host: ${currentPlayers.length} players`);
    }

    // Send event log for terminal restoration
    if (activeGame && activeGame.eventLog && activeGame.eventLog.length > 0) {
      socket.emit('host:eventLogRestored', {
        gameCode,
        events: activeGame.eventLog
      });
      
      logger.info(`📜 Sent event log to restored host: ${activeGame.eventLog.length} events`);
    }

    logger.info(`✅ Host restored to lobby ${gameCode} with ${currentPlayers.length} players`);
  }

  /**
   * Restore host to completed game view
   */
  async restoreHostToCompletedGame(socket, gameData, _sessionData) {
    logger.info(`🏁 Restoring host to completed game: ${gameData.id}`);

    // Get final results from database
    const results = await this.getGameResults(gameData.id);

    socket.emit('hostSessionRestored', {
      type: 'completed',
      gameData: {
        gameId: gameData.id,
        title: gameData.title,
        status: gameData.status,
        completedAt: gameData.completed_at,
        results
      },
      message: 'Game has been completed'
    });
  }

  /**
   * Restore player session
   */
  async restorePlayerSession(socket, sessionData) {
    const { playerName, room, gameId } = sessionData;
    
    logger.info(`👤 Restoring player session: ${playerName} in room ${room}`);

    // Find active game
    let activeGame = null;
    
    if (room) {
      activeGame = this.activeGames.get(room);
    }
    
    if (!activeGame && gameId) {
      for (const [code, game] of this.activeGames.entries()) {
        if (game.gameId === gameId) {
          activeGame = game;
          break;
        }
      }
    }

    if (activeGame) {
      // Check the actual game status to determine restoration type (same logic as host)
      const gameStatus = activeGame.status || 'waiting'; // Default to waiting if no status
      
      logger.info(`🎮 Active game found for player - Status: ${gameStatus}, Players: ${activeGame.players?.size || 0}`);
      
      if (gameStatus === 'active') {
        // Game is actively running
        logger.info(`🎮 Restoring player to ACTIVE game: ${activeGame.gameCode}`);
        await this.restorePlayerToActiveGame(socket, activeGame, sessionData);
      } else if (gameStatus === 'completed' || gameStatus === 'finished') {
        // Game is completed
        logger.info(`🏁 Restoring player to COMPLETED game: ${activeGame.gameCode}`);
        await this.restorePlayerToCompletedGame(socket, activeGame, sessionData);
      } else {
        // Game is in lobby/waiting state
        logger.info(`🏠 Restoring player to LOBBY: ${activeGame.gameCode} (status: ${gameStatus})`);
        await this.restorePlayerToLobby(socket, activeGame, sessionData);
      }
    } else {
      // Check database for game
      const gameFromDb = await this.getGameFromDatabase(gameId, room);
      
      if (gameFromDb) {
        if (gameFromDb.status === 'completed') {
          await this.restorePlayerToCompletedGame(socket, gameFromDb, sessionData);
        } else {
          // Game in lobby or not started
          await this.restorePlayerToLobby(socket, gameFromDb, sessionData);
        }
      } else {
        socket.emit('sessionExpired', { 
          message: 'Game session not found or has expired',
          shouldRedirect: '/'
        });
      }
    }
  }

  /**
   * Restore player to active game
   */
  async restorePlayerToActiveGame(socket, activeGame, sessionData) {
    const { playerName } = sessionData;
    
    // Debug: log what properties the activeGame has
    if (isDevelopment || isLocalhost) {
      logger.debug(`🔍 ActiveGame properties: id=${activeGame.id} (this is the gameId), gameCode=${activeGame.gameCode}, game_code=${activeGame.game_code}`);
      logger.debug(`🔍 ActiveGame keys: ${Object.keys(activeGame).join(', ')}`);
    }
    
    // Find player in game
    let existingPlayer = null;
    for (const [playerId, player] of activeGame.players.entries()) {
      if (player.name === playerName) {
        existingPlayer = player;
        // Update player's socket ID and connection status
        activeGame.players.delete(playerId);
        player.id = socket.id;
        player.isConnected = true;
        activeGame.players.set(socket.id, player);
        break;
      }
    }

    if (!existingPlayer) {
      // Player not found in game - session mismatch
      socket.emit('sessionExpired', {
        message: 'Player not found in this game',
        shouldRedirect: '/'
      });
      return;
    }

    // Set socket properties
    socket.gameCode = activeGame.gameCode || activeGame.game_code;
    socket.playerName = playerName;
    socket.isPlayer = true;

    // Join game room
    const roomCode = activeGame.gameCode || activeGame.game_code;
    socket.join(roomCode);
    
    if (isDevelopment || isLocalhost) {
      logger.debug(`🔍 Player ${playerName} joined room ${roomCode}, socket rooms: ${Array.from(socket.rooms)}`);
    }

    // Prepare player state
    const playerState = {
      id: socket.id,
      name: playerName,
      score: existingPlayer.score,
      currentAnswer: existingPlayer.currentAnswer,
      isReady: existingPlayer.isReady,
      responseTime: existingPlayer.responseTime,
      gameCode: activeGame.gameCode || activeGame.game_code,
      gameId: activeGame.id // Use 'id' property which contains the actual gameId
    };

    // Prepare game state for player
    const gameState = {
      gameId: activeGame.id, // Use 'id' property which contains the actual gameId
      gameCode: activeGame.gameCode || activeGame.game_code,
      title: activeGame.title,
      status: activeGame.status,
      currentQuestionIndex: activeGame.currentQuestionIndex,
      totalQuestions: activeGame.totalQuestions,
      timeRemaining: activeGame.timeRemaining,
      isTimerRunning: activeGame.isTimerRunning,
      showingResults: activeGame.showingResults,
      playerCount: Array.from(activeGame.players.values()).filter(p => p.isConnected).length
    };

    // Add current question if available
    if (activeGame.currentQuestion) {
      gameState.currentQuestion = {
        id: activeGame.currentQuestion.id,
        question: activeGame.currentQuestion.question,
        options: activeGame.currentQuestion.options,
        type: activeGame.currentQuestion.type,
        timeLimit: activeGame.currentQuestion.timeLimit || activeGame.settings?.timeLimit || 30,
        imageUrl: activeGame.currentQuestion.imageUrl,
        _dbData: activeGame.currentQuestion._dbData // Include _dbData for image URLs and other metadata
      };
    }

    // Notify other players of reconnection
    socket.to(activeGame.gameCode).emit('playerReconnected', {
      player: {
        id: socket.id,
        name: playerName,
        score: existingPlayer.score
      },
      totalPlayers: gameState.playerCount
    });

    // Emit restoration success to player
    socket.emit('playerSessionRestored', {
      type: 'activeGame',
      playerState,
      gameState,
      message: 'Player session restored to active game'
    });

    // If there's a current question and timer is running, immediately send the question
    if (activeGame.currentQuestion && activeGame.isTimerRunning && activeGame.timeRemaining > 0) {
      logger.info(`🎯 Sending current question to reconnected player ${playerName}`);
      
      // Send the current question with proper timing
      socket.emit('question', {
        ...activeGame.currentQuestion,
        timeLimit: activeGame.timeRemaining // Send remaining time
      });
    }

    // If game is showing results, ensure player gets the explanation/leaderboard
    if (activeGame.showingResults && activeGame.lastExplanationData) {
      logger.info(`📊 Sending current explanation/results to reconnected player ${playerName}`);
      logger.debug(`📊 lastExplanationData has explanation: ${!!activeGame.lastExplanationData.explanation}`);
      logger.debug(`📊 lastExplanationData keys: ${Object.keys(activeGame.lastExplanationData)}`);
      
      // Calculate remaining explanation time
      let remainingExplanationTime = 0;
      if (activeGame.explanationEndTime) {
        remainingExplanationTime = Math.max(0, activeGame.explanationEndTime - Date.now());
      }
      
      // Send the explanation or leaderboard that's currently showing
      if (activeGame.lastExplanationData.explanation) {
        const explanationWithTimer = {
          ...activeGame.lastExplanationData,
          remainingTime: remainingExplanationTime // Add remaining time for timer sync
        };
        socket.emit('showExplanation', explanationWithTimer);
        logger.info(`📊 Sent showExplanation to reconnected player ${playerName} with ${remainingExplanationTime}ms remaining`);
      } else {
        const leaderboardWithTimer = {
          ...activeGame.lastExplanationData,
          remainingTime: remainingExplanationTime // Add remaining time for timer sync
        };
        socket.emit('showLeaderboard', leaderboardWithTimer);
        logger.info(`📊 Sent showLeaderboard to reconnected player ${playerName} with ${remainingExplanationTime}ms remaining`);
      }
      
      // Also send individual player answer data if available
      const currentQuestion = activeGame.questions[activeGame.currentQuestionIndex];
      if (currentQuestion && activeGame.currentAnswers) {
        const playerAnswer = activeGame.currentAnswers.find(answer => answer.playerName === playerName);
        if (playerAnswer) {
          socket.emit('playerAnswerData', {
            questionId: currentQuestion.id,
            selectedOption: playerAnswer.selectedOption,
            isCorrect: playerAnswer.isCorrect,
            points: playerAnswer.points,
            timeTaken: playerAnswer.timeTaken,
            answeredAt: playerAnswer.answeredAt
          });
          logger.info(`📊 Sent playerAnswerData to reconnected player ${playerName}`);
        } else {
          logger.warn(`⚠️ No answer found for reconnected player ${playerName} in currentAnswers`);
        }
      }
    }

    logger.info(`✅ Player ${playerName} restored to active game ${activeGame.gameCode}`);
  }

  /**
   * Restore player to lobby
   */
  async restorePlayerToLobby(socket, gameData, sessionData) {
    const { playerName } = sessionData;
    const gameCode = gameData.game_code || sessionData.room;
    
    // Set socket properties for lobby
    socket.gameCode = gameCode;
    socket.playerName = playerName;
    socket.isPlayer = true;

    // Join game room
    socket.join(gameCode);

    // Update player connection status in active game
    const activeGame = this.activeGames.get(gameCode);
    if (activeGame) {
      // Find existing player and update connection status
      let playerFound = false;
      for (const [playerId, player] of activeGame.players) {
        if (player.name === playerName) {
          player.isConnected = true;
          player.socketId = socket.id;
          playerFound = true;
          logger.info(`🔄 Updated existing player ${playerName} connection status to connected`);
          break;
        }
      }
      
      // If player not found in active game, add them
      if (!playerFound) {
        const newPlayer = {
          id: socket.id,
          name: playerName,
          score: 0,
          isAuthenticated: true,
          isHost: false,
          isConnected: true,
          socketId: socket.id
        };
        activeGame.players.set(socket.id, newPlayer);
        logger.info(`➕ Added new player ${playerName} to active game`);
      }
    }

    const lobbyState = {
      gameId: gameData.id,
      room: gameCode,
      title: gameData.title,
      status: 'lobby',
      playerName
    };

    socket.emit('playerSessionRestored', {
      type: 'lobby',
      lobbyState,
      message: 'Player session restored to lobby'
    });

    // Notify host of player reconnection
    socket.to(gameCode).emit('playerReconnected', {
      player: { name: playerName },
      message: `${playerName} has reconnected to the lobby`
    });

    logger.info(`✅ Player ${playerName} restored to lobby ${gameCode}`);
  }

  /**
   * Restore player to completed game results
   */
  async restorePlayerToCompletedGame(socket, gameData, _sessionData) {
    const results = await this.getGameResults(gameData.id);
    
    socket.emit('playerSessionRestored', {
      type: 'completed',
      gameData: {
        gameId: gameData.id,
        title: gameData.title,
        status: gameData.status,
        results
      },
      message: 'Game has been completed'
    });
  }

  /**
   * Helper: Get game from database
   */
  async getGameFromDatabase(gameId, room) {
    try {
      if (gameId) {
        const { data, error } = await this.db.supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        
        if (error) {
          logger.error('Error fetching game by ID:', error);
          return null;
        }
        return data;
      }
      
      if (room) {
        const { data, error } = await this.db.supabase
          .from('games')
          .select('*')
          .eq('game_code', room)
          .single();
        
        if (error) {
          // PGRST116 means no rows found - this is normal, game doesn't exist
          if (error.code === 'PGRST116') {
            logger.debug(`🔍 Game with code ${room} not found in database`);
            return null;
          }
          // Other errors are actual problems
          logger.error('Error fetching game by room code:', error);
          return null;
        }
        return data;
      }
      
      return null;
    } catch (error) {
      logger.error('Database error during game lookup:', error);
      return null;
    }
  }

  /**
   * Helper: Get game results from database
   */
  async getGameResults(gameId) {
    try {
      const { data, error } = await this.db.supabase
        .from('game_results')
        .select('*')
        .eq('game_id', gameId)
        .order('final_score', { ascending: false });
      
      if (error) {
        logger.error('Error fetching game results:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      logger.error('Database error during results lookup:', error);
      return [];
    }
  }

  /**
   * Get current player list for a game room
   */
  getCurrentPlayers(gameCode) {
    const activeGame = this.activeGames.get(gameCode);
    if (!activeGame) return [];

    return Array.from(activeGame.players.values())
      .filter(p => p.isConnected)
      .map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isReady: p.isReady,
        joinedAt: p.joinedAt || Date.now()
      }));
  }
}

module.exports = SessionRestoreHandlers;
