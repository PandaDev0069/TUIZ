const gameConfig = require('../config/gameConfig');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    // Track which room a player is in for faster lookups
    this.playerRooms = new Map();
    // Maximum players per room (from config)
    this.MAX_PLAYERS_PER_ROOM = gameConfig.game.maxPlayersPerRoom;
    // Question timer in ms
    this.QUESTION_TIME = gameConfig.timing.questionDisplay;
    
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
      },
      {
        question: "日本で一番大きい湖は？",
        options: ["琵琶湖", "霞ヶ浦", "サロマ湖", "猪苗代湖"],
        correctIndex: 0
      },
      {
        question: "日本の国鳥は？",
        options: ["ツル", "キジ", "ハト", "カラス"],
        correctIndex: 1
      },
      {
        question: "2024年のオリンピック開催地は？",
        options: ["東京", "パリ", "ロサンゼルス", "ブリスベン"],
        correctIndex: 1
      }
    ];
  }

  joinRoom(roomCode, playerId, name) {
    if (!this.rooms.has(roomCode)) {
      // Initialize room with all required data structures
      this.rooms.set(roomCode, {
        players: new Map(),
        scores: new Map(),
        questionScores: new Map(),
        currentResponses: [],
        currentQuestionIndex: 0
      });
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
      // Add new player to room with initialized scores
      room.players.set(playerId, { id: playerId, name });
      room.scores.set(playerId, 0);
      room.questionScores.set(playerId, []);
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
    if (!room) {
      console.log('⚠️ No room found for game initialization');
      return null;
    }

    try {
      room.currentQuestionIndex = 0;
      room.scores = new Map();
      room.questions = [...this.sampleQuestions]; // In real app, fetch from database
      room.questionScores = new Map(); // Track scores per question
      room.currentResponses = []; // Track responses for current question
      room.streaks = new Map(); // Track player streaks
      room.questionStartTime = null; // Track when each question starts
      room.previousRanks = new Map(); // Track previous rankings for movement indicators
      
      // Initialize player data
      room.players.forEach((player, playerId) => {
        if (player.name === 'HOST') return; // Skip host initialization
        
        room.scores.set(playerId, 0);
        room.questionScores.set(playerId, Array(room.questions.length).fill(0));
        room.streaks.set(playerId, {
          current: 0,
          multiplier: gameConfig.streak.none
        });
        room.previousRanks.set(playerId, 0);
      });

      console.log(`🎲 Game initialized for room ${roomCode} with ${room.players.size} players`);
      return this.getCurrentQuestion(roomCode);
    } catch (error) {
      console.error('❌ Error initializing game:', error);
      return null;
    }
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

    // Reset responses for new question
    room.currentResponses = [];
    room.questionStartTime = Date.now();
    
    room.currentQuestionIndex++;
    return this.getCurrentQuestion(roomCode);
  }

  submitAnswer(roomCode, playerId, answerIndex) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log('⚠️ Room not found for answer submission');
      return { error: 'Room not found' };
    }

    const player = room.players.get(playerId);
    if (!player || player.name === 'HOST') {
      console.log('⚠️ Invalid player or HOST trying to submit answer');
      return { error: 'Invalid player' };
    }

    console.log(`📝 ${player.name} (${playerId}) submitted answer ${answerIndex}`);

    const currentQuestion = room.questions[room.currentQuestionIndex];
    if (!currentQuestion) {
      console.log('⚠️ No current question available');
      return { error: 'No question available' };
    }

    const isCorrect = currentQuestion.correctIndex === answerIndex;
    const currentTime = Date.now();
    
    // Initialize response tracking if needed
    if (!room.currentResponses) {
      room.currentResponses = [];
      room.questionStartTime = currentTime;
    }
    
    // Only allow first answer from each player
    const alreadyAnswered = room.currentResponses.some(r => r.playerId === playerId);
    if (alreadyAnswered) {
      return { error: 'Already answered' };
    }

    // Calculate time-based score
    const timeElapsed = currentTime - room.questionStartTime;
    const timeRemaining = Math.max(0, this.QUESTION_TIME - timeElapsed);
    const timeFactor = timeRemaining / this.QUESTION_TIME;

    // Check if player has necessary scoring data
    if (!room.scores.has(playerId)) {
      console.log(`⚠️ Player ${player.name} not properly initialized for scoring`);
      return { error: 'Player not initialized' };
    }

    // Get player's streak info
    const streak = room.streaks.get(playerId);
    
    // Record the response
    room.currentResponses.push({
      playerId,
      name: room.players.get(playerId).name,
      timestamp: currentTime,
      isCorrect,
      timeElapsed,
      answerIndex
    });

    // Calculate score
    let points = gameConfig.points.incorrect;
    
    if (isCorrect) {
      // Base score calculation using time factor
      points = Math.round(gameConfig.points.base * timeFactor);
      
      // Update streak FIRST
      streak.current += 1;
      
      // Calculate new multiplier based on updated streak
      let streakMultiplier = gameConfig.streak.none;
      if (streak.current >= 5) streakMultiplier = gameConfig.streak.x5;
      else if (streak.current === 4) streakMultiplier = gameConfig.streak.x4;
      else if (streak.current === 3) streakMultiplier = gameConfig.streak.x3;
      else if (streak.current === 2) streakMultiplier = gameConfig.streak.x2;
      
      // Apply streak multiplier to points
      points = Math.round(points * streakMultiplier);
      
      // Update streak info
      room.streaks.set(playerId, {
        current: streak.current,
        multiplier: streakMultiplier
      });
    } else {
      // Reset streak on wrong answer
      streak.current = 0;
      const streakMultiplier = gameConfig.streak.none;
      
      // Update streak info
      room.streaks.set(playerId, {
        current: streak.current,
        multiplier: streakMultiplier
      });
    }

    // Update scores
    const questionScores = room.questionScores.get(playerId);
    let currentScore = room.scores.get(playerId) || 0;
    
    // Add new points to total
    currentScore += points;
    
    // Update question scores array
    questionScores[room.currentQuestionIndex] = points;
    
    // Save updates
    room.questionScores.set(playerId, questionScores);
    room.scores.set(playerId, currentScore);

    // Calculate ranking changes
    const oldRank = room.previousRanks.get(playerId) || 0;
    const newRank = this.calculatePlayerRank(room, playerId);
    room.previousRanks.set(playerId, newRank);

    // Get current streak info for return
    const currentStreakInfo = room.streaks.get(playerId);

    console.log(`✨ Player ${room.players.get(playerId).name} scored ${points} points (streak: ${currentStreakInfo.current}, multiplier: ${currentStreakInfo.multiplier})`);

    return {
      correct: isCorrect,
      score: currentScore,
      questionScore: points,
      streak: currentStreakInfo.current,
      multiplier: currentStreakInfo.multiplier,
      rankChange: oldRank === 0 ? 'new' : newRank === oldRank ? 'same' : 
                 newRank < oldRank ? 'up' : 'down'
    };
  }

  getScoreboard(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.players || !room.scores) {
      console.log('⚠️ No valid room data found for scoreboard');
      return [];
    }

    const scoreboard = Array.from(room.players.values())
      .filter(player => player.name !== 'HOST') // Exclude host from scoreboard
      .map(player => {
        const questionScores = room.questionScores.get(player.id) || [];
        const totalScore = room.scores.get(player.id) || 0;
        
        // Calculate statistics
        const correctAnswers = questionScores.filter(score => score > 0).length;
        const accuracy = (correctAnswers / Math.max(room.currentQuestionIndex + 1, 1)) * 100;
        
        return {
          name: player.name,
          score: totalScore,
          questionScores: questionScores,
          stats: {
            correctAnswers,
            accuracy: Math.round(accuracy),
            avgScore: Math.round(totalScore / Math.max(correctAnswers, 1))
          }
        };
      })
      .sort((a, b) => b.score - a.score);

    // Save final scores for history (could be extended to store in database)
    room.finalScores = scoreboard;
    
    return scoreboard; // Make sure we return the scoreboard
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

  calculatePlayerRank(room, playerId) {
    if (!room || !playerId) return 0;
    
    // Get all player scores except HOST
    const scores = Array.from(room.players.entries())
      .filter(([_, player]) => player.name !== 'HOST')
      .map(([id, _]) => ({
        id,
        score: room.scores.get(id) || 0
      }))
      .sort((a, b) => b.score - a.score);
    
    // Find player's position (1-based index)
    return scores.findIndex(p => p.id === playerId) + 1;
  }

  getLeaderboard(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];

    // Get all players except HOST, with their scores and stats
    return Array.from(room.players.entries())
      .filter(([_, player]) => player.name !== 'HOST')
      .map(([id, player]) => {
        const score = room.scores.get(id) || 0;
        const streak = room.streaks.get(id);
        const questionScores = room.questionScores.get(id) || [];
        const rank = this.calculatePlayerRank(room, id);
        const previousRank = room.previousRanks.get(id) || 0;
        
        return {
          id,
          name: player.name,
          score,
          rank,
          streak: streak ? streak.current : 0,
          multiplier: streak ? streak.multiplier : 1,
          questionScores,
          rankChange: previousRank === 0 ? 'new' : 
                     rank === previousRank ? 'same' : 
                     rank < previousRank ? 'up' : 'down'
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

module.exports = new RoomManager();
// This module manages room creation, player joining, and player leaving.