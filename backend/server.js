const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const roomManager = require('./utils/RoomManager');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Authentication routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const server = http.createServer(app);

// Socket.IO server
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for simplicity; adjust as needed
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
  console.log(`🔌 New user connected: ${socket.id}`);

  socket.on('joinRoom', ({ name, room }) => {
    console.log(`\n🎮 Join Room Request:
    Room Code: ${room}
    Player ID: ${socket.id}
    Player Name: ${name}`);
    
    const players = roomManager.joinRoom(room, socket.id, name);
    
    // Join the Socket.IO room first
    socket.join(room);
    
    console.log(`✅ Room ${room} now has ${players.length} players`);
    
    // Acknowledge to player
    socket.emit('joined_successfully', { players });

    // Broadcast to others in the room
    socket.to(room).emit('player_joined', { 
      name,
      players // Send updated player list to everyone
    });
  });

  socket.on('disconnect', () => {
    // Get player's room before they leave
    const playerRoom = roomManager.playerRooms.get(socket.id);
    console.log(`❌ User disconnected: ${socket.id}`);
    
    const remainingPlayers = roomManager.leaveRoom(socket.id);
    
    // If player was in a room, notify others
    if (playerRoom && remainingPlayers) {
      socket.to(playerRoom).emit('player_left', {
        playerId: socket.id,
        players: remainingPlayers
      });
    }
  });

  socket.on('start_game', ({ room }) => {
    console.log(`▶️ クイズ開始: Room ${room}`);
    
    // Initialize the game and get first question
    const firstQuestion = roomManager.initializeGame(room);
    
    // First notify everyone game is starting
    io.to(room).emit('start_game');
    
    // Then send first question
    setTimeout(() => {
      io.to(room).emit('question', firstQuestion);
    }, 2000); // Give players 2 seconds to get ready
  });

  socket.on('submit_answer', ({ room, name, answer }) => {
    const result = roomManager.submitAnswer(room, socket.id, answer);
    if (result.error) return;
    
    // Only notify host if player actually answered (not timeout/null)
    if (answer !== null && answer !== undefined) {
      socket.to(room).emit('player_answered', { name, playerId: socket.id });
    }
    
    // Emit result to the player who answered
    socket.emit('answer_result', {
      correct: result.correct,
      score: result.score,
      questionScore: result.questionScore,
      streak: result.streak,
      multiplier: result.multiplier,
      rankChange: result.rankChange
    });

    // Get updated leaderboard
    const leaderboard = roomManager.getLeaderboard(room);
    const top5 = leaderboard.slice(0, 5);
    
    // Find player's position if they're not in top 5
    const playerPosition = leaderboard.findIndex(p => p.id === socket.id);
    const playerInfo = playerPosition >= 5 ? leaderboard[playerPosition] : null;

    // Emit leaderboard update to all players in the room
    io.to(room).emit('leaderboard_update', {
      top5,
      totalPlayers: leaderboard.length,
      currentPlayer: playerInfo,
      questionAnswered: true
    });
  });

  socket.on('next_question', ({ room }) => {
    if (!room) {
      console.log('⚠️ No room provided for next question');
      return;
    }

    // Show current leaderboard to all players (no auto-advance)
    const currentLeaderboard = roomManager.getLeaderboard(room);
    const top5 = currentLeaderboard.slice(0, 5);
    
    // Calculate analytics for host
    const roomData = roomManager.rooms.get(room);
    let analytics = null;
    
    if (roomData && roomData.currentResponses) {
      const totalPlayers = Array.from(roomData.players.values()).filter(p => p.name !== 'HOST').length;
      const totalResponses = roomData.currentResponses.length;
      const correctResponses = roomData.currentResponses.filter(r => r.isCorrect).length;
      
      // Get current question to determine option count
      const currentQuestion = roomData.questions[roomData.currentQuestionIndex];
      const optionCount = currentQuestion ? currentQuestion.options.length : 4;
      
      // Calculate answer distribution based on actual option count
      const answerDistribution = new Array(optionCount).fill(0);
      roomData.currentResponses.forEach(response => {
        if (response.answerIndex !== null && response.answerIndex >= 0 && response.answerIndex < optionCount) {
          answerDistribution[response.answerIndex]++;
        }
      });
      
      analytics = {
        totalPlayers,
        totalResponses,
        responseRate: totalPlayers > 0 ? Math.round((totalResponses / totalPlayers) * 100) : 0,
        correctRate: totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0,
        answerDistribution,
        questionType: currentQuestion?.type || 'multiple_choice_4'
      };
    }
    
    // Send intermediate scoreboard to players
    io.to(room).emit('show_intermediate_scores', {
      top5,
      totalPlayers: currentLeaderboard.length
    });
    
    // Send detailed analytics to host only
    const hostSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.rooms && s.rooms.has(room) && roomData?.players.get(s.id)?.name === 'HOST');
    
    if (hostSocket) {
      hostSocket.emit('show_host_analytics', {
        leaderboard: currentLeaderboard,
        analytics,
        canContinue: true
      });
    }
  });

  socket.on('continue_game', ({ room }) => {
    if (!room) {
      console.log('⚠️ No room provided for continue game');
      return;
    }

    const nextQuestion = roomManager.nextQuestion(room);
    
    if (nextQuestion) {
      // Send next question to all players
      io.to(room).emit('question', nextQuestion);
      console.log(`➡️ Moving to next question in room ${room}`);
    } else {
      // No more questions, game over
      try {
        const scoreboard = roomManager.getScoreboard(room) || [];
        console.log(`📊 Final scoreboard for room ${room}:`, scoreboard);
        
        // Emit special events for top 3 players
        const top3 = scoreboard.slice(0, Math.min(3, scoreboard.length));
        
        // First emit game_over to prepare clients
        io.to(room).emit('game_over', { 
          scoreboard,
          top3,
          totalPlayers: scoreboard.length
        });
      } catch (error) {
        console.error('❌ Error generating scoreboard:', error);
        // Send a basic game over event if scoreboard fails
        io.to(room).emit('game_over', { 
          scoreboard: [],
          top3: [],
          totalPlayers: 0
        });
      }
    }
  });
});

const PORT = 3001;
const HOST = '0.0.0.0'; // Listen on all network interfaces
server.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on ${HOST}:${PORT}`);
    console.log(`📱 Mobile access: Use your computer's local IP address (e.g., 192.168.1.xxx:${PORT})`);
    console.log(`💻 Local access: http://localhost:${PORT}`);
});

