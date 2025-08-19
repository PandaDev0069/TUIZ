/**
 * Game Explanation Domain Module
 * Pure functions for preparing explanation and leaderboard data without side effects
 */

const { calculateLeaderboard, calculateAnswerStatistics } = require('./statistics');

/**
 * Prepare explanation data for a question
 * @param {Object} currentQuestion - The current question object
 * @param {Object} activeGame - Current game state
 * @param {Array} leaderboard - Current player standings
 * @returns {Object} Complete explanation data ready for emission
 */
function prepareExplanationData(currentQuestion, activeGame, leaderboard) {
  const gameSettings = activeGame.game_settings || {};
  
  return {
    questionId: currentQuestion.id,
    questionNumber: activeGame.currentQuestionIndex + 1,
    totalQuestions: activeGame.questions.length,
    correctAnswer: currentQuestion.correctIndex,
    correctOption: currentQuestion.options[currentQuestion.correctIndex],
    
    // Explanation content from database
    explanation: {
      title: currentQuestion._dbData?.explanation_title || currentQuestion.explanation_title,
      text: currentQuestion._dbData?.explanation_text || currentQuestion.explanation_text,
      image_url: currentQuestion._dbData?.explanation_image_url || currentQuestion.explanation_image_url
    },
    
    // Flattened leaderboard data for consistency with showLeaderboard events
    standings: leaderboard,
    isGameOver: (activeGame.currentQuestionIndex + 1) >= activeGame.questions.length,
    isLastQuestion: (activeGame.currentQuestionIndex + 1) >= activeGame.questions.length,
    answerStats: calculateAnswerStatistics(activeGame.currentAnswers, currentQuestion),
    
    // Timing - use explanationTime from settings (converted to ms)
    explanationTime: (gameSettings.explanationTime || 30) * 1000,
    autoAdvance: gameSettings.autoAdvance !== false,
    hybridMode: gameSettings.hybridMode || false
  };
}

/**
 * Prepare leaderboard data for display
 * @param {Object} activeGame - Current game state
 * @param {Array} leaderboard - Current player standings
 * @param {Object|null} currentQuestion - Current question object (optional, null for final leaderboard)
 * @returns {Object} Complete leaderboard data ready for emission
 */
function prepareLeaderboardData(activeGame, leaderboard, currentQuestion = null) {
  const gameSettings = activeGame.game_settings || {};
  
  return {
    questionNumber: activeGame.currentQuestionIndex + 1,
    totalQuestions: activeGame.questions.length,
    standings: leaderboard,
    isGameOver: (activeGame.currentQuestionIndex + 1) >= activeGame.questions.length,
    displayTime: (gameSettings.explanationTime || 30) * 1000,
    explanationTime: (gameSettings.explanationTime || 30) * 1000,
    autoAdvance: gameSettings.autoAdvance !== false,
    hybridMode: gameSettings.hybridMode || false,
    
    // Add answer stats and correct answer for consistency with explanation events
    // Handle case where currentQuestion might be undefined (e.g., final leaderboard)
    correctAnswer: currentQuestion?.correctIndex || null,
    correctOption: currentQuestion ? getCorrectAnswerText(currentQuestion) : null,
    answerStats: currentQuestion ? calculateAnswerStatistics(activeGame.currentAnswers, currentQuestion) : {}
  };
}

/**
 * Get correct answer text from question
 * @param {Object} question - Question object
 * @returns {string|null} Correct answer text or null
 */
function getCorrectAnswerText(question) {
  if (!question.options || question.correctIndex === undefined) return null;
  
  const correctIndex = question.correctIndex;
  if (correctIndex >= 0 && correctIndex < question.options.length) {
    return question.options[correctIndex];
  }
  
  return null;
}

/**
 * Prepare explanation state updates
 * @param {Object} explanationData - Prepared explanation data
 * @returns {Object} State updates to apply during explanation
 */
function prepareExplanationState(explanationData) {
  return {
    showingResults: true,
    isTimerRunning: false,
    lastExplanationData: explanationData,
    explanationStartTime: Date.now(),
    explanationDuration: explanationData.explanationTime,
    explanationEndTime: Date.now() + explanationData.explanationTime
  };
}

/**
 * Determine if explanation should be shown based on settings
 * @param {Object} gameSettings - Game settings object
 * @param {Object} currentQuestion - Current question object
 * @returns {boolean} Whether to show explanation
 */
function shouldShowExplanation(gameSettings, currentQuestion) {
  // This would normally use GameSettingsService.shouldShowExplanation
  // For now, simplified logic based on settings
  return gameSettings.showExplanations && (
    currentQuestion.explanation_title ||
    currentQuestion.explanation_text ||
    currentQuestion._dbData?.explanation_title ||
    currentQuestion._dbData?.explanation_text
  );
}

module.exports = {
  prepareExplanationData,
  prepareLeaderboardData,
  getCorrectAnswerText,
  prepareExplanationState,
  shouldShowExplanation
};
