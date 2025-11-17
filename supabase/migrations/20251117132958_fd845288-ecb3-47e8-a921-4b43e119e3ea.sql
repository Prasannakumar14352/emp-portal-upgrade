-- Add numeric employee_id to profiles and employees tables
-- This provides a human-readable numeric ID while keeping UUID for auth integration

-- Add employee_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN employee_id BIGINT GENERATED ALWAYS AS IDENTITY;

-- Add employee_id to employees table  
ALTER TABLE public.employees
ADD COLUMN employee_id BIGINT GENERATED ALWAYS AS IDENTITY;

-- Create unique indexes for employee_id
CREATE UNIQUE INDEX idx_profiles_employee_id ON public.profiles(employee_id);
CREATE UNIQUE INDEX idx_employees_employee_id ON public.employees(employee_id);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.employee_id IS 'Numeric employee ID for human-readable identification';
COMMENT ON COLUMN public.employees.employee_id IS 'Numeric employee ID for human-readable identification';