-- Add unique constraint on employees.user_id for ON CONFLICT to work
ALTER TABLE public.employees 
ADD CONSTRAINT employees_user_id_unique UNIQUE (user_id);

-- Verify user_roles has unique constraint (add if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_role_key' 
    OR conname = 'user_roles_user_id_role_unique'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);
  END IF;
END $$;