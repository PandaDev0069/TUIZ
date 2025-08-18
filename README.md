# 🎯 TUIZ - Real-Time Quiz App

A Kahoot-style quiz app supporting **200-300 concurrent players** with real-time interactions, animations, and sound effects.

## 📁 Project ## 📚 Project Documentation

- **[Development Plan](./docs/plan.md)** - Project roadmap and architecture
- **[TODO List](./docs/TODO's.md)** - Current development tasks and progress
- **[Socket Reconnection Guide](./docs/SOCKET_RECONNECTION_GUIDE.md)** - Comprehensive guide to the socket reconnection system
- **[Bug Tracker](./docs/Bug_Tracker.md)** - Known issues and resolutions
- **[Database Schema](./docs/database/current_schema.sql)** - Complete database structure
- **[Feature Requests](./docs/feature_req.md)** - Planned enhancements and ideasre

```
/TUIZ
├── /frontend/          ← React + Vite + React Router (deployed on Vercel)
│   ├── /src/
│   │   ├── /components/    ← UI Components (QuestionBuilder, Modals, etc.)
│   │   ├── /contexts/      ← React Context (AuthContext)
│   │   ├── /hooks/         ← Custom Hooks (useConfirmation, useToast, etc.)
│   │   ├── /pages/         ← Page Components (Dashboard, CreateQuiz, Host, etc.)
│   │   └── /utils/         ← Frontend Utilities
│   └── Features:
│       • Responsive UI (mobile-first design)
│       • Framer Motion for smooth animations
│       • Howler.js for immersive sound effects
│       • Real-time Socket.IO communication with automatic reconnection
│       • Comprehensive socket reconnection system with session persistence
│       • Visual connection status indicators across all pages
│       • Quiz creation with image upload support
│       • Live scoreboard and intermediate rankings
│       • Interactive game settings panel with real-time updates
│       • Host lobby with terminal-style player display
│       • Debounced auto-save for seamless UX
│
├── /backend/           ← Node.js + Express + Socket.IO (deployed on Render)
│   ├── /config/        ← Database and game configuration
│   ├── /routes/        ← API routes (auth, quiz, games, etc.)
│   ├── /middleware/    ← Authentication middleware
│   ├── /utils/         ← Backend utilities (RoomManager, OrderManager)
│   └── Features:
│       • Real-time game room management
│       • Socket.IO for live player interactions  
│       • Supabase integration for data persistence
│       • JWT-based authentication with RLS policies
│       • File upload handling (quiz thumbnails, question images)
│       • Game session management and scoring
│       • Advanced settings synchronization system
│       • Room-based player management with UUID tracking
│
├── /docs/              ← Project Documentation
│   ├── /database/      ← Database schema and documentation
│   ├── Bug_Tracker.md  ← Known issues and fixes
│   ├── TODO's.md       ← Development roadmap
│   └── plan.md         ← Project planning and architecture
│
└── Database: Supabase (PostgreSQL + Auth, hosted in cloud)
    └── Features:
        • Stores quizzes, questions, answers, and user data
        • Game sessions and player management with UUID tracking
        • Authentication and user profiles with RLS policies
        • Real-time subscriptions support
        • Settings synchronization between question sets and active games
        • Automatic cleanup scheduling and data management
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier)

### Environment Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd TUIZ
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. **Database Setup** (Supabase)
   - Create a new Supabase project
   - Run the SQL schema from `docs/database/current_schema.sql`
   - Configure environment variables (see `.env.example`)

3. **Backend Setup**
   ```bash
   cd backend
   npm run dev
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm run dev
   ```

## 🌐 Deployment

- **Frontend**: Deployed on [Vercel](https://vercel.com) with automatic deployment from main branch
- **Backend**: Deployed on [Render](https://render.com) with WebSocket support and health checks
- **Database**: Hosted on [Supabase](https://supabase.com) with PostgreSQL and built-in authentication

### Deployment Configuration
- `frontend/vercel.json` - Vercel deployment settings
- `backend/render.yaml` - Render service configuration
- Environment variables configured via platform dashboards

## 🎮 Current Features

### ✅ Implemented Features
- **User Authentication**: Login/Register with JWT tokens and Supabase integration
- **Quiz Creation System**: 
  - Metadata forms with thumbnail upload
  - Question builder with image support
  - Answer options with explanations
  - Quiz settings and reordering
  - Auto-save functionality
- **Dashboard**: User quiz management and creation portal
- **Real-time Game Rooms**: Socket.IO powered multiplayer sessions
- **Host Controls**: 
  - Game management and player monitoring
  - Live settings panel with real-time updates
  - Host lobby with player terminal display
- **Game Settings System**:
  - Comprehensive settings management (11 core settings)
  - Real-time sync between question sets and active games
  - Auto-save with debouncing for smooth UX
  - Settings categories: Game Flow, Scoring, Display Options, Advanced
- **Player Experience**: Join games with codes, real-time participation
- **Scoring System**: Live leaderboards and intermediate rankings
- **File Upload**: Support for quiz thumbnails and question images
- **Database Integration**: Complete Supabase setup with RLS policies

### 🚧 In Development
- Enhanced host game controls during gameplay
- Player waiting room improvements and animations
- Question loading from database integration
- Advanced game flow controls (question timing, explanations display)
- Real-time player status and connection management

### 📋 Planned Features
- Survey system for post-quiz feedback
- Advanced statistics and analytics dashboard
- Final confirmation page for quiz creation
- 2FA/Email verification
- Password change functionality
- Public quiz sharing and marketplace
- Enhanced UI/UX polish and mobile optimization
- Performance optimizations for 300+ concurrent users
- Game result persistence and historical data
- Advanced question types (true/false, fill-in-the-blank)
- Spectator mode implementation

## 🛠️ Tech Stack

### Frontend
- **React 19** with React Router for navigation
- **Vite** for fast development and building
- **Framer Motion** for smooth animations
- **Howler.js** for audio effects
- **Socket.IO Client** for real-time communication

### Backend
- **Node.js** with Express framework
- **Socket.IO** for WebSocket connections
- **JWT** for authentication
- **Multer** for file upload handling
- **bcryptjs** for password hashing

### Database & Services
- **Supabase** for PostgreSQL database and authentication
- **Render** for backend hosting
- **Vercel** for frontend hosting

## � Project Documentation

- **[Development Plan](./docs/plan.md)** - Project roadmap and architecture
- **[TODO List](./docs/TODO's.md)** - Current development tasks and progress
- **[Bug Tracker](./docs/Bug_Tracker.md)** - Known issues and resolutions
- **[Database Schema](./docs/database/current_schema.sql)** - Complete database structure
- **[Feature Requests](./docs/feature_req.md)** - Planned enhancements and ideas

## 🚀 Getting Started

### For Development
1. Follow the Quick Start guide above
2. Check the TODO list for current development priorities
3. Review the project plan for architectural decisions
4. Use the database schema for understanding data relationships

### For Contributors
1. Read the development documentation in `/docs`
2. Check current issues in Bug_Tracker.md
3. Follow the established code structure and patterns
4. Test changes with multiple users to ensure real-time functionality



## 🤝 Contributing

This project follows a structured development approach:
1. Review current TODOs and project plan
2. Create feature branches for new development
3. Test thoroughly with real-time multiplayer scenarios
4. Update documentation as needed

For detailed contribution guidelines, see the documentation in the `/docs` folder.
