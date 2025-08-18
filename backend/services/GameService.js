/**
 * GameService
 * 
 * Service for managing game sessions, players, and game state in the database.
 * Handles creation, updates, and lifecycle management of games.
 */

const logger = require('../utils/logger');

class GameService {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  /**
   * Create a new game session in the database
   * @param {Object} gameData - Game data
   * @param {string} gameData.gameCode - Unique game code
   * @param {string} gameData.hostId - Host user ID
   * @param {string} gameData.questionSetId - Question set UUID
   * @param {Object} gameData.settings - Game settings
   * @param {string} gameData.title - Game title
   * @param {number} gameData.totalQuestions - Total questions
   * @returns {Promise<Object>} Database result
   */
  async createGame(gameData) {
    try {
      logger.debug('🎯 Creating game in database', {
        gameCode: gameData.gameCode,
        hostId: gameData.hostId,
        questionSetId: gameData.questionSetId
      });

      const dbResult = await this.db.createGame(gameData);

      if (dbResult.success) {
        logger.database(`✅ Game created: ${gameData.gameCode} (DB ID: ${dbResult.data.id})`);
      } else {
        logger.error('❌ Failed to create game in database:', dbResult.error);
      }

      return dbResult;
    } catch (error) {
      logger.error('❌ Error creating game:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update game status in the database
   * @param {number} gameId - Database game ID
   * @param {string} status - New game status ('waiting', 'active', 'completed')
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} Update result
   */
  async updateGameStatus(gameId, status, additionalData = {}) {
    try {
      logger.debug('🔄 Updating game status', {
        gameId,
        status,
        additionalData
      });

      const result = await this.db.updateGameStatus(gameId, status, additionalData);

      if (result.success) {
        logger.debug(`✅ Game ${gameId} status updated to: ${status}`);
      } else {
        logger.error(`❌ Failed to update game ${gameId} status:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error updating game status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add player to game session
   * @param {number} gameId - Database game ID
   * @param {string} playerId - Player ID
   * @param {string} playerName - Player name
   * @param {Object} additionalData - Additional player data
   * @returns {Promise<Object>} Add result
   */
  async addPlayerToGame(gameId, playerId, playerName, additionalData = {}) {
    try {
      logger.debug('👤 Adding player to game', {
        gameId,
        playerId,
        playerName
      });

      const result = await this.db.addPlayerToGame(gameId, playerId, playerName, additionalData);

      if (result.success) {
        logger.database(`✅ Player ${playerName} added to game ${gameId}`);
      } else {
        logger.error(`❌ Failed to add player ${playerName} to game:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error adding player to game:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update player data in game
   * @param {number} gameId - Database game ID
   * @param {string} playerId - Player ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update result
   */
  async updateGamePlayer(gameId, playerId, updateData) {
    try {
      logger.debug('🔄 Updating game player', {
        gameId,
        playerId,
        updateFields: Object.keys(updateData)
      });

      const result = await this.db.updateGamePlayer(gameId, playerId, updateData);

      if (result.success) {
        logger.debug(`✅ Player ${playerId} updated in game ${gameId}`);
      } else {
        logger.error(`❌ Failed to update player ${playerId}:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error updating game player:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update player rankings for multiple players
   * @param {Object} activeGame - Active game object
   * @param {Array} scoreboard - Sorted scoreboard with player rankings
   * @returns {Promise<Object>} Update results
   */
  async updatePlayerRankings(activeGame, scoreboard) {
    try {
      logger.debug('🏆 Updating player rankings', {
        gameId: activeGame.id,
        gameCode: activeGame.gameCode,
        playerCount: scoreboard.length
      });

      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };

      // Filter players who have database IDs
      const playersWithIds = scoreboard.filter(player => player.playerId);

      logger.debug(`📊 Processing rankings for ${playersWithIds.length} players with database IDs`);

      // Update rankings in parallel
      const updatePromises = playersWithIds.map(async (player) => {
        try {
          const updateResult = await this.db.updateGamePlayer(activeGame.id, player.playerId, {
            final_score: player.score,
            final_rank: player.rank,
            questions_answered: player.questionsAnswered || 0,
            questions_correct: player.correctAnswers || 0,
            streak: player.streak || 0,
            updated_at: new Date().toISOString()
          });

          if (updateResult.success) {
            results.successful++;
            logger.debug(`✅ Updated ranking for ${player.name}: Rank ${player.rank}, Score ${player.score}`);
          } else {
            results.failed++;
            results.errors.push({
              player: player.name,
              error: updateResult.error
            });
            logger.error(`❌ Failed to update ranking for ${player.name}:`, updateResult.error);
          }

          return updateResult;
        } catch (error) {
          results.failed++;
          results.errors.push({
            player: player.name,
            error: error.message
          });
          logger.error(`❌ Error updating ranking for ${player.name}:`, error);
          return { success: false, error: error.message };
        }
      });

      await Promise.all(updatePromises);

      logger.debug(`📊 Player rankings update complete: ${results.successful} successful, ${results.failed} failed`);

      return {
        success: results.failed === 0,
        results
      };

    } catch (error) {
      logger.error('❌ Error updating player rankings:', error);
      return {
        success: false,
        error: error.message,
        results: { successful: 0, failed: scoreboard.length, errors: [error.message] }
      };
    }
  }

  /**
   * Get game session by game code
   * @param {string} gameCode - Game code to find
   * @returns {Promise<Object>} Game session data or null
   */
  async getGameByCode(gameCode) {
    try {
      logger.debug('🔍 Finding game by code', { gameCode });

      const result = await this.db.getGameByCode(gameCode);

      if (result.success && result.data) {
        logger.debug(`✅ Found game: ${gameCode} (ID: ${result.data.id})`);
      } else {
        logger.debug(`❌ Game not found: ${gameCode}`);
      }

      return result;
    } catch (error) {
      logger.error('❌ Error finding game by code:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get question set metadata for game creation
   * @param {string} questionSetId - Question set UUID
   * @returns {Promise<Object>} Question set metadata
   */
  async getQuestionSetMetadata(questionSetId) {
    try {
      logger.debug('📄 Getting question set metadata', { questionSetId });

      const { data: questionSet, error: qsError } = await this.db.supabaseAdmin
        .from('question_sets')
        .select('id, title, description, total_questions')
        .eq('id', questionSetId)
        .single();

      if (qsError) {
        logger.error('❌ Error fetching question set metadata:', qsError);
        return {
          success: false,
          error: qsError.message,
          data: null
        };
      }

      if (!questionSet) {
        logger.warn(`⚠️ Question set not found: ${questionSetId}`);
        return {
          success: false,
          error: 'Question set not found',
          data: null
        };
      }

      logger.debug(`✅ Retrieved question set metadata - Title: ${questionSet.title}, Questions: ${questionSet.total_questions}`);

      return {
        success: true,
        data: questionSet
      };

    } catch (error) {
      logger.error('❌ Error getting question set metadata:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update last played timestamp for question set
   * @param {string} questionSetId - Question set UUID
   * @returns {Promise<Object>} Update result
   */
  async updateQuestionSetLastPlayed(questionSetId) {
    try {
      logger.debug('⏰ Updating question set last_played_at', { questionSetId });

      const { data, error } = await this.db.supabaseAdmin
        .from('question_sets')
        .update({ 
          last_played_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', questionSetId)
        .select();

      if (error) {
        logger.error('❌ Error updating last_played_at:', error);
        return {
          success: false,
          error: error.message
        };
      }

      logger.debug(`✅ Updated last_played_at for question set: ${questionSetId}`);

      return {
        success: true,
        data
      };

    } catch (error) {
      logger.error('❌ Error updating last_played_at:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GameService;
