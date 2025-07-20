const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

class DatabaseManager {
  constructor() {
    // Create database file in backend directory
    const dbPath = path.join(__dirname, '..', 'tuiz.db');
    this.db = new Database(dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Initialize database schema
    this.initializeSchema();
    
    // Create prepared statements for better performance
    this.prepareStatements();
    
    console.log('✅ Database initialized successfully');
  }

  initializeSchema() {
    // Users/Hosts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1,
        email_verified BOOLEAN DEFAULT 0
      )
    `);

    // Quizzes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_published BOOLEAN DEFAULT 0,
        settings TEXT DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Questions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_index INTEGER NOT NULL,
        time_limit INTEGER DEFAULT 10000,
        points INTEGER DEFAULT 1000,
        order_num INTEGER NOT NULL,
        media_url TEXT,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);

    // Game sessions table for analytics
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        host_id INTEGER NOT NULL,
        room_code TEXT NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        total_players INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
        FOREIGN KEY (host_id) REFERENCES users(id)
      )
    `);

    // Player answers for analytics
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        answer_index INTEGER,
        is_correct BOOLEAN,
        response_time INTEGER,
        points_earned INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);

    console.log('📊 Database schema created successfully');
  }

  prepareStatements() {
    // User authentication statements
    this.statements = {
      // User operations
      createUser: this.db.prepare(`
        INSERT INTO users (email, username, password_hash)
        VALUES (?, ?, ?)
      `),
      
      findUserByEmail: this.db.prepare(`
        SELECT * FROM users WHERE email = ? AND is_active = 1
      `),
      
      findUserByUsername: this.db.prepare(`
        SELECT * FROM users WHERE username = ? AND is_active = 1
      `),
      
      findUserById: this.db.prepare(`
        SELECT id, email, username, created_at, last_login FROM users 
        WHERE id = ? AND is_active = 1
      `),
      
      updateLastLogin: this.db.prepare(`
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
      `),

      // Quiz operations
      createQuiz: this.db.prepare(`
        INSERT INTO quizzes (user_id, title, description, settings)
        VALUES (?, ?, ?, ?)
      `),
      
      getUserQuizzes: this.db.prepare(`
        SELECT id, title, description, created_at, updated_at, is_published
        FROM quizzes WHERE user_id = ? ORDER BY updated_at DESC
      `),
      
      getQuizById: this.db.prepare(`
        SELECT * FROM quizzes WHERE id = ? AND user_id = ?
      `),

      // Question operations
      getQuizQuestions: this.db.prepare(`
        SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_num
      `),
      
      // Game session operations
      createGameSession: this.db.prepare(`
        INSERT INTO game_sessions (quiz_id, host_id, room_code, total_players)
        VALUES (?, ?, ?, ?)
      `),
      
      endGameSession: this.db.prepare(`
        UPDATE game_sessions 
        SET ended_at = CURRENT_TIMESTAMP, completed = 1
        WHERE room_code = ?
      `)
    };

    console.log('⚡ Database prepared statements ready');
  }

  // User authentication methods
  async createUser(email, username, password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = this.statements.createUser.run(email, username, hashedPassword);
      return { id: result.lastInsertRowid, email, username };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Email or username already exists');
      }
      throw error;
    }
  }

  async authenticateUser(emailOrUsername, password) {
    try {
      // Try to find user by email first, then username
      let user = this.statements.findUserByEmail.get(emailOrUsername);
      if (!user) {
        user = this.statements.findUserByUsername.get(emailOrUsername);
      }

      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Update last login
      this.statements.updateLastLogin.run(user.id);

      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  getUserById(id) {
    return this.statements.findUserById.get(id);
  }

  // Quiz management methods
  createQuiz(userId, title, description = '', settings = {}) {
    const result = this.statements.createQuiz.run(
      userId, 
      title, 
      description, 
      JSON.stringify(settings)
    );
    return { id: result.lastInsertRowid, title, description };
  }

  getUserQuizzes(userId) {
    return this.statements.getUserQuizzes.all(userId);
  }

  getQuizWithQuestions(quizId, userId) {
    const quiz = this.statements.getQuizById.get(quizId, userId);
    if (!quiz) return null;

    const questions = this.statements.getQuizQuestions.all(quizId);
    return { ...quiz, questions };
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;
