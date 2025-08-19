# routes/api/games.js

## Imports
- express
- ../../utils/RoomManager
- ../../helpers/authHelper
- ../../config/database
- ../../middleware/rateLimiter
- ../../utils/logger
- ../../validation

## Exports
- router

## Functions

## Variables
- express
- router
- roomManager
- DatabaseManager
- RateLimitMiddleware
- logger
- db

## Data Flow
- Inputs: express, ../../utils/RoomManager, ../../helpers/authHelper, ../../config/database, ../../middleware/rateLimiter, ../../utils/logger, ../../validation
- Outputs: router