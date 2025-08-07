const express = require('express');
const router = express.Router();
const DatabaseManager = require('../../config/database');
const { createClient } = require('@supabase/supabase-js');
const AuthMiddleware = require('../../middleware/auth');
const RateLimitMiddleware = require('../../middleware/rateLimiter');

const db = new DatabaseManager();

// Get game results/leaderboard for a specific game
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const result = await db.getGameLeaderboard(gameId);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      leaderboard: result.leaderboard
    });
  } catch (error) {
    console.error('❌ Get game results API error:', error);
    res.status(500).json({ error: 'Failed to get game results' });
  }
});

// Manually create game results (admin/testing endpoint)
router.post('/create/:gameId', auth, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const result = await db.createGameResults(gameId);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Game results created successfully',
      results: result.results
    });
  } catch (error) {
    console.error('❌ Create game results API error:', error);
    res.status(500).json({ error: 'Failed to create game results' });
  }
});

// Finish a game and create results
router.post('/finish/:gameId', auth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { additionalData } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Verify user is the host of this game
    const gameResult = await db.getGameByCode(gameId);
    if (!gameResult.success) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.game.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the game host can finish the game' });
    }

    const result = await db.finishGameAndCreateResults(gameId, additionalData);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Game finished and results created successfully',
      game: result.game,
      resultsCount: result.resultsCount
    });
  } catch (error) {
    console.error('❌ Finish game API error:', error);
    res.status(500).json({ error: 'Failed to finish game' });
  }
});

// Get player's game history
router.get('/player/history', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get user's game_player_uuid first
    const userResult = await db.getUserById(req.user.id);
    if (!userResult.success) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userResult.user.game_player_uuid) {
      return res.json({
        success: true,
        history: []
      });
    }

    const result = await db.getPlayerGameHistory(userResult.user.game_player_uuid, parseInt(limit));
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      history: result.history
    });
  } catch (error) {
    console.error('❌ Get player history API error:', error);
    res.status(500).json({ error: 'Failed to get player history' });
  }
});

// Get user's comprehensive stats
router.get('/player/stats', auth, async (req, res) => {
  try {
    const result = await db.getUserStats(req.user.id);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      stats: result.stats
    });
  } catch (error) {
    console.error('❌ Get user stats API error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// Get comprehensive game summary for hosts
router.get('/host/summary/:gameId', auth, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Verify user is the host of this game
    const gameResult = await db.getGameById(gameId);
    if (!gameResult.success) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.game.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the game host can view game summary' });
    }

    // Get comprehensive game data
    const [leaderboardResult] = await Promise.all([
      db.getGameLeaderboard(gameId)
    ]);

    if (!leaderboardResult.success) {
      return res.status(500).json({ error: leaderboardResult.error });
    }

    // Calculate summary statistics
    const players = leaderboardResult.leaderboard;
    const totalPlayers = players.length;
    const totalScore = players.reduce((sum, p) => sum + p.final_score, 0);
    const averageScore = totalPlayers > 0 ? Math.round(totalScore / totalPlayers) : 0;
    const highestScore = totalPlayers > 0 ? Math.max(...players.map(p => p.final_score)) : 0;
    const lowestScore = totalPlayers > 0 ? Math.min(...players.map(p => p.final_score)) : 0;
    
    const totalCorrectAnswers = players.reduce((sum, p) => sum + p.total_correct, 0);
    const totalQuestionsAnswered = players.reduce((sum, p) => sum + p.total_questions, 0);
    const overallAccuracy = totalQuestionsAnswered > 0 ? 
      Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) : 0;
    
    const averageResponseTime = players.length > 0 ? 
      Math.round(players.reduce((sum, p) => sum + (p.average_response_time || 0), 0) / players.length) : 0;
    
    const guestPlayers = players.filter(p => p.game_players?.[0]?.is_guest).length;
    const registeredPlayers = totalPlayers - guestPlayers;
    
    const completionRates = players.map(p => p.completion_percentage);
    const averageCompletion = completionRates.length > 0 ? 
      Math.round(completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length) : 0;

    res.json({
      success: true,
      summary: {
        gameInfo: {
          gameId: gameId,
          gameCode: gameResult.game.game_code,
          status: gameResult.game.status,
          createdAt: gameResult.game.created_at,
          startedAt: gameResult.game.started_at,
          endedAt: gameResult.game.ended_at,
          questionsAnswered: gameResult.game.questions_answered
        },
        playerStats: {
          totalPlayers,
          registeredPlayers,
          guestPlayers,
          averageCompletion
        },
        scoreStats: {
          averageScore,
          highestScore,
          lowestScore,
          totalScore
        },
        performanceStats: {
          overallAccuracy,
          totalCorrectAnswers,
          totalQuestionsAnswered,
          averageResponseTime
        },
        leaderboard: players.slice(0, 10), // Top 10 for summary
        fullResults: players // All players for detailed view
      }
    });
  } catch (error) {
    console.error('❌ Get host game summary API error:', error);
    res.status(500).json({ error: 'Failed to get game summary' });
  }
});

// Get top players across all games (public leaderboard)
router.get('/leaderboard/global', async (req, res) => {
  try {
    const { limit = 20, timeframe = 'all' } = req.query;
    
    let timeFilter = '';
    if (timeframe === 'week') {
      timeFilter = "AND gr.created_at >= NOW() - INTERVAL '7 days'";
    } else if (timeframe === 'month') {
      timeFilter = "AND gr.created_at >= NOW() - INTERVAL '30 days'";
    }

    // Use raw SQL for complex aggregation
    const { data, error } = await db.supabaseAdmin
      .rpc('get_global_leaderboard', {
        limit_param: parseInt(limit),
        timeframe_param: timeframe
      });

    if (error) throw error;

    res.json({
      success: true,
      leaderboard: data || []
    });
  } catch (error) {
    console.error('❌ Get global leaderboard API error:', error);
    res.status(500).json({ error: 'Failed to get global leaderboard' });
  }
});

module.exports = router;
