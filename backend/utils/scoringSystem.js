/**
 * Advanced Scoring System for TUIZ Quiz App - Backend Version
 * 
 * Integrates with existing game settings to provide:
 * - Base points for correct answers (from question.points)
 * - Streak bonus with logarithmic curve (when enabled)
 * - Per-second time bonus (when enabled) - 1% of base points per second saved
 * - Compatible with TUIZ backend architecture
 */

/**
 * Calculate the final score for a quiz question
 * @param {Object} params - Scoring parameters
 * @param {number} params.basePoints - Base points for the question (from question.points)
 * @param {number} params.streakCount - Number of consecutive correct answers
 * @param {number} params.timeTaken - Time taken to answer in seconds
 * @param {number} params.timeLimit - Total time limit for the question in seconds
 * @param {Object} params.gameSettings - Game settings object containing scoring preferences
 * @returns {number} Final score as integer
 */
function calculateScore({ basePoints, streakCount, timeTaken, timeLimit, gameSettings = {} }) {
  // Validate inputs
  if (basePoints <= 0 || streakCount < 0 || timeTaken < 0 || timeLimit <= 0) {
    throw new Error('Invalid scoring parameters');
  }
  
  // If time taken exceeds limit, return 0 (incorrect answer)
  if (timeTaken > timeLimit) {
    return 0;
  }
  
  let finalScore = basePoints;
  let streakBonus = 0;
  let timeBonus = 0;
  
  // Apply streak bonus if enabled
  if (gameSettings.streakBonus) {
    // Calculate streak bonus using logarithmic curve
    // Formula: streakBonus = basePoints * min(log2(streakCount + 1) / 4, 0.6)
    const streakMultiplier = Math.min(Math.log2(streakCount + 1) / 4, 0.6);
    streakBonus = Math.floor(basePoints * streakMultiplier);
    finalScore += streakBonus;
  }
  
  // Apply time bonus if point calculation includes time bonus
  if (gameSettings.pointCalculation === 'time-bonus') {
    // Calculate time bonus based on seconds saved
    const secondsSaved = Math.max(0, timeLimit - timeTaken);
    
    // Award points per second saved: basePoints * 0.01 per second
    // This means saving 10 seconds = 10% bonus, 20 seconds = 20% bonus, etc.
    const pointsPerSecond = basePoints * 0.01;
    timeBonus = Math.floor(secondsSaved * pointsPerSecond);
    
    // Cap the time bonus at 50% of base points to prevent extreme scores
    const maxTimeBonus = Math.floor(basePoints * 0.5);
    timeBonus = Math.min(timeBonus, maxTimeBonus);
    
    finalScore += timeBonus;
  }
  
  return Math.floor(finalScore);
}

/**
 * Get detailed score breakdown for logging and debugging
 * @param {Object} params - Same parameters as calculateScore
 * @returns {Object} Detailed breakdown of score components
 */
function getScoreBreakdown({ basePoints, streakCount, timeTaken, timeLimit, gameSettings = {} }) {
  let streakBonus = 0;
  let timeBonus = 0;
  let timeBonusDescription = 'No time bonus';
  
  // Calculate streak bonus if enabled
  if (gameSettings.streakBonus) {
    const streakMultiplier = Math.min(Math.log2(streakCount + 1) / 4, 0.6);
    streakBonus = Math.floor(basePoints * streakMultiplier);
  }
  
  // Calculate time bonus if enabled
  if (gameSettings.pointCalculation === 'time-bonus') {
    const secondsSaved = Math.max(0, timeLimit - timeTaken);
    
    // Award points per second saved: basePoints * 0.01 per second
    const pointsPerSecond = basePoints * 0.01;
    timeBonus = Math.floor(secondsSaved * pointsPerSecond);
    
    // Cap the time bonus at 50% of base points
    const maxTimeBonus = Math.floor(basePoints * 0.5);
    timeBonus = Math.min(timeBonus, maxTimeBonus);
    
    // Create descriptive message
    if (secondsSaved === 0) {
      timeBonusDescription = 'No time bonus (used full time)';
    } else if (secondsSaved >= timeLimit * 0.75) {
      timeBonusDescription = `Lightning fast! (+${secondsSaved}s saved)`;
    } else if (secondsSaved >= timeLimit * 0.5) {
      timeBonusDescription = `Very quick! (+${secondsSaved}s saved)`;
    } else if (secondsSaved >= timeLimit * 0.25) {
      timeBonusDescription = `Quick answer! (+${secondsSaved}s saved)`;
    } else {
      timeBonusDescription = `Good timing! (+${secondsSaved}s saved)`;
    }
  }
  
  const finalScore = basePoints + streakBonus + timeBonus;
  
  return {
    basePoints,
    streakBonus,
    streakCount,
    timeBonus,
    timeBonusDescription,
    finalScore: Math.floor(finalScore),
    breakdown: {
      base: basePoints,
      streak: streakBonus,
      time: timeBonus,
      total: Math.floor(finalScore)
    },
    bonusesEnabled: {
      streak: gameSettings.streakBonus || false,
      time: gameSettings.pointCalculation === 'time-bonus'
    }
  };
}

/**
 * Main scoring function that integrates with existing TUIZ game flow
 * This replaces the current scoring logic in server.js
 * @param {Object} params - Parameters matching backend structure
 * @param {Object} params.question - Question object with points property
 * @param {Object} params.gameSettings - Game settings from question_set or game
 * @param {Object} params.player - Player object with current streak
 * @param {number} params.timeTaken - Time taken to answer in seconds
 * @param {boolean} params.isCorrect - Whether the answer was correct
 * @returns {Object} Score calculation result
 */
function calculateGameScore({ question, gameSettings, player, timeTaken, isCorrect }) {
  if (!isCorrect) {
    return {
      points: 0,
      newStreak: 0,
      breakdown: null
    };
  }
  
  const basePoints = question.points || gameSettings.basePoints || 100;
  const timeLimit = question.time_limit || gameSettings.questionTime || 30;
  const currentStreak = player.streak || 0;
  
  const points = calculateScore({
    basePoints,
    streakCount: currentStreak,
    timeTaken,
    timeLimit,
    gameSettings
  });
  
  const breakdown = getScoreBreakdown({
    basePoints,
    streakCount: currentStreak,
    timeTaken,
    timeLimit,
    gameSettings
  });
  
  return {
    points,
    newStreak: currentStreak + 1,
    breakdown
  };
}

module.exports = {
  calculateScore,
  getScoreBreakdown,
  calculateGameScore
};
