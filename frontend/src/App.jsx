import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import socket from './socket'
import Join from './pages/join'
import WaitingRoom from './pages/WaitingRoom'
import Host from './pages/Host'
import HostLobby from './pages/HostLobby'

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
      <Route path="/host" element={<Host/>} />
      <Route path="/host/lobby" element={<HostLobby />} />
      <Route path="/join" element={<Join />} />
      <Route path="/waiting" element={<WaitingRoom />} />
      <Route path="/quiz" element={<h1>Quiz Screen (Coming Soon)</h1>} />
      <Route path="/scoreboard" element={<h1>Scoreboard (Coming Soon)</h1>} />
    </Routes>
  )
}

export default App