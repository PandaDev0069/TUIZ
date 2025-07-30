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
      console.log('⚠️ Cleanup scheduler is already running');
      return;
    }

    if (!this.config.execution.autoCleanupEnabled) {
      console.log('ℹ️ Auto cleanup is disabled in config');
      return;
    }

    console.log(`🧹 Starting cleanup scheduler - interval: ${this.config.execution.intervalMinutes} minutes`);
    
    // Development override: if NODE_ENV is development, allow very short intervals
    const isDevelopment = process.env.NODE_ENV === 'development';
    const intervalMs = this.config.execution.intervalMinutes * 60 * 1000;
    
    console.log(`🔧 Scheduler config:`, {
      intervalMinutes: this.config.execution.intervalMinutes,
      intervalMs: intervalMs,
      isDevelopment,
      actualIntervalSeconds: intervalMs / 1000
    });
    
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
    console.log('🛑 Cleanup scheduler stopped');
  }

  async runCleanupCycle() {
    try {
      console.log('🧹 Running scheduled cleanup cycle...');
      
      // First check for warnings
      await this.checkAndSendWarnings();
      
      // Get current stats before cleanup
      const statsBefore = await this.db.getCleanupStats();
      
      // Run the cleanup
      const result = await this.db.runCleanup(this.config);
      
      if (result.success) {
        console.log('✅ Cleanup cycle completed successfully');
        
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
        console.log('⚠️ Socket.IO not available for warnings');
        return;
      }

      console.log('🔍 Checking for games needing warnings...');
      console.log('📋 Database client status:', {
        hasDB: !!this.db,
        hasSupabaseAdmin: !!this.db?.supabaseAdmin,
        dbType: typeof this.db
      });
      
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
        console.log('ℹ️ No games found for warning check');
        return;
      }

      console.log(`📋 Found ${warningGames.length} games to check for warnings`);

      // Send warnings for each game
      for (const game of warningGames) {
        const timeoutMinutes = game.status === 'waiting' 
          ? this.config.games.waitingGameTimeout 
          : this.config.games.activeGameTimeout;
          
        const remaining = this.config.calculateRemainingTime(game.created_at, timeoutMinutes);
        
        if (remaining.isExpired) {
          console.log(`⏰ Game ${game.game_code} has already expired (${remaining.remainingMinutes} min)`);
          continue;
        }
        
        // Fix warning threshold calculation
        const firstWarningAt = timeoutMinutes * (1 - this.config.warnings.intervals[0]); // 50% remaining (50% elapsed)
        const finalWarningAt = timeoutMinutes * (1 - this.config.warnings.intervals[1]); // 25% remaining (75% elapsed)
        
        console.log(`🔍 Warning thresholds for game ${game.game_code}:`, {
          totalTimeout: timeoutMinutes,
          firstWarningAt: `${firstWarningAt} min`,
          finalWarningAt: `${finalWarningAt} min`,
          currentRemaining: `${remaining.remainingMinutes} min (${remaining.remainingSeconds}s)`,
          status: game.status,
          exactTime: `${Math.floor(remaining.remainingSeconds / 60)}:${String(remaining.remainingSeconds % 60).padStart(2, '0')}`
        });
        
        let warningType = null;
        if (remaining.remainingMinutes <= finalWarningAt) {
          warningType = 'final';
          console.log(`🚨 FINAL WARNING triggered: ${remaining.remainingMinutes} min <= ${finalWarningAt} min threshold`);
        } else if (remaining.remainingMinutes <= firstWarningAt) {
          warningType = 'first';
          console.log(`⚠️ FIRST WARNING triggered: ${remaining.remainingMinutes} min <= ${firstWarningAt} min threshold`);
        } else {
          console.log(`✅ NO WARNING: ${remaining.remainingMinutes} min > ${firstWarningAt} min (first threshold)`);
        }
        
        if (warningType) {
          // Check if we've already sent this warning type for this game
          const warningKey = `${game.game_code}-${warningType}`;
          if (this.sentWarnings.has(warningKey)) {
            console.log(`🔇 Already sent ${warningType} warning to room ${game.game_code}, skipping`);
            continue;
          }
          
          console.log(`🔍 Warning config check:`, {
            warningType,
            hasFirstMessage: !!this.config.warnings?.firstWarningMessage,
            hasFinalMessage: !!this.config.warnings?.finalWarningMessage,
            firstMessage: this.config.warnings?.firstWarningMessage,
            finalMessage: this.config.warnings?.finalWarningMessage
          });
          
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
          
          console.log(`📊 Warning Decision Summary:`, {
            warningType,
            remainingMinutes: remaining.remainingMinutes,
            finalThreshold: finalWarningAt,
            shouldAutoRedirect: warningType === 'final' && remaining.remainingMinutes <= 0.3,
            autoRedirectConfig: warningData.autoRedirect,
            delaySeconds: warningData.autoRedirect?.delaySeconds || 'N/A'
          });
          
          io.to(game.game_code).emit('cleanupWarning', warningData);
          
          // Mark this warning as sent
          this.sentWarnings.set(warningKey, Date.now());
          
          console.log(`⚠️  Sent ${warningType} warning to room ${game.game_code} (${remaining.remainingMinutes} min remaining)`);
          console.log(`📡 Warning data:`, JSON.stringify(warningData, null, 2));
        } else {
          console.log(`✅ Game ${game.game_code} still has ${remaining.remainingMinutes} min remaining (no warning needed)`);
        }
      }
    } catch (error) {
      console.error('❌ Warning check failed:', error);
    }
  }

  async runManualCleanup() {
    console.log('🧹 Running manual cleanup...');
    return await this.db.runCleanup(this.config);
  }

  async previewCleanup() {
    console.log('👀 Previewing cleanup operations...');
    return await this.db.previewCleanup(this.config);
  }

  logCleanupSummary(before, after) {
    if (!before || !after) return;

    console.log('📊 Cleanup Summary:');
    
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
    console.log('🔧 Cleanup config updated');
    
    // Restart scheduler if running to apply new interval
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

module.exports = CleanupScheduler;
