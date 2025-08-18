require('dotenv').config();
const logger = require('./utils/logger');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const DatabaseManager = require('./config/database');
const SupabaseAuthHelper = require('./utils/SupabaseAuthHelper');
const CleanupScheduler = require('./utils/CleanupScheduler');
const roomManager = require('./utils/RoomManager');
const QuestionService = require('./services/QuestionService');
const QuestionFormatAdapter = require('./adapters/QuestionFormatAdapter');
const GameSettingsService = require('./services/GameSettingsService');
const { calculateGameScore } = require('./utils/scoringSystem');
const { validateStorageConfig } = require('./utils/storageConfig');
const activeGameUpdater = require('./utils/ActiveGameUpdater');
const { createApp } = require('./app');

// Phase 6: Host Socket Handlers
const HostSocketHandlers = require('./sockets/hostHandlers');

// Session Restoration Handlers
const SessionRestoreHandlers = require('./sockets/sessionRestoreHandlers');

// Initialize database
const db = new DatabaseManager();

// Initialize question service
const questionService = new QuestionService();

// Initialize question format adapter
const questionAdapter = new QuestionFormatAdapter();

// Initialize auth helper
const authHelper = new SupabaseAuthHelper(db.supabaseAdmin);

// Initialize cleanup scheduler
const cleanupScheduler = new CleanupScheduler(db);

// Environment detection for logging
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
const isLocalhost = process.env.IS_LOCALHOST === 'true' || !process.env.NODE_ENV;

(async () => {
  try {
    const isConnected = await db.testConnection();
    if (isConnected) {
      logger.info('✅ Database connected successfully');
      
      // Start cleanup scheduler after successful database connection
      cleanupScheduler.start();
    } else {
      logger.error('❌ Database connection failed');
    }
    
    // Validate storage configuration
    logger.debug('\n🔍 Validating storage configuration...');
    const storageValidation = validateStorageConfig();
    
    if (!storageValidation.isValid) {
      logger.error('\n❌ Storage configuration issues detected. Please check your .env file.');
    }
    
  } catch (error) {
    logger.error('❌ Startup validation error:', error);
  }
})();

// Create Express app using the app.js module
const app = createApp({ db, authHelper, cleanupScheduler });

// ================================================================
// SERVER SETUP
// ================================================================

const server = http.createServer(app);

// Socket.IO server with enhanced CORS - Allow network access
const socketAllowedOrigins = [
  process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
  'https://tuiz-nine.vercel.app', // Add your Vercel domain
  /^https:\/\/.*\.vercel\.app$/, // Allow any Vercel preview domains
  /^http:\/\/192\.168\.\d+\.\d+:5173$/, // Allow local network IPs
  /^http:\/\/10\.\d+\.\d+\.\d+:5173$/, // Allow 10.x.x.x network
  /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/ // Allow 172.16-31.x.x network
];

// Only log Socket.IO configuration in development
if (isDevelopment || isLocalhost) {
  logger.debug('🔌 Socket.IO CORS Configuration:');
  logger.debug('  Environment SOCKET_CORS_ORIGIN:', process.env.SOCKET_CORS_ORIGIN || 'Not set');
  logger.debug('  Socket origins include Vercel domain: ✅');
}

const io = new Server(server, {
    cors: {
        origin: socketAllowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    },
});

// Setup function to enable enhanced host handlers for host control games
function setupHostHandlers(socket, gameCode, gameId) {
  if (!socket || !gameCode || !gameId) {
    logger.warn('Invalid parameters for host handlers setup', {
      socket: !!socket,
      gameCode,
      gameId
    });
    return;
  }

  try {
    // Mark socket as host control enabled
    socket.hostControlEnabled = true;
    socket.hostGameId = gameId;
    socket.hostGameCode = gameCode;

    // Setup host control events
    if (hostHandlers && typeof hostHandlers.setupHostSocket === 'function') {
      hostHandlers.setupHostSocket(socket, gameCode, gameId);
    }

    logger.info('Host control handlers enabled', {
      socketId: socket.id,
      gameCode,
      gameId,
      hostId: socket.hostOfGame
    });

  } catch (error) {
    logger.error('Error setting up host control handlers', {
      error: error.message,
      socketId: socket.id,
      gameCode,
      gameId
    });
  }
}

// Export function to get Socket.IO instance
module.exports.getIO = () => io;

// Store active games in memory (you could also use Redis for production)
const activeGames = new Map();

// Initialize the active game updater with the activeGames reference
activeGameUpdater.setActiveGamesRef(activeGames);

// Phase 6: Initialize Host Socket Handlers (after activeGames is defined)
const hostHandlers = new HostSocketHandlers(io, activeGames);

// Helper function to check if question phase is complete and handle transitions
const checkForQuestionCompletion = (gameCode) => {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame || activeGame.status !== 'active') return;
  
  const gameFlowConfig = activeGame.gameFlowConfig || {};
  const gameSettings = activeGame.game_settings || {};
  const currentQuestion = activeGame.questions[activeGame.currentQuestionIndex];
  if (!currentQuestion) return;
  
  // Check if all players have answered
  const allPlayersAnswered = activeGame.currentAnswers.length >= activeGame.players.size;
  
  // If all players answered
  if (allPlayersAnswered) {
    if (isDevelopment || isLocalhost) {
      logger.debug(`📝 All players answered question ${activeGame.currentQuestionIndex + 1} in game ${gameCode}`);
      logger.debug(`🔧 Debug manual mode check: autoAdvance=${gameSettings.autoAdvance}, type=${typeof gameSettings.autoAdvance}`);
    }
    
    // In manual mode, wait for host to advance regardless of explanation settings
    if (gameSettings.autoAdvance === false) {
      if (isDevelopment || isLocalhost) {
        logger.debug(`⏸️ Manual mode: All players answered, waiting for host to advance question ${activeGame.currentQuestionIndex + 1}`);
      }
      // Don't show explanation or leaderboard automatically, wait for host
      return;
    }
    
    if (isDevelopment || isLocalhost) {
      logger.debug(`🚀 Auto mode detected (autoAdvance=${gameSettings.autoAdvance}), proceeding with explanation logic`);
    }
    
    // Auto mode: Show immediate answer feedback first
    setTimeout(async () => {
      // Debug the explanation check - only in development
      if (isDevelopment || isLocalhost) {
        logger.debug(`🔍 Checking explanation for question ${activeGame.currentQuestionIndex + 1}:
        gameSettings.showExplanations: ${gameSettings.showExplanations}
        gameSettings.hybridMode: ${gameSettings.hybridMode}
        question.explanation_title: ${currentQuestion.explanation_title}
        question.explanation_text: ${currentQuestion.explanation_text}
        question.explanation_image_url: ${currentQuestion.explanation_image_url}
        question._dbData: ${JSON.stringify(currentQuestion._dbData)}`);
      }
      
      const shouldShowExpl = GameSettingsService.shouldShowExplanation(currentQuestion, gameSettings);
      logger.debug(`🔍 Should show explanation: ${shouldShowExpl}`);
      
      // Check if we should show explanation (only in auto/hybrid modes)
      if (shouldShowExpl) {
        if (isDevelopment || isLocalhost) {
          logger.debug(`💡 Showing explanation for question ${activeGame.currentQuestionIndex + 1}`);
        }
        showQuestionExplanation(gameCode);
      } else if (gameSettings.showLeaderboard) {
        if (isDevelopment || isLocalhost) {
          logger.debug(`🏆 Showing intermediate leaderboard after question ${activeGame.currentQuestionIndex + 1}`);
        }
        showIntermediateLeaderboard(gameCode);
      } else {
        // No explanation or leaderboard, proceed to next question
        setTimeout(async () => {
          await proceedToNextQuestion(gameCode);
        }, 2000); // 2 second delay to show final answers
      }
    }, 1000); // 1 second to show answer results
  }
};

