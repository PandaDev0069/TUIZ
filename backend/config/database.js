require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://khpkxopohylfteixbggo.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

class DatabaseManager {
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client initialized successfully');
    console.log('📍 Supabase URL:', supabaseUrl);
    console.log('🔑 Supabase Key:', supabaseKey ? 'Present' : 'Missing');
    
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
      } else {
        console.log('✅ Database connection test successful');
      }
    } catch (err) {
      console.error('❌ Database connection error:', err.message);
    }
  }

  // ================================
  // USER MANAGEMENT
  // ================================
  
  async createUser(userData) {
    try {
      console.log('🔄 Attempting to create user:', userData.email);
      
      // Try Supabase Auth signup
      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name || userData.username,
            username: userData.username
          }
        }
      });

      if (error) {
        console.error('Supabase auth signup error:', error);
        
        // Handle specific errors
        if (error.message?.includes('User already registered')) {
          return { success: false, error: 'Email already exists' };
        }
        
        return { success: false, error: error.message };
      }
      
      // Check if user was created
      if (data.user) {
        console.log('✅ User created successfully in Supabase Auth:', data.user.id);
        
        // Return user info from auth data
        return { 
          success: true, 
          user: {
            id: data.user.id,
            email: data.user.email,
            username: userData.username,
            name: userData.username
          }
        };
      }
      
      return { success: false, error: 'User creation failed - no user returned' };
    } catch (error) {
      console.error('❌ Create user error:', error);
      return { success: false, error: error.message };
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
          username: data.user.user_metadata?.name || data.user.email.split('@')[0],
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