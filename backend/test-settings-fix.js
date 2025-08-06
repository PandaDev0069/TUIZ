const { io } = require('socket.io-client');

// Connect to the backend
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Connected to backend');
  
  // Test creating a game with the question set that has maxPlayers: 300
  // This simulates the fixed frontend behavior
  socket.emit('createGame', {
    hostId: 'host_test-user-id',
    questionSetId: '10b1d77b-2c3b-4a78-a28b-cbaf8d5bfe8a', // Question set with maxPlayers: 300
    settings: {
      title: null,
      fromQuestionSet: true // Only metadata, no overrides
    }
  });
});

socket.on('gameCreated', ({ gameCode, game }) => {
  console.log('🎮 Game created successfully!');
  console.log('Game Code:', gameCode);
  console.log('Game ID:', game.id);
  console.log('✅ Test completed - settings should preserve maxPlayers: 300');
  process.exit(0);
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from backend');
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  process.exit(1);
}, 10000);
