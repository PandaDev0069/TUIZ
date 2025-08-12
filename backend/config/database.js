require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

// Supabase configuration
const supabaseUrl = 'https://khpkxopohylfteixbggo.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

class DatabaseManager {
  constructor() {
    // Prevent multiple instances from being created (singleton-like behavior)
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }

    // Initialize Supabase client
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize service role client for admin operations
    this.supabaseAdmin = supabaseServiceKey ? 
      createClient(supabaseUrl, supabaseServiceKey) : 
      null;
    
    // Only log on first initialization
    logger.info('✅ Supabase client initialized successfully');
    logger.debug('📍 Supabase URL:', supabaseUrl);
    logger.debug('🔑 Supabase Key:', supabaseKey ? 'Present' : 'Missing');
    logger.debug('🔐 Supabase Service Key:', supabaseServiceKey ? 'Present' : 'Missing');
    
    // Store instance for singleton pattern (removed automatic test connection)
    DatabaseManager.instance = this;
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is OK
        logger.error('❌ Database connection test failed:', error);
        return false;
      } else {
        logger.info('✅ Database connection test successful');
        return true;
      }
    } catch (err) {
      logger.error('❌ Database connection error:', err.message);
      return false;
    }
  }

  // ================================
  // USER MANAGEMENT
  // ================================
  
  async createUser(userData) {
    try {
      console.log('🔄 Attempting to create user:', userData.email);
      
      // Validate input
      if (!userData.email || !userData.password || !userData.name) {
        return { success: false, error: 'Email, password, and name are required' };
      }
      
      // Use admin client for auth operations
      const adminClient = this.supabaseAdmin || this.supabase;
      
      // First, check if user already exists
      console.log('🔍 Checking if user already exists...');
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === userData.email);
      
      if (existingUser) {
        console.log('❌ User already exists in auth.users');
        return { success: false, error: 'Email already exists' };
      }
      
      // Use admin API to create user with confirmed email (primary approach)
      console.log('📝 Creating user with admin API (auto-confirmed)...');
      
      let signupData;
      try {
        const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // This ensures the user can login immediately
          user_metadata: { name: userData.name }
        });
        
        if (adminError) {
          console.error('❌ Admin createUser failed:', adminError);
          return { success: false, error: 'User creation failed: ' + adminError.message };
        }
        
        signupData = { user: adminData.user };
        
      } catch (adminException) {
        console.error('❌ Admin createUser threw exception:', adminException);
        return { success: false, error: 'User creation failed: ' + adminException.message };
      }
      
      if (!signupData.user) {
        console.error('❌ No user data returned from signup');
        return { success: false, error: 'Failed to create auth user' };
      }
      
      console.log('✅ User created in auth.users:', signupData.user.id);
      
      // Wait for potential triggers to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if public user record exists
      console.log('🔍 Checking if public user record exists...');
      const { data: existingPublicUser } = await adminClient
        .from('users')
        .select('*')
        .eq('id', signupData.user.id)
        .single();
      
      if (existingPublicUser) {
        console.log('✅ Public user record found:', existingPublicUser.name);
        
        // Update name if needed
        if (!existingPublicUser.name || existingPublicUser.name !== userData.name) {
          console.log('🔄 Updating user name...');
          await adminClient
            .from('users')
            .update({ name: userData.name })
            .eq('id', signupData.user.id);
        }
        
      } else {
        // Create public user record manually
        console.log('📝 Creating public user record manually...');
        const { error: insertError } = await adminClient
          .from('users')
          .insert({
            id: signupData.user.id,
            email: signupData.user.email,
            name: userData.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_active: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Failed to create public user record:', insertError);
          
          // Clean up auth user
          console.log('🧹 Cleaning up auth user...');
          try {
            await adminClient.auth.admin.deleteUser(signupData.user.id);
          } catch (cleanupError) {
            console.error('❌ Failed to cleanup auth user:', cleanupError);
          }
          
          return { success: false, error: 'Failed to create user profile: ' + insertError.message };
        }
        
        console.log('✅ Public user record created successfully');
      }
      
      console.log('✅ User creation completed successfully - email confirmed, ready for login');
      return { 
        success: true, 
        user: {
          id: signupData.user.id,
          email: signupData.user.email,
          name: userData.name,
          email_confirmed: true
        }
      };

    } catch (err) {
      console.error('❌ Create user error:', err);
      return { success: false, error: 'Account creation failed: ' + err.message };
    }
  }

  async authenticateUser(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      // Return basic user info based on auth data for now
      // We can enhance this later when database is properly set up
      return { 
        success: true, 
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0],
          last_active: data.user.last_sign_in_at
        }, 
        session: data.session 
      };
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserById(userId) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      return { success: true, user: data };
    } catch (error) {
      console.error('❌ Get user error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, user: data };
    } catch (error) {
      console.error('❌ Update user error:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================
  // QUESTION SETS MANAGEMENT
  // ================================
  
  async createQuestionSet(questionSetData, questions = []) {
    try {
      console.log('🔄 Creating question set with admin client to bypass RLS');
      
      // Use admin client to bypass RLS policies
      const adminClient = this.supabaseAdmin || this.supabase;
      
      // First, create the question set
      const { data: questionSet, error: questionSetError } = await adminClient
        .from('question_sets')
        .insert(questionSetData)
        .select()
        .single();

      if (questionSetError) {
        console.error('❌ Question set creation failed:', questionSetError);
        throw questionSetError;
      }
      
      console.log('✅ Question set created:', questionSet.id);
      
      // If there are questions, create them too
      if (questions && questions.length > 0) {
        console.log('🔄 Creating', questions.length, 'questions');
        
        for (let i = 0; i < questions.length; i++) {
          const questionData = {
            ...questions[i],
            question_set_id: questionSet.id,
            order_index: i
          };
          
          // Create the question
          const { data: question, error: questionError } = await adminClient
            .from('questions')
            .insert(questionData)
            .select()
            .single();
            
          if (questionError) {
            console.error('❌ Question creation failed:', questionError);
            throw questionError;
          }
          
          console.log('✅ Question created:', question.id);
          
          // Create answers for this question
          if (questions[i].answers && questions[i].answers.length > 0) {
            const answersData = questions[i].answers.map((answer, answerIndex) => ({
              ...answer,
              question_id: question.id,
              order_index: answerIndex
            }));
            
            const { error: answersError } = await adminClient
              .from('answers')
              .insert(answersData);
              
            if (answersError) {
              console.error('❌ Answers creation failed:', answersError);
              throw answersError;
            }
            
            console.log('✅ Answers created for question:', question.id);
          }
        }
      }
      
      return { success: true, questionSet };
    } catch (error) {
      console.error('❌ Create question set error:', error);
      return { success: false, error: error.message };
    }
  }

  async getQuestionSetsByUser(userId) {
    try {
      const { data, error } = await this.supabase
        .from('question_sets')
        .select(`
          *,
          questions:questions(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return { success: true, questionSets: data };
    } catch (error) {
      console.error('❌ Get question sets error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPublicQuestionSets(limit = 20, offset = 0) {
    try {
      const { data, error } = await this.supabase
        .from('question_sets')
        .select(`
          *,
          users!inner(name),
          questions:questions(count)
        `)
        .eq('is_public', true)
        .order('times_played', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return { success: true, questionSets: data };
    } catch (error) {
      console.error('❌ Get public question sets error:', error);
      return { success: false, error: error.message };
    }
  }

  async getQuestionSetWithQuestions(questionSetId) {
    try {
      const { data, error } = await this.supabase
        .from('question_sets')
        .select(`
          *,
          questions:questions(
            *,
            answers:answers(*)
          )
        `)
        .eq('id', questionSetId)
        .single();

      if (error) throw error;
      
      return { success: true, questionSet: data };
    } catch (error) {
      console.error('❌ Get question set with questions error:', error);
      return { success: false, error: error.message };
    }
  }

  async incrementQuestionSetTimesPlayed(questionSetId) {
    try {
      // Use admin client to bypass RLS for backend operations
      const { data, error } = await this.supabaseAdmin
        .rpc('increment_times_played', { question_set_id: questionSetId });

      if (error) {
        // Fallback to manual increment if RPC doesn't exist
        console.log('RPC not found, using manual increment...');
        const { data: currentData, error: fetchError } = await this.supabaseAdmin
          .from('question_sets')
          .select('times_played, updated_at')
          .eq('id', questionSetId)
          .single();

        if (fetchError) throw fetchError;

        const newTimesPlayed = (currentData.times_played || 0) + 1;
        const now = new Date().toISOString();
        
        // Add a small delay to prevent rapid duplicate calls
        const lastUpdate = new Date(currentData.updated_at);
        const timeSinceLastUpdate = Date.now() - lastUpdate.getTime();
        
        if (timeSinceLastUpdate < 1000) { // Less than 1 second since last update
          console.log(`⚠️ Skipping increment - too recent (${timeSinceLastUpdate}ms ago)`);
          return { success: true, questionSet: currentData, skipped: true };
        }
        
        const { data: updateData, error: updateError } = await this.supabaseAdmin
          .from('question_sets')
          .update({ 
            times_played: newTimesPlayed,
            updated_at: now
          })
          .eq('id', questionSetId)
          .select('id, times_played')
          .single();

        if (updateError) throw updateError;
        
        return { success: true, questionSet: updateData };
      }
      
      return { success: true, questionSet: data };
    } catch (error) {
      console.error('❌ Increment question set times played error:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================
  // GAME MANAGEMENT
  // ================================
  
  async createGame(gameData) {
    try {
      // Use service role for backend game creation
      const { data, error } = await this.supabaseAdmin
        .from('games')
        .insert(gameData)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, game: data };
    } catch (error) {
      console.error('❌ Create game error:', error);
      return { success: false, error: error.message };
    }
  }

  async getGameByCode(gameCode) {
    try {
      // Use service role for backend operations
      const { data, error } = await this.supabaseAdmin
        .from('games')
        .select('*')
        .eq('game_code', gameCode)
        .single();

      if (error) throw error;
      
      return { success: true, game: data };
    } catch (error) {
      console.error('❌ Get game by code error:', error);
      return { success: false, error: error.message };
    }
  }

  async getGameById(gameId) {
    try {
      // Use service role for backend operations
      const { data, error } = await this.supabaseAdmin
        .from('games')
        .select(`
          *,
          question_sets!inner(
            title,
            description,
            total_questions,
            category,
            difficulty_level
          )
        `)
        .eq('id', gameId)
        .single();

      if (error) throw error;
      
      return { success: true, game: data };
    } catch (error) {
      console.error('❌ Get game by ID error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGameStatus(gameId, status, additionalData = {}) {
    try {
      if (!this.supabaseAdmin) {
        throw new Error('Service role required for updating game status');
      }

      const updateData = { status, ...additionalData };
      
      // First check if the game exists
      const { data: existingGame, error: checkError } = await this.supabaseAdmin
        .from('games')
        .select('id')
        .eq('id', gameId)
        .single();

      if (checkError) {
        throw new Error(`Game not found: ${checkError.message}`);
      }

      const { data, error } = await this.supabaseAdmin
        .from('games')
        .update(updateData)
        .eq('id', gameId)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, game: data };
    } catch (error) {
      console.error('❌ Update game status error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGameSettings(gameId, gameSettings) {
    try {
      if (!this.supabaseAdmin) {
        throw new Error('Service role required for updating game settings');
      }

      const { data, error } = await this.supabaseAdmin
        .from('games')
        .update({ game_settings: gameSettings })
        .eq('id', gameId)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, game: data };
    } catch (error) {
      console.error('❌ Update game settings error:', error);
      return { success: false, error: error.message };
    }
  }

  async getGameWithSettings(gameId) {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('games')
        .select(`
          *,
          question_sets!inner(
            title,
            description,
            total_questions,
            play_settings
          )
        `)
        .eq('id', gameId)
        .single();

      if (error) throw error;
      
      // Merge question set defaults with game overrides
      const questionSetSettings = data.question_sets.play_settings || {};
      const gameOverrides = data.game_settings || {};
      
      // Simple merge - game settings override question set defaults
      const mergedSettings = {
        ...questionSetSettings,
        ...gameOverrides
      };
      
      return { 
        success: true, 
        game: data,
        settings: {
          defaults: questionSetSettings,
          current: mergedSettings,
          overrides: gameOverrides
        }
      };
    } catch (error) {
      console.error('❌ Get game with settings error:', error);
      return { success: false, error: error.message };
    }
  }



  // ================================
  // PLAYER MANAGEMENT
  // ================================

  async getOrCreatePlayerUUID(userId, playerName) {
    try {
      // First check if user already has a game_player_uuid
      const { data: user, error: userError } = await this.supabaseAdmin
        .from('users')
        .select('game_player_uuid, name')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // If user already has a game_player_uuid, return it
      if (user.game_player_uuid) {
        console.log(`✅ Found existing game_player_uuid for user ${userId}: ${user.game_player_uuid}`);
        return {
          success: true,
          playerId: user.game_player_uuid,
          isNewPlayer: false,
          playerName: user.name || playerName
        };
      }

      // Generate new game_player_uuid for this user
      const newPlayerUUID = crypto.randomUUID();

      // Update user with new game_player_uuid
      const { error: updateError } = await this.supabaseAdmin
        .from('users')
        .update({ 
          game_player_uuid: newPlayerUUID,
          name: playerName || user.name // Update name if provided
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating user with game_player_uuid:', updateError);
        throw updateError;
      }

      console.log(`✅ Created new game_player_uuid for user ${userId}: ${newPlayerUUID}`);
      return {
        success: true,
        playerId: newPlayerUUID,
        isNewPlayer: true,
        playerName: playerName || user.name
      };

    } catch (error) {
      console.error('❌ Get or create player UUID error:', error);
      return { success: false, error: error.message };
    }
  }

  async createGuestPlayerUUID() {
    try {
      const guestPlayerUUID = crypto.randomUUID();
      console.log(`✅ Created guest player UUID: ${guestPlayerUUID}`);
      
      return {
        success: true,
        playerId: guestPlayerUUID,
        isNewPlayer: true,
        isGuest: true
      };
    } catch (error) {
      console.error('❌ Create guest player UUID error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPlayerStats(userId) {
    try {
      // First get the user's game_player_uuid
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('game_player_uuid')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      if (!user.game_player_uuid) {
        // User hasn't played any games yet
        return {
          success: true,
          stats: {
            totalGames: 0,
            totalScore: 0,
            avgScore: 0,
            recentGames: []
          }
        };
      }

      // Get game participation data using game_player_uuid
      const { data, error } = await this.supabase
        .from('game_players')
        .select(`
          id,
          game_id,
          current_score,
          current_rank,
          joined_at,
          games:games(
            id,
            status,
            created_at,
            ended_at,
            question_sets:question_sets(title)
          )
        `)
        .eq('player_id', user.game_player_uuid)
        .eq('is_user', true)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const totalGames = data.length;
      const totalScore = data.reduce((sum, game) => sum + (game.current_score || 0), 0);
      const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
      const recentGames = data.slice(0, 5);

      return {
        success: true,
        stats: {
          totalGames,
          totalScore,
          avgScore,
          recentGames,
          gamePlayerUUID: user.game_player_uuid
        }
      };
    } catch (error) {
      console.error('❌ Get player stats error:', error);
      return { success: false, error: error.message };
    }
  }

  async addPlayerToGame(gameId, playerData) {
    try {
      let playerId;
      let playerName;
      let isGuest;
      let isNewPlayer;

      if (playerData.user_id) {
        // Authenticated user - get or create their persistent game_player_uuid
        const playerResult = await this.getOrCreatePlayerUUID(playerData.user_id, playerData.name);
        
        if (!playerResult.success) {
          throw new Error(`Failed to get player UUID: ${playerResult.error}`);
        }

        playerId = playerResult.playerId;
        playerName = playerResult.playerName;
        isGuest = false;
        isNewPlayer = playerResult.isNewPlayer;

        console.log(`🎮 Authenticated user joining game - Player UUID: ${playerId}, New: ${isNewPlayer}`);
      } else {
        // Guest user - create temporary UUID
        const guestResult = await this.createGuestPlayerUUID();
        
        if (!guestResult.success) {
          throw new Error(`Failed to create guest UUID: ${guestResult.error}`);
        }

        playerId = guestResult.playerId;
        playerName = playerData.name;
        isGuest = true;
        isNewPlayer = true;

        console.log(`👤 Guest user joining game - Temp UUID: ${playerId}`);
      }

      // Check if player is already in this game
      const { data: existingPlayer } = await this.supabaseAdmin
        .from('game_players')
        .select('id, current_score, current_rank, is_active')
        .eq('game_id', gameId)
        .eq('player_id', playerId)
        .single();

      if (existingPlayer) {
        console.log(`♻️ Player ${playerId} already exists in game ${gameId}, reactivating`);
        
        // Reactivate existing player
        const { data: reactivatedPlayer, error: reactivateError } = await this.supabaseAdmin
          .from('game_players')
          .update({ 
            is_active: true,
            player_name: playerName, // Update name in case it changed
            is_host: playerData.is_host || false // Update host status if provided
          })
          .eq('id', existingPlayer.id)
          .select('*')
          .single();

        if (reactivateError) throw reactivateError;

        return { 
          success: true, 
          gamePlayer: reactivatedPlayer,
          isReturningPlayer: true
        };
      }

      // Create new game_players record
      const gamePlayerData = {
        game_id: gameId,
        player_id: playerId,
        player_name: playerName,
        is_guest: isGuest,
        is_user: !isGuest,
        is_host: playerData.is_host || false, // Set host flag if provided
        joined_at: new Date().toISOString(),
        is_active: true
      };

      const { data, error } = await this.supabaseAdmin
        .from('game_players')
        .insert(gamePlayerData)
        .select('*')
        .single();

      if (error) throw error;

      console.log(`✅ Added player to game - Game: ${gameId}, Player: ${playerId}, Type: ${isGuest ? 'Guest' : 'User'}`);

      // The trigger will handle updating game player count automatically
      
      return { 
        success: true, 
        gamePlayer: data,
        isReturningPlayer: false,
        isNewPlayer: isNewPlayer
      };
    } catch (error) {
      console.error('❌ Add player to game error:', error);
      return { success: false, error: error.message };
    }
  }

  async submitPlayerAnswer(answerData) {
    try {
      const { data, error } = await this.supabase
        .from('player_answers')
        .insert(answerData)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, answer: data };
    } catch (error) {
      console.error('❌ Submit player answer error:', error);
      return { success: false, error: error.message };
    }
  }

  async getGameResults(gameId) {
    try {
      const { data, error } = await this.supabase
        .from('game_results')
        .select(`
          *,
          game_players!inner(player_name)
        `)
        .eq('game_id', gameId)
        .order('final_rank');

      if (error) throw error;
      
      return { success: true, results: data };
    } catch (error) {
      console.error('❌ Get game results error:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================
  // GAME RESULTS MANAGEMENT
  // ================================

  async createGameResults(gameId) {
    try {
      if (!this.supabaseAdmin) {
        throw new Error('Service role required for creating game results');
      }

      const { data, error } = await this.supabaseAdmin
        .rpc('create_game_results_manual', { game_id_param: gameId });

      if (error) throw error;

      return { success: true, results: data };
    } catch (error) {
      console.error('❌ Create game results error:', error);
      return { success: false, error: error.message };
    }
  }

  async finishGameAndCreateResults(gameId, additionalData = {}) {
    try {
      if (!this.supabaseAdmin) {
        throw new Error('Service role required for finishing games');
      }

      // First, update the game status to finished
      const updateData = { 
        status: 'finished', 
        ended_at: new Date().toISOString(),
        ...additionalData 
      };
      
      const { data: game, error: gameError } = await this.supabaseAdmin
        .from('games')
        .update(updateData)
        .eq('id', gameId)
        .select()
        .single();

      if (gameError) throw gameError;

      // The trigger should automatically create game results, but let's verify
      // Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if game results were created
      const { data: results, error: resultsError } = await this.supabaseAdmin
        .from('game_results')
        .select('*')
        .eq('game_id', gameId);

      if (resultsError) {
        console.error('❌ Error checking game results:', resultsError);
        // If results weren't created automatically, try manual creation
        const manualResult = await this.createGameResults(gameId);
        if (!manualResult.success) {
          throw new Error('Failed to create game results: ' + manualResult.error);
        }
      }

      return { 
        success: true, 
        game,
        resultsCount: results ? results.length : 0
      };
    } catch (error) {
      console.error('❌ Finish game and create results error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPlayerGameHistory(playerId, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('game_results')
        .select(`
          *,
          games!inner(
            id,
            game_code,
            created_at,
            ended_at,
            question_sets!inner(title)
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return { success: true, history: data };
    } catch (error) {
      console.error('❌ Get player game history error:', error);
      return { success: false, error: error.message };
    }
  }

  async getGameLeaderboard(gameId) {
    try {
      const { data, error } = await this.supabase
        .from('game_results')
        .select(`
          *,
          game_players!inner(player_name, is_guest)
        `)
        .eq('game_id', gameId)
        .order('final_rank', { ascending: true });

      if (error) throw error;
      
      return { success: true, leaderboard: data };
    } catch (error) {
      console.error('❌ Get game leaderboard error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserStats(userId) {
    try {
      // Get user's game_player_uuid
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('game_player_uuid')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      if (!user.game_player_uuid) {
        return {
          success: true,
          stats: {
            totalGames: 0,
            totalScore: 0,
            averageScore: 0,
            averageRank: 0,
            bestRank: null,
            totalCorrect: 0,
            averageAccuracy: 0,
            recentGames: []
          }
        };
      }

      // Get comprehensive stats
      const { data: results, error: resultsError } = await this.supabase
        .from('game_results')
        .select(`
          *,
          games!inner(
            game_code,
            created_at,
            question_sets!inner(title)
          )
        `)
        .eq('player_id', user.game_player_uuid)
        .order('created_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Calculate comprehensive stats
      const totalGames = results.length;
      const totalScore = results.reduce((sum, r) => sum + r.final_score, 0);
      const totalCorrect = results.reduce((sum, r) => sum + r.total_correct, 0);
      const totalQuestions = results.reduce((sum, r) => sum + r.total_questions, 0);
      
      const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
      const averageRank = totalGames > 0 ? Math.round(results.reduce((sum, r) => sum + r.final_rank, 0) / totalGames) : 0;
      const bestRank = totalGames > 0 ? Math.min(...results.map(r => r.final_rank)) : null;
      const averageAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

      return {
        success: true,
        stats: {
          totalGames,
          totalScore,
          averageScore,
          averageRank,
          bestRank,
          totalCorrect,
          averageAccuracy,
          recentGames: results.slice(0, 5)
        }
      };
    } catch (error) {
      console.error('❌ Get user stats error:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================
  // REAL-TIME SUBSCRIPTIONS
  // ================================
  
  subscribeToGameChanges(gameId, callback) {
    return this.supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'games',
          filter: `id=eq.${gameId}`
        }, 
        callback
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'game_players',
          filter: `game_id=eq.${gameId}`
        }, 
        callback
      )
      .subscribe();
  }

  // ================================
  // DATABASE CLEANUP FUNCTIONS
  // ================================

  async runCleanup(config = null) {
    try {
      // Use provided config or load default
      const cleanupConfig = config || require('./cleanupConfig');
      const timings = cleanupConfig.getCleanupQueries();
      
      // Call the database cleanup function
      const { data, error } = await this.supabaseAdmin
        .rpc('cleanup_old_games_and_guests', {
          finished_retention_minutes: cleanupConfig.games.finishedGameRetention,
          waiting_timeout_minutes: cleanupConfig.games.waitingGameTimeout,
          cancelled_timeout_minutes: cleanupConfig.games.cancelledGameTimeout,
          inactive_guest_timeout_minutes: cleanupConfig.guests.inactiveGuestTimeout,
          batch_size: cleanupConfig.execution.batchSize
        });

      if (error) throw error;

      return { success: true, results: data };
    } catch (error) {
      console.error('❌ Database cleanup error:', error);
      return { success: false, error: error.message };
    }
  }

  async previewCleanup(config = null) {
    try {
      const cleanupConfig = config || require('./cleanupConfig');
      
      const { data, error } = await this.supabaseAdmin
        .rpc('preview_cleanup', {
          finished_retention_minutes: cleanupConfig.games.finishedGameRetention,
          waiting_timeout_minutes: cleanupConfig.games.waitingGameTimeout,
          cancelled_timeout_minutes: cleanupConfig.games.cancelledGameTimeout,
          inactive_guest_timeout_minutes: cleanupConfig.guests.inactiveGuestTimeout
        });

      if (error) throw error;

      return { success: true, preview: data };
    } catch (error) {
      console.error('❌ Cleanup preview error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCleanupStats() {
    try {
      // Check if we have admin client
      if (!this.supabaseAdmin) {
        throw new Error('Service role key not available for cleanup stats');
      }
      
      const { data, error } = await this.supabaseAdmin
        .rpc('get_cleanup_stats');

      if (error) {
        // Check if it's a function not found error
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.warn('⚠️ get_cleanup_stats function not found in database. Please deploy cleanup_functions.sql');
          return { 
            success: false, 
            error: 'Database cleanup functions not deployed. Please run cleanup_functions.sql in your Supabase dashboard.' 
          };
        }
        throw error;
      }

      return { success: true, stats: data };
    } catch (error) {
      console.error('❌ Get cleanup stats error:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================
  // UTILITY FUNCTIONS
  // ================================
  
  async generateUniqueGameCode() {
    let gameCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data } = await this.supabase
        .from('games')
        .select('id')
        .eq('game_code', gameCode)
        .single();

      isUnique = !data;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique game code');
    }

    return gameCode;
  }

  // ================================
  // HOST CONTROL METHODS (Phase 6)
  // ================================
  
  async logHostAction(gameId, hostId, actionType, actionData = {}, targetPlayerId = null) {
    try {
      const { data, error } = await this.supabaseAdmin
        .rpc('log_host_action', {
          p_game_id: gameId,
          p_host_id: hostId,
          p_action_type: actionType,
          p_action_data: actionData,
          p_target_player_id: targetPlayerId
        });

      if (error) {
        logger.error('❌ Failed to log host action:', error);
        return { success: false, error: error.message };
      }

      return { success: true, actionId: data };
    } catch (error) {
      logger.error('❌ Host action logging error:', error);
      return { success: false, error: error.message };
    }
  }

  async createAnalyticsSnapshot(gameId, snapshotType, questionNumber = null, snapshotData = {}) {
    try {
      const { data, error } = await this.supabaseAdmin
        .rpc('create_analytics_snapshot', {
          p_game_id: gameId,
          p_snapshot_type: snapshotType,
          p_question_number: questionNumber,
          p_snapshot_data: snapshotData
        });

      if (error) {
        logger.error('❌ Failed to create analytics snapshot:', error);
        return { success: false, error: error.message };
      }

      return { success: true, snapshotId: data };
    } catch (error) {
      logger.error('❌ Analytics snapshot error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGameHostControl(gameId, hostControlData) {
    try {
      const updateData = {};
      
      // Map host control fields
      if (hostControlData.pausedAt !== undefined) updateData.paused_at = hostControlData.pausedAt;
      if (hostControlData.pauseReason !== undefined) updateData.pause_reason = hostControlData.pauseReason;
      if (hostControlData.pausedDuration !== undefined) updateData.paused_duration = hostControlData.pausedDuration;
      if (hostControlData.stoppedAt !== undefined) updateData.stopped_at = hostControlData.stoppedAt;
      if (hostControlData.stopReason !== undefined) updateData.stop_reason = hostControlData.stopReason;
      if (hostControlData.emergencyStop !== undefined) updateData.emergency_stop = hostControlData.emergencyStop;
      if (hostControlData.skippedQuestions !== undefined) updateData.skipped_questions = hostControlData.skippedQuestions;
      if (hostControlData.hostActions !== undefined) updateData.host_actions = hostControlData.hostActions;
      if (hostControlData.hostTransferHistory !== undefined) updateData.host_transfer_history = hostControlData.hostTransferHistory;

      const { data, error } = await this.supabaseAdmin
        .from('games')
        .update(updateData)
        .eq('id', gameId)
        .select()
        .single();

      if (error) {
        logger.error('❌ Failed to update game host control data:', error);
        return { success: false, error: error.message };
      }

      return { success: true, game: data };
    } catch (error) {
      logger.error('❌ Game host control update error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPlayerActions(gameId, playerId = null, actionType = null) {
    try {
      let query = this.supabaseAdmin
        .from('player_actions')
        .select('*')
        .eq('game_id', gameId)
        .order('performed_at', { ascending: false });

      if (playerId) {
        query = query.eq('player_id', playerId);
      }

      if (actionType) {
        query = query.eq('action_type', actionType);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('❌ Failed to get player actions:', error);
        return { success: false, error: error.message };
      }

      return { success: true, actions: data };
    } catch (error) {
      logger.error('❌ Player actions query error:', error);
      return { success: false, error: error.message };
    }
  }

  async getGameAnalyticsSnapshots(gameId, snapshotType = null, questionNumber = null) {
    try {
      let query = this.supabaseAdmin
        .from('game_analytics_snapshots')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });

      if (snapshotType) {
        query = query.eq('snapshot_type', snapshotType);
      }

      if (questionNumber !== null) {
        query = query.eq('question_number', questionNumber);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('❌ Failed to get analytics snapshots:', error);
        return { success: false, error: error.message };
      }

      return { success: true, snapshots: data };
    } catch (error) {
      logger.error('❌ Analytics snapshots query error:', error);
      return { success: false, error: error.message };
    }
  }

  async createHostSession(gameId, hostUserId, sessionData = {}) {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('host_sessions')
        .insert({
          game_id: gameId,
          host_user_id: hostUserId,
          session_data: sessionData,
          session_start: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('❌ Failed to create host session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      logger.error('❌ Host session creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateHostSession(sessionId, sessionData) {
    try {
      const updateData = {
        last_action_at: new Date().toISOString()
      };

      if (sessionData.actionsCount !== undefined) {
        updateData.actions_count = sessionData.actionsCount;
      }
      if (sessionData.sessionEnd !== undefined) {
        updateData.session_end = sessionData.sessionEnd;
      }
      if (sessionData.sessionData !== undefined) {
        updateData.session_data = sessionData.sessionData;
      }

      const { data, error } = await this.supabaseAdmin
        .from('host_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        logger.error('❌ Failed to update host session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, session: data };
    } catch (error) {
      logger.error('❌ Host session update error:', error);
      return { success: false, error: error.message };
    }
  }

  async getHostGameStats(hostId, gameId = null) {
    try {
      let query = this.supabaseAdmin
        .from('host_game_stats')
        .select('*');

      if (gameId) {
        query = query.eq('game_id', gameId);
      }

      // Note: RLS policy will automatically filter by host_id = auth.uid()
      const { data, error } = await query;

      if (error) {
        logger.error('❌ Failed to get host game stats:', error);
        return { success: false, error: error.message };
      }

      return { success: true, stats: data };
    } catch (error) {
      logger.error('❌ Host game stats query error:', error);
      return { success: false, error: error.message };
    }
  }

  async cleanupExpiredPlayerActions() {
    try {
      const { data, error } = await this.supabaseAdmin
        .rpc('cleanup_expired_player_actions');

      if (error) {
        logger.error('❌ Failed to cleanup expired player actions:', error);
        return { success: false, error: error.message };
      }

      return { success: true, cleanedCount: data };
    } catch (error) {
      logger.error('❌ Player actions cleanup error:', error);
      return { success: false, error: error.message };
    }
  }

  async getActivePlayerActions(gameId, actionTypes = ['muted', 'kicked']) {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('player_actions')
        .select('*')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .in('action_type', actionTypes)
        .order('performed_at', { ascending: false });

      if (error) {
        logger.error('❌ Failed to get active player actions:', error);
        return { success: false, error: error.message };
      }

      return { success: true, actions: data };
    } catch (error) {
      logger.error('❌ Active player actions query error:', error);
      return { success: false, error: error.message };
    }
  }

  // Close connection (for graceful shutdown)
  async close() {
    // Supabase client doesn't need explicit closing
    console.log('✅ Database connection closed');
  }
}

// Initialize static instance property for singleton pattern
DatabaseManager.instance = null;

module.exports = DatabaseManager;
