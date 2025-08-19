# routes/api/quiz.js

## Imports
- express
- multer
- path
- fs
- ../../config/database
- ../../middleware/auth
- ../../utils/SecurityUtils
- ../../middleware/rateLimiter
- ../../utils/logger
- ../../utils/ActiveGameUpdater

## Exports
- router

## Functions
- fileFilter
- copyImageToNewLocation

## Variables
- express
- multer
- path
- fs
- DatabaseManager
- AuthMiddleware
- SecurityUtils
- RateLimitMiddleware
- logger
- dbManager
- supabase
- router
- storage
- fileFilter
- upload

## Data Flow
- Inputs: express, multer, path, fs, ../../config/database, ../../middleware/auth, ../../utils/SecurityUtils, ../../middleware/rateLimiter, ../../utils/logger, ../../utils/ActiveGameUpdater
- Outputs: router