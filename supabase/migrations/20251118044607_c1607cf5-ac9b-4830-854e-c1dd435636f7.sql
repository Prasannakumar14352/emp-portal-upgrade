-- Create performance_reviews table
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_period text NOT NULL,
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  overall_score numeric(3,1) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 5),
  quality_of_work numeric(3,1) CHECK (quality_of_work >= 0 AND quality_of_work <= 5),
  communication numeric(3,1) CHECK (communication >= 0 AND communication <= 5),
  teamwork numeric(3,1) CHECK (teamwork >= 0 AND teamwork <= 5),
  time_management numeric(3,1) CHECK (time_management >= 0 AND time_management <= 5),
  problem_solving numeric(3,1) CHECK (problem_solving >= 0 AND problem_solving <= 5),
  feedback text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, review_period)
);

-- Create performance_goals table
CREATE TABLE IF NOT EXISTS public.performance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'cancelled')),
  target_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'half-day')),
  work_hours numeric(4,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable RLS
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_reviews
CREATE POLICY "Users can view own reviews"
ON public.performance_reviews FOR SELECT
TO authenticated
USING (auth.uid() = employee_id);

CREATE POLICY "HR and managers can view all reviews"
ON public.performance_reviews FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "HR and managers can create reviews"
ON public.performance_reviews FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "HR and managers can update reviews"
ON public.performance_reviews FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Employees can acknowledge reviews"
ON public.performance_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = employee_id AND status = 'submitted')
WITH CHECK (auth.uid() = employee_id AND status = 'acknowledged');

-- RLS Policies for performance_goals
CREATE POLICY "Users can view own goals"
ON public.performance_goals FOR SELECT
TO authenticated
USING (auth.uid() = employee_id);

CREATE POLICY "HR and managers can view all goals"
ON public.performance_goals FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can create own goals"
ON public.performance_goals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can update own goals"
ON public.performance_goals FOR UPDATE
TO authenticated
USING (auth.uid() = employee_id);

CREATE POLICY "HR and managers can manage all goals"
ON public.performance_goals FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for attendance_records
CREATE POLICY "Users can view own attendance"
ON public.attendance_records FOR SELECT
TO authenticated
USING (auth.uid() = employee_id);

CREATE POLICY "HR and managers can view all attendance"
ON public.attendance_records FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can insert own attendance"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can update own attendance"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (auth.uid() = employee_id);

CREATE POLICY "HR and managers can manage all attendance"
ON public.attendance_records FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_performance_reviews_timestamp
BEFORE UPDATE ON public.performance_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_goals_timestamp
BEFORE UPDATE ON public.performance_goals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_timestamp
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate work hours
CREATE OR REPLACE FUNCTION calculate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    NEW.work_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
    
    -- Determine status based on check-in time (assuming 9 AM is standard)
    IF EXTRACT(HOUR FROM NEW.check_in_time AT TIME ZONE 'UTC') > 9 
       OR (EXTRACT(HOUR FROM NEW.check_in_time AT TIME ZONE 'UTC') = 9 
           AND EXTRACT(MINUTE FROM NEW.check_in_time AT TIME ZONE 'UTC') > 15) THEN
      NEW.status = 'late';
    ELSIF NEW.work_hours < 4 THEN
      NEW.status = 'half-day';
    ELSE
      NEW.status = 'present';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

CREATE TRIGGER calculate_attendance_work_hours
BEFORE INSERT OR UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION calculate_work_hours();