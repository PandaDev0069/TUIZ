import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from '../socket';
import './host.css';

function Host() {
  const [title, setTitle] = useState('')
  const navigate = useNavigate()

  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleCreateRoom = () => {
    if (!title) return
    const roomCode = generateRoomCode()
    socket.emit('create_room', { room: roomCode, title })
    navigate('/host/lobby', { state: { room: roomCode, title } })
  }

  return (
    <div className="page-container">
      <h1>TUIZ情報王</h1>
      <h2>ホスト画面</h2>
      <div className="host-card">
        <p>クイズのタイトルを入力してください。</p>

        <input
          className="input"
          type="text"
          placeholder="クイズのタイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        
        <button className="button" onClick={handleCreateRoom}>作成</button>
      </div>
    </div>
  )
}

export default Host