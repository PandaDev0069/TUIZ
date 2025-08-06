// ActiveGameUpdater.js
// A utility to help update activeGames from other modules

class ActiveGameUpdater {
  constructor() {
    this.activeGamesRef = null;
  }

  // Set the reference to activeGames map from server.js
  setActiveGamesRef(activeGamesMap) {
    this.activeGamesRef = activeGamesMap;
    console.log('✅ ActiveGameUpdater: Set activeGames reference');
  }

  // Update players_cap for a specific game
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

    const oldCap = activeGame.players_cap;
    activeGame.players_cap = newPlayersCap;
    console.log(`✅ ActiveGameUpdater: Updated players_cap for game ${gameCode}: ${oldCap} → ${newPlayersCap}`);
    return true;
  }

  // Get current players_cap for a game
  getPlayersCap(gameCode) {
    if (!this.activeGamesRef) {
      return null;
    }

    const activeGame = this.activeGamesRef.get(gameCode);
    return activeGame ? activeGame.players_cap : null;
  }
}

module.exports = new ActiveGameUpdater();
