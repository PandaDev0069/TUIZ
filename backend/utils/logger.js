/**
 * Production-safe logging utility
 * Reduces log noise in production while maintaining essential information
 */

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    this.isLocalhost = process.env.IS_LOCALHOST === 'true' || !process.env.NODE_ENV;
    this.enableDebugLogs = this.isDevelopment || this.isLocalhost;
  }

  // Always log critical errors and startup issues
  error(...args) {
    console.error(...args);
  }

  // Always log important warnings
  warn(...args) {
    console.warn(...args);
  }

  // Log important information (reduced in production)
  info(...args) {
    if (this.enableDebugLogs || this._isImportant(args[0])) {
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
