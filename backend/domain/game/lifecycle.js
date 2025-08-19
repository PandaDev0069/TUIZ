/**
 * Game Lifecycle Domain Module
 * Pure functions for managing game lifecycle events without side effects
 */

const { calculateLeaderboard } = require('./statistics');

/**
 * Prepare game over data
 * @param {Object} activeGame - Current game state
 * @returns {Object} Game over data ready for emission
 */
function prepareGameOverData(activeGame) {
  const scoreboard = calculateLeaderboard(activeGame.players);
  
  return {
    scoreboard,
    gameId: activeGame.id,
    gameCode: activeGame.game_code,
    totalQuestions: activeGame.totalQuestions || activeGame.questions?.length || 0,
    playerCount: activeGame.players.size,
    endedAt: new Date().toISOString()
  };
}

/**
 * Prepare final game state updates
 * @returns {Object} State updates for game completion
 */
function prepareGameEndState() {
  return {
    status: 'finished',
    ended_at: new Date().toISOString(),
    isTimerRunning: false,
    showingResults: false,
    _ending: false // Clear ending flag
  };
}

/**
 * Calculate player statistics for game results
 * @param {Object} player - Player object
 * @param {Object} activeGame - Game state
 * @returns {Object} Player statistics for database
 */
function calculatePlayerStats(player, activeGame) {
  const totalQuestions = activeGame.totalQuestions || activeGame.questions?.length || 0;
  const totalCorrect = player.correctAnswers || 0;
  const completionPercentage = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100) : 0;
  
  // Calculate average response time (if available)
  const responseTimes = player.responseTimes || [];
  const averageResponseTime = responseTimes.length > 0 
    ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
    : 0;

  return {
    totalQuestions,
    totalCorrect,
    completionPercentage: Math.round(completionPercentage * 100) / 100, // Round to 2 decimal places
    averageResponseTime,
    longestStreak: player.longestStreak || player.streak || 0
  };
}

/**
 * Prepare database game result data
 * @param {Object} activeGame - Current game state
 * @param {Object} player - Player object
 * @param {Object} scoreboardEntry - Player's scoreboard entry with rank
 * @returns {Object} Game result data for database insertion
 */
function prepareGameResultData(activeGame, player, scoreboardEntry) {
  const stats = calculatePlayerStats(player, activeGame);
  const finalRank = scoreboardEntry ? scoreboardEntry.rank : 0;

  return {
    game_id: activeGame.id,
    player_id: player.dbId, // Use game_players.id (foreign key reference)
    final_score: player.score || 0,
    final_rank: finalRank,
    total_correct: stats.totalCorrect,
    total_questions: stats.totalQuestions,
    average_response_time: stats.averageResponseTime,
    longest_streak: stats.longestStreak,
    completion_percentage: stats.completionPercentage
  };
}

/**
 * Filter players eligible for database operations
 * @param {Map} players - Players map
 * @returns {Array} Players with database IDs
 */
function getEligiblePlayersForDb(players) {
  return Array.from(players.values()).filter(player => player.dbId);
}

/**
 * Check if game should end (no more questions)
 * @param {Object} activeGame - Current game state
 * @returns {boolean} Whether the game should end
 */
function shouldEndGame(activeGame) {
  const questionIndex = activeGame.currentQuestionIndex;
  return questionIndex >= activeGame.questions.length;
}

/**
 * Prepare player ranking data for database update
 * @param {Object} activeGame - Current game state
 * @returns {Array} Players with calculated rankings
 */
function preparePlayerRankings(activeGame) {
  return Array.from(activeGame.players.values())
    .filter(player => player.playerId) // Only include players with database IDs
    .map(player => ({
      playerId: player.playerId,
      playerName: player.name,
      score: player.score || 0,
      streak: player.streak || 0
    }))
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));
}

/**
 * Clean up timers and state for game end
 * @param {Object} activeGame - Current game state (will be mutated)
 * @returns {void} Mutates game state to clean up timers
 */
function cleanupGameTimers(activeGame) {
  // Clean up timers
  if (activeGame.questionTimer) {
    clearInterval(activeGame.questionTimer);
    activeGame.questionTimer = null;
  }
  
  // Clean up explanation timer
  if (activeGame.explanationTimer) {
    clearTimeout(activeGame.explanationTimer);
    activeGame.explanationTimer = null;
  }
  
  // Clean up leaderboard timer
  if (activeGame.leaderboardTimer) {
    clearTimeout(activeGame.leaderboardTimer);
    activeGame.leaderboardTimer = null;
  }
}

module.exports = {
  prepareGameOverData,
  prepareGameEndState,
  calculatePlayerStats,
  prepareGameResultData,
  getEligiblePlayersForDb,
  shouldEndGame,
  preparePlayerRankings,
  cleanupGameTimers
};
