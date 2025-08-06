# Database Functions Deployment Guide

## Issue
Your backend is getting 500 errors because the cleanup database functions are not deployed to your Supabase database.

## Error
```
❌ Get cleanup stats error: 500 Internal Server Error
```

## Solution

### Step 1: Deploy Database Functions
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `khpkxopohylfteixbggo`
3. Go to **SQL Editor** in the left sidebar
4. Create a new query
5. Copy and paste the entire content from `docs/database/cleanup_functions.sql`
6. Click **Run** to execute the SQL

### Step 2: Verify Functions
After running the SQL, you can verify the functions exist by running:

```sql
-- Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_cleanup_stats', 'cleanup_old_games_and_guests', 'preview_cleanup');
```

### Step 3: Test the Backend
Once the functions are deployed:
1. Restart your Render backend deployment (or wait for auto-restart)
2. The cleanup endpoints should now work properly

## Functions Being Deployed

- `get_cleanup_stats()` - Returns statistics about games and players
- `cleanup_old_games_and_guests()` - Performs automatic cleanup
- `preview_cleanup()` - Shows what would be cleaned up (dry run)

## Alternative Solution (Temporary)
If you can't deploy the functions right now, the backend will now handle the missing functions gracefully and return a warning message instead of crashing.

## Files to Deploy
- `docs/database/cleanup_functions.sql` - Main cleanup functions
- `docs/database/current_schema.sql` - Complete database schema (if needed)
