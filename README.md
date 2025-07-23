# 🎯 TUIZ - Real-Time Quiz App

A Kahoot-style quiz app supporting **200-300 concurrent players** with real-time interactions, animations, and sound effects.

## 📁 Project Structure

```
/TUIZ
├── /frontend       ← React + Vite (deployed on Vercel)
│   └── Features:
│       • Responsive UI (mobile-first)
│       • Framer Motion for animations
│       • Howler.js for sound effects
│       • Connects to backend via Socket.IO
│
├── /backend        ← Node.js + Express + Socket.IO (deployed on Render)
│   └── Features:
│       • Handles real-time communication (game rooms, player events)
│       • Manages game sessions, answer submissions, scoring
│       • Communicates with Supabase for persistent data
│
└── /database       ← Supabase (PostgreSQL + Auth, hosted in cloud)
    └── Features:
        • Stores quizzes, user data, session history, leaderboard
        • Optionally handles authentication
        • Supports REST and realtime subscriptions
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier)

### Setup

1. **Database Setup** (Supabase)
   ```bash
   cd database
   # Follow setup instructions in database/README.md
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🌐 Deployment

- **Frontend**: Deployed on [Vercel](https://vercel.com) (auto-deploy from main branch)
- **Backend**: Deployed on [Render](https://render.com) (supports WebSockets)
- **Database**: Hosted on [Supabase](https://supabase.com) (PostgreSQL + Auth)

## 🎮 Features

- **Real-time Multiplayer**: 200-300 concurrent players
- **Game Room System**: Join with short codes
- **Live Scoring**: Real-time leaderboards
- **Engaging UI**: Animations and sound effects
- **Mobile-First**: Responsive design
- **Free Hosting**: No paid services required

## 📝 License

MIT License - see individual sub-repositories for details.

## 🤝 Contributing

Each sub-repository has its own contribution guidelines. Please check:
- [Frontend Contributing](./frontend/README.md#contributing)
- [Backend Contributing](./backend/README.md#contributing)
- [Database Schema](./database/README.md)
