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
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

