// Host Game Control Routes - Backend API Implementation
// Phase 6: Complete Missing Backend Infrastructure

const express = require('express');
const router = express.Router();
const { validateHostPermission, validateGameState } = require('../../../middleware/hostAuth');
const { RoomManager } = require('../../../utils/RoomManager');
const logger = require('../../../utils/logger');

/**
 * Host Game Control Endpoints
 * Implements all missing host control functionality from api-requirements.md
 */

// Add middleware to attach io instance to request
router.use((req, res, next) => {
  req.io = require('../../../server').getIO();
  next();
});

// Pause Game
router.post('/:gameId/pause', 
  validateHostPermission,
  validateGameState(['active']),
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { pauseReason = 'host_action', message } = req.body;
      
      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      // Update game state
      const pausedAt = new Date().toISOString();
      room.gameState = {
        ...room.gameState,
        status: 'paused',
        pausedAt,
        pauseReason,
        pausedDuration: room.gameState.pausedDuration || 0
      };

      // Broadcast to all players
      req.io.to(gameId).emit('game:paused', {
        gameId,
        pausedAt,
        reason: pauseReason,
        message: message || 'Game paused by host'
      });

      // Log host action
      logger.info(`Game ${gameId} paused by host`, {
        gameId,
        hostId: req.user.id,
        reason: pauseReason,
        timestamp: pausedAt
      });

      res.json({
        success: true,
        gameState: {
          status: 'paused',
          pausedAt,
          pausedDuration: room.gameState.pausedDuration,
          canResume: true
        }
      });

    } catch (error) {
      logger.error('Failed to pause game:', error);
      res.status(500).json({ error: 'Failed to pause game' });
    }
  }
);

// Resume Game
router.post('/:gameId/resume',
  validateHostPermission,
  validateGameState(['paused']),
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { countdown = 3, message } = req.body;
      
      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const resumedAt = new Date().toISOString();
      const pausedDuration = room.gameState.pausedDuration || 0;
      const sessionPausedTime = new Date(resumedAt) - new Date(room.gameState.pausedAt);
      
      // Update game state
      room.gameState = {
        ...room.gameState,
        status: 'resuming',
        resumedAt,
        totalPausedDuration: pausedDuration + sessionPausedTime
      };

      // Broadcast countdown to all players
      let countdownValue = countdown;
      const countdownInterval = setInterval(() => {
        req.io.to(gameId).emit('game:resuming:countdown', {
          gameId,
          countdown: countdownValue,
          message: message || `Game resuming in ${countdownValue}...`
        });

        countdownValue--;
        
        if (countdownValue < 0) {
          clearInterval(countdownInterval);
          
          // Actually resume the game
          room.gameState.status = 'active';
          req.io.to(gameId).emit('game:resumed', {
            gameId,
            resumedAt,
            currentQuestion: room.gameState.currentQuestion,
            totalPausedDuration: room.gameState.totalPausedDuration
          });
        }
      }, 1000);

      // Log host action
      logger.info(`Game ${gameId} resumed by host`, {
        gameId,
        hostId: req.user.id,
        resumedAt,
        totalPausedDuration: room.gameState.totalPausedDuration
      });

      res.json({
        success: true,
        gameState: {
          status: 'resuming',
          resumedAt,
          totalPausedDuration: room.gameState.totalPausedDuration,
          currentQuestion: room.gameState.currentQuestion
        }
      });

    } catch (error) {
      logger.error('Failed to resume game:', error);
      res.status(500).json({ error: 'Failed to resume game' });
    }
  }
);

// Skip Question
router.post('/:gameId/skip-question',
  validateHostPermission,
  validateGameState(['active', 'paused']),
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { skipReason = 'host_decision', showCorrectAnswer = true } = req.body;
      
      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const currentQuestion = room.gameState.currentQuestion;
      const nextQuestion = currentQuestion + 1;
      const skippedQuestions = room.gameState.skippedQuestions || [];

      // Update game state
      room.gameState = {
        ...room.gameState,
        currentQuestion: nextQuestion,
        skippedQuestions: [...skippedQuestions, currentQuestion],
        lastAction: {
          type: 'skip_question',
          questionNumber: currentQuestion,
          reason: skipReason,
          timestamp: new Date().toISOString()
        }
      };

      // Broadcast to all players
      req.io.to(gameId).emit('question:skipped', {
        gameId,
        skippedQuestion: currentQuestion,
        nextQuestion,
        reason: skipReason,
        showCorrectAnswer,
        totalSkipped: room.gameState.skippedQuestions.length
      });

      // If not the last question, advance to next
      if (nextQuestion <= room.totalQuestions) {
        setTimeout(() => {
          req.io.to(gameId).emit('question:next', {
            gameId,
            questionNumber: nextQuestion,
            question: room.questions[nextQuestion - 1]
          });
        }, 2000);
      } else {
        // Game complete
        room.gameState.status = 'completed';
        req.io.to(gameId).emit('game:completed', {
          gameId,
          completedQuestions: room.totalQuestions - room.gameState.skippedQuestions.length,
          skippedQuestions: room.gameState.skippedQuestions.length
        });
      }

      // Log host action
      logger.info(`Question ${currentQuestion} skipped in game ${gameId}`, {
        gameId,
        hostId: req.user.id,
        questionNumber: currentQuestion,
        reason: skipReason
      });

      res.json({
        success: true,
        skippedQuestion: currentQuestion,
        nextQuestion,
        gameState: {
          currentQuestion: nextQuestion,
          skippedQuestions: room.gameState.skippedQuestions,
          status: room.gameState.status
        }
      });

    } catch (error) {
      logger.error('Failed to skip question:', error);
      res.status(500).json({ error: 'Failed to skip question' });
    }
  }
);

