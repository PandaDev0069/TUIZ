/**
 * Question Type Mapping Configuration
 * Maps between database enums and game formats
 */

const QUESTION_TYPES = {
  // Database types to game types
  DATABASE_TO_GAME: {
    'multiple_choice': 'multiple_choice_4', // Default to 4 options
    'true_false': 'true_false',
    'free_text': 'free_text'
  },
  
  // Game types to database types
  GAME_TO_DATABASE: {
    'multiple_choice_4': 'multiple_choice',
    'multiple_choice_3': 'multiple_choice',
    'multiple_choice_2': 'multiple_choice',
    'true_false': 'true_false',
    'free_text': 'free_text'
  },
  
  // Supported game question types with their configurations
  GAME_TYPES_CONFIG: {
    'multiple_choice_4': {
      name: '4択問題',
      description: '4つの選択肢から正解を選ぶ',
      optionCount: 4,
      layout: 'grid-2x2',
      difficulty: 1.0,
      defaultTimeLimit: 12000, // 12 seconds
      icon: '📝'
    },
    'multiple_choice_3': {
      name: '3択問題',
      description: '3つの選択肢から正解を選ぶ',
      optionCount: 3,
      layout: 'vertical',
      difficulty: 0.9,
      defaultTimeLimit: 10000, // 10 seconds
      icon: '📝'
    },
    'multiple_choice_2': {
      name: '2択問題',
      description: '2つの選択肢から正解を選ぶ',
      optionCount: 2,
      layout: 'horizontal',
      difficulty: 0.8,
      defaultTimeLimit: 8000, // 8 seconds
      icon: '📝'
    },
    'true_false': {
      name: '○×問題',
      description: '正解か不正解かを選ぶ',
      optionCount: 2,
      layout: 'large-buttons',
      difficulty: 0.8,
      defaultTimeLimit: 6000, // 6 seconds
      icon: '✓'
    },
    'free_text': {
      name: '記述問題',
      description: '自由記述で回答する',
      optionCount: 0,
      layout: 'text-input',
      difficulty: 1.5,
      defaultTimeLimit: 30000, // 30 seconds
      icon: '✏️'
    }
  },
  
  // Database enum types (for reference)
  DATABASE_ENUM_TYPES: [
    'multiple_choice',
    'true_false',
    'free_text'
  ],
  
  // Supported layouts for questions
  LAYOUTS: {
    'grid-2x2': {
      name: '2x2 Grid',
      description: '2列2行のグリッドレイアウト',
      suitableFor: ['multiple_choice_4'],
      cssClass: 'question-layout-grid-2x2'
    },
    'vertical': {
      name: 'Vertical List',
      description: '縦並びリストレイアウト',
      suitableFor: ['multiple_choice_3'],
      cssClass: 'question-layout-vertical'
    },
    'horizontal': {
      name: 'Horizontal',
      description: '横並びレイアウト',
      suitableFor: ['multiple_choice_2'],
      cssClass: 'question-layout-horizontal'
    },
    'large-buttons': {
      name: 'Large Buttons',
      description: '大きなボタンレイアウト',
      suitableFor: ['true_false'],
      cssClass: 'question-layout-large-buttons'
    },
    'text-input': {
      name: 'Text Input',
      description: 'テキスト入力レイアウト',
      suitableFor: ['free_text'],
      cssClass: 'question-layout-text-input'
    }
  }
};

/**
 * Helper functions for question type handling
 */
const QuestionTypeUtils = {
  /**
   * Get game type from database type and answer count
   * @param {string} dbType - Database question type
   * @param {number} answerCount - Number of answers
   * @returns {string} - Game question type
   */
  getGameType(dbType, answerCount = 4) {
    if (dbType === 'true_false') {
      return 'true_false';
    }
    
    if (dbType === 'multiple_choice') {
      switch (answerCount) {
        case 2: return 'multiple_choice_2';
        case 3: return 'multiple_choice_3';
        case 4: return 'multiple_choice_4';
        default: return 'multiple_choice_4'; // Default
      }
    }
    
    return QUESTION_TYPES.DATABASE_TO_GAME[dbType] || 'multiple_choice_4';
  },

  /**
   * Get database type from game type
   * @param {string} gameType - Game question type
   * @returns {string} - Database question type
   */
  getDatabaseType(gameType) {
    return QUESTION_TYPES.GAME_TO_DATABASE[gameType] || 'multiple_choice';
  },

  /**
   * Get configuration for a game question type
   * @param {string} gameType - Game question type
   * @returns {Object} - Configuration object
   */
  getTypeConfig(gameType) {
    return QUESTION_TYPES.GAME_TYPES_CONFIG[gameType] || QUESTION_TYPES.GAME_TYPES_CONFIG['multiple_choice_4'];
  },

  /**
   * Get layout information for a question type
   * @param {string} gameType - Game question type
   * @returns {Object} - Layout configuration
   */
  getLayoutConfig(gameType) {
    const typeConfig = this.getTypeConfig(gameType);
    return QUESTION_TYPES.LAYOUTS[typeConfig.layout] || QUESTION_TYPES.LAYOUTS['grid-2x2'];
  },

  /**
   * Validate if a question type is supported
   * @param {string} questionType - Question type to validate
   * @param {string} context - 'database' or 'game'
   * @returns {boolean} - True if supported
   */
  isValidType(questionType, context = 'game') {
    if (context === 'database') {
      return QUESTION_TYPES.DATABASE_ENUM_TYPES.includes(questionType);
    }
    return Object.keys(QUESTION_TYPES.GAME_TYPES_CONFIG).includes(questionType);
  },

  /**
   * Get all supported types for a context
   * @param {string} context - 'database' or 'game'
   * @returns {Array} - Array of supported types
   */
  getSupportedTypes(context = 'game') {
    if (context === 'database') {
      return [...QUESTION_TYPES.DATABASE_ENUM_TYPES];
    }
    return Object.keys(QUESTION_TYPES.GAME_TYPES_CONFIG);
  },

  /**
   * Get difficulty multiplier for a question type
   * @param {string} gameType - Game question type
   * @returns {number} - Difficulty multiplier
   */
  getDifficultyMultiplier(gameType) {
    const config = this.getTypeConfig(gameType);
    return config.difficulty || 1.0;
  },

  /**
   * Get default time limit for a question type
   * @param {string} gameType - Game question type
   * @returns {number} - Time limit in milliseconds
   */
  getDefaultTimeLimit(gameType) {
    const config = this.getTypeConfig(gameType);
    return config.defaultTimeLimit || 10000;
  },

  /**
   * Get display information for a question type
   * @param {string} gameType - Game question type
   * @returns {Object} - Display information
   */
  getDisplayInfo(gameType) {
    const config = this.getTypeConfig(gameType);
    return {
      name: config.name,
      description: config.description,
      icon: config.icon,
      optionCount: config.optionCount
    };
  },

  /**
   * Format question type for display
   * @param {string} gameType - Game question type
   * @returns {string} - Formatted display name
   */
  formatDisplayName(gameType) {
    const config = this.getTypeConfig(gameType);
    return `${config.icon} ${config.name}`;
  }
};

module.exports = {
  QUESTION_TYPES,
  QuestionTypeUtils
};
