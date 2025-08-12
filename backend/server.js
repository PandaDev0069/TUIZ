require('dotenv').config();
const logger = require('./utils/logger');
const express = require('express');
const http = require('http');
const cors = require('cors');
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
const RateLimitMiddleware = require('./middleware/rateLimiter');

// Phase 6: Host Socket Handlers
const HostSocketHandlers = require('./sockets/hostHandlers');

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

// Test database connection and validate storage configuration on startup
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

const app = express();

// Trust proxy for Render platform (fixes X-Forwarded-For header issues)
// Set to 1 to trust only the first proxy (Render's load balancer)
// This is more secure than trusting all proxies (true)
app.set('trust proxy', 1);

// CORS configuration for Supabase - Allow network access
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'https://tuiz-nine.vercel.app', // Add your Vercel domain
  /^https:\/\/.*\.vercel\.app$/, // Allow any Vercel preview domains
  /^http:\/\/192\.168\.\d+\.\d+:5173$/, // Allow local network IPs
  /^http:\/\/10\.\d+\.\d+\.\d+:5173$/, // Allow 10.x.x.x network
  /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/ // Allow 172.16-31.x.x network
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Apply global rate limiting for DDoS protection
app.use('/api/', RateLimitMiddleware.createGlobalLimit());

// Increase payload limits for image uploads and large quiz data
app.use(express.json({ 
  limit: '50mb',
  parameterLimit: 10000
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 10000
}));

// Middleware to handle payload size errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    if (isDevelopment || isLocalhost) {
      logger.error('Bad JSON body:', error.message);
    }
    return res.status(400).json({ 
      error: 'Invalid JSON format',
      message: 'Request body contains invalid JSON' 
    });
  }
  
  if (error.type === 'entity.too.large') {
    if (isDevelopment || isLocalhost) {
      logger.error('Payload too large:', error.message);
    }
    return res.status(413).json({ 
      error: 'Payload too large',
      message: 'Request payload is too large. Please reduce file sizes or split the request.',
      limit: '50MB'
    });
  }
  
  next(error);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const isDbConnected = await db.testConnection();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: isDbConnected ? 'Connected' : 'Disconnected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Error',
      error: error.message
    });
  }
});

// ================================================================
// AUTHENTICATION ROUTES
// ================================================================
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ================================================================
// DEBUG ROUTES (Development Only)
// ================================================================

// Debug endpoint for token verification
app.post('/api/debug/verify-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ 
        error: 'Missing or invalid authorization header',
        expected: 'Authorization: Bearer <token>',
        received: authHeader ? `${authHeader.substring(0, 20)}...` : 'undefined'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Debug token information using Supabase JWT
    let tokenInfo;
    
    try {
      // Decode without verification to inspect token structure
      const decoded = jwt.decode(token, { complete: true });
      
      tokenInfo = {
        header: decoded?.header,
        payload: {
          sub: decoded?.payload?.sub,
          email: decoded?.payload?.email,
          aud: decoded?.payload?.aud,
          exp: decoded?.payload?.exp,
          iat: decoded?.payload?.iat,
          iss: decoded?.payload?.iss,
          role: decoded?.payload?.role
        },
        isExpired: decoded?.payload?.exp ? Date.now() >= decoded.payload.exp * 1000 : false,
        expiresAt: decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null
      };
    } catch (decodeError) {
      tokenInfo = { error: 'Failed to decode token', details: decodeError.message };
    }
    
    // Verify the token with Supabase
    let verificationResult;
    
    try {
      const { data: user, error } = await db.supabaseAdmin.auth.getUser(token);
      
      verificationResult = {
        valid: !error && !!user?.user,
        user: user?.user ? {
          id: user.user.id,
          email: user.user.email,
          name: user.user.user_metadata?.name,
          created_at: user.user.created_at
        } : null,
        error: error?.message
      };
    } catch (verifyError) {
      verificationResult = {
        valid: false,
        error: verifyError.message
      };
    }
    
    res.json({
      tokenInfo,
      verification: verificationResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Debug verification failed',
      details: error.message
    });
  }
});

