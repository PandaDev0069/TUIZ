/**
 * ResultsService
 * 
 * Service for managing game results, final scores, and player performance data.
 * Handles creation and storage of final game results for analytics and history.
 */

const logger = require('../utils/logger');

class ResultsService {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  /**
   * Create final game results for all players
   * @param {Object} activeGame - Active game object
   * @param {Array} scoreboard - Final sorted scoreboard
   * @returns {Promise<Object>} Results creation summary
   */
  async createGameResultsForPlayers(activeGame, scoreboard) {
    try {
      logger.debug('📊 Creating game results for players', {
        gameId: activeGame.id,
        gameCode: activeGame.gameCode,
        playerCount: scoreboard.length
      });

      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };

      // Only process players with database IDs
      const playersWithIds = scoreboard.filter(player => player.dbId);
      logger.debug(`📊 Processing results for ${playersWithIds.length} players with database IDs`);

      // Create results for each player
      const resultPromises = playersWithIds.map(async (player) => {
        try {
          // First verify the player still exists in game_players table
          const { data: playerExists, error: checkError } = await this.db.supabaseAdmin
            .from('game_players')
            .select('id')
            .eq('id', player.dbId)
            .single();

          if (checkError || !playerExists) {
            logger.warn(`⚠️ Player ${player.name} (${player.dbId}) not found in game_players table, skipping result creation`);
            results.failed++;
            return { success: false, error: 'Player not found in game_players', playerId: player.id };
          }

          logger.debug(`✅ Verified player ${player.name} exists in game_players table with ID: ${player.dbId}`);

          // Determine final rank (handle ties)
          let finalRank = player.rank;
          if (player.isTied && player.tiedPlayers && player.tiedPlayers.length > 1) {
            // For tied players, use the best rank in the tied group
            const tiedRanks = player.tiedPlayers.map(p => p.rank);
            finalRank = Math.min(...tiedRanks);
            logger.debug(`👥 Handling tie for player ${player.name}: Original rank ${player.rank}, Final rank ${finalRank}`);
          }

          // Calculate accuracy percentage
          const accuracy = player.questionsAnswered > 0 ? 
            Math.round((player.correctAnswers / player.questionsAnswered) * 100) : 0;

          // Prepare result data
          const resultData = {
            game_id: activeGame.id,
            player_id: player.dbId, // Use game_players.id (foreign key reference)
            final_score: player.score || 0,
            final_rank: finalRank,
            questions_answered: player.questionsAnswered || 0,
            questions_correct: player.correctAnswers || 0,
            accuracy_percentage: accuracy,
            streak: player.streak || 0,
            time_played: player.timeSpent || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Insert into database
          const { data, error } = await this.db.supabaseAdmin
            .from('game_results')
            .insert([resultData])
            .select();

          if (error) {
            logger.error(`❌ Failed to create result for player ${player.name}:`, error);
            results.failed++;
            results.errors.push({
              player: player.name,
              error: error.message
            });
            return { success: false, error: error.message, playerId: player.id };
          } else {
            logger.database(`✅ Created game result for player ${player.name} (Score: ${player.score}, Rank: ${finalRank})`);
            results.successful++;
            return { success: true, data, playerId: player.id };
          }

        } catch (error) {
          logger.error(`❌ Error creating result for player ${player.name}:`, error);
          results.failed++;
          results.errors.push({
            player: player.name,
            error: error.message
          });
          return { success: false, error: error.message, playerId: player.id };
        }
      });

      // Wait for all result creations to complete
      const resultOutcomes = await Promise.all(resultPromises);

      logger.database(`📊 Game results creation summary: ${results.successful} successful, ${results.failed} failed`);

      if (results.errors.length > 0) {
        logger.error('❌ Errors during result creation:', results.errors);
      }

      return {
        success: results.failed === 0,
        results,
        outcomes: resultOutcomes
      };

    } catch (error) {
      logger.error('❌ Error in createGameResultsForPlayers:', error);
      return {
        success: false,
        error: error.message,
        results: { successful: 0, failed: scoreboard.length, errors: [error.message] }
      };
    }
  }

