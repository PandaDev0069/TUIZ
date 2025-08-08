/**
 * GameSettingsService.js
 * 
 * Service for applying game settings      // Create game flow configuration
      const gameFlowConfig = this.createGameFlowConfig(gameSettings);

      if (isDevelopment) {
        console.log('✅ Game settings applied successfully', {
          questionsProcessed: enhancedQuestions.length,
          averageTimeLimit: Math.round(enhancedQuestions.reduce((sum, q) => sum + q.timeLimit, 0) / enhancedQuestions.length / 1000),
          showExplanations: gameSettings.showExplanations,
          autoAdvance: gameSettings.autoAdvance
        });
      }lay mechanics.
 * Handles timing, explanations, scoring, and game flow configuration.
 */

const gameConfig = require('../config/gameConfig');

// Debug: Check gameConfig immediately after import (development only)
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
if (isDevelopment) {
  console.log('🔍 GameSettingsService loaded gameConfig:', {
    hasDefaults: !!gameConfig.defaults,
    configKeys: Object.keys(gameConfig),
    defaultsStructure: gameConfig.defaults ? Object.keys(gameConfig.defaults) : 'undefined'
  });
}

class GameSettingsService {
  /**
   * Apply game settings to a question set for gameplay
   * @param {Object} settings - Game settings from database
   * @param {Array} questions - Array of questions to apply settings to
   * @returns {Object} Enhanced questions with settings applied
   */
  static applySettingsToGame(settings, questions) {
    try {
      if (isDevelopment) {
        console.log('🎯 Applying game settings to questions...', {
          settingsCount: Object.keys(settings).length,
          questionsCount: questions.length
        });
      }

      // Get default values from game config
      const defaults = gameConfig.defaults;
      
      if (isDevelopment) {
        console.log('🔍 GameConfig structure:', {
          hasDefaults: !!defaults,
          gameConfigKeys: Object.keys(gameConfig),
          defaultsKeys: defaults ? Object.keys(defaults) : 'N/A'
        });
      }

      // Fallback defaults if gameConfig.defaults is not available
      const fallbackDefaults = {
        maxPlayers: 50,
        autoAdvance: true,
        showExplanations: true,
        explanationTime: 10,
        showLeaderboard: true,
        useCustomTiming: false,
        questionTime: 30,
        pointCalculation: 'time-bonus',
        streakBonus: true,
        basePoints: 1000,
        showProgress: true,
        showCorrectAnswer: true,
        allowAnswerChange: false,
        spectatorMode: false
      };

      const finalDefaults = defaults || fallbackDefaults;

      // Parse and validate settings
      const gameSettings = this.parseGameSettings(settings, finalDefaults);
      
      // Apply settings to each question
      const enhancedQuestions = questions.map((question, index) => {
        return this.applySettingsToQuestion(question, gameSettings, index);
      });

      // Create game flow configuration
      const gameFlowConfig = this.createGameFlowConfig(gameSettings);

      console.log('✅ Game settings applied successfully', {
        questionsProcessed: enhancedQuestions.length,
        averageTimeLimit: Math.round(enhancedQuestions.reduce((sum, q) => sum + q.timeLimit, 0) / enhancedQuestions.length / 1000),
        showExplanations: gameFlowConfig.showExplanations,
        autoAdvance: gameFlowConfig.autoAdvance
      });

      return {
        success: true,
        questions: enhancedQuestions,
        gameFlowConfig,
        gameSettings: gameSettings,
        summary: {
          totalQuestions: enhancedQuestions.length,
          averageTimeLimit: Math.round(enhancedQuestions.reduce((sum, q) => sum + q.timeLimit, 0) / enhancedQuestions.length / 1000),
          showExplanations: gameFlowConfig.showExplanations,
          explanationTime: gameFlowConfig.explanationTime,
          autoAdvance: gameFlowConfig.autoAdvance,
          pointCalculation: gameSettings.pointCalculation
        }
      };

    } catch (error) {
      console.error('❌ Error applying game settings:', error);
      return {
        success: false,
        error: error.message,
        questions: questions, // Return original questions as fallback
        gameFlowConfig: this.createDefaultGameFlowConfig()
      };
    }
  }