// Helper function to show explanation for current question
const showQuestionExplanation = (gameCode) => {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;
  
  const currentQuestion = activeGame.questions[activeGame.currentQuestionIndex];
  const gameSettings = activeGame.game_settings || {};
  
  if (isDevelopment || isLocalhost) {
    logger.debug(`💡 Showing explanation for question ${activeGame.currentQuestionIndex + 1} in game ${gameCode}`);
  }
  
  // Calculate current standings for leaderboard
  const leaderboard = Array.from(activeGame.players.values())
    .map(player => ({
      name: player.name,
      score: player.score || 0,
      streak: player.streak || 0
    }))
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));

  // Prepare explanation data with leaderboard
  const explanationData = {
    questionId: currentQuestion.id,
    questionNumber: activeGame.currentQuestionIndex + 1,
    totalQuestions: activeGame.questions.length,
    correctAnswer: currentQuestion.correctIndex,
    correctOption: currentQuestion.options[currentQuestion.correctIndex],
    
    // Explanation content from database
    explanation: {
      title: currentQuestion._dbData?.explanation_title || currentQuestion.explanation_title,
      text: currentQuestion._dbData?.explanation_text || currentQuestion.explanation_text,
      image_url: currentQuestion._dbData?.explanation_image_url || currentQuestion.explanation_image_url
    },
    
    // Flattened leaderboard data for consistency with showLeaderboard events
    standings: leaderboard,
    isGameOver: (activeGame.currentQuestionIndex + 1) >= activeGame.questions.length,
    isLastQuestion: (activeGame.currentQuestionIndex + 1) >= activeGame.questions.length,
    answerStats: calculateAnswerStatistics(activeGame.currentAnswers, currentQuestion),
    
    // Timing - use explanationTime from settings (converted to ms)
    explanationTime: (gameSettings.explanationTime || 30) * 1000,
    autoAdvance: gameSettings.autoAdvance !== false,
    hybridMode: gameSettings.hybridMode || false  // Include hybrid mode info
  };
  
  // Send explanation with leaderboard to all players immediately
  if (isDevelopment || isLocalhost) {
    logger.debug(`📊 Sending showExplanation to room ${gameCode}`);
    logger.debug(`📊 Active players in room: ${Array.from(activeGame.players.keys())}`);
    logger.debug(`📊 Sockets in room ${gameCode}: ${Array.from(io.sockets.adapter.rooms.get(gameCode) || [])}`);
  }
  
  // Small delay to ensure all reconnected players are properly in the room
  setTimeout(() => {
    io.to(gameCode).emit('showExplanation', explanationData);
    
    if (isDevelopment || isLocalhost) {
      logger.debug(`📊 showExplanation event sent to room ${gameCode}`);
    }
  }, 100); // 100ms delay
  
  // Update game state for reconnection support
  activeGame.showingResults = true;
  activeGame.isTimerRunning = false;
  activeGame.lastExplanationData = explanationData;
  
  // Set explanation timer tracking
  activeGame.explanationStartTime = Date.now();
  activeGame.explanationDuration = explanationData.explanationTime;
  activeGame.explanationEndTime = Date.now() + explanationData.explanationTime;
  
  // Clear question timer if running
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
    activeGame.questionTimer = null;
  }
  
  // Send individual player answer data to each player
  for (const [socketId, player] of activeGame.players) {
    const playerAnswerData = getCurrentPlayerAnswerData(activeGame.currentAnswers, player.name);
    if (playerAnswerData) {
      io.to(socketId).emit('playerAnswerData', {
        questionId: currentQuestion.id,
        ...playerAnswerData
      });
      if (isDevelopment || isLocalhost) {
        logger.debug(`📊 Sent playerAnswerData to ${player.name} (${socketId}) during explanation`);
      }
    } else {
      if (isDevelopment || isLocalhost) {
        logger.warn(`⚠️ No answer data found for player ${player.name} when sending explanation data`);
      }
    }
  }

  // After explanation, proceed to next question (leaderboard already shown during explanation)
  // In hybrid mode, explanations wait for manual host advance
  if (gameSettings.hybridMode) {
    // Hybrid mode: Don't auto-advance after explanations, wait for host
    if (isDevelopment || isLocalhost) {
      logger.debug(`🔄 Hybrid mode: Waiting for host to advance after explanation for question ${activeGame.currentQuestionIndex + 1}`);
    }
  } else if (gameSettings.autoAdvance !== false) {
    // Auto mode: Auto-advance after explanation time
    setTimeout(async () => {
      // Don't show additional leaderboard after explanation since it's already shown during explanation
      if (isDevelopment || isLocalhost) {
        logger.debug(`⏭️ Auto mode: Proceeding to next question after explanation for question ${activeGame.currentQuestionIndex + 1}`);
      }
      await proceedToNextQuestion(gameCode);
    }, explanationData.explanationTime);
    
    if (isDevelopment || isLocalhost) {
      logger.debug(`⏰ Set explanation timer for ${explanationData.explanationTime}ms for question ${activeGame.currentQuestionIndex + 1}`);
    }
  } else {
    // Manual mode: Wait for host to advance
    if (isDevelopment || isLocalhost) {
      logger.debug(`⏸️ Manual mode: Waiting for host to advance after explanation for question ${activeGame.currentQuestionIndex + 1}`);
    }
  }
};

// Helper function to show intermediate leaderboard
const showIntermediateLeaderboard = (gameCode) => {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;
  
  const gameSettings = activeGame.game_settings || {};
  
  if (isDevelopment || isLocalhost) {
    logger.debug(`🏆 Showing intermediate leaderboard for game ${gameCode}`);
  }
  
  // Calculate current standings
  const leaderboard = Array.from(activeGame.players.values())
    .map(player => ({
      name: player.name,
      score: player.score || 0,
      streak: player.streak || 0
    }))
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));
  
  // Get current question for answer data
  const currentQuestion = activeGame.questions[activeGame.currentQuestionIndex];
  
  // Prepare leaderboard data
  const leaderboardData = {
    questionNumber: activeGame.currentQuestionIndex + 1,
    totalQuestions: activeGame.questions.length,
    standings: leaderboard,
    isGameOver: (activeGame.currentQuestionIndex + 1) >= activeGame.questions.length,
    displayTime: (gameSettings.explanationTime || 30) * 1000, // Use explanation time setting
    explanationTime: (gameSettings.explanationTime || 30) * 1000, // Also include for frontend consistency
    autoAdvance: gameSettings.autoAdvance !== false,
    hybridMode: gameSettings.hybridMode || false,  // Include hybrid mode info
    
    // Add answer stats and correct answer for consistency with explanation events
    correctAnswer: currentQuestion.correctIndex,
    correctOption: getCorrectAnswerText(currentQuestion),
    answerStats: calculateAnswerStatistics(activeGame.currentAnswers, currentQuestion)
  };
  
  // Send leaderboard to all players immediately
  io.to(gameCode).emit('showLeaderboard', leaderboardData);
  
  // Update game state for reconnection support
  activeGame.showingResults = true;
  activeGame.isTimerRunning = false;
  activeGame.lastExplanationData = leaderboardData;
  
  // Set leaderboard timer tracking
  activeGame.explanationStartTime = Date.now();
  activeGame.explanationDuration = leaderboardData.explanationTime;
  activeGame.explanationEndTime = Date.now() + leaderboardData.explanationTime;
  
  // Clear question timer if running
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
    activeGame.questionTimer = null;
  }
  
  // Send individual player answer data to each player
  for (const [socketId, player] of activeGame.players) {
    const playerAnswerData = getCurrentPlayerAnswerData(activeGame.currentAnswers, player.name);
    if (playerAnswerData) {
      io.to(socketId).emit('playerAnswerData', {
        questionId: currentQuestion.id,
        ...playerAnswerData
      });
      if (isDevelopment || isLocalhost) {
        logger.debug(`📊 Sent playerAnswerData to ${player.name} (${socketId}) during leaderboard`);
      }
    } else {
      if (isDevelopment || isLocalhost) {
        logger.warn(`⚠️ No answer data found for player ${player.name} when sending leaderboard data`);
      }
    }
  }

  // Auto-advance to next question or end game 
  // In hybrid mode, leaderboards wait for host (like explanations)
  // In manual mode, everything waits for host
  if (gameSettings.hybridMode) {
    // Hybrid mode: Wait for host to advance from leaderboard
    if (isDevelopment || isLocalhost) {
      logger.debug(`🔄 Hybrid mode: Waiting for host to advance after leaderboard for question ${activeGame.currentQuestionIndex + 1}`);
    }
  } else if (gameSettings.autoAdvance !== false) {
    setTimeout(async () => {
      await proceedToNextQuestion(gameCode);
    }, leaderboardData.displayTime);
  } else {
    if (isDevelopment || isLocalhost) {
      logger.debug(`⏸️ Manual advance mode - waiting for host to continue`);
    }
  }
};

// Helper function to get correct answer text
const getCorrectAnswerText = (question) => {
  if (!question.options || !question.correct_answer_index) return null;
  
  const correctIndex = question.correct_answer_index;
  if (correctIndex >= 0 && correctIndex < question.options.length) {
    return question.options[correctIndex];
  }
  
  return null;
};

// Helper function to get current player answer data
const getCurrentPlayerAnswerData = (answers, playerName) => {
  const playerAnswer = answers.find(answer => answer.playerName === playerName);
  if (playerAnswer) {
    return {
      selectedOption: playerAnswer.selectedOption,
      isCorrect: playerAnswer.isCorrect,
      points: playerAnswer.points,
      timeTaken: playerAnswer.timeTaken,
      answeredAt: playerAnswer.answeredAt
    };
  }
  return null;
};

// Helper function to calculate answer statistics
const calculateAnswerStatistics = (answers, question) => {
  const stats = {
    totalAnswers: answers.length,
    correctCount: 0,
    optionCounts: question.options.map(() => 0),
    correctPercentage: 0
  };
  
  answers.forEach(answer => {
    if (answer.isCorrect) stats.correctCount++;
    if (answer.selectedOption >= 0 && answer.selectedOption < stats.optionCounts.length) {
      stats.optionCounts[answer.selectedOption]++;
    }
  });
  
  stats.correctPercentage = stats.totalAnswers > 0 ? 
    Math.round((stats.correctCount / stats.totalAnswers) * 100) : 0;
  
  return stats;
};

// Helper function to proceed to next question
const proceedToNextQuestion = async (gameCode) => {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;
  
  // Prevent double question sending
  if (activeGame.questionInProgress) {
    if (isDevelopment || isLocalhost) {
      logger.debug(`⚠️ Question transition already in progress for game ${gameCode}`);
    }
    return;
  }
  
  activeGame.questionInProgress = true;
  
  if (isDevelopment || isLocalhost) {
    logger.debug(`➡️ Proceeding to next question in game ${gameCode}`);
  }
  
  // Clear previous question timer and reset state
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
    activeGame.questionTimer = null;
  }
  activeGame.showingResults = false;
  activeGame.lastExplanationData = null;
  
  // Move to next question
  activeGame.currentQuestionIndex++;
  
  // Send next question or end game
  await sendNextQuestion(gameCode);
  
  // Reset the flag after sending the question
  setTimeout(() => {
    if (activeGame) {
      activeGame.questionInProgress = false;
    }
  }, 1000); // 1 second buffer
};

