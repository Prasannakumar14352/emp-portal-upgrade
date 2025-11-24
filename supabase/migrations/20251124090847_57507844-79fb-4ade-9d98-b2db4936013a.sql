-- Create payslip_notifications table to track email delivery
CREATE TABLE IF NOT EXISTS public.payslip_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  payslip_id UUID REFERENCES public.payslips(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payslip_notifications ENABLE ROW LEVEL SECURITY;

-- HR and managers can view all notification history
CREATE POLICY "HR and managers can view all notifications"
ON public.payslip_notifications
FOR SELECT
USING (
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- HR and managers can insert notifications
CREATE POLICY "HR and managers can insert notifications"
ON public.payslip_notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- HR and managers can update notifications
CREATE POLICY "HR and managers can update notifications"
ON public.payslip_notifications
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_payslip_notifications_employee ON public.payslip_notifications(employee_id);
CREATE INDEX idx_payslip_notifications_status ON public.payslip_notifications(status);
CREATE INDEX idx_payslip_notifications_created ON public.payslip_notifications(created_at DESC);