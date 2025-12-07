-- ADD DEPARTMENT NOTIFICATIONS COLUMN TO USER_PREFERENCES
-- Run this script to add the department_notifications preference column
-- ============================================================

PRINT 'Adding department_notifications column to user_preferences table...';

-- Add department_notifications column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'user_preferences') AND name = 'department_notifications')
BEGIN
    ALTER TABLE user_preferences ADD department_notifications BIT NOT NULL DEFAULT 1;
    PRINT '  ✓ Added department_notifications column with default value 1 (enabled)';
END
ELSE
BEGIN
    PRINT '  ✓ department_notifications column already exists';
END

-- Verify the column was added
PRINT '';
PRINT 'VERIFICATION:';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'user_preferences' 
AND COLUMN_NAME = 'department_notifications';

PRINT '';
PRINT '============================================================';
PRINT 'Migration completed successfully!';
PRINT '';
PRINT 'This preference controls whether users receive notifications';
PRINT 'when they are assigned to or removed from a department.';
PRINT '============================================================';
