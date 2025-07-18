import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import socket from "../socket"
import "./waitingRoom.css"

function WaitingRoom() {
  const location = useLocation()
  const navigate = useNavigate()
  const { name, room } = location.state || {}
  const [players, setPlayers] = useState([])

  useEffect(() => {
    if (!name || !room) {
      navigate("/join")
      return
    }

    // Listen for new players joining
    socket.on('player_joined', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers)
    })

    // Listen for players leaving
    socket.on('player_left', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers)
    })

    // Cleanup listeners
    return () => {
      socket.off('player_joined')
      socket.off('player_left')
    }
  }, [name, room, navigate])

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
        <div className="loading">⌛</div>
        {players.length > 0 && (
          <div className="players-list">
            <p>参加者: {players.length}人</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WaitingRoom