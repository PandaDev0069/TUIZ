const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { getEnvironment } = require('../config/env');
const { getSocketCorsConfig } = require('../config/cors');
const sessionRestoreEvents = require('./events/sessionRestore');

/**
 * Initializes Socket.IO server and registers event handlers
 * @param {http.Server} server - HTTP server instance
 * @param {Map} activeGames - Active games map
 * @param {DatabaseManager} db - Database manager instance
 * @param {Function} registerMainHandlers - Function to register main game event handlers
 * @returns {Server} Socket.IO server instance
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

  // Register connection handler
  io.on('connection', (socket) => {
    if (isDevelopment || isLocalhost) {
      logger.connection(`🔌 New user connected: ${socket.id}`);
    }

    // Register session restore event handlers (extracted in Checkpoint 3)
    sessionRestoreEvents.register(socket, io, activeGames, db);

    // Register main game event handlers (still in server.js for now)
    if (registerMainHandlers) {
      registerMainHandlers(socket, io, activeGames, db);
    }
  });

  return io;
}

module.exports = { initializeSocketIO };
