/**
 * PlayerService
 * 
 * Service for managing player operations, actions, and answers.
 * Handles player-game relationships, answer submissions, and action tracking.
 */

const logger = require('../utils/logger');

class PlayerService {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  /**
   * Add player to game
   * @param {string} gameId - Database game ID (UUID)
   * @param {Object} playerData - Player data
   * @param {string} playerData.name - Player name
   * @param {string} playerData.user_id - Player user ID (optional)
   * @param {boolean} playerData.is_host - Whether player is host
   * @returns {Promise<Object>} Add result
   */
  async addToGame(gameId, playerData) {
    try {
      logger.debug('👤 Adding player to game via service', {
        gameId,
        playerName: playerData.name,
        isHost: playerData.is_host || false
      });

      const result = await this.db.addPlayerToGame(gameId, playerData);

      if (result.success) {
        logger.database(`✅ Player ${playerData.name} added to game ${gameId} via service`);
      } else {
        logger.error(`❌ Failed to add player ${playerData.name} to game via service:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error adding player to game via service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record player answer submission
   * @param {Object} answerData - Answer submission data
   * @param {string} answerData.game_id - Game database ID
   * @param {string} answerData.player_id - Player database ID
   * @param {string} answerData.question_id - Question ID
   * @param {string} answerData.answer_id - Selected answer ID
   * @param {boolean} answerData.is_correct - Whether answer is correct
   * @param {number} answerData.time_taken - Time taken to answer (ms)
   * @param {number} answerData.points_earned - Points earned for answer
   * @returns {Promise<Object>} Submission result
   */
  async recordAnswer(answerData) {
    try {
      logger.debug('📝 Recording player answer via service', {
        gameId: answerData.game_id,
        playerId: answerData.player_id,
        questionId: answerData.question_id,
        isCorrect: answerData.is_correct,
        timeTaken: answerData.time_taken,
        pointsEarned: answerData.points_earned
      });

      const result = await this.db.submitPlayerAnswer(answerData);

      if (result.success) {
        logger.database(`✅ Recorded answer for player ${answerData.player_id} in game ${answerData.game_id}`);
      } else {
        logger.error(`❌ Failed to record answer for player ${answerData.player_id}:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error recording player answer via service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record player action (join, disconnect, etc.)
   * @param {string} gameId - Database game ID
   * @param {string} playerId - Player database ID
   * @param {string} actionType - Type of action ('join', 'disconnect', 'reconnect')
   * @param {Object} metadata - Additional action metadata
   * @param {string} note - Optional note about the action
   * @returns {Promise<Object>} Action recording result
   */
  async recordAction(gameId, playerId, actionType, metadata = {}, note = null) {
    try {
      logger.debug('📋 Recording player action via service', {
        gameId,
        playerId,
        actionType,
        metadata,
        note
      });

      const result = await this.db.createPlayerAction(gameId, playerId, actionType, metadata, note);

      if (result.success) {
        logger.database(`✅ Recorded ${actionType} action for player ${playerId} in game ${gameId}`);
      } else {
        logger.error(`❌ Failed to record ${actionType} action for player ${playerId}:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error recording player action via service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get player by ID from game
   * @param {string} gameId - Database game ID
   * @param {string} playerId - Player database ID
   * @returns {Promise<Object>} Player data or null
   */
  async getPlayerById(gameId, playerId) {
    try {
      logger.debug('🔍 Getting player by ID via service', { gameId, playerId });

      const { data: player, error } = await this.db.supabaseAdmin
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .eq('id', playerId)
        .single();

      if (error) {
        logger.error('❌ Error fetching player by ID:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      return {
        success: true,
        data: player
      };

    } catch (error) {
      logger.error('❌ Error getting player by ID via service:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get all players in a game
   * @param {string} gameId - Database game ID
   * @returns {Promise<Object>} Players array
   */
  async getGamePlayers(gameId) {
    try {
      logger.debug('👥 Getting game players via service', { gameId });

      const { data: players, error } = await this.db.supabaseAdmin
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at');

      if (error) {
        logger.error('❌ Error fetching game players:', error);
        return {
          success: false,
          error: error.message,
          data: []
        };
      }

      logger.debug(`✅ Retrieved ${players?.length || 0} players for game ${gameId}`);

      return {
        success: true,
        data: players || []
      };

    } catch (error) {
      logger.error('❌ Error getting game players via service:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

module.exports = PlayerService;
