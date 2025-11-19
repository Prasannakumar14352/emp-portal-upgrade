-- ============================================================
-- TWO-FACTOR AUTHENTICATION AND NOTIFICATION SOUND MIGRATION
-- Run this script on your local SQL Server database
-- This adds 2FA columns to profiles and notification sound preferences
-- ============================================================

USE EmployeePortal;
GO

-- Step 1: Add Two-Factor Authentication columns to profiles table
PRINT 'Adding Two-Factor Authentication columns to profiles table...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'profiles') AND name = 'two_factor_secret')
BEGIN
    ALTER TABLE profiles ADD two_factor_secret NVARCHAR(MAX) NULL;
    PRINT '✓ Added two_factor_secret column';
END
ELSE
BEGIN
    PRINT '- two_factor_secret column already exists';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'profiles') AND name = 'two_factor_enabled')
BEGIN
    ALTER TABLE profiles ADD two_factor_enabled BIT NOT NULL DEFAULT 0;
    PRINT '✓ Added two_factor_enabled column';
END
ELSE
BEGIN
    PRINT '- two_factor_enabled column already exists';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'profiles') AND name = 'two_factor_backup_codes')
BEGIN
    ALTER TABLE profiles ADD two_factor_backup_codes NVARCHAR(MAX) NULL;
    PRINT '✓ Added two_factor_backup_codes column';
END
ELSE
BEGIN
    PRINT '- two_factor_backup_codes column already exists';
END

GO

-- Step 2: Add notification sound preferences to user_preferences table
PRINT '';
PRINT 'Adding notification sound preferences to user_preferences table...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'user_preferences') AND name = 'notification_sound')
BEGIN
    ALTER TABLE user_preferences ADD notification_sound NVARCHAR(50) NOT NULL DEFAULT 'default';
    PRINT '✓ Added notification_sound column';
END
ELSE
BEGIN
    PRINT '- notification_sound column already exists';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'user_preferences') AND name = 'notification_volume')
BEGIN
    ALTER TABLE user_preferences ADD notification_volume INT NOT NULL DEFAULT 50;
    PRINT '✓ Added notification_volume column';
END
ELSE
BEGIN
    PRINT '- notification_volume column already exists';
END

GO

-- Step 3: Verify the changes
PRINT '';
PRINT '=============================================================';
PRINT 'VERIFICATION: Checking profiles table columns...';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'profiles'
AND COLUMN_NAME IN ('two_factor_secret', 'two_factor_enabled', 'two_factor_backup_codes')
ORDER BY COLUMN_NAME;

PRINT '';
PRINT 'VERIFICATION: Checking user_preferences table columns...';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'user_preferences'
AND COLUMN_NAME IN ('notification_sound', 'notification_volume')
ORDER BY COLUMN_NAME;

GO

PRINT '';
PRINT '=============================================================';
PRINT 'MIGRATION COMPLETED SUCCESSFULLY!';
PRINT '=============================================================';
PRINT '';
PRINT 'Changes Applied:';
PRINT '  ✓ profiles.two_factor_secret - Stores encrypted TOTP secret';
PRINT '  ✓ profiles.two_factor_enabled - Boolean flag for 2FA status';
PRINT '  ✓ profiles.two_factor_backup_codes - JSON array of backup codes';
PRINT '  ✓ user_preferences.notification_sound - Sound preference (default/ding/chime/pop)';
PRINT '  ✓ user_preferences.notification_volume - Volume level (0-100)';
PRINT '';
PRINT 'New Features Available:';
PRINT '  • Two-Factor Authentication with TOTP';
PRINT '  • QR Code generation for authenticator apps';
PRINT '  • Backup codes for account recovery';
PRINT '  • Customizable notification sounds';
PRINT '  • Volume control for notifications';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Refresh your application';
PRINT '  2. Go to Settings to enable 2FA';
PRINT '  3. Customize notification sounds in Settings';
PRINT '=============================================================';