// Helper function to send next question
const sendNextQuestion = async (gameCode) => {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;

  const questionIndex = activeGame.currentQuestionIndex;
  const question = activeGame.questions[questionIndex];

  if (!question) {
    // Game over - send final results
    await endGame(gameCode);
    return;
  }

  // Reset answers for new question
  activeGame.currentAnswers = [];
  
  // Update timing and state information for reconnection support
  activeGame.currentQuestion = {
    id: question.id,
    question: question.question,
    options: question.options,
    type: question.type,
    timeLimit: question.timeLimit,
    correctIndex: question.correctIndex,
    _dbData: question._dbData,
    imageUrl: question.image_url
  };
  activeGame.timeRemaining = question.timeLimit;
  activeGame.isTimerRunning = true;
  activeGame.questionStartTime = Date.now();
  activeGame.showingResults = false;

  // Initialize player streaks if needed
  for (const [playerId, player] of activeGame.players) {
    if (!player.hasOwnProperty('streak')) {
      player.streak = 0;
    }
  }

  // Send question to all players and host with game settings applied
  const gameFlowConfig = activeGame.gameFlowConfig || {};
  
  io.to(gameCode).emit('question', {
    id: question.id,
    question: question.question,
    options: question.options,
    type: question.type,
    timeLimit: question.timeLimit, // This now comes from GameSettingsService
    questionNumber: questionIndex + 1,
    totalQuestions: activeGame.questions.length,
    
    // Enhanced settings from GameSettingsService
    showProgress: question.showProgress !== undefined ? question.showProgress : true,
    allowAnswerChange: question.allowAnswerChange !== undefined ? question.allowAnswerChange : false,
    showCorrectAnswer: question.showCorrectAnswer !== undefined ? question.showCorrectAnswer : true,
    
    // Game flow configuration
    autoAdvance: gameFlowConfig.autoAdvance !== undefined ? gameFlowConfig.autoAdvance : true,
    hybridMode: gameFlowConfig.hybridMode || false,  // Include hybrid mode info
    showExplanation: question.showExplanation !== undefined ? question.showExplanation : false,
    explanationTime: question.explanationTime || gameFlowConfig.explanationTime || 30000,
    
    // Image support (preserved from transformation)
    image_url: question.image_url,
    _dbData: question._dbData // Contains explanation data
  });

  if (isDevelopment || isLocalhost) {
    logger.debug(`📋 Sent question ${questionIndex + 1} to game ${gameCode} (${Math.round(question.timeLimit/1000)}s): ${question.question.substring(0, 50)}...`);
  }
  
  // Start timer to track remaining time for reconnection
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
  }
  
  activeGame.questionTimer = setInterval(() => {
    if (activeGame.timeRemaining <= 0) {
      clearInterval(activeGame.questionTimer);
      activeGame.isTimerRunning = false;
      return;
    }
    
    activeGame.timeRemaining -= 1000; // Decrease by 1 second
  }, 1000);
};

// Helper function to update player rankings in database
const updatePlayerRankings = async (activeGame) => {
  if (!activeGame.id || !db) return;

  try {
    // Calculate rankings based on current scores
    const playersArray = Array.from(activeGame.players.values())
      .filter(player => player.playerId) // Only include players with database IDs
      .map(player => ({
        playerId: player.playerId,
        playerName: player.name,
        score: player.score || 0,
        streak: player.streak || 0
      }))
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));

    // Bulk update player rankings
    const updatePromises = playersArray.map(player => 
      db.updateGamePlayer(activeGame.id, player.playerId, {
        current_rank: player.rank
      }).catch(error => {
        logger.error(`❌ Failed to update rank for player ${player.playerName}:`, error);
      })
    );

    await Promise.all(updatePromises);
    
    if (isDevelopment || isLocalhost) {
      logger.debug(`✅ Updated rankings for ${playersArray.length} players in game ${activeGame.id}`);
    }

  } catch (error) {
    logger.error('❌ Error updating player rankings:', error);
  }
};

// Helper function to end game
// Helper function to create individual game results for each player
const createGameResultsForPlayers = async (activeGame, scoreboard) => {
  if (!db || !activeGame.id) return;

  try {
    const gameResultsPromises = Array.from(activeGame.players.values())
      .filter(player => player.dbId) // Only process players with database IDs
      .map(async (player) => {
        try {
          // First verify the player still exists in game_players table
          const { data: playerExists, error: checkError } = await db.supabaseAdmin
            .from('game_players')
            .select('id')
            .eq('id', player.dbId)
            .single();

          if (checkError || !playerExists) {
            logger.warn(`⚠️ Player ${player.name} (${player.dbId}) not found in game_players table, skipping result creation`);
            logger.debug(`Debug info: checkError=${checkError?.message}, playerExists=${!!playerExists}`);
            return { success: false, error: 'Player not found in game_players', playerId: player.id };
          }

          logger.debug(`✅ Verified player ${player.name} exists in game_players table with ID: ${player.dbId}`);

          // Find player's scoreboard entry for rank
          const scoreboardEntry = scoreboard.find(entry => entry.name === player.name);
          const finalRank = scoreboardEntry ? scoreboardEntry.rank : 0;

        // Calculate player statistics
        const totalQuestions = activeGame.totalQuestions || activeGame.questions?.length || 0;
        const totalCorrect = player.correctAnswers || 0;
        const completionPercentage = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100) : 0;
        
        // Calculate average response time (if available)
        const responseTimes = player.responseTimes || [];
        const averageResponseTime = responseTimes.length > 0 
          ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
          : 0;

        // Create game result record
        const gameResultData = {
          game_id: activeGame.id,
          player_id: player.dbId, // Use game_players.id (foreign key reference)
          final_score: player.score || 0,
          final_rank: finalRank,
          total_correct: totalCorrect,
          total_questions: totalQuestions,
          average_response_time: averageResponseTime,
          longest_streak: player.longestStreak || player.streak || 0,
          completion_percentage: Math.round(completionPercentage * 100) / 100 // Round to 2 decimal places
        };

        logger.debug(`🔍 Creating game result for ${player.name}:`, {
          game_id: gameResultData.game_id,
          player_id: gameResultData.player_id,
          player_name: player.name,
          final_score: gameResultData.final_score,
          final_rank: gameResultData.final_rank
        });

      // Insert into database
      const { data, error } = await db.supabaseAdmin
        .from('game_results')
        .insert(gameResultData)
        .select()
        .single();

      if (error) {
        logger.error(`❌ Failed to create game result for player ${player.name}:`, error);
        return { success: false, error, playerId: player.id };
      }

      if (isDevelopment || isLocalhost) {
        logger.database(`✅ Created game result for player ${player.name} (Score: ${player.score}, Rank: ${finalRank})`);
      }

      return { success: true, result: data, playerId: player.id };
      
        } catch (playerError) {
          logger.error(`❌ Error creating result for player ${player.name}:`, playerError);
          return { success: false, error: playerError.message, playerId: player.id };
        }
      });

    const results = await Promise.allSettled(gameResultsPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    if (isDevelopment || isLocalhost) {
      logger.database(`📊 Game results creation summary: ${successful} successful, ${failed} failed`);
    }

    return { successful, failed, results };
  } catch (error) {
    logger.error('❌ Error in createGameResultsForPlayers:', error);
    throw error;
  }
};

