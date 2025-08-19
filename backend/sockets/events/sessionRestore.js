const logger = require('../../utils/logger');
const SessionRestoreHandlers = require('../sessionRestoreHandlers');

/**
 * Registers session restore event handlers on a socket
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance  
 * @param {Map} activeGames - Active games map
 * @param {DatabaseManager} db - Database manager instance
 */
function register(socket, io, activeGames, db) {
  // Initialize session restoration handlers for this socket
  const sessionRestoreHandlers = new SessionRestoreHandlers(io, activeGames, db);

  // Session restoration event handlers
  socket.on('restoreSession', async (sessionData) => {
    await sessionRestoreHandlers.handleSessionRestore(socket, sessionData);
  });

  // Host-specific restoration events (for compatibility)
  socket.on('host:rejoinGame', async (sessionData) => {
    const hostSessionData = { ...sessionData, isHost: true };
    await sessionRestoreHandlers.handleSessionRestore(socket, hostSessionData);
  });

  // Player-specific restoration events (for compatibility)
  socket.on('player:rejoinGame', async (sessionData) => {
    const playerSessionData = { ...sessionData, isHost: false };
    await sessionRestoreHandlers.handleSessionRestore(socket, playerSessionData);
  });

  // Legacy restoration events (for backward compatibility)
  socket.on('requestStateRestoration', async (sessionData) => {
    await sessionRestoreHandlers.handleSessionRestore(socket, sessionData);
  });

  socket.on('requestHostRestoration', async (sessionData) => {
    const hostSessionData = { ...sessionData, isHost: true };
    await sessionRestoreHandlers.handleSessionRestore(socket, hostSessionData);
  });

  socket.on('requestPlayerRestoration', async (sessionData) => {
    const playerSessionData = { ...sessionData, isHost: false };
    await sessionRestoreHandlers.handleSessionRestore(socket, playerSessionData);
  });

  // Additional session restoration helpers
  socket.on('host:requestGameState', ({ gameId, room }) => {
    try {
      const gameCode = room;
      const activeGame = activeGames.get(gameCode);
      
      if (activeGame) {
        const connectedPlayers = Array.from(activeGame.players.values())
          .filter(p => p.isConnected)
          .map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            joinedAt: p.joinedAt || Date.now()
          }));

        socket.emit('host:gameStateUpdate', {
          gameCode,
          gameId: activeGame.gameId,
          status: activeGame.status,
          players: connectedPlayers,
          playerCount: connectedPlayers.length,
          currentQuestionIndex: activeGame.currentQuestionIndex,
          totalQuestions: activeGame.totalQuestions
        });
      } else {
        socket.emit('host:gameNotFound', { gameCode, gameId });
      }
    } catch (error) {
      logger.error('❌ Error getting game state:', error);
      socket.emit('error', { message: 'Failed to get game state' });
    }
  });

  socket.on('player:requestGameState', ({ playerName, room, gameId }) => {
    try {
      const gameCode = room;
      const activeGame = activeGames.get(gameCode);
      
      if (activeGame) {
        // Find player in game
        let playerData = null;
        for (const [playerId, player] of activeGame.players.entries()) {
          if (player.name === playerName) {
            playerData = player;
            break;
          }
        }

        if (playerData) {
          socket.emit('player:gameStateUpdate', {
            gameCode,
            gameId: activeGame.gameId,
            status: activeGame.status,
            playerState: {
              name: playerData.name,
              score: playerData.score,
              isReady: playerData.isReady
            },
            currentQuestionIndex: activeGame.currentQuestionIndex,
            totalQuestions: activeGame.totalQuestions
          });
        } else {
          socket.emit('player:notInGame', { playerName, gameCode });
        }
      } else {
        socket.emit('player:gameNotFound', { gameCode, gameId });
      }
    } catch (error) {
      logger.error('❌ Error getting player game state:', error);
      socket.emit('error', { message: 'Failed to get game state' });
    }
  });
}

module.exports = { register };
