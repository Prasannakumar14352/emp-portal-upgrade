-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  manager_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Everyone can view departments
CREATE POLICY "Everyone can view departments"
ON public.departments
FOR SELECT
USING (true);

-- HR and managers can insert departments
CREATE POLICY "HR and managers can insert departments"
ON public.departments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- HR and managers can update departments
CREATE POLICY "HR and managers can update departments"
ON public.departments
FOR UPDATE
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Only HR can delete departments
CREATE POLICY "HR can delete departments"
ON public.departments
FOR DELETE
USING (has_role(auth.uid(), 'hr'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing departments from profiles table
INSERT INTO public.departments (name, description)
SELECT DISTINCT department, 'Migrated from existing data' as description
FROM public.profiles
WHERE department IS NOT NULL AND department != ''
ON CONFLICT (name) DO NOTHING;