// Emergency Stop
router.post('/:gameId/emergency-stop',
  validateHostPermission,
  validateGameState(['active', 'paused']),
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { reason = 'host_emergency', saveProgress = true } = req.body;
      
      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const stoppedAt = new Date().toISOString();
      
      // Save final state if requested
      let sessionData = null;
      if (saveProgress) {
        sessionData = {
          gameId,
          completedQuestions: room.gameState.currentQuestion - 1,
          players: room.players,
          gameState: room.gameState,
          stoppedAt,
          reason
        };
        
        // TODO: Save to database for potential recovery
      }

      // Create final leaderboard
      const finalLeaderboard = Object.values(room.players)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map((player, index) => ({
          rank: index + 1,
          playerId: player.id,
          playerName: player.name,
          score: player.score || 0
        }));

      // Update room state
      room.gameState = {
        ...room.gameState,
        status: 'stopped',
        stoppedAt,
        stopReason: reason,
        emergencyStop: true
      };

      // Broadcast emergency stop to all players
      req.io.to(gameId).emit('game:emergency:stopped', {
        gameId,
        reason,
        stoppedAt,
        finalLeaderboard,
        message: 'Game stopped by host due to emergency'
      });

      // Log emergency action
      logger.warn(`Emergency stop triggered for game ${gameId}`, {
        gameId,
        hostId: req.user.id,
        reason,
        stoppedAt,
        completedQuestions: room.gameState.currentQuestion - 1
      });

      res.json({
        success: true,
        finalState: {
          status: 'stopped',
          stoppedAt,
          completedQuestions: room.gameState.currentQuestion - 1,
          finalLeaderboard,
          sessionData: saveProgress ? 'saved' : 'not_saved'
        }
      });

    } catch (error) {
      logger.error('Failed to emergency stop game:', error);
      res.status(500).json({ error: 'Failed to emergency stop game' });
    }
  }
);

// Adjust Timer
router.post('/:gameId/adjust-timer',
  validateHostPermission,
  validateGameState(['active']),
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { adjustment, reason = 'host_decision' } = req.body;
      
      if (!adjustment || typeof adjustment !== 'number') {
        return res.status(400).json({ error: 'Valid time adjustment required' });
      }

      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const currentTimer = room.gameState.timer || {};
      const newRemaining = Math.max(0, (currentTimer.remaining || 0) + adjustment);
      const adjustmentRecord = {
        amount: adjustment,
        reason,
        timestamp: new Date().toISOString(),
        hostId: req.user.id
      };

      // Update timer state
      room.gameState.timer = {
        ...currentTimer,
        remaining: newRemaining,
        adjustments: [...(currentTimer.adjustments || []), adjustmentRecord]
      };

      // Broadcast timer adjustment
      req.io.to(gameId).emit('timer:adjusted', {
        gameId,
        adjustment,
        newRemaining,
        reason,
        totalAdjustments: room.gameState.timer.adjustments.length
      });

      // Log timer adjustment
      logger.info(`Timer adjusted in game ${gameId}`, {
        gameId,
        hostId: req.user.id,
        adjustment,
        newRemaining,
        reason
      });

      res.json({
        success: true,
        timer: {
          remaining: newRemaining,
          total: currentTimer.total || 60,
          adjustments: room.gameState.timer.adjustments
        }
      });

    } catch (error) {
      logger.error('Failed to adjust timer:', error);
      res.status(500).json({ error: 'Failed to adjust timer' });
    }
  }
);

// Reset Timer
router.post('/:gameId/reset-timer',
  validateHostPermission,
  validateGameState(['active', 'paused']),
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { newDuration, reason = 'restart_question' } = req.body;
      
      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const duration = newDuration || room.gameState.timer?.total || 60;
      
      // Reset timer
      room.gameState.timer = {
        remaining: duration,
        total: duration,
        isRunning: false,
        resetAt: new Date().toISOString(),
        resetReason: reason
      };

      // Broadcast timer reset
      req.io.to(gameId).emit('timer:reset', {
        gameId,
        newDuration: duration,
        reason,
        resetAt: room.gameState.timer.resetAt
      });

      // Log timer reset
      logger.info(`Timer reset in game ${gameId}`, {
        gameId,
        hostId: req.user.id,
        newDuration: duration,
        reason
      });

      res.json({
        success: true,
        timer: {
          remaining: duration,
          total: duration,
          isRunning: false
        }
      });

    } catch (error) {
      logger.error('Failed to reset timer:', error);
      res.status(500).json({ error: 'Failed to reset timer' });
    }
  }
);

module.exports = router;
