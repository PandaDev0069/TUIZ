# Database Usage Report

This document summarizes how the backend interacts with the Supabase PostgreSQL database schema defined in `current_schema.sql`.

## Overview of schema usage
The backend uses a Supabase PostgreSQL schema containing tables such as `answers`, `games`, `question_sets`, `questions`, `game_results`, `game_players`, `host_sessions`, and others. Express route files under `backend/routes` access these tables through the `DatabaseManager` or a direct Supabase client.

## Endpoints using the database
| Route file | Endpoints | Primary tables involved |
|------------|-----------|------------------------|
| **answers.js** | `GET /api/answers/question/:id` – fetch answers for a question; `DELETE /api/answers/question/:id`; `POST /api/answers/`; `PUT /api/answers/:id`; `DELETE /api/answers/:id`; bulk upload & image operations; `PUT /api/answers/question/:id/reorder` | `answers`, `questions`, `question_sets` |
| **questions.js** | `GET /api/questions/set/:id`; `POST /api/questions/bulk-upload-images`; `POST /api/questions/bulk`; `PUT /api/questions/bulk`; `PUT /api/questions/set/:id/reorder`; CRUD & image endpoints for individual questions | `questions`, `question_sets`, `answers` |
| **questionSets.js** | `GET /api/question-sets/public`; `GET /api/question-sets/my-sets`; `GET /api/question-sets/:id`; `POST /api/question-sets/:id/upload-thumbnail`; `DELETE /api/question-sets/:id/thumbnail`; `POST /api/question-sets/metadata`; `POST /api/question-sets/` | `question_sets` |
| **quiz.js** | Upload thumbnail, clone, create, read, update, publish, delete, and list quiz questions (`/api/quiz` paths) | `question_sets`, `questions`, `answers` |
| **gameResults.js** | `GET /api/game-results/game/:gameId`; `POST /api/game-results/create/:gameId`; `POST /api/game-results/finish/:gameId`; player history & stats; host summary; global leaderboard | `game_results`, `games`, `game_players`, `users` |
| **gameSettings.js** | `GET /api/game-settings/:questionSetId`; `PUT /api/game-settings/:questionSetId`; reset settings; `GET/PUT /api/game-settings/game/:gameId`; `PUT /api/game-settings/room/:roomCode` | `question_sets`, `games` |
| **auth.js** | Registration, login, profile retrieval/update, avatar upload/delete, logout, availability check | `users` |
| **debug.js** | Debug endpoints: list question sets and questions, clear all data, test database | `question_sets`, `questions` |
| **upload.js** | Image upload & deletion API | Supabase storage buckets (`avatars`, `quiz-thumbnails`, etc.) |

## Missing or unused database coverage
- **game_analytics_snapshots**, **host_sessions**, **player_actions**, and **game_players** have no dedicated REST endpoints; usage is limited to internal utilities or migrations.
- Host control routes (`backend/routes/api/host/*`) manipulate in-memory game state and do not persist actions (kicks, mutes, pauses) to `player_actions`, `host_sessions`, or related tables.
- `routes/api/host/gameCreation.js` references a `game_participants` table not present in the schema, indicating an outdated or missing migration and corresponding endpoints.

## Summary
- **Used tables**: `answers`, `questions`, `question_sets`, `games`, `game_results`, `users`—each has implemented endpoints.
- **Partially used tables**: `game_players` (read indirectly for stats but no direct CRUD endpoints).
- **Unused tables**: `game_analytics_snapshots`, `host_sessions`, `player_actions`—no endpoints interact with them.
- **Missing schema references**: Calls to `game_participants` table that does not exist.

