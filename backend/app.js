require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const logger = require('./utils/logger');
const DatabaseManager = require('./config/database');
const SupabaseAuthHelper = require('./utils/SupabaseAuthHelper');
const CleanupScheduler = require('./utils/CleanupScheduler');
const RateLimitMiddleware = require('./middleware/rateLimiter');
const { validateStorageConfig } = require('./utils/storageConfig');
const { getEnvironment, getSupabaseConfig } = require('./config/env');
const { getExpressCorsConfig } = require('./config/cors');

/**
 * Creates and configures the Express application
 * @param {Object} dependencies - Injected dependencies
 * @param {DatabaseManager} dependencies.db - Database manager instance
 * @param {CleanupScheduler} dependencies.cleanupScheduler - Cleanup scheduler instance
 * @returns {express.Application} Configured Express app
 */
function createApp({ db, cleanupScheduler }) {
  const app = express();
  
  // Environment detection using centralized config
  const { isDevelopment, isLocalhost } = getEnvironment();

  // Trust proxy for Render platform (fixes X-Forwarded-For header issues)
  // Set to 1 to trust only the first proxy (Render's load balancer)
  // This is more secure than trusting all proxies (true)
  app.set('trust proxy', 1);

  // CORS configuration using centralized config
  app.use(cors(getExpressCorsConfig()));

  // Apply global rate limiting for DDoS protection
  app.use('/api/', RateLimitMiddleware.createGlobalLimit());

  // Increase payload limits for image uploads and large quiz data
  app.use(express.json({ 
    limit: '50mb',
    parameterLimit: 10000
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '50mb',
    parameterLimit: 10000
  }));

  // Middleware to handle payload size errors
  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      if (isDevelopment || isLocalhost) {
        logger.error('Bad JSON body:', error.message);
      }
      return res.status(400).json({ 
        error: 'Invalid JSON format',
        message: 'Request body contains invalid JSON' 
      });
    }
    
    if (error.type === 'entity.too.large') {
      if (isDevelopment || isLocalhost) {
        logger.error('Payload too large:', error.message);
      }
      return res.status(413).json({ 
        error: 'Payload too large',
        message: 'Request payload is too large. Please reduce file sizes or split the request.',
        limit: '50MB'
      });
    }
    
    next(error);
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const isDbConnected = await db.testConnection();
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: isDbConnected ? 'Connected' : 'Disconnected',
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        database: 'Error',
        error: error.message
      });
    }
  });

  // ================================================================
  // AUTHENTICATION ROUTES
  // ================================================================
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);

  // ================================================================
  // DEBUG ROUTES (Development Only)
  // ================================================================

  // Debug endpoint for token verification
  app.post('/api/debug/verify-token', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({ 
          error: 'Missing or invalid authorization header',
          expected: 'Authorization: Bearer <token>',
          received: authHeader ? `${authHeader.substring(0, 20)}...` : 'undefined'
        });
      }
      
      const token = authHeader.substring(7);
      
      // Debug token information using Supabase JWT
      let tokenInfo;
      
      try {
        // Decode without verification to inspect token structure
        const decoded = jwt.decode(token, { complete: true });
        
        tokenInfo = {
          header: decoded?.header,
          payload: {
            sub: decoded?.payload?.sub,
            email: decoded?.payload?.email,
            aud: decoded?.payload?.aud,
            exp: decoded?.payload?.exp,
            iat: decoded?.payload?.iat,
            iss: decoded?.payload?.iss,
            role: decoded?.payload?.role
          },
          isExpired: decoded?.payload?.exp ? Date.now() >= decoded.payload.exp * 1000 : false,
          expiresAt: decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null
        };
      } catch (decodeError) {
        tokenInfo = { error: 'Failed to decode token', details: decodeError.message };
      }
      
      // Verify the token with Supabase
      let verificationResult;
      
      try {
        const { data: user, error } = await db.supabaseAdmin.auth.getUser(token);
        
        verificationResult = {
          valid: !error && !!user?.user,
          user: user?.user ? {
            id: user.user.id,
            email: user.user.email,
            name: user.user.user_metadata?.name,
            created_at: user.user.created_at
          } : null,
          error: error?.message
        };
      } catch (verifyError) {
        verificationResult = {
          valid: false,
          error: verifyError.message
        };
      }
      
      res.json({
        tokenInfo,
        verification: verificationResult,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      res.status(500).json({
        error: 'Debug verification failed',
        details: error.message
      });
    }
  });

  // Authentication info endpoint
  app.get('/api/debug/auth-info', (req, res) => {
    const supabaseConfig = getSupabaseConfig();
    
    res.json({
      authType: 'Supabase JWT',
      description: 'This application uses Supabase Auth JWT tokens',
      tokenSource: 'Generated by Supabase Auth via /api/auth/login or /api/auth/register endpoints',
      headerFormat: 'Authorization: Bearer <supabase_jwt_token>',
      supabaseConfigured: {
        hasUrl: supabaseConfig.hasUrl,
        hasAnonKey: supabaseConfig.hasAnonKey,
        hasServiceKey: supabaseConfig.hasServiceKey
      },
      endpoints: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        refresh: 'POST /api/auth/refresh'
      }
    });
  });

  // Test RLS policies endpoint
  app.post('/api/debug/test-rls', async (req, res) => {
    const { getAuthenticatedUser } = require('./helpers/authHelper');
    
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Authorization header required for RLS testing' 
        });
      }
      
      // Get authenticated user
      let authenticatedUser;
      try {
        authenticatedUser = await getAuthenticatedUser(authHeader);
      } catch (authError) {
        return res.status(401).json({ error: authError.message });
      }
      
      const testResults = {
        user: authenticatedUser,
        tests: {},
        timestamp: new Date().toISOString()
      };
      
      // Test 1: Can read own question sets
      try {
        const { data: ownSets, error: ownSetsError } = await db.supabaseAdmin
          .from('question_sets')
          .select('id, title, user_id')
          .eq('user_id', authenticatedUser.id)
          .limit(5);
        
        testResults.tests.readOwnQuestionSets = {
          success: !ownSetsError,
          count: ownSets?.length || 0,
          error: ownSetsError?.message
        };
      } catch (error) {
        testResults.tests.readOwnQuestionSets = {
          success: false,
          error: error.message
        };
      }
      
      // Test 2: Can read public question sets
      try {
        const { data: publicSets, error: publicSetsError } = await db.supabaseAdmin
          .from('question_sets')
          .select('id, title, is_public')
          .eq('is_public', true)
          .limit(5);
        
        testResults.tests.readPublicQuestionSets = {
          success: !publicSetsError,
          count: publicSets?.length || 0,
          error: publicSetsError?.message
        };
      } catch (error) {
        testResults.tests.readPublicQuestionSets = {
          success: false,
          error: error.message
        };
      }
      
      // Test 3: Try to create a test question set
      try {
        const { data: testSet, error: createError } = await db.supabaseAdmin
          .from('question_sets')
          .insert({
            user_id: authenticatedUser.id,
            title: 'RLS Test Question Set',
            description: 'Testing RLS policies',
            category: 'test',
            is_public: false,
            total_questions: 0
          })
          .select()
          .single();
        
        testResults.tests.createQuestionSet = {
          success: !createError,
          questionSetId: testSet?.id,
          error: createError?.message
        };
        
        // Clean up test data
        if (testSet?.id) {
          await db.supabaseAdmin
            .from('question_sets')
            .delete()
            .eq('id', testSet.id);
        }
      } catch (error) {
        testResults.tests.createQuestionSet = {
          success: false,
          error: error.message
        };
      }
      
      // Test 4: Database connection and service role
      try {
        const { data: dbTest, error: dbError } = await db.supabaseAdmin
          .from('users')
          .select('count', { count: 'exact', head: true });
        
        testResults.tests.databaseConnection = {
          success: !dbError,
          serviceRole: true,
          error: dbError?.message
        };
      } catch (error) {
        testResults.tests.databaseConnection = {
          success: false,
          serviceRole: false,
          error: error.message
        };
      }
      
      res.json(testResults);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ================================================================
  // CLEANUP MANAGEMENT ENDPOINTS
  // ================================================================

  // Get cleanup status and stats
  app.get('/api/cleanup/status', async (req, res) => {
    try {
      const status = cleanupScheduler.getStatus();
      let stats = null;
      let error = null;
      
      // Try to get cleanup stats, but handle gracefully if function doesn't exist
      try {
        const statsResult = await db.getCleanupStats();
        if (statsResult.success) {
          stats = statsResult.stats;
        } else {
          error = statsResult.error;
          logger.warn('⚠️ Cleanup stats function not available:', statsResult.error);
        }
      } catch (statsError) {
        error = 'Cleanup stats function not available in database';
        logger.warn('⚠️ Cleanup stats error:', statsError.message);
      }
      
      res.json({
        scheduler: status,
        stats: stats,
        error: error,
        message: error ? 'Some cleanup features may not be available until database functions are deployed' : null
      });
    } catch (error) {
      logger.error('❌ Cleanup status endpoint error:', error);
      res.status(500).json({ 
        error: error.message,
        scheduler: cleanupScheduler ? cleanupScheduler.getStatus() : null
      });
    }
  });

  // Preview cleanup operations (dry run)
  app.get('/api/cleanup/preview', async (req, res) => {
    try {
      const result = await cleanupScheduler.previewCleanup();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Run manual cleanup
  app.post('/api/cleanup/run', async (req, res) => {
    try {
      const result = await cleanupScheduler.runManualCleanup();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test warnings manually (for debugging)
  app.post('/api/cleanup/test-warnings', async (req, res) => {
    try {
      logger.debug('🧪 Testing warning system manually...');
      await cleanupScheduler.checkAndSendWarnings();
      res.json({ success: true, message: 'Warning check completed' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ================================================================
  // MODULAR API ROUTES
  // ================================================================

  // Import and use API route modules
  const questionSetsRoutes = require('./routes/api/questionSets');
  const questionsRoutes = require('./routes/api/questions');
  const answersRoutes = require('./routes/api/answers');
  const debugRoutes = require('./routes/api/debug');
  const gamesRoutes = require('./routes/api/games');
  const quizRoutes = require('./routes/api/quiz');
  const uploadRoutes = require('./routes/upload');
  const playerManagementRoutes = require('./routes/api/playerManagement');
  const playersRoutes = require('./routes/api/players');
  const gameResultsRoutes = require('./routes/api/gameResults');
  const gameSettingsRoutes = require('./routes/api/gameSettings');

  // Host control routes (Phase 6)
  const hostGameControlRoutes = require('./routes/api/host/gameControl');
  const hostPlayerManagementRoutes = require('./routes/api/host/playerManagement');

  // Mount API routes
  app.use('/api/question-sets', questionSetsRoutes);
  app.use('/api/questions', questionsRoutes);
  app.use('/api/answers', answersRoutes);
  app.use('/api/debug', debugRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api/quiz', quizRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/player', playerManagementRoutes(db));
  app.use('/api/players', playersRoutes(db));
  app.use('/api/game-results', gameResultsRoutes);
  app.use('/api/game-settings', gameSettingsRoutes);

  // Host control API routes (Phase 6)
  const hostGameCreationRoutes = require('./routes/api/host/gameCreation');
  app.use('/api/host/game', hostGameControlRoutes);
  app.use('/api/host/player', hostPlayerManagementRoutes);
  app.use('/api/host/create', hostGameCreationRoutes);

  // Global error handler - must be after all routes
  app.use((error, _req, res, _next) => {
    logger.error('Global error handler:', error.message);
    
    // Handle specific error types
    if (error.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'Payload too large',
        message: 'Request payload exceeds the 50MB limit. Please reduce file sizes.',
        limit: '50MB'
      });
    }
    
    if (error.name === 'MulterError') {
      return res.status(400).json({
        error: 'File upload error',
        message: error.message
      });
    }
    
    // Default error response
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
  });

  return app;
}

module.exports = { createApp };
