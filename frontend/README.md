# 🎨 TUIZ Frontend - React + Vite

Real-time quiz application frontend supporting **200-300 concurrent players** with engaging animations and sound effects.

## 🌟 Overview

This is the frontend sub-repository for TUIZ, a Kahoot-style quiz app. Built with React, Vite, and optimized for real-time multiplayer experiences.

### ✨ Key Features

- **📱 Mobile-First Design**: Responsive UI that works on all devices
- **🎬 Framer Motion**: Smooth animations and transitions
- **🔊 Howler.js**: Immersive sound effects and audio feedback
- **⚡ Socket.IO**: Real-time communication with backend
- **🎮 Game-like UI**: Vibrant design with emojis and engaging visuals
- **🏆 Live Leaderboards**: Real-time score updates and rankings

## 🚀 Tech Stack

- **Framework**: React 18+ with Hooks
- **Build Tool**: Vite (fast development and optimized builds)
- **Styling**: CSS Modules + CSS Variables
- **Animations**: Framer Motion
- **Audio**: Howler.js
- **Real-time**: Socket.IO Client
- **State Management**: React Context + useReducer
- **Routing**: React Router
- **Icons**: React Icons
- **Deployment**: Vercel (auto-deploy from main branch)

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd TUIZ/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your backend URL

# Start development server
npm run dev
```

## 🔧 Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# Backend Configuration
VITE_BACKEND_URL=http://localhost:3001
VITE_SOCKET_URL=ws://localhost:3001

# Production URLs (for deployment)
VITE_BACKEND_URL_PROD=https://your-backend-url.render.com
VITE_SOCKET_URL_PROD=wss://your-backend-url.render.com

# Feature Flags
VITE_ENABLE_SOUND=true
VITE_ENABLE_ANIMATIONS=true
VITE_DEBUG_MODE=false
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run dev:host     # Start with network access

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── IntermediateScoreboard.jsx
│   ├── MetadataForm.jsx
│   ├── QuestionBuilder.jsx
│   ├── QuestionListPanel.jsx
│   ├── QuestionReorderModal.jsx
│   ├── QuestionsForm.jsx
│   └── SettingsForm.jsx
├── contexts/            # React Context providers
│   └── AuthContext.jsx
├── pages/              # Main application pages
│   ├── CreateQuiz.jsx
│   ├── Dashboard.jsx
│   ├── Home.jsx
│   ├── Host.jsx
│   ├── HostLobby.jsx
│   ├── Join.jsx
│   ├── Login.jsx
│   ├── Quiz.jsx
│   ├── QuizControl.jsx
│   ├── Register.jsx
│   ├── Scoreboard.jsx
│   └── WaitingRoom.jsx
├── hooks/              # Custom React hooks
│   ├── useSocket.js
│   ├── useAudio.js
│   └── useGame.js
├── utils/              # Utility functions
│   ├── animations.js
│   ├── audio.js
│   ├── gameUtils.js
│   └── socketEvents.js
├── assets/             # Static assets
│   ├── sounds/
│   ├── images/
│   └── icons/
├── styles/             # Global styles
│   ├── globals.css
│   ├── variables.css
│   └── animations.css
└── App.jsx             # Main application component
```

## 🎯 Core Features Implementation

### Real-Time Game Flow
1. **Host Flow**: Create quiz → Generate room code → Manage game → View results
2. **Player Flow**: Join with code → Wait in lobby → Answer questions → View scores

### Socket Events
```javascript
// Outgoing events
socket.emit('join-room', { roomCode, playerName });
socket.emit('submit-answer', { questionId, answer, timeElapsed });
socket.emit('start-game');

// Incoming events
socket.on('player-joined', handlePlayerJoined);
socket.on('question-started', handleQuestionStarted);
socket.on('answer-results', handleAnswerResults);
socket.on('game-ended', handleGameEnded);
```

### Animation System
```javascript
// Using Framer Motion for smooth transitions
const pageVariants = {
  initial: { opacity: 0, x: -20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: 20 }
};
```

### Audio System
```javascript
// Sound effects management
const audioManager = {
  playCorrect: () => playSound('correct.mp3'),
  playIncorrect: () => playSound('wrong.mp3'),
  playCountdown: () => playSound('countdown.mp3'),
  playJoin: () => playSound('join.mp3')
};
```

## 🎨 Design System

### Color Scheme
```css
:root {
  --primary: #6366f1;      /* Indigo */
  --secondary: #f59e0b;    /* Amber */
  --success: #10b981;      /* Emerald */
  --error: #ef4444;        /* Red */
  --warning: #f59e0b;      /* Amber */
  --background: #0f172a;   /* Slate 900 */
  --surface: #1e293b;      /* Slate 800 */
  --text: #f8fafc;         /* Slate 50 */
}
```

### Typography
- **Headers**: Inter, bold weights
- **Body**: Inter, regular and medium
- **Code**: JetBrains Mono

### Responsive Breakpoints
```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

## 🔄 State Management

Using React Context + useReducer for global state:

```javascript
// Game context for real-time game state
const GameContext = createContext();

// Auth context for user authentication
const AuthContext = createContext();

// Socket context for connection management
const SocketContext = createContext();
```

## 📱 Mobile Optimization

- Touch-friendly button sizes (minimum 44px)
- Swipe gestures for navigation
- Optimized layouts for portrait orientation
- Fast tap responses (no 300ms delay)
- Proper viewport meta tags

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**:
   - Link your GitHub repository to Vercel
   - Set build command: `npm run build`
   - Set output directory: `dist`

2. **Environment Variables**:
   Add production environment variables in Vercel dashboard

3. **Build Settings**:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "installCommand": "npm install"
   }
   ```

### Manual Deployment
```bash
# Build for production
npm run build

# Deploy to any static hosting service
# Upload contents of 'dist' folder
```

## 🧪 Testing

### Test Structure
```
tests/
├── components/         # Component tests
├── pages/             # Page tests
├── hooks/             # Custom hook tests
├── utils/             # Utility function tests
└── integration/       # Integration tests
```

### Testing Commands
```bash
# Unit tests
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Visual regression tests
npm run test:visual
```

## 🔧 Performance Optimization

### Bundle Optimization
- Code splitting with React.lazy()
- Tree shaking for unused code
- Image optimization and lazy loading
- Service worker for caching

### Real-time Optimization
- Debounced socket events
- Optimistic UI updates
- Connection pooling
- Automatic reconnection

## 🐛 Debugging

### Development Tools
```bash
# Enable debug mode
VITE_DEBUG_MODE=true npm run dev

# Socket.IO debugging
localStorage.debug = 'socket.io-client:socket'

# React DevTools
# Install React Developer Tools browser extension
```

## 🤝 Contributing

1. **Code Style**: Follow ESLint and Prettier configurations
2. **Commits**: Use conventional commit format
3. **Testing**: Write tests for new features
4. **Documentation**: Update README for significant changes

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create pull request for review
```

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Email**: your-email@example.com
