# Issues Log: Quiz App

8. ✅ Order index conflicts causing duplicate constraint violations
9. ❌ Answer images not uploading - authentication issues in API
10. ❌ Question images not uploading - authentication issues in API  
11. Question type not being saved properly - backend receiving incorrect data
12. Intermediate save not working for answers
13. Explanation Image is not being deleted when the whole question set gets deleted.
14. Explanation description not allowing spaces
15. Fix big and bulky additional options re-oredring up and down buttons
16. ✅ Bulk saving of questions is not working, needs to save each questions individually - FIXED with bulk update API
17. ✅ Order index constraint violations when using up/down arrow reordering buttons Issues

### Example issues
- [Date] Issue: JWT verification failed  
  Cause: Supabase token mismatch between backend and client  
  Fix: Regenerated service role key and updated backend env vars

- [Date] Issue: Game state not syncing between players  
  Cause: Backend was using DB queries for every update  
  Fix: Introduced in-memory session store with periodic DB sync



## Active Issues

### 2025/01/28 - Critical Quiz Creation Issues
**Issues:**
1. ✅ Auto-save triggering too frequently (every 2 seconds instead of 1 minute)
2. ✅ Duplicate constraint violations on answer updates
3. ✅ 403 Forbidden errors when transitioning from metadata to questions (blank question save attempts)
4. ✅ Question ID format compatibility issues (numeric IDs vs temp_ format)
5. ✅ "No quiz ID available for image upload" error during page transitions (state timing issue)
6. ✅ Rapid auto-save conflicts between QuestionBuilder and main auto-save system
7. ✅ Double image uploads during save operations
8. ✅ Order index conflicts causing duplicate constraint violations
9. ✅ Answer images not uploading - authentication issues in API
10. ✅ Question images not uploading - authentication issues in API  
11. Question type not being saved properly - backend receiving incorrect data
12. Intermediate save not working for answers
13. Explanation Image is not being deleted when the whole question set gets deleted.
14. Explanation description not allowing spaces
15. Fix big and bulky additional options re-oredring up and down buttons
16. Bulk saving of questions is not working, needs to save each questions individaually

**Root Causes:**
- Auto-save mechanism using wrong timing (temporarySave vs scheduleAutoSave)
- Conflicting auto-save timers between QuestionBuilder (2-second) and main system (60-second)
- Backend API endpoints using old authentication method instead of AuthMiddleware
- Frontend attempting to save blank/empty questions causing 403 errors
- Duplicate constraint violations on answer order_index and question order_index
- React state update timing causing quiz ID to be unavailable for image uploads
- Incorrect ID validation logic treating timestamp IDs as existing backend IDs
- Double image uploads due to repeated save calls
- Order index conflicts from using activeQuestionIndex instead of actual array position
- Bulk delete answer endpoint having overly strict RLS validation
- Frontend passing wrong questionIndex (activeQuestionIndex vs actual array position)
- Missing logging for answer creation operations
- RLS permissions not properly configured for user-scoped operations

**Fixes Applied:**
- ✅ Fixed auto-save timing: Changed from 2-second debounce temporarySave to proper 60-second scheduleAutoSave
- ✅ Fixed duplicate answer constraints: Replaced bulk delete with smart create-or-update logic
- ✅ Fixed blank question save attempts: Added validation to prevent saving empty questions
- ✅ Fixed question ID format: Updated validation to handle numeric timestamp IDs alongside temp_ format
- ✅ Fixed image upload timing: Modified uploadPendingImages to accept quiz ID parameter to avoid state timing issues
- ✅ Fixed rapid auto-save conflicts: Disabled individual QuestionBuilder auto-save, centralized to main system
- ✅ Fixed numeric ID recognition: Improved logic to distinguish frontend timestamp IDs from real backend IDs
- ✅ Fixed double image uploads: Added checks to prevent uploading images that are already uploaded
- ✅ Fixed order index conflicts: Modified save logic to use actual array position instead of activeQuestionIndex
- ✅ Updated answers API to use AuthMiddleware.authenticateToken
- ✅ Updated question/answer image upload endpoints to use user-scoped Supabase clients
- ✅ Added comprehensive logging to track creation/upload operations
- ✅ Fixed database column references (image_url vs image_storage_path)
- ✅ Fixed API response format - returning question objects directly instead of wrapped responses
- ✅ Fixed duplicate .eq() clauses in question update queries
- ✅ Added comprehensive image cleanup for question set deletion (question images, answer images, explanation images)
- ✅ Updated all API endpoints to use consistent AuthMiddleware pattern
- ✅ Fixed API response format inconsistencies - all endpoints now return {success: boolean, data/error} format
- ✅ Fixed frontend question/answer handling to work with new backend response format
- ✅ Fixed constraint violations in up/down arrow reordering - added proper order normalization and delayed save triggers

**Status:** Major fixes implemented. Backend restarted with all changes. Ready for testing.

## Update Instructions
- After fixing an issue, move it to “Solved Issues” with date and cause.
- Always include: What caused it + How you solved it.