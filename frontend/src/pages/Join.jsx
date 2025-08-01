import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import socket from '../socket';
import './join.css';

function Join() {
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Auto-fill name for authenticated users
  useEffect(() => {
    if (isAuthenticated && user?.name) {
      setName(user.name);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    console.log('Socket connected:', socket.connected);
    
    socket.on('error', ({ message }) => {
      setError(message);
    });
    
    return () => {
      socket.off('gameJoined');
      socket.off('error');
    };
  }, []);

  const handleJoin = () => {
    if (!name || !room) {
      setError("名前とルームコードを入力してください。");
      return;
    }
    
    setError("");
    console.log('Attempting to join game:', room, 'with name:', name);
    
    // Set up listener before emitting
    socket.once('joinedGame', ({ gameCode, playerCount, gameStatus, player }) => {
      console.log('Join successful! Game:', gameCode, 'Player:', player);
      navigate('/waiting', { state: { name, room: gameCode, initialPlayers: [player] } });
    });
    
    // Send user authentication info if available
    const joinData = {
      playerName: name,
      gameCode: room,
      isAuthenticated: isAuthenticated,
      userId: isAuthenticated ? user?.id : null
    };
    
    console.log('Join data:', joinData);
    socket.emit('joinGame', joinData);
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