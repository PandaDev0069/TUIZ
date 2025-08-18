/**
 * CORS (Cross-Origin Resource Sharing) configuration
 * Centralizes allowed origins for both HTTP (Express) and WebSocket (Socket.IO) connections
 * Supports development, production, and network access patterns
 */

/**
 * Get the list of allowed origins for CORS
 * Used by both Express CORS middleware and Socket.IO CORS configuration
 * @returns {Array} Array of allowed origins (strings and RegExp patterns)
 */
function getAllowedOrigins() {
  return [
    // Primary frontend origin (configurable via environment)
    process.env.CORS_ORIGIN || 'http://localhost:5173',
    
    // Production Vercel domain
    'https://tuiz-nine.vercel.app',
    
    // Allow any Vercel preview domains (https://*.vercel.app)
    /^https:\/\/.*\.vercel\.app$/,
    
    // Local network access patterns for development
    // 192.168.x.x network (most common home/office networks)
    /^http:\/\/192\.168\.\d+\.\d+:5173$/,
    
    // 10.x.x.x network (corporate/enterprise networks)  
    /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
    
    // 172.16-31.x.x network (Docker/container networks)
    /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/
  ];
}

/**
 * Get Socket.IO specific allowed origins
 * Uses the same origins as HTTP but allows for Socket.IO specific overrides
 * @returns {Array} Array of allowed origins for Socket.IO
 */
function getSocketAllowedOrigins() {
  // Check for Socket.IO specific origin override
  const socketOrigins = [...getAllowedOrigins()];
  
  // If SOCKET_CORS_ORIGIN is specified, replace the first origin
  if (process.env.SOCKET_CORS_ORIGIN) {
    socketOrigins[0] = process.env.SOCKET_CORS_ORIGIN;
  }
  
  return socketOrigins;
}

/**
 * Get Express CORS configuration object
 * @returns {Object} Express CORS middleware configuration
 */
function getExpressCorsConfig() {
  return {
    origin: getAllowedOrigins(),
    credentials: true
  };
}

/**
 * Get Socket.IO CORS configuration object  
 * @returns {Object} Socket.IO CORS configuration
 */
function getSocketCorsConfig() {
  return {
    origin: getSocketAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true
  };
}

module.exports = {
  getAllowedOrigins,
  getSocketAllowedOrigins,
  getExpressCorsConfig,
  getSocketCorsConfig
};
