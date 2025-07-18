import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import socket from './socket'
import Join from './pages/join'

function App() {
  useEffect(() => {
    socket.on('connect', () => {
      console.log(`Connected to server with ID: ${socket.id}`);
    });

    return () => {
      socket.off('connect');
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<h1>Welcome to Quiz Game</h1>} />
      <Route path="/host" element={<h1>Host Screen (Coming Soon)</h1>} />
      <Route path="/join" element={<Join />} />
      <Route path="/quiz" element={<h1>Quiz Screen (Coming Soon)</h1>} />
      <Route path="/scoreboard" element={<h1>Scoreboard (Coming Soon)</h1>} />
    </Routes>
  )
}

export default App