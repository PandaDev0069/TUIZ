import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import socket from '../socket'
import GameSettingsPanel from '../components/GameSettingsPanel'
import './hostLobby.css'

function HostLobby() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { room, title, gameId, questionSetId } = state || {}
  const [players, setPlayers] = useState([])
  const [showSettings, setShowSettings] = useState(false)

  // Debug logging
  console.log('HostLobby state:', state);
  console.log('HostLobby questionSetId:', questionSetId);

  useEffect(() => {
    if (!room || !title) {
      navigate('/host')
      return
    }

    // Listen for new players joining the game
    socket.on('playerJoined', ({ player, totalPlayers }) => {
      console.log('New player joined:', player);
      // Get updated player list from the game
      setPlayers(prev => {
        const updated = [...prev, player.name];
        console.log('Host lobby - players updated:', updated);
        return updated;
      });
    });

    return () => {
      socket.off('playerJoined');
    }
  }, [room, title, navigate])

  const handleStart = () => {
    socket.emit('startGame', { gameCode: room });
    navigate('/quiz/control', { state: { room, title } });
  }

  const handleOpenSettings = () => {
    if (!questionSetId) {
      console.error('No questionSetId available for settings');
      alert('設定を開けません: 問題セットIDが見つかりません');
      return;
    }
    setShowSettings(true);
  }

  const handleCloseSettings = () => {
    setShowSettings(false);
  }

  return (
    <div className="page-container">
      <div className="lobby-layout">
        {/* Top card with room code */}
        <div className="host-lobby-card code-card">
          <h1>クイズの準備完了！</h1>
          <h2>{title}</h2>
          <div className="room-code-display">
            {room}
          </div>
        </div>

        {/* Terminal-style player list card */}
        <div className="host-lobby-card terminal-card">
          <div className="terminal-header">
            <div className="terminal-header-left">
              <h3>接続中のプレイヤー</h3>
              <span className="player-count">{players.length}人参加中</span>
            </div>
            <div className="terminal-header-right">
              <button 
                className="button settings-button-header" 
                onClick={handleOpenSettings}
                title="ゲーム設定"
              >
                ⚙️ 設定
              </button>
            </div>
          </div>
          <div className="terminal-window">
            <div className="terminal-content">
              {players.map((name, i) => (
                <div key={i} className="terminal-line">
                  <span className="prefix">{'>'}</span>
                  <span className="joined-player-name">{name}</span>
                  <span className="joined-text">が参加しました</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lobby-actions">
            <button className="button start-button" onClick={handleStart}>
              クイズを開始する
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && questionSetId && (
        <GameSettingsPanel 
          questionSetId={questionSetId}
          onClose={handleCloseSettings}
        />
      )}
    </div>
  )
}

export default HostLobby;
