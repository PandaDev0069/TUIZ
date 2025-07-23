require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const DatabaseManager = require('./config/database');

// Initialize database
const db = new DatabaseManager();

const app = express();

// CORS configuration for Supabase
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Authentication routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Supabase Connected'
  });
});

// API routes for question sets
app.get('/api/question-sets/public', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const result = await db.getPublicQuestionSets(parseInt(limit), parseInt(offset));
    
    if (result.success) {
      res.json({ questionSets: result.questionSets });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/question-sets/:id', async (req, res) => {
  try {
    const result = await db.getQuestionSetWithQuestions(req.params.id);
    
    if (result.success) {
      res.json({ questionSet: result.questionSet });
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get game status endpoint
app.get('/api/games/:gameCode/status', async (req, res) => {
  try {
    const { gameCode } = req.params;
    const result = await db.getGameByCode(gameCode);
    
    if (result.success) {
      res.json({ game: result.game });
    } else {
      res.status(404).json({ error: 'Game not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const server = http.createServer(app);

// Socket.IO server with enhanced CORS
const io = new Server(server, {
    cors: {
        origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    },
});

// Store active games in memory (you could also use Redis for production)
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 New user connected: ${socket.id}`);

  // Test database connection
  socket.on('testDB', async () => {
    try {
      const result = await db.getPublicQuestionSets(1, 0);
      socket.emit('dbTestResult', { 
        success: true, 
        message: 'Database connection successful',
        sampleData: result
      });
    } catch (error) {
      socket.emit('dbTestResult', { 
        success: false, 
        error: error.message 
      });
    }
  });

  // Create a new game
  socket.on('createGame', async ({ hostId, questionSetId, settings }) => {
    try {
      console.log(`🎮 Create Game Request:
      Host ID: ${hostId}
      Question Set ID: ${questionSetId}`);
      
      const gameCode = await db.generateUniqueGameCode();
      
      const gameData = {
        host_id: hostId,
        question_set_id: questionSetId,
        game_code: gameCode,
        players_cap: settings?.maxPlayers || 50,
        game_settings: settings || {},
        status: 'waiting'
      };
      
      const result = await db.createGame(gameData);
      
      if (result.success) {
        // Store game in memory for quick access
        activeGames.set(gameCode, {
          ...result.game,
          hostSocket: socket.id,
          players: new Map()
        });
        
        socket.join(gameCode);
        socket.emit('gameCreated', { 
          game: result.game,
          gameCode 
        });
        
        console.log(`✅ Game created with code: ${gameCode}`);
      } else {
        socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('❌ Create game error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Join a game
  socket.on('joinGame', async ({ playerName, gameCode, userId = null }) => {
    try {
      console.log(`🎮 Join Game Request:
      Game Code: ${gameCode}
      Player Name: ${playerName}
      Socket ID: ${socket.id}`);
      
      // Get game from database
      const gameResult = await db.getGameByCode(gameCode);
      
      if (!gameResult.success) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      const game = gameResult.game;
      
      if (game.status !== 'waiting') {
        socket.emit('error', { message: 'Game has already started' });
        return;
      }
      
      if (game.current_players >= game.players_cap) {
        socket.emit('error', { message: 'Game is full' });
        return;
      }
      
      // Create player data
      const playerData = {
        user_id: userId,
        name: playerName,
        email: null // For guest players
      };
      
      // Add player to database
      const playerResult = await db.addPlayerToGame(game.id, playerData);
      
      if (playerResult.success) {
        // Update active game
        const activeGame = activeGames.get(gameCode);
        if (activeGame) {
          activeGame.players.set(socket.id, {
            ...playerResult.gamePlayer,
            socketId: socket.id
          });
        }
        
        socket.join(gameCode);
        
        // Notify player
        socket.emit('gameJoined', { 
          game,
          player: playerResult.gamePlayer 
        });
        
        // Notify all players in the game
        io.to(gameCode).emit('playerJoined', {
          player: playerResult.gamePlayer,
          totalPlayers: activeGame ? activeGame.players.size : 1
        });
        
        console.log(`✅ Player ${playerName} joined game ${gameCode}`);
      } else {
        socket.emit('error', { message: playerResult.error });
      }
    } catch (error) {
      console.error('❌ Join game error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Start game
  socket.on('startGame', async ({ gameCode }) => {
    try {
      console.log(`🚀 Start Game Request: ${gameCode}`);
      
      const activeGame = activeGames.get(gameCode);
      if (!activeGame || activeGame.hostSocket !== socket.id) {
        socket.emit('error', { message: 'Unauthorized or game not found' });
        return;
      }
      
      // Update game status in database
      const result = await db.updateGameStatus(activeGame.id, 'active', {
        started_at: new Date().toISOString()
      });
      
      if (result.success) {
        activeGame.status = 'active';
        activeGame.currentQuestionIndex = 0;
        
        // Notify all players
        io.to(gameCode).emit('gameStarted', {
          game: result.game
        });
        
        // Start first question
        setTimeout(() => {
          socket.emit('nextQuestion', { questionIndex: 0 });
        }, 2000);
        
        console.log(`✅ Game ${gameCode} started`);
      } else {
        socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('❌ Start game error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Submit answer
  socket.on('submitAnswer', async ({ gameCode, questionId, answerId, responseTime }) => {
    try {
      const activeGame = activeGames.get(gameCode);
      if (!activeGame) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      const player = activeGame.players.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player not found in game' });
        return;
      }
      
      // Submit answer to database
      const answerData = {
        game_id: activeGame.id,
        player_id: player.player_id,
        question_id: questionId,
        answer_id: answerId,
        response_time: responseTime,
        points_earned: 0, // Calculate based on correctness and time
        is_correct: false // Will be updated based on answer validation
      };
      
      const result = await db.submitPlayerAnswer(answerData);
      
      if (result.success) {
        socket.emit('answerSubmitted', {
          success: true,
          points: result.answer.points_earned
        });
        
        console.log(`✅ Answer submitted by ${player.player_name}`);
      } else {
        socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('❌ Submit answer error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    
    // Remove player from active games
    for (const [gameCode, game] of activeGames.entries()) {
      if (game.players.has(socket.id)) {
        const player = game.players.get(socket.id);
        game.players.delete(socket.id);
        
        // Notify other players
        socket.to(gameCode).emit('playerLeft', {
          player: player,
          totalPlayers: game.players.size
        });
        
        console.log(`👋 Player ${player.player_name} left game ${gameCode}`);
        break;
      }
      
      // If host disconnects, you might want to handle game cleanup
      if (game.hostSocket === socket.id) {
        console.log(`🏠 Host disconnected from game ${gameCode}`);
        // You could pause the game or transfer host rights
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await db.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await db.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on ${HOST}:${PORT}`);
    console.log(`📱 Mobile access: Use your computer's local IP address (e.g., 192.168.1.xxx:${PORT})`);
    console.log(`💻 Local access: http://localhost:${PORT}`);
    console.log(`🗃️  Database: Supabase Connected`);
    console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL}`);
});
