-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.logout_time IS NOT NULL THEN
    NEW.session_duration = EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$;