// Authentication info endpoint
app.get('/api/debug/auth-info', (req, res) => {
  res.json({
    authType: 'Supabase JWT',
    description: 'This application uses Supabase Auth JWT tokens',
    tokenSource: 'Generated by Supabase Auth via /api/auth/login or /api/auth/register endpoints',
    headerFormat: 'Authorization: Bearer <supabase_jwt_token>',
    supabaseConfigured: {
      hasUrl: !!process.env.SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    endpoints: {
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      refresh: 'POST /api/auth/refresh'
    }
  });
});

// Test RLS policies endpoint
app.post('/api/debug/test-rls', async (req, res) => {
  const { getAuthenticatedUser } = require('./helpers/authHelper');
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authorization header required for RLS testing' 
      });
    }
    
    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(authHeader);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    const testResults = {
      user: authenticatedUser,
      tests: {},
      timestamp: new Date().toISOString()
    };
    
    // Test 1: Can read own question sets
    try {
      const { data: ownSets, error: ownSetsError } = await db.supabaseAdmin
        .from('question_sets')
        .select('id, title, user_id')
        .eq('user_id', authenticatedUser.id)
        .limit(5);
      
      testResults.tests.readOwnQuestionSets = {
        success: !ownSetsError,
        count: ownSets?.length || 0,
        error: ownSetsError?.message
      };
    } catch (error) {
      testResults.tests.readOwnQuestionSets = {
        success: false,
        error: error.message
      };
    }
    
    // Test 2: Can read public question sets
    try {
      const { data: publicSets, error: publicSetsError } = await db.supabaseAdmin
        .from('question_sets')
        .select('id, title, is_public')
        .eq('is_public', true)
        .limit(5);
      
      testResults.tests.readPublicQuestionSets = {
        success: !publicSetsError,
        count: publicSets?.length || 0,
        error: publicSetsError?.message
      };
    } catch (error) {
      testResults.tests.readPublicQuestionSets = {
        success: false,
        error: error.message
      };
    }
    
    // Test 3: Try to create a test question set
    try {
      const { data: testSet, error: createError } = await db.supabaseAdmin
        .from('question_sets')
        .insert({
          user_id: authenticatedUser.id,
          title: 'RLS Test Question Set',
          description: 'Testing RLS policies',
          category: 'test',
          is_public: false,
          total_questions: 0
        })
        .select()
        .single();
      
      testResults.tests.createQuestionSet = {
        success: !createError,
        questionSetId: testSet?.id,
        error: createError?.message
      };
      
      // Clean up test data
      if (testSet?.id) {
        await db.supabaseAdmin
          .from('question_sets')
          .delete()
          .eq('id', testSet.id);
      }
    } catch (error) {
      testResults.tests.createQuestionSet = {
        success: false,
        error: error.message
      };
    }
    
    // Test 4: Database connection and service role
    try {
      const { data: dbTest, error: dbError } = await db.supabaseAdmin
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      testResults.tests.databaseConnection = {
        success: !dbError,
        serviceRole: true,
        error: dbError?.message
      };
    } catch (error) {
      testResults.tests.databaseConnection = {
        success: false,
        serviceRole: false,
        error: error.message
      };
    }
    
    res.json(testResults);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================================================
// CLEANUP MANAGEMENT ENDPOINTS
// ================================================================

// Get cleanup status and stats
app.get('/api/cleanup/status', async (req, res) => {
  try {
    const status = cleanupScheduler.getStatus();
    let stats = null;
    let error = null;
    
    // Try to get cleanup stats, but handle gracefully if function doesn't exist
    try {
      const statsResult = await db.getCleanupStats();
      if (statsResult.success) {
        stats = statsResult.stats;
      } else {
        error = statsResult.error;
        logger.warn('⚠️ Cleanup stats function not available:', statsResult.error);
      }
    } catch (statsError) {
      error = 'Cleanup stats function not available in database';
      logger.warn('⚠️ Cleanup stats error:', statsError.message);
    }
    
    res.json({
      scheduler: status,
      stats: stats,
      error: error,
      message: error ? 'Some cleanup features may not be available until database functions are deployed' : null
    });
  } catch (error) {
    logger.error('❌ Cleanup status endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      scheduler: cleanupScheduler ? cleanupScheduler.getStatus() : null
    });
  }
});

