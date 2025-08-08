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

  // Update maxPlayers in game_settings for a specific game
  updatePlayersCap(gameCode, newPlayersCap) {
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

    const oldCap = activeGame.game_settings.maxPlayers;
    activeGame.game_settings.maxPlayers = newPlayersCap;
    logger.debug(`✅ ActiveGameUpdater: Updated game_settings.maxPlayers for game ${gameCode}: ${oldCap} → ${newPlayersCap}`);
    return true;
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
