import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { FaGamepad, FaBookOpen, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa'
import socket from "../socket"
import useQuestionPreload from "../hooks/useQuestionPreload"
// New player universal styles (BEM)
import "../styles/player/player-components.css"
import "../styles/player/player-animations.css"
import "../styles/player/waiting-room.css"

function WaitingRoom() {
  const location = useLocation()
  const navigate = useNavigate()
  const { name, room, initialPlayers = [], serverPlayerCount } = location.state || {}
  const [players, setPlayers] = useState(initialPlayers)
  const [currentPlayerId, setCurrentPlayerId] = useState(null)
  const [kicked, setKicked] = useState(false)
  const [kickedInfo, setKickedInfo] = useState({ reason: '', kickedAt: null, banDuration: 0 })
  const [rejoinRequested, setRejoinRequested] = useState(false)
  const [now, setNow] = useState(Date.now())

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
    // Track current player id for future actions
    setCurrentPlayerId(player.id)
      
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

    // Listen for being kicked by host
    socket.on('player:kicked', ({ gameId, reason, kickedAt, banDuration, message }) => {
      setKicked(true)
      setKickedInfo({ reason: reason || 'host_decision', kickedAt: kickedAt || new Date().toISOString(), banDuration: banDuration || 0 })
    })

    // Optional future: host allowed rejoin
    socket.on('player:rejoin:allowed', ({ gameId }) => {
      setKicked(false)
      setRejoinRequested(false)
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
      socket.off('player:kicked')
      socket.off('player:rejoin:allowed')
    }
  }, [name, room, navigate, initialPlayers])

  // Countdown for ban end
  useEffect(() => {
    if (!kicked) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [kicked])

  const banEndsAt = useMemo(() => {
    if (!kickedInfo.kickedAt || !kickedInfo.banDuration) return null
    const start = new Date(kickedInfo.kickedAt).getTime()
    return start + kickedInfo.banDuration
  }, [kickedInfo])

  const remaining = useMemo(() => {
    if (!banEndsAt) return 0
    return Math.max(0, Math.ceil((banEndsAt - now) / 1000))
  }, [banEndsAt, now])

  const requestRejoin = () => {
    try {
      // Placeholder event for future backend; harmless if unhandled
      socket.emit('player:rejoin:request', { gameCode: room, playerId: currentPlayerId, name })
      setRejoinRequested(true)
    } catch (e) {
      setRejoinRequested(true)
    }
  }

  const goBackToJoin = () => {
    navigate('/join', { state: { name, room } })
  }

  return (
    <div className="player-page waiting-room" role="region" aria-live="polite">
      <div className="player-card tuiz-animate-entrance">
        <h1 className="player-card__title">こんにちは、{name}さん！</h1>
        {kicked ? (
          <div className="preload-error tuiz-animate-fade-in" role="alert" style={{ marginTop: '12px' }}>
            <div className="preload-error__icon">
              <FaExclamationTriangle />
            </div>
            <p>ホストによりルームから退出させられました。</p>
            {kickedInfo.reason && <small>理由: {kickedInfo.reason}</small>}
            {kickedInfo.banDuration > 0 && (
              <small style={{ display: 'block', marginTop: 8 }}>再参加まで: {remaining}s</small>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
              <button className="player-btn" onClick={requestRejoin} disabled={rejoinRequested} aria-disabled={rejoinRequested}>
                {rejoinRequested ? '再参加リクエスト済み' : '再参加をリクエスト'}
              </button>
              <button className="player-btn" onClick={goBackToJoin}>参加画面へ戻る</button>
              {(!kickedInfo.banDuration || remaining === 0) && (
                <button className="player-btn" onClick={goBackToJoin}>再参加を試す</button>
              )}
            </div>
          </div>
  ) : (
  <>
  <div className="player-pill" aria-label="room code">
          ルームコード: <strong className="player-pill__code" aria-live="polite">{room}</strong>
        </div>
        <h2 className="waiting tuiz-animate-fade-in">
          ホストがクイズを開始するのを待っています...
        </h2>
        
        {/* Preloading Progress */}
        {isPreloading && (
          <div className="preload tuiz-animate-fade-in" role="status" aria-label="preloading quiz">
            <h3 className="preload__title">
              <FaBookOpen className="anim-pulse" />
              クイズの準備中...
            </h3>
            <div className="preload__progress">
              <div className="preload__row">
                <span className="preload__label">質問データ:</span>
                <div className="preload__bar" aria-hidden="true">
                  <div className="preload__fill" style={{ width: `${progress.questions}%` }}></div>
                </div>
                <span className="preload__percent" aria-live="polite">{progress.questions}%</span>
              </div>
              <div className="preload__row">
                <span className="preload__label">画像 ({stats.totalImages}枚):</span>
                <div className="preload__bar" aria-hidden="true">
                  <div className="preload__fill" style={{ width: `${progress.images}%` }}></div>
                </div>
                <span className="preload__percent" aria-live="polite">{progress.images}%</span>
              </div>
              <div className="preload__row preload__row--overall">
                <span className="preload__label">全体の進行:</span>
                <div className="preload__bar" aria-hidden="true">
                  <div className="preload__fill" style={{ width: `${progress.overall}%` }}></div>
                </div>
                <span className="preload__percent" aria-live="polite">{progress.overall}%</span>
              </div>
            </div>
            {stats.totalImages > 0 && (
              <div className="preload__stats">
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
          <div className="preload-complete tuiz-animate-scale-in" role="status">
            <div className="preload-complete__icon">
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
          <div className="preload-error tuiz-animate-fade-in" role="alert">
            <div className="preload-error__icon">
              <FaExclamationTriangle />
            </div>
            <p>準備中にエラーが発生しました</p>
            <small>{error}</small>
          </div>
        )}

        {/* Default Loading for Non-Preload State */}
        {!isPreloading && !isComplete && !hasError && (
          <div className="player-loading anim-bounce-in" aria-live="polite">
            <FaClock />
          </div>
        )}
        
        {/* Players List */}
  <div className="player-roster" aria-live="polite">
          <p>参加者: {players.filter(p => p.name !== 'HOST').length}人</p>
        </div>
  </>
  )}
      </div>
    </div>
  )
}

export default WaitingRoom