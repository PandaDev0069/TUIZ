/**
 * End Game Domain Module
 * Handles game completion with side effects (database, emissions, cleanup)
 */

const { 
  prepareGameOverData,
  prepareGameEndState,
  prepareGameResultData,
  getEligiblePlayersForDb,
  preparePlayerRankings,
  cleanupGameTimers 
} = require('./lifecycle');

/**
 * End game with all side effects
 * @param {string} gameCode - Game code
 * @param {Map} activeGames - Active games map
 * @param {Object} gameHub - GameHub instance for emissions
 * @param {Object} io - Socket.IO instance for global events
 * @param {Object} db - Database manager
 * @param {Object} logger - Logger instance
 * @param {Function} updatePlayerRankingsFn - Update player rankings function
 * @param {Function} createGameResultsForPlayersFn - Create game results function
 * @returns {Promise<void>}
 */
async function endGame(gameCode, activeGames, gameHub, io, db, logger, updatePlayerRankingsFn, createGameResultsForPlayersFn) {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;

  // Prevent duplicate endGame calls for the same game
  if (activeGame.status === 'finished' || activeGame._ending) {
    const { isDevelopment, isLocalhost } = require('../config/env').getEnvironment();
    if (isDevelopment || isLocalhost) {
      logger.gameActivity(gameCode, `⚠️ endGame called but already finished/ending`);
    }
    return;
  }

  // Mark game as ending to prevent race conditions
  activeGame._ending = true;

  // Prepare game over data
  const gameOverData = prepareGameOverData(activeGame);
  const scoreboard = gameOverData.scoreboard;

  // Apply final game state updates
  const stateUpdates = prepareGameEndState();
  Object.assign(activeGame, stateUpdates);

  // Clean up timers
  cleanupGameTimers(activeGame);

  const { isDevelopment, isLocalhost } = require('../config/env').getEnvironment();

  // Update database status to 'finished'
  if (activeGame.id && db) {
    try {
      // Update final rankings in database before game ends
      if (updatePlayerRankingsFn) {
        await updatePlayerRankingsFn(activeGame);
      }
      
      const statusResult = await db.updateGameStatus(activeGame.id, 'finished', {
        ended_at: new Date().toISOString(),
        current_players: activeGame.players.size
      });
      
      if (statusResult.success) {
        if (isDevelopment || isLocalhost) {
          logger.database(`✅ Updated database game status to 'finished' for game ${activeGame.id}`);
        }
      } else {
        logger.error(`❌ Failed to update database game status: ${statusResult.error}`);
      }

      // Increment times_played for the question set if this game was based on a question set
      if (activeGame.question_set_id) {
        try {
          const incrementResult = await db.incrementQuestionSetTimesPlayed(activeGame.question_set_id);
          if (incrementResult.success) {
            if (incrementResult.skipped) {
              if (isDevelopment || isLocalhost) {
                logger.database(`⚠️ Skipped times_played increment for question set ${activeGame.question_set_id} (too recent)`);
              }
            } else {
              if (isDevelopment || isLocalhost) {
                logger.database(`✅ Incremented times_played for question set ${activeGame.question_set_id}`);
              }
            }
          } else {
            logger.error(`❌ Failed to increment times_played: ${incrementResult.error}`);
          }
        } catch (incrementError) {
          logger.error('❌ Error incrementing times_played:', incrementError);
        }
      }
    } catch (dbError) {
      logger.error('❌ Database error updating game status:', dbError);
    }
  }

  // Create individual game results for each player
  if (activeGame.id && db && createGameResultsForPlayersFn) {
    try {
      await createGameResultsForPlayersFn(activeGame, scoreboard);
    } catch (resultsError) {
      logger.error('❌ Error creating game results:', resultsError);
    }
  }

  // Send game over event
  gameHub.toRoom(gameCode).emit('game_over', { scoreboard });

  // Update last_played_at for the question set
  if (activeGame.question_set_id && db) {
    try {
      const { error: updateError } = await db.supabaseAdmin
        .from('question_sets')
        .update({ 
          last_played_at: new Date().toISOString()
        })
        .eq('id', activeGame.question_set_id);

      if (updateError) {
        logger.error('❌ Error updating last_played_at:', updateError);
      } else if (isDevelopment || isLocalhost) {
        logger.debug('✅ Updated last_played_at for question set:', activeGame.question_set_id);
      }
    } catch (error) {
      logger.error('❌ Error updating last_played_at:', error);
    }
  }

  // Emit game completion event for dashboard updates
  if (activeGame.question_set_id && activeGame.hostId) {
    io.emit('game_completed', { 
      questionSetId: activeGame.question_set_id,
      hostId: activeGame.hostId,
      gameCode: gameCode,
      playerCount: activeGame.players.size
    });
  }

  if (isDevelopment || isLocalhost) {
    logger.gameActivity(gameCode, `ended. Winner: ${scoreboard[0]?.name || 'No players'}`);
  }

  // Clear the ending flag
  activeGame._ending = false;
  
  // Optional: Remove the game from memory after a delay to prevent memory leaks
  // setTimeout(() => {
  //   activeGames.delete(gameCode);
  //   if (isDevelopment || isLocalhost) {
  //     logger.gameActivity(gameCode, `🗑️ Cleaned up from memory`);
  //   }
  // }, 30000); // Clean up after 30 seconds
}

module.exports = {
  endGame
};
