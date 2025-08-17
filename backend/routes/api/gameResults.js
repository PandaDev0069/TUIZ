const express = require('express');
const router = express.Router();
const DatabaseManager = require('../../config/database');
const { createClient } = require('@supabase/supabase-js');
const AuthMiddleware = require('../../middleware/auth');
const RateLimitMiddleware = require('../../middleware/rateLimiter');
const logger = require('../../utils/logger');

// Auth middleware shorthand
const auth = AuthMiddleware.authenticateToken;

const db = new DatabaseManager();

// Get all results for a specific game (Enhanced)
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { includePlayerInfo = true, sortBy = 'final_rank' } = req.query;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    logger.debug(`📊 Getting game results for game: ${gameId}`);
    
    let query = db.supabase
      .from('game_results')
      .select(includePlayerInfo === 'true' 
        ? `*, game_players!inner(player_name, is_guest, is_host)`
        : '*'
      )
      .eq('game_id', gameId);

    // Apply sorting
    const validSortFields = ['final_rank', 'final_score', 'total_correct', 'completion_percentage'];
    if (validSortFields.includes(sortBy)) {
      const ascending = sortBy === 'final_rank'; // Rank should be ascending, others descending
      query = query.order(sortBy, { ascending });
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: {
        results: data,
        gameId,
        totalResults: data.length
      }
    });

  } catch (error) {
    logger.error('❌ Get game results error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get detailed question analytics for a game (NEW)
router.get('/game/:gameId/questions', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }
    
    logger.debug(`📊 Getting question analytics for: ${gameId}`);
    
    const [answerStatsResult, playerAnswersResult] = await Promise.all([
      db.getGameAnswerStats(gameId),
      db.getPlayerAnswers(gameId)
    ]);

    if (!answerStatsResult.success) {
      return res.status(500).json({
        success: false,
        error: answerStatsResult.error
      });
    }

    if (!playerAnswersResult.success) {
      return res.status(500).json({
        success: false,
        error: playerAnswersResult.error
      });
    }

    // Group answers by question for detailed breakdown
    const questionBreakdown = {};
    playerAnswersResult.answers.forEach(answer => {
      if (!questionBreakdown[answer.question_id]) {
        questionBreakdown[answer.question_id] = {
          questionId: answer.question_id,
          answers: []
        };
      }
      questionBreakdown[answer.question_id].answers.push({
        playerId: answer.player_id,
        answerChoice: answer.answer_choice,
        answerText: answer.answer_text,
        isCorrect: answer.is_correct,
        responseTime: answer.response_time,
        submittedAt: answer.created_at
      });
    });

    res.json({
      success: true,
      data: {
        questionStats: answerStatsResult.questionStats,
        questionBreakdown: Object.values(questionBreakdown),
        totalAnswers: playerAnswersResult.answers.length
      }
    });

  } catch (error) {
    logger.error('❌ Get question analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get detailed analytics for a game (Enhanced with answer data)
router.get('/game/:gameId/analytics', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }
    
    logger.debug(`📈 Getting game analytics for: ${gameId}`);
    
    const { data: results, error } = await db.supabase
      .from('game_results')
      .select(`
        *,
        game_players!inner(player_name, is_guest, is_host),
        games!inner(created_at, started_at, ended_at, question_sets(title, difficulty_level))
      `)
      .eq('game_id', gameId);

    if (error) throw error;

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No results found for this game'
      });
    }

    // Get detailed answer statistics
    const answerStatsResult = await db.getGameAnswerStats(gameId);
    const questionStats = answerStatsResult.success ? answerStatsResult.questionStats : [];

    // Calculate analytics
    const analytics = {
      gameInfo: {
        gameId,
        title: results[0].games.question_sets?.title || 'Unknown Quiz',
        difficulty: results[0].games.question_sets?.difficulty_level || 'medium',
        startedAt: results[0].games.started_at,
        endedAt: results[0].games.ended_at,
        duration: results[0].games.ended_at && results[0].games.started_at 
          ? Math.round((new Date(results[0].games.ended_at) - new Date(results[0].games.started_at)) / 1000 / 60) // minutes
          : 0
      },
      playerStats: {
        totalPlayers: results.length,
        guestPlayers: results.filter(r => r.game_players.is_guest).length,
        registeredPlayers: results.filter(r => !r.game_players.is_guest).length,
        hostPlayers: results.filter(r => r.game_players.is_host).length
      },
      performanceStats: {
        averageScore: Math.round(results.reduce((sum, r) => sum + r.final_score, 0) / results.length),
        highestScore: Math.max(...results.map(r => r.final_score)),
        lowestScore: Math.min(...results.map(r => r.final_score)),
        averageCorrect: Math.round(results.reduce((sum, r) => sum + r.total_correct, 0) / results.length),
        averageCompletion: Math.round(results.reduce((sum, r) => sum + r.completion_percentage, 0) / results.length),
        averageResponseTime: Math.round(results.reduce((sum, r) => sum + r.average_response_time, 0) / results.length),
        longestStreak: Math.max(...results.map(r => r.longest_streak))
      },
        leaderboard: results
        .sort((a, b) => a.final_rank - b.final_rank)
        .slice(0, 10)
        .map(r => ({
          rank: r.final_rank,
          playerName: r.game_players.player_name,
          score: r.final_score,
          correct: r.total_correct,
          completion: r.completion_percentage,
          streak: r.longest_streak,
          isGuest: r.game_players.is_guest,
          isHost: r.game_players.is_host
        })),
      questionAnalytics: questionStats.map(q => ({
        questionId: q.questionId,
        totalAnswers: q.totalAnswers,
        correctAnswers: q.correctAnswers,
        accuracyPercentage: q.accuracyPercentage,
        averageResponseTime: q.averageResponseTime,
        fastestResponse: q.fastestResponse,
        slowestResponse: q.slowestResponse
      }))
    };    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('❌ Get game analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get results for a specific player (NEW)
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 10, includeGameInfo = true } = req.query;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }
    
    logger.debug(`👤 Getting results for player: ${playerId}`);
    
    let query = db.supabase
      .from('game_results')
      .select(includeGameInfo === 'true'
        ? `*, games!inner(created_at, question_sets(title))`
        : '*'
      )
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    const { data, error } = await query;

    if (error) throw error;

    // Calculate player statistics
    const stats = data.length > 0 ? {
      totalGames: data.length,
      averageScore: Math.round(data.reduce((sum, r) => sum + r.final_score, 0) / data.length),
      averageRank: Math.round(data.reduce((sum, r) => sum + r.final_rank, 0) / data.length),
      averageCorrect: Math.round(data.reduce((sum, r) => sum + r.total_correct, 0) / data.length),
      averageCompletion: Math.round(data.reduce((sum, r) => sum + r.completion_percentage, 0) / data.length),
      bestRank: Math.min(...data.map(r => r.final_rank)),
      bestScore: Math.max(...data.map(r => r.final_score)),
      longestStreak: Math.max(...data.map(r => r.longest_streak))
    } : null;

    res.json({
      success: true,
      data: {
        results: data,
        stats,
        playerId
      }
    });

  } catch (error) {
    logger.error('❌ Get player results error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get global leaderboard across multiple games (NEW)
router.get('/leaderboard', async (req, res) => {
  try {
    const { 
      limit = 50, 
      timeframe = 'all', // 'week', 'month', 'all'
      metric = 'average_score' // 'average_score', 'total_score', 'win_rate'
    } = req.query;
    
    logger.debug(`🏆 Getting global leaderboard: ${metric}, ${timeframe}`);
    
    let query = db.supabase
      .from('game_results')
      .select(`
        player_id,
        final_score,
        final_rank,
        total_correct,
        completion_percentage,
        created_at,
        game_players!inner(player_name, is_guest)
      `);

    // Apply timeframe filter
    if (timeframe !== 'all') {
      const date = new Date();
      if (timeframe === 'week') {
        date.setDate(date.getDate() - 7);
      } else if (timeframe === 'month') {
        date.setMonth(date.getMonth() - 1);
      }
      query = query.gte('created_at', date.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by player and calculate metrics
    const playerStats = {};
    
    data.forEach(result => {
      const playerId = result.player_id;
      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          playerId,
          playerName: result.game_players.player_name,
          isGuest: result.game_players.is_guest,
          games: [],
          totalScore: 0,
          totalGames: 0,
          wins: 0,
          averageRank: 0
        };
      }
      
      const stats = playerStats[playerId];
      stats.games.push(result);
      stats.totalScore += result.final_score;
      stats.totalGames += 1;
      if (result.final_rank === 1) stats.wins += 1;
    });

    // Calculate final metrics and sort
    const leaderboard = Object.values(playerStats)
      .map(stats => ({
        ...stats,
        averageScore: Math.round(stats.totalScore / stats.totalGames),
        winRate: Math.round((stats.wins / stats.totalGames) * 100),
        averageRank: Math.round(stats.games.reduce((sum, g) => sum + g.final_rank, 0) / stats.totalGames)
      }))
      .filter(stats => stats.totalGames >= 1) // Only include players with at least 1 game
      .sort((a, b) => {
        switch (metric) {
          case 'total_score':
            return b.totalScore - a.totalScore;
          case 'win_rate':
            return b.winRate - a.winRate;
          case 'average_score':
          default:
            return b.averageScore - a.averageScore;
        }
      })
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        leaderboard,
        timeframe,
        metric,
        totalPlayers: leaderboard.length
      }
    });

  } catch (error) {
    logger.error('❌ Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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
    logger.error('❌ Create game results API error:', error);
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
    logger.error('❌ Finish game API error:', error);
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
    logger.error('❌ Get player history API error:', error);
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
    logger.error('❌ Get user stats API error:', error);
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
    logger.error('❌ Get host game summary API error:', error);
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
    logger.error('❌ Get global leaderboard API error:', error);
    res.status(500).json({ error: 'Failed to get global leaderboard' });
  }
});

module.exports = router;
