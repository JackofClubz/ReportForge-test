-- Add soft delete support to reports table
-- This migration adds a deleted_at column to the reports table to enable soft deletes

ALTER TABLE reports 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN reports.deleted_at IS 'Timestamp when the report was soft deleted. NULL means not deleted.';

-- Create an index on deleted_at for performance when filtering
CREATE INDEX idx_reports_deleted_at ON reports(deleted_at);

-- Update RLS policies to exclude soft-deleted reports from normal queries
-- We'll update the existing policies to filter out deleted reports

-- Drop and recreate the main SELECT policies for reports to include deleted_at filter
DROP POLICY IF EXISTS "Admins and QPs can view all org reports" ON reports;
DROP POLICY IF EXISTS "Editors, Viewers, Signers can view assigned reports" ON reports;

-- Recreate SELECT policies with soft delete filter
CREATE POLICY "Admins and QPs can view all org reports" ON reports
FOR SELECT
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.user_id = auth.uid()
      AND ou.org_id = reports.org_id
      AND ou.role IN ('admin', 'qp')
  )
);

CREATE POLICY "Editors, Viewers, Signers can view assigned reports" ON reports
FOR SELECT
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.report_users ru
    WHERE ru.report_id = reports.id
      AND ru.user_id = auth.uid()
      AND ru.role IN ('editor', 'viewer', 'signer')
  )
);

-- Add a new policy to allow admins to view soft-deleted reports (for restoration if needed)
CREATE POLICY "Admins can view soft-deleted reports" ON reports
FOR SELECT
USING (
  deleted_at IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.user_id = auth.uid()
      AND ou.org_id = reports.org_id
      AND ou.role = 'admin'
  )
);

-- Add UPDATE policy for soft delete (only admins and QPs can soft delete)
CREATE POLICY "Admins and QPs can soft delete reports" ON reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.user_id = auth.uid()
      AND ou.org_id = reports.org_id
      AND ou.role IN ('admin', 'qp')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_users ou
    WHERE ou.user_id = auth.uid()
      AND ou.org_id = reports.org_id
      AND ou.role IN ('admin', 'qp')
  )
);
