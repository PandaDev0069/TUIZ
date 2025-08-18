/**
 * Game Question Flow Domain Module
 * Pure functions for managing question transitions and state without side effects
 */

/**
 * Prepare question data for sending to clients
 * @param {Object} question - The question object
 * @param {number} questionIndex - Current question index
 * @param {number} totalQuestions - Total number of questions
 * @param {Object} gameFlowConfig - Game flow configuration
 * @returns {Object} Formatted question data ready for emission
 */
function prepareQuestionData(question, questionIndex, totalQuestions, gameFlowConfig = {}) {
  return {
    id: question.id,
    question: question.question,
    options: question.options,
    type: question.type,
    timeLimit: question.timeLimit,
    questionNumber: questionIndex + 1,
    totalQuestions: totalQuestions,
    
    // Enhanced settings from GameSettingsService
    showProgress: question.showProgress !== undefined ? question.showProgress : true,
    allowAnswerChange: question.allowAnswerChange !== undefined ? question.allowAnswerChange : false,
    showCorrectAnswer: question.showCorrectAnswer !== undefined ? question.showCorrectAnswer : true,
    
    // Game flow configuration
    autoAdvance: gameFlowConfig.autoAdvance !== undefined ? gameFlowConfig.autoAdvance : true,
    hybridMode: gameFlowConfig.hybridMode || false,
    showExplanation: question.showExplanation !== undefined ? question.showExplanation : false,
    explanationTime: question.explanationTime || gameFlowConfig.explanationTime || 30000,
    
    // Image support (preserved from transformation)
    image_url: question.image_url,
    _dbData: question._dbData // Contains explanation data
  };
}

/**
 * Prepare game state update for new question
 * @param {Object} question - The question object
 * @returns {Object} State updates to apply to the game
 */
function prepareQuestionState(question) {
  return {
    currentQuestion: {
      id: question.id,
      question: question.question,
      options: question.options,
      type: question.type,
      timeLimit: question.timeLimit,
      correctIndex: question.correctIndex,
      _dbData: question._dbData,
      imageUrl: question.image_url
    },
    timeRemaining: question.timeLimit,
    isTimerRunning: true,
    questionStartTime: Date.now(),
    showingResults: false,
    currentAnswers: [] // Reset answers for new question
  };
}

/**
 * Initialize player streaks if needed
 * @param {Map} players - Players map
 * @returns {void} Mutates players in place
 */
function initializePlayerStreaks(players) {
  for (const [playerId, player] of players) {
    if (!player.hasOwnProperty('streak')) {
      player.streak = 0;
    }
  }
}

/**
 * Check if the game should proceed to the next question
 * @param {Object} activeGame - Current game state
 * @returns {boolean} Whether to proceed to next question
 */
function shouldProceedToNext(activeGame) {
  if (!activeGame || activeGame.status !== 'active') return false;
  
  const allPlayersAnswered = activeGame.currentAnswers.length >= activeGame.players.size;
  const gameSettings = activeGame.game_settings || {};
  
  // If all players answered and in auto mode
  return allPlayersAnswered && gameSettings.autoAdvance !== false;
}

/**
 * Clean up question state for transition
 * @returns {Object} State updates to apply during transition
 */
function prepareQuestionTransition() {
  return {
    showingResults: false,
    lastExplanationData: null,
    questionInProgress: true
  };
}

module.exports = {
  prepareQuestionData,
  prepareQuestionState,
  initializePlayerStreaks,
  shouldProceedToNext,
  prepareQuestionTransition
};
