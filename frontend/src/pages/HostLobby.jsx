import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import socket from '../socket'
import GameSettingsPanel from '../components/GameSettingsPanel'
import { FaRocket } from 'react-icons/fa'
import './hostLobby.css'

function HostLobby() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { room, title, gameId, questionSetId } = state || {}
  const [players, setPlayers] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [playerAnimations, setPlayerAnimations] = useState(new Set())
  const [leftLogs, setLeftLogs] = useState([])

  // Debug logging - only in development
  if (import.meta.env.DEV) {
    console.log('HostLobby state:', state);
    console.log('HostLobby questionSetId:', questionSetId);
  }

  useEffect(() => {
    if (!room || !title) {
      navigate('/dashboard')
      return
    }

  // Listen for new players joining the game
    socket.on('playerJoined', ({ player, totalPlayers }) => {
      if (import.meta.env.DEV) {
        console.log('New player joined:', player);
      }
      // Get updated player list from the game
      setPlayers(prev => {
        const updated = [...prev, player.name];
        if (import.meta.env.DEV) {
          console.log('Host lobby - players updated:', updated);
        }
        
        // Add animation for new player
        setPlayerAnimations(prevAnimations => {
          const newAnimations = new Set(prevAnimations);
          newAnimations.add(player.name);
          // Remove animation after animation completes
          setTimeout(() => {
            setPlayerAnimations(current => {
              const next = new Set(current);
              next.delete(player.name);
              return next;
            });
          }, 600);
          return newAnimations;
        });
        
        return updated;
      });
    });

    // Listen for player disconnects and log a terminal line
    socket.on('playerDisconnected', ({ playerName, allPlayers }) => {
      if (import.meta.env.DEV) {
        console.log('Player disconnected:', playerName);
      }

      // Update players list from payload if available; otherwise filter locally
      if (Array.isArray(allPlayers)) {
        setPlayers(allPlayers.map(p => p.name));
      } else {
        setPlayers(prev => prev.filter(name => name !== playerName));
      }

      // Append a leave log entry for the terminal
      setLeftLogs(prev => [
        ...prev,
        { name: playerName, time: new Date().toISOString() }
      ]);
    });

    return () => {
  socket.off('playerJoined');
  socket.off('playerDisconnected');
    }
  }, [room, title, navigate])

  const handleStart = () => {
    socket.emit('startGame', { gameCode: room });
    // Navigate to new Phase 6 host dashboard instead of old quiz control
    navigate('/host/dashboard', { 
      state: { 
        room, 
        title, 
        gameId,
        questionSetId,
        players: players.length
      } 
    });
  }

  const handleOpenSettings = () => {
    if (!questionSetId) {
      if (import.meta.env.DEV) {
        console.error('No questionSetId available for settings');
      }
      alert('設定を開けません: 問題セットIDが見つかりません');
      return;
    }
    setShowSettings(true);
  }

  const handleCloseSettings = () => {
    setShowSettings(false);
  }

  return (
    <div className="host-lobby-page">
      <div className="host-lobby-container">
        {/* Header Section with Room Code */}
        <div className="host-lobby-header">
          <div className="host-room-code-card">
            <div className="host-room-code-card__header">
              <h1 className="host-room-code-card__title">🎮 クイズの準備完了！</h1>
              <h2 className="host-room-code-card__subtitle">{title}</h2>
            </div>
            <div className="host-room-code-card__content">
              <div className="host-room-code-display">
                <div className="host-room-code-display__label">ルームコード</div>
                <div className="host-room-code-display__code">{room}</div>
                <div className="host-room-code-display__hint">
                  プレイヤーにこのコードを伝えてください
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="host-lobby-content">
          {/* Players Panel */}
          <div className="host-players-panel">
            <div className="host-players-card">
              <div className="host-players-card__header">
                <div className="host-players-card__title-section">
                  <h3 className="host-players-card__title">👥 接続中のプレイヤー</h3>
                  <div className="host-player-count-badge">
                    <span className="host-player-count-badge__number">{players.length}</span>
                    <span className="host-player-count-badge__text">人参加中</span>
                  </div>
                </div>
                <button 
                  className="host-button host-button--small host-button--outline" 
                  onClick={handleOpenSettings}
                  title="ゲーム設定"
                >
                  ⚙️ 設定
                </button>
              </div>

              <div className="host-players-card__content">
                <div className="host-terminal-window">
                  <div className="host-terminal-window__header">
                    <div className="host-terminal-window__controls">
                      <span className="host-terminal-window__control host-terminal-window__control--close"></span>
                      <span className="host-terminal-window__control host-terminal-window__control--minimize"></span>
                      <span className="host-terminal-window__control host-terminal-window__control--maximize"></span>
                    </div>
                    <div className="host-terminal-window__title">TUIZ_LOBBY.exe</div>
                  </div>
                  <div className="host-terminal-window__content">
                    {players.length === 0 ? (
                      <div className="host-terminal-empty">
                        <div className="host-terminal-empty__icon">⏳</div>
                        <div className="host-terminal-empty__text">プレイヤーの参加を待っています...</div>
                        <div className="host-terminal-empty__hint">
                          ルームコード <strong>{room}</strong> を共有してください
                        </div>
                      </div>
                    ) : (
                      <div className="host-terminal-content">
                        {players.map((name, i) => (
                          <div 
                            key={`join-${i}`} 
                            className={`host-terminal-line ${
                              playerAnimations.has(name) ? 'host-terminal-line--new' : ''
                            }`}
                          >
                            <span className="host-terminal-line__prefix">$</span>
                            <span className="host-terminal-line__command">player_join</span>
                            <span className="host-terminal-line__player">{name}</span>
                            <span className="host-terminal-line__status">connected</span>
                            <span className="host-terminal-line__time">
                              {new Date().toLocaleTimeString('ja-JP', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                second: '2-digit' 
                              })}
                            </span>
                          </div>
                        ))}

                        {leftLogs.map((log, i) => (
                          <div
                            key={`left-${i}`}
                            className="host-terminal-line host-terminal-line--left"
                          >
                            <span className="host-terminal-line__prefix">$</span>
                            <span className="host-terminal-line__command host-terminal-line__command--left">player_left</span>
                            <span className="host-terminal-line__player">{log.name}</span>
                            <span className="host-terminal-line__status host-terminal-line__status--left">disconnected</span>
                            <span className="host-terminal-line__time">
                              {new Date(log.time).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="host-players-card__footer">
                <div className="host-lobby-actions">
                  <button 
                    className="host-button host-button--large host-button--primary"
                    onClick={handleStart}
                    disabled={players.length === 0}
                  >
                    {players.length === 0 ? (
                      <>⏳ プレイヤーを待機中</>
                    ) : (
                      <><FaRocket className="host-button__icon" /> クイズを開始する ({players.length}人)</>
                    )}
                  </button>
                  
                  {players.length > 0 && (
                    <div className="host-lobby-actions__hint">
                      💡 参加者が全員揃ったらクイズを開始しましょう
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Host Tips Panel */}
          <div className="host-tips-panel">
            <div className="host-tips-card">
              <div className="host-tips-card__header">
                <h3 className="host-tips-card__title">💡 ホストのヒント</h3>
              </div>
              <div className="host-tips-card__content">
                <div className="host-tip">
                  <div className="host-tip__icon">🎯</div>
                  <div className="host-tip__content">
                    <strong>プレイヤー参加</strong>
                    <p>ルームコード <span className="host-tip__code">{room}</span> を共有してプレイヤーを招待</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">⚙️</div>
                  <div className="host-tip__content">
                    <strong>ゲーム設定</strong>
                    <p>設定ボタンから制限時間や得点システムをカスタマイズ</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">🏆</div>
                  <div className="host-tip__content">
                    <strong>ベストな人数</strong>
                    <p>2-20人程度がおすすめ。参加者が揃ったら開始しましょう</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">📱</div>
                  <div className="host-tip__content">
                    <strong>クロスプラットフォーム</strong>
                    <p>PC・スマホ・タブレットから誰でも参加可能</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Info Panel */}
            <div className="host-game-info-card">
              <div className="host-game-info-card__header">
                <h3 className="host-game-info-card__title">📊 ゲーム情報</h3>
              </div>
              <div className="host-game-info-card__content">
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">🎮</div>
                  <div className="host-game-info__stat-content">
                    <span className="host-game-info__stat-label">ゲームID</span>
                    <span className="host-game-info__stat-value">{gameId || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">📚</div>
                  <div className="host-game-info__stat-content">
                    <span className="host-game-info__stat-label">問題セット</span>
                    <span className="host-game-info__stat-value">{questionSetId || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">⏱️</div>
                  <div className="host-game-info__stat-content">
                    <span className="host-game-info__stat-label">待機時間</span>
                    <span className="host-game-info__stat-value">
                      {(() => {
                        const startTime = new Date();
                        return startTime.toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      })()}〜
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel Modal */}
      {showSettings && questionSetId && (
        <div className="host-settings-overlay">
          <GameSettingsPanel 
            questionSetId={questionSetId}
            gameId={gameId}
            onClose={handleCloseSettings}
          />
        </div>
      )}
    </div>
  )
}

export default HostLobby;
