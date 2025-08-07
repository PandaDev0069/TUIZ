const express = require('express');
const router = express.Router();
const DatabaseManager = require('../../config/database');
const AuthMiddleware = require('../../middleware/auth');
const roomManager = require('../../utils/RoomManager');
const activeGameUpdater = require('../../utils/ActiveGameUpdater');

// Initialize database
const db = new DatabaseManager();

// Helper function to update activeGame maxPlayers in game_settings
function updateActiveGamePlayersCap(gameCode, maxPlayers) {
  console.log(`🔄 Updating maxPlayers for game ${gameCode}: ${maxPlayers}`);
  
  // Store the update in room manager for backup
  const room = roomManager.getRoom(gameCode);
  if (room) {
    room._pendingPlayersCap = maxPlayers;
    console.log(`✅ Set _pendingPlayersCap = ${maxPlayers} for room ${gameCode}`);
  } else {
    console.log(`❌ Room ${gameCode} not found in roomManager`);
  }
  
  // Try to update activeGame directly
  const success = activeGameUpdater.updatePlayersCap(gameCode, maxPlayers);
  if (success) {
    console.log(`✅ Successfully updated activeGame maxPlayers for ${gameCode}`);
  } else {
    console.log(`⚠️ Could not update activeGame directly, will rely on pending update`);
  }
}

// Default simplified game settings based on the schema
const DEFAULT_SETTINGS = {
  // PLAYER MANAGEMENT
  maxPlayers: 50,
  
  // GAME FLOW
  autoAdvance: true,
  showExplanations: true,
  explanationTime: 30,
  showLeaderboard: true,
  
  // SCORING
  pointCalculation: 'fixed',
  streakBonus: false,
  
  // DISPLAY OPTIONS
  showProgress: true,
  showCorrectAnswer: true,
  
  // ADVANCED
  spectatorMode: true,
  allowAnswerChange: false
};

