# middleware/auth.js

## Imports
- jsonwebtoken
- @supabase/supabase-js
- ../utils/logger

## Exports
- AuthMiddleware

## Functions
- const

## Variables
- jwt
- logger
- isDevelopment
- isLocalhost
- supabaseUrl
- supabaseServiceKey
- supabaseJwtSecret
- supabaseAdmin
- tokenCache
- CACHE_DURATION

## Data Flow
- Inputs: jsonwebtoken, @supabase/supabase-js, ../utils/logger
- Outputs: AuthMiddleware