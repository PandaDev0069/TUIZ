/**
 * Game configuration settings
 */
const gameConfig = {
  // Points and scoring configuration
  points: {
    base: 1000,      // Maximum points possible per question
    incorrect: 0,    // Points for wrong answers
    // Question type multipliers
    multipliers: {
      'multiple_choice_4': 1.0,    // Standard 4-option questions
      'multiple_choice_2': 0.8,    // 2-option questions (easier)
      'true_false': 0.8,           // True/False questions (easier)
    }
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
    questionDisplay: 10000,    // Default time for questions (ms)
    transitionDelay: 2000,     // Delay between questions (ms)
    leaderboardUpdate: 500,    // How often to update the leaderboard (ms)
    // Time limits by question type
    byType: {
      'multiple_choice_4': 12000,  // 12 seconds for 4-option
      'multiple_choice_2': 8000,   // 8 seconds for 2-option
      'true_false': 6000,          // 6 seconds for true/false
    }
  },

  // Game settings
  game: {
    maxPlayersPerRoom: 300,    // Maximum players allowed in a room
    minPlayersToStart: 1,      // Minimum players needed to start
  },

  // Question type configurations
  questionTypes: {
    'multiple_choice_4': {
      name: '4択問題',
      description: '4つの選択肢から正解を選ぶ',
      optionCount: 4,
      layout: 'grid-2x2'
    },
    'multiple_choice_2': {
      name: '2択問題', 
      description: '2つの選択肢から正解を選ぶ',
      optionCount: 2,
      layout: 'horizontal'
    },
    'true_false': {
      name: '○×問題',
      description: '正解か不正解かを選ぶ',
      optionCount: 2,
      layout: 'large-buttons'
    }
  }
};

module.exports = gameConfig;
