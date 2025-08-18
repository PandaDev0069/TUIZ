const express = require('express');
const logger = require('../../utils/logger');
const router = express.Router();

module.exports = (dbManager) => {
  // Get game results for a specific game
  router.get('/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;
      const { includePlayerNames = true } = req.query;
      
      logger.debug(`📊 Getting game results for game: ${gameId}`);
      
      const result = await dbManager.getGameResults(gameId);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            results: result.results,
            gameId: gameId,
            totalResults: result.results.length
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Get game results error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get specific player's result in a game
  router.get('/game/:gameId/player/:playerId', async (req, res) => {
    try {
      const { gameId, playerId } = req.params;
      
      logger.debug(`👤 Getting result for player ${playerId} in game ${gameId}`);
      
      const result = await dbManager.getPlayerGameResult(gameId, playerId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.result
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Get player game result error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get leaderboard/rankings for a game
  router.get('/game/:gameId/leaderboard', async (req, res) => {
    try {
      const { gameId } = req.params;
      const { limit = 50 } = req.query;
      
      logger.debug(`🏆 Getting leaderboard for game: ${gameId}`);
      
      const result = await dbManager.getGameResultsLeaderboard(gameId, parseInt(limit));
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            leaderboard: result.leaderboard,
            gameId: gameId,
            totalPlayers: result.totalPlayers
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Get game leaderboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get statistics for a game
  router.get('/game/:gameId/stats', async (req, res) => {
    try {
      const { gameId } = req.params;
      
      logger.debug(`📈 Getting statistics for game: ${gameId}`);
      
      const result = await dbManager.getGameStatistics(gameId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.stats
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Get game statistics error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Create game results manually (admin/testing)
  router.post('/game/:gameId/create', async (req, res) => {
    try {
      const { gameId } = req.params;
      const { results } = req.body;
      
      if (!Array.isArray(results)) {
        return res.status(400).json({
          success: false,
          error: 'results must be an array'
        });
      }
      
      logger.debug(`📝 Creating ${results.length} game results for game: ${gameId}`);
      
      const result = await dbManager.createGameResultsBulk(gameId, results);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            created: result.created,
            count: result.count
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Create game results error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Delete all results for a game (admin/testing)
  router.delete('/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;
      
      logger.debug(`🗑️ Deleting all results for game: ${gameId}`);
      
      const result = await dbManager.deleteGameResults(gameId);
      
      if (result.success) {
        res.json({
          success: true,
          message: `Deleted ${result.deletedCount} results`,
          deletedCount: result.deletedCount
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Delete game results error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
