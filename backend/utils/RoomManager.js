class RoomManager {
  constructor() {
    this.rooms = new Map();
    // Track which room a player is in for faster lookups
    this.playerRooms = new Map();
    // Maximum players per room (as per requirements: 200-300)
    this.MAX_PLAYERS_PER_ROOM = 300;
    
    // Sample questions (in real app, this would come from a database)
    this.sampleQuestions = [
      {
        question: "日本の首都はどこですか？",
        options: ["大阪", "東京", "京都", "札幌"],
        correctIndex: 1
      },
      {
        question: "富士山の高さは？",
        options: ["2,776m", "3,776m", "4,776m", "5,776m"],
        correctIndex: 1
      }
    ];
  }

  joinRoom(roomCode, playerId, name) {
    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, { players: new Map() });
      console.log(`📝 Created new room: ${roomCode}`);
    }
    
    const room = this.rooms.get(roomCode);
    
    // Check room capacity
    if (room.players.size >= this.MAX_PLAYERS_PER_ROOM) {
      console.log(`⛔ Room ${roomCode} is full (${this.MAX_PLAYERS_PER_ROOM} players max)`);
      return { error: 'Room is full' };
    }
    
    // If player is already in the room, update their name
    if (room.players.has(playerId)) {
      room.players.get(playerId).name = name;
      console.log(`🔄 Player updated in room ${roomCode}:
        ID: ${playerId}
        Name: ${name}
        Current players: ${room.players.size}`);
    } else {
      // Add new player to room
      room.players.set(playerId, { id: playerId, name });
      // Track which room this player is in
      this.playerRooms.set(playerId, roomCode);
      console.log(`➕ New player joined room ${roomCode}:
        ID: ${playerId}
        Name: ${name}
        Current players: ${room.players.size}`);
    }

    // Return array of all players in room
    return Array.from(room.players.values());
  }

  getPlayers(roomCode) {
    const room = this.rooms.get(roomCode);
    return room ? Array.from(room.players.values()) : [];
  }

  initializeGame(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.currentQuestionIndex = 0;
    room.scores = new Map();
    room.questions = [...this.sampleQuestions]; // In real app, fetch from database
    
    // Initialize scores for all players
    room.players.forEach((player) => {
      room.scores.set(player.id, 0);
    });

    return this.getCurrentQuestion(roomCode);
  }

  getCurrentQuestion(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || room.currentQuestionIndex >= room.questions.length) {
      return null;
    }
    
    // Don't send correctIndex to clients
    const { correctIndex, ...questionForPlayers } = room.questions[room.currentQuestionIndex];
    return questionForPlayers;
  }

  nextQuestion(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.currentQuestionIndex++;
    return this.getCurrentQuestion(roomCode);
  }

  submitAnswer(roomCode, playerId, answerIndex) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };

    const currentQuestion = room.questions[room.currentQuestionIndex];
    const isCorrect = currentQuestion.correctIndex === answerIndex;
    
    // Initialize responses array for this question if it doesn't exist
    if (!room.currentResponses) {
      room.currentResponses = [];
    }

    // Only record the first response from each player
    if (!room.currentResponses.some(r => r.playerId === playerId)) {
      room.currentResponses.push({
        playerId,
        name: room.players.get(playerId).name,
        timestamp: Date.now(),
        isCorrect
      });
    }

    // Calculate score based on response speed
    let points = 0;
    if (isCorrect) {
      const position = room.currentResponses.findIndex(r => r.playerId === playerId);
      switch (position) {
        case 0: points = 1000; break;
        case 1: points = 500; break;
        case 2: points = 200; break;
        default: points = 100; break;
      }
    }
    
    // Update player's score
    const currentScore = room.scores.get(playerId) || 0;
    room.scores.set(playerId, currentScore + points);

    return {
      correct: isCorrect,
      score: room.scores.get(playerId)
    };
  }

  getScoreboard(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];

    return Array.from(room.players.values()).map(player => ({
      name: player.name,
      score: room.scores.get(player.id) || 0
    })).sort((a, b) => b.score - a.score);
  }

  leaveRoom(playerId) {
    // Get room code from player tracking
    const roomCode = this.playerRooms.get(playerId);
    if (!roomCode) {
      console.log(`⚠️ Player ${playerId} not found in any room`);
      return;
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`⚠️ Room ${roomCode} not found`);
      return;
    }

    // Get player info before removing
    const player = room.players.get(playerId);
    const playerName = player ? player.name : 'Unknown';

    // Remove player from room
    room.players.delete(playerId);
    console.log(`👋 Player left room ${roomCode}:
      Name: ${playerName}
      ID: ${playerId}`);
    
    // Remove player tracking
    this.playerRooms.delete(playerId);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      console.log(`📤 Deleted empty room: ${roomCode}`);
    } else {
      console.log(`📊 Room ${roomCode} has ${room.players.size} players remaining`);
    }

    return Array.from(room.players.values());
  }
}

module.exports = new RoomManager();
// This module manages room creation, player joining, and player leaving.