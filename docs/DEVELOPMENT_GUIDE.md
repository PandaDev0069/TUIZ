# 🛠️ Development Guide

**Last Updated**: January 7, 2025

## 🏗️ Project Architecture

### 📁 Project Structure
```
TUIZ/
├── frontend/          # Vite + React frontend
├── backend/           # Node.js + Express backend
├── docs/             # Documentation
└── README.md         # Project overview
```

### 🔧 Technology Stack

#### Frontend
- **Framework**: React 18 + Vite
- **Styling**: CSS Modules + Vanilla CSS
- **State Management**: React Context + Hooks
- **Real-time**: Socket.IO Client
- **Build Tool**: Vite
- **Deployment**: Vercel

#### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.IO
- **Authentication**: Supabase Auth
- **Deployment**: Render

## 🚀 Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### 🔧 Installation

1. **Clone Repository**
```bash
git clone <repository-url>
cd TUIZ
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env  # Configure environment variables
npm run dev
```

### 🌍 Environment Configuration

#### Backend `.env`
```env
PORT=3001
DATABASE_URL=your_supabase_db_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=development
```

#### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_BACKEND_URL_PROD=your_production_backend_url
```

## 🔄 Development Workflow

### 🌟 Git Workflow
```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/feature-name
```

### 📝 Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

### 🧪 Testing Strategy
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Integration tests
npm run test:integration
```

## 📊 Code Standards

### 🎨 Styling Guidelines
- Use CSS Modules for component-specific styles
- Follow BEM naming convention
- Maintain consistent spacing (4 spaces)
- Mobile-first responsive design

### ⚛️ React Patterns
```javascript
// Component structure
import React from 'react';
import styles from './Component.module.css';

const Component = ({ prop1, prop2 }) => {
  // Hooks at the top
  const [state, setState] = useState(initialState);
  
  // Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // Render
  return (
    <div className={styles.container}>
      {/* Component JSX */}
    </div>
  );
};

export default Component;
```

### 🔧 Node.js Patterns
```javascript
// Route structure
const express = require('express');
const router = express.Router();

// Middleware
router.use(authMiddleware);

// Route handlers
router.get('/endpoint', async (req, res) => {
  try {
    // Logic here
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## 🔌 API Documentation

### 🎮 Game Endpoints
```
GET    /api/games          # List all games
POST   /api/games          # Create new game
GET    /api/games/:id      # Get game details
PUT    /api/games/:id      # Update game
DELETE /api/games/:id      # Delete game
```

### 👥 Player Endpoints
```
POST   /api/games/:id/join    # Join game
DELETE /api/games/:id/leave   # Leave game
GET    /api/games/:id/players # Get players
```

### 📊 Results Endpoints
```
GET    /api/games/:id/results    # Get game results
POST   /api/games/:id/submit     # Submit answer
GET    /api/players/:id/stats    # Player statistics
```

## 🔍 Debugging

### 🐛 Common Issues

#### Frontend Not Connecting to Backend
```bash
# Check environment variables
cat frontend/.env

# Verify API URLs
# Development: http://localhost:3001
# Production: your-backend-url
```

#### Socket.IO Connection Issues
```javascript
// Check socket connection
const socket = io(socketUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('Connected to server');
});
```

#### Database Connection Problems
```bash
# Test database connection
cd backend
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
console.log('Database client created successfully');
"
```

### 📝 Logging

#### Development Logging
```javascript
// Use conditional logging
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = req.get('host')?.includes('localhost');

if (isDevelopment || isLocalhost) {
  console.log('Debug info:', data);
}
```

#### Production Logging
```javascript
// Use structured logging
const logger = {
  info: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, data);
    }
  },
  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error);
  }
};
```

## 🚀 Deployment

### 📦 Build Process
```bash
# Frontend build
cd frontend
npm run build

# Backend preparation
cd backend
npm run start
```

### 🌐 Environment Variables

#### Production Frontend
```env
VITE_API_BASE_URL=https://your-backend.render.com
VITE_SOCKET_URL=https://your-backend.render.com
```

#### Production Backend
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=your_production_db_url
CORS_ORIGIN=https://your-frontend.vercel.app
```

### 🔄 Deployment Commands
```bash
# Vercel (Frontend)
vercel --prod

# Render (Backend)
# Automatic deployment on git push
```

## 🧰 Useful Tools

### 📊 Development Tools
- **VS Code**: Primary IDE with extensions
- **Postman**: API testing
- **Chrome DevTools**: Frontend debugging
- **Supabase Dashboard**: Database management

### 🔧 VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens
- Thunder Client (Postman alternative)

### 📱 Browser Extensions
- React Developer Tools
- Vue.js devtools (if applicable)
- Redux DevTools

## 📚 Learning Resources

### 📖 Documentation
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [Socket.IO Documentation](https://socket.io/docs)
- [Supabase Documentation](https://supabase.com/docs)

### 🎓 Tutorials
- React Hooks in Action
- Node.js Express Tutorial
- Socket.IO Real-time Apps
- Supabase Full Stack App

## 🆘 Getting Help

### 💬 Communication Channels
- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Documentation**: Check this guide first
- **Code Review**: Pull Request reviews

### 🐛 Bug Reporting
1. Check existing issues
2. Create detailed bug report
3. Include reproduction steps
4. Provide environment details
5. Add relevant logs/screenshots
