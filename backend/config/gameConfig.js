/**
 * Game configuration settings
 */
const gameConfig = {
  // Points and scoring configuration
  points: {
    base: 1000,      // Maximum points possible per question
    incorrect: 0,    // Points for wrong answers
  },
  
  // Streak multipliers
  streak: {
    none: 1,         // No streak
    x2: 1.2,         // 2 correct answers in a row
    x3: 1.3,         // 3 correct answers in a row
    x4: 1.4,         // 4 correct answers in a row
    x5: 1.5,         // 5+ correct answers in a row
    maxMultiplier: 1.5, // Maximum streak multiplier
  },
  
  // Time settings
  timing: {
    questionDisplay: 10000,    // How long each question is displayed (ms)
    transitionDelay: 2000,     // Delay between questions (ms)
    leaderboardUpdate: 500,    // How often to update the leaderboard (ms)
  },

  // Game settings
  game: {
    maxPlayersPerRoom: 300,    // Maximum players allowed in a room
    minPlayersToStart: 1,      // Minimum players needed to start
  }
};

module.exports = gameConfig;
