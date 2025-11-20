-- Update holidays RLS policies to allow service role inserts
-- This allows the sync function to insert holidays

DROP POLICY IF EXISTS "HR and managers can insert holidays" ON public.holidays;

CREATE POLICY "HR and managers can insert holidays" ON public.holidays
FOR INSERT
WITH CHECK (
  -- Allow if authenticated user has hr/manager role
  (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'hr'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  ))
  -- OR allow service role (for sync operations)
  OR auth.jwt()->>'role' = 'service_role'
);

-- Update payslips RLS policies to allow service role inserts

DROP POLICY IF EXISTS "HR and managers can insert payslips" ON public.payslips;

CREATE POLICY "HR and managers can insert payslips" ON public.payslips
FOR INSERT
WITH CHECK (
  -- Allow if authenticated user has hr/manager role
  (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'hr'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  ))
  -- OR allow service role (for sync operations)
  OR auth.jwt()->>'role' = 'service_role'
);

-- Update leaves RLS policies to allow service role inserts for sync

DROP POLICY IF EXISTS "Users can insert own leaves" ON public.leaves;

CREATE POLICY "Users can insert own leaves" ON public.leaves
FOR INSERT
WITH CHECK (
  -- Allow if user is inserting their own leave
  (auth.uid() IS NOT NULL AND auth.uid() = employee_id)
  -- OR allow service role (for sync operations)
  OR auth.jwt()->>'role' = 'service_role'
);

-- Update leave_balances RLS policies to allow service role inserts

DROP POLICY IF EXISTS "HR and managers can insert leave balances" ON public.leave_balances;

CREATE POLICY "HR and managers can insert leave balances" ON public.leave_balances
FOR INSERT
WITH CHECK (
  -- Allow if authenticated user has hr/manager role
  (auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'hr'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  ))
  -- OR allow service role (for sync operations)
  OR auth.jwt()->>'role' = 'service_role'
);