import React from 'react';
import HostGameRenderer from './HostGameRenderer';
import './GameOverview.css';

/**
 * GameOverview - Mobile viewport game overview
 * Compact layout for dashboard integration
 */
function GameOverview({ gameState = {}, players = [], roomCode, onTimerAdjust }) {
  return (
    <div className="game-overview game-overview--mobile">
      <div className="game-overview__header">
        <h3 className="game-overview__title">Game Preview</h3>
        <div className="game-overview__room-info">
          Room: <strong>{roomCode}</strong>
        </div>
      </div>
      
      <div className="game-overview__content">
        <HostGameRenderer 
          gameState={gameState} 
          roomCode={roomCode}
        />
      </div>
    </div>
  );
}

export default GameOverview;
