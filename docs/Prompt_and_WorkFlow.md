# Prompt and Workflow – Quiz App

## Core Details – Quiz App

### Architecture
- **Database:** Supabase (PostgreSQL with RLS & Storage)
- **Backend:** Render (Node.js + Express)
- **Frontend:** Vercel (React + Vite)
- **Real-time Communication:** Socket.IO over WebSockets
- **Authentication:** Supabase Auth (JWT-based)

### Scalability & Player Capacity
- **Target Concurrent Players:** 200–300 per game session
- **Load Strategy:**
  - Use in-memory session management for active games
  - Offload non-critical operations (analytics, logs) to background tasks
  - Optimize payload size for all WebSocket messages

### Hosting Strategy
- Use only free-tier services without sacrificing performance
- Implement rate-limiting to avoid free-tier overuse
- Plan for easy migration to paid tiers or dedicated servers if traffic increases

### Performance & Optimization Rules
✅ **WebSockets for real-time communication:** No polling  
✅ **Minimize database queries:**
- Cache frequently accessed data in memory
- Use batched writes for score updates

✅ **Game state management:**
- Store active session state in server memory or Redis (if free tier available)
- Fallback to session storage on the client if necessary

✅ **Background Sync:**
- Perform DB updates during low-load moments (score screens, explanations)
- Use async workers to avoid blocking gameplay

✅ **Lightweight Assets:**
- Compress images & serve via CDN
- Lazy-load non-critical UI components

### Documentation
- Maintain a **README** with setup instructions.
- Keep an updated **API contract** for the backend (endpoints, WebSocket events).

---

## Current Status
2025/07/28 

### Major Systems Implemented & Operational:

✅ **Authentication System (Complete)**
- Supabase Auth integration with JWT tokens
- User registration/login with email validation  
- Profile management with avatar uploads
- Token verification middleware protecting all routes
- Row Level Security (RLS) policies enforcing user data access
- Comprehensive error handling and debugging tools

✅ **Real-time Game Engine**
- Socket.IO WebSocket server with room management
- Player joining/leaving with live updates
- Game state synchronization across all clients


✅ **Quiz Creation System**
- Advanced question builder with multiple question types
- Progressive auto-save preventing data loss


✅ **Game Hosting Interface** 
- Host lobby with real-time player monitoring
- Game control panel for question progression
- Live scoreboard updates during gameplay
- Player analytics and session statistics
- Room management with join/kick functionality
- End-game results and leaderboard display

✅ **Database & Storage**
- Supabase PostgreSQL with optimized schema
- Row Level Security policies protecting user data
- File storage for avatars, thumbnails, and images
- Automated backups and connection management
- Database debugging and testing utilities
- Migration system for schema updates

✅ **File Upload System**
- Multi-bucket storage (avatars, thumbnails, question images)
- Drag-and-drop upload interfaces
- Image compression and validation
- Storage quota management and cleanup
- Progressive upload with preview generation

### Recent Updates:
✅ **UI Improvements (2025/07/28)**
- Repositioned explanation modal to open at center screen for better user experience
- Aligned modal placement with the "add explanation" button location for intuitive interaction
- Improved modal positioning to be centered and easily accessible

---

## Completed Features

### Core Infrastructure
- **Supabase Integration:** Complete database setup with RLS policies
- **Authentication Flow:** Registration, login, profile management, JWT verification
- **Real-time Communication:** Socket.IO server with room management and live updates
- **File Storage:** Multi-bucket system for avatars, thumbnails, and content images

### Quiz Management
- **Quiz Builder:** Advanced question creation with multiple choice, true/false support
- **Metadata Management:** Categories, difficulty levels, tags, estimated duration
- **Progressive Saving:** Auto-save functionality preventing data loss
- **Image Integration:** Thumbnail and question image upload system
- **Content Organization:** Draft/published status, user-scoped content access

### Game Operations  
- **Room System:** Unique room code generation and player management
- **Live Gameplay:** Real-time question display, answer collection, scoring
- **Host Controls:** Game progression, player monitoring, session analytics
- **Scoreboard:** Live updates during gameplay, final leaderboard display

### User Experience
- **Responsive Design:** Mobile-friendly interface across all components
- **Toast Notifications:** User feedback system for all operations
- **Error Handling:** Comprehensive error management with user-friendly messages
- **Loading States:** Progressive loading indicators for all async operations

---

## Next Goals

### Performance Optimization
- [ ] Implement Redis caching for active game sessions
- [ ] Add database query optimization and indexing analysis
- [ ] Implement CDN integration for static assets
- [ ] Add WebSocket connection pooling for high concurrency

### Advanced Features
- [ ] Question analytics and difficulty adjustment
- [ ] Team-based quiz modes and collaborative features
- [ ] Advanced scoring algorithms with time bonuses
- [ ] Quiz sharing and community features

### Monitoring & Analytics
- [ ] Real-time performance monitoring dashboard
- [ ] Player engagement analytics and reporting
- [ ] System health monitoring and alerting
- [ ] Usage analytics for quiz creators

---

## AI Update Rules
1. **Every time a feature is added or changed**, append it to **Current Status**.  
2. When a feature is finalized, move it to **Completed Features**.  
3. If new optimization strategies or rules are discovered, update the **Core Details** section.  
4. Always keep architecture and performance sections in sync with actual implementation.  
5. Use this file as the **master prompt** for all AI/Copilot interactions to avoid hallucinations. 