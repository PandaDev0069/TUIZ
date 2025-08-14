# Middleware

| File | Description |
| --- | --- |
| `middleware/hostAuth.js` | Validates that requests have host permissions for a given game room and optionally checks game state. |
| `middleware/rateLimiter.js` | Provides global and upload-specific rate limiting using `express-rate-limit`. |
| `middleware/auth.js` | General JWT authentication middleware for protected API routes. |