// Preview cleanup operations (dry run)
app.get('/api/cleanup/preview', async (req, res) => {
  try {
    const result = await cleanupScheduler.previewCleanup();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run manual cleanup
app.post('/api/cleanup/run', async (req, res) => {
  try {
    const result = await cleanupScheduler.runManualCleanup();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test warnings manually (for debugging)
app.post('/api/cleanup/test-warnings', async (req, res) => {
  try {
    logger.debug('🧪 Testing warning system manually...');
    await cleanupScheduler.checkAndSendWarnings();
    res.json({ success: true, message: 'Warning check completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================================================
// MODULAR API ROUTES
// ================================================================

// Import and use API route modules
const questionSetsRoutes = require('./routes/api/questionSets');
const questionsRoutes = require('./routes/api/questions');
const answersRoutes = require('./routes/api/answers');
const debugRoutes = require('./routes/api/debug');
const gamesRoutes = require('./routes/api/games');
const quizRoutes = require('./routes/api/quiz');
const uploadRoutes = require('./routes/upload');
const playerManagementRoutes = require('./routes/api/playerManagement');
const gameResultsRoutes = require('./routes/api/gameResults');
const gameSettingsRoutes = require('./routes/api/gameSettings');

// Host control routes (Phase 6)
const hostGameControlRoutes = require('./routes/api/host/gameControl');
const hostPlayerManagementRoutes = require('./routes/api/host/playerManagement');

// Mount API routes
app.use('/api/question-sets', questionSetsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/answers', answersRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/player', playerManagementRoutes(db));
app.use('/api/game-results', gameResultsRoutes);
app.use('/api/game-settings', gameSettingsRoutes);

// Host control API routes (Phase 6)
app.use('/api/host/game', hostGameControlRoutes);
app.use('/api/host/player', hostPlayerManagementRoutes);

// Global error handler - must be after all routes
app.use((error, req, res, next) => {
  logger.error('Global error handler:', error.message);
  
  // Handle specific error types
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request payload exceeds the 50MB limit. Please reduce file sizes.',
      limit: '50MB'
    });
  }
  
  if (error.name === 'MulterError') {
    return res.status(400).json({
      error: 'File upload error',
      message: error.message
    });
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

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

// Phase 6: Initialize Host Socket Handlers
const hostHandlers = new HostSocketHandlers(io);

// Export function to get Socket.IO instance
module.exports.getIO = () => io;

// Store active games in memory (you could also use Redis for production)
const activeGames = new Map();

// Initialize the active game updater with the activeGames reference
activeGameUpdater.setActiveGamesRef(activeGames);

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
    }
    
    // Show immediate answer feedback first
    setTimeout(async () => {
      // Debug the explanation check - only in development
      if (isDevelopment || isLocalhost) {
        logger.debug(`🔍 Checking explanation for question ${activeGame.currentQuestionIndex + 1}:
        gameSettings.showExplanations: ${gameSettings.showExplanations}
        question.explanation_title: ${currentQuestion.explanation_title}
        question.explanation_text: ${currentQuestion.explanation_text}
        question.explanation_image_url: ${currentQuestion.explanation_image_url}
        question._dbData: ${JSON.stringify(currentQuestion._dbData)}`);
      }
      
      const shouldShowExpl = GameSettingsService.shouldShowExplanation(currentQuestion, gameSettings);
      logger.debug(`🔍 Should show explanation: ${shouldShowExpl}`);
      
      // Check if we should show explanation
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
    autoAdvance: gameSettings.autoAdvance !== false
  };
  
  // Send explanation with leaderboard to all players immediately
  io.to(gameCode).emit('showExplanation', explanationData);
  
  // Send individual player answer data to each player
  for (const [socketId, player] of activeGame.players) {
    const playerAnswerData = getCurrentPlayerAnswerData(activeGame.currentAnswers, player.name);
    if (playerAnswerData) {
      io.to(socketId).emit('playerAnswerData', {
        questionId: currentQuestion.id,
        ...playerAnswerData
      });
    }
  }
  
  // After explanation, proceed to next question (leaderboard already shown during explanation)
  setTimeout(async () => {
    // Don't show additional leaderboard after explanation since it's already shown during explanation
    if (isDevelopment || isLocalhost) {
      logger.debug(`⏭️ Proceeding to next question after explanation for question ${activeGame.currentQuestionIndex + 1}`);
    }
    await proceedToNextQuestion(gameCode);
  }, explanationData.explanationTime);
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
    
    // Add answer stats and correct answer for consistency with explanation events
    correctAnswer: currentQuestion.correctIndex,
    correctOption: getCorrectAnswerText(currentQuestion),
    answerStats: calculateAnswerStatistics(activeGame.currentAnswers, currentQuestion)
  };
  
  // Send leaderboard to all players immediately
  io.to(gameCode).emit('showLeaderboard', leaderboardData);
  
  // Send individual player answer data to each player
  for (const [socketId, player] of activeGame.players) {
    const playerAnswerData = getCurrentPlayerAnswerData(activeGame.currentAnswers, player.name);
    if (playerAnswerData) {
      io.to(socketId).emit('playerAnswerData', {
        questionId: currentQuestion.id,
        ...playerAnswerData
      });
    }
  }
  
  // Auto-advance to next question or end game (only if autoAdvance is enabled)
  if (gameSettings.autoAdvance !== false) {
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
    showExplanation: question.showExplanation !== undefined ? question.showExplanation : false,
    explanationTime: question.explanationTime || gameFlowConfig.explanationTime || 30000,
    
    // Image support (preserved from transformation)
    image_url: question.image_url,
    _dbData: question._dbData // Contains explanation data
  });

  if (isDevelopment || isLocalhost) {
    logger.debug(`📋 Sent question ${questionIndex + 1} to game ${gameCode} (${Math.round(question.timeLimit/1000)}s): ${question.question.substring(0, 50)}...`);
  }
};

// Helper function to end game
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

  // Update database status to 'finished'
  if (activeGame.id && db) {
    try {
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

  // Send game over event
  io.to(gameCode).emit('game_over', { scoreboard });

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

  // Create a new game
  socket.on('createGame', async ({ hostId, questionSetId, settings }) => {
    try {
      if (isDevelopment || isLocalhost) {
        logger.game(`🎮 Creating game: Host ${hostId}, QuestionSet ${questionSetId}`);
      }
      
      // Extract actual user ID from hostId (remove the temporary prefix)
      const actualHostId = hostId.includes('host_') ? 
        hostId.split('_')[1] : hostId;
      
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
              logger.debug(`✅ Retrieved from database - Title: ${gameTitle}`);
            }
          } else {
            if (isDevelopment) {
              logger.warn(`⚠️ Could not fetch question set: ${qsError?.message || 'Not found'}`);
            }
            gameTitle = gameTitle || 'クイズゲーム'; // Default fallback title
          }
        } catch (fetchError) {
          logger.error('❌ Error fetching question set:', fetchError);
          gameTitle = gameTitle || 'クイズゲーム'; // Default fallback title
        }
      }

      // Merge question set settings with any manual overrides, prioritizing manual settings
      const gameSettings = { 
        ...questionSetSettings,  // Settings from question set (base)
        ...settings,             // Manual settings (override)
        title: gameTitle         // Always use resolved title
      };
      
      // Clean settings - only keep game settings, not metadata
      const cleanGameSettings = {
        // Player Management - preserve question set value if it exists
        maxPlayers: gameSettings.maxPlayers !== undefined ? gameSettings.maxPlayers : 50,
        
        // Game Flow
        autoAdvance: gameSettings.autoAdvance !== undefined ? gameSettings.autoAdvance : true,
        showExplanations: gameSettings.showExplanations !== undefined ? gameSettings.showExplanations : true,
        explanationTime: gameSettings.explanationTime !== undefined ? gameSettings.explanationTime : 30,
        showLeaderboard: gameSettings.showLeaderboard !== undefined ? gameSettings.showLeaderboard : true,
        
        // Scoring
        pointCalculation: gameSettings.pointCalculation || 'fixed',
        streakBonus: gameSettings.streakBonus !== undefined ? gameSettings.streakBonus : false,
        
        // Display Options
        showProgress: gameSettings.showProgress !== undefined ? gameSettings.showProgress : true,
        showCorrectAnswer: gameSettings.showCorrectAnswer !== undefined ? gameSettings.showCorrectAnswer : true,
        
        // Advanced
        spectatorMode: gameSettings.spectatorMode !== undefined ? gameSettings.spectatorMode : true,
        allowAnswerChange: gameSettings.allowAnswerChange !== undefined ? gameSettings.allowAnswerChange : false
      };
      
      // Use RoomManager to create the room
      const gameCode = roomManager.createRoom(
        `Host_${actualHostId}`,
        questionSetId,
        cleanGameSettings
      );
      
      if (!gameCode) {
        throw new Error('Failed to create game room');
      }

      // Create game in database as well for persistence
      const gameData = {
        host_id: actualHostId,
        question_set_id: questionSetId,
        game_code: gameCode,
        current_players: 0,
        status: 'waiting',
        game_settings: cleanGameSettings, // Store only clean settings (includes maxPlayers)
        created_at: new Date().toISOString()
      };
      
      if (isDevelopment) {
        logger.debug(`🔄 Creating game in database...`);
      }
      const dbResult = await db.createGame(gameData);
      
      if (!dbResult.success) {
        throw new Error(`Database game creation failed: ${dbResult.error}`);
      }
      
      const dbGame = dbResult.game;
      if (isDevelopment) {
        logger.debug(`✅ Game created in database with UUID: ${dbGame.id}`);
      }
      
      // Update the room in RoomManager with the database UUID
      const room = roomManager.getRoom(gameCode);
      if (room) {
        room.gameId = dbGame.id; // Update to use database UUID
        room.gameUUID = dbGame.id; // Keep explicit reference
        room.roomCode = gameCode; // Keep room code reference
      } else {
        if (isDevelopment) {
          logger.error(`❌ Could not find room ${gameCode} in RoomManager to update gameId`);
        }
      }
      
      // Create a memory game object with database reference
      const game = {
        id: dbGame.id, // Use database UUID as primary ID
        game_code: gameCode,
        host_id: actualHostId,
        question_set_id: questionSetId,
        status: 'waiting',
        current_players: 0,
        game_settings: cleanGameSettings, // Only use game_settings (includes maxPlayers)
        created_at: dbGame.created_at,
        dbGame: dbGame // Keep reference to full database object
      };
      
      if (isDevelopment) {
        logger.gameActivity(gameCode, `created: ${gameCode} (UUID: ${dbGame.id})`);
      }
      
      // Store in activeGames for backwards compatibility
      activeGames.set(gameCode, {
        ...game,
        players: new Map(),
        host: hostId,
        questions: [],
        currentQuestionIndex: 0,
        currentAnswers: [],
        questionInProgress: false
      });
      
      // Join the host to the game room
      socket.join(gameCode);
      
      // Assign host role to socket
      socket.hostOfGame = gameCode;
      
      socket.emit('gameCreated', { 
        gameCode, 
        game,
        message: 'Game created successfully' 
      });
      
    } catch (error) {
      logger.error('❌ Error creating game:', error);
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
      setTimeout(() => {
        // Now notify all players (including the new one) about the updated player list
        const allPlayers = Array.from(activeGame.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          score: p.score,
          isAuthenticated: p.isAuthenticated,
          isHost: p.isHost || false,
          isConnected: p.isConnected
        })).filter(p => p.isConnected);
        
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
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Convert players map to array with relevant info
      const players = Array.from(activeGame.players.values()).map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        isAuthenticated: player.isAuthenticated,
        isHost: player.isHost || false,
        isConnected: player.isConnected
      })).filter(player => player.isConnected); // Only send connected players
      
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
      activeGame.gameFlowConfig = gameFlowConfig;
      activeGame.currentQuestionIndex = 0;
      activeGame.started_at = new Date().toISOString();
      
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
      }
      
      // Notify all players that the game has started
      io.to(gameCode).emit('gameStarted', {
        message: 'Game has started!',
        totalQuestions: questions.length,
        playerCount: activeGame.players.size
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
  socket.on('answer', ({ gameCode, questionId, selectedOption, timeTaken }) => {
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

  // Handle player disconnection
  socket.on('disconnect', () => {
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
