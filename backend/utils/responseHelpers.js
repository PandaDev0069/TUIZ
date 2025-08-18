/**
 * Response helpers for standardizing API responses using DTOs
 * Provides consistent response formatting across the application
 */

const logger = require('../utils/logger');

/**
 * Standard success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} [message] - Success message
 * @param {number} [statusCode=200] - HTTP status code
 */
function sendSuccess(res, data = null, message = null, statusCode = 200) {
  const response = {
    success: true
  };

  if (message) {
    response.message = message;
  }

  if (data) {
    response.data = data;
  }

  res.status(statusCode).json(response);
}

/**
 * Standard error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {string} [code] - Error code
 * @param {number} [statusCode=500] - HTTP status code
 * @param {Object} [details] - Additional error details
 */
function sendError(res, error, code = null, statusCode = 500, details = null) {
  const response = {
    success: false,
    error
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  // Log error for debugging (but not validation errors)
  if (statusCode >= 500) {
    logger.error('API Error Response:', { error, code, details, statusCode });
  } else if (statusCode >= 400) {
    logger.warn('API Client Error:', { error, code, statusCode });
  }

  res.status(statusCode).json(response);
}

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 * @param {string} [field] - Field that failed validation
 * @param {string} [code] - Validation error code
 */
function sendValidationError(res, message, field = null, code = 'VALIDATION_ERROR') {
  const details = {};
  if (field) {
    details.field = field;
  }

  sendError(res, message, code, 400, Object.keys(details).length > 0 ? details : null);
}

/**
 * Not found error response
 * @param {Object} res - Express response object
 * @param {string} [resource='Resource'] - Name of the resource that wasn't found
 */
function sendNotFound(res, resource = 'Resource') {
  sendError(res, `${resource} not found`, 'NOT_FOUND', 404);
}

/**
 * Unauthorized error response
 * @param {Object} res - Express response object
 * @param {string} [message='Unauthorized'] - Error message
 */
function sendUnauthorized(res, message = 'Unauthorized') {
  sendError(res, message, 'UNAUTHORIZED', 401);
}

/**
 * Forbidden error response
 * @param {Object} res - Express response object
 * @param {string} [message='Forbidden'] - Error message
 */
function sendForbidden(res, message = 'Forbidden') {
  sendError(res, message, 'FORBIDDEN', 403);
}

/**
 * Rate limit error response
 * @param {Object} res - Express response object
 * @param {string} [message='Too many requests'] - Error message
 */
function sendRateLimit(res, message = 'Too many requests, please try again later') {
  sendError(res, message, 'RATE_LIMITED', 429);
}

/**
 * Socket event response formatter
 * @param {boolean} success - Whether the operation was successful
 * @param {Object|string} data - Response data or error message
 * @param {string} [code] - Response code
 */
function createSocketResponse(success, data, code = null) {
  const response = { success };

  if (success) {
    if (data) {
      response.data = data;
    }
  } else {
    response.error = typeof data === 'string' ? data : data?.message || 'Unknown error';
    if (code) {
      response.code = code;
    }
  }

  return response;
}

/**
 * Game state response formatter
 * @param {Object} gameState - Game state object
 */
function formatGameState(gameState) {
  return {
    gameCode: gameState.gameCode,
    status: gameState.status,
    currentQuestionIndex: gameState.currentQuestionIndex,
    totalQuestions: gameState.totalQuestions,
    players: Array.from(gameState.players.values()).map(player => ({
      playerId: player.id,
      playerName: player.name,
      score: player.score,
      streak: player.streak,
      hasAnswered: player.hasAnswered,
      lastAnswerTime: player.lastAnswerTime,
      status: player.connected ? 'active' : 'disconnected'
    })),
    currentQuestion: gameState.currentQuestion ? {
      id: gameState.currentQuestion.id,
      question: gameState.currentQuestion.question,
      options: gameState.currentQuestion.options,
      // Don't include correct answer in client response
      timeLimit: gameState.currentQuestion.timeLimit,
      type: gameState.currentQuestion.type
    } : null,
    questionStartTime: gameState.questionStartTime,
    timeLimit: gameState.timeLimit
  };
}

/**
 * Question response formatter (removes sensitive data)
 * @param {Object} question - Question object
 * @param {boolean} [includeAnswer=false] - Whether to include correct answer
 */
function formatQuestion(question, includeAnswer = false) {
  const formatted = {
    id: question.id,
    question: question.question,
    options: question.options,
    timeLimit: question.timeLimit || 30,
    type: question.type || 'multiple_choice'
  };

  if (includeAnswer) {
    formatted.correctAnswer = question.correctAnswer;
    formatted.explanation = question.explanation;
  }

  return formatted;
}

/**
 * Player response formatter
 * @param {Object} player - Player object
 */
function formatPlayer(player) {
  return {
    playerId: player.id,
    playerName: player.name,
    score: player.score || 0,
    streak: player.streak || 0,
    hasAnswered: player.hasAnswered || false,
    lastAnswerTime: player.lastAnswerTime || null,
    status: player.connected ? 'active' : 'disconnected'
  };
}

/**
 * Leaderboard response formatter
 * @param {Array} players - Array of player objects
 * @param {boolean} [isFinal=false] - Whether this is the final leaderboard
 */
function formatLeaderboard(players, isFinal = false) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Sort by score (descending), then by average answer time (ascending)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (a.averageAnswerTime || 0) - (b.averageAnswerTime || 0);
  });

  return {
    rankings: sortedPlayers.map((player, index) => ({
      rank: index + 1,
      ...formatPlayer(player),
      averageAnswerTime: player.averageAnswerTime || 0
    })),
    isFinal
  };
}

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendRateLimit,
  createSocketResponse,
  formatGameState,
  formatQuestion,
  formatPlayer,
  formatLeaderboard
};
