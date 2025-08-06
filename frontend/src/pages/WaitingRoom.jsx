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
      
      // Immediately update player count for the new player joining
      console.log('🎮 WaitingRoom: New player joined - immediately updating player count to:', playerCount);
      
      // Add the current player to the players list if not already present
      setPlayers(prev => {
        // Check if current player is already in the list
        const currentPlayerExists = prev.some(p => p.id === player.id || p.name === player.name);
        
        if (!currentPlayerExists) {
          const updatedPlayers = [...prev, {
            id: player.id,
            name: player.name || name,
            score: player.score || 0,
            isAuthenticated: player.isAuthenticated || false,
            isHost: player.isHost || false,
            isConnected: true
          }];
          console.log('🎮 WaitingRoom: Added current player to list. Total players:', updatedPlayers.length);
          return updatedPlayers;
        } else {
          console.log('🎮 WaitingRoom: Current player already in list. Total players:', prev.length);
          return prev;
        }
      });
      
      // Request latest player list to ensure we have everyone
      console.log('🎮 WaitingRoom: Requesting complete player list for synchronization');
      socket.emit('getPlayerList', { gameCode });
    })

    // Listen for player list response
    socket.on('playerList', ({ players }) => {
      console.log('🎮 WaitingRoom: playerList event received:', players);
      // Replace the entire player list with the authoritative list from server
      setPlayers(players);
    })

    // Listen for new players joining
    socket.on('playerJoined', ({ player, totalPlayers, allPlayers }) => {
      console.log('🎮 WaitingRoom: playerJoined event received:', { player, totalPlayers, allPlayers });
      
      if (allPlayers && allPlayers.length > 0) {
        // Use the complete player list from the server for consistency
        console.log('🎮 WaitingRoom: Updating with complete player list from server:', allPlayers);
        setPlayers(allPlayers);
        
        // Special case: If the joining player is the current user, ensure immediate UI update
        if (player.name === name) {
          console.log('🎮 WaitingRoom: Current user joined - ensuring immediate count update to:', allPlayers.length);
        }
      } else {
        // Fallback: Add the new player to the existing list
        setPlayers(prev => {
          const updated = [...prev];
          // Check if player already exists
          const existingIndex = updated.findIndex(p => p.id === player.id);
          if (existingIndex >= 0) {
            updated[existingIndex] = player;
          } else {
            updated.push(player);
          }
          console.log('🎮 WaitingRoom: Updated players after join (fallback):', updated);
          return updated;
        });
      }
    })

    // Listen for players disconnecting
    socket.on('playerDisconnected', ({ playerId, playerName, remainingPlayers, allPlayers }) => {
      console.log('🎮 WaitingRoom: playerDisconnected event received:', { playerId, playerName, remainingPlayers, allPlayers });
      
      if (allPlayers && allPlayers.length >= 0) {
        // Use the complete updated player list from the server
        console.log('🎮 WaitingRoom: Updating with complete player list after disconnect:', allPlayers);
        setPlayers(allPlayers);
      } else {
        // Fallback: Remove the disconnected player from existing list
        setPlayers(prev => {
          const updated = prev.filter(p => p.id !== playerId);
          console.log('🎮 WaitingRoom: Updated players after disconnect (fallback):', updated);
          return updated;
        });
      }
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