import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from '../socket';

function Join() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if socket is connected
    console.log('Socket connected:', socket.connected);
    
    return () => {
      // Cleanup socket listeners when component unmounts
      socket.off('joined_successfully');
    };
  }, []);

  const handleJoin = () => {
    if (name && room) {
      console.log('Attempting to join room:', room, 'with name:', name);
      socket.emit('joinRoom', { name, room });
      
      socket.on('joined_successfully', ({ players }) => {
        console.log('Join successful! Players in room:', players);
        navigate('/quiz');
      });
    } else {
      alert("Please enter both name and room.");
    }
  }

  return (
    <div className="join-container">
      <h1>クイズに参加する</h1>
      <p>名前とルームコードを入力ください。</p>

      <input
        type="text"
        placeholder="名前"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        type="text"
        placeholder="ルームコード"
        value={room}
        onChange={(e) => setRoom(e.target.value)}
      />

      <button onClick={handleJoin}>参加する</button>
    </div>
  );
}

export default Join;