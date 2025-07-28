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
*(Keep this updated with the latest progress)*  
- [Example] Implemented user authentication with Supabase  
- [Example] Added game session creation and WebSocket connection  

---

## Completed Features
- [List features that are fully implemented here]

---

## Next Goals
- [List immediate development goals here]

---

## AI Update Rules
1. **Every time a feature is added or changed**, append it to **Current Status**.  
2. When a feature is finalized, move it to **Completed Features**.  
3. If new optimization strategies or rules are discovered, update the **Core Details** section.  
4. Always keep architecture and performance sections in sync with actual implementation.  
5. Use this file as the **master prompt** for all AI/Copilot interactions to avoid hallucinations. 