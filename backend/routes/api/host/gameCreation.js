const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { validateHostPermission } = require('../../../middleware/hostAuth');
const logger = require('../../../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * CREATE GAME (REST API) - Phase 6 Integration
 * This endpoint creates games through the new Phase 6 system
 * while maintaining compatibility with existing socket-based creation
 */
router.post('/create-game', async (req, res) => {
  try {
    const { questionSetId, settings = {} } = req.body;
    
    // For now, we'll extract host ID from Authorization header
    // In production, you'd want proper JWT validation here
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '認証が必要です'
      });
    }

    const hostId = req.user?.id || 'temp-host-id'; // Temporary for testing

    logger.info('Phase 6 Game Creation Request', {
      hostId,
      questionSetId,
      settings,
      requestId: req.id
    });

    // Validate question set exists
    const { data: questionSet, error: questionSetError } = await supabase
      .from('question_sets')
      .select('id, title, questions')
      .eq('id', questionSetId)
      .single();

    if (questionSetError || !questionSet) {
      logger.warn('Invalid question set for game creation', {
        questionSetId,
        error: questionSetError?.message,
        hostId
      });
      
      return res.status(400).json({
        success: false,
        message: '指定された問題セットが見つかりません'
      });
    }

    // Generate unique game code
    const gameCode = generateGameCode();
    
    // Create game settings
    const gameSettings = {
      title: settings.title || questionSet.title || 'クイズゲーム',
      questionSet: questionSetId,
      timeLimit: settings.timeLimit || 30,
      pointsPerQuestion: settings.pointsPerQuestion || 10,
      bonusPoints: settings.bonusPoints || 5,
      maxPlayers: settings.maxPlayers || 50,
      allowLateJoin: settings.allowLateJoin !== false,
      showLeaderboard: settings.showLeaderboard !== false,
      randomizeQuestions: settings.randomizeQuestions || false,
      randomizeAnswers: settings.randomizeAnswers || false,
      hostControl: {
        pauseEnabled: true,
        skipEnabled: true,
        emergencyStopEnabled: true,
        timerControl: true,
        playerManagement: true
      },
      ...settings
    };

    // Create game in database
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        game_code: gameCode,
        host_id: hostId,
        question_set_id: questionSetId,
        game_settings: gameSettings,
        status: 'waiting',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (gameError) {
      logger.error('Database error creating game', {
        error: gameError.message,
        hostId,
        questionSetId,
        gameCode
      });
      
      return res.status(500).json({
        success: false,
        message: 'ゲーム作成中にエラーが発生しました'
      });
    }

    // Log successful creation
    logger.info('Phase 6 Game Created Successfully', {
      gameId: game.id,
      gameCode,
      hostId,
      questionSetId,
      settings: gameSettings,
      requestId: req.id
    });

    // Respond with game data
    res.status(201).json({
      success: true,
      message: 'ゲームが正常に作成されました',
      game: {
        id: game.id,
        gameCode,
        title: gameSettings.title,
        hostId,
        questionSetId,
        settings: gameSettings,
        status: 'waiting',
        createdAt: game.created_at
      }
    });

  } catch (error) {
    logger.error('Unexpected error in game creation', {
      error: error.message,
      stack: error.stack,
      hostId: req.user?.id,
      requestId: req.id
    });

    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * GET GAME STATUS - Check current game state
 */
router.get('/game/:gameCode/status', async (req, res) => {
  try {
    const { gameCode } = req.params;
    
    // For now, we'll extract host ID from Authorization header
    // In production, you'd want proper JWT validation here
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '認証が必要です'
      });
    }

    const hostId = req.user?.id; // This will be set by auth middleware when properly implemented

    const { data: game, error } = await supabase
      .from('games')
      .select(`
        id,
        game_code,
        host_id,
        question_set_id,
        game_settings,
        status,
        current_question,
        created_at,
        updated_at
      `)
      .eq('game_code', gameCode)
      .eq('host_id', hostId)
      .single();

    if (error || !game) {
      return res.status(404).json({
        success: false,
        message: 'ゲームが見つかりません'
      });
    }

    // Get player count
    const { count: playerCount } = await supabase
      .from('game_participants')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id);

    res.json({
      success: true,
      game: {
        ...game,
        playerCount: playerCount || 0
      }
    });

  } catch (error) {
    logger.error('Error fetching game status', {
      error: error.message,
      gameCode: req.params.gameCode,
      hostId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'ゲーム状態の取得に失敗しました'
    });
  }
});

/**
 * UPDATE GAME SETTINGS - Modify game settings before/during game
 */
router.patch('/game/:gameCode/settings', async (req, res) => {
  try {
    const { gameCode } = req.params;
    const { settings } = req.body;
    
    // For now, we'll extract host ID from Authorization header
    // In production, you'd want proper JWT validation here
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '認証が必要です'
      });
    }

    const hostId = req.user?.id; // This will be set by auth middleware when properly implemented

    // Validate game ownership
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, game_settings, status')
      .eq('game_code', gameCode)
      .eq('host_id', hostId)
      .single();

    if (gameError || !game) {
      return res.status(404).json({
        success: false,
        message: 'ゲームが見つかりません'
      });
    }

    // Merge new settings with existing
    const updatedSettings = {
      ...game.game_settings,
      ...settings,
      updatedAt: new Date().toISOString()
    };

    // Update game settings
    const { error: updateError } = await supabase
      .from('games')
      .update({
        game_settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', game.id);

    if (updateError) {
      logger.error('Error updating game settings', {
        error: updateError.message,
        gameId: game.id,
        gameCode,
        hostId
      });

      return res.status(500).json({
        success: false,
        message: '設定の更新に失敗しました'
      });
    }

    logger.info('Game settings updated', {
      gameId: game.id,
      gameCode,
      hostId,
      updatedSettings
    });

    res.json({
      success: true,
      message: '設定が正常に更新されました',
      settings: updatedSettings
    });

  } catch (error) {
    logger.error('Unexpected error updating game settings', {
      error: error.message,
      gameCode: req.params.gameCode,
      hostId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * Helper function to generate unique game codes
 */
function generateGameCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = router;
