/**
 * Lightweight validation utilities for payload validation at edges
 * Provides simple validation functions without heavy dependencies
 */

const logger = require('../utils/logger.js');

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, field = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

/**
 * Basic field validators
 */
const validators = {
  /**
   * Check if value is required (not null, undefined, or empty string)
   */
  required: (value, fieldName) => {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${fieldName} is required`, fieldName, 'REQUIRED_FIELD');
    }
    return true;
  },

  /**
   * Check if value is a string
   */
  string: (value, fieldName) => {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, 'INVALID_TYPE');
    }
    return true;
  },

  /**
   * Check if value is a number
   */
  number: (value, fieldName) => {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName, 'INVALID_TYPE');
    }
    return true;
  },

  /**
   * Check if value is a boolean
   */
  boolean: (value, fieldName) => {
    if (typeof value !== 'boolean') {
      throw new ValidationError(`${fieldName} must be a boolean`, fieldName, 'INVALID_TYPE');
    }
    return true;
  },

  /**
   * Check if value is an array
   */
  array: (value, fieldName) => {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, 'INVALID_TYPE');
    }
    return true;
  },

  /**
   * Check string length constraints
   */
  stringLength: (value, fieldName, { min = 0, max = Infinity } = {}) => {
    validators.string(value, fieldName);
    if (value.length < min) {
      throw new ValidationError(`${fieldName} must be at least ${min} characters long`, fieldName, 'MIN_LENGTH');
    }
    if (value.length > max) {
      throw new ValidationError(`${fieldName} must be no more than ${max} characters long`, fieldName, 'MAX_LENGTH');
    }
    return true;
  },

  /**
   * Check if number is within range
   */
  numberRange: (value, fieldName, { min = -Infinity, max = Infinity } = {}) => {
    validators.number(value, fieldName);
    if (value < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, 'MIN_VALUE');
    }
    if (value > max) {
      throw new ValidationError(`${fieldName} must be no more than ${max}`, fieldName, 'MAX_VALUE');
    }
    return true;
  },

  /**
   * Check if value is one of allowed values
   */
  oneOf: (value, fieldName, allowedValues) => {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`, fieldName, 'INVALID_VALUE');
    }
    return true;
  },

  /**
   * Check if value matches regex pattern
   */
  pattern: (value, fieldName, regex, message = null) => {
    validators.string(value, fieldName);
    if (!regex.test(value)) {
      const errorMessage = message || `${fieldName} format is invalid`;
      throw new ValidationError(errorMessage, fieldName, 'INVALID_FORMAT');
    }
    return true;
  }
};

/**
 * Game-specific validators
 */
const gameValidators = {
  /**
   * Validate game code format (6 uppercase letters/numbers)
   */
  gameCode: (value, fieldName = 'gameCode') => {
    validators.required(value, fieldName);
    validators.pattern(value, fieldName, /^[A-Z0-9]{6}$/, 'Game code must be 6 uppercase letters/numbers');
    return true;
  },

  /**
   * Validate player name
   */
  playerName: (value, fieldName = 'playerName') => {
    validators.required(value, fieldName);
    validators.stringLength(value, fieldName, { min: 1, max: 20 });
    // No special characters except spaces, letters, numbers, and basic punctuation
    validators.pattern(value, fieldName, /^[a-zA-Z0-9\s\-_.!?]+$/, 'Player name contains invalid characters');
    return true;
  },

  /**
   * Validate answer index
   */
  answerIndex: (value, fieldName = 'answer', maxOptions = 4) => {
    validators.required(value, fieldName);
    validators.numberRange(value, fieldName, { min: 0, max: maxOptions - 1 });
    return true;
  },

  /**
   * Validate game status
   */
  gameStatus: (value, fieldName = 'status') => {
    const validStatuses = ['waiting', 'question', 'locked', 'reveal', 'leaderboard', 'ended'];
    validators.required(value, fieldName);
    validators.oneOf(value, fieldName, validStatuses);
    return true;
  },

  /**
   * Validate timestamp
   */
  timestamp: (value, fieldName = 'timestamp') => {
    validators.required(value, fieldName);
    validators.number(value, fieldName);
    // Check if timestamp is reasonable (not too far in past/future)
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);
    
    if (value < oneYearAgo || value > oneYearFromNow) {
      throw new ValidationError(`${fieldName} is not a valid timestamp`, fieldName, 'INVALID_TIMESTAMP');
    }
    return true;
  }
};

/**
 * Validation schemas for common payloads
 */
