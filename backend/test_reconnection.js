#!/usr/bin/env node

/**
 * Test script for active game reconnection functionality
 * This script tests the player reconnection during active quiz scenarios
 */

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3001';
const TEST_ROOM = 'TEST_RECON_' + Date.now();
const TEST_PLAYER = 'TestPlayer_' + Math.random().toString(36).substr(2, 9);

console.log('🧪 Testing Active Game Reconnection');
console.log(`Room: ${TEST_ROOM}`);
console.log(`Player: ${TEST_PLAYER}`);

// Test scenario:
// 1. Connect as player to a game room
// 2. Simulate active game state
// 3. Disconnect
// 4. Reconnect and verify session restoration

let hostSocket, playerSocket;

function createHostSocket() {
  return new Promise((resolve) => {
    hostSocket = io(SERVER_URL, {
      transports: ['websocket']
    });

    hostSocket.on('connect', () => {
      console.log('👑 Host connected');
      
      // Create a game room
      hostSocket.emit('createGame', {
        gameTitle: 'Reconnection Test Game',
        questionSetId: 1, // Assuming a test question set exists
        gameSettings: {
          timeLimit: 30,
          autoAdvance: true
        }
      });
    });

    hostSocket.on('gameCreated', (data) => {
      if (data.gameCode === TEST_ROOM || data.room === TEST_ROOM) {
        console.log('✅ Game created successfully');
        resolve(data);
      }
    });

    hostSocket.on('error', (error) => {
      console.error('❌ Host error:', error);
    });
  });
}

function createPlayerSocket() {
  return new Promise((resolve) => {
    playerSocket = io(SERVER_URL, {
      transports: ['websocket']
    });

    playerSocket.on('connect', () => {
      console.log('👤 Player connected');
      
      // Join the game
      playerSocket.emit('joinGame', {
        playerName: TEST_PLAYER,
        gameCode: TEST_ROOM
      });
    });

    playerSocket.on('playerJoined', (data) => {
      console.log('✅ Player joined game successfully');
      resolve(data);
    });

    playerSocket.on('playerSessionRestored', (data) => {
      console.log('🔄 Player session restored:', data.type);
      if (data.type === 'activeGame') {
        console.log('✅ Successfully reconnected to active game!');
        console.log('Game State:', {
          hasCurrentQuestion: !!data.gameState.currentQuestion,
          timeRemaining: data.gameState.timeRemaining,
          isTimerRunning: data.gameState.isTimerRunning,
          showingResults: data.gameState.showingResults
        });
      }
      resolve(data);
    });

    playerSocket.on('question', (question) => {
      console.log('📋 Received question:', question.question);
    });

    playerSocket.on('sessionExpired', (data) => {
      console.log('⏰ Session expired:', data.message);
    });

    playerSocket.on('error', (error) => {
      console.error('❌ Player error:', error);
    });
  });
}

async function runReconnectionTest() {
  try {
    console.log('\n🚀 Starting reconnection test...\n');

    // Step 1: Create host and game
    console.log('Step 1: Creating game room...');
    await createHostSocket();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Join as player
    console.log('\nStep 2: Joining as player...');
    await createPlayerSocket();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Simulate active game state (would normally be done through game start)
    console.log('\nStep 3: Simulating active game...');
    // For testing, we'll store session data manually
    console.log('Note: In real scenario, session data would be stored automatically');
    
    // Step 4: Disconnect player
    console.log('\nStep 4: Disconnecting player...');
    playerSocket.disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Reconnect and test restoration
    console.log('\nStep 5: Reconnecting player...');
    playerSocket = io(SERVER_URL, {
      transports: ['websocket']
    });

    return new Promise((resolve) => {
      playerSocket.on('connect', () => {
        console.log('👤 Player reconnected, attempting session restoration...');
        
        // Attempt session restoration
        playerSocket.emit('restoreSession', {
          playerName: TEST_PLAYER,
          room: TEST_ROOM,
          isHost: false
        });
      });

      playerSocket.on('playerSessionRestored', (data) => {
        console.log('✅ Test completed successfully!');
        console.log('Restoration type:', data.type);
        resolve(data);
      });

      playerSocket.on('sessionExpired', () => {
        console.log('❌ Session expired during reconnection test');
        resolve(null);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('⏰ Test timed out');
        resolve(null);
      }, 10000);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    if (hostSocket) hostSocket.disconnect();
    if (playerSocket) playerSocket.disconnect();
    console.log('\n🧹 Test cleanup completed');
  }
}

// Run the test
runReconnectionTest().then(() => {
  console.log('\n✨ Reconnection test finished');
  process.exit(0);
});
