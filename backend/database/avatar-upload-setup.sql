-- ============================================================================
-- Avatar Upload Setup for SQL Server
-- ============================================================================
-- This script ensures the profiles table has the avatar_url column
-- Run this on your SQL Server database if you're upgrading from an older schema
-- ============================================================================

-- Check if avatar_url column exists, if not add it
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'profiles' 
    AND COLUMN_NAME = 'avatar_url'
)
BEGIN
    ALTER TABLE profiles ADD avatar_url NVARCHAR(500);
    PRINT 'Added avatar_url column to profiles table';
END
ELSE
BEGIN
    PRINT 'avatar_url column already exists in profiles table';
END

-- Verify the column
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'avatar_url';

PRINT 'Avatar upload setup complete!';
