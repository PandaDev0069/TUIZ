import { useState, useEffect } from 'react';
import { 
  FaCog,
  FaGamepad,
  FaChartBar,
  FaListUl,
  FaExpand,
  FaCompress
} from 'react-icons/fa';
import GameControlPanel from './GameControlPanel';
import SettingsManagement from './SettingsManagement';
import socket from '../../../socket';
import './ControlPanelContainer.css';

/**
 * ControlPanelContainer - Main container for Phase 2.2 Control Panel
 * Phase 2.2: Game Control Panel
 * 
 * Features:
 * - Tabbed interface for control panels
 * - Full-screen mode toggle
 * - Real-time synchronization
 * - Responsive layout management
 */
function ControlPanelContainer({ gameState, onGameStateChange, players = [], questions = [] }) {
  // UI State
  const [activeTab, setActiveTab] = useState('controls');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState({});
  
  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isGameActive, setIsGameActive] = useState(false);

  // Initialize
  useEffect(() => {
    if (gameState) {
      setIsGameActive(['active', 'paused'].includes(gameState.status));
      setCurrentQuestion(questions[gameState.currentQuestionIndex] || null);
    }
  }, [gameState, questions]);

  // Socket handlers
  useEffect(() => {
    socket.on('gameStateChanged', handleGameStateChange);
    socket.on('settingsUpdated', handleSettingsUpdated);
    
    return () => {
      socket.off('gameStateChanged');
      socket.off('settingsUpdated');
    };
  }, []);

  const handleGameStateChange = (newState) => {
    if (onGameStateChange) {
      onGameStateChange(newState);
    }
  };

  const handleSettingsUpdated = (newSettings) => {
    setSettings(newSettings);
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    socket.emit('updateGameSettings', {
      gameId: gameState?.id,
      settings: newSettings
    });
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const tabs = [
    {
      id: 'controls',
      label: 'ゲーム制御',
      icon: FaGamepad,
      component: (
        <GameControlPanel
          gameState={gameState}
          onGameAction={handleGameStateChange}
          questions={questions}
          socket={socket}
          isGameActive={isGameActive}
        />
      )
    },
    {
      id: 'settings',
      label: '設定管理',
      icon: FaCog,
      component: (
        <SettingsManagement
          gameState={gameState}
          onSettingsChange={handleSettingsChange}
          currentSettings={settings}
        />
      )
    }
  ];

  return (
    <div className={`control-panel-container ${isFullscreen ? 'control-panel-container--fullscreen' : ''}`}>
      {/* Header */}
      <div className="control-panel-container__header">
        <div className="control-panel-header__left">
          <h2 className="control-panel-title">
            <FaChartBar className="control-panel-title__icon" />
            ゲーム制御パネル
          </h2>
          
          {gameState && (
            <div className="control-panel-status">
              <span className={`status-badge status-badge--${gameState.status}`}>
                {gameState.status === 'active' && '進行中'}
                {gameState.status === 'paused' && '一時停止'}
                {gameState.status === 'waiting' && '待機中'}
                {gameState.status === 'finished' && '終了'}
              </span>
              <span className="status-info">
                ルーム: {gameState.roomCode} | プレイヤー: {players.length}
              </span>
            </div>
          )}
        </div>

        <div className="control-panel-header__right">
          <button
            className="control-panel-btn control-panel-btn--icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? '全画面を終了' : '全画面表示'}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="control-panel-tabs">
        <div className="control-panel-tabs__nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`control-panel-tab ${activeTab === tab.id ? 'control-panel-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="control-panel-tab__icon" />
              <span className="control-panel-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="control-panel-tabs__indicator">
          <div 
            className="control-panel-tabs__slider"
            style={{
              transform: `translateX(${tabs.findIndex(t => t.id === activeTab) * 100}%)`
            }}
          ></div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="control-panel-content">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}

export default ControlPanelContainer;
