-- =====================================================
-- Algebra Regents App - Complete Database Setup
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Create Questions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  question_image_url TEXT NOT NULL,
  reference_image_url TEXT,
  answers TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 1 AND correct_answer <= 4),
  explanation_text TEXT NOT NULL,
  explanation_image_url TEXT,
  topics TEXT[] NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on created_at for faster ordering
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);

-- Create index on topics for faster topic-based queries
CREATE INDEX IF NOT EXISTS idx_questions_topics ON questions USING GIN(topics);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on questions table
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to questions
CREATE POLICY "Allow public read access to questions"
  ON questions
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert questions (for admin)
CREATE POLICY "Allow authenticated users to insert questions"
  ON questions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update questions (for admin)
CREATE POLICY "Allow authenticated users to update questions"
  ON questions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete questions (for admin)
CREATE POLICY "Allow authenticated users to delete questions"
  ON questions
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Storage Buckets
-- =====================================================

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-images', 'reference-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for explanation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('explanation-images', 'explanation-images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies
-- =====================================================

-- Question Images Bucket Policies

-- Allow public to read question images
CREATE POLICY "Public can view question images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'question-images');

-- Allow authenticated users to upload question images
CREATE POLICY "Authenticated users can upload question images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'question-images');

-- Allow authenticated users to update question images
CREATE POLICY "Authenticated users can update question images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'question-images');

-- Allow authenticated users to delete question images
CREATE POLICY "Authenticated users can delete question images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'question-images');

-- Reference Images Bucket Policies

-- Allow public to read reference images
CREATE POLICY "Public can view reference images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'reference-images');

-- Allow authenticated users to upload reference images
CREATE POLICY "Authenticated users can upload reference images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reference-images');

-- Allow authenticated users to update reference images
CREATE POLICY "Authenticated users can update reference images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'reference-images');

-- Allow authenticated users to delete reference images
CREATE POLICY "Authenticated users can delete reference images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'reference-images');

-- Explanation Images Bucket Policies

-- Allow public to read explanation images
CREATE POLICY "Public can view explanation images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'explanation-images');

-- Allow authenticated users to upload explanation images
CREATE POLICY "Authenticated users can upload explanation images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'explanation-images');

-- Allow authenticated users to update explanation images
CREATE POLICY "Authenticated users can update explanation images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'explanation-images');

-- Allow authenticated users to delete explanation images
CREATE POLICY "Authenticated users can delete explanation images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'explanation-images');

-- =====================================================
-- Triggers for automatic updated_at timestamp
-- =====================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for questions table
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Setup Complete
-- =====================================================

-- Verify tables were created
SELECT 'Questions table created' AS status
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'questions');

-- Verify storage buckets were created
SELECT 'Storage buckets created: ' || string_agg(name, ', ') AS status
FROM storage.buckets
WHERE name IN ('question-images', 'reference-images', 'explanation-images');
