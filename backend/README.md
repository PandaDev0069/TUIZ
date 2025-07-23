# ⚡ TUIZ Backend - Node.js + Express + Socket.IO

Real-time quiz application backend supporting **200-300 concurrent players** with WebSocket communication and Supabase integration.

## 🌟 Overview

This is the backend sub-repository for TUIZ, handling real-time game sessions, player management, and communication with the Supabase database. Built for scalability and performance.

### ✨ Key Features

- **🔌 Socket.IO**: Real-time bidirectional communication
- **🏠 Room Management**: Efficient game session handling
- **📊 Live Scoring**: Real-time score calculations and updates
- **🗄️ Supabase Integration**: PostgreSQL database with real-time subscriptions
- **🛡️ Authentication**: JWT-based user authentication
- **📈 Scalable**: Optimized for 200-300 concurrent connections
- **🚀 Fast**: Express.js with optimized middleware

## 🚀 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSockets**: Socket.IO
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Supabase Auth
- **Validation**: Joi
- **Logging**: Winston
- **Testing**: Jest + Supertest
- **Deployment**: Render (WebSocket support)

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account and project

### Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd TUIZ/backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
# Run migrations in Supabase (see database/README.md)

# Start development server
npm run dev
```

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Database Direct Connection (optional)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:5173
FRONTEND_URL_PROD=https://your-frontend-url.vercel.app

# Socket.IO Configuration
SOCKET_CORS_ORIGIN=http://localhost:5173
SOCKET_CORS_ORIGIN_PROD=https://your-frontend-url.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Game Configuration
MAX_PLAYERS_PER_ROOM=300
ROOM_CODE_LENGTH=6
QUESTION_TIME_LIMIT=30
ANSWER_SUBMISSION_BUFFER=5

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start with nodemon (auto-restart)
npm start           # Start production server

# Database
npm run db:migrate  # Run database migrations
npm run db:seed     # Seed database with sample data
npm run db:reset    # Reset database (dev only)

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm run format      # Format with Prettier

# Testing
npm test           # Run tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Production
npm run build      # Build for production (if needed)
npm run preview    # Preview production build
```

## 📁 Project Structure

```
backend/
├── config/              # Configuration files
│   ├── database.js      # Database connection setup
│   ├── gameConfig.js    # Game-specific configurations
│   └── supabase.js      # Supabase client setup
├── controllers/         # Route controllers
│   ├── authController.js
│   ├── gameController.js
│   ├── quizController.js
│   └── userController.js
├── middleware/          # Express middleware
│   ├── auth.js         # Authentication middleware
│   ├── validation.js   # Request validation
│   ├── rateLimiter.js  # Rate limiting
│   └── errorHandler.js # Error handling
├── models/             # Database models/schemas
│   ├── User.js
│   ├── Quiz.js
│   ├── Question.js
│   ├── GameSession.js
│   └── PlayerAnswer.js
├── routes/             # Express routes
│   ├── auth.js
│   ├── games.js
│   ├── quizzes.js
│   └── users.js
├── services/           # Business logic services
│   ├── authService.js
│   ├── gameService.js
│   ├── quizService.js
│   └── socketService.js
├── socket/             # Socket.IO event handlers
│   ├── gameEvents.js
│   ├── roomEvents.js
│   ├── playerEvents.js
│   └── adminEvents.js
├── utils/              # Utility functions
│   ├── RoomManager.js  # Game room management
│   ├── ScoreCalculator.js
│   ├── RoomCodeGenerator.js
│   └── logger.js
├── tests/              # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── logs/               # Log files
├── server.js           # Main server file
└── app.js              # Express app setup
```

## 🎮 Core Features Implementation

### Game Room Management

