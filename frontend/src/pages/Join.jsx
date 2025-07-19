import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from '../socket';
import './join.css';

function Join() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Socket connected:', socket.connected);
    
    socket.on('join_error', ({ message }) => {
      setError(message);
    });
    
    return () => {
      socket.off('joined_successfully');
      socket.off('join_error');
    };
  }, []);

  const handleJoin = () => {
    if (!name || !room) {
      setError("名前とルームコードを入力してください。");
      return;
    }
    
    setError("");
    console.log('Attempting to join room:', room, 'with name:', name);
    
    // Set up listener before emitting
    socket.once('joined_successfully', ({ players }) => {
      console.log('Join successful! Players in room:', players);
      navigate('/waiting', { state: { name, room, initialPlayers: players } });
    });
    
    socket.emit('joinRoom', { name, room });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <div className="page-container">
      <div className="card">
        <h1>TUIZ情報王</h1>
        <p>名前とルームコードを入力ください。</p>

        <div className="input-group">
          <input
            className="input"
            type="text"
            placeholder="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            maxLength={20}
          />

          <input
            className="input"
            type="text"
            placeholder="ルームコード"
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            maxLength={6}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button className="button" onClick={handleJoin}>参加する</button>
      </div>
    </div>
  );
}

export default Join;