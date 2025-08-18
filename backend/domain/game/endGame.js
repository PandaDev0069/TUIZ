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
 * Check if game can end (prevent duplicate calls)
 * @param {Object} activeGame - Current game state
 * @param {string} gameCode - Game code for logging
 * @param {Object} logger - Logger instance
 * @returns {boolean} Whether the game can end
 */
function canEndGame(activeGame, gameCode, logger) {
  if (activeGame.status === 'finished' || activeGame._ending) {
    const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();
    if (isDevelopment || isLocalhost) {
      logger.gameActivity(gameCode, `⚠️ endGame called but already finished/ending`);
    }
    return false;
  }
  return true;
}

/**
 * Update database game status and related data
 * @param {Object} activeGame - Current game state
 * @param {Object} db - Database manager
 * @param {Object} logger - Logger instance
 * @param {Function} updatePlayerRankingsFn - Update rankings function
 * @returns {Promise<void>}
 */
async function updateGameStatusInDatabase(activeGame, db, logger, updatePlayerRankingsFn) {
  if (!activeGame.id || !db) return;

  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();

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

    // Handle question set times_played increment
    await handleQuestionSetIncrement(activeGame, db, logger);

  } catch (dbError) {
    logger.error('❌ Database error updating game status:', dbError);
  }
}

/**
 * Handle incrementing question set times_played
 * @param {Object} activeGame - Current game state
 * @param {Object} db - Database manager
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
async function handleQuestionSetIncrement(activeGame, db, logger) {
  if (!activeGame.question_set_id) return;

  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();

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

/**
 * Update last_played_at for question set
 * @param {Object} activeGame - Current game state
 * @param {Object} gameService - GameService instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
async function updateQuestionSetLastPlayed(activeGame, gameService, logger) {
  if (!activeGame.question_set_id || !gameService) return;

  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();

  try {
    const result = await gameService.updateQuestionSetLastPlayed(activeGame.question_set_id);

    if (!result.success) {
      logger.error('❌ Error updating last_played_at:', result.error);
    } else if (isDevelopment || isLocalhost) {
      logger.debug('✅ Updated last_played_at for question set:', activeGame.question_set_id);
    }
  } catch (error) {
    logger.error('❌ Error updating last_played_at:', error);
  }
}

/**
 * Emit game completion events
 * @param {Object} activeGame - Current game state
 * @param {string} gameCode - Game code
 * @param {Object} io - Socket.IO instance for global events
 * @param {Array} scoreboard - Final scoreboard
 * @param {Object} logger - Logger instance
 * @returns {void}
 */
function emitGameCompletionEvents(activeGame, gameCode, io, scoreboard, logger) {
  // Emit game completion event for dashboard updates
  if (activeGame.question_set_id && activeGame.hostId) {
    io.emit('game_completed', { 
      questionSetId: activeGame.question_set_id,
      hostId: activeGame.hostId,
      gameCode: gameCode,
      playerCount: activeGame.players.size
    });
  }

  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();
  if (isDevelopment || isLocalhost) {
    logger.gameActivity(gameCode, `ended. Winner: ${scoreboard[0]?.name || 'No players'}`);
  }
}

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

  // Check if game can end (prevent duplicates)
  if (!canEndGame(activeGame, gameCode, logger)) return;

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

  // Update database status
  await updateGameStatusInDatabase(activeGame, db, logger, updatePlayerRankingsFn);

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
  const GameService = require('../../services/GameService');
  const gameService = new GameService(db);
  await updateQuestionSetLastPlayed(activeGame, gameService, logger);

  // Emit completion events
  emitGameCompletionEvents(activeGame, gameCode, io, scoreboard, logger);

  // Clear the ending flag
  activeGame._ending = false;
}

module.exports = {
  endGame
};
