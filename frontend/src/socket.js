import { io } from 'socket.io-client';

// Get the current hostname and determine the backend URL
const getBackendUrl = () => {
  const hostname = window.location.hostname;
  
  // If accessing via localhost, use localhost for backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // If accessing via local network IP, use the same IP for backend
  return `http://${hostname}:3001`;
};

const socket = io(getBackendUrl(), {
    transports: ['websocket', 'polling'], // Added polling as fallback
    timeout: 20000,
    forceNew: true
});

console.log(`🔌 Connecting to backend at: ${getBackendUrl()}`);

export default socket;