  /**
   * Verify player exists in game_players table
   * @param {string|number} playerDbId - Database ID from game_players table
   * @returns {Promise<Object>} Verification result
   */
  async verifyPlayerExists(playerDbId) {
    try {
      const { data: playerExists, error: checkError } = await this.db.supabaseAdmin
        .from('game_players')
        .select('id, player_name')
        .eq('id', playerDbId)
        .single();

      if (checkError) {
        return {
          success: false,
          exists: false,
          error: checkError.message
        };
      }

      return {
        success: true,
        exists: !!playerExists,
        data: playerExists
      };

    } catch (error) {
      return {
        success: false,
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Get game results by game ID
   * @param {number} gameId - Database game ID
   * @returns {Promise<Object>} Game results data
   */
  async getGameResults(gameId) {
    try {
      logger.debug('📊 Fetching game results', { gameId });

      const { data: results, error } = await this.db.supabaseAdmin
        .from('game_results')
        .select(`
          *,
          game_players:player_id (
            player_name,
            user_id
          )
        `)
        .eq('game_id', gameId)
        .order('final_rank');

      if (error) {
        logger.error('❌ Error fetching game results:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      logger.debug(`✅ Retrieved ${results?.length || 0} game results for game ${gameId}`);

      return {
        success: true,
        data: results || []
      };

    } catch (error) {
      logger.error('❌ Error getting game results:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get player statistics across all games
   * @param {string} userId - User ID to get stats for
   * @returns {Promise<Object>} Player statistics
   */
  async getPlayerStatistics(userId) {
    try {
      logger.debug('📈 Fetching player statistics', { userId });

      const { data: stats, error } = await this.db.supabaseAdmin
        .from('game_results')
        .select(`
          final_score,
          final_rank,
          questions_answered,
          questions_correct,
          accuracy_percentage,
          streak,
          game_players!inner (
            user_id
          )
        `)
        .eq('game_players.user_id', userId);

      if (error) {
        logger.error('❌ Error fetching player statistics:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      // Calculate aggregate statistics
      const gamesPlayed = stats?.length || 0;
      
      if (gamesPlayed === 0) {
        return {
          success: true,
          data: {
            gamesPlayed: 0,
            totalScore: 0,
            averageScore: 0,
            bestRank: null,
            averageRank: 0,
            totalQuestionsAnswered: 0,
            totalQuestionsCorrect: 0,
            averageAccuracy: 0,
            bestStreak: 0
          }
        };
      }

      const totalScore = stats.reduce((sum, game) => sum + (game.final_score || 0), 0);
      const averageScore = Math.round(totalScore / gamesPlayed);
      const bestRank = Math.min(...stats.map(game => game.final_rank || Infinity));
      const averageRank = Math.round(stats.reduce((sum, game) => sum + (game.final_rank || 0), 0) / gamesPlayed);
      const totalQuestionsAnswered = stats.reduce((sum, game) => sum + (game.questions_answered || 0), 0);
      const totalQuestionsCorrect = stats.reduce((sum, game) => sum + (game.questions_correct || 0), 0);
      const averageAccuracy = Math.round(stats.reduce((sum, game) => sum + (game.accuracy_percentage || 0), 0) / gamesPlayed);
      const bestStreak = Math.max(...stats.map(game => game.streak || 0));

      const playerStats = {
        gamesPlayed,
        totalScore,
        averageScore,
        bestRank: bestRank === Infinity ? null : bestRank,
        averageRank,
        totalQuestionsAnswered,
        totalQuestionsCorrect,
        averageAccuracy,
        bestStreak
      };

      logger.debug(`✅ Calculated player statistics for ${userId}:`, playerStats);

      return {
        success: true,
        data: playerStats
      };

    } catch (error) {
      logger.error('❌ Error calculating player statistics:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get leaderboard for a specific game
   * @param {number} gameId - Database game ID
   * @param {number} limit - Maximum number of results to return
   * @returns {Promise<Object>} Leaderboard data
   */
  async getGameLeaderboard(gameId, limit = 10) {
    try {
      logger.debug('🏆 Fetching game leaderboard', { gameId, limit });

      const { data: leaderboard, error } = await this.db.supabaseAdmin
        .from('game_results')
        .select(`
          final_score,
          final_rank,
          questions_correct,
          accuracy_percentage,
          streak,
          game_players:player_id (
            player_name,
            user_id
          )
        `)
        .eq('game_id', gameId)
        .order('final_rank')
        .limit(limit);

      if (error) {
        logger.error('❌ Error fetching game leaderboard:', error);
        return {
          success: false,
          error: error.message,
          data: []
        };
      }

      logger.debug(`✅ Retrieved leaderboard with ${leaderboard?.length || 0} entries for game ${gameId}`);

      return {
        success: true,
        data: leaderboard || []
      };

    } catch (error) {
      logger.error('❌ Error getting game leaderboard:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

module.exports = ResultsService;
