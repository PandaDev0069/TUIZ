# Avatar Upload and Profile Settings Testing Guide

This guide explains how to test the new profile settings modal with avatar upload functionality.

## Prerequisites

1. **Database Migration**: Run the migration script first
2. **Storage Setup**: Ensure Supabase storage is configured
3. **Backend Running**: Start the backend server
4. **Test User**: Have a registered user account

## Setup Instructions

### 1. Run Database Migration

```sql
-- Run this in Supabase SQL Editor
-- File: database/MIGRATION_TO_NEW_SCHEMA.sql
```

### 2. Setup Avatar Storage (if not included in migration)

```sql
-- Run this in Supabase SQL Editor  
-- File: database/AVATAR_STORAGE_SETUP.sql
```

### 3. Environment Variables

Ensure your backend `.env` file has:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## Testing the Profile Settings Modal

### Manual Testing Steps

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login to Dashboard**
   - Navigate to `http://localhost:5173`
   - Login with a real user account
   - Go to the Dashboard

4. **Open Profile Settings**
   - Click on your profile button (top right)
   - The profile settings modal should open

5. **Test Avatar Upload**
   - Click "画像を選択" (Select Image)
   - Choose a JPEG, PNG, or WebP image (max 5MB)
   - Click "アップロード" (Upload)
   - Verify the image appears in the preview

6. **Test Profile Update**
   - Change your display name
   - Click "保存" (Save)
   - Verify the changes are saved
   - Check that the avatar persists after page refresh

### Automated Testing

Run the avatar upload test script:

```bash
cd backend/test
# First, place a test image as 'test-avatar.png' in the test directory
node avatar-upload-test.js
```

**Note**: Update the test credentials in `avatar-upload-test.js` with a real test user.

## Features Implemented

### Frontend Features
- ✅ Profile Settings Modal
- ✅ Avatar Image Upload
- ✅ Image Preview
- ✅ File Type Validation (JPEG, PNG, WebP)
- ✅ File Size Validation (5MB max)
- ✅ Profile Name Update
- ✅ Responsive Design
- ✅ Loading States
- ✅ Error Handling

### Backend Features
- ✅ Avatar Upload Endpoint (`POST /api/auth/upload-avatar`)
- ✅ Profile Update Endpoint (`PUT /api/auth/update-profile`)
- ✅ File Type Validation
- ✅ File Size Validation
- ✅ Supabase Storage Integration
- ✅ Image URL Generation
- ✅ Database Updates
- ✅ Error Handling

### Database Features
- ✅ User Role System
- ✅ Avatar Storage Bucket
- ✅ Storage Policies
- ✅ Profile Update Triggers

## Security Features

1. **Authentication Required**: All endpoints require valid JWT
2. **File Validation**: Type and size checks
3. **Storage Policies**: Users can only access their own avatars
4. **SQL Injection Protection**: Parameterized queries
5. **CORS Protection**: Configured for frontend domain

## Troubleshooting

### Common Issues

1. **Storage Bucket Not Found**
   - Run the avatar storage setup SQL
   - Check Supabase storage dashboard

2. **Upload Fails with 400 Error**
   - Check file size (must be < 5MB)
   - Check file type (JPEG, PNG, WebP only)
   - Verify authentication token

3. **Image Not Displaying**
   - Check if storage bucket is public
   - Verify storage policies
   - Check network tab for 404 errors

4. **Profile Update Fails**
   - Verify name length (3-20 characters)
   - Check for duplicate names
   - Verify authentication

### Debug Steps

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls and responses
3. **Check Backend Logs**: Look for server errors
4. **Verify Database**: Check if user data is updated

## File Structure

```
backend/
├── routes/auth.js          # Auth endpoints with upload
├── middleware/auth.js      # Authentication middleware
└── test/
    └── avatar-upload-test.js # Automated test script

frontend/
├── src/
│   ├── components/
│   │   ├── ProfileSettingsModal.jsx
│   │   └── profileSettingsModal.css
│   └── pages/
│       ├── Dashboard.jsx   # Updated with profile button
│       └── dashboard.css   # Updated styles

database/
├── MIGRATION_TO_NEW_SCHEMA.sql    # Main migration
└── AVATAR_STORAGE_SETUP.sql       # Storage setup
```

## Production Deployment Notes

- Ensure storage bucket exists in production Supabase
- Update CORS settings for production domain
- Configure CDN for image optimization (optional)
- Set up image compression (optional)
- Monitor storage usage and costs

## Next Steps

After testing is complete, you can:

1. Add image compression/resizing
2. Add more avatar customization options
3. Implement avatar history/gallery
4. Add social media profile imports
5. Implement avatar cropping tools
