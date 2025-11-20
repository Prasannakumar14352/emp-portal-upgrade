-- Create leave_balances table
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  year INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  total_days NUMERIC NOT NULL DEFAULT 0,
  used_days NUMERIC NOT NULL DEFAULT 0,
  remaining_days NUMERIC NOT NULL DEFAULT 0,
  carry_forward_days NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, year, leave_type)
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_balances
CREATE POLICY "Users can view own leave balances"
ON public.leave_balances
FOR SELECT
USING (auth.uid() = employee_id);

CREATE POLICY "HR and managers can view all leave balances"
ON public.leave_balances
FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "HR and managers can insert leave balances"
ON public.leave_balances
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "HR and managers can update leave balances"
ON public.leave_balances
FOR UPDATE
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create comments table for leave requests
CREATE TABLE public.leave_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID NOT NULL REFERENCES public.leaves(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_comments
CREATE POLICY "Users can view comments on own leaves"
ON public.leave_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leaves 
    WHERE leaves.id = leave_comments.leave_id 
    AND leaves.employee_id = auth.uid()
  )
);

CREATE POLICY "HR and managers can view all comments"
ON public.leave_comments
FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "HR and managers can insert comments"
ON public.leave_comments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Function to automatically update leave balances
CREATE OR REPLACE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'Approved' THEN
    -- Update or create leave balance record
    INSERT INTO public.leave_balances (employee_id, year, leave_type, used_days, remaining_days, total_days)
    VALUES (
      NEW.employee_id,
      EXTRACT(YEAR FROM NEW.start_date)::INTEGER,
      NEW.leave_type,
      NEW.days,
      20 - NEW.days, -- Assuming 20 days default
      20
    )
    ON CONFLICT (employee_id, year, leave_type)
    DO UPDATE SET
      used_days = leave_balances.used_days + NEW.days,
      remaining_days = leave_balances.total_days - (leave_balances.used_days + NEW.days),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update leave balances when leaves are approved
CREATE TRIGGER update_balance_on_leave_approval
AFTER INSERT OR UPDATE ON public.leaves
FOR EACH ROW
EXECUTE FUNCTION update_leave_balance();

-- Add trigger for updated_at on leave_balances
CREATE TRIGGER update_leave_balances_updated_at
BEFORE UPDATE ON public.leave_balances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();