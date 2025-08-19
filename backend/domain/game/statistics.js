/**
 * Game Statistics Domain Module
 * Pure functions for calculating game statistics without side effects
 */

/**
 * Calculate answer statistics for a question
 * @param {Array} answers - Array of player answers for the current question
 * @param {Object} question - The question object with options
 * @returns {Object} Statistics object with counts and percentages
 */
function calculateAnswerStatistics(answers, question) {
  const stats = {
    totalAnswers: answers.length,
    correctCount: 0,
    optionCounts: question.options.map(() => 0),
    correctPercentage: 0
  };
  
  answers.forEach(answer => {
    if (answer.isCorrect) stats.correctCount++;
    if (answer.selectedOption >= 0 && answer.selectedOption < stats.optionCounts.length) {
      stats.optionCounts[answer.selectedOption]++;
    }
  });
  
  stats.correctPercentage = stats.totalAnswers > 0 ? 
    Math.round((stats.correctCount / stats.totalAnswers) * 100) : 0;
  
  return stats;
}

/**
 * Calculate leaderboard from current player scores
 * @param {Map} players - Map of players with scores and streaks
 * @returns {Array} Sorted leaderboard with ranks
 */
function calculateLeaderboard(players) {
  return Array.from(players.values())
    .map(player => ({
      name: player.name,
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
 * Get current player answer data for a specific player
 * @param {Array} answers - Array of current question answers
 * @param {string} playerName - Name of the player
 * @returns {Object|null} Player's answer data or null if not found
 */
function getCurrentPlayerAnswerData(answers, playerName) {
  const playerAnswer = answers.find(answer => answer.playerName === playerName);
  if (playerAnswer) {
    return {
      selectedOption: playerAnswer.selectedOption,
      isCorrect: playerAnswer.isCorrect,
      points: playerAnswer.points,
      timeTaken: playerAnswer.timeTaken,
      answeredAt: playerAnswer.answeredAt
    };
  }
  return null;
}

module.exports = {
  calculateAnswerStatistics,
  calculateLeaderboard,
  getCurrentPlayerAnswerData
};
