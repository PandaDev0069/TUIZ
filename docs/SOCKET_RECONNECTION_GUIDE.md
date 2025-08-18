# 🔌 Socket Reconnection System Guide

## Overview

The TUIZ application now features a comprehensive socket reconnection system that ensures users stay connected even during network interruptions, page reloads, or temporary disconnections. This system provides automatic reconnection with exponential backoff, session persistence, and real-time connection status feedback.

## Architecture

### Core Components

1. **SocketManager** (`src/utils/SocketManager.js`) - Core reconnection logic
2. **useSocket Hooks** (`src/hooks/useSocket.js`) - React integration
3. **ConnectionStatus Component** (`src/components/ConnectionStatus.jsx`) - UI feedback

### Key Features

- ✅ **Automatic Reconnection** - Exponential backoff strategy
- ✅ **Session Persistence** - Game state survives disconnections  
- ✅ **Real-time Status** - Visual connection indicators
- ✅ **Event Queue Management** - Buffers events during disconnection
- ✅ **Multiple Connection Types** - Host, Player, and Generic socket hooks
- ✅ **React Integration** - Easy-to-use hooks for components

## Implementation Guide

### 1. Using Socket Hooks in Components

#### Host Components
```jsx
import { useHostSocket, useConnectionStatus } from '../hooks/useSocket'
import ConnectionStatus from '../components/ConnectionStatus'

function HostLobby() {
  // Host socket with session persistence
  const { socket, reconnect, sessionData } = useHostSocket({
    gameId: 'game123',
    room: 'ABC123',
    title: 'Quiz Title',
    questionSetId: 'qs456'
  })
  
  // Connection status for UI feedback
  const { isConnected, connectionState } = useConnectionStatus()
  
  // Restore session data on reconnect
  useEffect(() => {
    if (sessionData?.connectedPlayers) {
      setConnectedMap(new Map(sessionData.connectedPlayers))
    }
  }, [sessionData])
  
  return (
    <div>
      <ConnectionStatus position="top-right" showText={true} />
      {/* Your component content */}
    </div>
  )
}
```

#### Player Components
```jsx
import { usePlayerSocket, useConnectionStatus } from '../hooks/useSocket'

function Quiz() {
  // Player socket with session persistence
  const { socket, reconnect, sessionData } = usePlayerSocket({
    playerName: 'John',
    room: 'ABC123',
    gameId: 'game123'
  })
  
  // Connection status
  const { isConnected, connectionState } = useConnectionStatus()
  
  return (
    <div>
      <ConnectionStatus position="top-left" compact={true} />
      {/* Your component content */}
    </div>
  )
}
```

#### Generic Socket Usage
```jsx
import { useSocket } from '../hooks/useSocket'

function GenericComponent() {
  const { socket, isConnected, reconnect } = useSocket()
  
  useEffect(() => {
    socket.on('customEvent', handleCustomEvent)
    return () => socket.off('customEvent')
  }, [socket])
}
```

### 2. Connection Status Component

The `ConnectionStatus` component provides visual feedback about the connection state:

```jsx
<ConnectionStatus 
  position="top-right"    // top-right, top-left, bottom-right, bottom-left
  showText={true}         // Show status text or icon only
  compact={false}         // Compact circular design
  className="custom-css"  // Additional CSS classes
/>
```

#### States
- **Connected** - Green indicator with checkmark
- **Connecting/Reconnecting** - Yellow indicator with spinning icon
- **Disconnected** - Red pulsing indicator with warning icon

### 3. Session Persistence

The system automatically persists important session data:

```javascript
// For hosts - saves lobby state
const sessionData = {
  connectedPlayers: Array.from(connectedMap.entries()),
  logs: logs.slice(-50),
  gameState: { room, title, gameId, questionSetId }
}

// For players - saves game progress
const sessionData = {
  currentScore: score,
  currentQuestion: questionNumber,
  gameState: { room, playerName, gameId }
}
```

## Migration Guide

### Updating Existing Components

1. **Replace direct socket imports:**
```jsx
// OLD
import socket from '../socket'

// NEW
import { useSocket, useHostSocket, usePlayerSocket } from '../hooks/useSocket'
```

2. **Update socket usage in useEffect:**
```jsx
// OLD
useEffect(() => {
  socket.on('event', handler)
  return () => socket.off('event')
}, [])

// NEW  
const { socket } = useSocket()
useEffect(() => {
  socket.on('event', handler)
  return () => socket.off('event')
}, [socket])
```

3. **Add connection status indicators:**
```jsx
// Add to your component JSX
<ConnectionStatus position="top-right" showText={true} />
```

### Components Updated
- ✅ **HostLobby.jsx** - Integrated with useHostSocket and session persistence
- ✅ **Quiz.jsx** - Integrated with usePlayerSocket and connection status
- ⏳ **WaitingRoom.jsx** - Pending migration
- ⏳ **Join.jsx** - Pending migration  
- ⏳ **HostControlPage.jsx** - Pending migration
- ⏳ **GameControlPanel.jsx** - Pending migration
- ⏳ **Dashboard.jsx** - Pending migration

## Technical Details

### Reconnection Strategy

1. **Immediate Retry** - First attempt after 100ms
2. **Exponential Backoff** - 250ms, 500ms, 1s, 2s, 4s, 8s, 16s
3. **Maximum Delay** - Caps at 30 seconds
4. **Maximum Attempts** - 50 attempts before giving up
5. **Jitter** - ±25% randomization to prevent thundering herd

### Event Queue Management

During disconnection, events are queued and replayed upon reconnection:
- **Buffered Events** - Important user actions saved locally
- **Automatic Replay** - Events sent once connection restored
- **State Synchronization** - Server state requested on reconnect

### Error Handling

The system handles various error scenarios:
- **Network Timeouts** - Automatic retry with backoff
- **Server Disconnects** - Graceful reconnection attempts
- **Auth Failures** - Re-authentication flow
- **Rate Limiting** - Respects server rate limits

## Troubleshooting

### Common Issues

1. **Reconnection Loops**
   - Check server logs for authentication issues
   - Verify rate limiting configuration
   - Ensure proper session token management

2. **Session Data Not Persisting**
   - Verify localStorage is enabled in browser
   - Check for quota limits on session storage
   - Ensure JSON serialization is working

3. **Connection Status Not Updating**
   - Verify useConnectionStatus hook is properly imported
   - Check that ConnectionStatus component is receiving props
   - Ensure socket events are being emitted correctly

### Debug Mode

Enable debug logging in development:
```javascript
// Set in browser console
localStorage.setItem('tuiz:socket:debug', 'true')
```

This will provide detailed logs about:
- Connection attempts and failures
- Session data persistence
- Event queue management
- Reconnection strategy execution

## Performance Considerations

- **Memory Usage** - Session data is limited to prevent memory leaks
- **Network Traffic** - Reconnection attempts use exponential backoff
- **CPU Usage** - Event listeners are properly cleaned up
- **Storage Limits** - Session persistence respects browser quotas

## Future Enhancements

- **Offline Mode** - Continue functioning without network
- **Background Sync** - Sync queued events when connection restored
- **Progressive Web App** - Service worker integration for better reliability
- **Connection Quality** - Monitor and adapt to network conditions
