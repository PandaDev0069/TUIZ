import React from 'react';
import MobileViewPort from './MobileViewPort';
import './HostGameRenderer.css';

/**
 * HostGameRenderer - Mobile viewport renderer for game content
 * Uses mobile dimensions for consistent display
 */
function HostGameRenderer({ gameState = {}, roomCode }) {
  return (
    <div className="host-game-renderer">
      <MobileViewPort className="host-game-renderer__viewport">
        <div className="host-game-renderer__canvas">
          {/* Game content will be rendered here */}
          <div className="host-game-renderer__placeholder">
            <h3>Game Screen</h3>
            <p>Room: {roomCode}</p>
            <p>Status: {gameState.status || 'waiting'}</p>
          </div>
        </div>
      </MobileViewPort>
    </div>
  );
}

export default HostGameRenderer;
