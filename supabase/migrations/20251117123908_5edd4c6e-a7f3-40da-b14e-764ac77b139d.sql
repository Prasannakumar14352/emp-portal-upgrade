-- Create leave_types table
CREATE TABLE IF NOT EXISTS public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  default_days integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

-- Everyone can view active leave types
CREATE POLICY "Everyone can view active leave types"
  ON public.leave_types
  FOR SELECT
  USING (is_active = true);

-- HR and managers can insert leave types
CREATE POLICY "HR and managers can insert leave types"
  ON public.leave_types
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- HR and managers can update leave types
CREATE POLICY "HR and managers can update leave types"
  ON public.leave_types
  FOR UPDATE
  USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- HR and managers can delete leave types
CREATE POLICY "HR and managers can delete leave types"
  ON public.leave_types
  FOR DELETE
  USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Insert default leave types
INSERT INTO public.leave_types (name, default_days, description) VALUES
  ('Annual Leave', 14, 'Annual paid leave'),
  ('Sick Leave', 1, 'Medical leave for illness'),
  ('Compassionate Leave', 3, 'Leave for family emergencies'),
  ('Loss of Pay', 15, 'Unpaid leave'),
  ('Paternity Leave', 3, 'Leave for new fathers')
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_leave_types_updated_at
  BEFORE UPDATE ON public.leave_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index
CREATE INDEX IF NOT EXISTS idx_leave_types_active ON public.leave_types(is_active);