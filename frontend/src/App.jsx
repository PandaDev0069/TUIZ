import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import socket from './socket'
import { AuthProvider } from './contexts/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateQuiz from './pages/CreateQuiz'
import Join from './pages/join'
import WaitingRoom from './pages/WaitingRoom'
import Host from './pages/Host'
import HostLobby from './pages/HostLobby'
import Quiz from './pages/Quiz'
import QuizControl from './pages/QuizControl'
import Scoreboard from './pages/Scoreboard'

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
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-quiz" element={<CreateQuiz />} />
        <Route path="/host" element={<Host/>} />
        <Route path="/host/lobby" element={<HostLobby />} />
        <Route path="/join" element={<Join />} />
        <Route path="/waiting" element={<WaitingRoom />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/quiz/control" element={<QuizControl />} />
        <Route path="/scoreboard" element={<Scoreboard />} />
      </Routes>
    </AuthProvider>
  )
}

export default App