# Local Avatar Storage Implementation

## Overview
Avatar uploads are now stored in the local backend filesystem instead of Lovable Cloud storage.

## Storage Location
- **Local Path**: `backend/uploads/avatars/{user_id}/{timestamp}.jpg`
- **URL Path**: `http://localhost:3000/uploads/avatars/{user_id}/{timestamp}.jpg`

## Backend Changes

### 1. File Upload Route (`backend/routes/upload.js`)
- Handles multipart/form-data uploads using multer
- Stores files in `backend/uploads/avatars/{user_id}/`
- Automatically creates user directories if they don't exist
- Deletes old avatars when new ones are uploaded
- Validates file types (JPEG, PNG, WebP) and size (5MB max)

### 2. Server Configuration (`backend/server.js`)
- Serves uploaded files as static content via `/uploads` route
- Added upload route at `/api/upload`

### 3. Directory Structure
```
backend/
├── uploads/
│   └── avatars/
│       └── {user_id}/
│           └── {timestamp}.jpg
```

## Frontend Changes

### Updated `src/pages/Profile.tsx`
- Removed Supabase storage integration
- Uses fetch API to upload to local backend
- Sends FormData with avatar file and old avatar URL
- Updates profile with local backend URL

## Database Schema
No changes required. The `profiles.avatar_url` column stores the full URL:
```
http://localhost:3000/uploads/avatars/{user_id}/{timestamp}.jpg
```

## Security Considerations
1. **Authentication Required**: Upload endpoint requires valid JWT token
2. **User Isolation**: Each user has their own directory
3. **File Validation**: Type and size checks prevent malicious uploads
4. **Old File Cleanup**: Previous avatars are automatically deleted

## Testing
1. Start backend: `cd backend && npm start`
2. Upload a profile picture through the UI
3. Verify file exists in `backend/uploads/avatars/{user_id}/`
4. Verify image displays correctly in the profile
5. Upload another image and verify old one is deleted

## Production Considerations
- Consider using a CDN for better performance
- Implement backup strategy for uploads directory
- Add rate limiting to prevent abuse
- Consider storage quotas per user
- Add image optimization/compression on server side
