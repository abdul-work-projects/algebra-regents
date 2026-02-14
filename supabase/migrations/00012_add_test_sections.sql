-- Migration: Add test_sections table and section_id to test_questions
-- Allows tests to be divided into sections/parts
-- Idempotent: safe to re-run

-- Create test_sections table
CREATE TABLE IF NOT EXISTS test_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_test_sections_test_id ON test_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_test_sections_order ON test_sections(test_id, display_order);

-- Add section_id to test_questions junction table
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES test_sections(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_test_questions_section ON test_questions(section_id);

-- RLS policies for test_sections
ALTER TABLE test_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view test_sections" ON test_sections;
CREATE POLICY "Public can view test_sections" ON test_sections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert test_sections" ON test_sections;
CREATE POLICY "Authenticated users can insert test_sections" ON test_sections
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update test_sections" ON test_sections;
CREATE POLICY "Authenticated users can update test_sections" ON test_sections
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete test_sections" ON test_sections;
CREATE POLICY "Authenticated users can delete test_sections" ON test_sections
  FOR DELETE TO authenticated USING (true);
