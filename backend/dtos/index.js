/**
 * Data Transfer Objects (DTOs) - Centralized payload shapes
 * Defines the expected structure of data flowing through the application
 */

/**
 * @typedef {Object} GameStateDTO
 * @property {string} gameCode - Unique game identifier
 * @property {string} status - Game status (waiting|question|locked|reveal|leaderboard|ended)
 * @property {number} currentQuestionIndex - Current question index
 * @property {number} totalQuestions - Total number of questions
 * @property {Object[]} players - Array of player objects
 * @property {Object|null} currentQuestion - Current question data
 * @property {number} questionStartTime - Timestamp when question started
 * @property {number} timeLimit - Time limit for current question
 */

/**
 * @typedef {Object} PlayerDTO
 * @property {string} playerId - Unique player identifier
 * @property {string} playerName - Player display name
 * @property {number} score - Current score
 * @property {number} streak - Current answer streak
 * @property {boolean} hasAnswered - Whether player has answered current question
 * @property {number|null} lastAnswerTime - Timestamp of last answer
 * @property {string} status - Player status (active|disconnected)
 */

/**
 * @typedef {Object} QuestionDTO
 * @property {number} id - Question ID
 * @property {string} question - Question text
 * @property {string[]} options - Array of answer options
 * @property {number} correctAnswer - Index of correct answer
 * @property {string|null} explanation - Optional explanation
 * @property {number} timeLimit - Time limit in seconds
 * @property {string} type - Question type (multiple_choice|true_false)
 */

/**
 * @typedef {Object} AnswerSubmissionDTO
 * @property {string} playerId - Player who submitted answer
 * @property {string} gameCode - Game code
 * @property {number} answer - Selected answer index
 * @property {number} timestamp - Submission timestamp
 * @property {number} timeToAnswer - Time taken to answer in milliseconds
 */

/**
 * @typedef {Object} GameJoinDTO
 * @property {string} gameCode - Game code to join
 * @property {string} playerName - Player display name
 * @property {string} playerId - Unique player identifier
 */

/**
 * @typedef {Object} HostActionDTO
 * @property {string} gameCode - Game code
 * @property {string} action - Action type (start_game|next_question|end_game|kick_player)
 * @property {Object} [data] - Optional action-specific data
 * @property {number} timestamp - Action timestamp
 */

/**
 * @typedef {Object} GameResultsDTO
 * @property {string} gameCode - Game code
 * @property {PlayerDTO[]} finalRankings - Final player rankings
 * @property {Object[]} questionStatistics - Statistics for each question
 * @property {number} totalQuestions - Total questions in game
 * @property {number} gameStartTime - Game start timestamp
 * @property {number} gameEndTime - Game end timestamp
 */

/**
 * @typedef {Object} ErrorDTO
 * @property {boolean} success - Always false for errors
 * @property {string} error - Error message
 * @property {string} [code] - Error code for programmatic handling
 * @property {Object} [details] - Additional error details
 */

/**
 * @typedef {Object} SuccessDTO
 * @property {boolean} success - Always true for success
 * @property {string} [message] - Success message
 * @property {Object} [data] - Response data
 */

// Socket Event DTOs
/**
 * @typedef {Object} SocketEventDTO
 * @property {string} event - Event name
 * @property {Object} payload - Event payload
 * @property {string} [room] - Target room (for room-specific events)
 */

/**
 * @typedef {Object} PlayerJoinedEventDTO
 * @property {PlayerDTO} player - Joined player
 * @property {number} totalPlayers - Total players in game
 */

/**
 * @typedef {Object} QuestionStartEventDTO
 * @property {QuestionDTO} question - Question data (without correct answer)
 * @property {number} questionIndex - Current question index
 * @property {number} totalQuestions - Total questions
 * @property {number} timeLimit - Time limit in seconds
 */

/**
 * @typedef {Object} AnswerRevealEventDTO
 * @property {number} correctAnswer - Correct answer index
 * @property {string} explanation - Answer explanation
 * @property {Object[]} playerAnswers - Array of player answer results
 * @property {Object} statistics - Answer statistics
 */

/**
 * @typedef {Object} LeaderboardEventDTO
 * @property {PlayerDTO[]} rankings - Current player rankings
 * @property {boolean} isFinal - Whether this is the final leaderboard
 */

// Export all DTOs for JSDoc type checking
module.exports = {
  // Core Game DTOs
  GameStateDTO: null,
  PlayerDTO: null,
  QuestionDTO: null,
  AnswerSubmissionDTO: null,
  GameJoinDTO: null,
  HostActionDTO: null,
  GameResultsDTO: null,
  
  // Response DTOs
  ErrorDTO: null,
  SuccessDTO: null,
  
  // Socket Event DTOs
  SocketEventDTO: null,
  PlayerJoinedEventDTO: null,
  QuestionStartEventDTO: null,
  AnswerRevealEventDTO: null,
  LeaderboardEventDTO: null
};
