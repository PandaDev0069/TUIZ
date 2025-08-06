import { io } from 'socket.io-client';
import { apiConfig } from './utils/apiConfig';

const socket = io(apiConfig.socketUrl, {
    transports: ['websocket', 'polling'], // Added polling as fallback
    timeout: 20000,
    forceNew: true
});

// Only log socket connection in development
if (import.meta.env.DEV) {
  console.log(`🔌 Connecting to backend at: ${apiConfig.socketUrl}`);
}

export default socket;