# 🔗 API Requirements for Host Control Panel

*Document Date: August 12, 2025*  
*Project: TUIZ Host Control Panel Enhancement*  
*API Version: 2.0*

## 📋 API Enhancement Overview

The host control panel requires significant backend API enhancements to support real-time game management, player oversight, and comprehensive analytics. This document outlines all new and modified API endpoints needed.

## 🎮 Game Control APIs

### 🔄 **Game State Management**

#### **POST /api/host/game/:gameId/pause**
Pause an active game session
```javascript
// Request
{
  "pauseReason": "host_action" | "technical_issue" | "break",
  "message": "Optional message to players"
}

// Response
{
  "success": true,
  "gameState": {
    "status": "paused",
    "pausedAt": "2025-08-12T10:30:00Z",
    "pausedDuration": 0,
    "canResume": true
  }
}

// Socket Broadcast
socket.to(gameId).emit('game:paused', {
  gameId,
  pausedAt: timestamp,
  message: "Game paused by host"
});
```

#### **POST /api/host/game/:gameId/resume**
Resume a paused game session
```javascript
// Request
{
  "countdown": 3, // seconds before resuming
  "message": "Optional resume message"
}

// Response
{
  "success": true,
  "gameState": {
    "status": "active",
    "resumedAt": "2025-08-12T10:35:00Z",
    "totalPausedDuration": 300000, // milliseconds
    "currentQuestion": 5
  }
}
```

#### **POST /api/host/game/:gameId/skip-question**
Skip current question and move to next
```javascript
// Request
{
  "skipReason": "technical_issue" | "time_constraint" | "inappropriate",
  "showCorrectAnswer": true
}

// Response
{
  "success": true,
  "skippedQuestion": 5,
  "nextQuestion": 6,
  "gameState": {
    "currentQuestion": 6,
    "skippedQuestions": [3, 5]
  }
}
```

#### **POST /api/host/game/:gameId/emergency-stop**
Emergency stop game session
```javascript
// Request
{
  "reason": "technical_issue" | "inappropriate_content" | "safety_concern",
  "saveProgress": true
}

// Response
{
  "success": true,
  "finalState": {
    "status": "stopped",
    "completedQuestions": 8,
    "finalLeaderboard": [...],
    "sessionData": "encrypted_session_backup"
  }
}
```

### ⏱️ **Timer Management**

#### **POST /api/host/game/:gameId/adjust-timer**
Adjust current question timer
```javascript
// Request
{
  "adjustment": 30, // seconds to add (+) or remove (-)
  "reason": "technical_delay" | "clarification_needed" | "host_decision"
}

// Response
{
  "success": true,
  "timer": {
    "remaining": 85,
    "total": 120,
    "adjustments": [
      {
        "amount": 30,
        "reason": "technical_delay",
        "timestamp": "2025-08-12T10:30:00Z"
      }
    ]
  }
}
```

#### **POST /api/host/game/:gameId/reset-timer**
Reset timer for current question
```javascript
// Request
{
  "newDuration": 60, // Optional: set new duration
  "reason": "restart_question"
}

// Response
{
  "success": true,
  "timer": {
    "remaining": 60,
    "total": 60,
    "isRunning": false
  }
}
```

## 👥 Player Management APIs

### 🚪 **Player Actions**

#### **POST /api/host/game/:gameId/kick-player**
Remove player from game session
```javascript
// Request
{
  "playerId": "player-uuid",
  "reason": "disruptive_behavior" | "inappropriate_name" | "technical_issue",
  "banDuration": 0, // minutes, 0 = session only
  "message": "Optional message to player"
}

// Response
{
  "success": true,
  "removedPlayer": {
    "id": "player-uuid",
    "name": "PlayerName",
    "kickedAt": "2025-08-12T10:30:00Z",
    "reason": "disruptive_behavior"
  },
  "updatedPlayerCount": 23
}
```

#### **POST /api/host/game/:gameId/mute-player**
Mute/unmute player in game session
```javascript
// Request
{
  "playerId": "player-uuid",
  "muted": true,
  "duration": 300, // seconds, 0 = permanent until unmuted
  "reason": "inappropriate_messages"
}

// Response
{
  "success": true,
  "player": {
    "id": "player-uuid",
    "muted": true,
    "mutedUntil": "2025-08-12T10:35:00Z",
    "muteReason": "inappropriate_messages"
  }
}
```

#### **POST /api/host/game/:gameId/send-private-message**
Send private message to specific player
```javascript
// Request
{
  "playerId": "player-uuid",
  "message": "Please follow the game rules",
  "type": "warning" | "info" | "encouragement"
}

// Response
{
  "success": true,
  "messageId": "msg-uuid",
  "sentAt": "2025-08-12T10:30:00Z"
}
```

### 👥 **Team Management**

#### **POST /api/host/game/:gameId/create-team**
Create new team in game session
```javascript
// Request
{
  "teamName": "Team Alpha",
  "color": "#FF5733",
  "maxMembers": 4,
  "initialMembers": ["player1", "player2"]
}

// Response
{
  "success": true,
  "team": {
    "id": "team-uuid",
    "name": "Team Alpha",
    "color": "#FF5733",
    "members": ["player1", "player2"],
    "score": 0,
    "createdAt": "2025-08-12T10:30:00Z"
  }
}
```

