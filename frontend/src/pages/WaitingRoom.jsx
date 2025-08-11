import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { FaGamepad, FaBookOpen, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa'
import socket from "../socket"
import useQuestionPreload from "../hooks/useQuestionPreload"
import "./waitingRoom.css"

function WaitingRoom() {
  const location = useLocation()
  const navigate = useNavigate()
  const { name, room, initialPlayers = [], serverPlayerCount } = location.state || {}
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

    // Set initial players if provided
    if (initialPlayers.length > 0) {
      setPlayers(initialPlayers)
      
      // If we have a server player count that's higher than initial players,
      // request the complete player list immediately
      if (serverPlayerCount && serverPlayerCount > initialPlayers.length) {
        setTimeout(() => {
          socket.emit('getPlayerList', { gameCode: room });
        }, 100);
      }
    }

    // Listen for successful join response
    socket.on('joinedGame', ({ gameCode, playerCount, gameStatus, player }) => {
      // Add the current player to the players list if not already present
      setPlayers(prev => {
        // Always trust the server's playerCount
        const currentPlayerData = {
          id: player.id,
          name: player.name || name,
          score: player.score || 0,
          isAuthenticated: player.isAuthenticated || false,
          isHost: player.isHost || false,
          isConnected: true
        };
        
        // Check if current player is already in the list
        const currentPlayerExists = prev.some(p => p.id === player.id || p.name === player.name);
        
        if (currentPlayerExists) {
          // Update existing player data
          const updatedPlayers = prev.map(p => 
            (p.id === player.id || p.name === player.name) ? currentPlayerData : p
          );
          return updatedPlayers;
        } else {
          // Add new player
          const updatedPlayers = [...prev, currentPlayerData];
          return updatedPlayers;
        }
      });
      
      // Request complete player list for synchronization
      try {
        socket.emit('getPlayerList', { gameCode });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error requesting player list:', error);
        }
      }
    })

    // Listen for player list response
    socket.on('playerList', ({ players }) => {
      setPlayers(players);
    })

    // Listen for new players joining
    socket.on('playerJoined', ({ player, totalPlayers, allPlayers }) => {
      if (allPlayers && allPlayers.length > 0) {
        setPlayers(allPlayers);
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
          return updated;
        });
      }
    })

    // Listen for players disconnecting
    socket.on('playerDisconnected', ({ playerId, playerName, remainingPlayers, allPlayers }) => {
      if (allPlayers && allPlayers.length >= 0) {
        setPlayers(allPlayers);
      } else {
        // Fallback: Remove the disconnected player from existing list
        setPlayers(prev => {
          const updated = prev.filter(p => p.id !== playerId);
          return updated;
        });
      }
    })

    // Listen for game start
    socket.on('gameStarted', (data) => {
      navigate('/quiz', { state: { name, room } })
    })

    // Cleanup listeners
    return () => {
      if (import.meta.env.DEV) {
        console.log('WaitingRoom: Cleaning up socket listeners');
      }
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
            <h3>
              <FaBookOpen className="preload-icon" />
              クイズの準備中...
            </h3>
            
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
            <div className="complete-icon">
              <FaCheckCircle />
            </div>
            <p>クイズの準備が完了しました！</p>
            {questions.length > 0 && (
              <small>{questions.length}問の質問が読み込まれました</small>
            )}
          </div>
        )}

        {/* Error Handling */}
        {hasError && (
          <div className="preload-error">
            <div className="error-icon">
              <FaExclamationTriangle />
            </div>
            <p>準備中にエラーが発生しました</p>
            <small>{error}</small>
          </div>
        )}

        {/* Default Loading for Non-Preload State */}
        {!isPreloading && !isComplete && !hasError && (
          <div className="loading">
            <FaClock />
          </div>
        )}
        
        {/* Players List */}
        <div className="players-list">
          <p>参加者: {players.filter(p => p.name !== 'HOST').length}人</p>
        </div>
      </div>
    </div>
  )
}

export default WaitingRoom