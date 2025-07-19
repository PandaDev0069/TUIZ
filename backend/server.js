const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const roomManager = require('./utils/RoomManager');

const app = express();
app.use(cors());

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
    
    // Send result back to the player
    socket.emit('answer_result', result);
    
    // Notify host about the submission
    io.to(room).emit('player_answered', { name });
  });

  socket.on('next_question', ({ room }) => {
    const nextQuestion = roomManager.nextQuestion(room);
    
    if (nextQuestion) {
      // Send next question to all players
      io.to(room).emit('question', nextQuestion);
    } else {
      // No more questions, game over
      const scoreboard = roomManager.getScoreboard(room);
      io.to(room).emit('game_over', { scoreboard });
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

