const gameConfig = require('../config/gameConfig');

class QuestionFormatAdapter {
  constructor() {
    // Question type mapping from database to game format
    this.questionTypeMapping = {
      DATABASE_TO_GAME: {
        'multiple_choice': 'multiple_choice_4', // Default to 4 options
        'true_false': 'true_false',
        'free_text': 'free_text'
      },
      GAME_TO_DATABASE: {
        'multiple_choice_4': 'multiple_choice',
        'multiple_choice_2': 'multiple_choice',
        'true_false': 'true_false',
        'free_text': 'free_text'
      }
    };
  }

  /**
   * Transform database question to game-compatible format
   * @param {Object} dbQuestion - Question from database with answers
   * @param {Object} gameSettings - Game settings to apply
   * @returns {Object} - Formatted question for game use
   */
  transformDatabaseToGame(dbQuestion, gameSettings = {}) {
    try {
      if (!dbQuestion) {
        throw new Error('Database question is required');
      }

      if (!dbQuestion.answers || !Array.isArray(dbQuestion.answers)) {
        throw new Error('Question must have answers array');
      }

      // Sort answers by order_index
      const sortedAnswers = dbQuestion.answers.sort((a, b) => a.order_index - b.order_index);

      // Find correct answer index
      const correctAnswerIndex = this.getCorrectAnswerIndex(sortedAnswers);

      // Determine question type based on answer count and database type
      const gameQuestionType = this.mapQuestionType(dbQuestion.question_type, sortedAnswers.length);

      // Create options array from answers
      const options = sortedAnswers.map(answer => answer.answer_text);

      // Apply game settings to timing
      const timeLimit = this.calculateTimeLimit(dbQuestion, gameSettings, gameQuestionType);

      // Calculate points with settings consideration
      const points = this.calculatePoints(dbQuestion, gameSettings, gameQuestionType);

      const transformedQuestion = {
        // Core question data
        id: dbQuestion.id,
        question: dbQuestion.question_text,
        options: options,
        correctIndex: correctAnswerIndex,
        type: gameQuestionType,
        
        // Timing and scoring
        timeLimit: timeLimit,
        points: points,
        
        // Original database data for advanced features
        _dbData: {
          id: dbQuestion.id,
          question_type: dbQuestion.question_type,
          image_url: dbQuestion.image_url,
          explanation_title: dbQuestion.explanation_title,
          explanation_text: dbQuestion.explanation_text,
          explanation_image_url: dbQuestion.explanation_image_url,
          order_index: dbQuestion.order_index,
          difficulty: dbQuestion.difficulty,
          answers: sortedAnswers.map(answer => ({
            id: answer.id,
            text: answer.answer_text,
            image_url: answer.image_url,
            is_correct: answer.is_correct,
            order_index: answer.order_index,
            explanation: answer.answer_explanation
          }))
        }
      };

      // Validate the transformed question
      this.validateTransformedQuestion(transformedQuestion);

      return transformedQuestion;

    } catch (error) {
      console.error('❌ Error transforming question:', error);
      throw new Error(`Question transformation failed: ${error.message}`);
    }
  }

  /**
   * Find the index of the correct answer
   * @param {Array} answers - Array of answer objects
   * @returns {number} - Index of correct answer, -1 if not found
   */
  getCorrectAnswerIndex(answers) {
    if (!answers || !Array.isArray(answers)) {
      console.warn('⚠️ No answers provided for correct index calculation');
      return -1;
    }

    const correctIndex = answers.findIndex(answer => answer.is_correct === true);
    
    if (correctIndex === -1) {
      console.warn('⚠️ No correct answer found in answers array');
    }

    return correctIndex;
  }

  /**
   * Map database question type to game question type
   * @param {string} dbType - Database question type
   * @param {number} answerCount - Number of answers
   * @returns {string} - Game question type
   */
  mapQuestionType(dbType, answerCount) {
    // Handle true/false specifically - ONLY if database type is true_false
    if (dbType === 'true_false') {
      return 'true_false';
    }

    // Handle multiple choice based on answer count
    if (dbType === 'multiple_choice') {
      switch (answerCount) {
        case 2:
          return 'multiple_choice_2';
        case 3:
          return 'multiple_choice_3';
        case 4:
          return 'multiple_choice_4';
        default:
          // Default to 4-choice for compatibility
          return 'multiple_choice_4';
      }
    }

    // Use mapping table for other types
    return this.questionTypeMapping.DATABASE_TO_GAME[dbType] || 'multiple_choice_4';
  }

