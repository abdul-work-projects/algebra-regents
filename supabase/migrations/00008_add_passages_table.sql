-- Migration: Add passages table for grouped questions
-- This allows multiple questions to share a common passage/summary

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Create passages table
-- =====================================================
CREATE TABLE IF NOT EXISTS passages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passage_text TEXT,
  passage_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. Add passage_id to questions table
-- =====================================================
ALTER TABLE questions ADD COLUMN IF NOT EXISTS passage_id UUID REFERENCES passages(id) ON DELETE SET NULL;

-- Create index for questions by passage
CREATE INDEX IF NOT EXISTS idx_questions_passage ON questions(passage_id) WHERE passage_id IS NOT NULL;

-- =====================================================
-- 3. RLS policies for passages table
-- =====================================================
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;

-- Public can read passages
DROP POLICY IF EXISTS "Public can view passages" ON passages;
CREATE POLICY "Public can view passages" ON passages
  FOR SELECT
  USING (true);

-- Authenticated users can insert passages
DROP POLICY IF EXISTS "Authenticated users can insert passages" ON passages;
CREATE POLICY "Authenticated users can insert passages" ON passages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update passages
DROP POLICY IF EXISTS "Authenticated users can update passages" ON passages;
CREATE POLICY "Authenticated users can update passages" ON passages
  FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete passages
DROP POLICY IF EXISTS "Authenticated users can delete passages" ON passages;
CREATE POLICY "Authenticated users can delete passages" ON passages
  FOR DELETE
  TO authenticated
  USING (true);
