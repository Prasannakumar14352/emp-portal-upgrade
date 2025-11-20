-- Update the handle_new_user function to also create an employee record
-- This ensures that any user logging in via Microsoft OAuth gets an employee record

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  -- Insert into employees table automatically
  -- Use metadata from OAuth provider if available
  INSERT INTO public.employees (
    employee_id, 
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
  );
  
  -- Assign default employee role
  INSERT INTO public.user_roles (employee_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;