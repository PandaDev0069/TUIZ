# Backend Overview

This folder documents the Node.js backend of the TUIZ project. The backend is built with Express and integrates Supabase for database and authentication.

## Architecture

- **server.js** – Entry point that configures Express, socket.io, middleware, and Supabase connections.
- **config/** – Configuration modules for the database, game behavior, question mappings, and cleanup schedules.
- **routes/** – Express route handlers for authentication, quiz management, game control, and uploads.
- **services/** – Business logic for questions and game settings.
- **adapters/** – Helper to convert database records into game‑ready formats.
- **utils/** – Utility helpers including logging, scheduling, scoring, and security.
- **middleware/** – Authentication and rate limiting middleware.
- **sockets/** – Socket.io event handlers for host interactions.
- **scripts/** – One‑off Node scripts for migrations and maintenance tasks.
- **migrations/** – SQL files applied to Supabase to evolve the schema.
- **data/** – Static JSON data for development and tests.
- **test/** – Basic tests and scripts that exercise database and player management logic.

Each subdirectory is documented separately to describe the available modules and their responsibilities.
