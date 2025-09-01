-- Create report_questions table for storing user answers to report questions
CREATE TABLE IF NOT EXISTS report_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_section TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one answer per question per report
  CONSTRAINT unique_report_question UNIQUE (report_id, question_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_report_questions_report_id ON report_questions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_questions_section ON report_questions(question_section);

-- Enable RLS
ALTER TABLE report_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_questions
-- Users can view questions for reports they have access to
CREATE POLICY "Users can view questions for accessible reports" ON report_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN report_users ru ON r.id = ru.report_id
      WHERE r.id = report_questions.report_id
      AND ru.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM reports r
      JOIN org_users ou ON r.org_id = ou.org_id
      WHERE r.id = report_questions.report_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'qp')
    )
  );

-- Users can insert/update questions for reports they can edit
CREATE POLICY "Users can insert questions for editable reports" ON report_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN report_users ru ON r.id = ru.report_id
      WHERE r.id = report_questions.report_id
      AND ru.user_id = auth.uid()
      AND ru.role IN ('qp', 'editor')
    )
    OR
    EXISTS (
      SELECT 1 FROM reports r
      JOIN org_users ou ON r.org_id = ou.org_id
      WHERE r.id = report_questions.report_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'qp')
    )
  );

CREATE POLICY "Users can update questions for editable reports" ON report_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN report_users ru ON r.id = ru.report_id
      WHERE r.id = report_questions.report_id
      AND ru.user_id = auth.uid()
      AND ru.role IN ('qp', 'editor')
    )
    OR
    EXISTS (
      SELECT 1 FROM reports r
      JOIN org_users ou ON r.org_id = ou.org_id
      WHERE r.id = report_questions.report_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'qp')
    )
  );

-- Users can delete questions for reports they can edit
CREATE POLICY "Users can delete questions for editable reports" ON report_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN report_users ru ON r.id = ru.report_id
      WHERE r.id = report_questions.report_id
      AND ru.user_id = auth.uid()
      AND ru.role IN ('qp', 'editor')
    )
    OR
    EXISTS (
      SELECT 1 FROM reports r
      JOIN org_users ou ON r.org_id = ou.org_id
      WHERE r.id = report_questions.report_id
      AND ou.user_id = auth.uid()
      AND ou.role IN ('admin', 'qp')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_report_questions_updated_at
  BEFORE UPDATE ON report_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Note: We don't insert template questions here since they don't have report_id
-- The questions will be created when users answer them through the application

