import { SocketManager } from './utils/SocketManager';
import { apiConfig } from './utils/apiConfig';

// Create singleton socket manager instance
const socketManager = new SocketManager(apiConfig.socketUrl, {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true
});

// Initialize connection
socketManager.connect();

// Only log socket connection in development
if (import.meta.env.DEV) {
  console.log(`🔌 Connecting to backend at: ${apiConfig.socketUrl}`);
}

// Export the socket instance for backward compatibility
export default socketManager.getSocket();

// Also export the manager for advanced usage
export { socketManager };