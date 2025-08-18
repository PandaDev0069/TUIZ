/**
 * Environment configuration and detection utilities
 * Centralizes environment variable access and development/production detection logic
 */

require('dotenv').config();

/**
 * Environment detection flags
 * @typedef {Object} EnvironmentFlags
 * @property {boolean} isDevelopment - True if in development mode
 * @property {boolean} isProduction - True if in production mode  
 * @property {boolean} isLocalhost - True if running on localhost
 */

/**
 * Detect current environment and return flags
 * @returns {EnvironmentFlags} Environment detection flags
 */
function getEnvironment() {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalhost = process.env.IS_LOCALHOST === 'true' || !process.env.NODE_ENV;
  
  return {
    isDevelopment,
    isProduction,
    isLocalhost
  };
}

/**
 * Get server configuration from environment variables
 * @returns {Object} Server configuration
 */
function getServerConfig() {
  return {
    port: parseInt(process.env.PORT) || 3001,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

/**
 * Get Supabase configuration flags (for debugging/validation)
 * @returns {Object} Supabase configuration status
 */
function getSupabaseConfig() {
  return {
    hasUrl: !!process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  };
}

module.exports = {
  getEnvironment,
  getServerConfig,
  getSupabaseConfig
};
