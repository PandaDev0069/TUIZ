require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const DatabaseManager = require('./config/database');
const SupabaseAuthHelper = require('./utils/SupabaseAuthHelper');
const CleanupScheduler = require('./utils/CleanupScheduler');
const { validateStorageConfig } = require('./utils/storageConfig');

// Initialize database
const db = new DatabaseManager();

// Initialize auth helper
const authHelper = new SupabaseAuthHelper(db.supabaseAdmin);

// Initialize cleanup scheduler
const cleanupScheduler = new CleanupScheduler(db);

// Test database connection and validate storage configuration on startup
(async () => {
  try {
    const isConnected = await db.testConnection();
    if (isConnected) {
      console.log('✅ Database connected successfully');
      
      // Start cleanup scheduler after successful database connection
      cleanupScheduler.start();
    } else {
      console.error('❌ Database connection failed');
    }
    
    // Validate storage configuration
    console.log('\n🔍 Validating storage configuration...');
    const storageValidation = validateStorageConfig();
    
    if (!storageValidation.isValid) {
      console.error('\n❌ Storage configuration issues detected. Please check your .env file.');
    }
    
  } catch (error) {
    console.error('❌ Startup validation error:', error);
  }
})();

const app = express();

// CORS configuration for Supabase
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

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
    console.error('Bad JSON body:', error.message);
    return res.status(400).json({ 
      error: 'Invalid JSON format',
      message: 'Request body contains invalid JSON' 
    });
  }
  
  if (error.type === 'entity.too.large') {
    console.error('Payload too large:', error.message);
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
    const stats = await db.getCleanupStats();
    
    res.json({
      scheduler: status,
      stats: stats.success ? stats.stats : null,
      error: stats.success ? null : stats.error
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    console.log('🧪 Testing warning system manually...');
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

// Global error handler - must be after all routes
app.use((error, req, res, next) => {
  console.error('Global error handler:', error.message);
  
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

// Socket.IO server with enhanced CORS
const io = new Server(server, {
    cors: {
        origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    },
});

// Export function to get Socket.IO instance
module.exports.getIO = () => io;

// Store active games in memory (you could also use Redis for production)
const activeGames = new Map();

// Helper function to send next question
const sendNextQuestion = (gameCode) => {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;

  const questionIndex = activeGame.currentQuestionIndex;
  const question = activeGame.questions[questionIndex];

  if (!question) {
    // Game over - send final results
    endGame(gameCode);
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

  // Send question to all players and host
  io.to(gameCode).emit('question', {
    id: question.id,
    question: question.question,
    options: question.options,
    type: question.type,
    timeLimit: question.timeLimit,
    correctIndex: question.correctIndex, // Only needed for host
    questionNumber: questionIndex + 1,
    totalQuestions: activeGame.questions.length
  });

  console.log(`📋 Sent question ${questionIndex + 1} to game ${gameCode}: ${question.question.substring(0, 50)}...`);
};

// Helper function to end game
const endGame = (gameCode) => {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;

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

  // Send game over event
  io.to(gameCode).emit('game_over', { scoreboard });

  console.log(`🏁 Game ${gameCode} ended. Winner: ${scoreboard[0]?.name || 'No players'}`);
};

// ================================================================
// SOCKET.IO EVENT HANDLERS
// ================================================================

io.on('connection', (socket) => {
  console.log(`🔌 New user connected: ${socket.id}`);

  // Create a new game
  socket.on('createGame', async ({ hostId, questionSetId, settings }) => {
    try {
      console.log(`🎮 Create Game Request:
      Host ID: ${hostId}
      Question Set ID: ${questionSetId}
      Settings: ${JSON.stringify(settings)}`);
      
      // Extract actual user ID from hostId (remove the temporary prefix)
      const actualHostId = hostId.includes('host_') ? 
        hostId.split('_')[1] : hostId;
      
      // If no manual title provided, fetch from question set
      let gameTitle = settings?.title;
      if (!gameTitle) {
        try {
          console.log(`📚 Fetching title from question set: ${questionSetId}`);
          const { data: questionSet, error: qsError } = await db.supabaseAdmin
            .from('question_sets')
            .select('title')
            .eq('id', questionSetId)
            .single();
          
          if (!qsError && questionSet) {
            gameTitle = questionSet.title;
            console.log(`✅ Retrieved title from database: ${gameTitle}`);
          } else {
            console.warn(`⚠️ Could not fetch question set title: ${qsError?.message || 'Not found'}`);
            gameTitle = 'クイズゲーム'; // Default fallback title
          }
        } catch (titleError) {
          console.error('❌ Error fetching question set title:', titleError);
          gameTitle = 'クイズゲーム'; // Default fallback title
        }
      }
      
      // Generate a simple game code for players to join
      const gameCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Create game in database first
      const gameData = {
        host_id: actualHostId,
        question_set_id: questionSetId,
        game_code: gameCode,
        players_cap: settings?.maxPlayers || 50,
        current_players: 0,
        status: 'waiting',
        game_settings: { 
          ...settings, 
          title: gameTitle // Use resolved title
        },
        created_at: new Date().toISOString()
      };
      
      console.log(`🔄 Creating game in database...`);
      const dbResult = await db.createGame(gameData);
      
      if (!dbResult.success) {
        throw new Error(`Database game creation failed: ${dbResult.error}`);
      }
      
      const dbGame = dbResult.game;
      console.log(`✅ Game created in database with UUID: ${dbGame.id}`);
      
      // Create a memory game object with database reference
      const game = {
        id: dbGame.id, // Use database UUID as primary ID
        game_code: gameCode,
        host_id: actualHostId,
        question_set_id: questionSetId,
        status: 'waiting',
        players_cap: settings?.maxPlayers || 50,
        current_players: 0,
        game_settings: { 
          ...settings, 
          title: gameTitle // Include resolved title
        },
        created_at: dbGame.created_at,
        dbGame: dbGame // Keep reference to full database object
      };
      
      console.log(`✅ Game created: ${gameCode} (UUID: ${dbGame.id})`);
      
      // Initialize an active game object with database reference
      activeGames.set(gameCode, {
        ...game,
        players: new Map(), // Using Map for better performance
        host: hostId,
        questions: [],
        currentQuestionIndex: 0,
        currentAnswers: []
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
      console.error('❌ Error creating game:', error);
      socket.emit('error', { message: 'Failed to create game', error: error.message });
    }
  });

  // Join an existing game
  socket.on('joinGame', async ({ playerName, gameCode, isAuthenticated = false, userId = null }) => {
    try {
      console.log(`👤 Join Game Request:
      Player: ${playerName}
      Game Code: ${gameCode}
      Is Authenticated: ${isAuthenticated}
      User ID: ${userId}`);
      
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
      
      // Check if game is full
      if (activeGame.players.size >= (activeGame.players_cap || 50)) {
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
          console.log(`🔄 Adding player to database game ${gameUUID}...`);
          
          const playerData = {
            name: playerName,
            user_id: isAuthenticated ? userId : null,
            is_host: isAuthenticated && userId === activeGame.host_id // Check if this user is the host
          };
          
          if (playerData.is_host) {
            console.log(`👑 Host ${playerName} is joining their own game`);
          }
          
          const result = await db.addPlayerToGame(gameUUID, playerData);
          
          if (result.success) {
            dbGamePlayer = result.gamePlayer;
            playerUUID = dbGamePlayer.player_id;
            
            console.log(`✅ Player ${playerName} added to database:
            - Game ID: ${gameUUID}
            - Player UUID: ${playerUUID}
            - Type: ${dbGamePlayer.is_guest ? 'Guest' : 'User'}
            - Is Host: ${dbGamePlayer.is_host ? 'Yes' : 'No'}
            - Returning Player: ${result.isReturningPlayer}
            - New Player: ${result.isNewPlayer}`);
            
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
              console.log(`♻️ Restored returning player score: ${player.score}`);
            }
          } else {
            console.warn(`⚠️ Failed to add player to database: ${result.error}`);
          }
        } catch (dbError) {
          console.error('❌ Database error while adding player:', dbError);
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
      
      console.log(`✅ Player ${playerName} ${statusMsg.toLowerCase()} game ${gameCode} 
      - Socket ID: ${socket.id}
      - Player UUID: ${playerUUID || 'None'}
      - Score: ${player.score}`);
      
      // Notify all players in the game about the new player
      io.to(gameCode).emit('playerJoined', {
        player: {
          id: player.id,
          name: player.name,
          score: player.score,
          isAuthenticated: player.isAuthenticated,
          isHost: player.isHost || false, // Include host status
          isReturningPlayer: player.isReturningPlayer || false
        },
        totalPlayers: activeGame.players.size
      });
      
      // Send current game state to the joining player
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
      
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game', error: error.message });
    }
  });

  // Start the game
  socket.on('startGame', async ({ gameCode }) => {
    try {
      console.log(`🚀 Start Game Request for: ${gameCode}`);
      
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
      
      // For now, create sample questions
      const sampleQuestions = [
        {
          id: 1,
          question: "日本の首都はどこですか？",
          options: ["東京", "大阪", "京都", "名古屋"],
          correctIndex: 0,
          type: "multiple_choice",
          timeLimit: 30
        },
        {
          id: 2,
          question: "富士山の高さは約何メートルですか？",
          options: ["3,776m", "3,500m", "4,000m", "3,200m"],
          correctIndex: 0,
          type: "multiple_choice",
          timeLimit: 30
        }
      ];
      
      // Update game state
      activeGame.status = 'active';
      activeGame.questions = sampleQuestions;
      activeGame.currentQuestionIndex = 0;
      activeGame.started_at = new Date().toISOString();
      
      console.log(`✅ Game ${gameCode} started with ${activeGame.players.size} players`);
      
      // Notify all players that the game has started
      io.to(gameCode).emit('gameStarted', {
        message: 'Game has started!',
        totalQuestions: sampleQuestions.length,
        playerCount: activeGame.players.size
      });
      
      // Send the first question after a short delay
      setTimeout(() => {
        sendNextQuestion(gameCode);
      }, 3000);
      
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game', error: error.message });
    }
  });

  // Handle next question request (from host)
  socket.on('next_question', ({ room }) => {
    console.log(`⏭️ Next question requested for room: ${room}`);
    
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
      endGame(room);
    } else {
      // Send next question
      sendNextQuestion(room);
    }
  });

  // Handle player answers
  socket.on('answer', ({ gameCode, questionId, selectedOption, timeTaken }) => {
    try {
      console.log(`💭 Answer received:
      Game: ${gameCode}
      Player: ${socket.playerName}
      Question: ${questionId}
      Answer: ${selectedOption}
      Time: ${timeTaken}s`);
      
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
      
      // Calculate points (base 1000, reduced by time taken, bonus for streak)
      let points = 0;
      if (isCorrect) {
        const timeBonus = Math.max(0, 1000 - (timeTaken * 10)); // Reduce by 10 points per second
        const streakBonus = player.streak * 100; // 100 points per streak
        points = Math.round(timeBonus + streakBonus);
        
        // Update player streak
        player.streak++;
      } else {
        // Reset streak on wrong answer
        player.streak = 0;
      }
      
      // Update player score
      player.score += points;
      
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
      
      console.log(`${isCorrect ? '✅' : '❌'} ${player.name}: ${isCorrect ? 'Correct' : 'Wrong'} (+${points} points, streak: ${player.streak})`);
      
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
      
    } catch (error) {
      console.error('Error handling answer:', error);
      socket.emit('error', { message: 'Failed to process answer', error: error.message });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    
    // Handle game cleanup
    if (socket.gameCode) {
      const activeGame = activeGames.get(socket.gameCode);
      if (activeGame) {
        // Mark player as disconnected
        const player = activeGame.players.get(socket.id);
        if (player) {
          player.isConnected = false;
          
          // Notify other players
          io.to(socket.gameCode).emit('playerDisconnected', {
            playerId: socket.id,
            playerName: player.name,
            remainingPlayers: Array.from(activeGame.players.values()).filter(p => p.isConnected).length
          });
          
          console.log(`👋 Player ${player.name} disconnected from game ${socket.gameCode}`);
        }
        
        // If host disconnected, you might want to handle that specially
        if (socket.hostOfGame) {
          console.log(`🎮 Host disconnected from game ${socket.hostOfGame}`);
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
    console.log(`🚀 Server is running on ${HOST}:${PORT}`);
    console.log(`📱 Mobile access: Use your computer's local IP address (e.g., 192.168.1.xxx:${PORT})`);
    console.log(`💻 Local access: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  cleanupScheduler.stop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  cleanupScheduler.stop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
