import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import socket from '../socket'
import './hostLobby.css'

function HostLobby() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { room, title } = state || {}
  const [players, setPlayers] = useState([])

  useEffect(() => {
    if (!room || !title) {
      navigate('/host')
      return
    }

    // Join the room as host
    socket.emit('joinRoom', { name: 'HOST', room })

    // Listen for successful join to get initial player list
    socket.once('joined_successfully', ({ players: initialPlayers }) => {
      setPlayers(initialPlayers.filter(p => p.name !== 'HOST').map(p => p.name))
    })

    // Listen for new players joining
    socket.on('player_joined', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers.filter(p => p.name !== 'HOST').map(p => p.name))
    })

    // Listen for players leaving
    socket.on('player_left', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers.filter(p => p.name !== 'HOST').map(p => p.name))
    })

    return () => {
      socket.off('joined_successfully')
      socket.off('player_joined')
      socket.off('player_left')
    }
  }, [room, title, navigate])

  const handleStart = () => {
    socket.emit('start_game', { room });
    navigate('/quiz/control', { state: { room, title } });
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
            <h3>接続中のプレイヤー</h3>
            <span className="player-count">{players.length}人参加中</span>
          </div>
          <div className="terminal-window">
            <div className="terminal-content">
              {players.map((name, i) => (
                <div key={i} className="terminal-line">
                  <span className="prefix">{'>'}</span>
                  <span className="player-name">{name}</span>
                  <span className="joined-text">が参加しました</span>
                </div>
              ))}
            </div>
          </div>
          <button className="button start-button" onClick={handleStart}>
            クイズを開始する
          </button>
        </div>
      </div>
    </div>
  )
}

export default HostLobby;
