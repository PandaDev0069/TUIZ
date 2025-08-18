const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { getEnvironment } = require('../config/env');
const { getSocketCorsConfig } = require('../config/cors');
const sessionRestoreEvents = require('./events/sessionRestore');
const GameHub = require('./GameHub');

/**
 * Initializes Socket.IO server and registers event handlers
 * @param {http.Server} server - HTTP server instance
 * @param {Map} activeGames - Active games map
 * @param {DatabaseManager} db - Database manager instance
 * @param {Function} registerMainHandlers - Function to register main game event handlers
 * @returns {Object} Object containing io server and gameHub instances
 */
function initializeSocketIO(server, activeGames, db, registerMainHandlers = null) {
  const { isDevelopment, isLocalhost } = getEnvironment();
  
  // Socket.IO server with enhanced CORS using centralized config
  // Only log Socket.IO configuration in development
  if (isDevelopment || isLocalhost) {
    logger.debug('🔌 Socket.IO CORS Configuration:');
    logger.debug('  Environment SOCKET_CORS_ORIGIN:', process.env.SOCKET_CORS_ORIGIN || 'Not set');
    logger.debug('  Socket origins include Vercel domain: ✅');
  }

  const io = new Server(server, {
    cors: getSocketCorsConfig()
  });

  // Create GameHub wrapper (Checkpoint 4)
  const gameHub = new GameHub(io, activeGames);

  // Register connection handler
  io.on('connection', (socket) => {
    if (isDevelopment || isLocalhost) {
      logger.connection(`🔌 New user connected: ${socket.id}`);
    }

    // Register session restore event handlers (extracted in Checkpoint 3)
    sessionRestoreEvents.register(socket, io, activeGames, db);

    // Register main game event handlers (still in server.js for now)
    // Pass gameHub to enable gradual migration to hub-based emissions
    if (registerMainHandlers) {
      registerMainHandlers(socket, io, activeGames, db, gameHub);
    }
  });

  return { io, gameHub };
}

module.exports = { initializeSocketIO };
