# app.js

## Imports
- dotenv
- express
- cors
- jsonwebtoken
- ./utils/logger
- ./config/database
- ./utils/SupabaseAuthHelper
- ./utils/CleanupScheduler
- ./middleware/rateLimiter
- ./utils/storageConfig
- ./config/env
- ./config/cors
- ./routes/auth
- ./helpers/authHelper
- ./routes/api/questionSets
- ./routes/api/questions
- ./routes/api/answers
- ./routes/api/debug
- ./routes/api/games
- ./routes/api/quiz
- ./routes/upload
- ./routes/api/playerManagement
- ./routes/api/players
- ./routes/api/gameResults
- ./routes/api/gameSettings
- ./routes/api/host/gameControl
- ./routes/api/host/playerManagement
- ./routes/api/host/gameCreation

## Exports
- { createApp }

## Functions
- createApp
- doesn
- not

## Variables
- express
- cors
- jwt
- logger
- DatabaseManager
- SupabaseAuthHelper
- CleanupScheduler
- RateLimitMiddleware

## Data Flow
- Inputs: dotenv, express, cors, jsonwebtoken, ./utils/logger, ./config/database, ./utils/SupabaseAuthHelper, ./utils/CleanupScheduler, ./middleware/rateLimiter, ./utils/storageConfig, ./config/env, ./config/cors, ./routes/auth, ./helpers/authHelper, ./routes/api/questionSets, ./routes/api/questions, ./routes/api/answers, ./routes/api/debug, ./routes/api/games, ./routes/api/quiz, ./routes/upload, ./routes/api/playerManagement, ./routes/api/players, ./routes/api/gameResults, ./routes/api/gameSettings, ./routes/api/host/gameControl, ./routes/api/host/playerManagement, ./routes/api/host/gameCreation
- Outputs: { createApp }