// GET /api/game-settings/:questionSetId
// Get settings for a question set (used when creating games)
router.get('/:questionSetId', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { questionSetId } = req.params;
    console.log('GET /api/game-settings/:questionSetId called with:', questionSetId);

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // Get question set with play_settings
    const { data: questionSet, error } = await userSupabase
      .from('question_sets')
      .select('id, title, play_settings')
      .eq('id', questionSetId)
      .single();

    if (error || !questionSet) {
      console.error('Question set not found or access denied:', error);
      return res.status(404).json({
        success: false,
        error: 'Question set not found or access denied'
      });
    }

    console.log('Question set found:', questionSet.title, 'with settings:', questionSet.play_settings);

    // Parse and clean settings from play_settings JSON
    const rawSettings = questionSet.play_settings || {};
    
    // Handle any nested game_settings that might still exist
    const flattenedSettings = rawSettings.game_settings ? 
      { ...rawSettings, ...rawSettings.game_settings } : rawSettings;
    
    // Extract only the simplified settings we support
    const cleanSettings = {
      maxPlayers: flattenedSettings.maxPlayers || flattenedSettings.players_cap || DEFAULT_SETTINGS.maxPlayers,
      autoAdvance: flattenedSettings.autoAdvance !== undefined ? flattenedSettings.autoAdvance : DEFAULT_SETTINGS.autoAdvance,
      showExplanations: flattenedSettings.showExplanations !== undefined ? flattenedSettings.showExplanations : DEFAULT_SETTINGS.showExplanations,
      explanationTime: flattenedSettings.explanationTime || DEFAULT_SETTINGS.explanationTime,
      showLeaderboard: flattenedSettings.showLeaderboard !== undefined ? flattenedSettings.showLeaderboard : DEFAULT_SETTINGS.showLeaderboard,
      pointCalculation: flattenedSettings.pointCalculation || DEFAULT_SETTINGS.pointCalculation,
      streakBonus: flattenedSettings.streakBonus !== undefined ? flattenedSettings.streakBonus : DEFAULT_SETTINGS.streakBonus,
      showProgress: flattenedSettings.showProgress !== undefined ? flattenedSettings.showProgress : DEFAULT_SETTINGS.showProgress,
      showCorrectAnswer: flattenedSettings.showCorrectAnswer !== undefined ? flattenedSettings.showCorrectAnswer : DEFAULT_SETTINGS.showCorrectAnswer,
      spectatorMode: flattenedSettings.spectatorMode !== undefined ? flattenedSettings.spectatorMode : DEFAULT_SETTINGS.spectatorMode,
      allowAnswerChange: flattenedSettings.allowAnswerChange !== undefined ? flattenedSettings.allowAnswerChange : DEFAULT_SETTINGS.allowAnswerChange
    };

    res.json({
      success: true,
      questionSetId: questionSet.id,
      questionSetTitle: questionSet.title,
      settings: cleanSettings,
      defaults: DEFAULT_SETTINGS
    });

  } catch (error) {
    console.error('Error fetching game settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/game-settings/:questionSetId
// Update settings for a question set
router.put('/:questionSetId', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { questionSetId } = req.params;
    const { settings, gameId } = req.body; // Add gameId for active game sync

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
      });
    }

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // Verify ownership of question set
    const { data: questionSet, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id, play_settings')
      .eq('id', questionSetId)
      .single();

    if (verifyError || !questionSet) {
      return res.status(404).json({
        success: false,
        error: 'Question set not found or access denied'
      });
    }

    // Validate and clean incoming settings
    const validatedSettings = {};
    
    // Validate each setting
    if (settings.maxPlayers !== undefined) {
      const maxPlayers = parseInt(settings.maxPlayers);
      if (maxPlayers >= 2 && maxPlayers <= 300) {
        validatedSettings.maxPlayers = maxPlayers;
      }
    }

    if (settings.autoAdvance !== undefined) {
      validatedSettings.autoAdvance = Boolean(settings.autoAdvance);
    }

    if (settings.showExplanations !== undefined) {
      validatedSettings.showExplanations = Boolean(settings.showExplanations);
    }

    if (settings.explanationTime !== undefined) {
      const explanationTime = parseInt(settings.explanationTime);
      if (explanationTime >= 10 && explanationTime <= 120) {
        validatedSettings.explanationTime = explanationTime;
      }
    }

    if (settings.showLeaderboard !== undefined) {
      validatedSettings.showLeaderboard = Boolean(settings.showLeaderboard);
    }

    if (settings.pointCalculation !== undefined) {
      if (['fixed', 'time-bonus'].includes(settings.pointCalculation)) {
        validatedSettings.pointCalculation = settings.pointCalculation;
      }
    }

    if (settings.streakBonus !== undefined) {
      validatedSettings.streakBonus = Boolean(settings.streakBonus);
    }

    if (settings.showProgress !== undefined) {
      validatedSettings.showProgress = Boolean(settings.showProgress);
    }

    if (settings.showCorrectAnswer !== undefined) {
      validatedSettings.showCorrectAnswer = Boolean(settings.showCorrectAnswer);
    }

    if (settings.spectatorMode !== undefined) {
      validatedSettings.spectatorMode = Boolean(settings.spectatorMode);
    }

    if (settings.allowAnswerChange !== undefined) {
      validatedSettings.allowAnswerChange = Boolean(settings.allowAnswerChange);
    }

    // Merge with existing play_settings
    const currentSettings = questionSet.play_settings || {};
    const updatedPlaySettings = {
      ...currentSettings,
      ...validatedSettings
    };

    // Update question set
    const { data: updatedQuestionSet, error: updateError } = await userSupabase
      .from('question_sets')
      .update({
        play_settings: updatedPlaySettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionSetId)
      .select('id, title, play_settings')
      .single();

    if (updateError) {
      console.error('Error updating question set settings:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }

    // SYNC: If gameId is provided, also update the active game settings
    if (gameId) {
      try {
        // Find the room by database gameId (UUID)
        console.log(`🔍 Searching for gameId ${gameId} in RoomManager...`);
        console.log(`🏠 Total rooms in RoomManager: ${roomManager.getAllRoomsMap().size}`);
        
        const roomResult = roomManager.findRoomByGameId(gameId);
        
        if (roomResult) {
          const { roomCode, room } = roomResult;
          console.log(`✅ Found matching room: ${roomCode}`);
          
          // Merge with current room settings
          const mergedRoomSettings = {
            ...room.gameSettings,
            ...validatedSettings
          };
          room.gameSettings = mergedRoomSettings;
          console.log(`🔄 Updated active game settings for room ${roomCode} (gameId: ${gameId})`);
          
          // If maxPlayers was updated, schedule update for activeGame
          if (validatedSettings.maxPlayers !== undefined) {
            updateActiveGamePlayersCap(roomCode, validatedSettings.maxPlayers);
          }
          
          // Update settings in games table with complete merged settings
          const { error: gameUpdateError } = await db.supabaseAdmin
            .from('games')
            .update({
              game_settings: mergedRoomSettings,
              updated_at: new Date().toISOString()
            })
            .eq('id', gameId);

          if (gameUpdateError) {
            console.warn('⚠️ Failed to update game table settings:', gameUpdateError);
          } else {
            console.log(`✅ Synced complete settings to games table for game ${gameId}`);
            console.log('Complete synced settings:', mergedRoomSettings);
          }
        } else {
          console.warn(`⚠️ Room not found for gameId ${gameId} in RoomManager`);
          // Update database directly since room not found in memory
          const { error: gameUpdateError } = await db.supabaseAdmin
            .from('games')
            .update({
              game_settings: {
                ...updatedPlaySettings
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', gameId);

          if (!gameUpdateError) {
            console.log(`✅ Updated games table directly for game ${gameId}`);
          }
        }
      } catch (syncError) {
        console.warn('⚠️ Failed to sync active game settings:', syncError);
      }
    }

    console.log('Settings updated for question set %s:', questionSetId, validatedSettings);

    res.json({
      success: true,
      questionSetId: updatedQuestionSet.id,
      settings: validatedSettings,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating game settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/game-settings/:questionSetId/reset
// Reset settings to defaults
router.put('/:questionSetId/reset', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { questionSetId } = req.params;

    // Create user-scoped Supabase client for RLS compliance
    const userSupabase = AuthMiddleware.createUserScopedClient(req.userToken);

    // Verify ownership of question set
    const { data: questionSet, error: verifyError } = await userSupabase
      .from('question_sets')
      .select('id, play_settings')
      .eq('id', questionSetId)
      .single();

    if (verifyError || !questionSet) {
      return res.status(404).json({
        success: false,
        error: 'Question set not found or access denied'
      });
    }

    // Reset play_settings to defaults
    const { data: updatedQuestionSet, error: updateError } = await userSupabase
      .from('question_sets')
      .update({
        play_settings: DEFAULT_SETTINGS,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionSetId)
      .select('id, title, play_settings')
      .single();

    if (updateError) {
      console.error('Error resetting question set settings:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset settings'
      });
    }

    console.log(`Settings reset to defaults for question set ${questionSetId}`);

    res.json({
      success: true,
      questionSetId: updatedQuestionSet.id,
      settings: DEFAULT_SETTINGS,
      message: 'Settings reset to defaults successfully'
    });

  } catch (error) {
    console.error('Error resetting game settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/game-settings/game/:gameId
// Get settings for an active game (from room manager)
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log(`🔍 Looking for room with database gameId: ${gameId}`);

    // Get game room data by database gameId (not room code)
    const roomInfo = roomManager.findRoomByGameId(gameId);
    
    if (!roomInfo) {
      console.log(`❌ No room found with gameId: ${gameId}`);
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const { roomCode, room } = roomInfo;
    console.log(`✅ Found room ${roomCode} with gameId ${gameId}`);

    // Return current game settings
    res.json({
      success: true,
      gameId: gameId,
      roomCode: roomCode,
      settings: room.gameSettings || DEFAULT_SETTINGS,
      status: room.status
    });

  } catch (error) {
    console.error('Error fetching active game settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/game-settings/game/:gameId
// Update settings for an active game (only during lobby phase)
router.put('/game/:gameId', AuthMiddleware.authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { settings } = req.body;
    console.log(`🔄 Updating settings for gameId: ${gameId}`, settings);

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
      });
    }

    // Get game room data by database gameId (not room code)
    const roomInfo = roomManager.findRoomByGameId(gameId);
    
    if (!roomInfo) {
      console.log(`❌ No room found with gameId: ${gameId}`);
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const { roomCode, room } = roomInfo;
    console.log(`✅ Found room ${roomCode} to update settings`);

    // Only allow settings changes during lobby phase
    if (room.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: 'Settings can only be changed during lobby phase'
      });
    }

    // Validate and update settings in room manager
    const validatedSettings = {};
    
    // Apply same validation as question set settings
    if (settings.maxPlayers !== undefined) {
      const maxPlayers = parseInt(settings.maxPlayers);
      if (maxPlayers >= 2 && maxPlayers <= 300) {
        validatedSettings.maxPlayers = maxPlayers;
      }
    }

    // Add other validations similar to question set endpoint...
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      if (settings[key] !== undefined) {
        validatedSettings[key] = settings[key];
      }
    });

    // Update room settings
    room.gameSettings = {
      ...room.gameSettings,
      ...validatedSettings
    };

    // Update activeGame players_cap if maxPlayers was changed
    if (validatedSettings.maxPlayers !== undefined) {
      updateActiveGamePlayersCap(roomCode, validatedSettings.maxPlayers);
    }
    
    // Update the database to keep it in sync
    try {
      const updateData = {
        game_settings: room.gameSettings // Update the full game settings JSON only
      };
      
      const { error: dbError } = await db.supabaseAdmin
        .from('games')
        .update(updateData)
        .eq('id', gameId);
        
      if (dbError) {
        console.error('⚠️ Failed to update database game settings:', dbError);
      } else {
        console.log(`✅ Database updated for game ${gameId}:`, updateData);
      }
    } catch (dbUpdateError) {
      console.error('⚠️ Database update error:', dbUpdateError);
    }

    console.log(`✅ Active game settings updated for ${gameId}:`, validatedSettings);

    res.json({
      success: true,
      gameId: gameId,
      settings: validatedSettings,
      message: 'Game settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating active game settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update settings using the room manager (alternative approach)
router.put('/room/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
      });
    }

    // Use room manager to update settings
    const result = roomManager.updateGameSettings(roomCode, settings);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      roomCode: roomCode,
      settings: result.settings,
      message: 'Room settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating room settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
