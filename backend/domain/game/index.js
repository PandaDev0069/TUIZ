/**
 * Game Domain Module Index
 * 
 * This module represents the extracted pure game logic from server.js as part
 * of Checkpoint 5: Extract pure game logic.
 * 
 * EXTRACTION SUMMARY:
 * ===================
 * 
 * The following functions have been extracted from server.js into domain modules:
 * 
 * 1. statistics.js - Pure calculation functions:
 *    - calculateAnswerStatistics(answers, question)
 *    - calculateLeaderboard(players)
 *    - getCurrentPlayerAnswerData(answers, playerName)
 * 
 * 2. questionFlow.js - Question state and flow functions:
 *    - prepareQuestionData(question, index, total, config)
 *    - prepareQuestionState(question)
 *    - initializePlayerStreaks(players)
 *    - shouldProceedToNext(activeGame)
 *    - prepareQuestionTransition()
 * 
 * 3. explanation.js - Explanation and leaderboard data preparation:
 *    - prepareExplanationData(question, game, leaderboard)
 *    - prepareLeaderboardData(game, leaderboard, question)
 *    - getCorrectAnswerText(question)
 *    - prepareExplanationState(explanationData)
 *    - shouldShowExplanation(gameSettings, question)
 * 
 * 4. lifecycle.js - Game lifecycle and database operations:
 *    - prepareGameOverData(activeGame)
 *    - prepareGameEndState()
 *    - calculatePlayerStats(player, activeGame)
 *    - prepareGameResultData(activeGame, player, scoreboardEntry)
 *    - getEligiblePlayersForDb(players)
 *    - shouldEndGame(activeGame)
 *    - preparePlayerRankings(activeGame)
 *    - cleanupGameTimers(activeGame)
 * 
 * 5. actions.js - Orchestration functions with side effects:
 *    - sendNextQuestion(gameCode, activeGames, gameHub, logger, endGameFn)
 *    - proceedToNextQuestion(gameCode, activeGames, sendNextQuestionFn, logger)
 *    - showQuestionExplanation(...) 
 *    - showIntermediateLeaderboard(...)
 * 
 * 6. endGame.js - Game completion with all side effects:
 *    - endGame(gameCode, activeGames, gameHub, io, db, logger, ...)
 * 
 * DESIGN PRINCIPLES:
 * ==================
 * 
 * - **Pure functions** where possible: Functions in statistics.js, questionFlow.js, 
 *   explanation.js, and lifecycle.js contain no side effects and are easily testable
 * 
 * - **Dependency injection**: Side effects (gameHub, db, logger, io) are passed as
 *   arguments rather than being imported directly within domain modules
 * 
 * - **Single responsibility**: Each module has a clear, focused purpose
 * 
 * - **Backward compatibility**: server.js maintains wrapper functions that delegate
 *   to domain modules, preserving existing behavior
 * 
 * BENEFITS:
 * =========
 * 
 * 1. **Testability**: Pure functions can be unit tested easily
 * 2. **Modularity**: Logic is organized by domain concern
 * 3. **Reusability**: Functions can be reused in different contexts
 * 4. **Maintainability**: Smaller, focused modules are easier to understand
 * 5. **No behavior change**: Existing functionality is preserved exactly
 * 
 * NEXT STEPS (Future Checkpoints):
 * ================================
 * 
 * - Checkpoint 6: Extract service layer (GameService, ResultsService)
 * - Checkpoint 7: Add DTOs and validation
 * - Add unit tests for domain functions
 * - Consider state machine for game flow transitions
 */

// Main entry point - currently for documentation purposes
// Individual modules are imported directly where needed

module.exports = {
  // Re-export key modules for convenience
  statistics: require('./statistics'),
  questionFlow: require('./questionFlow'),
  explanation: require('./explanation'),
  lifecycle: require('./lifecycle'),
  actions: require('./actions'),
  endGame: require('./endGame')
};
