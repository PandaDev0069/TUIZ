import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaGamepad, FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';
import socket from '../socket';
import '../utils/AnimationController'; // Ensure AnimationController is loaded
import '../utils/ViewportFix'; // Ensure ViewportFix is loaded for mobile viewport handling
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

  // Force animation initialization immediately
  useEffect(() => {
    // Ensure AnimationController is available and initialize animations
    if (window.tuizAnimations) {
      window.tuizAnimations.initializePageAnimations();
    }
    
    // Add ready class after a brief delay to prevent flash
    const timer = setTimeout(() => {
      const joinElement = document.querySelector('.join');
      if (joinElement) {
        joinElement.classList.add('tuiz-animations-ready');
      }
    }, 50); // Very short delay to ensure CSS is loaded
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Socket connected:', socket.connected);
    }
    
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
    if (import.meta.env.DEV) {
      console.log('Attempting to join game:', room, 'with name:', name);
    }
    
    // Set up listener before emitting
    socket.once('joinedGame', ({ gameCode, playerCount, gameStatus, player }) => {
      if (import.meta.env.DEV) {
        console.log('Join successful! Game:', gameCode, 'Player:', player, 'Total Players:', playerCount);
      }
      
      // Pass the correct player count information to WaitingRoom
      navigate('/waiting', { 
        state: { 
          name, 
          room: gameCode, 
          initialPlayers: [player], // Current player data
          serverPlayerCount: playerCount // Server's authoritative count
        } 
      });
    });
    
    // Send user authentication info if available
    const joinData = {
      playerName: name,
      gameCode: room,
      isAuthenticated: isAuthenticated,
      userId: isAuthenticated ? user?.id : null
    };
    
    if (import.meta.env.DEV) {
      console.log('Join data:', joinData);
    }
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
    <div className="join tuiz-animate-fade-in">
      <div className="join__wrapper">
        <div className="join__main">
          <div className="join__container tuiz-animate-scale-in tuiz-animate-stagger-1">
            {/* Header */}
            <div className="join__header tuiz-animate-fade-in-down tuiz-animate-stagger-2">
              <h1 className="join__title tuiz-animate-float">TUIZ情報王</h1>
              <h2 className="join__subtitle tuiz-animate-fade-in tuiz-animate-stagger-3">ゲームに参加</h2>
              <p className="join__description tuiz-animate-fade-in tuiz-animate-stagger-4">
                名前とルームコードを入力してください
              </p>
            </div>

            {/* Join Form */}
            <div className="join__form tuiz-animate-fade-in-up tuiz-animate-stagger-5">
              {/* Error Message */}
              {error && (
                <div className="join__error-message tuiz-animate-slide-in-up">
                  <span className="join__error-icon tuiz-animate-pulse">
                    <FaExclamationTriangle />
                  </span>
                  {error}
                </div>
              )}

              {/* Name Input */}
              <div className="join__input-group tuiz-animate-slide-in-up tuiz-animate-stagger-1">
                <label htmlFor="playerName" className="join__label">
                  <FaUser className="join__label-icon join__label-icon--user tuiz-animate-breathe" />
                  プレイヤー名
                </label>
                <div className="join__input-wrapper">
                  <input
                    ref={nameInputRef}
                    type="text"
                    id="playerName"
                    name="playerName"
                    className="join__input"
                    placeholder="あなたの名前を入力"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    maxLength={20}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Room Code Input */}
              <div className="join__input-group tuiz-animate-slide-in-up tuiz-animate-stagger-2">
                <label htmlFor="roomCode" className="join__label">
                  <FaGamepad className="join__label-icon join__label-icon--room tuiz-animate-breathe" />
                  ルームコード
                </label>
                <div className="join__input-wrapper">
                  <input
                    ref={roomInputRef}
                    type="text"
                    id="roomCode"
                    name="roomCode"
                    className="join__input join__input--room-code"
                    placeholder="6桁のコード"
                    value={room}
                    onChange={(e) => setRoom(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    maxLength={6}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Join Button */}
              <button
                type="button"
                className="join__button tuiz-animate-scale-in tuiz-animate-stagger-3 tuiz-hover-lift"
                onClick={handleJoin}
                disabled={!name || !room}
              >
                <FaGamepad className="join__button-icon" />
                ゲームに参加する
              </button>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="join__footer tuiz-animate-fade-in tuiz-animate-stagger-5">
          <Link to="/" className="join__back-link tuiz-hover-lift">
            <FaArrowLeft className="join__back-icon tuiz-animate-float" />
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Join;