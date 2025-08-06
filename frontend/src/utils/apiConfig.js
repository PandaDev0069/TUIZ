/**
 * Centralized API Configuration Utility
 * Handles environment-specific API endpoints and configuration
 */

// Get API base URL from environment variables or determine dynamically
const getApiBaseUrl = () => {
  // First priority: environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Second priority: check if we're in development
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }

  // Third priority: production - use same origin with /api prefix
  if (import.meta.env.PROD) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  // Fallback: determine based on hostname
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // Production fallback
  return `${window.location.protocol}//${window.location.host}`;
};

// Get WebSocket URL for Socket.IO
const getSocketUrl = () => {
  // First priority: environment variable
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // Use same logic as API base URL
  const apiBase = getApiBaseUrl();
  
  // For development, socket server is usually on the same port as API
  if (import.meta.env.DEV) {
    return apiBase;
  }

  // For production, socket server might be on different path or same origin
  return apiBase;
};

// Configuration object
export const apiConfig = {
  baseUrl: getApiBaseUrl(),
  socketUrl: getSocketUrl(),
  
  // API endpoints
  endpoints: {
    questionSets: '/api/question-sets',
    questionSetsPublic: '/api/question-sets/public',
    auth: '/api/auth',
    upload: '/api/upload',
    games: '/api/games',
    gameSettings: '/api/game-settings'
  },

  // Get full URL for an endpoint
  getUrl: (endpoint) => {
    const path = apiConfig.endpoints[endpoint] || endpoint;
    return `${apiConfig.baseUrl}${path}`;
  },

  // Get full API URL
  getApiUrl: (path) => {
    // Handle absolute URLs
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Handle paths that already include /api
    if (path.startsWith('/api/')) {
      return `${apiConfig.baseUrl}${path}`;
    }
    
    // Add /api prefix if not present
    const apiPath = path.startsWith('/') ? `/api${path}` : `/api/${path}`;
    return `${apiConfig.baseUrl}${apiPath}`;
  }
};

// Environment validation
export const validateEnvironment = () => {
  const warnings = [];
  
  if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.PROD) {
    warnings.push('VITE_API_BASE_URL not set in production environment');
  }
  
  if (!import.meta.env.VITE_SOCKET_URL && import.meta.env.PROD) {
    warnings.push('VITE_SOCKET_URL not set in production environment');
  }

  if (warnings.length > 0) {
    console.warn('Environment configuration warnings:', warnings);
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
};

// Debug information
export const getConfigInfo = () => {
  return {
    environment: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    apiBaseUrl: apiConfig.baseUrl,
    socketUrl: apiConfig.socketUrl,
    hostname: window.location.hostname,
    envVars: {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL
    }
  };
};

// Initialize and validate on import
validateEnvironment();

console.log('🔧 API Configuration initialized:', getConfigInfo());

export default apiConfig;