#### **POST /api/host/game/:gameId/assign-team**
Assign player to team
```javascript
// Request
{
  "playerId": "player-uuid",
  "teamId": "team-uuid",
  "replaceExisting": true
}

// Response
{
  "success": true,
  "assignment": {
    "playerId": "player-uuid",
    "teamId": "team-uuid",
    "previousTeam": "old-team-uuid",
    "assignedAt": "2025-08-12T10:30:00Z"
  }
}
```

## 📊 Analytics APIs

### 📈 **Real-time Analytics**

#### **GET /api/host/game/:gameId/analytics/live**
Get real-time game analytics
```javascript
// Response
{
  "gameId": "game-uuid",
  "timestamp": "2025-08-12T10:30:00Z",
  "overview": {
    "totalPlayers": 25,
    "activeResponses": 23,
    "averageResponseTime": 8.5,
    "engagementScore": 87.5,
    "currentQuestion": 5
  },
  "currentQuestion": {
    "questionId": 5,
    "responses": 23,
    "answerDistribution": {
      "A": 8,
      "B": 12,
      "C": 2,
      "D": 1
    },
    "averageResponseTime": 8.5,
    "fastestResponse": 2.1,
    "slowestResponse": 18.3,
    "correctAnswer": "B",
    "accuracyRate": 52.2
  },
  "playerMetrics": {
    "topPerformers": [...],
    "strugglingPlayers": [...],
    "participationRate": 92.0,
    "dropoffRate": 8.0
  }
}
```

#### **GET /api/host/game/:gameId/analytics/question/:questionNumber**
Get analytics for specific question
```javascript
// Response
{
  "questionNumber": 3,
  "questionText": "What is the capital of France?",
  "analytics": {
    "totalResponses": 24,
    "answerDistribution": {
      "A": 2,   // London
      "B": 20,  // Paris (correct)
      "C": 1,   // Berlin
      "D": 1    // Madrid
    },
    "correctAnswer": "B",
    "accuracyRate": 83.3,
    "averageResponseTime": 6.8,
    "difficultyScore": 2.1, // 1-5 scale
    "engagementLevel": "high",
    "responseTimeDistribution": {
      "0-5s": 12,
      "5-10s": 8,
      "10-15s": 3,
      "15s+": 1
    }
  }
}
```

### 📊 **Player Analytics**

#### **GET /api/host/game/:gameId/players/analytics**
Get comprehensive player analytics
```javascript
// Response
{
  "totalPlayers": 25,
  "analytics": {
    "performance": {
      "averageScore": 67.5,
      "topScore": 95,
      "lowestScore": 12,
      "scoreDistribution": {
        "90-100": 3,
        "80-89": 5,
        "70-79": 8,
        "60-69": 4,
        "50-59": 3,
        "below-50": 2
      }
    },
    "engagement": {
      "averageParticipationRate": 94.2,
      "averageResponseTime": 8.7,
      "mostEngagedPlayer": "player-uuid",
      "leastEngagedPlayer": "player-uuid"
    },
    "progress": {
      "improvingPlayers": 15,
      "decliningPlayers": 3,
      "consistentPlayers": 7
    }
  },
  "individualMetrics": [
    {
      "playerId": "player-uuid",
      "name": "Alice",
      "score": 85,
      "rank": 3,
      "averageResponseTime": 6.2,
      "accuracyRate": 78.5,
      "participationRate": 100.0,
      "improvementTrend": "increasing",
      "teamId": "team-uuid"
    }
    // ... more players
  ]
}
```

## 🔒 **Host Permission Middleware**

### **validateHostPermission**
```javascript
const validateHostPermission = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { userId } = req.user;
    
    // Check if user is the host of this game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.hostId !== userId) {
      return res.status(403).json({ error: 'Host permission required' });
    }
    
    req.game = game;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Permission validation failed' });
  }
};
```

### **validateGameState**
```javascript
const validateGameState = (allowedStates) => {
  return (req, res, next) => {
    const { game } = req;
    
    if (!allowedStates.includes(game.status)) {
      return res.status(400).json({
        error: 'Invalid game state for this operation',
        currentState: game.status,
        allowedStates
      });
    }
    
    next();
  };
};
```

## 🔌 **Socket.IO Event Extensions**

### 📡 **Host Events**
```javascript
// Game Control Events
'host:game:pause'          // Pause game
'host:game:resume'         // Resume game  
'host:game:skip'           // Skip question
'host:game:stop'           // Emergency stop
'host:timer:adjust'        // Adjust timer
'host:timer:reset'         // Reset timer

// Player Management Events
'host:player:kick'         // Kick player
'host:player:mute'         // Mute/unmute player
'host:player:message'      // Send private message
'host:team:create'         // Create team
'host:team:assign'         // Assign player to team
'host:team:delete'         // Delete team

// Analytics Events
'host:analytics:request'   // Request analytics update
'host:export:data'         // Export game data
'host:checkpoint:save'     // Save game checkpoint
'host:checkpoint:restore'  // Restore from checkpoint
```

