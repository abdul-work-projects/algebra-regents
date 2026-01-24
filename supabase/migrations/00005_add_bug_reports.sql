-- =====================================================
-- Migration: Add Bug Reports Table
-- This migration adds support for bug/issue reporting on questions
-- =====================================================

-- Create bug_reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  question_number INTEGER,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bug_reports_question_id ON bug_reports(question_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_test_id ON bug_reports(test_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at);

-- Enable RLS on bug_reports table
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Allow public to insert bug reports (anyone can report)
CREATE POLICY "Allow public to insert bug reports"
  ON bug_reports
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public to read bug reports (for displaying confirmation)
CREATE POLICY "Allow public read access to bug reports"
  ON bug_reports
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to update bug reports
CREATE POLICY "Allow authenticated users to update bug reports"
  ON bug_reports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete bug reports
CREATE POLICY "Allow authenticated users to delete bug reports"
  ON bug_reports
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for bug_reports updated_at
DROP TRIGGER IF EXISTS update_bug_reports_updated_at ON bug_reports;
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Storage bucket for bug screenshots
-- Run these commands in Supabase SQL Editor
-- =====================================================

-- Create the storage bucket (run in SQL editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to upload to bug-screenshots bucket
CREATE POLICY "Allow public uploads to bug-screenshots"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'bug-screenshots');

-- Allow public to read from bug-screenshots bucket
CREATE POLICY "Allow public reads from bug-screenshots"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'bug-screenshots');

-- =====================================================
-- Verify migration
-- =====================================================

SELECT 'Bug reports table created' AS status
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bug_reports');
