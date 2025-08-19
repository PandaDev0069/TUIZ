/**
 * HostOpsService
 * 
 * Service for host operations, analytics, and action logging.
 * Handles host session management, analytics snapshots, and action tracking.
 */

const logger = require('../utils/logger');

class HostOpsService {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  /**
   * Create host session for game
   * @param {string} gameId - Database game ID
   * @param {string} hostId - Host user ID
   * @param {Object} metadata - Session metadata
   * @param {boolean} metadata.game_creation - Whether this is for game creation
   * @param {string} metadata.session_type - Type of session
   * @param {Object} metadata.initial_settings - Initial game settings
   * @param {string} metadata.question_set_id - Question set ID
   * @param {string} metadata.creation_method - How game was created
   * @returns {Promise<Object>} Session creation result
   */
  async createHostSession(gameId, hostId, metadata = {}) {
    try {
      logger.debug('🎯 Creating host session via service', {
        gameId,
        hostId,
        sessionType: metadata.session_type,
        gameCreation: metadata.game_creation
      });

      const result = await this.db.createHostSession(gameId, hostId, metadata);

      if (result.success) {
        logger.database(`✅ Created host session for ${hostId} in game ${gameId}`);
      } else {
        logger.error(`❌ Failed to create host session for ${hostId}:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error creating host session via service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create analytics snapshot for game events
   * @param {string} gameId - Database game ID
   * @param {string} snapshotType - Type of snapshot ('game_start', 'question_start', 'game_end')
   * @param {string} questionId - Question ID (optional, for question-specific events)
   * @param {Object} metadata - Analytics metadata
   * @param {number} metadata.question_index - Current question index
   * @param {number} metadata.total_questions - Total questions in game
   * @param {number} metadata.active_players - Number of active players
   * @param {Object} metadata.game_settings - Current game settings
   * @returns {Promise<Object>} Analytics creation result
   */
  async createAnalyticsSnapshot(gameId, snapshotType, questionId = null, metadata = {}) {
    try {
      logger.debug('📊 Creating analytics snapshot via service', {
        gameId,
        snapshotType,
        questionId,
        questionIndex: metadata.question_index,
        activePlayers: metadata.active_players
      });

      const result = await this.db.createAnalyticsSnapshot(gameId, snapshotType, questionId, metadata);

      if (result.success) {
        logger.database(`✅ Created ${snapshotType} analytics snapshot for game ${gameId}`);
      } else {
        logger.error(`❌ Failed to create analytics snapshot for game ${gameId}:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error creating analytics snapshot via service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log host action for audit trail
   * @param {string} gameId - Database game ID
   * @param {string} hostId - Host user ID
   * @param {string} actionType - Type of action ('create_game', 'start_game', 'advance_question')
   * @param {Object} actionData - Action-specific data
   * @param {string} actionData.game_code - Game code
   * @param {string} actionData.action_type - Action type
   * @param {Object} actionData.question_set_data - Question set information
   * @param {Object} actionData.game_settings - Game settings at time of action
   * @returns {Promise<Object>} Logging result
   */
  async logHostAction(gameId, hostId, actionType, actionData = {}) {
    try {
      logger.debug('📝 Logging host action via service', {
        gameId,
        hostId,
        actionType,
        gameCode: actionData.game_code
      });

      // Call the database RPC function for host action logging
      const { data, error } = await this.db.supabaseAdmin.rpc('log_host_action', {
        p_game_id: gameId,
        p_host_id: hostId,
        p_action_type: actionType,
        p_game_code: actionData.game_code,
        p_action_data: actionData
      });

      if (error) {
        logger.error(`❌ Failed to log host action ${actionType} for ${hostId}:`, error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      logger.database(`✅ Logged ${actionType} action for host ${hostId} in game ${gameId}`);

      return {
        success: true,
        data
      };

    } catch (error) {
      logger.error('❌ Error logging host action via service:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get host session data
   * @param {string} gameId - Database game ID
   * @param {string} hostId - Host user ID
   * @returns {Promise<Object>} Host session data
   */
  async getHostSession(gameId, hostId) {
    try {
      logger.debug('🔍 Getting host session via service', { gameId, hostId });

      const { data: session, error } = await this.db.supabaseAdmin
        .from('host_sessions')
        .select('*')
        .eq('game_id', gameId)
        .eq('host_id', hostId)
        .single();

      if (error) {
        logger.error('❌ Error fetching host session:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      return {
        success: true,
        data: session
      };

    } catch (error) {
      logger.error('❌ Error getting host session via service:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get analytics snapshots for a game
   * @param {string} gameId - Database game ID
   * @param {string} snapshotType - Optional filter by snapshot type
   * @returns {Promise<Object>} Analytics snapshots array
   */
  async getAnalyticsSnapshots(gameId, snapshotType = null) {
    try {
      logger.debug('📊 Getting analytics snapshots via service', { gameId, snapshotType });

      let query = this.db.supabaseAdmin
        .from('analytics_snapshots')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at');

      if (snapshotType) {
        query = query.eq('snapshot_type', snapshotType);
      }

      const { data: snapshots, error } = await query;

      if (error) {
        logger.error('❌ Error fetching analytics snapshots:', error);
        return {
          success: false,
          error: error.message,
          data: []
        };
      }

      logger.debug(`✅ Retrieved ${snapshots?.length || 0} analytics snapshots for game ${gameId}`);

      return {
        success: true,
        data: snapshots || []
      };

    } catch (error) {
      logger.error('❌ Error getting analytics snapshots via service:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

module.exports = HostOpsService;