### 📢 **Broadcast Events**
```javascript
// Game State Updates
'game:paused'              // Game was paused
'game:resumed'             // Game was resumed
'game:question:skipped'    // Question was skipped
'game:stopped'             // Game was stopped
'game:timer:adjusted'      // Timer was adjusted

// Player Updates
'player:kicked'            // Player was removed
'player:muted'             // Player was muted
'player:team:assigned'     // Player assigned to team
'team:created'             // New team created

// Analytics Updates
'analytics:updated'        // Real-time analytics update
'leaderboard:updated'      // Leaderboard changed
'question:analytics'       // Question analytics available
```

## 💾 **Database Schema Extensions**

### 🎮 **Enhanced Game Table**
```sql
ALTER TABLE games ADD COLUMN pause_state TEXT; -- JSON
ALTER TABLE games ADD COLUMN checkpoint_data TEXT; -- JSON  
ALTER TABLE games ADD COLUMN host_settings TEXT; -- JSON
ALTER TABLE games ADD COLUMN timer_adjustments TEXT; -- JSON
ALTER TABLE games ADD COLUMN skipped_questions TEXT; -- JSON array
```

### 👥 **Player Actions Table**
```sql
CREATE TABLE player_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'kick', 'mute', 'warn', 'team_assign'
  performed_by TEXT NOT NULL, -- host_id
  action_data TEXT, -- JSON details
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- For temporary actions like mutes
  FOREIGN KEY (game_id) REFERENCES games(id)
);
```

### 👥 **Team Management Table**
```sql
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  max_members INTEGER DEFAULT 4,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT, -- host_id
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE team_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT, -- host_id or 'self'
  FOREIGN KEY (team_id) REFERENCES teams(id)
);
```

### 📊 **Analytics Tables**
```sql
CREATE TABLE analytics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  question_number INTEGER,
  snapshot_type TEXT, -- 'question_start', 'question_end', 'game_end'
  analytics_data TEXT NOT NULL, -- JSON
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE player_question_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  response_time REAL, -- milliseconds
  correct BOOLEAN,
  answer_given TEXT,
  engagement_score REAL, -- 0-100
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id)
);
```

## 🔄 **API Rate Limiting**

### 📊 **Host-Specific Rate Limits**
```javascript
const hostRateLimits = {
  // Game control actions
  'pause/resume': '10 per minute',
  'skip_question': '5 per minute', 
  'timer_adjust': '20 per minute',
  'emergency_stop': '2 per minute',
  
  // Player management
  'kick_player': '10 per minute',
  'mute_player': '15 per minute',
  'private_message': '30 per minute',
  
  // Analytics requests
  'analytics_live': '60 per minute',
  'export_data': '3 per hour'
};
```

## 🧪 **API Testing Strategy**

### 📋 **Test Coverage Requirements**
```javascript
// Unit Tests
- Host permission validation
- Game state validation
- Timer adjustment logic
- Player action validation
- Analytics calculation accuracy

// Integration Tests  
- Complete game pause/resume flow
- Player kick/mute workflow
- Team creation and assignment
- Real-time analytics updates
- Socket event broadcasting

// Load Tests
- 100+ player game management
- Rapid host action sequences
- Analytics generation performance
- Database query optimization
```

### 🔧 **Mock Data Generation**
```javascript
// Test game with realistic data
const mockGameData = {
  gameId: 'test-game-123',
  players: generateMockPlayers(50),
  questions: generateMockQuestions(20),
  teams: generateMockTeams(5),
  analytics: generateMockAnalytics()
};
```

## 🚀 **Deployment Considerations**

### 🔄 **Migration Strategy**
1. **Phase 1**: Add new API endpoints without breaking existing functionality
2. **Phase 2**: Implement socket event extensions
3. **Phase 3**: Deploy database schema changes
4. **Phase 4**: Enable new host features with feature flags
5. **Phase 5**: Full rollout and legacy cleanup

### 📊 **Monitoring & Logging**
```javascript
// API endpoint monitoring
const hostAPIMetrics = {
  'response_time': 'avg, p95, p99',
  'error_rate': 'percentage by endpoint',
  'usage_frequency': 'requests per host per hour',
  'socket_connections': 'concurrent host connections',
  'database_performance': 'query execution times'
};
```

---

## 📋 **API Development Checklist**

### ✅ **Implementation Steps**
- [ ] Create new API routes with proper middleware
- [ ] Implement host permission validation
- [ ] Add Socket.IO event handlers
- [ ] Create database migrations
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Write API documentation
- [ ] Create unit and integration tests
- [ ] Add monitoring and logging
- [ ] Performance testing with realistic loads

### 🔒 **Security Checklist**
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] Rate limiting implementation
- [ ] Permission validation
- [ ] Audit logging for host actions
- [ ] Data encryption for sensitive information

---

*This API specification serves as the complete backend requirements for the host control panel enhancement.*
