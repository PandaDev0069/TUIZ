
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

// Supabase configuration
const supabaseUrl = 'https://khpkxopohylfteixbggo.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

class DatabaseManager {
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize service role client for admin operations
    this.supabaseAdmin = supabaseServiceKey ? 
      createClient(supabaseUrl, supabaseServiceKey) : 
      null;
    
    console.log('✅ Supabase client initialized successfully');
    console.log('📍 Supabase URL:', supabaseUrl);
    console.log('🔑 Supabase Key:', supabaseKey ? 'Present' : 'Missing');
    console.log('🔐 Supabase Service Key:', supabaseServiceKey ? 'Present' : 'Missing');
    
    // Test connection
    this.testConnection();
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
      
      // Strategy: Create user without metadata first to avoid trigger issues
      console.log('🔐 Creating user in Supabase Auth (minimal data)...');
      let authData, authError;
      
      try {
        const result = await adminClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // Auto-confirm email
          // Don't set user_metadata initially to avoid trigger issues
        });
        authData = result.data;
        authError = result.error;
      } catch (createError) {
        authError = createError;
      }

      if (authError) {
        console.error('❌ Supabase admin createUser error:', authError);
        
        // If it's a database error related to triggers, try even simpler approach
        if (authError.code === 'unexpected_failure' && authError.message.includes('Database error')) {
          console.log('🔄 Database trigger error detected - trying absolute minimal user creation...');
          
          try {
            const result = await adminClient.auth.admin.createUser({
              email: userData.email,
              password: userData.password,
              // Absolute minimal data to avoid any trigger issues
            });
            authData = result.data;
            authError = result.error;
          } catch (minimalError) {
            console.error('❌ Even minimal approach failed:', minimalError);
            return { success: false, error: 'User creation failed: ' + minimalError.message };
          }
        }
        
        if (authError) {
          return { success: false, error: authError.message };
        }
      }
      
      if (!authData.user) {
        console.error('❌ No user data returned from auth creation');
        return { success: false, error: 'Failed to create auth user' };
      }
      
      console.log('✅ User created in auth.users:', authData.user.id);
      
      // Wait a moment for any triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if trigger created the public user record
      console.log('🔍 Checking if trigger created public user record...');
      const { data: existingPublicUser } = await adminClient
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (existingPublicUser) {
        console.log('✅ Trigger successfully created public user record');
        
        // Update the name if it's missing or incorrect
        if (!existingPublicUser.name || existingPublicUser.name !== userData.name) {
          console.log('🔄 Updating user name in public record...');
          await adminClient
            .from('users')
            .update({ name: userData.name })
            .eq('id', authData.user.id);
        }
        
      } else {
        // Trigger didn't work, create manually
        console.log('📝 Trigger failed - creating user record in public.users manually...');
        const { data: publicUser, error: publicError } = await adminClient
          .from('users')
          .insert({
            id: authData.user.id, // Use the auth user's ID
            email: authData.user.email,
            name: userData.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_active: new Date().toISOString()
          })
          .select()
          .single();

        if (publicError) {
          console.error('❌ Failed to create public user record:', publicError);
          
          // If public user creation fails, we should delete the auth user to keep things consistent
          console.log('🧹 Cleaning up auth user due to public user creation failure...');
          try {
            await adminClient.auth.admin.deleteUser(authData.user.id);
          } catch (cleanupError) {
            console.error('❌ Failed to cleanup auth user:', cleanupError);
          }
          
          return { success: false, error: 'Failed to create user profile: ' + publicError.message };
        }
        
        console.log('✅ Manual public user record created successfully');
      }
      
      // Finally, update the auth user metadata
      console.log('🔄 Updating user metadata...');
      try {
        await adminClient.auth.admin.updateUserById(authData.user.id, {
          user_metadata: { name: userData.name }
        });
      } catch (metadataError) {
        console.warn('⚠️ Failed to update user metadata:', metadataError.message);
        // Don't fail the entire operation for this
      }
      
      console.log('✅ User created successfully in both tables');
      return { 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: userData.name
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
  
  async createQuestionSet(questionSetData) {
    try {
      const { data, error } = await this.supabase
        .from('question_sets')
        .insert(questionSetData)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, questionSet: data };
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
      const { data, error } = await this.supabase
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
      const { data, error } = await this.supabase
        .from('games')
        .select(`
          *,
          question_sets:question_sets(
            *,
            questions:questions(
              *,
              answers:answers(*)
            )
          ),
          game_players:game_players(
            *,
            players:players(*)
          )
        `)
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

  async addPlayerToGame(gameId, playerData) {
    try {
      // First create or get player
      let playerId;
      
      if (playerData.user_id) {
        // Authenticated user
        const { data: existingPlayer } = await this.supabase
          .from('players')
          .select('id')
          .eq('user_id', playerData.user_id)
          .single();

        if (existingPlayer) {
          playerId = existingPlayer.id;
        } else {
          const { data: newPlayer, error: playerError } = await this.supabase
            .from('players')
            .insert(playerData)
            .select('id')
            .single();

          if (playerError) throw playerError;
          playerId = newPlayer.id;
        }
      } else {
        // Guest player
        const { data: newPlayer, error: playerError } = await this.supabase
          .from('players')
          .insert(playerData)
          .select('id')
          .single();

        if (playerError) throw playerError;
        playerId = newPlayer.id;
      }

      // Add player to game
      const { data, error } = await this.supabase
        .from('game_players')
        .insert({
          game_id: gameId,
          player_id: playerId,
          player_name: playerData.name
        })
        .select(`
          *,
          players:players(*)
        `)
        .single();

      if (error) throw error;

      // Update game player count
      await this.supabase.rpc('increment_game_players', { game_id: gameId });
      
      return { success: true, gamePlayer: data };
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

module.exports = DatabaseManager;
