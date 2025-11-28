-- Add location columns to profiles table for employee location tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Add index for spatial queries (only if latitude and longitude exist)
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.latitude IS 'Employee location latitude coordinate';
COMMENT ON COLUMN profiles.longitude IS 'Employee location longitude coordinate';
COMMENT ON COLUMN profiles.location_address IS 'Human-readable address for employee location';