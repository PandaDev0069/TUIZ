const express = require('express');
const router = express.Router();
const roomManager = require('../../utils/RoomManager');
const { getAuthenticatedUser } = require('../../helpers/authHelper');
const DatabaseManager = require('../../config/database');
const RateLimitMiddleware = require('../../middleware/rateLimiter');
const logger = require('../../utils/logger');

// Validation middleware
const { createValidator } = require('../../validation');

// Initialize database
const db = new DatabaseManager();

// Room manager is already initialized as a singleton

// Get all active games
router.get('/active', RateLimitMiddleware.createReadLimit(), async (req, res) => {
  try {
    const roomsMap = roomManager.getAllRoomsMap();
    const activeGames = Array.from(roomsMap.values()).map(room => ({
      gameId: room.gameId,
      hostName: room.hostName,
      playerCount: room.players.size,
      status: room.status,
      questionSetId: room.questionSetId,
      currentQuestion: room.currentQuestionIndex,
      totalQuestions: room.questions?.length || 0,
      createdAt: room.createdAt
    }));

    res.json({ activeGames });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific game details
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const room = roomManager.getRoom(gameId);
    
    if (!room) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Return sanitized room data (without sensitive info)
    const gameData = {
      gameId: room.gameId,
      hostName: room.hostName,
      status: room.status,
      playerCount: room.players.size,
      players: Array.from(room.players.values()).map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        isConnected: player.isConnected
      })),
      questionSetId: room.questionSetId,
      currentQuestion: room.currentQuestionIndex,
      totalQuestions: room.questions?.length || 0,
      settings: room.gameSettings,
      createdAt: room.createdAt
    };
    
    res.json({ game: gameData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new game
router.post('/create', async (req, res) => {
  try {
    const { questionSetId, gameSettings } = req.body;
    
    if (!questionSetId) {
      return res.status(400).json({ error: 'Question set ID is required' });
    }
    
    // Get authenticated user (host)
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    // Create game room
    const gameId = roomManager.createRoom(
      authenticatedUser.name || 'Host',
      questionSetId,
      gameSettings || {}
    );
    
    if (!gameId) {
      return res.status(500).json({ error: 'Failed to create game room' });
    }
    
    logger.debug(`Game created: ${gameId} by ${authenticatedUser.name}`);
    
    res.json({ 
      gameId,
      message: 'Game created successfully',
      hostName: authenticatedUser.name || 'Host'
    });
  } catch (error) {
    logger.error('Error creating game:', error);
    res.status(500).json({ error: error.message });
  }
});

// End a game
router.post('/:gameId/end', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await getAuthenticatedUser(req.headers.authorization);
    } catch (authError) {
      return res.status(401).json({ error: authError.message });
    }
    
    const room = roomManager.getRoom(gameId);
    if (!room) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Verify host permission (basic check)
    if (room.hostName !== (authenticatedUser.name || 'Host')) {
      return res.status(403).json({ error: 'Only the host can end the game' });
    }
    
    // End the game
    roomManager.removeRoom(gameId);
    
    logger.debug(`Game ended: ${gameId} by ${authenticatedUser.name}`);
    
    res.json({ message: 'Game ended successfully' });
  } catch (error) {
    logger.error('Error ending game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get game statistics
router.get('/:gameId/stats', async (req, res) => {
  try {
    const { gameId } = req.params;
    const room = roomManager.getRoom(gameId);
    
    if (!room) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const players = Array.from(room.players.values());
    const stats = {
      totalPlayers: players.length,
      averageScore: players.length > 0 
        ? players.reduce((sum, p) => sum + p.score, 0) / players.length 
        : 0,
      highestScore: players.length > 0 
        ? Math.max(...players.map(p => p.score)) 
        : 0,
      questionsAnswered: room.currentQuestionIndex,
      totalQuestions: room.questions?.length || 0,
      gameStatus: room.status,
      gameDuration: room.createdAt ? Date.now() - room.createdAt : 0
    };
    
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player statistics for authenticated users
router.get('/player/stats', async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await db.getPlayerStats(user.id);
    
    if (result.success) {
      res.json({ success: true, stats: result.stats });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Error getting player stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
