import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import socket from '../socket';
import './hostLobby.css';

function HostLobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const { room, title } = location.state || {};

  useEffect(() => {
    if (!room || !title) {
      navigate('/host');
      return;
    }
  }, [room, title, navigate]);

  return (
    <div className="page-container">
      <div className="host-lobby-card">
        <h1>{title}</h1>
        <div className="room-code-display">
          {room}
        </div>
      </div>
    </div>
  );
}

export default HostLobby;
