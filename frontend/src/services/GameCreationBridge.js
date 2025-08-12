import socket from '../socket';
import { useAuth } from '../contexts/AuthContext';

/**
 * Enhanced Game Creation Bridge for Phase 6 Integration
 * This service bridges the existing socket-based game creation
 * with the new Phase 6 host control system
 */
class GameCreationBridge {
  constructor() {
    this.activeGame = null;
    this.capabilities = null;
  }

  /**
   * Create a game using the enhanced Phase 6 system
   * Maintains backwards compatibility with existing socket flow
   */
  async createGame({ hostId, questionSetId, settings = {} }) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Game creation timeout - please try again'));
      }, 15000);

      // Enhanced settings for Phase 6 compatibility
      const enhancedSettings = {
        ...settings,
        // Enable Phase 6 features
        hostControl: {
          pauseEnabled: true,
          skipEnabled: true,
          emergencyStopEnabled: true,
          timerControl: true,
          playerManagement: true,
          ...settings.hostControl
        },
        // Advanced game flow
        timeLimit: settings.timeLimit || 30,
        pointsPerQuestion: settings.pointsPerQuestion || 10,
        bonusPoints: settings.bonusPoints || 5,
        allowLateJoin: settings.allowLateJoin !== false,
        showLeaderboard: settings.showLeaderboard !== false,
        // Request Phase 6 capabilities
        requestPhase6: true
      };

      // Listen for successful game creation
      socket.once('gameCreated', ({ gameCode, game, message }) => {
        clearTimeout(timeout);
        
        // Store game data and capabilities
        this.activeGame = game;
        this.capabilities = game.capabilities || {};
        
        console.log('🎮 Phase 6 Game Created:', {
          gameCode,
          gameId: game.id,
          capabilities: this.capabilities,
          hostControlEnabled: game.host_control_enabled,
          phase6Enabled: game.phase6_enabled
        });

        resolve({
          success: true,
          gameCode,
          game: {
            ...game,
            // Ensure capabilities are available
            capabilities: this.capabilities,
            hostControlEnabled: Boolean(game.host_control_enabled || this.capabilities.hostControl),
            phase6Enabled: Boolean(game.phase6_enabled || this.capabilities.hostControl)
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
   * Check if Phase 6 features are available for the current game
   */
  hasPhase6Support() {
    return Boolean(
      this.activeGame?.phase6_enabled || 
      this.activeGame?.host_control_enabled || 
      this.capabilities?.hostControl
    );
  }

  /**
   * Get available Phase 6 capabilities
   */
  getCapabilities() {
    return {
      hostControl: this.hasPhase6Support(),
      playerManagement: this.capabilities?.playerManagement || this.hasPhase6Support(),
      advancedSettings: this.capabilities?.advancedSettings || this.hasPhase6Support(),
      realTimeUpdates: this.capabilities?.realTimeUpdates || this.hasPhase6Support(),
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
      if (this.hasPhase6Support()) {
        console.log('🚀 Starting game with Phase 6 enhancements...');
        socket.emit('startGameEnhanced', { 
          gameCode,
          phase6Enabled: true,
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

  const hasPhase6Support = () => {
    return gameCreationBridge.hasPhase6Support();
  };

  const getCurrentGame = () => {
    return gameCreationBridge.getCurrentGame();
  };

  return {
    createGame,
    startGame,
    getGameCapabilities,
    hasPhase6Support,
    getCurrentGame,
    clearActiveGame: () => gameCreationBridge.clearActiveGame()
  };
};

export default gameCreationBridge;
