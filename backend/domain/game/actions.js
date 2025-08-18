/**
 * Game Actions Domain Module
 * Orchestrates pure game logic functions with side effects (hub, db, logger)
 */

const { 
  prepareQuestionData, 
  prepareQuestionState, 
  initializePlayerStreaks,
  prepareQuestionTransition 
} = require('./questionFlow');

const { 
  prepareExplanationData, 
  prepareLeaderboardData, 
  prepareExplanationState,
  shouldShowExplanation 
} = require('./explanation');

const { 
  prepareGameOverData, 
  prepareGameEndState, 
  prepareGameResultData,
  getEligiblePlayersForDb,
  shouldEndGame,
  preparePlayerRankings,
  cleanupGameTimers 
} = require('./lifecycle');

const { 
  calculateLeaderboard, 
  getCurrentPlayerAnswerData 
} = require('./statistics');

/**
 * Send next question with side effects
 * @param {string} gameCode - Game code
 * @param {Map} activeGames - Active games map
 * @param {Object} gameHub - GameHub instance for emissions
 * @param {Object} logger - Logger instance
 * @param {Function} endGameFn - End game function
 * @returns {Promise<void>}
 */
async function sendNextQuestion(gameCode, activeGames, gameHub, logger, endGameFn) {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;

  const questionIndex = activeGame.currentQuestionIndex;
  const question = activeGame.questions[questionIndex];

  if (!question || shouldEndGame(activeGame)) {
    // Game over - send final results
    await endGameFn(gameCode);
    return;
  }

  // Apply pure state updates
  const stateUpdates = prepareQuestionState(question);
  Object.assign(activeGame, stateUpdates);

  // Initialize player streaks if needed
  initializePlayerStreaks(activeGame.players);

  // Prepare question data for emission
  const gameFlowConfig = activeGame.gameFlowConfig || {};
  const questionData = prepareQuestionData(question, questionIndex, activeGame.questions.length, gameFlowConfig);

  // Send question to all players and host
  gameHub.toRoom(gameCode).emit('question', questionData);

  // Logging
  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();
  if (isDevelopment || isLocalhost) {
    logger.debug(`📋 Sent question ${questionIndex + 1} to game ${gameCode} (${Math.round(question.timeLimit/1000)}s): ${question.question.substring(0, 50)}...`);
  }
  
  // Start timer to track remaining time for reconnection
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
  }
  
  activeGame.questionTimer = setInterval(() => {
    if (activeGame.timeRemaining <= 0) {
      clearInterval(activeGame.questionTimer);
      activeGame.isTimerRunning = false;
      return;
    }
    
    activeGame.timeRemaining -= 1000; // Decrease by 1 second
  }, 1000);
}

/**
 * Proceed to next question with side effects
 * @param {string} gameCode - Game code
 * @param {Map} activeGames - Active games map
 * @param {Function} sendNextQuestionFn - Send next question function
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
async function proceedToNextQuestion(gameCode, activeGames, sendNextQuestionFn, logger) {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;
  
  // Prevent double question sending
  if (activeGame.questionInProgress) {
    const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();
    if (isDevelopment || isLocalhost) {
      logger.debug(`⚠️ Question transition already in progress for game ${gameCode}`);
    }
    return;
  }
  
  // Apply pure state updates
  const transitionUpdates = prepareQuestionTransition();
  Object.assign(activeGame, transitionUpdates);
  
  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();
  if (isDevelopment || isLocalhost) {
    logger.debug(`➡️ Proceeding to next question in game ${gameCode}`);
  }
  
  // Clear previous question timer and reset state
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
    activeGame.questionTimer = null;
  }
  activeGame.showingResults = false;
  activeGame.lastExplanationData = null;
  
  // Move to next question
  activeGame.currentQuestionIndex++;
  
  // Send next question or end game
  await sendNextQuestionFn(gameCode);
  
  // Reset the flag after sending the question
  setTimeout(() => {
    if (activeGame) {
      activeGame.questionInProgress = false;
    }
  }, 1000); // 1 second buffer
}

/**
 * Send individual player answer data during explanation/leaderboard
 * @param {Object} activeGame - Current game state
 * @param {Object} currentQuestion - Current question object
 * @param {Object} gameHub - GameHub instance
 * @param {Object} logger - Logger instance
 * @returns {void}
 */
