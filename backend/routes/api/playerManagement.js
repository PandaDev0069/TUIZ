const express = require('express');
const logger = require('./utils/logger');
const router = express.Router();

module.exports = (dbManager) => {
  // Test endpoint for player UUID management
  router.post('/test-player-uuid', async (req, res) => {
    try {
      const { userId, playerName } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId is required' 
        });
      }

      logger.debug(`🧪 Testing player UUID for user: ${userId}, name: ${playerName}`);
      
      const result = await dbManager.getOrCreatePlayerUUID(userId, playerName);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            playerId: result.playerId,
            isNewPlayer: result.isNewPlayer,
            playerName: result.playerName,
            message: result.isNewPlayer ? 'New player UUID created' : 'Existing player UUID found'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Test player UUID error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Test endpoint for guest UUID
  router.post('/test-guest-uuid', async (req, res) => {
    try {
      logger.debug('🧪 Testing guest UUID creation');
      
      const result = await dbManager.createGuestPlayerUUID();
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            playerId: result.playerId,
            isNewPlayer: result.isNewPlayer,
            isGuest: result.isGuest,
            message: 'Guest player UUID created'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('❌ Test guest UUID error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Database migration endpoint
  router.post('/migrate-schema', async (req, res) => {
    try {
      logger.debug('🔄 Running database schema migration...');
      
      const result = await dbManager.addGamePlayerUUIDToUsers();
      
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
      logger.error('❌ Migration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get player stats by game_player_uuid
  router.get('/stats/:playerUuid', async (req, res) => {
    try {
      const { playerUuid } = req.params;
      
      logger.debug(`📊 Getting stats for player UUID: ${playerUuid}`);
      
      const stats = await dbManager.getPlayerStats(playerUuid);
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('❌ Get player stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
