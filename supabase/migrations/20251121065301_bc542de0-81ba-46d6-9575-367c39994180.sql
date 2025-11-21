-- Create role_audit_log table to track all role changes
CREATE TABLE IF NOT EXISTS role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id integer NOT NULL,
  role text NOT NULL,
  action text NOT NULL CHECK (action IN ('assigned', 'removed', 'bulk_assigned')),
  changed_by integer NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_role_audit_employee ON role_audit_log(employee_id);
CREATE INDEX idx_role_audit_changed_by ON role_audit_log(changed_by);
CREATE INDEX idx_role_audit_changed_at ON role_audit_log(changed_at DESC);

-- Enable RLS
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: HR and managers can view all audit logs
CREATE POLICY "HR and managers can view role audit logs"
  ON role_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Policy: Service role can insert audit logs (for backend operations)
CREATE POLICY "Service role can insert audit logs"
  ON role_audit_log
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE role_audit_log IS 'Tracks all role assignment and removal actions for audit purposes';
COMMENT ON COLUMN role_audit_log.action IS 'Type of action: assigned, removed, or bulk_assigned';
COMMENT ON COLUMN role_audit_log.changed_by IS 'Employee ID of the user who made the change';
COMMENT ON COLUMN role_audit_log.notes IS 'Optional notes or reason for the change';