```javascript
// RoomManager.js - Efficient room handling
class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map();
  }

  createRoom(quizId, hostId) {
    const roomCode = generateRoomCode();
    const room = {
      id: uuidv4(),
      code: roomCode,
      quiz: quizId,
      host: hostId,
      players: new Map(),
      status: 'waiting',
      currentQuestion: 0,
      scores: new Map()
    };
    
    this.rooms.set(roomCode, room);
    return room;
  }

  addPlayer(roomCode, playerId, playerName) {
    const room = this.rooms.get(roomCode);
    if (room && room.players.size < MAX_PLAYERS_PER_ROOM) {
      room.players.set(playerId, {
        id: playerId,
        name: playerName,
        score: 0,
        connected: true
      });
      this.playerRooms.set(playerId, roomCode);
      return true;
    }
    return false;
  }
}
```

### Socket.IO Event System

```javascript
// gameEvents.js - Real-time game events
const handleGameEvents = (io, socket) => {
  // Player joins room
  socket.on('join-room', async (data) => {
    const { roomCode, playerName } = data;
    const success = roomManager.addPlayer(roomCode, socket.id, playerName);
    
    if (success) {
      socket.join(roomCode);
      socket.to(roomCode).emit('player-joined', {
        playerId: socket.id,
        playerName,
        playerCount: roomManager.getPlayerCount(roomCode)
      });
    } else {
      socket.emit('join-error', { message: 'Room full or not found' });
    }
  });

  // Answer submission
  socket.on('submit-answer', async (data) => {
    const { questionId, answer, timeElapsed } = data;
    const roomCode = roomManager.getPlayerRoom(socket.id);
    
    if (roomCode) {
      const isCorrect = await validateAnswer(questionId, answer);
      const points = calculatePoints(isCorrect, timeElapsed);
      
      // Update player score
      roomManager.updatePlayerScore(roomCode, socket.id, points);
      
      // Broadcast to room
      io.to(roomCode).emit('player-answered', {
        playerId: socket.id,
        isCorrect,
        points,
        totalAnswered: roomManager.getAnsweredCount(roomCode)
      });
    }
  });

  // Start next question
  socket.on('next-question', async (data) => {
    const roomCode = roomManager.getHostRoom(socket.id);
    
    if (roomCode) {
      const nextQuestion = await getNextQuestion(roomCode);
      
      if (nextQuestion) {
        io.to(roomCode).emit('question-started', {
          question: nextQuestion,
          timeLimit: QUESTION_TIME_LIMIT
        });
        
        // Auto-advance after time limit
        setTimeout(() => {
          io.to(roomCode).emit('question-ended');
        }, QUESTION_TIME_LIMIT * 1000);
      } else {
        // Game finished
        const finalScores = roomManager.getFinalScores(roomCode);
        io.to(roomCode).emit('game-ended', { scores: finalScores });
      }
    }
  });
};
```

### Database Integration

```javascript
// gameService.js - Business logic with Supabase
const gameService = {
  async createGameSession(quizId, hostId) {
    const roomCode = generateRoomCode();
    
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        quiz_id: quizId,
        host_id: hostId,
        room_code: roomCode,
        status: 'waiting'
      })
      .select()
      .single();
      
    if (error) throw new Error('Failed to create game session');
    return data;
  },

  async addParticipant(sessionId, userId, playerName) {
    const { data, error } = await supabase
      .from('game_participants')
      .insert({
        session_id: sessionId,
        user_id: userId,
        player_name: playerName
      })
      .select()
      .single();
      
    if (error) throw new Error('Failed to add participant');
    return data;
  },

  async submitAnswer(sessionId, participantId, questionId, answer, responseTime) {
    // Validate answer
    const { data: question } = await supabase
      .from('questions')
      .select('correct_answer, points')
      .eq('id', questionId)
      .single();
      
    const isCorrect = question.correct_answer === answer;
    const pointsEarned = isCorrect ? calculatePoints(question.points, responseTime) : 0;
    
    // Save answer
    const { data, error } = await supabase
      .from('player_answers')
      .insert({
        session_id: sessionId,
        participant_id: participantId,
        question_id: questionId,
        answer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        response_time: responseTime
      });
      
    if (error) throw new Error('Failed to submit answer');
    
    // Update participant total score
    await supabase.rpc('update_participant_score', {
      participant_uuid: participantId,
      additional_points: pointsEarned
    });
    
    return { isCorrect, pointsEarned };
  }
};
```

