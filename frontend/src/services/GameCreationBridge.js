import socket from '../socket';
import { useAuth } from '../contexts/AuthContext';

/**
 * Enhanced Game Creation Bridge for Host Control Integration
 * This service bridges the existing socket-based game creation
 * with the new host control system
 */
class GameCreationBridge {
  constructor() {
    this.activeGame = null;
    this.capabilities = null;
  }

  /**
   * Create a game using the enhanced host control system
   * Maintains backwards compatibility with existing socket flow
   */
  async createGame({ hostId, questionSetId, settings = {} }) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Game creation timeout - please try again'));
      }, 15000);

      // Core game settings only - simplified
      const enhancedSettings = {
        ...settings,
        // Keep the essential settings from our simplified list
        maxPlayers: settings.maxPlayers || 50,
        autoAdvance: settings.autoAdvance !== false,
        showExplanations: settings.showExplanations !== false,
        explanationTime: settings.explanationTime || 30,
        showLeaderboard: settings.showLeaderboard !== false,
        pointCalculation: settings.pointCalculation || 'time-bonus',
        streakBonus: settings.streakBonus !== false,
        showProgress: settings.showProgress !== false,
        showCorrectAnswer: settings.showCorrectAnswer !== false
      };

      // Listen for successful game creation
      socket.once('gameCreated', ({ gameCode, game, message }) => {
        clearTimeout(timeout);
        
        // Store game data and capabilities
        this.activeGame = game;
        this.capabilities = game.capabilities || {};
        
        console.log('🎮 Host Control Game Created:', {
          gameCode,
          gameId: game.id,
          capabilities: this.capabilities,
          hostControlEnabled: game.host_control_enabled
        });

        resolve({
          success: true,
          gameCode,
          game: {
            ...game,
            // Ensure capabilities are available
            capabilities: this.capabilities,
            hostControlEnabled: Boolean(game.host_control_enabled || this.capabilities.hostControl)
          },
          message: message || 'Game created successfully'
        });
      });

      // Listen for errors
      socket.once('error', ({ message, error }) => {
        clearTimeout(timeout);
        console.error('❌ Game creation failed:', { message, error });
        reject(new Error(message || 'Game creation failed'));
      });

      // Create game with enhanced settings
      console.log('🔄 Creating Phase 6 enhanced game...', {
        hostId,
        questionSetId,
        enhancedSettings
      });

      socket.emit('createGame', {
        hostId,
        questionSetId,
        settings: enhancedSettings
      });
    });
  }

  /**
   * Check if host control features are available for the current game
   */
  hasHostControlSupport() {
    return Boolean(
      this.activeGame?.host_control_enabled || 
      this.capabilities?.hostControl
    );
  }

  /**
   * Get available host control capabilities
   */
  getCapabilities() {
    return {
      hostControl: this.hasHostControlSupport(),
      playerManagement: this.capabilities?.playerManagement || this.hasHostControlSupport(),
      advancedSettings: this.capabilities?.advancedSettings || this.hasHostControlSupport(),
      realTimeUpdates: this.capabilities?.realTimeUpdates || this.hasHostControlSupport(),
      ...this.capabilities
    };
  }

  /**
   * Get current game data
   */
  getCurrentGame() {
    return this.activeGame;
  }

  /**
   * Clear active game data
   */
  clearActiveGame() {
    this.activeGame = null;
    this.capabilities = null;
  }

  /**
   * Enhanced game start with Phase 6 support
   */
  async startGame(gameCode) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Game start timeout'));
      }, 10000);

      socket.once('gameStarted', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      socket.once('error', ({ message }) => {
        clearTimeout(timeout);
        reject(new Error(message));
      });

      // Check if Phase 6 enhanced start is available
      if (this.hasHostControlSupport()) {
        console.log('🚀 Starting game with host control enhancements...');
        socket.emit('startGameEnhanced', { 
          gameCode,
          hostControlEnabled: true
        });
      } else {
        console.log('🚀 Starting game with legacy mode...');
        socket.emit('startGame', { gameCode });
      }
    });
  }
}

// Create singleton instance
const gameCreationBridge = new GameCreationBridge();

/**
 * React Hook for enhanced game creation
 */
export const useGameCreation = () => {
  const { user } = useAuth();

  const createGame = async (questionSetId, settings = {}) => {
    if (!user) {
      throw new Error('User must be authenticated to create games');
    }

    const hostId = `host_${user.id}`;
    
    try {
      const result = await gameCreationBridge.createGame({
        hostId,
        questionSetId,
        settings: {
          ...settings,
          fromQuestionSet: true
        }
      });

      return result;
    } catch (error) {
      console.error('Game creation failed:', error);
      throw error;
    }
  };

  const startGame = async (gameCode) => {
    try {
      return await gameCreationBridge.startGame(gameCode);
    } catch (error) {
      console.error('Game start failed:', error);
      throw error;
    }
  };

  const getGameCapabilities = () => {
    return gameCreationBridge.getCapabilities();
  };

  const hasHostControlSupport = () => {
    return gameCreationBridge.hasHostControlSupport();
  };

  const getCurrentGame = () => {
    return gameCreationBridge.getCurrentGame();
  };

  return {
    createGame,
    startGame,
    getGameCapabilities,
    hasHostControlSupport,
    getCurrentGame,
    clearActiveGame: () => gameCreationBridge.clearActiveGame()
  };
};

export default gameCreationBridge;
