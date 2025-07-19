import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import socket from "../socket"
import "./waitingRoom.css"

function WaitingRoom() {
  const location = useLocation()
  const navigate = useNavigate()
  const { name, room, initialPlayers = [] } = location.state || {}
  const [players, setPlayers] = useState(initialPlayers)

  useEffect(() => {
    if (!name || !room) {
      navigate("/join")
      return
    }

    // Set initial players if provided
    if (initialPlayers.length > 0) {
      setPlayers(initialPlayers)
    }

    // Listen for new players joining
    socket.on('player_joined', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers)
      console.log('Waiting room - players joined:', updatedPlayers)
    })

    // Listen for players leaving
    socket.on('player_left', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers)
      console.log('Waiting room - players updated:', updatedPlayers)
    })

    // Listen for game start
    socket.on('start_game', () => {
      navigate('/quiz', { state: { name, room } })
    })

    // Cleanup listeners
    return () => {
      socket.off('player_joined')
      socket.off('player_left')
      socket.off('start_game')
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
            <p>参加者: {players.filter(p => p.name !== 'HOST').length}人</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WaitingRoom