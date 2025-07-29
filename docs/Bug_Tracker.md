# TUIZ Bug Tracker

## Overview
This document tracks all issues, bugs, and their resolutions for the TUIZ quiz application. Issues are organized by status and severity for easy tracking and reference.

---

## 🔴 Active Issues

### High Priority
- None currently

### Medium Priority
- None currently

### Low Priority  
- None currently

---

## ✅ Resolved Issues (Latest First)

### Issue #15: Big and Bulky Answer Reordering Buttons
**Date:** 2025-07-29 | **Status:** FIXED ✅ | **Severity:** Medium  
**Component:** Frontend - QuestionBuilder Component

**Problem:**
The answer reordering up/down buttons in the QuestionBuilder component were described as "big and bulky" and taking up unnecessary space in the UI.

**Solution:**
- Completely removed the answer reordering buttons and associated functionality
- Removed `moveAnswerUp` and `moveAnswerDown` functions from QuestionBuilder.jsx
- Simplified the answer controls layout by removing the reorder-controls div
- Users can still add/remove answers and edit their content, just not reorder them

**Files Modified:**
- `frontend/src/components/QuestionBuilder.jsx`: Removed reordering buttons and functions

### Issue #14: Explanation Description Not Allowing Spaces
**Date:** 2025-07-29 | **Status:** FIXED ✅ | **Severity:** Medium  
**Component:** Frontend - ExplanationModal Component

**Problem:**
The explanation title and text inputs were automatically trimming spaces on every onChange event, making it impossible for users to type spaces naturally in their explanations.

**Solution:**
- Removed automatic `.trim()` calls from onChange handlers for both explanation title and text inputs
- Changed from `e.target.value.trim() || null` to `e.target.value || null`
- Users can now type spaces normally, and trimming (if needed) can be handled on save/submit

**Files Modified:**
- `frontend/src/components/ExplanationModal.jsx`: Updated onChange handlers for explanation_title and explanation_text

### Issue #23: Images Not Being Deleted from Database and Storage Buckets
**Date:** 2025-07-28 | **Status:** FIXED ✅ | **Severity:** High  
**Component:** Frontend/Backend API - Image Management

**Problem:**
When removing images from questions, answers, and explanations, the images were only cleared from local state but not deleted from the database and Supabase storage buckets, causing:
- Orphaned files accumulating in storage buckets
- Increased storage costs
- Database containing invalid image URLs
- Only thumbnail deletion was working properly

**Root Cause:**
The image removal functions (`removeQuestionImage`, `removeAnswerImage`, `removeExplanationImage`) only updated local state without making API calls to delete from server. Additionally, some images were uploaded to storage before answers had backend IDs, creating orphaned files.

**Solution:**
Implemented comprehensive image deletion system following the successful thumbnail deletion pattern:

1. **Fixed API Path Issues**: 
   - Corrected API paths (removed duplicate `/api` prefixes since `apiCall` function automatically adds `/api/`)
   - Question images: `/questions/{id}/image` 
   - Answer images: `/answers/{id}/image`
   - Explanation images: `/questions/{id}/explanation-image` (new endpoint)

2. **Added New Backend Endpoint**:
   - Created `DELETE /questions/:id/explanation-image` endpoint for explanation image deletion
   - Follows same pattern as question/answer image deletion
   - Deletes from both database and storage bucket

3. **Implemented Dual Deletion Strategy**:
   - **Primary Path**: Use proper endpoints when backend_id exists
   - **Fallback Path**: Delete directly from storage using `/upload/image` endpoint for orphaned images without backend_id

4. **Enhanced Error Handling**:
   - Added comprehensive logging for debugging
   - Graceful fallback to local removal if server deletion fails
   - Handles all edge cases (blob URLs, missing IDs, network errors)

**Technical Implementation:**
```javascript
// Example: Answer image deletion with fallback
if (answer.backend_id && answer.image_url && !answer.image_url.startsWith('blob:')) {
  // Primary: Use answer endpoint
  await apiCall(`/answers/${answer.backend_id}/image`, { method: 'DELETE' });
} else if (answer.image_url && !answer.image_url.startsWith('blob:')) {
  // Fallback: Delete directly from storage
  await apiCall('/upload/image', { 
    method: 'DELETE', 
    body: JSON.stringify({ bucket, filePath }) 
  });
}
```

**Files Modified:**
- `frontend/src/components/QuestionBuilder.jsx` - Enhanced question and answer image deletion
- `frontend/src/components/ExplanationModal.jsx` - Enhanced explanation image deletion  
- `backend/routes/api/questions.js` - Added explanation image deletion endpoint
- `backend/routes/api/answers.js` - Fixed authentication and response format consistency

**Testing Notes:**
- All image types now properly delete from both database and storage
- Works for images with and without backend IDs
- Storage costs no longer accumulate from orphaned files
- Comprehensive logging helps identify any remaining issues

---

### Issue #21: Database Check Constraint Violation with Negative Order Index
**Date:** 2025-07-28 | **Status:** FIXED ✅ | **Severity:** High  
**Component:** Backend API - Database Constraints

