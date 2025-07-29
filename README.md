# 🎯 TUIZ - Real-Time Quiz App

A Kahoot-style quiz app supporting **200-300 concurrent players** with real-time interactions, animations, and sound effects.

## 📁 Project Structure

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
│       • Real-time Socket.IO communication
│       • Quiz creation with image upload support
│       • Live scoreboard and intermediate rankings
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
│       • JWT-based authentication
│       • File upload handling (quiz thumbnails, question images)
│       • Game session management and scoring
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
        • Game sessions and player management
        • Authentication and user profiles
        • Real-time subscriptions support
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
- **User Authentication**: Login/Register with JWT tokens
- **Quiz Creation System**: 
  - Metadata forms with thumbnail upload
  - Question builder with image support
  - Answer options with explanations
  - Quiz settings and reordering
  - Auto-save functionality
- **Dashboard**: User quiz management and creation portal
- **Real-time Game Rooms**: Socket.IO powered multiplayer sessions
- **Host Controls**: Game management and player monitoring
- **Player Experience**: Join games with codes, real-time participation
- **Scoring System**: Live leaderboards and intermediate rankings
- **File Upload**: Support for quiz thumbnails and question images

### 🚧 In Development
- Final confirmation page for quiz creation
- Enhanced host game controls
- Player waiting room improvements
- Survey system for post-quiz feedback
- Advanced statistics and analytics

### 📋 Planned Features
- 2FA/Email verification
- Password change functionality
- Public quiz sharing
- Enhanced UI/UX polish
- Performance optimizations for 300+ concurrent users

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

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

This project follows a structured development approach:
1. Review current TODOs and project plan
2. Create feature branches for new development
3. Test thoroughly with real-time multiplayer scenarios
4. Update documentation as needed

For detailed contribution guidelines, see the documentation in the `/docs` folder.
