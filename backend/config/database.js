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
