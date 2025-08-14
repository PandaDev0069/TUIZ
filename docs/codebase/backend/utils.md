# Utility Modules

| File | Description |
| --- | --- |
| `utils/OrderManager.js` | Helpers for maintaining question and answer order indices in the database. |
| `utils/ActiveGameUpdater.js` | Allows other modules to update active game metadata such as player caps. |
| `utils/scoringSystem.js` | Calculates player scores with streak and time bonuses. |
| `utils/RoomManager.js` | Tracks active game rooms and associated players. |
| `utils/storageConfig.js` | Validates environment variables related to Supabase storage. |
| `utils/logger.js` | Winston-based logger with consistent formatting and levels. |
| `utils/CleanupScheduler.js` | Periodically removes stale games and guest records according to cleanupConfig. |
| `utils/SecurityUtils.js` | Sanitizes filenames, user IDs, and storage paths to prevent security issues. |
| `utils/SupabaseAuthHelper.js` | Verifies Supabase JWT tokens and fetches associated user profiles. |
