# Host–Quiz Integration Overview

## Host Component Architecture

The host interface is split into themed component groups under `frontend/src/components/host`:

- **Dashboard** – `HostDashboard` acts as the central hub, wiring socket‑based state to overview, analytics and player panels via a `HostControlIntegration` service.
- **Control panel** – `ControlPanelContainer` provides tabbed navigation for game controls and settings, synchronizing updates over Socket.IO and supporting fullscreen mode.
- **Player management** – `RealTimePlayerManagement` maintains a live, filterable roster with individual and bulk actions, backed by a `PlayerDetailsModal` for moderation controls.
- **Analytics and reporting** – Components such as `AnalyticsSummary`, `LiveAnalytics`, `AdvancedAnalytics`, `EnhancedResults`, `ReportingSystem` and `DataExport` render real‑time metrics, historical reports and export tools.
- **UX systems** – `AudioSystem`, `AnimationSystem` and `MobileOptimization` supply cross‑cutting audio feedback, animation context and mobile adaptations.

## Host–Quiz Interaction and Game Flow

- **Backend endpoints and socket events**
  - REST routes manage pausing, resuming and skipping questions; they update room state and broadcast to players.
  - Socket handlers mirror these controls for real‑time play, adding timer management, player moderation and analytics requests.
- **Frontend integration**
  - `HostControlIntegration` bridges the dashboard to both socket events and HTTP APIs, exposing pause/resume, skip, emergency stop, timer adjustments and player management utilities.
  - `GameCreationBridge` augments session creation so new games request host‑control capabilities while remaining compatible with the legacy socket flow.

## Outstanding Work to Fully Hook Host Features

1. **Supply quiz data to the dashboard.** Game start flows should provide the question set and metadata so components like `GameOverview` and `AnalyticsSummary` show live content instead of placeholders.
2. **Complete player management and analytics.** Implement backend events (`playerUpdated`, `playerStats`, bulk actions) and matching APIs so `RealTimePlayerManagement` and analytics components receive real data.
3. **Persist host controls.** Ensure pause/resume, skip and emergency‑stop actions update storage and propagate the resulting game state to all clients.
4. **Integrate scoreboard and explanations.** Route player responses and scoring so quizzes and host analytics share leaderboard and explanation data for each question.
5. **Finalize results view and emergency recovery.** Populate question results, achievements and database persistence for emergency stops.
6. **UI polish and mobile support.** Follow the host‑control design plan to add animations, mobile optimizations and richer feedback loops across host components.

## Quiz Component Summary

- `useQuizCreation` manages draft creation, manual saves and auto‑saves during quiz authoring.
- `QuizSaveManager` performs API calls, cleaning metadata and supplying defaults for incremental saves.

## Connecting Quiz Components to Host Features

1. After authoring, pass the quiz’s question list to `GameCreationBridge` so the host dashboard receives full question data.
2. When starting a game, feed question and metadata into `HostDashboard` to populate placeholders and enable analytics.
3. As the game progresses, route player responses and scoring from quiz services to host analytics channels, enabling real‑time engagement metrics and final results.

## Current Status

- Emergency stop recovery persistence and real‑time analytics wiring remain TODOs.
- Many analytics cards and player moderation flows still depend on placeholder data.

