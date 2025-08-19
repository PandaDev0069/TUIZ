# routes/api/gameSettings.js

## Imports
- express
- ../../config/database
- ../../middleware/auth
- ../../utils/SecurityUtils
- ../../utils/RoomManager
- ../../utils/ActiveGameUpdater
- ../../utils/logger

## Exports
- router

## Functions
- updateActiveGameSettings

## Variables
- express
- router
- DatabaseManager
- AuthMiddleware
- SecurityUtils
- roomManager
- activeGameUpdater
- logger
- db
- DEFAULT_SETTINGS

## Data Flow
- Inputs: express, ../../config/database, ../../middleware/auth, ../../utils/SecurityUtils, ../../utils/RoomManager, ../../utils/ActiveGameUpdater, ../../utils/logger
- Outputs: router