  /**
   * Calculate question time limit based on settings and question type
   * @param {Object} dbQuestion - Database question
   * @param {Object} gameSettings - Game settings
   * @param {string} questionType - Game question type
   * @returns {number} - Time limit in seconds
   */
  calculateTimeLimit(dbQuestion, gameSettings, questionType) {
    // Priority: Database question setting > Game settings > Game config default
    
    // First check if question has its own time_limit
    if (dbQuestion.time_limit) {
      // Use question-specific timing from database
      return dbQuestion.time_limit;
    }

    // Fall back to global game setting if available
    if (gameSettings.questionTime) {
      return gameSettings.questionTime;
    }

    // Fall back to game config defaults by type
    const defaultTiming = gameConfig.timing.byType[questionType] || gameConfig.timing.questionDisplay;
    return Math.floor(defaultTiming / 1000); // Convert to seconds
  }

  /**
   * Calculate question points based on settings and question type
   * @param {Object} dbQuestion - Database question
   * @param {Object} gameSettings - Game settings
   * @param {string} questionType - Game question type
   * @returns {number} - Points for this question
   */
  calculatePoints(dbQuestion, gameSettings, questionType) {
    const basePoints = dbQuestion.points || gameConfig.points.base;
    
    // Apply question type multiplier
    const typeMultiplier = gameConfig.points.multipliers[questionType] || 1.0;
    
    // Apply game settings multiplier if time-bonus is enabled
    const settingsMultiplier = gameSettings.pointCalculation === 'time-bonus' ? 1.2 : 1.0;
    
    return Math.round(basePoints * typeMultiplier * settingsMultiplier);
  }

  /**
   * Validate that the transformed question is properly formatted
   * @param {Object} question - Transformed question
   * @throws {Error} - If validation fails
   */
  validateTransformedQuestion(question) {
    const requiredFields = ['id', 'question', 'options', 'correctIndex', 'type', 'timeLimit', 'points'];
    
    for (const field of requiredFields) {
      if (question[field] === undefined || question[field] === null) {
        throw new Error(`Transformed question missing required field: ${field}`);
      }
    }

    if (!Array.isArray(question.options) || question.options.length === 0) {
      throw new Error('Question must have at least one option');
    }

    if (question.correctIndex < 0 || question.correctIndex >= question.options.length) {
      throw new Error(`Invalid correct index ${question.correctIndex} for ${question.options.length} options`);
    }

    if (question.timeLimit <= 0) {
      throw new Error('Question time limit must be positive');
    }

    if (question.points <= 0) {
      throw new Error('Question points must be positive');
    }
  }

  /**
   * Batch transform multiple questions
   * @param {Array} dbQuestions - Array of database questions
   * @param {Object} gameSettings - Game settings to apply
   * @returns {Array} - Array of transformed questions
   */
  transformMultipleQuestions(dbQuestions, gameSettings = {}) {
    try {
      if (!Array.isArray(dbQuestions)) {
        throw new Error('Questions must be an array');
      }

      const transformedQuestions = [];
      const errors = [];

      dbQuestions.forEach((dbQuestion, index) => {
        try {
          const transformed = this.transformDatabaseToGame(dbQuestion, gameSettings);
          transformed.questionNumber = index + 1;
          transformedQuestions.push(transformed);
        } catch (error) {
          console.error(`❌ Failed to transform question ${index + 1}:`, error);
          errors.push({
            index: index + 1,
            questionId: dbQuestion?.id || 'unknown',
            error: error.message
          });
        }
      });

      if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} questions failed transformation:`, errors);
      }

      if (transformedQuestions.length === 0) {
        throw new Error('No questions were successfully transformed');
      }

      console.log(`✅ Successfully transformed ${transformedQuestions.length}/${dbQuestions.length} questions`);

      return {
        success: true,
        questions: transformedQuestions,
        errors: errors,
        totalTransformed: transformedQuestions.length,
        totalErrors: errors.length
      };

    } catch (error) {
      console.error('❌ Batch transformation failed:', error);
      return {
        success: false,
        error: error.message,
        questions: [],
        errors: [],
        totalTransformed: 0,
        totalErrors: 0
      };
    }
  }

  /**
   * Get summary of question types in a set
   * @param {Array} questions - Array of questions (database or transformed)
   * @returns {Object} - Summary of question types
   */
  getQuestionTypeSummary(questions) {
    const summary = {};
    
    questions.forEach(question => {
      const type = question.type || question.question_type;
      summary[type] = (summary[type] || 0) + 1;
    });

    return {
      types: summary,
      totalQuestions: questions.length,
      uniqueTypes: Object.keys(summary).length
    };
  }
}

module.exports = QuestionFormatAdapter;
