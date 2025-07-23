# Authentication Migration Guide

## ✅ Migration Complete: Custom JWT → Supabase JWT

The TUIZ application has been successfully migrated from custom JWT tokens to Supabase JWT tokens.

### What Changed

1. **Token Generation**: Now uses Supabase Auth instead of custom JWT signing
2. **Token Verification**: Uses Supabase's `getUser()` method for secure verification
3. **User Management**: Integrates with Supabase Auth system
4. **Error Handling**: Improved error messages for token-related issues

### For Existing Users

**You will need to log in again** after this update because:
- Old custom JWT tokens are no longer valid
- New Supabase JWT tokens will be issued upon login
- User accounts remain the same, only the token format changed

### For Developers

#### Backend Changes Made:

1. **AuthMiddleware** (`/backend/middleware/auth.js`):
   - Replaced custom JWT generation with Supabase Auth
   - Updated token verification to use Supabase methods
   - Added automatic user profile creation

2. **Auth Routes** (`/backend/routes/auth.js`):
   - Login now uses `supabase.auth.signInWithPassword()`
   - Registration uses `supabase.auth.admin.createUser()`
   - Returns Supabase JWT tokens instead of custom ones

3. **Server Authentication** (`/backend/server.js`):
   - Updated `getAuthenticatedUser()` function
   - Uses `supabaseAdmin.auth.getUser()` for verification
   - Improved error handling and debugging

#### Frontend Changes Made:

1. **AuthDebugger Component**: Updated to show Supabase token information
2. **Token Handling**: No changes needed - still uses Bearer tokens

### Environment Variables Required

Make sure these are set in your `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

### Token Format Comparison

**Before (Custom JWT)**:
```
Header: { "alg": "HS256", "typ": "JWT" }
Payload: { "id": "user_id", "email": "user@example.com", "name": "User Name" }
```

**After (Supabase JWT)**:
```
Header: { "alg": "HS256", "typ": "JWT" }
Payload: { 
  "sub": "user_id", 
  "email": "user@example.com", 
  "aud": "authenticated",
  "role": "authenticated",
  "iss": "https://your-project.supabase.co/auth/v1"
}
```

### Debugging Tools

1. **Auth Info Endpoint**: `GET /api/debug/auth-info`
2. **Token Verification**: `POST /api/debug/verify-token`
3. **Frontend Debugger**: Available in development mode (top-right corner)

### Benefits of Migration

- ✅ **Security**: Supabase-issued tokens are more secure
- ✅ **Integration**: Better integration with Supabase ecosystem
- ✅ **Features**: Access to Supabase Auth features (password reset, email verification, etc.)
- ✅ **Scalability**: Built-in user management and authentication flows
- ✅ **Debugging**: Better error messages and debugging tools

### Testing the Migration

1. Start the backend server
2. Try logging in with existing credentials
3. Check the AuthDebugger in development mode
4. Verify token format in browser DevTools
5. Test question set creation (should now work with Supabase tokens)

### Troubleshooting

If you encounter issues:

1. Clear browser localStorage: `localStorage.clear()`
2. Log out and log back in
3. Check browser console for errors
4. Use the debug endpoints to inspect tokens
5. Verify environment variables are set correctly

### What's Next

- Email verification can be enabled
- Password reset functionality can be added  
- Social auth providers can be integrated
- Role-based access control can be implemented

---

**Note**: This migration ensures that the JWT token verification issues are resolved and the application now uses industry-standard Supabase authentication.
