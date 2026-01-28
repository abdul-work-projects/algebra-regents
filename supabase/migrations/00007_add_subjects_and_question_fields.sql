-- Migration: Add subjects table and new question fields
-- This migration adds:
-- 1. subjects table for multi-subject support
-- 2. subject_id column to tests table (required)
-- 3. student_friendly_skill and cluster columns to questions table

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Create subjects table
-- =====================================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Default blue color (hex)
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for active subjects lookup
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active) WHERE is_active = true;

-- =====================================================
-- 2. Add subject_id to tests table
-- =====================================================
-- First add the column as nullable
ALTER TABLE tests ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE RESTRICT;

-- =====================================================
-- 3. Add new columns to questions table
-- =====================================================
ALTER TABLE questions ADD COLUMN IF NOT EXISTS student_friendly_skill TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS cluster TEXT;

-- Create indexes for the new question fields
CREATE INDEX IF NOT EXISTS idx_questions_cluster ON questions(cluster) WHERE cluster IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_skill ON questions(student_friendly_skill) WHERE student_friendly_skill IS NOT NULL;

-- =====================================================
-- 4. Create default subject and migrate existing tests
-- =====================================================
-- Insert default Algebra I Regents subject with a fixed UUID for consistency
INSERT INTO subjects (id, name, description, color, is_active, display_order)
VALUES ('c0000000-0000-0000-0000-000000000001', 'Algebra I Regents', 'NY Algebra I Regents Exam Practice', '#67E8F9', true, 1)
ON CONFLICT (name) DO NOTHING;

-- Update all existing tests to belong to the default Algebra subject
UPDATE tests SET subject_id = 'c0000000-0000-0000-0000-000000000001' WHERE subject_id IS NULL;

-- Now make subject_id NOT NULL (after migrating existing data)
ALTER TABLE tests ALTER COLUMN subject_id SET NOT NULL;

-- Create index for tests by subject
CREATE INDEX IF NOT EXISTS idx_tests_subject ON tests(subject_id);

-- =====================================================
-- 5. RLS policies for subjects table
-- =====================================================
-- Enable RLS on subjects table
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Public can read subjects
DROP POLICY IF EXISTS "Public can view subjects" ON subjects;
CREATE POLICY "Public can view subjects" ON subjects
  FOR SELECT
  USING (true);

-- Authenticated users can insert subjects
DROP POLICY IF EXISTS "Authenticated users can insert subjects" ON subjects;
CREATE POLICY "Authenticated users can insert subjects" ON subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update subjects
DROP POLICY IF EXISTS "Authenticated users can update subjects" ON subjects;
CREATE POLICY "Authenticated users can update subjects" ON subjects
  FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete subjects
DROP POLICY IF EXISTS "Authenticated users can delete subjects" ON subjects;
CREATE POLICY "Authenticated users can delete subjects" ON subjects
  FOR DELETE
  TO authenticated
  USING (true);
