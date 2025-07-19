
# 🎯 GitHub Copilot Prompt: Real-Time Quiz App

## 🔥 Project Overview

Help me build a real-time, Kahoot-style quiz app with support for **200–300 concurrent players**, real-time answer submission, engaging animations, and fun sound effects. It must be **fully functional, scalable, and hosted using only free services**.

---

## 🧱 Tech Stack & Requirements

### Backend
- Node.js + Express
- Socket.IO for real-time communication
- In-memory data for room and player state (e.g., using Maps)
- No database unless needed for optional persistence

### Frontend
- React + Vite
- Framer Motion for animations
- Howler.js for sound effects
- Responsive layout (mobile-first)
- Rooms are joinable with short game codes

### Hosting
- Fly.io or Railway for backend (support WebSockets)
- Vercel or Netlify for frontend

---

## 📦 Load & Scalability
- Must handle **200–300 concurrent player connections**
- Optimize socket events, room logic, and broadcasting strategies

---

## 🎮 Core Features (MVP)
- Host can create and start a quiz session
- Players join via game code
- Questions are shown in sync to all players
- Players submit answers (one per question)
- Show correct answer + animated scoreboard
- Final winner announcement screen

---

## ✨ Fun & Interactivity (Required)
- Sound FX: buzzer, correct/wrong feedback, countdown
- Animations: transitions, answer feedback, scoreboard drop, confetti
- Game-like UI: vibrant fonts, emojis, icons, responsiveness

---

## 🌱 Stretch Goals (Optional)
- QR code for joining room
- Background music toggle
- Player avatars or emoji reactions

---

## 🚫 Constraints
- No paid APIs or services
- Fully deployable and usable for free
- Must be built solo in ~30 days

---

## 🤖 Copilot Suggestions
- Scaffold modular, testable components (React and backend)
- Generate clean Socket.IO server-client handlers
- Optimize for real-time performance
- Handle disconnects gracefully
- Simulate 300 clients for stress testing (Node script or Artillery)

---

_This file is your AI pair programming brief. Use it to guide completions, code generation, and architectural suggestions._
