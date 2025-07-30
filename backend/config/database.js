require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { randomUUID } = require('crypto');

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
    console.log('✅ Supabase client initialized successfully');
    console.log('📍 Supabase URL:', supabaseUrl);
    console.log('🔑 Supabase Key:', supabaseKey ? 'Present' : 'Missing');
    console.log('🔐 Supabase Service Key:', supabaseServiceKey ? 'Present' : 'Missing');
    
    // Test connection only once
    this.testConnection();
    
    // Store instance for singleton pattern
    DatabaseManager.instance = this;
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is OK
        console.error('❌ Database connection test failed:', error);
        return false;
      } else {
        console.log('✅ Database connection test successful');
        return true;
      }
    } catch (err) {
      console.error('❌ Database connection error:', err.message);
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

  async updateGameStatus(gameId, status, additionalData = {}) {
    try {
      const updateData = { status, ...additionalData };
      
      const { data, error } = await this.supabase
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
          players:players(name)
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
      const { data, error } = await this.supabaseAdmin
        .rpc('get_cleanup_stats');

      if (error) throw error;

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

  // Close connection (for graceful shutdown)
  async close() {
    // Supabase client doesn't need explicit closing
    console.log('✅ Database connection closed');
  }
}

// Initialize static instance property for singleton pattern
DatabaseManager.instance = null;

module.exports = DatabaseManager;
