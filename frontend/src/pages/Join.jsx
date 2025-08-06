import { useState, useEffect, useRef } from "react";
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
  
  // Refs for input elements
  const nameInputRef = useRef(null);
  const roomInputRef = useRef(null);
  const cardRef = useRef(null);

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

  // Mobile keyboard handling
  useEffect(() => {
    const handleResize = () => {
      // Detect if viewport height has significantly decreased (keyboard opened)
      const isKeyboardOpen = window.innerHeight < window.screen.height * 0.75;
      
      if (isKeyboardOpen) {
        // Small delay to ensure the keyboard is fully shown
        setTimeout(() => {
          const activeElement = document.activeElement;
          if (activeElement && (activeElement === nameInputRef.current || activeElement === roomInputRef.current)) {
            // Scroll the active input into view
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 100);
      }
    };

    // Listen for viewport changes
    window.addEventListener('resize', handleResize);
    
    // Also handle orientationchange for mobile devices
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 500); // Delay for orientation change
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Handle input focus for mobile keyboard
  const handleInputFocus = (inputRef) => {
    // For mobile devices, scroll the input into view when focused
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 300); // Delay to allow keyboard to show
    }
  };

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
      // Close mobile keyboard and scroll to button
      e.target.blur();
      
      // Small delay to allow keyboard to close
      setTimeout(() => {
        handleJoin();
      }, 100);
    }
  };

  return (
    <div className="page-container">
      <div className="card" ref={cardRef}>
        <h1>TUIZ情報王</h1>
        <p>名前とルームコードを入力ください。</p>

        <div className="input-group">
          <input
            ref={nameInputRef}
            className="input"
            type="text"
            placeholder="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => handleInputFocus(nameInputRef)}
            maxLength={20}
          />

          <input
            ref={roomInputRef}
            className="input"
            type="text"
            placeholder="ルームコード"
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            onFocus={() => handleInputFocus(roomInputRef)}
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