const endGame = async (gameCode) => {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;

  // Prevent duplicate endGame calls for the same game
  if (activeGame.status === 'finished' || activeGame._ending) {
    if (isDevelopment || isLocalhost) {
      logger.gameActivity(gameCode, `⚠️ endGame called but already finished/ending`);
    }
    return;
  }

  // Mark game as ending to prevent race conditions
  activeGame._ending = true;

  // Calculate final scoreboard
  const scoreboard = Array.from(activeGame.players.values())
    .map(player => ({
      name: player.name,
      score: player.score || 0,
      streak: player.streak || 0
    }))
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));

  // Update game status
  activeGame.status = 'finished';
  activeGame.ended_at = new Date().toISOString();
  
  // Clean up timers
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
    activeGame.questionTimer = null;
  }
  activeGame.isTimerRunning = false;
  activeGame.showingResults = false;

  // Update database status to 'finished'
  if (activeGame.id && db) {
    try {
      // Update final rankings in database before game ends
      await updatePlayerRankings(activeGame);
      
      const statusResult = await db.updateGameStatus(activeGame.id, 'finished', {
        ended_at: new Date().toISOString(),
        current_players: activeGame.players.size
      });
      
      if (statusResult.success) {
        if (isDevelopment || isLocalhost) {
          logger.database(`✅ Updated database game status to 'finished' for game ${activeGame.id}`);
        }
      } else {
        logger.error(`❌ Failed to update database game status: ${statusResult.error}`);
      }

      // Increment times_played for the question set if this game was based on a question set
      if (activeGame.question_set_id) {
        try {
          const incrementResult = await db.incrementQuestionSetTimesPlayed(activeGame.question_set_id);
          if (incrementResult.success) {
            if (incrementResult.skipped) {
              if (isDevelopment || isLocalhost) {
                logger.database(`⚠️ Skipped times_played increment for question set ${activeGame.question_set_id} (too recent)`);
              }
            } else {
              if (isDevelopment || isLocalhost) {
                logger.database(`✅ Incremented times_played for question set ${activeGame.question_set_id}`);
              }
            }
          } else {
            logger.error(`❌ Failed to increment times_played: ${incrementResult.error}`);
          }
        } catch (incrementError) {
          logger.error('❌ Error incrementing times_played:', incrementError);
        }
      }
    } catch (dbError) {
      logger.error('❌ Database error updating game status:', dbError);
    }
  }

  // Create individual game results for each player
  if (activeGame.id && db) {
    try {
      await createGameResultsForPlayers(activeGame, scoreboard);
    } catch (resultsError) {
      logger.error('❌ Error creating game results:', resultsError);
    }
  }

  // Send game over event
  io.to(gameCode).emit('game_over', { scoreboard });

  // Update last_played_at for the question set
  if (activeGame.question_set_id) {
    try {
      const { error: updateError } = await db.supabaseAdmin
        .from('question_sets')
        .update({ 
          last_played_at: new Date().toISOString()
        })
        .eq('id', activeGame.question_set_id);

      if (updateError) {
        logger.error('❌ Error updating last_played_at:', updateError);
      } else {
        logger.debug('✅ Updated last_played_at for question set:', activeGame.question_set_id);
      }
    } catch (error) {
      logger.error('❌ Error updating last_played_at:', error);
    }
  }

  // Emit game completion event for dashboard updates
  if (activeGame.question_set_id && activeGame.hostId) {
    io.emit('game_completed', { 
      questionSetId: activeGame.question_set_id,
      hostId: activeGame.hostId,
      gameCode: gameCode,
      playerCount: activeGame.players.size
    });
  }

  if (isDevelopment || isLocalhost) {
    logger.gameActivity(gameCode, `ended. Winner: ${scoreboard[0]?.name || 'No players'}`);
  }

  // Clean up the ending flag and optionally remove the game after a delay
  activeGame._ending = false;
  
  // Optional: Remove the game from memory after a delay to prevent memory leaks
  // setTimeout(() => {
  //   activeGames.delete(gameCode);
  //   if (isDevelopment || isLocalhost) {
  //     logger.gameActivity(gameCode, `🗑️ Cleaned up from memory`);
  //   }
  // }, 30000); // Clean up after 30 seconds
};

// ================================================================
// SOCKET.IO EVENT HANDLERS
// ================================================================

