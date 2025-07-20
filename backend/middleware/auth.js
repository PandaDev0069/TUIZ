const jwt = require('jsonwebtoken');
const dbManager = require('../config/database');

// JWT Secret - In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'tuiz_super_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthMiddleware {
  // Generate JWT token
  static generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Middleware to protect routes
  static authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    try {
      const decoded = AuthMiddleware.verifyToken(token);
      
      // Get fresh user data from database
      const user = dbManager.getUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
  }

  // Optional middleware - adds user if token is valid, but doesn't require it
  static optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = AuthMiddleware.verifyToken(token);
        const user = dbManager.getUserById(decoded.id);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Invalid token, but we don't reject the request
        console.log('Optional auth failed:', error.message);
      }
    }

    next();
  }

  // Rate limiting for login attempts (simple in-memory implementation)
  static loginRateLimit() {
    const attempts = new Map();
    const MAX_ATTEMPTS = 5;
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      // Clean up old entries
      for (const [key, data] of attempts.entries()) {
        if (now - data.firstAttempt > WINDOW_MS) {
          attempts.delete(key);
        }
      }

      const userAttempts = attempts.get(ip) || { count: 0, firstAttempt: now };
      
      if (userAttempts.count >= MAX_ATTEMPTS) {
        const timeLeft = WINDOW_MS - (now - userAttempts.firstAttempt);
        return res.status(429).json({
          success: false,
          message: `Too many login attempts. Try again in ${Math.ceil(timeLeft / 60000)} minutes.`
        });
      }

      // Store the original end function
      const originalEnd = res.end;
      
      // Override res.end to track failed attempts
      res.end = function(chunk, encoding) {
        if (res.statusCode === 401 || res.statusCode === 400) {
          userAttempts.count++;
          if (userAttempts.count === 1) {
            userAttempts.firstAttempt = now;
          }
          attempts.set(ip, userAttempts);
        } else if (res.statusCode === 200) {
          // Successful login, reset attempts
          attempts.delete(ip);
        }
        
        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }
}

module.exports = AuthMiddleware;