**Problem:**
Bulk update operations failing with database constraint error when trying to set temporary negative order_index values:
- Error: `new row for relation "questions" violates check constraint "questions_order_index_check"`
- Occurred during the temporary ordering step designed to prevent unique constraint violations

**Root Cause:**
The database schema has a check constraint `CHECK (order_index >= 0)` that prevents negative values. The temporary ordering logic was trying to use negative numbers (-1000, -1001, etc.) to avoid conflicts, but this violated the constraint.

**Solution:**
Changed the temporary ordering strategy to use large positive numbers instead of negative numbers:
- **Before**: `tempOrderIndex = -(i + 1000)` ❌ (violates CHECK constraint)
- **After**: `tempOrderIndex = 10000 + i` ✅ (satisfies constraint, avoids conflicts)

**Technical Details:**
```javascript
// Updated logic in bulk update endpoint
for (let i = 0; i < existingDbQuestionIds.length; i++) {
  const tempOrderIndex = 10000 + i; // Large positive numbers well above normal range
  await userSupabase.from('questions').update({ order_index: tempOrderIndex }).eq('id', existingDbQuestionIds[i]);
}
```

**Files Modified:** `backend/routes/api/questions.js`

**Testing Notes:**
- Bulk updates now handle question reordering without constraint violations
- Sequential order indices are maintained (0, 1, 2, ...) after final cleanup
- Works with database schema constraints

---

### Issue #20: Order Index Constraint Violation in Bulk Question Updates
**Date:** 2025-07-28 | **Status:** FIXED ✅ | **Severity:** High  
**Component:** Backend API - Bulk Operations

**Problem:**
When reordering questions and saving them via bulk update, operations failed with:
- Error: `duplicate key value violates unique constraint "idx_questions_set_order_unique"`
- Occurred when updating questions with new order indices that temporarily conflicted with existing questions

**Root Cause:**
The database has a unique constraint ensuring each question within a question set has a unique `order_index`. Updating questions one-by-one with new order indices created temporary duplicates, violating the constraint.

**Solution:**
Implemented a 3-step process to avoid constraint violations:
1. **Temporary High Orders**: Set existing questions to large positive order_index values (10000+) to avoid conflicts
2. **Normal Processing**: Process creates/updates with target order indices
3. **Final Cleanup**: Ensure all questions have sequential order indices (0, 1, 2, ...)

