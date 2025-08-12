import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import socket from './socket'
import { AuthProvider } from './contexts/AuthContext'
import AuthDebugger from './components/AuthDebugger'
import ToastContainer from './components/ToastContainer'
import CleanupWarningHandler from './components/CleanupWarningHandler'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateQuiz from './pages/CreateQuiz'
import QuizPreview from './pages/QuizPreview'
import QuizLibrary from './pages/QuizLibrary'
import Join from './pages/Join'
import WaitingRoom from './pages/WaitingRoom'
import Host from './pages/Host'
import HostLobby from './pages/HostLobby'
import Quiz from './pages/Quiz'
import HostDashboard from './components/host/dashboard/HostDashboard'
import Scoreboard from './pages/Scoreboard'
import Privacy from './pages/Privacy'
import License from './pages/License'

function App() {
  useEffect(() => {
    socket.on('connect', () => {
      // Only log connection in development
      if (import.meta.env.DEV) {
        console.log(`Connected to server with ID: ${socket.id}`);
      }
    });

    return () => {
      socket.off('connect');
    };
  }, []);

  const isDevelopment = import.meta.env.DEV;

  return (
    <AuthProvider>
      <CleanupWarningHandler />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quiz-library" element={<QuizLibrary />} />
        <Route path="/create-quiz" element={<CreateQuiz />} />
        <Route path="/preview" element={<QuizPreview />} />
        <Route path="/host" element={<Host/>} />
        <Route path="/host/lobby" element={<HostLobby />} />
        <Route path="/host/dashboard" element={<HostDashboard />} />
        <Route path="/join" element={<Join />} />
        <Route path="/waiting" element={<WaitingRoom />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/scoreboard" element={<Scoreboard />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/license" element={<License />} />
      </Routes>
      <ToastContainer />
      <SpeedInsights />
      <Analytics />
    </AuthProvider>
  )
}

export default App