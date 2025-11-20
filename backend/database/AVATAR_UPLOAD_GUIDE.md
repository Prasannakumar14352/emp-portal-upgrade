# Avatar Upload - SQL Server Database Guide

## Database Changes Summary

**No changes required to SQL Server schema!** ✅

The `avatar_url` column already exists in the `profiles` table as part of the original schema. The avatar upload feature uses this existing column to store image URLs.

## Verification

To verify the `avatar_url` column exists in your SQL Server database, run:

```sql
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'avatar_url';
```

Expected result:
- **COLUMN_NAME**: avatar_url
- **DATA_TYPE**: nvarchar
- **CHARACTER_MAXIMUM_LENGTH**: 500
- **IS_NULLABLE**: YES

## How Avatar Upload Works

1. **Frontend**: User uploads image via drag-and-drop or file selection
2. **Cropping**: Image is cropped to 1:1 aspect ratio (circular crop)
3. **Optimization**: Image is resized to 300x300px and compressed (85% quality JPEG)
4. **Storage**: Optimized image is uploaded to Lovable Cloud storage (Supabase Storage)
5. **Database Update**: Public URL is saved to `profiles.avatar_url` in SQL Server

## Storage Location

Images are stored in Lovable Cloud storage with this structure:
```
avatars/
  └── {employee_id}/
      └── {timestamp}.jpg
```

## Backend API Endpoint

The existing `PATCH /api/users/:userId/profile` endpoint handles avatar URL updates:

```javascript
// Example request
PATCH /api/users/1/profile
{
  "avatar_url": "https://storage.lovable.dev/avatars/user123/1234567890.jpg"
}
```

## Features Implemented

✅ **Drag-and-Drop Upload** - User-friendly interface  
✅ **Image Validation** - Accepts JPEG, PNG, WebP (max 5MB)  
✅ **Image Cropping** - 1:1 aspect ratio with circular preview  
✅ **Image Optimization** - Resized to 300x300px, 85% JPEG quality  
✅ **Upload Progress** - Visual feedback during upload  
✅ **Old Image Cleanup** - Automatically deletes previous avatar  
✅ **Secure Storage** - Row-level security policies in place  

## Security

Storage bucket security is managed via Supabase RLS policies:
- Users can only upload to their own folder (`{employee_id}/`)
- Users can view all avatars (public bucket)
- Users can update/delete only their own avatars

## File Size Optimization

Before upload:
- Original image: Variable size (up to 5MB)
- After processing: ~20-80KB (300x300px JPEG at 85% quality)

This reduces storage costs and improves page load performance.

## Testing

1. Navigate to Profile page
2. Click camera icon on avatar
3. Drag-and-drop an image or click to browse
4. Adjust the crop area
5. Click "Upload"
6. Verify the avatar URL is saved in SQL Server `profiles` table

## Troubleshooting

**Issue**: Avatar not displaying after upload  
**Solution**: Check that the `avatar_url` column in SQL Server contains the full public URL

**Issue**: Upload fails  
**Solution**: Verify Lovable Cloud storage bucket is properly configured with RLS policies

**Issue**: Old avatars not being deleted  
**Solution**: Check storage bucket permissions and ensure the file path parsing is correct
