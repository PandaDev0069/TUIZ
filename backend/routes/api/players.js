const express = require('express');
const logger = require('../../utils/logger');
const router = express.Router();

module.exports = (dbManager) => {
  // Get all players in a game
  router.get('/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;
      const { includeInactive = false } = req.query;
      
      logger.debug(`📋 Getting players for game: ${gameId}`);
      
      const result = await dbManager.getGamePlayers(gameId, includeInactive === 'true');
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            players: result.players,
            totalCount: result.totalCount,
            activeCount: result.activeCount,
            guestCount: result.guestCount,
            userCount: result.userCount
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Get game players error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get specific player in a game
  router.get('/game/:gameId/player/:playerId', async (req, res) => {
    try {
      const { gameId, playerId } = req.params;
      
      logger.debug(`👤 Getting player ${playerId} in game ${gameId}`);
      
      const result = await dbManager.getGamePlayer(gameId, playerId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.player
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Get game player error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Update player in game (score, rank, streak, etc.)
  router.patch('/game/:gameId/player/:playerId', async (req, res) => {
    try {
      const { gameId, playerId } = req.params;
      const updateData = req.body;
      
      logger.debug(`🔄 Updating player ${playerId} in game ${gameId}:`, updateData);
      
      const result = await dbManager.updateGamePlayer(gameId, playerId, updateData);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.player
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Update game player error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Remove/deactivate player from game
  router.delete('/game/:gameId/player/:playerId', async (req, res) => {
    try {
      const { gameId, playerId } = req.params;
      const { permanent = false } = req.query;
      
      logger.debug(`🚫 ${permanent === 'true' ? 'Removing' : 'Deactivating'} player ${playerId} from game ${gameId}`);
      
      const result = await dbManager.removePlayerFromGame(gameId, playerId, permanent === 'true');
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Remove game player error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Bulk update player scores and ranks
  router.patch('/game/:gameId/bulk-update', async (req, res) => {
    try {
      const { gameId } = req.params;
      const { players } = req.body;
      
      if (!Array.isArray(players)) {
        return res.status(400).json({
          success: false,
          error: 'players must be an array'
        });
      }
      
      logger.debug(`📊 Bulk updating ${players.length} players in game ${gameId}`);
      
      const result = await dbManager.bulkUpdateGamePlayers(gameId, players);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            updatedCount: result.updatedCount,
            players: result.players
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Bulk update players error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get player leaderboard for a game
  router.get('/game/:gameId/leaderboard', async (req, res) => {
    try {
      const { gameId } = req.params;
      const { limit = 10, includeInactive = false } = req.query;
      
      logger.debug(`🏆 Getting leaderboard for game ${gameId}`);
      
      const result = await dbManager.getGameLeaderboard(gameId, {
        limit: parseInt(limit),
        includeInactive: includeInactive === 'true'
      });
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            leaderboard: result.leaderboard,
            totalPlayers: result.totalPlayers,
            gameInfo: result.gameInfo
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Join game as player
  router.post('/join', async (req, res) => {
    try {
      const { gameCode, playerData } = req.body;
      
      if (!gameCode || !playerData) {
        return res.status(400).json({
          success: false,
          error: 'gameCode and playerData are required'
        });
      }
      
      logger.debug(`🎮 Player joining game: ${gameCode}`);
      
      // First get the game ID from the game code
      const gameResult = await dbManager.getGameByCode(gameCode);
      if (!gameResult.success) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }
      
      const result = await dbManager.addPlayerToGame(gameResult.game.id, playerData);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            gamePlayer: result.gamePlayer,
            game: gameResult.game,
            isReturningPlayer: result.isReturningPlayer,
            isNewPlayer: result.isNewPlayer
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Join game error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
