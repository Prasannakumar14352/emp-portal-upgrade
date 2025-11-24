-- Create storage bucket for payslips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payslips',
  'payslips',
  false,
  10485760, -- 10MB limit per file
  ARRAY['application/pdf']
);

-- RLS Policies for payslips bucket
-- Users can view their own payslips
CREATE POLICY "Users can view own payslips"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payslips' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- HR and managers can view all payslips
CREATE POLICY "HR and managers can view all payslips"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payslips' AND
  (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- HR and managers can upload payslips
CREATE POLICY "HR and managers can upload payslips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payslips' AND
  (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- HR and managers can delete payslips
CREATE POLICY "HR and managers can delete payslips"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payslips' AND
  (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);