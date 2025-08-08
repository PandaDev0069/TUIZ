/**
 * Production-safe logging utility
 * Reduces log noise in production while maintaining essential information
 */

class Logger {
  constructor() {
    // Detect if running via nodemon (npm run dev) vs direct node (npm start)
    this.isRunningViaNodemon = process.env.npm_lifecycle_event === 'dev' || 
                               process.argv[0].includes('nodemon') ||
                               process.env._.includes('nodemon') ||
                               process.title.includes('nodemon');
    
    // Check if running via npm start specifically
    this.isRunningViaNpmStart = process.env.npm_lifecycle_event === 'start';
    
    // Priority logic: npm script detection overrides NODE_ENV
    // Development mode: running via nodemon/dev script OR explicit NODE_ENV=development (but not npm start)
    this.isDevelopment = (process.env.NODE_ENV === 'development' && !this.isRunningViaNpmStart) || 
                         this.isRunningViaNodemon;
    
    // Production-like mode: npm start explicitly OR no clear development indicators
    this.isProductionLike = this.isRunningViaNpmStart || 
                           (!this.isRunningViaNodemon && !this.isDevelopment);
    
    // Legacy localhost detection
    this.isLocalhost = process.env.IS_LOCALHOST === 'true';
    
    // Enable debug logs: development mode OR explicit localhost override (but not if npm start)
    this.enableDebugLogs = (this.isDevelopment || this.isLocalhost) && !this.isRunningViaNpmStart;
    
    // For hosted environments (Render, Vercel, etc.) - always minimal logging
    this.isHostedEnvironment = process.env.RENDER || 
                              process.env.VERCEL || 
                              process.env.RAILWAY || 
                              process.env.HEROKU;
                       
    // Override: If we're in a hosted environment, force minimal logging
    if (this.isHostedEnvironment) {
      this.enableDebugLogs = false;
      this.isProductionLike = true;
    }
  }

  // Always log critical errors and startup issues
  error(...args) {
    console.error(...args);
  }

  // Always log important warnings
  warn(...args) {
    console.warn(...args);
  }

  // Show logging configuration at startup (only in debug mode)
  showConfig() {
    if (!this.enableDebugLogs) {
      return; // Don't show config in production-like mode
    }
    
    const config = {
      'Script Used': process.env.npm_lifecycle_event || 'direct',
      'Running via npm start': this.isRunningViaNpmStart,
      'Running via Nodemon': this.isRunningViaNodemon,
      'NODE_ENV': process.env.NODE_ENV || 'undefined',
      'Hosted Environment': !!this.isHostedEnvironment,
      'Development Mode': this.isDevelopment,
      'Production-like Mode': this.isProductionLike,
      'Debug Logs Enabled': this.enableDebugLogs
    };
    
    console.log('🔧 Logger Configuration:', config);
    
    if (this.enableDebugLogs) {
      console.log('📝 Logging Mode: DEVELOPMENT (verbose output - npm run dev detected)');
    } else {
      console.log('📝 Logging Mode: PRODUCTION-LIKE (minimal output - npm start detected)');
    }
  }

  // Log important information (very minimal in production-like mode)
  info(...args) {
    if (this.enableDebugLogs) {
      console.log(...args);
    } else if (this.isProductionLike && this._isCritical(args[0])) {
      // Only log critical startup/error info in production-like mode
      console.log(...args);
    }
  }

  // Debug logs only in development
  debug(...args) {
    if (this.enableDebugLogs) {
      console.log(...args);
    }
  }

  // Game events - minimal logging in production
  game(...args) {
    if (this.enableDebugLogs) {
      console.log(...args);
    }
  }

  // Connection logs - minimal in production
  connection(...args) {
    if (this.enableDebugLogs) {
      console.log(...args);
    }
  }

  // Database operations - errors always, success only in dev
  database(...args) {
    if (this.enableDebugLogs || this._containsError(args)) {
      console.log(...args);
    }
  }

  // Check if message is critical and must be logged even in production
  _isCritical(message) {
    if (typeof message !== 'string') return false;
    
    const criticalKeywords = [
      'server is running',
      'database connected',
      'connection failed', 
      'configuration error',
      'validation failed',
      'fatal error',
      'startup error',
      'service is live'
    ];
    
    return criticalKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Check if message contains important keywords that should always be logged
  _isImportant(message) {
    if (typeof message !== 'string') return false;
    
    const importantKeywords = [
      'connected successfully',
      'connection failed', 
      'started successfully',
      'server listening',
      'configuration error',
      'validation failed',
      'created successfully',
      'error'
    ];
    
    return importantKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Check if any argument contains error information
  _containsError(args) {
    return args.some(arg => {
      if (typeof arg === 'string') {
        return arg.toLowerCase().includes('error') || arg.toLowerCase().includes('failed');
      }
      return false;
    });
  }

  // Production summary for game activities (replaces verbose logs)
  gameActivity(gameCode, activity, details = {}) {
    if (this.enableDebugLogs) {
      // Full logging in development
      this.debug(`🎮 Game ${gameCode}: ${activity}`, details);
    } else {
      // Minimal production logging - only critical events
      const criticalActivities = ['created', 'started', 'ended', 'error'];
      if (criticalActivities.some(critical => activity.toLowerCase().includes(critical))) {
        console.log(`Game ${gameCode}: ${activity}`);
      }
    }
  }

  // Batch connection summary (replaces individual connection logs)
  connectionSummary(connections, disconnections) {
    if (this.enableDebugLogs) {
      if (connections > 0) this.debug(`🔌 ${connections} new connections`);
      if (disconnections > 0) this.debug(`🔌 ${disconnections} disconnections`);
    }
    // No logging in production for routine connections
  }
}

module.exports = new Logger();
