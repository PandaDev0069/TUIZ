/**
 * Centralized API Configuration Utility
 * Handles environment-specific API endpoints and configuration
 */

// Get API base URL from environment variables or determine dynamically
const getApiBaseUrl = () => {
  // Check if we're accessing via IP address (mobile device)
  const hostname = window.location.hostname;
  const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Debug logging only for development/localhost environments
  if (import.meta.env.DEV || isLocalhost) {
    console.log('🔧 API Config Debug - Environment Variables:');
    console.log(`  Environment: ${import.meta.env.MODE}`);
    console.log(`  Hostname: ${hostname}`);
    console.log(`  VITE_BACKEND_URL_PROD: ${import.meta.env.VITE_BACKEND_URL_PROD || 'Not set'}`);
    console.log(`  VITE_API_BASE_URL: ${import.meta.env.VITE_API_BASE_URL || 'Not set'}`);
  }
  
  // If accessing via IP address, use the same IP for backend with port 3001
  if (isIPAddress) {
    if (import.meta.env.DEV || isLocalhost) {
      console.log('📱 Using IP address mode for mobile testing');
    }
    return `http://${hostname}:3001`;
  }
  
  // First priority: Production environment variable for production builds
  if (import.meta.env.PROD && import.meta.env.VITE_BACKEND_URL_PROD) {
    return import.meta.env.VITE_BACKEND_URL_PROD;
  }
  
  // Second priority: environment variable (only for localhost)
  if (import.meta.env.VITE_API_BASE_URL && isLocalhost) {
    if (import.meta.env.DEV) {
      console.log('🏠 Using localhost API base URL');
    }
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Third priority: check if we're in development
  if (import.meta.env.DEV) {
    console.log('🔧 Using development localhost');
    return 'http://localhost:3001';
  }

  // Fallback: determine based on hostname
  if (isLocalhost) {
    if (import.meta.env.DEV) {
      console.log('🏠 Using localhost fallback');
    }
    return 'http://localhost:3001';
  }

  // Production fallback: use same origin with /api prefix
  // Only log warning in development to avoid production console spam
  if (import.meta.env.DEV) {
    console.warn('⚠️ Using same-origin fallback - verify production config');
  }
  return `${window.location.protocol}//${window.location.host}`;
};

// Get WebSocket URL for Socket.IO
const getSocketUrl = () => {
  // Check if we're accessing via IP address (mobile device)
  const hostname = window.location.hostname;
  const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // If accessing via IP address, use the same IP for backend with port 3001
  if (isIPAddress) {
    return `http://${hostname}:3001`;
  }
  
  // First priority: Production environment variable for production builds
  if (import.meta.env.PROD && import.meta.env.VITE_SOCKET_URL_PROD) {
    return import.meta.env.VITE_SOCKET_URL_PROD;
  }
  
  // Second priority: environment variable (for localhost and development)
  if (import.meta.env.VITE_SOCKET_URL && isLocalhost) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // Third priority: Development fallback
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }

  // Fallback: Use same origin (shouldn't happen with proper env vars)
  const apiBase = getApiBaseUrl();
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

// Debug logging for mobile connections - only in development
const hostname = window.location.hostname;
const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Only log configuration details in development/localhost environments
if (import.meta.env.DEV || isLocalhost) {
  console.log('🔧 API Configuration Debug:');
  console.log(`  Hostname: ${hostname}`);
  console.log(`  Is IP Address: ${isIPAddress}`);
  console.log(`  Base URL: ${apiConfig.baseUrl}`);
  console.log(`  Socket URL: ${apiConfig.socketUrl}`);
  console.log(`  Environment: ${import.meta.env.MODE}`);
}

// Environment validation
export const validateEnvironment = () => {
  const warnings = [];
  
  if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.PROD) {
    warnings.push('VITE_API_BASE_URL not set in production environment');
  }
  
  if (!import.meta.env.VITE_SOCKET_URL && import.meta.env.PROD) {
    warnings.push('VITE_SOCKET_URL not set in production environment');
  }

  // Only log warnings in development to avoid production console spam
  if (warnings.length > 0 && import.meta.env.DEV) {
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

export default apiConfig;