function sendPlayerAnswerData(activeGame, currentQuestion, gameHub, logger) {
  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();
  
  for (const [socketId, player] of activeGame.players) {
    const playerAnswerData = getCurrentPlayerAnswerData(activeGame.currentAnswers, player.name);
    if (playerAnswerData) {
      gameHub.toSocket(socketId).emit('playerAnswerData', {
        questionId: currentQuestion.id,
        ...playerAnswerData
      });
      if (isDevelopment || isLocalhost) {
        logger.debug(`📊 Sent playerAnswerData to ${player.name} (${socketId}) during explanation via GameHub`);
      }
    } else {
      if (isDevelopment || isLocalhost) {
        logger.warn(`⚠️ No answer data found for player ${player.name} when sending explanation data`);
      }
    }
  }
}

/**
 * Handle auto-advance logic for explanations
 * @param {Object} gameSettings - Game settings
 * @param {Object} explanationData - Explanation data with timing
 * @param {Function} proceedToNextQuestionFn - Function to proceed to next question
 * @param {string} gameCode - Game code
 * @param {number} questionIndex - Current question index
 * @param {Object} logger - Logger instance
 * @returns {void}
 */
function handleExplanationAutoAdvance(gameSettings, explanationData, proceedToNextQuestionFn, gameCode, questionIndex, logger) {
  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();

  if (gameSettings.hybridMode) {
    // Hybrid mode: Don't auto-advance after explanations, wait for host
    if (isDevelopment || isLocalhost) {
      logger.debug(`🔄 Hybrid mode: Waiting for host to advance after explanation for question ${questionIndex + 1}`);
    }
  } else if (gameSettings.autoAdvance !== false) {
    // Auto mode: Auto-advance after explanation time
    setTimeout(async () => {
      if (isDevelopment || isLocalhost) {
        logger.debug(`⏭️ Auto mode: Proceeding to next question after explanation for question ${questionIndex + 1}`);
      }
      await proceedToNextQuestionFn(gameCode);
    }, explanationData.explanationTime);
    
    if (isDevelopment || isLocalhost) {
      logger.debug(`⏰ Set explanation timer for ${explanationData.explanationTime}ms for question ${questionIndex + 1}`);
    }
  } else {
    // Manual mode: Wait for host to advance
    if (isDevelopment || isLocalhost) {
      logger.debug(`⏸️ Manual mode: Waiting for host to advance after explanation for question ${questionIndex + 1}`);
    }
  }
}

/**
 * Show question explanation with side effects
 * @param {string} gameCode - Game code
 * @param {Map} activeGames - Active games map
 * @param {Object} gameHub - GameHub instance for emissions
 * @param {Object} logger - Logger instance
 * @param {Object} GameSettingsService - Game settings service
 * @param {Function} proceedToNextQuestionFn - Proceed function for auto-advance
 * @returns {Promise<void>}
 */
async function showQuestionExplanation(gameCode, activeGames, gameHub, logger, GameSettingsService, proceedToNextQuestionFn) {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;
  
  const currentQuestion = activeGame.questions[activeGame.currentQuestionIndex];
  const gameSettings = activeGame.game_settings || {};
  
  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();
  if (isDevelopment || isLocalhost) {
    logger.debug(`💡 Showing explanation for question ${activeGame.currentQuestionIndex + 1} in game ${gameCode}`);
  }
  
  // Calculate current standings
  const leaderboard = calculateLeaderboard(activeGame.players);
  
  // Prepare explanation data
  const explanationData = prepareExplanationData(currentQuestion, activeGame, leaderboard);
  
  // Apply state updates
  const stateUpdates = prepareExplanationState(explanationData);
  Object.assign(activeGame, stateUpdates);
  
  // Clear question timer if running
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
    activeGame.questionTimer = null;
  }
  
  // Send explanation to all players with delay to ensure room membership
  setTimeout(() => {
    gameHub.toRoom(gameCode).emit('showExplanation', explanationData);
    
    if (isDevelopment || isLocalhost) {
      logger.debug(`📊 showExplanation event sent to room ${gameCode} via GameHub`);
    }
  }, 100); // 100ms delay
  
  // Send individual player answer data
  sendPlayerAnswerData(activeGame, currentQuestion, gameHub, logger);

  // Handle auto-advance logic
  handleExplanationAutoAdvance(
    gameSettings, 
    explanationData, 
    proceedToNextQuestionFn, 
    gameCode, 
    activeGame.currentQuestionIndex,
    logger
  );
}

