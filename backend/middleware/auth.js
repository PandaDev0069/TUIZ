const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Environment detection for logging
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
const isLocalhost = process.env.IS_LOCALHOST === 'true' || !process.env.NODE_ENV;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

// Initialize Supabase admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Simple token cache to avoid re-verifying the same token repeatedly
const tokenCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class AuthMiddleware {
  // Generate Supabase session (login user through Supabase Auth)
  static async loginUser(email, password) {
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        token: data.session.access_token
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Register user through Supabase Auth
  static async registerUser(email, password, userData = {}) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: userData,
        email_confirm: true // Auto-confirm email for development
      });

      if (error) {
        throw new Error(error.message);
      }

      // Create user profile in our users table
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: userData.name || email.split('@')[0]
        });

      if (profileError) {
        // Always log profile creation errors as they're critical
        logger.error('Failed to create user profile:', profileError);
        // Don't fail the registration, profile can be created later
      }

      // Generate session for the user
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email
      });

      if (sessionError) {
        // Always log session errors as they're critical
        logger.error('Failed to generate session:', sessionError);
      }

      return {
        success: true,
        user: data.user,
        message: 'User registered successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify Supabase JWT token
  static async verifyToken(token) {
    // Check cache first
    const cacheKey = token;
    const cached = tokenCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }
    
    try {
      // First try using Supabase's built-in method
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error) {
        throw new Error('Invalid or expired token: ' + error.message);
      }
      
      if (!user) {
        throw new Error('No user found for this token');
      }

      const result = {
        success: true,
        user: user,
        decoded: {
          id: user.id,
          email: user.email,
          sub: user.id
        }
      };
      
      // Cache the successful result
      tokenCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      // Only log in development mode to reduce noise in production
      if (isDevelopment) {
        logger.debug('Token verification failed:', error.message.split(':')[0]);
      }
      
      // Fallback to manual JWT verification using Supabase JWT secret
      if (supabaseJwtSecret) {
        try {
          const decoded = jwt.verify(token, supabaseJwtSecret);
          if (isDevelopment) {
            logger.debug('Manual JWT verification successful for user:', decoded.sub);
          }
          
          const fallbackResult = {
            success: true,
            user: {
              id: decoded.sub,
              email: decoded.email
            },
            decoded: decoded
          };
          
          // Cache the fallback result too
          tokenCache.set(cacheKey, {
            result: fallbackResult,
            timestamp: Date.now()
          });
          
          return fallbackResult;
        } catch (jwtError) {
          // Only log the type of error, not the full message
          if (isDevelopment) {
            logger.debug('JWT verification failed:', jwtError.name || 'Invalid token');
          }
          throw new Error('Token verification failed: ' + jwtError.message);
        }
      }
      
      throw error;
    }
  }

  // Middleware to protect routes
  static async authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    try {
      const result = await AuthMiddleware.verifyToken(token);
      
      if (!result.success) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', result.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        return res.status(401).json({ 
          success: false, 
          message: 'User profile not found' 
        });
      }

      // If profile doesn't exist, create it
      if (!userProfile) {
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: result.user.id,
            email: result.user.email,
            name: result.user.user_metadata?.name || result.user.email?.split('@')[0] || 'User'
          })
          .select()
          .single();

        if (createError) {
          // Always log profile creation errors as they're critical
          logger.error('Failed to create user profile:', createError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to create user profile' 
          });
        }

        req.user = newProfile;
      } else {
        req.user = userProfile;
      }

      // Add the original token to the request for user-scoped operations
      req.userToken = token;

      next();
    } catch (error) {
      // Reduce logging noise for common auth failures
      const isExpiredToken = error.message.includes('expired') || error.message.includes('jwt expired');
      const isInvalidToken = error.message.includes('invalid') || error.message.includes('malformed');
      
      if (isDevelopment && !isExpiredToken && !isInvalidToken) {
        // Only log unexpected auth errors in development
        logger.error('Unexpected authentication error:', error.message);
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
  }

  // Optional middleware - adds user if token is valid, but doesn't require it
  static async optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const result = await AuthMiddleware.verifyToken(token);
        
        if (result.success) {
          // Get user profile from database
          const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', result.user.id)
            .single();

          if (!profileError && userProfile) {
            req.user = userProfile;
          }
        }
      } catch (error) {
        // Invalid token, but we don't reject the request
        logger.debug('Optional auth failed:', error.message);
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

  // Create a user-scoped Supabase client for RLS operations
  static createUserScopedClient(userToken) {
    const { createClient } = require('@supabase/supabase-js');
    
    const client = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    return client;
  }
}

module.exports = AuthMiddleware;
