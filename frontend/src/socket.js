import socketManager from './utils/SocketManager';

// Only log socket connection in development
if (import.meta.env.DEV) {
  const socketUrl = socketManager.getSocket()?.io?.uri || 'initializing...';
  console.log(`🔌 Socket Manager initialized, connecting to: ${socketUrl}`);
}

// Export the socket instance for backward compatibility
// Note: This may be null initially until connection is established
export default socketManager.getSocket();

// Also export the manager for advanced usage
export { socketManager };