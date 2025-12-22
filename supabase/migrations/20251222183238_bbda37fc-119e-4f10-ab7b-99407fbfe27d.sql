-- Insert demo users into profiles table
-- Note: These users need to be created via auth.users first
-- This migration creates placeholder profiles that will be linked when demo users sign up

-- Create a function to set up demo users (to be called after auth users are created)
CREATE OR REPLACE FUNCTION public.setup_demo_user(
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user ID from profiles by email
  SELECT id INTO v_user_id FROM public.profiles WHERE email = p_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Update the profile with demo user info
    UPDATE public.profiles 
    SET full_name = p_full_name,
        department = CASE 
          WHEN p_role = 'hr' THEN 'Human Resources'
          WHEN p_role = 'manager' THEN 'Operations'
          ELSE 'General'
        END,
        position = CASE 
          WHEN p_role = 'hr' THEN 'HR Manager'
          WHEN p_role = 'manager' THEN 'Team Manager'
          ELSE 'Staff Member'
        END
    WHERE id = v_user_id;
    
    -- Remove any existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    
    -- Insert the appropriate role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, p_role::app_role);
  END IF;
END;
$$;

-- Create a view for demo mode configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow HR to modify settings
CREATE POLICY "HR can manage app settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'hr'
    )
  );

-- Insert demo mode setting
INSERT INTO public.app_settings (key, value) 
VALUES ('demo_mode', 'true')
ON CONFLICT (key) DO NOTHING;