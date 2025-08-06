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
    let keyboardTimeout;
    let initialViewportHeight = window.innerHeight;
    
    const handleResize = () => {
      // Clear any existing timeout
      if (keyboardTimeout) {
        clearTimeout(keyboardTimeout);
      }
      
      // Multiple detection methods for better browser compatibility
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // Method 1: Viewport height decrease
      const isKeyboardOpen1 = currentHeight < window.screen.height * 0.75;
      
      // Method 2: Significant height decrease (more reliable)
      const isKeyboardOpen2 = heightDifference > 150;
      
      // Method 3: Visual viewport API (modern browsers)
      const isKeyboardOpen3 = window.visualViewport ? 
        window.visualViewport.height < initialViewportHeight * 0.75 : false;
      
      const isKeyboardOpen = isKeyboardOpen1 || isKeyboardOpen2 || isKeyboardOpen3;
      
      console.log(`📏 Resize - Initial: ${initialViewportHeight}, Current: ${currentHeight}, Diff: ${heightDifference}, Keyboard: ${isKeyboardOpen}`);
      
      if (isKeyboardOpen) {
        // Delay to ensure the keyboard is fully shown and DOM is updated
        keyboardTimeout = setTimeout(() => {
          const activeElement = document.activeElement;
          const isRoomInput = activeElement === roomInputRef.current;
          const isNameInput = activeElement === nameInputRef.current;
          
          console.log(`⌨️ Keyboard open - Active element: ${isRoomInput ? 'Room Code' : isNameInput ? 'Name' : 'Other'}`);
          
          if (activeElement && (isNameInput || isRoomInput)) {
            // Method 1: Standard scrollIntoView
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
            
            // Method 2: Manual scroll calculation (more reliable for room input)
            setTimeout(() => {
              if (isRoomInput) {
                console.log(`🎯 Extra scroll for room code input`);
                const rect = activeElement.getBoundingClientRect();
                const absoluteElementTop = rect.top + window.pageYOffset;
                const targetPosition = absoluteElementTop - (window.innerHeight * 0.4);
                
                window.scrollTo({
                  top: Math.max(0, targetPosition),
                  behavior: 'smooth'
                });
              }
            }, 150);
          }
        }, 250); // Slightly longer delay for better reliability
      } else {
        // Update initial height when keyboard closes
        initialViewportHeight = currentHeight;
      }
    };

    // Store initial height
    initialViewportHeight = window.innerHeight;

    // Listen for viewport changes
    window.addEventListener('resize', handleResize);
    
    // Visual Viewport API support (modern browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    
    // Also handle orientationchange for mobile devices
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        initialViewportHeight = window.innerHeight;
        handleResize();
      }, 700); // Longer delay for orientation change
    });

    return () => {
      if (keyboardTimeout) {
        clearTimeout(keyboardTimeout);
      }
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Handle input focus for mobile keyboard
  const handleInputFocus = (inputRef) => {
    // For mobile devices, scroll the input into view when focused
    if (window.innerWidth <= 768) {
      const isRoomInput = inputRef === roomInputRef;
      console.log(`📱 Mobile input focus: ${isRoomInput ? 'Room Code' : 'Name'} input`);
      
      // Immediate scroll for better responsiveness
      if (inputRef.current) {
        inputRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
      
      // Additional delayed scroll to handle keyboard opening
      setTimeout(() => {
        if (inputRef.current) {
          console.log(`🔄 Delayed scroll for ${isRoomInput ? 'Room Code' : 'Name'} input`);
          
          if (isRoomInput) {
            // Special handling for room code input - scroll more aggressively
            const elementRect = inputRef.current.getBoundingClientRect();
            const targetScrollTop = window.pageYOffset + elementRect.top - window.innerHeight * 0.35;
            
            console.log(`📍 Room code scroll target: ${targetScrollTop}, current: ${window.pageYOffset}`);
            
            window.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
          } else {
            // Standard scroll for name input
            inputRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        }
      }, 350); // Longer delay to ensure keyboard is open
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