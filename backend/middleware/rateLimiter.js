const rateLimit = require('express-rate-limit');

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

class RateLimitMiddleware {
  
  // General API rate limiting - moderate limits for most endpoints
  static createGeneralLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isDevelopment ? 1000 : 100, // 100 requests per 15 minutes in production, 1000 in dev
      message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip successful OPTIONS requests
      skip: (req) => req.method === 'OPTIONS',
      // Properly handle trusted proxy configuration
      trustProxy: 1 // Trust only the first proxy (matches Express app setting)
    });
  }

  // Strict rate limiting for authentication endpoints
  static createAuthLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isDevelopment ? 50 : 10, // 10 attempts per 15 minutes in production, 50 in dev
      message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        error: 'AUTH_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful auth requests
      trustProxy: 1
    });
  }

  // Very strict rate limiting for sensitive operations
  static createStrictLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: isDevelopment ? 100 : 20, // 20 requests per hour in production, 100 in dev
      message: {
        success: false,
        message: 'Too many requests for this sensitive operation. Please try again later.',
        error: 'STRICT_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: 1
    });
  }

  // Moderate rate limiting for data creation/modification
  static createModerateLimit() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: isDevelopment ? 200 : 50, // 50 requests per 10 minutes in production, 200 in dev
      message: {
        success: false,
        message: 'Too many requests. Please slow down and try again later.',
        error: 'MODERATE_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: 1
    });
  }

  // Lenient rate limiting for read operations
  static createReadLimit() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: isDevelopment ? 500 : 200, // 200 requests per 5 minutes in production, 500 in dev
      message: {
        success: false,
        message: 'Too many read requests. Please try again shortly.',
        error: 'READ_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip rate limiting for authenticated users in development
      skip: (req) => {
        return isDevelopment && req.user;
      },
      trustProxy: 1
    });
  }

  // File upload rate limiting
  static createUploadLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: isDevelopment ? 50 : 10, // 10 uploads per hour in production, 50 in dev
      message: {
        success: false,
        message: 'Too many file uploads. Please try again later.',
        error: 'UPLOAD_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: 1
    });
  }

  // Game operations rate limiting
  static createGameLimit() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: isDevelopment ? 100 : 30, // 30 game operations per 5 minutes in production, 100 in dev
      message: {
        success: false,
        message: 'Too many game operations. Please slow down.',
        error: 'GAME_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: 1
    });
  }

  // Quiz/Question management rate limiting
  static createQuizLimit() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: isDevelopment ? 150 : 40, // 40 quiz operations per 10 minutes in production, 150 in dev
      message: {
        success: false,
        message: 'Too many quiz operations. Please try again later.',
        error: 'QUIZ_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: 1
    });
  }

  // Global fallback rate limiting (very lenient, for DDoS protection)
  static createGlobalLimit() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: isDevelopment ? 1000 : 500, // 500 requests per minute in production, 1000 in dev
      message: {
        success: false,
        message: 'Too many requests. Please slow down.',
        error: 'GLOBAL_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: 1
    });
  }
}

module.exports = RateLimitMiddleware;
