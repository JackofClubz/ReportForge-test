-- Drop existing policies
DROP POLICY IF EXISTS "Users can view questions for accessible reports" ON report_questions;
DROP POLICY IF EXISTS "Users can insert questions for editable reports" ON report_questions;
DROP POLICY IF EXISTS "Users can update questions for editable reports" ON report_questions;
DROP POLICY IF EXISTS "Users can delete questions for editable reports" ON report_questions;

-- Create simpler, more permissive policies for testing
CREATE POLICY "Users can manage report questions" ON report_questions
  FOR ALL USING (
    -- User can access questions for reports they own or are assigned to
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_questions.report_id
      AND r.primary_qp_id = auth.uid()
    )
    OR
    -- User can access questions for reports in their organization
    EXISTS (
      SELECT 1 FROM reports r
      JOIN org_users ou ON r.org_id = ou.org_id
      WHERE r.id = report_questions.report_id
      AND ou.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same check for inserts/updates
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_questions.report_id
      AND r.primary_qp_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM reports r
      JOIN org_users ou ON r.org_id = ou.org_id
      WHERE r.id = report_questions.report_id
      AND ou.user_id = auth.uid()
    )
  );

-- Re-enable RLS
ALTER TABLE report_questions ENABLE ROW LEVEL SECURITY;