const schemas = {
  /**
   * Validate game join payload
   */
  gameJoin: (payload) => {
    const { gameCode, playerName, playerId } = payload;
    
    gameValidators.gameCode(gameCode);
    gameValidators.playerName(playerName);
    validators.required(playerId, 'playerId');
    validators.string(playerId, 'playerId');
    
    return true;
  },

  /**
   * Validate answer submission payload
   */
  answerSubmission: (payload) => {
    const { gameCode, playerId, answer, timestamp } = payload;
    
    gameValidators.gameCode(gameCode);
    validators.required(playerId, 'playerId');
    validators.string(playerId, 'playerId');
    gameValidators.answerIndex(answer);
    gameValidators.timestamp(timestamp);
    
    return true;
  },

  /**
   * Validate host action payload
   */
  hostAction: (payload) => {
    const { gameCode, action, timestamp } = payload;
    
    gameValidators.gameCode(gameCode);
    validators.required(action, 'action');
    validators.string(action, 'action');
    gameValidators.timestamp(timestamp);
    
    return true;
  },

  /**
   * Validate question data
   */
  question: (payload) => {
    const { question, options, correctAnswer, timeLimit } = payload;
    
    validators.required(question, 'question');
    validators.stringLength(question, 'question', { min: 5, max: 500 });
    
    validators.required(options, 'options');
    validators.array(options, 'options');
    
    if (options.length < 2 || options.length > 6) {
      throw new ValidationError('Options must have between 2 and 6 items', 'options', 'INVALID_OPTIONS_COUNT');
    }
    
    options.forEach((option, index) => {
      validators.required(option, `options[${index}]`);
      validators.stringLength(option, `options[${index}]`, { min: 1, max: 200 });
    });
    
    gameValidators.answerIndex(correctAnswer, 'correctAnswer', options.length);
    validators.numberRange(timeLimit, 'timeLimit', { min: 5, max: 300 });
    
    return true;
  },

  /**
   * Validate host control payload
   */
  hostControl: (payload) => {
    const { gameCode, action } = payload;
    
    gameValidators.gameCode(gameCode);
    validators.required(action, 'action');
    
    const allowedActions = [
      'start_game',
      'next_question', 
      'skip_question',
      'end_game',
      'kick_player',
      'update_settings',
      'pause_game',
      'resume_game'
    ];
    
    validators.oneOf(action, 'action', allowedActions);
    
    return true;
  },

  /**
   * Validate reconnection payload
   */
  reconnection: (payload) => {
    const { gameCode, playerId, timestamp } = payload;
    
    if (gameCode) {
      gameValidators.gameCode(gameCode);
    }
    
    if (playerId) {
      validators.string(playerId, 'playerId');
    }
    
    if (timestamp) {
      gameValidators.timestamp(timestamp);
    }
    
    return true;
  },

  /**
   * Validate game creation payload
   */
  gameCreation: (payload) => {
    const { hostName, questionSetId, settings } = payload;
    
    validators.required(hostName, 'hostName');
    validators.stringLength(hostName, 'hostName', { min: 1, max: 100 }); // Increased to accommodate UUIDs with prefixes
    
    if (questionSetId !== null && questionSetId !== undefined) {
      validators.string(questionSetId, 'questionSetId'); // Changed from number to string for UUID
      // Validate UUID format (optional but recommended)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(questionSetId)) {
        throw new ValidationError('questionSetId must be a valid UUID', 'questionSetId', 'INVALID_FORMAT');
      }
    }
    
    if (settings) {
      if (settings.timeLimit !== undefined) {
        validators.numberRange(settings.timeLimit, 'timeLimit', { min: 5, max: 300 });
      }
      
      if (settings.maxPlayers !== undefined) {
        validators.numberRange(settings.maxPlayers, 'maxPlayers', { min: 1, max: 100 });
      }
      
      if (settings.allowLateJoin !== undefined) {
        validators.boolean(settings.allowLateJoin, 'allowLateJoin');
      }
    }
    
    return true;
  }
};

/**
 * Validation middleware factory
 */
function createValidator(schemaName) {
  return (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        logger.warn(`Unknown validation schema: ${schemaName}`);
        return next();
      }
      
      schema(req.body);
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn(`Validation error for ${schemaName}:`, {
          field: error.field,
          message: error.message,
          code: error.code
        });
        
        return res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
          field: error.field
        });
      }
      
      logger.error(`Unexpected validation error for ${schemaName}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

/**
 * Socket validation helper
 */
function validateSocketPayload(schemaName, payload, callback = null) {
  try {
    const schema = schemas[schemaName];
    if (!schema) {
      logger.warn(`Unknown socket validation schema: ${schemaName}`);
      return true;
    }
    
    schema(payload);
    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn(`Socket validation error for ${schemaName}:`, {
        field: error.field,
        message: error.message,
        code: error.code
      });
      
      // Send error back to client if callback provided
      if (callback && typeof callback === 'function') {
        callback({
          success: false,
          error: error.message,
          code: error.code,
          field: error.field
        });
      }
      
      return false;
    }
    
    logger.error(`Unexpected socket validation error for ${schemaName}:`, error);
    
    if (callback && typeof callback === 'function') {
      callback({
        success: false,
        error: 'Internal validation error'
      });
    }
    
    return false;
  }
}

module.exports = {
  ValidationError,
  validators,
  gameValidators,
  schemas,
  createValidator,
  validateSocketPayload
};
