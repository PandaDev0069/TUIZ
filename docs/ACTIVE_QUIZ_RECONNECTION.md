# Active Quiz Reconnection Implementation

## Overview
This implementation adds robust reconnection functionality for players who lose connection during active quiz games. Previously, players would get stuck in a loading state when trying to rejoin an active game.

## Key Features

### 1. **Backend Game State Tracking**
- Added timing information (`timeRemaining`, `isTimerRunning`, `questionStartTime`) to active games
- Stores current question state for reconnection
- Tracks explanation/leaderboard display state (`showingResults`, `lastExplanationData`)
- Implements question timers to keep accurate time tracking

### 2. **Enhanced Session Restoration**
- Improved `restorePlayerToActiveGame()` to immediately send current question or explanation
- Added automatic question/explanation state detection
- Proper socket room rejoining and player state synchronization

### 3. **Frontend Reconnection Handling**
- Enhanced Quiz component to handle `playerSessionRestored` events for active games
- Automatic timer synchronization based on server state
- Improved loading states with reconnection indicators
- Timeout mechanism to prevent indefinite loading

### 4. **Automatic Session Restoration**
- SocketManager automatically attempts restoration on reconnection
- Session data persistence in localStorage
- Fallback mechanisms for failed restorations

## Implementation Details

### Backend Changes

#### 1. Game State Tracking (`server.js`)
```javascript
// Added to sendNextQuestion()
activeGame.currentQuestion = {
  id: question.id,
  question: question.question,
  options: question.options,
  type: question.type,
  timeLimit: question.timeLimit,
  correctIndex: question.correctIndex,
  _dbData: question._dbData,
  imageUrl: question.image_url
};
activeGame.timeRemaining = question.timeLimit;
activeGame.isTimerRunning = true;
activeGame.questionStartTime = Date.now();
activeGame.showingResults = false;

// Timer to track remaining time
activeGame.questionTimer = setInterval(() => {
  if (activeGame.timeRemaining <= 0) {
    clearInterval(activeGame.questionTimer);
    activeGame.isTimerRunning = false;
    return;
  }
  activeGame.timeRemaining -= 1000;
}, 1000);
```

#### 2. Enhanced Session Restoration (`sessionRestoreHandlers.js`)
```javascript
// Enhanced restorePlayerToActiveGame()
if (activeGame.currentQuestion && activeGame.isTimerRunning && activeGame.timeRemaining > 0) {
  logger.info(`🎯 Sending current question to reconnected player ${playerName}`);
  
  socket.emit('question', {
    ...activeGame.currentQuestion,
    timeLimit: activeGame.timeRemaining
  });
}

if (activeGame.showingResults && activeGame.lastExplanationData) {
  logger.info(`📊 Sending current explanation/results to reconnected player ${playerName}`);
  
  if (activeGame.lastExplanationData.explanation) {
    socket.emit('showExplanation', activeGame.lastExplanationData);
  } else {
    socket.emit('showLeaderboard', activeGame.lastExplanationData);
  }
}
```

### Frontend Changes

#### 1. Quiz Component Session Handling (`Quiz.jsx`)
```javascript
// Handle session restoration for active games
on('playerSessionRestored', (data) => {
  if (data.type === 'activeGame' && data.gameState) {
    const { gameState } = data;
    
    // Update player state
    if (data.playerState) {
      setScore(data.playerState.score || 0);
      setStreak(data.playerState.streak || 0);
    }
    
    // Restore current question
    if (gameState.currentQuestion) {
      setQuestion(gameState.currentQuestion);
      setSelected(null);
      setFeedback("");
      setShowExplanation(false);
      
      // Calculate remaining time
      let remainingTime = 10;
      if (gameState.timeRemaining && gameState.timeRemaining > 0) {
        remainingTime = Math.ceil(gameState.timeRemaining / 1000);
      }
      setTimer(remainingTime);
    }
  }
});
```

#### 2. Enhanced Loading States
```javascript
if (!question) return (
  <div className="page-container">
    <div className="card">
      {!sessionRestored && isConnected ? (
        <div className="quiz-loading reconnecting">
          <div className="quiz-loading-skeleton">
            <div className="loading-bar"></div>
            <div className="loading-text">ゲームに再接続中...</div>
            <div className="loading-subtext">
              接続が復旧するまでお待ちください
            </div>
          </div>
        </div>
      ) : (
        <LoadingSkeleton type="question" count={1} />
      )}
    </div>
  </div>
);
```

## Usage Flow

### Normal Reconnection Flow
1. Player loses connection during active quiz
2. Frontend detects disconnection and shows reconnection UI
3. SocketManager automatically attempts reconnection
4. Backend validates session and restores player to active game
5. Current question/explanation state is immediately sent to player
6. Player continues quiz seamlessly

### Error Handling
- **Session Expired**: Redirects to join page
- **Game Not Found**: Shows error and redirects
- **Timeout**: 15-second timeout redirects to join page
- **Invalid State**: Fallback to loading skeleton

## Testing

Use the provided test script to verify functionality:

```bash
cd backend
node test_reconnection.js
```

## Configuration

### Timeouts
- **Reconnection timeout**: 15 seconds (Quiz component)
- **Session restoration delay**: 500ms (SocketManager)
- **Question timer interval**: 1 second (Backend)

### Session Data
Stored in localStorage:
- `tuiz_current_game_id`
- `tuiz_current_room` 
- `tuiz_player_name`
- `tuiz_is_host`
- `tuiz_question_set_id`

## Benefits

1. **Seamless Experience**: Players can rejoin active games without disruption
2. **Accurate State**: Server-side timing ensures synchronization
3. **Robust Error Handling**: Multiple fallback mechanisms
4. **Automatic Recovery**: No manual intervention required
5. **Performance**: Minimal overhead with efficient state tracking

## Future Enhancements

1. **Partial Answer Recovery**: Store and restore partially selected answers
2. **Connection Quality Indicators**: Show network status to users
3. **Smart Reconnection**: Adaptive timeout based on connection stability
4. **Offline Mode**: Cache questions for offline play during poor connectivity