### Authentication System

```javascript
// authController.js - JWT authentication
const authController = {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (authError) throw authError;
      
      // Create user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          username,
          email
        })
        .select()
        .single();
        
      if (userError) throw userError;
      
      // Generate JWT
      const token = jwt.sign(
        { userId: userData.id, username: userData.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      res.status(201).json({
        success: true,
        token,
        user: userData
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) throw authError;
      
      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      const token = jwt.sign(
        { userId: userData.id, username: userData.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      res.json({
        success: true,
        token,
        user: userData
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  }
};
```

## 🔒 Security Features

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### Input Validation
```javascript
const Joi = require('joi');

const validateCreateQuiz = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(1000),
    questions: Joi.array().items(
      Joi.object({
        question_text: Joi.string().required(),
        options: Joi.array().items(Joi.string()).min(2).max(6),
        correct_answer: Joi.string().required(),
        points: Joi.number().min(1).max(1000).default(100),
        time_limit: Joi.number().min(5).max(300).default(30)
      })
    ).min(1).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};
```

## 📊 Performance Optimization

### Connection Pooling
```javascript
// Supabase client with connection pooling
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

### Memory Management
```javascript
// Efficient room cleanup
setInterval(() => {
  roomManager.cleanupInactiveRooms();
}, 5 * 60 * 1000); // Every 5 minutes

class RoomManager {
  cleanupInactiveRooms() {
    for (const [roomCode, room] of this.rooms.entries()) {
      if (room.status === 'finished' && 
          Date.now() - room.endedAt > 30 * 60 * 1000) { // 30 minutes
        this.deleteRoom(roomCode);
      }
    }
  }
}
```

## 🚀 Deployment

### Render Deployment

1. **Connect Repository**: Link your GitHub repository to Render

2. **Environment Variables**: Add all required environment variables in Render dashboard

3. **Build Settings**:
   ```yaml
   # render.yaml
   services:
     - type: web
       name: tuiz-backend
       env: node
       plan: free
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
   ```

### Health Check Endpoint
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

## 🧪 Testing

### Test Structure
```
tests/
├── unit/              # Unit tests
│   ├── controllers/
│   ├── services/
│   ├── utils/
│   └── models/
├── integration/       # API integration tests
│   ├── auth.test.js
│   ├── games.test.js
│   └── quizzes.test.js
├── socket/           # Socket.IO tests
│   ├── connection.test.js
│   ├── rooms.test.js
│   └── gameplay.test.js
└── load/             # Load testing
    ├── artillery.yml
    └── loadtest.js
```

### Example Tests
```javascript
// games.test.js
describe('Game API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  test('POST /api/games/create should create new game session', async () => {
    const response = await request(app)
      .post('/api/games/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        quizId: testQuizId,
        settings: { maxPlayers: 50 }
      });

    expect(response.status).toBe(201);
    expect(response.body.roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });
});
```

### Load Testing
```yaml
# artillery.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
  socketio:
    query:
      transport: websocket

scenarios:
  - name: "Socket connection and room join"
    engine: socketio
    flow:
      - emit:
          channel: "join-room"
          data:
            roomCode: "TEST01"
            playerName: "Player{{ $randomNumber(1, 1000) }}"
```

## 📈 Monitoring & Logging

### Winston Logger Setup
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Metrics Collection
```javascript
// Basic metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    activeConnections: io.engine.clientsCount,
    activeRooms: roomManager.getActiveRoomCount(),
    totalPlayers: roomManager.getTotalPlayerCount(),
    serverUptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});
```

## 🤝 Contributing

1. **Code Style**: Follow ESLint and Prettier configurations
2. **Commits**: Use conventional commit format
3. **Testing**: Write tests for new features
4. **Documentation**: Update README for significant changes
5. **Security**: Follow security best practices

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create pull request for review
```

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Email**: your-email@example.com
