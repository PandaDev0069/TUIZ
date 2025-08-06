import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import socket from "../socket"
import useQuestionPreload from "../hooks/useQuestionPreload"
import "./waitingRoom.css"

function WaitingRoom() {
  const location = useLocation()
  const navigate = useNavigate()
  const { name, room, initialPlayers = [] } = location.state || {}
  const [players, setPlayers] = useState(initialPlayers)

  // Use the preloading hook
  const {
    isPreloading,
    isComplete,
    hasError,
    error,
    progress,
    stats,
    questions
  } = useQuestionPreload(room, true); // true indicates this is waiting room

  useEffect(() => {
    if (!name || !room) {
      navigate("/join")
      return
    }

    console.log('🎮 WaitingRoom: Setting up socket listeners for', { name, room });
    console.log('🎮 WaitingRoom: Initial players:', initialPlayers);

    // Set initial players if provided
    if (initialPlayers.length > 0) {
      setPlayers(initialPlayers)
    }

    // Listen for successful join response
    socket.on('joinedGame', ({ gameCode, playerCount, gameStatus, player }) => {
      console.log('🎮 WaitingRoom: joinedGame event received:', { gameCode, playerCount, gameStatus, player });
      // Request current player list
      socket.emit('getPlayerList', { gameCode });
    })

    // Listen for player list response
    socket.on('playerList', ({ players }) => {
      console.log('🎮 WaitingRoom: playerList event received:', players);
      setPlayers(players);
    })

    // Listen for new players joining
    socket.on('playerJoined', ({ player, totalPlayers }) => {
      console.log('🎮 WaitingRoom: playerJoined event received:', { player, totalPlayers });
      // Add the new player to the list
      setPlayers(prev => {
        const updated = [...prev];
        // Check if player already exists
        const existingIndex = updated.findIndex(p => p.id === player.id);
        if (existingIndex >= 0) {
          updated[existingIndex] = player;
        } else {
          updated.push(player);
        }
        console.log('🎮 WaitingRoom: Updated players after join:', updated);
        return updated;
      });
    })

    // Listen for players disconnecting
    socket.on('playerDisconnected', ({ playerId, playerName, remainingPlayers }) => {
      console.log('🎮 WaitingRoom: playerDisconnected event received:', { playerId, playerName, remainingPlayers });
      setPlayers(prev => {
        const updated = prev.filter(p => p.id !== playerId);
        console.log('🎮 WaitingRoom: Updated players after disconnect:', updated);
        return updated;
      });
    })

    // Listen for game start
    socket.on('gameStarted', (data) => {
      console.log('🎮 WaitingRoom: Game started!', data)
      navigate('/quiz', { state: { name, room } })
    })

    // Cleanup listeners
    return () => {
      console.log('🎮 WaitingRoom: Cleaning up socket listeners');
      socket.off('joinedGame')
      socket.off('playerList')
      socket.off('playerJoined')
      socket.off('playerDisconnected')
      socket.off('gameStarted')
    }
  }, [name, room, navigate, initialPlayers])

  return (
    <div className="page-container">
      <div>
        <h1>こんにちは、{name}さん！</h1>
        <div className="room-code">
          ルームコード: <strong>{room}</strong>
        </div>
        <h2 className="waiting-message">
          ホストがクイズを開始するのを待っています...
        </h2>
        
        {/* Preloading Progress */}
        {isPreloading && (
          <div className="preload-section">
            <h3>📚 クイズの準備中...</h3>
            
            <div className="preload-progress">
              <div className="progress-item">
                <span className="progress-label">質問データ:</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress.questions}%` }}
                  ></div>
                </div>
                <span className="progress-percent">{progress.questions}%</span>
              </div>
              
              <div className="progress-item">
                <span className="progress-label">画像 ({stats.totalImages}枚):</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress.images}%` }}
                  ></div>
                </div>
                <span className="progress-percent">{progress.images}%</span>
              </div>
              
              <div className="progress-item overall">
                <span className="progress-label">全体の進行:</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress.overall}%` }}
                  ></div>
                </div>
                <span className="progress-percent">{progress.overall}%</span>
              </div>
            </div>

            {stats.totalImages > 0 && (
              <div className="preload-stats">
                <small>
                  画像: {stats.loadedImages}枚読み込み完了
                  {stats.failedImages > 0 && `, ${stats.failedImages}枚失敗`}
                </small>
              </div>
            )}
          </div>
        )}

        {/* Completion Status */}
        {isComplete && (
          <div className="preload-complete">
            <div className="complete-icon">✅</div>
            <p>クイズの準備が完了しました！</p>
            {questions.length > 0 && (
              <small>{questions.length}問の質問が読み込まれました</small>
            )}
          </div>
        )}

        {/* Error Handling */}
        {hasError && (
          <div className="preload-error">
            <div className="error-icon">⚠️</div>
            <p>準備中にエラーが発生しました</p>
            <small>{error}</small>
          </div>
        )}

        {/* Default Loading for Non-Preload State */}
        {!isPreloading && !isComplete && !hasError && (
          <div className="loading">⌛</div>
        )}
        
        {/* Players List */}
        <div className="players-list">
          <p>参加者: {players.filter(p => p.name !== 'HOST').length}人</p>
          {/* Debug info */}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            <details>
              <summary>デバッグ情報 (クリックして表示)</summary>
              <div style={{ marginTop: '5px' }}>
                <div>総プレイヤー数: {players.length}</div>
                <div>プレイヤーリスト: {JSON.stringify(players.map(p => p.name), null, 2)}</div>
                <div>ルーム: {room}</div>
                <div>プレイヤー名: {name}</div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaitingRoom