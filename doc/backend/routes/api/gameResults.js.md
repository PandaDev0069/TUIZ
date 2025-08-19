# routes/api/gameResults.js

## Imports
- express
- ../../config/database
- @supabase/supabase-js
- ../../middleware/auth
- ../../middleware/rateLimiter
- ../../utils/logger

## Exports
- router

## Functions

## Variables
- express
- router
- DatabaseManager
- AuthMiddleware
- RateLimitMiddleware
- logger
- auth
- db

## Data Flow
- Inputs: express, ../../config/database, @supabase/supabase-js, ../../middleware/auth, ../../middleware/rateLimiter, ../../utils/logger
- Outputs: router