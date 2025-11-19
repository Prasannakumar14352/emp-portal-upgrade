-- ============================================================
-- CREATE DEFAULT PREFERENCES FOR EXISTING USERS
-- Run this script to add default preferences for all existing users
-- who don't have preferences yet
-- ============================================================

USE EmployeePortal;
GO

PRINT '=============================================================';
PRINT 'Creating default preferences for existing users...';
PRINT '=============================================================';
PRINT '';

-- Insert default preferences for all users who don't have preferences yet
INSERT INTO user_preferences (
    user_id, 
    dark_mode, 
    compact_view, 
    email_notifications, 
    push_notifications, 
    leave_update_notifications,
    notification_sound, 
    notification_volume,
    created_at, 
    updated_at
)
SELECT 
    p.user_id,
    0 AS dark_mode,
    0 AS compact_view,
    1 AS email_notifications,
    1 AS push_notifications,
    1 AS leave_update_notifications,
    'default' AS notification_sound,
    50 AS notification_volume,
    GETDATE() AS created_at,
    GETDATE() AS updated_at
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 
    FROM user_preferences up 
    WHERE up.user_id = p.user_id
);

-- Get count of rows inserted
DECLARE @inserted_count INT = @@ROWCOUNT;

PRINT '';
PRINT '=============================================================';
PRINT 'COMPLETED!';
PRINT '=============================================================';
PRINT CONCAT('Created default preferences for ', @inserted_count, ' users');
PRINT '';
PRINT 'Default Settings Applied:';
PRINT '  • Dark Mode: Disabled';
PRINT '  • Compact View: Disabled';
PRINT '  • Email Notifications: Enabled';
PRINT '  • Push Notifications: Enabled';
PRINT '  • Leave Update Notifications: Enabled';
PRINT '  • Notification Sound: default';
PRINT '  • Notification Volume: 50';
PRINT '';
PRINT 'Note: From now on, preferences will be automatically created';
PRINT 'when new users sign up or log in for the first time.';
PRINT '=============================================================';

GO
