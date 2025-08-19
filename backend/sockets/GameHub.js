const logger = require('../utils/logger');

/**
 * GameHub - A wrapper around Socket.IO and activeGames Map
 * Provides clean abstraction for game state management and room emissions
 */
class GameHub {
  /**
   * @param {Server} io - Socket.IO server instance
   * @param {Map} activeGames - Active games map reference
   */
  constructor(io, activeGames) {
    this.io = io;
    this.activeGames = activeGames;
  }

  /**
   * Get a game from the active games map
   * @param {string} gameCode - Game code to retrieve
   * @returns {Object|undefined} Game object or undefined if not found
   */
  get(gameCode) {
    return this.activeGames.get(gameCode);
  }

  /**
   * Set a game in the active games map
   * @param {string} gameCode - Game code to set
   * @param {Object} gameState - Game state object
   */
  set(gameCode, gameState) {
    this.activeGames.set(gameCode, gameState);
  }

  /**
   * Check if a game exists in the active games map
   * @param {string} gameCode - Game code to check
   * @returns {boolean} True if game exists
   */
  has(gameCode) {
    return this.activeGames.has(gameCode);
  }

  /**
   * Delete a game from the active games map
   * @param {string} gameCode - Game code to delete
   * @returns {boolean} True if game was deleted
   */
  delete(gameCode) {
    return this.activeGames.delete(gameCode);
  }

  /**
   * Update a game using a mutator function
   * @param {string} gameCode - Game code to update
   * @param {Function} mutator - Function to update the game state: (game) => void
   * @returns {Object|undefined} Updated game object or undefined if not found
   */
  update(gameCode, mutator) {
    const game = this.activeGames.get(gameCode);
    if (game) {
      mutator(game);
      return game;
    }
    return undefined;
  }

  /**
   * Get all active games (for iteration or debugging)
   * @returns {Map} The activeGames map reference
   */
  getAllGames() {
    return this.activeGames;
  }

  /**
   * Get the count of active games
   * @returns {number} Number of active games
   */
  getGameCount() {
    return this.activeGames.size;
  }

  /**
   * Emit to a specific room (game code)
   * @param {string} gameCode - Game code (room name)
   * @returns {Object} Room emitter with emit method
   */
  toRoom(gameCode) {
    return {
      emit: (event, payload) => {
        this.io.to(gameCode).emit(event, payload);
      }
    };
  }

  /**
   * Emit to a specific socket by socket ID
   * @param {string} socketId - Socket ID
   * @returns {Object} Socket emitter with emit method
   */
  toSocket(socketId) {
    return {
      emit: (event, payload) => {
        this.io.to(socketId).emit(event, payload);
      }
    };
  }

  /**
   * Emit to all connected sockets
   * @param {string} event - Event name
   * @param {Object} payload - Event payload
   */
  emitToAll(event, payload) {
    this.io.emit(event, payload);
  }

  /**
   * Get Socket.IO server instance (for advanced usage)
   * @returns {Server} Socket.IO server
   */
  getIO() {
    return this.io;
  }

  /**
   * Get game state summary for logging/debugging
   * @param {string} gameCode - Game code to summarize
   * @returns {Object|null} Game summary or null if not found
   */
  getGameSummary(gameCode) {
    const game = this.activeGames.get(gameCode);
    if (!game) return null;

    return {
      gameCode,
      status: game.status,
      playerCount: game.players ? game.players.size : 0,
      currentQuestion: game.currentQuestionIndex,
      totalQuestions: game.totalQuestions,
      hostId: game.hostId,
      created: game.created_at
    };
  }
}

module.exports = GameHub;
