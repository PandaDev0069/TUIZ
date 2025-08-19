# middleware/hostAuth.js

## Imports
- jsonwebtoken
- ../utils/RoomManager
- ../utils/logger

## Exports
- {
  validateHostPermission,
  validateGameState,
  validateMinimumPlayers,
  hostActionRateLimit,
  validateHostActionPermissions,
  logHostAction
}

## Functions
- validateHostPermission
- validateGameState
- validateMinimumPlayers
- hostActionRateLimit
- validateHostActionPermissions
- logHostAction

## Variables
- jwt
- logger
- validateHostPermission
- validateGameState
- validateMinimumPlayers
- hostActionRateLimit
- validateHostActionPermissions
- logHostAction

## Data Flow
- Inputs: jsonwebtoken, ../utils/RoomManager, ../utils/logger
- Outputs: {
  validateHostPermission,
  validateGameState,
  validateMinimumPlayers,
  hostActionRateLimit,
  validateHostActionPermissions,
  logHostAction
}