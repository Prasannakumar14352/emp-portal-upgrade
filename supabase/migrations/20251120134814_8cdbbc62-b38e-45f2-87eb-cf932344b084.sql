-- Add unique constraint to prevent duplicate user-role combinations
ALTER TABLE public.user_roles 
ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);

-- Update the handle_new_user function to prevent duplicate role assignments
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  -- Insert into profiles table (only if not exists)
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into employees table automatically (only if not exists)
  INSERT INTO public.employees (
    user_id, 
    full_name, 
    email, 
    department, 
    position,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'department', 'Not Assigned'),
    COALESCE(NEW.raw_user_meta_data->>'position', 'Employee'),
    'Active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default employee role (only if user has no roles yet)
  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, 'employee'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;