/**
 * Handle auto-advance logic for leaderboards
 * @param {Object} gameSettings - Game settings
 * @param {Object} leaderboardData - Leaderboard data with timing
 * @param {Function} proceedToNextQuestionFn - Function to proceed to next question
 * @param {string} gameCode - Game code
 * @param {number} questionIndex - Current question index
 * @param {Object} logger - Logger instance
 * @returns {void}
 */
function handleLeaderboardAutoAdvance(gameSettings, leaderboardData, proceedToNextQuestionFn, gameCode, questionIndex, logger) {
  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();

  if (gameSettings.hybridMode) {
    // Hybrid mode: Wait for host to advance from leaderboard
    if (isDevelopment || isLocalhost) {
      logger.debug(`🔄 Hybrid mode: Waiting for host to advance after leaderboard for question ${questionIndex + 1}`);
    }
  } else if (gameSettings.autoAdvance !== false) {
    setTimeout(async () => {
      await proceedToNextQuestionFn(gameCode);
    }, leaderboardData.displayTime);
  } else {
    if (isDevelopment || isLocalhost) {
      logger.debug(`⏸️ Manual advance mode - waiting for host to continue`);
    }
  }
}

/**
 * Show intermediate leaderboard with side effects
 * @param {string} gameCode - Game code
 * @param {Map} activeGames - Active games map
 * @param {Object} gameHub - GameHub instance for emissions
 * @param {Object} logger - Logger instance
 * @param {Function} proceedToNextQuestionFn - Proceed function for auto-advance
 * @returns {Promise<void>}
 */
async function showIntermediateLeaderboard(gameCode, activeGames, gameHub, logger, proceedToNextQuestionFn) {
  const activeGame = activeGames.get(gameCode);
  if (!activeGame) return;
  
  const gameSettings = activeGame.game_settings || {};
  
  const { isDevelopment, isLocalhost } = require('../../config/env').getEnvironment();
  if (isDevelopment || isLocalhost) {
    logger.debug(`🏆 Showing intermediate leaderboard for game ${gameCode}`);
  }
  
  // Calculate current standings
  const leaderboard = calculateLeaderboard(activeGame.players);
  const currentQuestion = activeGame.questions[activeGame.currentQuestionIndex];
  
  // Prepare leaderboard data
  const leaderboardData = prepareLeaderboardData(activeGame, leaderboard, currentQuestion);
  
  // Apply state updates (reuse explanation state structure)
  const stateUpdates = prepareExplanationState(leaderboardData);
  Object.assign(activeGame, stateUpdates);
  
  // Clear question timer if running
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
    activeGame.questionTimer = null;
  }
  
  // Send leaderboard to all players immediately
  gameHub.toRoom(gameCode).emit('showLeaderboard', leaderboardData);
  
  // Send individual player answer data
  sendPlayerAnswerData(activeGame, currentQuestion, gameHub, logger);

  // Handle auto-advance logic
  handleLeaderboardAutoAdvance(
    gameSettings, 
    leaderboardData, 
    proceedToNextQuestionFn, 
    gameCode, 
    activeGame.currentQuestionIndex,
    logger
  );
}

module.exports = {
  sendNextQuestion,
  proceedToNextQuestion,
  showQuestionExplanation,
  showIntermediateLeaderboard
};
