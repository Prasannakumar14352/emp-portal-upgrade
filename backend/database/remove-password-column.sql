-- ============================================================================
-- REMOVE PASSWORD COLUMN FROM PROFILES TABLE
-- ============================================================================
-- This script removes the password_hash column from the profiles table
-- Execute this on your SQL Server database if the column exists
-- This is safe to run - it only removes the column if it exists

USE [your_database_name];
GO

-- Check if the column exists before attempting to drop it
IF EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'profiles' 
    AND COLUMN_NAME = 'password_hash'
)
BEGIN
    PRINT 'Removing password_hash column from profiles table...';
    
    ALTER TABLE profiles
    DROP COLUMN password_hash;
    
    PRINT '✅ password_hash column removed successfully!';
    PRINT '';
    PRINT 'The profiles table now uses OAuth authentication only.';
    PRINT 'Users will authenticate via Microsoft Azure AD or other OAuth providers.';
END
ELSE
BEGIN
    PRINT 'ℹ️ password_hash column does not exist in profiles table.';
    PRINT 'No action needed - table is already configured for OAuth authentication.';
END
GO

PRINT '';
PRINT '========================================';
PRINT 'Password Column Removal Complete';
PRINT '========================================';
PRINT '';
PRINT 'Current profiles table structure:';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'profiles'
ORDER BY ORDINAL_POSITION;
GO
