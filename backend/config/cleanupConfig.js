/**
 * Database cleanup configuration settings
 * Use shorter times for testing, longer for production
 */
const cleanupConfig = {
  // Game cleanup timings
  games: {
    // Finished games: Keep for stats/replay before deletion
    finishedGameRetention: 5, // minutes (production: 24-48 hours)
    
    // Waiting games: Delete if no activity (abandoned games)
    waitingGameTimeout: 2, // minutes (production: 2 hours)
    
    // Cancelled games: Quick cleanup
    cancelledGameTimeout: 1, // minutes (production: 1 hour)
    
    // Active games: Safety timeout for stuck games
    activeGameTimeout: 30, // minutes (production: 6 hours)
  },

  // Guest player cleanup timings
  guests: {
    // Inactive guests from old games
    inactiveGuestTimeout: 3, // minutes (production: 2 hours)
    
    // Guests from finished games (cascade with game deletion)
    cascadeWithGames: true,
    
    // Keep guest stats in game_results
    preserveStatsInResults: true,
  },

  // Cleanup execution settings
  execution: {
    // How often to run cleanup (minutes)
    intervalMinutes: 5/60, // 5 minutes for testing

    // Enable/disable automatic cleanup
    autoCleanupEnabled: true,
    
    // Log cleanup activities
    logCleanupActions: true,
    
    // Batch size for large deletions
    batchSize: 100,
  },

  // Warning system settings
  warnings: {
    // Enable warning system
    enabled: true,
    
    // Warning intervals (as percentage of total timeout)
    // For 2-min timeout: 25% = 1:30, 83% = 1:40 (more reasonable spread)
    intervals: [0.25, 0.83], // First warning at 25%, final at 83% (better spacing for user experience)
    
    // Direct warning message properties (for backward compatibility)
    firstWarningMessage: "ゲームが間もなく終了します。残り時間: {time}分",
    finalWarningMessage: "ゲームは間もなく自動終了されます。残り時間: {time}分",
    
    // Custom warning messages
    messages: {
      firstWarning: "⚠️ Game will be deleted soon due to inactivity",
      finalWarning: "🚨 Game will be deleted in {seconds} seconds!",
      gameDeleted: "🗑️ Game has been deleted due to inactivity",
      sessionExpired: "⏰ Your session has expired",
      gameFinished: "🎉 Game completed successfully"
    },
    
    // Auto-redirect configuration
    autoRedirect: {
      enabled: true,
      delaySeconds: 5  // Give users 5 seconds to see the warning
    },
    
    // Warning behavior
    showCountdown: true,
    redirectDelay: 5000, // ms to show message before redirect
  },

  // Safety settings
  safety: {
    // Never delete games newer than this (minutes)
    minimumGameAge: 1, // production: 30
    
    // Maximum games to delete in one cleanup cycle
    maxGamesPerCleanup: 50,
    
    // Maximum guest players to delete in one cycle
    maxGuestsPerCleanup: 200,
  }
};

// Helper functions for time calculations
cleanupConfig.getCleanupQueries = () => {
  const now = new Date();
  
  return {
    // Finished games older than retention period
    finishedGames: new Date(now.getTime() - cleanupConfig.games.finishedGameRetention * 60 * 1000),
    
    // Waiting games older than timeout
    waitingGames: new Date(now.getTime() - cleanupConfig.games.waitingGameTimeout * 60 * 1000),
    
    // Cancelled games older than timeout
    cancelledGames: new Date(now.getTime() - cleanupConfig.games.cancelledGameTimeout * 60 * 1000),
    
    // Active games stuck for too long
    activeGames: new Date(now.getTime() - cleanupConfig.games.activeGameTimeout * 60 * 1000),
    
    // Inactive guests
    inactiveGuests: new Date(now.getTime() - cleanupConfig.guests.inactiveGuestTimeout * 60 * 1000),
  };
};

// Helper function to get warning thresholds
cleanupConfig.getWarningThresholds = () => {
  const now = new Date();
  
  return {
    // Waiting games warnings
    waitingGamesFirstWarning: new Date(now.getTime() - (cleanupConfig.games.waitingGameTimeout * cleanupConfig.warnings.intervals[0] * 60 * 1000)),
    waitingGamesFinalWarning: new Date(now.getTime() - (cleanupConfig.games.waitingGameTimeout * cleanupConfig.warnings.intervals[1] * 60 * 1000)),
    
    // Active games warnings  
    activeGamesFirstWarning: new Date(now.getTime() - (cleanupConfig.games.activeGameTimeout * cleanupConfig.warnings.intervals[0] * 60 * 1000)),
    activeGamesFinalWarning: new Date(now.getTime() - (cleanupConfig.games.activeGameTimeout * cleanupConfig.warnings.intervals[1] * 60 * 1000)),
  };
};

// Helper function to calculate remaining time
cleanupConfig.calculateRemainingTime = (createdAt, timeoutMinutes) => {
  const now = new Date();
  const created = new Date(createdAt);
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const elapsedMs = now.getTime() - created.getTime();
  const remainingMs = timeoutMs - elapsedMs;
  
  const result = {
    remainingMs: Math.max(0, remainingMs),
    remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
    remainingMinutes: Math.max(0, Math.floor(remainingMs / (1000 * 60))),
    isExpired: remainingMs <= 0
  };
  
  // Debug logging to catch inconsistencies
  if (result.remainingMinutes === 1 && (result.remainingSeconds < 60 || result.remainingSeconds > 120)) {
    console.log(`🐛 TIME CALCULATION DEBUG:`, {
      createdAt,
      timeoutMinutes,
      now: now.toISOString(),
      created: created.toISOString(),
      timeoutMs,
      elapsedMs,
      remainingMs,
      calculatedSeconds: remainingMs / 1000,
      resultSeconds: result.remainingSeconds,
      resultMinutes: result.remainingMinutes,
      expectedSecondsRange: '60-120 for 1 minute'
    });
  }
  
  return result;
};

// Production settings (uncomment and adjust for production)
cleanupConfig.production = {
  games: {
    finishedGameRetention: 48 * 60, // 48 hours in minutes
    waitingGameTimeout: 2 * 60, // 2 hours in minutes
    cancelledGameTimeout: 1 * 60, // 1 hour in minutes
    activeGameTimeout: 6 * 60, // 6 hours in minutes
  },
  guests: {
    inactiveGuestTimeout: 2 * 60, // 2 hours in minutes
  },
  execution: {
    intervalMinutes: 60, // 1 hour
  },
  safety: {
    minimumGameAge: 30, // 30 minutes
  }
};

module.exports = cleanupConfig;