  /**
   * Parse and validate game settings with defaults
   * @param {Object} settings - Raw settings from database
   * @param {Object} defaults - Default values from config
   * @returns {Object} Validated settings
   */
  static parseGameSettings(settings, defaults) {
    const parsed = {
      // Player Management
      maxPlayers: this.validateNumber(settings.maxPlayers, defaults.maxPlayers, 2, 100),
      
      // Game Flow
      autoAdvance: this.validateBoolean(settings.autoAdvance, defaults.autoAdvance),
      showExplanations: this.validateBoolean(settings.showExplanations, defaults.showExplanations),
      explanationTime: this.validateNumber(settings.explanationTime, defaults.explanationTime, 5, 120),
      showLeaderboard: this.validateBoolean(settings.showLeaderboard, defaults.showLeaderboard),
      
      // Timing
      useCustomTiming: this.validateBoolean(settings.useCustomTiming, false),
      questionTime: this.validateNumber(settings.questionTime, defaults.questionTime, 5, 300),
      
      // Scoring
      pointCalculation: this.validateEnum(settings.pointCalculation, defaults.pointCalculation, ['fixed', 'time-bonus', 'streak-bonus']),
      streakBonus: this.validateBoolean(settings.streakBonus, defaults.streakBonus),
      basePoints: this.validateNumber(settings.basePoints, defaults.basePoints, 100, 10000),
      
      // Display Options
      showProgress: this.validateBoolean(settings.showProgress, defaults.showProgress),
      showCorrectAnswer: this.validateBoolean(settings.showCorrectAnswer, defaults.showCorrectAnswer),
      
      // Advanced
      spectatorMode: this.validateBoolean(settings.spectatorMode, defaults.spectatorMode),
      allowAnswerChange: this.validateBoolean(settings.allowAnswerChange, defaults.allowAnswerChange)
    };

    if (isDevelopment) {
      console.log('🔧 Parsed game settings:', parsed);
    }
    return parsed;
  }

  /**
   * Apply settings to individual question
   * @param {Object} question - Question object
   * @param {Object} gameSettings - Parsed game settings
   * @param {Number} index - Question index
   * @returns {Object} Enhanced question
   */
  static applySettingsToQuestion(question, gameSettings, index) {
    // Calculate time limit
    let timeLimit;
    if (gameSettings.useCustomTiming) {
      timeLimit = gameSettings.questionTime * 1000; // Convert to milliseconds
    } else {
      // Use question's individual time_limit or default
      timeLimit = (question.timeLimit || question.time_limit || gameSettings.questionTime) * 1000;
    }

    // Calculate points based on settings
    let points = this.calculateQuestionPoints(question, gameSettings);

    // Apply explanation settings
    const hasExplanation = question.explanation_title || question.explanation_text || question.explanation_image_url;
    const showExplanation = gameSettings.showExplanations && hasExplanation;

    return {
      ...question,
      timeLimit: timeLimit,
      points: points,
      questionNumber: index + 1,
      
      // Explanation configuration
      showExplanation: showExplanation,
      explanationTime: gameSettings.explanationTime * 1000, // Convert to milliseconds
      
      // Display settings
      showProgress: gameSettings.showProgress,
      showCorrectAnswer: gameSettings.showCorrectAnswer,
      allowAnswerChange: gameSettings.allowAnswerChange,
      
      // Settings metadata
      _settingsApplied: true,
      _originalTimeLimit: question.timeLimit || question.time_limit,
      _originalPoints: question.points
    };
  }

  /**
   * Calculate points for a question based on settings
   * Note: With the new advanced scoring system, this should return raw base points.
   * All bonuses (time, streak) are calculated at runtime by scoringSystem.js
   * @param {Object} question - Question object
   * @param {Object} gameSettings - Game settings
   * @returns {Number} Raw base points (no multipliers applied)
   */
  static calculateQuestionPoints(question, gameSettings) {
    // Return raw base points - let the new scoring system handle all bonuses
    return question.points || gameSettings.basePoints || 100;
  }

