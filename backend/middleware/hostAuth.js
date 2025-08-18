// Host Authentication Middleware - Backend API Implementation
// Phase 6: Complete Missing Backend Infrastructure

const jwt = require('jsonwebtoken');
const { RoomManager } = require('../utils/RoomManager');
const logger = require('../utils/logger');

/**
 * Validates that the requesting user has host permissions for the specified game
 */
const validateHostPermission = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;

    const { gameId } = req.params;
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID required' });
    }

    // Check if room exists
    const room = RoomManager.getRoom(gameId);
    if (!room) {
      return res.status(404).json({ error: 'Game room not found' });
    }

    // Validate host permissions
    const isHost = room.hostId === req.user.id || 
                   room.hostId === req.user.userId ||
                   (room.players[req.user.id] && room.players[req.user.id].isHost);

    if (!isHost) {
      logger.warn(`Unauthorized host action attempted`, {
        gameId,
        userId: req.user.id,
        actualHostId: room.hostId,
        endpoint: req.originalUrl
      });
      return res.status(403).json({ error: 'Host permissions required' });
    }

    // Attach room to request for convenience
    req.room = room;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid authorization token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Authorization token expired' });
    }
    
    logger.error('Host permission validation error:', error);
    res.status(500).json({ error: 'Authorization validation failed' });
  }
};

/**
 * Validates that the game is in one of the specified states
 */
const validateGameState = (allowedStates = []) => {
  return (req, res, next) => {
    try {
      const room = req.room || RoomManager.getRoom(req.params.gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const currentState = room.gameState?.status || 'waiting';
      
      if (allowedStates.length > 0 && !allowedStates.includes(currentState)) {
        return res.status(400).json({ 
          error: `Action not allowed in current game state: ${currentState}`,
          currentState,
          allowedStates
        });
      }

      next();
    } catch (error) {
      logger.error('Game state validation error:', error);
      res.status(500).json({ error: 'Game state validation failed' });
    }
  };
};

/**
 * Validates that the game has minimum required players
 */
const validateMinimumPlayers = (minPlayers = 1) => {
  return (req, res, next) => {
    try {
      const room = req.room || RoomManager.getRoom(req.params.gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const playerCount = Object.keys(room.players || {}).length;
      
      if (playerCount < minPlayers) {
        return res.status(400).json({ 
          error: `Minimum ${minPlayers} players required`,
          currentPlayers: playerCount,
          minimumRequired: minPlayers
        });
      }

      next();
    } catch (error) {
      logger.error('Minimum players validation error:', error);
      res.status(500).json({ error: 'Player count validation failed' });
    }
  };
};

/**
 * Rate limiting middleware for host actions
 */
const hostActionRateLimit = (maxActions = 10, windowMs = 60000) => {
  const actionCounts = new Map();
  
  return (req, res, next) => {
    try {
      const hostId = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean old entries
      if (actionCounts.has(hostId)) {
        const actions = actionCounts.get(hostId).filter(time => time > windowStart);
        actionCounts.set(hostId, actions);
      }
      
      const currentActions = actionCounts.get(hostId) || [];
      
      if (currentActions.length >= maxActions) {
        return res.status(429).json({ 
          error: 'Too many host actions',
          retryAfter: Math.ceil((currentActions[0] - windowStart) / 1000)
        });
      }
      
      // Add current action
      currentActions.push(now);
      actionCounts.set(hostId, currentActions);
      
      next();
    } catch (error) {
      logger.error('Host rate limiting error:', error);
      res.status(500).json({ error: 'Rate limiting validation failed' });
    }
  };
};

/**
 * Validates host action permissions based on game settings
 */
const validateHostActionPermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      const room = req.room || RoomManager.getRoom(req.params.gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const gameSettings = room.gameSettings || {};
      const hostPermissions = gameSettings.hostPermissions || {
        canPauseGame: true,
        canSkipQuestions: true,
        canKickPlayers: true,
        canMutePlayers: true,
        canAdjustTimer: true,
        canTransferHost: true
      };

      // Check each required permission
      for (const permission of requiredPermissions) {
        if (hostPermissions[permission] === false) {
          return res.status(403).json({ 
            error: `Host action not permitted: ${permission}`,
            availablePermissions: Object.keys(hostPermissions).filter(p => hostPermissions[p])
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Host permission validation error:', error);
      res.status(500).json({ error: 'Permission validation failed' });
    }
  };
};

/**
 * Logs host actions for audit trail
 */
const logHostAction = (actionType) => {
  return (req, res, next) => {
    try {
      const originalSend = res.json;
      res.json = function(data) {
        // Log successful actions
        if (data && data.success) {
          logger.info(`Host action: ${actionType}`, {
            hostId: req.user.id,
            gameId: req.params.gameId,
            actionType,
            endpoint: req.originalUrl,
            timestamp: new Date().toISOString(),
            requestBody: req.body,
            responseData: data
          });
        }
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Host action logging error:', error);
      next(); // Continue anyway
    }
  };
};

module.exports = {
  validateHostPermission,
  validateGameState,
  validateMinimumPlayers,
  hostActionRateLimit,
  validateHostActionPermissions,
  logHostAction
};
