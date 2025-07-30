const cleanupConfig = require('../config/cleanupConfig');

class CleanupScheduler {
  constructor(databaseManager) {
    this.db = databaseManager;
    this.intervalId = null;
    this.isRunning = false;
    this.config = cleanupConfig;
    this.sentWarnings = new Map(); // Track sent warnings to prevent spam
  }

  start() {
    if (this.isRunning) {
      return;
    }

    if (!this.config.execution.autoCleanupEnabled) {
      return;
    }
    
    // Development override: if NODE_ENV is development, allow very short intervals
    const isDevelopment = process.env.NODE_ENV === 'development';
    const intervalMs = this.config.execution.intervalMinutes * 60 * 1000;
    
    // Run initial cleanup after 30 seconds
    setTimeout(() => {
      this.runCleanupCycle();
    }, 30000);

    // Set up recurring cleanup
    this.intervalId = setInterval(() => {
      this.runCleanupCycle();
    }, intervalMs); // Use calculated interval

    this.isRunning = true;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  async runCleanupCycle() {
    try {
      // First check for warnings
      await this.checkAndSendWarnings();
      
      // Get current stats before cleanup
      const statsBefore = await this.db.getCleanupStats();
      
      // Run the cleanup
      const result = await this.db.runCleanup(this.config);
      
      if (result.success) {
        // Get stats after cleanup for comparison
        const statsAfter = await this.db.getCleanupStats();
        
        if (this.config.execution.logCleanupActions) {
          this.logCleanupSummary(statsBefore.stats, statsAfter.stats);
        }
      } else {
        console.error('❌ Cleanup cycle failed:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Cleanup cycle error:', error);
    }
  }

  async checkAndSendWarnings() {
    try {
      const io = require('../server').getIO();
      if (!io) {
        return;
      }
      
      if (!this.db || !this.db.supabaseAdmin) {
        console.error('❌ Database or service role client not available');
        return;
      }
      
      // Query games that need warnings (fix field name: room_code -> game_code)
      const { data: warningGames, error } = await this.db.supabaseAdmin
        .from('games')
        .select('id, game_code, status, created_at')
        .in('status', ['waiting', 'active']);

      if (error) {
        console.error('Warning query error:', error);
        return;
      }

      if (!warningGames || warningGames.length === 0) {
        return;
      }

      // Send warnings for each game
      for (const game of warningGames) {
        const timeoutMinutes = game.status === 'waiting' 
          ? this.config.games.waitingGameTimeout 
          : this.config.games.activeGameTimeout;
          
        const remaining = this.config.calculateRemainingTime(game.created_at, timeoutMinutes);
        
        if (remaining.isExpired) {
          continue;
        }
        
        // Fix warning threshold calculation
        const firstWarningAt = timeoutMinutes * (1 - this.config.warnings.intervals[0]); // 50% remaining (50% elapsed)
        const finalWarningAt = timeoutMinutes * (1 - this.config.warnings.intervals[1]); // 25% remaining (75% elapsed)
        
        let warningType = null;
        if (remaining.remainingMinutes <= finalWarningAt) {
          warningType = 'final';
        } else if (remaining.remainingMinutes <= firstWarningAt) {
          warningType = 'first';
        }
        
        if (warningType) {
          // Check if we've already sent this warning type for this game
          const warningKey = `${game.game_code}-${warningType}`;
          if (this.sentWarnings.has(warningKey)) {
            continue;
          }
          
          const message = warningType === 'final' 
            ? this.config.warnings?.finalWarningMessage || `ゲームは間もなく自動終了されます。残り時間: {time}分`
            : this.config.warnings?.firstWarningMessage || `ゲームが間もなく終了します。残り時間: {time}分`;
            
          // Send warning to all players in this game room (fix field name)
          const warningData = {
            type: warningType,
            message: message.replace('{time}', remaining.remainingMinutes),
            remainingMinutes: remaining.remainingMinutes,
            remainingSeconds: remaining.remainingSeconds,
            gameStatus: game.status,
            // Only include autoRedirect for final warnings AND only when time is really low
            autoRedirect: (warningType === 'final' && remaining.remainingMinutes <= 0.3) ? this.config.warnings.autoRedirect : null
          };
          
          io.to(game.game_code).emit('cleanupWarning', warningData);
          
          // Mark this warning as sent
          this.sentWarnings.set(warningKey, Date.now());
        }
      }
    } catch (error) {
      console.error('❌ Warning check failed:', error);
    }
  }

  async runManualCleanup() {
    return await this.db.runCleanup(this.config);
  }

  async previewCleanup() {
    return await this.db.previewCleanup(this.config);
  }

  logCleanupSummary(before, after) {
    if (!before || !after) return;
    
    const beforeMap = new Map(before.map(item => [item.category, item.count]));
    const afterMap = new Map(after.map(item => [item.category, item.count]));

    // Calculate differences
    const categories = ['finished_games', 'waiting_games', 'cancelled_games', 'guest_players_inactive'];
    
    categories.forEach(category => {
      const beforeCount = beforeMap.get(category) || 0;
      const afterCount = afterMap.get(category) || 0;
      const deleted = beforeCount - afterCount;
      
      if (deleted > 0) {
        console.log(`   ${category}: ${deleted} removed (${beforeCount} → ${afterCount})`);
      }
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.config.execution.intervalMinutes,
      autoCleanupEnabled: this.config.execution.autoCleanupEnabled,
      nextRunIn: this.isRunning ? 'Running on schedule' : 'Not scheduled'
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart scheduler if running to apply new interval
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

module.exports = CleanupScheduler;
