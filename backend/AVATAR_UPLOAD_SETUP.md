# Avatar Upload Setup for SQL Server Backend

## Overview
Avatar uploads are now handled by the local SQL Server backend instead of Supabase storage.

## Setup Instructions

### 1. Install multer dependency
```bash
cd backend
npm install multer
```

### 2. Create uploads directory
The uploads directory will be created automatically when the first avatar is uploaded. However, you can create it manually:

```bash
mkdir -p backend/uploads/avatars
```

### 3. Backend Configuration
- Avatars are stored in `backend/uploads/avatars/`
- Files are named with format: `avatar-{timestamp}-{random}.{ext}`
- Supported formats: JPEG, JPG, PNG, WebP
- Maximum file size: 5MB
- Old avatars are automatically deleted when uploading a new one

### 4. Database
- Avatar URLs are stored in the `profiles` table in the `avatar_url` column
- URLs are stored as relative paths: `/uploads/avatars/filename.jpg`
- The backend serves these files as static content

## API Endpoint

### POST /api/users/:userId/avatar
Upload a new avatar image for a user.

**Authentication:** Required (JWT token)

**Authorization:** Users can only update their own avatar, or HR/Manager can update any user's avatar

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `avatar`
- File types: JPEG, PNG, WebP
- Max size: 5MB

**Response:**
```json
{
  "message": "Avatar uploaded successfully",
  "avatar_url": "/uploads/avatars/avatar-1234567890-987654321.jpg"
}
```

## Frontend Integration

The frontend (`src/pages/Profile.tsx`) uses the `userService.uploadAvatar()` method to upload avatars:

```typescript
const response = await userService.uploadAvatar(userId, blob);
```

The avatar is displayed using the full URL:
```typescript
const fullAvatarUrl = `http://localhost:3000${response.avatar_url}`;
```

## File Structure
```
backend/
├── uploads/
│   └── avatars/
│       ├── avatar-1234567890-123456.jpg
│       └── avatar-1234567890-234567.jpg
├── routes/
│   └── users.js (contains avatar upload endpoint)
└── server.js (serves static files from uploads)
```

## Security Features
- File type validation (only images)
- File size limit (5MB)
- Authentication required
- Authorization check (own profile or HR/Manager)
- Automatic cleanup of old avatar files
- SQL injection prevention using parameterized queries

## Troubleshooting

### Issue: Files not accessible
**Solution:** Make sure the server is serving static files:
```javascript
app.use('/uploads', express.static('uploads'));
```

### Issue: Permission denied when creating uploads directory
**Solution:** Ensure the backend process has write permissions:
```bash
chmod 755 backend/uploads
```

### Issue: Avatar not displaying
**Solution:** 
1. Check that the backend server is running
2. Verify the avatar URL in the database starts with `/uploads/avatars/`
3. Check browser console for CORS errors
4. Ensure the file exists in `backend/uploads/avatars/`

## Maintenance

### Cleanup old unused avatars
Old avatars are automatically deleted when a user uploads a new one. However, if a user is deleted, their avatar file may remain. Consider implementing a cleanup script to remove orphaned avatar files.

### Backup avatars
Include the `backend/uploads/avatars/` directory in your backup strategy.