io.on('connection', (socket) => {
  if (isDevelopment || isLocalhost) {
    logger.connection(`🔌 New user connected: ${socket.id}`);
  }

  // Initialize session restoration handlers for this socket
  const sessionRestoreHandlers = new SessionRestoreHandlers(io, activeGames, db);

  // Session restoration event handlers
  socket.on('restoreSession', async (sessionData) => {
    await sessionRestoreHandlers.handleSessionRestore(socket, sessionData);
  });

  // Host-specific restoration events (for compatibility)
  socket.on('host:rejoinGame', async (sessionData) => {
    const hostSessionData = { ...sessionData, isHost: true };
    await sessionRestoreHandlers.handleSessionRestore(socket, hostSessionData);
  });

  // Player-specific restoration events (for compatibility)
  socket.on('player:rejoinGame', async (sessionData) => {
    const playerSessionData = { ...sessionData, isHost: false };
    await sessionRestoreHandlers.handleSessionRestore(socket, playerSessionData);
  });

  // Legacy restoration events (for backward compatibility)
  socket.on('requestStateRestoration', async (sessionData) => {
    await sessionRestoreHandlers.handleSessionRestore(socket, sessionData);
  });

  socket.on('requestHostRestoration', async (sessionData) => {
    const hostSessionData = { ...sessionData, isHost: true };
    await sessionRestoreHandlers.handleSessionRestore(socket, hostSessionData);
  });

  socket.on('requestPlayerRestoration', async (sessionData) => {
    const playerSessionData = { ...sessionData, isHost: false };
    await sessionRestoreHandlers.handleSessionRestore(socket, playerSessionData);
  });

  // Additional session restoration helpers
  socket.on('host:requestGameState', ({ gameId, room }) => {
    try {
      const gameCode = room;
      const activeGame = activeGames.get(gameCode);
      
      if (activeGame) {
        const connectedPlayers = Array.from(activeGame.players.values())
          .filter(p => p.isConnected)
          .map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            joinedAt: p.joinedAt || Date.now()
          }));

        socket.emit('host:gameStateUpdate', {
          gameCode,
          gameId: activeGame.gameId,
          status: activeGame.status,
          players: connectedPlayers,
          playerCount: connectedPlayers.length,
          currentQuestionIndex: activeGame.currentQuestionIndex,
          totalQuestions: activeGame.totalQuestions
        });
      } else {
        socket.emit('host:gameNotFound', { gameCode, gameId });
      }
    } catch (error) {
      logger.error('❌ Error getting game state:', error);
      socket.emit('error', { message: 'Failed to get game state' });
    }
  });

  socket.on('player:requestGameState', ({ playerName, room, gameId }) => {
    try {
      const gameCode = room;
      const activeGame = activeGames.get(gameCode);
      
      if (activeGame) {
        // Find player in game
        let playerData = null;
        for (const [playerId, player] of activeGame.players.entries()) {
          if (player.name === playerName) {
            playerData = player;
            break;
          }
        }

        if (playerData) {
          socket.emit('player:gameStateUpdate', {
            gameCode,
            gameId: activeGame.gameId,
            status: activeGame.status,
            playerState: {
              name: playerData.name,
              score: playerData.score,
              isReady: playerData.isReady
            },
            currentQuestionIndex: activeGame.currentQuestionIndex,
            totalQuestions: activeGame.totalQuestions
          });
        } else {
          socket.emit('player:notInGame', { playerName, gameCode });
        }
      } else {
        socket.emit('player:gameNotFound', { gameCode, gameId });
      }
    } catch (error) {
      logger.error('❌ Error getting player game state:', error);
      socket.emit('error', { message: 'Failed to get game state' });
    }
  });

  // Create a new game
  socket.on('createGame', async ({ hostId, questionSetId, settings }) => {
    try {
      if (isDevelopment || isLocalhost) {
        logger.game(`🎮 [BRIDGE] Creating game via Socket (Host Control Integration): Host ${hostId}, QuestionSet ${questionSetId}`);
      }
      
      // Extract actual user ID from hostId (remove the temporary prefix)
      const actualHostId = hostId.includes('host_') ? 
        hostId.split('_')[1] : hostId;
      
      // === HOST CONTROL INTEGRATION BRIDGE ===
      // Use the new host control game creation system internally
      // while maintaining socket compatibility for frontend
      
      // If no manual title provided, fetch from question set along with play_settings
      let gameTitle = settings?.title;
      let questionSetSettings = {};
      
      if (!gameTitle || !settings?.fromQuestionSet) {
        try {
          const { data: questionSet, error: qsError } = await db.supabaseAdmin
            .from('question_sets')
            .select('title, play_settings')
            .eq('id', questionSetId)
            .single();
          
          if (!qsError && questionSet) {
            gameTitle = gameTitle || questionSet.title;
            questionSetSettings = questionSet.play_settings || {};
            
            // Flatten any nested game_settings to prevent duplication
            if (questionSetSettings.game_settings) {
              questionSetSettings = {
                ...questionSetSettings,
                ...questionSetSettings.game_settings
              };
              delete questionSetSettings.game_settings;
            }
            
            if (isDevelopment) {
              logger.debug(`✅ [BRIDGE] Retrieved from database - Title: ${gameTitle}`);
            }
          } else {
            if (isDevelopment) {
              logger.warn(`⚠️ [BRIDGE] Could not fetch question set: ${qsError?.message || 'Not found'}`);
            }
            gameTitle = gameTitle || 'クイズゲーム'; // Default fallback title
          }
        } catch (fetchError) {
          logger.error('❌ [BRIDGE] Error fetching question set:', fetchError);
          gameTitle = gameTitle || 'クイズゲーム'; // Default fallback title
        }
      }

      // Merge question set settings with any manual overrides, prioritizing manual settings
      const gameSettings = { 
        ...questionSetSettings,  // Settings from question set (base)
        ...settings,             // Manual settings (override)
        title: gameTitle         // Always use resolved title
      };
      
      // Enhanced settings for Phase 6 compatibility
      const enhancedGameSettings = {
        // Legacy settings (keep for backwards compatibility)
        maxPlayers: gameSettings.maxPlayers !== undefined ? gameSettings.maxPlayers : 50,
        autoAdvance: gameSettings.autoAdvance !== undefined ? gameSettings.autoAdvance : true,
        showExplanations: gameSettings.showExplanations !== undefined ? gameSettings.showExplanations : true,
        explanationTime: gameSettings.explanationTime !== undefined ? gameSettings.explanationTime : 30,
        showLeaderboard: gameSettings.showLeaderboard !== undefined ? gameSettings.showLeaderboard : true,
        pointCalculation: gameSettings.pointCalculation || 'time-bonus',
        streakBonus: gameSettings.streakBonus !== undefined ? gameSettings.streakBonus : true,
        showProgress: gameSettings.showProgress !== undefined ? gameSettings.showProgress : true,
        showCorrectAnswer: gameSettings.showCorrectAnswer !== undefined ? gameSettings.showCorrectAnswer : true
      };
      
      // Use RoomManager to create the room (legacy compatibility)
      const gameCode = roomManager.createRoom(
        `Host_${actualHostId}`,
        questionSetId,
        enhancedGameSettings
      );
      
      if (!gameCode) {
        throw new Error('Failed to create game room');
      }

      // Create game in database with Phase 6 enhanced structure
      const gameData = {
        host_id: actualHostId,
        question_set_id: questionSetId,
        game_code: gameCode,
        current_players: 0,
        status: 'waiting',
        game_settings: enhancedGameSettings, // Use enhanced settings
        created_at: new Date().toISOString(),
        // Host control metadata
        host_control_enabled: true
      };
      
      if (isDevelopment) {
        logger.debug(`🔄 [BRIDGE] Creating Phase 6 compatible game in database...`);
      }
      const dbResult = await db.createGame(gameData);
      
      if (!dbResult.success) {
        throw new Error(`Database game creation failed: ${dbResult.error}`);
      }
      
      const dbGame = dbResult.game;
      
      // === INITIALIZE RELATED TABLES ===
      try {
        // 1. Create host session tracking
        const hostSessionResult = await db.createHostSession(dbGame.id, actualHostId, {
          game_creation: true,
          session_type: 'game_host',
          initial_settings: enhancedGameSettings,
          question_set_id: questionSetId,
          creation_method: 'dashboard'
        });
        
        if (!hostSessionResult.success) {
          logger.warn(`⚠️ Failed to create host session: ${hostSessionResult.error}`);
        }
        
        // 2. Create initial analytics snapshot
        const analyticsResult = await db.createAnalyticsSnapshot(dbGame.id, 'game_start', null, {
          initial_player_count: 0,
          game_settings: enhancedGameSettings,
          question_set_id: questionSetId,
          created_via: 'dashboard',
          host_id: actualHostId
        });
        
        if (!analyticsResult.success) {
          logger.warn(`⚠️ Failed to create analytics snapshot: ${analyticsResult.error}`);
        }
        
        // 3. Log the game creation action (if log_host_action function exists)
        try {
          await db.supabaseAdmin.rpc('log_host_action', {
            p_game_id: dbGame.id,
            p_host_id: actualHostId,
            p_action_type: 'game_created',
            p_action_data: {
              question_set_id: questionSetId,
              initial_settings: enhancedGameSettings,
              creation_method: 'dashboard'
            }
          });
        } catch (logError) {
          logger.warn(`⚠️ Failed to log host action: ${logError.message}`);
        }
        
        if (isDevelopment) {
          logger.debug(`✅ [INIT] Successfully initialized related tables for game ${dbGame.id}`);
        }
        
      } catch (initError) {
        logger.warn(`⚠️ [INIT] Some initialization steps failed: ${initError.message}`);
        // Don't fail the entire game creation for initialization errors
      }
      if (isDevelopment) {
        logger.debug(`✅ [BRIDGE] Phase 6 game created in database with UUID: ${dbGame.id}`);
      }
      
      // Update the room in RoomManager with the database UUID
      const room = roomManager.getRoom(gameCode);
      if (room) {
        room.gameId = dbGame.id; // Update to use database UUID
        room.gameUUID = dbGame.id; // Keep explicit reference
        room.roomCode = gameCode; // Keep room code reference
        room.hostControlEnabled = true; // Enable host control features
      } else {
        if (isDevelopment) {
          logger.error(`❌ [BRIDGE] Could not find room ${gameCode} in RoomManager to update gameId`);
        }
      }
      
      // Create a memory game object with Phase 6 compatibility
      const game = {
        id: dbGame.id, // Use database UUID as primary ID
        game_code: gameCode,
        host_id: actualHostId,
        question_set_id: questionSetId,
        status: 'waiting',
        current_players: 0,
        game_settings: enhancedGameSettings, // Use enhanced settings
        created_at: dbGame.created_at,
        dbGame: dbGame, // Keep reference to full database object
        // Host control metadata
        host_control_enabled: true
      };
      
      if (isDevelopment) {
        logger.gameActivity(gameCode, `[BRIDGE] Phase 6 compatible game created: ${gameCode} (UUID: ${dbGame.id})`);
      }
      
      // Store in activeGames for backwards compatibility
      activeGames.set(gameCode, {
        ...game,
        players: new Map(),
        host: hostId,
        questions: [],
        currentQuestionIndex: 0,
        currentAnswers: [],
        questionInProgress: false,
        // Host control extensions
        hostControlEnabled: true,
        // Event logging for session restoration
        eventLog: []
      });
      
      // Join the host to the game room
      socket.join(gameCode);
      
      // Assign host role to socket with Phase 6 metadata
      socket.hostOfGame = gameCode;
      socket.hostGameId = dbGame.id;
      socket.hostControlEnabled = true;
      
      // Enable host control handlers for this socket
      if (typeof setupHostHandlers === 'function') {
        setupHostHandlers(socket, gameCode, dbGame.id);
      }
      
      socket.emit('gameCreated', { 
        gameCode, 
        game: {
          ...game,
          // Include Phase 6 capabilities in response
          capabilities: {
            hostControl: true,
            playerManagement: true,
            advancedSettings: true,
            realTimeUpdates: true
          }
        },
        message: 'Host control compatible game created successfully' 
      });
      
      logger.info(`🎮 [BRIDGE] Phase 6 game creation completed successfully`, {
        gameId: dbGame.id,
        gameCode,
        hostId: actualHostId,
        questionSetId,
        hostControlEnabled: true
      });
      
    } catch (error) {
      logger.error('❌ [BRIDGE] Error creating host control game:', error);
      socket.emit('error', { message: 'Failed to create game', error: error.message });
    }
  });

  // Join an existing game
  socket.on('joinGame', async ({ playerName, gameCode, isAuthenticated = false, userId = null }) => {
    try {
      if (isDevelopment) {
        logger.debug(`👤 Join Game Request:
        Player: ${playerName}
        Game Code: ${gameCode}
        Is Authenticated: ${isAuthenticated}
        User ID: ${userId}`);
      }
      
      // Find the active game
      const activeGame = activeGames.get(gameCode);
      
      if (!activeGame) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      if (activeGame.status !== 'waiting') {
        socket.emit('error', { message: 'Game has already started' });
        return;
      }
      
      // Check for pending players_cap update from room manager
      const room = roomManager.getRoom(gameCode);
      if (room && room._pendingPlayersCap !== undefined) {
        if (isDevelopment) {
          logger.debug(`🔄 Applying pending maxPlayers update: ${activeGame.game_settings?.maxPlayers} → ${room._pendingPlayersCap}`);
        }
        if (!activeGame.game_settings) activeGame.game_settings = {};
        activeGame.game_settings.maxPlayers = room._pendingPlayersCap;
        delete room._pendingPlayersCap; // Clear the pending update
      }
      
      // Get current maxPlayers from game_settings (fallback to 50)
      const maxPlayers = activeGame.game_settings?.maxPlayers || 50;
      
      // Debug logging for game capacity check
      if (isDevelopment) {
        logger.debug(`🔍 Game capacity check - Current players: ${activeGame.players.size}, Max players: ${maxPlayers}, Room pending cap: ${room?._pendingPlayersCap}`);
      }
      
      // Check if game is full
      if (activeGame.players.size >= maxPlayers) {
        if (isDevelopment) {
          logger.debug(`❌ Game ${gameCode} is full: ${activeGame.players.size}/${maxPlayers}`);
        }
        socket.emit('error', { message: 'Game is full' });
        return;
      }
      
      // Create player object for memory storage
      const player = {
        id: socket.id,
        name: playerName,
        userId: userId,
        isAuthenticated: isAuthenticated,
        score: 0,
        streak: 0,
        correctAnswers: 0,        // Track number of correct answers
        responseTimes: [],        // Track response times for average calculation
        longestStreak: 0,         // Track longest streak achieved
        isConnected: true,
        joinedAt: new Date().toISOString()
      };
      
      // Add player to database if game exists in database
      let dbGamePlayer = null;
      let playerUUID = null;
      
      if (activeGame.id && db) {
        try {
          // Use the database UUID directly (no need to look up again)
          const gameUUID = activeGame.id;
          if (isDevelopment) {
            logger.debug(`🔄 Adding player to database game ${gameUUID}...`);
          }
          
          const playerData = {
            name: playerName,
            user_id: isAuthenticated ? userId : null,
            is_host: isAuthenticated && userId === activeGame.host_id // Check if this user is the host
          };
          
          if (playerData.is_host) {
            if (isDevelopment) {
              logger.debug(`👑 Host ${playerName} is joining their own game`);
            }
          }
          
          const result = await db.addPlayerToGame(gameUUID, playerData);
          
          if (result.success) {
            dbGamePlayer = result.gamePlayer;
            playerUUID = dbGamePlayer.player_id;
            
            if (isDevelopment || isLocalhost) {
              logger.debug(`✅ Player ${playerName} added to database:
              - Game ID: ${gameUUID}
              - Player UUID: ${playerUUID}
              - Type: ${dbGamePlayer.is_guest ? 'Guest' : 'User'}
              - Is Host: ${dbGamePlayer.is_host ? 'Yes' : 'No'}
              - Returning Player: ${result.isReturningPlayer}
              - New Player: ${result.isNewPlayer}`);
            }
            
            // Update player object with database info
            player.dbId = dbGamePlayer.id;
            player.playerId = playerUUID;
            player.isGuest = dbGamePlayer.is_guest;
            player.isHost = dbGamePlayer.is_host; // Add host status
            player.isReturningPlayer = result.isReturningPlayer;
            player.previousScore = result.isReturningPlayer ? dbGamePlayer.current_score : 0;
            player.previousRank = result.isReturningPlayer ? dbGamePlayer.current_rank : 0;
            
            // If returning player, restore their previous score
            if (result.isReturningPlayer) {
              player.score = dbGamePlayer.current_score || 0;
              if (isDevelopment || isLocalhost) {
                logger.debug(`♻️ Restored returning player score: ${player.score}`);
              }
            }
            
            // === LOG PLAYER JOIN ACTION ===
            try {
              const actionType = result.isReturningPlayer ? 'rejoined' : 'joined';
              const joinActionResult = await db.createPlayerAction(
                gameUUID, 
                playerUUID, 
                'joined', // Use 'joined' for both new and returning players
                {
                  player_name: playerName,
                  is_returning: result.isReturningPlayer,
                  is_authenticated: isAuthenticated,
                  is_guest: dbGamePlayer.is_guest,
                  is_host: dbGamePlayer.is_host,
                  socket_id: socket.id,
                  user_agent: socket.handshake?.headers?.['user-agent'] || null,
                  ip_address: socket.handshake?.address || null,
                  join_method: 'direct_join'
                },
                result.isReturningPlayer ? 'Player rejoined the game' : 'Player joined the game',
                null, // No performer for join actions
                null  // No duration for join actions
              );
              
              if (joinActionResult.success) {
                if (isDevelopment) {
                  logger.debug(`✅ Logged player join action for ${playerName} (${actionType})`);
                }
              } else {
                logger.warn(`⚠️ Failed to log player join action: ${joinActionResult.error}`);
              }
            } catch (actionError) {
              logger.warn(`⚠️ Error logging player join action:`, actionError);
            }
          } else {
            if (isDevelopment || isLocalhost) {
              logger.warn(`⚠️ Failed to add player to database: ${result.error}`);
            }
          }
        } catch (dbError) {
          if (isDevelopment || isLocalhost) {
            logger.error('❌ Database error while adding player:', dbError);
          }
        }
      }
      
      // Add player to game (memory)
      activeGame.players.set(socket.id, player);
      activeGame.current_players = activeGame.players.size;
      
      // Join socket to game room
      socket.join(gameCode);
      socket.gameCode = gameCode;
      socket.playerName = playerName;
      socket.playerUUID = playerUUID;
      
      const statusMsg = dbGamePlayer ? 
        (player.isReturningPlayer ? 'Rejoined' : 'Joined') : 
        'Joined (Memory Only)';
      
      if (isDevelopment || isLocalhost) {
        logger.debug(`✅ Player ${playerName} ${statusMsg.toLowerCase()} game ${gameCode} 
        - Socket ID: ${socket.id}
        - Player UUID: ${playerUUID || 'None'}
        - Score: ${player.score}`);
      }
      
      // Send current game state to the joining player FIRST
      try {
        socket.emit('joinedGame', {
          gameCode,
          gameId: activeGame.gameId, // Add the UUID for session restoration
          playerCount: activeGame.players.size,
          gameStatus: activeGame.status,
          player: {
            ...player,
            dbRecord: dbGamePlayer ? true : false,
            playerUUID: playerUUID,
            isHost: player.isHost || false // Include host status
          }
        });
      } catch (emitError) {
        logger.error(`❌ Error sending joinedGame event to ${playerName}:`, emitError);
      }
      
      // Wait a brief moment to ensure the new player's frontend is ready to receive events
      setTimeout(async () => {
        // Now notify all players (including the new one) about the updated player list
        const allPlayers = Array.from(activeGame.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          score: p.score,
          isAuthenticated: p.isAuthenticated,
          isHost: p.isHost || false,
          isConnected: p.isConnected
        })).filter(p => p.isConnected);
        
        // Log event for terminal restoration
        if (activeGame.eventLog) {
          activeGame.eventLog.push({
            type: 'join',
            playerName: player.name,
            playerId: player.id,
            time: Date.now(),
            isAuthenticated: player.isAuthenticated,
            isHost: player.isHost || false
          });
          
          // Keep only last 100 events to prevent memory issues
          if (activeGame.eventLog.length > 100) {
            activeGame.eventLog = activeGame.eventLog.slice(-100);
          }
        }
        
        // Emit playerJoined to all clients in the game room (including the host)
        io.to(gameCode).emit('playerJoined', {
          player: {
            id: player.id,
            name: player.name,
            score: player.score,
            isAuthenticated: player.isAuthenticated,
            isHost: player.isHost || false, // Include host status
            isReturningPlayer: player.isReturningPlayer || false
          },
          totalPlayers: activeGame.players.size,
          allPlayers: allPlayers // Include complete player list
        });
        
        // Debug: Log all sockets in the room to verify host is included
        const socketsInRoom = await io.in(gameCode).fetchSockets();
        logger.info(`🔍 Emitting playerJoined to room ${gameCode} with ${socketsInRoom.length} sockets:`);
        socketsInRoom.forEach(s => {
          const isHost = s.isHost || s.hostOfGame === gameCode;
          const hasSessionRestored = s.sessionRestored;
          logger.info(`  - Socket ${s.id}: ${isHost ? 'HOST' : 'player'}, restored: ${hasSessionRestored}, rooms: ${Array.from(s.rooms)}`);
        });
      }, 50); // Small delay to ensure frontend is ready
      
    } catch (error) {
      logger.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game', error: error.message });
    }
  });

  // Get current player list for a game
  socket.on('getPlayerList', ({ gameCode }) => {
    try {
      const activeGame = activeGames.get(gameCode);
      
      if (!activeGame) {
        console.log(`❌ getPlayerList: Game ${gameCode} not found`);
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      console.log(`📋 getPlayerList request for game ${gameCode}`);
      console.log(`👥 Active players in game:`, Array.from(activeGame.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isConnected: p.isConnected
      })));
      
      // Convert players map to array with relevant info
      const players = Array.from(activeGame.players.values()).map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        isAuthenticated: player.isAuthenticated,
        isHost: player.isHost || false,
        isConnected: player.isConnected
      })).filter(player => player.isConnected); // Only send connected players
      
      console.log(`📤 Sending player list:`, players);
      socket.emit('playerList', { players });
      
    } catch (error) {
      logger.error('Error getting player list:', error);
      socket.emit('error', { message: 'Failed to get player list', error: error.message });
    }
  });

  // Start the game
  socket.on('startGame', async ({ gameCode }) => {
    try {
      if (isDevelopment) {
        logger.debug(`🚀 Start Game Request for: ${gameCode}`);
      }
      
      const activeGame = activeGames.get(gameCode);
      
      if (!activeGame) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Only host can start the game
      if (socket.hostOfGame !== gameCode) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }
      
      if (activeGame.status !== 'waiting') {
        socket.emit('error', { message: 'Game has already started' });
        return;
      }
      
      // Load questions from database using QuestionService
      if (isDevelopment) {
        logger.debug(`📚 Loading questions from database for question set: ${activeGame.question_set_id}`);
      }
      
      const questionResult = await questionService.getQuestionSetForGame(activeGame.question_set_id);
      
      if (!questionResult.success || questionResult.questions.length === 0) {
        logger.error(`❌ Failed to load questions: ${questionResult.error}`);
        socket.emit('error', { 
          message: 'Failed to load questions for this game',
          details: questionResult.error 
        });
        return;
      }
      
      const dbQuestions = questionResult.questions;
      if (isDevelopment) {
        logger.debug(`📝 Successfully loaded ${dbQuestions.length} questions from database`);
      }
      
      // Transform questions using QuestionFormatAdapter
      if (isDevelopment) {
        logger.debug(`🔄 Transforming questions with game settings...`);
      }
      const transformResult = questionAdapter.transformMultipleQuestions(dbQuestions, activeGame.game_settings);
      
      if (!transformResult.success || transformResult.questions.length === 0) {
        logger.error(`❌ Failed to transform questions: ${transformResult.error}`);
        socket.emit('error', { 
          message: 'Failed to process questions for this game',
          details: transformResult.error 
        });
        return;
      }
      
      const questions = transformResult.questions;
      
      if (isDevelopment) {
        logger.debug(`� Transformed ${questions.length} questions to game format`);
      }
      
      // Log question types for debugging
      const questionTypes = questions.map(q => q.type);
      if (isDevelopment) {
        logger.debug(`✅ Successfully transformed ${questions.length} questions to game format`);
      }
      
      // Log transformation summary
      if (transformResult.errors.length > 0) {
        if (isDevelopment) {
          logger.warn(`⚠️ ${transformResult.errors.length} questions had transformation errors:`, 
            transformResult.errors.map(e => `Q${e.index}: ${e.error}`).join(', '));
        }
      }
      
      // Log question types for debugging
      const typeSummary = questionAdapter.getQuestionTypeSummary(questions);
      if (isDevelopment) {
        logger.debug(`📋 Question types: ${Object.entries(typeSummary.types).map(([type, count]) => `${type}(${count})`).join(', ')}`);
      }
      // Validate we have valid questions
      if (questions.length === 0) {
        logger.error('❌ No valid questions after transformation');
        socket.emit('error', { 
          message: 'No valid questions available for this game',
          details: 'All questions failed validation during transformation' 
        });
        return;
      }
      
      // Apply game settings to questions using GameSettingsService
      if (isDevelopment) {
        logger.debug(`🎯 Applying game settings to gameplay...`);
      }
      const settingsResult = GameSettingsService.applySettingsToGame(activeGame.game_settings, questions);
      
      if (!settingsResult.success) {
        logger.error(`❌ Failed to apply game settings: ${settingsResult.error}`);
        if (isDevelopment) {
          logger.warn(`⚠️ Falling back to questions without enhanced settings`);
        }
      }
      
      const finalQuestions = settingsResult.questions;
      const gameFlowConfig = settingsResult.gameFlowConfig;
      
      if (isDevelopment) {
        logger.debug(`🎮 Game flow configured:`, GameSettingsService.getSettingsSummary(settingsResult.gameSettings || activeGame.game_settings));
      }
      
      // Final validation
      if (finalQuestions.length === 0) {
        logger.error('❌ No valid questions after settings application');
        socket.emit('error', { 
          message: 'No valid questions available for this game',
          details: 'All questions failed validation during settings application' 
        });
        return;
      }
      
      // Update game state with enhanced questions and flow config
      activeGame.status = 'active';
      activeGame.questions = finalQuestions;
      activeGame.totalQuestions = finalQuestions.length; // Track total questions for game results
      activeGame.gameFlowConfig = gameFlowConfig;
      activeGame.currentQuestionIndex = 0;
      activeGame.started_at = new Date().toISOString();
      activeGame.hostSocketId = socket.id; // Set the host socket ID for manual advance verification
      
      // Update database status to 'active'
      if (activeGame.id && db) {
        try {
          const statusResult = await db.updateGameStatus(activeGame.id, 'active', {
            started_at: new Date().toISOString(),
            current_players: activeGame.players.size
          });
          
          if (statusResult.success) {
            if (isDevelopment || isLocalhost) {
              logger.database(`✅ Updated database game status to 'active' for game ${activeGame.id}`);
            }
          } else {
            logger.error(`❌ Failed to update database game status: ${statusResult.error}`);
          }
        } catch (dbError) {
          logger.error('❌ Database error updating game status:', dbError);
        }
      }
      
      if (isDevelopment) {
        logger.debug(`✅ Game ${gameCode} started with ${activeGame.players.size} players`);
        logger.debug(`🎮 Game ${gameCode} started by host via socket {
  gameCode: '${gameCode}',
  hostSocketId: '${activeGame.hostSocketId}',
  playerCount: ${activeGame.players.size},
  totalQuestions: ${activeGame.questions.length},
  startedAt: '${activeGame.started_at}'
}`);
      }
      
      // Notify all players that the game has started
      io.to(gameCode).emit('gameStarted', {
        message: 'Game has started!',
        totalQuestions: questions.length,
        playerCount: activeGame.players.size,
        gameSettings: {
          autoAdvance: (settingsResult.gameSettings || activeGame.game_settings).autoAdvance !== false,
          hybridMode: (settingsResult.gameSettings || activeGame.game_settings).hybridMode || false,
          showExplanations: (settingsResult.gameSettings || activeGame.game_settings).showExplanations,
          explanationTime: (settingsResult.gameSettings || activeGame.game_settings).explanationTime
        }
      });
      
      // Send the first question after a short delay
      setTimeout(async () => {
        await sendNextQuestion(gameCode);
      }, 3000);
      
    } catch (error) {
      logger.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game', error: error.message });
    }
  });

  // Handle next question request (from host)
  socket.on('next_question', async ({ room }) => {
    if (isDevelopment || isLocalhost) {
      logger.debug(`⏭️ Next question requested for room: ${room}`);
    }
    
    const activeGame = activeGames.get(room);
    if (!activeGame) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Only host can request next question
    if (socket.hostOfGame !== room) {
      socket.emit('error', { message: 'Only the host can advance questions' });
      return;
    }
    
    // Move to next question
    activeGame.currentQuestionIndex++;
    
    if (activeGame.currentQuestionIndex >= activeGame.questions.length) {
      // Game is over
      await endGame(room);
    } else {
      // Send next question
      await sendNextQuestion(room);
    }
  });

  // Handle player answers
  socket.on('answer', async ({ gameCode, questionId, selectedOption, timeTaken }) => {
    try {
      if (isDevelopment || isLocalhost) {
        logger.debug(`💭 Answer received:
        Game: ${gameCode}
        Player: ${socket.playerName}
        Question: ${questionId}
        Answer: ${selectedOption}
        Time: ${timeTaken}s`);
      }
      
      const activeGame = activeGames.get(gameCode);
      if (!activeGame || activeGame.status !== 'active') {
        socket.emit('error', { message: 'Game not found or not active' });
        return;
      }
      
      const player = activeGame.players.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player not found in game' });
        return;
      }
      
      const currentQuestion = activeGame.questions[activeGame.currentQuestionIndex];
      if (!currentQuestion || currentQuestion.id !== questionId) {
        socket.emit('error', { message: 'Question mismatch' });
        return;
      }
      
      // Check if player already answered this question
      const existingAnswer = activeGame.currentAnswers.find(a => a.playerId === socket.id);
      if (existingAnswer) {
        socket.emit('error', { message: 'You have already answered this question' });
        return;
      }
      
      // Validate the answer
      const isCorrect = selectedOption === currentQuestion.correctIndex;
      
      // Record the answer in the database for detailed analytics
      if (activeGame.id && db && player.dbId) {
        try {
          await db.submitPlayerAnswer({
            player_id: player.dbId,
            game_id: activeGame.id,
            question_id: questionId,
            answer_choice: selectedOption,
            answer_text: currentQuestion.options?.[selectedOption] || null,
            is_correct: isCorrect,
            response_time: timeTaken ? Math.round(timeTaken * 1000) : null // Convert to milliseconds
          });
          
          if (isDevelopment || isLocalhost) {
            logger.debug(`📝 Recorded answer for ${player.name}: ${isCorrect ? 'correct' : 'incorrect'}`);
          }
        } catch (answerError) {
          logger.error(`❌ Failed to record answer for ${player.name}:`, answerError);
        }
      }
      
      // Calculate points using the new advanced scoring system
      const gameFlowConfig = activeGame.gameFlowConfig || {};
      const scoreResult = calculateGameScore({
        question: currentQuestion,
        gameSettings: gameFlowConfig,
        player: player,
        timeTaken: timeTaken,
        isCorrect: isCorrect
      });
      
      const points = scoreResult.points;
      
      if (isCorrect) {
        // Update player streak and score
        player.streak = scoreResult.newStreak;
        player.score += points;
        
        // Track correct answers count
        player.correctAnswers = (player.correctAnswers || 0) + 1;
        
        // Track longest streak achieved
        player.longestStreak = Math.max(player.longestStreak || 0, player.streak);
        
        // Log detailed breakdown for debugging
        if (scoreResult.breakdown && (isDevelopment || isLocalhost)) {
          const breakdown = scoreResult.breakdown;
          logger.debug(`✅ ${player.name}: Correct! Score breakdown:`, {
            base: breakdown.basePoints,
            streak: breakdown.streakBonus,
            time: breakdown.timeBonus,
            total: breakdown.finalScore,
            bonuses: breakdown.bonusesEnabled
          });
        }
      } else {
        // Reset streak on wrong answer
        player.streak = 0;
        if (isDevelopment || isLocalhost) {
          logger.debug(`❌ ${player.name}: Wrong answer - streak reset`);
        }
      }

      // Track response times for average calculation
      if (!player.responseTimes) {
        player.responseTimes = [];
      }
      player.responseTimes.push(timeTaken || 0);
      
      // Update player in database with current stats
      if (activeGame.id && db && player.playerId) {
        try {
          await db.updateGamePlayer(activeGame.id, player.playerId, {
            current_score: player.score,
            current_streak: player.streak,
            // Note: current_rank will be updated after all answers are processed
          });
        } catch (dbError) {
          logger.error(`❌ Failed to update player ${player.name} in database:`, dbError);
        }
      }
      
      // Record the answer
      const answerData = {
        playerId: socket.id,
        playerName: player.name,
        questionId,
        selectedOption,
        isCorrect,
        points,
        timeTaken,
        answeredAt: new Date().toISOString()
      };
      
      activeGame.currentAnswers.push(answerData);
      
      // Send confirmation to player
      socket.emit('answerResult', {
        isCorrect,
        points,
        newScore: player.score,
        streak: player.streak,
        correctAnswer: currentQuestion.correctIndex
      });
      
      // Update all players with current standings
      const playerStandings = Array.from(activeGame.players.values())
        .map(p => ({
          id: p.id,
          name: p.name,
          score: p.score,
          streak: p.streak
        }))
        .sort((a, b) => b.score - a.score);
      
      io.to(gameCode).emit('scoreboard_update', {
        standings: playerStandings,
        answeredCount: activeGame.currentAnswers.length,
        totalPlayers: activeGame.players.size
      });
      
      // Update player rankings in database
      await updatePlayerRankings(activeGame);
      
      // Check if all players have answered or auto-advance conditions are met
      checkForQuestionCompletion(gameCode);
      
    } catch (error) {
      logger.error('Error handling answer:', error);
      socket.emit('error', { message: 'Failed to process answer', error: error.message });
    }
  });

  // Handle question preloading for waiting room
  socket.on('preloadQuestions', async ({ gameCode }) => {
    try {
      if (isDevelopment || isLocalhost) {
        logger.debug(`⏳ Preload request for game: ${gameCode}`);
      }
      
      const activeGame = activeGames.get(gameCode);
      if (!activeGame) {
        socket.emit('error', { message: 'Game not found for preloading' });
        return;
      }
      
      // Get question set ID from active game
      const questionSetId = activeGame.question_set_id;
      if (!questionSetId) {
        socket.emit('error', { message: 'No question set found for this game' });
        return;
      }
      
      if (isDevelopment || isLocalhost) {
        logger.debug(`📚 Preloading questions for question set: ${questionSetId}`);
      }
      
      // Use QuestionService to get preload data
      const preloadResult = await questionService.preloadQuestionsForWaiting(questionSetId);
      
      if (!preloadResult.success) {
        logger.error(`❌ Failed to preload questions: ${preloadResult.error}`);
        socket.emit('preloadError', { message: preloadResult.error });
        return;
      }
      
      if (isDevelopment || isLocalhost) {
        logger.debug(`✅ Sending preload data: ${preloadResult.questions.length} questions, ${preloadResult.imageUrls.length} images`);
      }
      
      // Send preload data to the client
      socket.emit('questionPreload', {
        questions: preloadResult.questions,
        imageUrls: preloadResult.imageUrls,
        totalQuestions: preloadResult.totalQuestions,
        progress: 100 // For now, send all at once
      });
      
    } catch (error) {
      logger.error('❌ Error handling preload request:', error);
      socket.emit('preloadError', { message: 'Failed to preload questions' });
    }
  });

  // Handle host requests for current player list
  socket.on('host:requestPlayerList', ({ room }) => {
    try {
      const gameCode = room;
      const players = sessionRestoreHandlers.getCurrentPlayers(gameCode);
      
      socket.emit('host:playerListUpdate', {
        gameCode,
        players,
        playerCount: players.length
      });
      
      if (isDevelopment || isLocalhost) {
        logger.debug(`📋 Sent player list to host: ${players.length} players in ${gameCode}`);
      }
    } catch (error) {
      logger.error('❌ Error getting player list:', error);
      socket.emit('error', { message: 'Failed to get player list' });
    }
  });

  // Handle host manual advance (for manual/hybrid modes)
  socket.on('host_advance', async ({ gameCode, gameId, reason }) => {
    try {
      if (isDevelopment || isLocalhost) {
        logger.debug(`🎮 Host advance request received: gameCode=${gameCode}, gameId=${gameId}, reason=${reason}, socketId=${socket.id}`);
      }
      
      const activeGame = activeGames.get(gameCode);
      if (!activeGame) {
        logger.error(`❌ Game not found for code: ${gameCode}`);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      if (isDevelopment || isLocalhost) {
        logger.debug(`🔍 Host verification: requestSocket=${socket.id}, gameHostSocket=${activeGame.hostSocketId}`);
      }

      // Verify the socket is the host
      if (activeGame.hostSocketId !== socket.id) {
        logger.error(`❌ Host verification failed: ${socket.id} is not the host (${activeGame.hostSocketId})`);
        socket.emit('error', { message: 'Only the host can advance the game' });
        return;
      }

      if (isDevelopment || isLocalhost) {
        logger.debug(`🎮 Host manually advancing game ${gameCode}, reason: ${reason}`);
      }

      // In manual mode, we need to handle different phases
      const gameSettings = activeGame.game_settings || {};
      const currentPhase = activeGame.showingResults ? 'explanation' : 'question';
      
      if (isDevelopment || isLocalhost) {
        logger.debug(`🎮 Current phase: ${currentPhase}, autoAdvance: ${gameSettings.autoAdvance}, hybridMode: ${gameSettings.hybridMode}`);
      }

      if (currentPhase === 'question') {
        // Host advancing from question phase - show explanation/leaderboard
        const currentQuestion = activeGame.questions[activeGame.currentQuestionIndex];
        const shouldShowExpl = GameSettingsService.shouldShowExplanation(currentQuestion, gameSettings);
        
        if (shouldShowExpl) {
          if (isDevelopment || isLocalhost) {
            logger.debug(`🎮 Host advancing to explanation for question ${activeGame.currentQuestionIndex + 1}`);
          }
          showQuestionExplanation(gameCode);
        } else if (gameSettings.showLeaderboard) {
          if (isDevelopment || isLocalhost) {
            logger.debug(`🎮 Host advancing to leaderboard for question ${activeGame.currentQuestionIndex + 1}`);
          }
          showIntermediateLeaderboard(gameCode);
        } else {
          // No explanation or leaderboard, proceed to next question
          if (isDevelopment || isLocalhost) {
            logger.debug(`🎮 Host advancing to next question (no explanation/leaderboard)`);
          }
          await proceedToNextQuestion(gameCode);
        }
      } else {
        // Host advancing from explanation/leaderboard phase - go to next question
        if (isDevelopment || isLocalhost) {
          logger.debug(`🎮 Host advancing from explanation/leaderboard to next question`);
        }
        await proceedToNextQuestion(gameCode);
      }
      
    } catch (error) {
      logger.error('❌ Error handling host advance:', error);
      socket.emit('error', { message: 'Failed to advance game' });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', async () => {
    if (isDevelopment || isLocalhost) {
      logger.connection(`🔌 User disconnected: ${socket.id}`);
    }
    
    // Handle game cleanup
    if (socket.gameCode) {
      const activeGame = activeGames.get(socket.gameCode);
      if (activeGame) {
        // Mark player as disconnected
        const player = activeGame.players.get(socket.id);
        if (player) {
          player.isConnected = false;
          
          // === LOG PLAYER DISCONNECT ACTION ===
          if (player.playerId && activeGame.id) {
            try {
              const disconnectActionResult = await db.createPlayerAction(
                activeGame.id, 
                player.playerId, 
                'left',
                {
                  player_name: player.name,
                  is_authenticated: player.isAuthenticated,
                  is_guest: player.isGuest,
                  is_host: player.isHost,
                  socket_id: socket.id,
                  disconnect_reason: 'normal_disconnect',
                  session_duration: player.joinedAt ? Date.now() - new Date(player.joinedAt).getTime() : null
                },
                'Player left the game',
                null, // No performer for disconnect actions
                null  // No duration for disconnect actions
              );
              
              if (disconnectActionResult.success) {
                if (isDevelopment) {
                  logger.debug(`✅ Logged player disconnect action for ${player.name}`);
                }
              } else {
                logger.warn(`⚠️ Failed to log player disconnect action: ${disconnectActionResult.error}`);
              }
            } catch (actionError) {
              logger.warn(`⚠️ Error logging player disconnect action:`, actionError);
            }
          }
          
          // Get updated player list (only connected players)
          const connectedPlayers = Array.from(activeGame.players.values())
            .filter(p => p.isConnected)
            .map(p => ({
              id: p.id,
              name: p.name,
              score: p.score,
              isAuthenticated: p.isAuthenticated,
              isHost: p.isHost || false,
              isConnected: p.isConnected
            }));
          
          // Log event for terminal restoration
          if (activeGame.eventLog) {
            activeGame.eventLog.push({
              type: 'left',
              playerName: player.name,
              playerId: socket.id,
              time: Date.now(),
              isAuthenticated: player.isAuthenticated,
              isHost: player.isHost || false
            });
            
            // Keep only last 100 events to prevent memory issues
            if (activeGame.eventLog.length > 100) {
              activeGame.eventLog = activeGame.eventLog.slice(-100);
            }
          }
          
          // Notify other players
          io.to(socket.gameCode).emit('playerDisconnected', {
            playerId: socket.id,
            playerName: player.name,
            remainingPlayers: connectedPlayers.length,
            allPlayers: connectedPlayers // Include updated player list
          });
          
          if (isDevelopment || isLocalhost) {
            logger.debug(`👋 Player ${player.name} disconnected from game ${socket.gameCode}`);
          }
        }
        
        // If host disconnected, you might want to handle that specially
        if (socket.hostOfGame) {
          if (isDevelopment || isLocalhost) {
            logger.debug(`🎮 Host disconnected from game ${socket.hostOfGame}`);
          }
          // Could transfer host to another player or end the game
        }
      }
    }
  });
});

// ================================================================
// SERVER STARTUP
// ================================================================

const PORT = 3001;
const HOST = '0.0.0.0'; // Listen on all network interfaces
server.listen(PORT, HOST, () => {
    logger.showConfig(); // Show logging configuration
    logger.info(`🚀 Server is running on ${HOST}:${PORT}`);
    if (isDevelopment || isLocalhost) {
      logger.debug(`📱 Mobile access: Use your computer's local IP address (e.g., 192.168.1.xxx:${PORT})`);
      logger.debug(`💻 Local access: http://localhost:${PORT}`);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  cleanupScheduler.stop();
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.debug('🛑 SIGINT received, shutting down gracefully...');
  cleanupScheduler.stop();
  server.close(() => {
    logger.debug('✅ Server closed');
    process.exit(0);
  });
});