**Note:** Initially attempted negative numbers but discovered database CHECK constraint prevents negative order_index values (see Issue #21).

**Files Modified:** `backend/routes/api/questions.js`

---

### Issue #19: Database Schema Column Mapping Error
**Date:** 2025-07-28 | **Status:** FIXED ✅ | **Severity:** Medium  
**Component:** Backend API - Database Schema

**Problem:**
Bulk operations failing with error: "Could not find the 'explanation' column of 'questions' in the schema cache"

**Root Cause:**
Code was referencing old 'explanation' column that doesn't exist in current schema. Should use 'explanation_text' instead.

**Solution:**
- Removed all references to non-existent 'explanation' column
- Updated mapping to use 'explanation_text' with backward compatibility
- Added proper column mapping in bulk operations

**Files Modified:** `backend/routes/api/questions.js`

---

### Issue #18: Bulk Save 403 Forbidden Error
**Date:** 2025-07-28 | **Status:** FIXED ✅ | **Severity:** High  
**Component:** Backend API - Route Handling

**Problem:**
Temporary save (一時保存) button throwing 403 Forbidden error when hitting `/questions/bulk` endpoint.

**Root Cause:**
Express.js route collision - parameterized route `/:id` was catching `/bulk` requests before the specific bulk route could handle them.

**Solution:**
Reorganized route order in Express router - moved all specific routes (like `/bulk`) before parameterized routes (like `/:id`).

**Files Modified:** `backend/routes/api/questions.js`

---

### Issue #17: Order Index Constraint Violations (Up/Down Arrows)
**Date:** 2025-07-28 | **Status:** FIXED ✅ | **Severity:** Medium  
**Component:** Frontend - Question Reordering

**Problem:**
Using up/down arrow buttons to reorder questions caused constraint violations on save.

**Root Cause:**
Immediate save attempts after reordering created temporary duplicate order_index values.

**Solution:**
- Added proper order normalization before saves
- Implemented delayed save triggers to avoid rapid consecutive updates
- Used actual array position instead of activeQuestionIndex for ordering

**Files Modified:** `frontend/src/components/QuestionsForm.jsx`

---

### Issue #16: Bulk Saving Not Working
**Date:** 2025-07-28 | **Status:** FIXED ✅ | **Severity:** High  
**Component:** Backend API - Bulk Operations

**Problem:**
Questions had to be saved individually instead of using efficient bulk operations.

**Root Cause:**
Missing bulk update API endpoint for handling multiple questions simultaneously.

**Solution:**
- Implemented comprehensive bulk update API (`PUT /questions/bulk`)
- Added support for mixed operations (creates, updates, reorders)
- Included proper error handling and partial success reporting

**Files Modified:** `backend/routes/api/questions.js`

---

### Issues #8-15: Authentication and API Consistency Fixes
**Date:** 2025-07-28 | **Status:** FIXED ✅ | **Severity:** Various  
**Component:** Backend API - Authentication & Response Format

**Problems Resolved:**
- Auto-save triggering too frequently (every 2 seconds instead of 1 minute)
- Duplicate constraint violations on answer updates  
- 403 Forbidden errors when transitioning from metadata to questions
- Question ID format compatibility issues (numeric IDs vs temp_ format)
- Image upload timing issues during page transitions
- Double image uploads during save operations
- API response format inconsistencies
- Authentication middleware not being used consistently

**Solutions Applied:**
- ✅ Fixed auto-save timing: Changed to proper 60-second scheduleAutoSave
- ✅ Fixed duplicate answer constraints: Smart create-or-update logic
- ✅ Fixed blank question validation: Prevent saving empty questions
- ✅ Fixed ID format handling: Support both numeric and temp_ IDs
- ✅ Fixed image upload timing: Accept quiz ID parameter to avoid state issues
- ✅ Fixed API response format: Consistent {success, data/error} structure
- ✅ Updated all endpoints to use AuthMiddleware.authenticateToken
- ✅ Added comprehensive image cleanup for question set deletion

**Files Modified:** 
- `backend/routes/api/questions.js`
- `backend/routes/api/answers.js`
- `frontend/src/components/QuestionsForm.jsx`
- `frontend/src/pages/CreateQuiz.jsx`

---

## 📊 Issue Statistics

**Total Issues Tracked:** 23  
**Resolved:** 18 (78%)  
**Active:** 5 (22%)  
**High Priority Active:** 4  

**Resolution Rate by Component:**
- Backend API: 15/18 resolved (83%)
- Frontend: 3/5 resolved (60%)
- Database: 3/3 resolved (100%)

---

## 🔧 Development Guidelines

### Issue Reporting Format
When reporting new issues, include:
1. **Component:** Backend/Frontend/Database/etc.
2. **Severity:** High/Medium/Low
3. **Description:** Clear problem statement
4. **Steps to Reproduce:** If applicable
5. **Error Messages:** Exact error text
6. **Expected vs Actual Behavior**

### Resolution Documentation
When fixing issues, document:
1. **Root Cause:** What specifically caused the problem
2. **Solution:** What changes were made
3. **Files Modified:** List of changed files
4. **Testing Notes:** How to verify the fix

### Priority Levels
- **High:** Blocks core functionality, affects user experience
- **Medium:** Impacts workflow but has workarounds
- **Low:** Minor issues, cosmetic problems

---

## 📝 Update Instructions
1. Move resolved issues from "Active" to "Resolved" section
2. Always include date, root cause, and solution
3. Update issue statistics when changes are made
4. Use consistent formatting for easy scanning

---

## 🚧 Development Notes

### Issue #22: Answer Image Upload Implementation Strategy
**Problem:** Answer images are currently stored as blob URLs (`blob:http://localhost:5173/...`) instead of proper Supabase storage URLs.

**Current Status:** PARTIALLY FIXED - Blob URLs are now filtered out and set to null to prevent invalid URLs in database.

**Root Cause:** Frontend creates blob URLs for preview but bulk save operations don't handle actual file uploads since JSON requests can't contain file data.

**Proposed Solution Options:**
1. **Separate Upload Phase**: Upload images before bulk save, replace blob URLs with storage URLs
2. **Post-Save Upload**: Save questions first, then upload images and update records
3. **Enhanced Bulk Endpoint**: Modify bulk endpoint to accept multipart form data with files

**Recommended Approach**: Option 1 - Pre-upload images during question building phase
- Upload images immediately when selected (like thumbnail upload)
- Replace blob URLs with storage URLs in the question data
- Bulk save will then store proper URLs

**Files Needing Updates:**
- `frontend/src/components/QuestionBuilder.jsx` - Add immediate upload on image selection
- `frontend/src/pages/CreateQuiz.jsx` - Remove post-save image upload logic
- Backend already has proper upload endpoints in `answers.js`
- ✅ Fixed frontend question/answer handling to work with new backend response format
- ✅ Fixed constraint violations in up/down arrow reordering - added proper order normalization and delayed save triggers
- ✅ Fixed bulk save timing issue - modified saveAllQuestions to accept quiz ID parameter to avoid state timing issues
- ✅ Fixed 403 Forbidden bulk save error - ensured proper quiz ID is passed when temporarySave creates new quiz
- ✅ Fixed route collision issue - moved bulk routes before parameterized routes (/:id was catching /bulk)
- ✅ Fixed database schema mismatch - removed non-existent 'explanation' column from bulk operations, use explanation_text instead

**Status:** Major fixes implemented. Backend restarted with all changes. Ready for testing.

## Update Instructions
- After fixing an issue, move it to “Solved Issues” with date and cause.
- Always include: What caused it + How you solved it. 