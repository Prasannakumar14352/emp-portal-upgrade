-- Add 2FA columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;

-- Add notification sound preferences to user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_sound TEXT DEFAULT 'default';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_volume INTEGER DEFAULT 50;