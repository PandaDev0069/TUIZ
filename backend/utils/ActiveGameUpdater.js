// ActiveGameUpdater.js
// A utility to help update activeGames from other modules

const logger = require('./logger');

class ActiveGameUpdater {
  constructor() {
    this.activeGamesRef = null;
  }

  // Set the reference to activeGames map from server.js
  setActiveGamesRef(activeGamesMap) {
    this.activeGamesRef = activeGamesMap;
    logger.debug('✅ ActiveGameUpdater: Set activeGames reference');
  }

  // Update all game settings for a specific game
  updateGameSettings(gameCode, newSettings) {
    if (!this.activeGamesRef) {
      console.warn('⚠️ ActiveGameUpdater: activeGames reference not set');
      return false;
    }

    const activeGame = this.activeGamesRef.get(gameCode);
    if (!activeGame) {
      console.warn(`⚠️ ActiveGameUpdater: Game ${gameCode} not found in activeGames`);
      return false;
    }

    // Ensure game_settings exists
    if (!activeGame.game_settings) {
      activeGame.game_settings = {};
    }

    // Update all settings
    activeGame.game_settings = {
      ...activeGame.game_settings,
      ...newSettings
    };

    logger.debug(`✅ ActiveGameUpdater: Updated game_settings for game ${gameCode}`, {
      updatedKeys: Object.keys(newSettings)
    });
    return true;
  }

  // Update maxPlayers in game_settings for a specific game (legacy method)
  updatePlayersCap(gameCode, newPlayersCap) {
    return this.updateGameSettings(gameCode, { maxPlayers: newPlayersCap });
  }

  // Get current maxPlayers for a game
  getPlayersCap(gameCode) {
    if (!this.activeGamesRef) {
      return null;
    }

    const activeGame = this.activeGamesRef.get(gameCode);
    return activeGame ? activeGame.game_settings?.maxPlayers : null;
  }
}

module.exports = new ActiveGameUpdater();