  /**
   * Create game flow configuration for socket events
   * @param {Object} gameSettings - Parsed game settings
   * @returns {Object} Game flow configuration
   */
  static createGameFlowConfig(gameSettings) {
    return {
      // Core flow settings
      autoAdvance: gameSettings.autoAdvance,
      showExplanations: gameSettings.showExplanations,
      explanationTime: gameSettings.explanationTime * 1000, // milliseconds
      showLeaderboard: gameSettings.showLeaderboard,
      
      // Timing configuration
      defaultQuestionTime: gameSettings.questionTime * 1000, // milliseconds
      useCustomTiming: gameSettings.useCustomTiming,
      
      // Scoring configuration
      pointCalculation: gameSettings.pointCalculation,
      streakBonus: gameSettings.streakBonus,
      basePoints: gameSettings.basePoints,
      
      // Display configuration
      showProgress: gameSettings.showProgress,
      showCorrectAnswer: gameSettings.showCorrectAnswer,
      allowAnswerChange: gameSettings.allowAnswerChange,
      
      // Advanced features
      spectatorMode: gameSettings.spectatorMode,
      maxPlayers: gameSettings.maxPlayers
    };
  }

  /**
   * Create default game flow configuration
   * @returns {Object} Default configuration
   */
  static createDefaultGameFlowConfig() {
    const defaults = gameConfig.defaults;
    
    // Fallback defaults if gameConfig.defaults is not available
    const fallbackDefaults = {
      maxPlayers: 50,
      autoAdvance: true,
      showExplanations: true,
      explanationTime: 10,
      showLeaderboard: true,
      useCustomTiming: false,
      questionTime: 30,
      pointCalculation: 'time-bonus',
      streakBonus: true,
      basePoints: 1000,
      showProgress: true,
      showCorrectAnswer: true,
      allowAnswerChange: false,
      spectatorMode: false
    };

    const finalDefaults = defaults || fallbackDefaults;
    return this.createGameFlowConfig(finalDefaults);
  }

  /**
   * Get timing for specific game phase
   * @param {String} phase - Game phase ('question', 'explanation', 'leaderboard')
   * @param {Object} gameSettings - Game settings
   * @param {Object} question - Current question (optional)
   * @returns {Number} Time in milliseconds
   */
  static getPhaseTime(phase, gameSettings, question = null) {
    switch (phase) {
      case 'question':
        if (question && question.timeLimit) {
          return question.timeLimit;
        }
        return gameSettings.useCustomTiming ? 
          gameSettings.questionTime * 1000 : 
          (question?.time_limit || gameSettings.questionTime) * 1000;
      
      case 'explanation':
        return gameSettings.showExplanations ? gameSettings.explanationTime * 1000 : 0;
      
      case 'leaderboard':
        return gameSettings.showLeaderboard ? gameSettings.explanationTime * 1000 : 1000; // Use explanation time or 1s
      
      default:
        return 3000; // Default 3 seconds
    }
  }

  /**
   * Check if explanation should be shown for question
   * @param {Object} question - Question object
   * @param {Object} gameSettings - Game settings
   * @returns {Boolean} Whether to show explanation
   */
  static shouldShowExplanation(question, gameSettings) {
    if (!gameSettings.showExplanations) return false;
    
    return !!(question.explanation_title || 
              question.explanation_text || 
              question.explanation_image_url);
  }

  // Validation helper methods
  static validateNumber(value, defaultValue, min = 0, max = Infinity) {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  static validateBoolean(value, defaultValue) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return defaultValue;
  }

  static validateEnum(value, defaultValue, allowedValues) {
    if (allowedValues.includes(value)) {
      return value;
    }
    return defaultValue;
  }

  /**
   * Get settings summary for logging
   * @param {Object} gameSettings - Game settings
   * @returns {String} Settings summary
   */
  static getSettingsSummary(gameSettings) {
    return `Settings: ${gameSettings.questionTime}s questions, ` +
           `${gameSettings.showExplanations ? gameSettings.explanationTime + 's explanations' : 'no explanations'}, ` +
           `${gameSettings.pointCalculation} scoring, ` +
           `${gameSettings.autoAdvance ? 'auto-advance' : 'manual advance'}`;
  }
}

module.exports = GameSettingsService;
