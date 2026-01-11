-- Supabase Database Schema for Algebra Regents App
-- Run this SQL in your Supabase SQL Editor to create the necessary tables

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_image_url TEXT NOT NULL,
  reference_image_url TEXT,
  answers TEXT[] NOT NULL CHECK (array_length(answers, 1) = 4),
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 1 AND correct_answer <= 4),
  explanation_text TEXT NOT NULL,
  explanation_image_url TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on topics for faster filtering
CREATE INDEX IF NOT EXISTS idx_questions_topics ON questions USING GIN(topics);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON questions
    FOR SELECT
    USING (true);

-- Create policy to allow authenticated users to insert (for admin)
CREATE POLICY "Allow authenticated insert" ON questions
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update (for admin)
CREATE POLICY "Allow authenticated update" ON questions
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete (for admin)
CREATE POLICY "Allow authenticated delete" ON questions
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Storage Buckets Setup Instructions:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create three buckets:
--    - question-images (public)
--    - reference-images (public)
--    - explanation-images (public)
-- 3. Set each bucket to "Public" in the bucket settings
-- 4. Add the following policy to each bucket:
--
-- Bucket Policy (apply to all three buckets):
-- SELECT: Allow public read access
-- INSERT: Allow authenticated users
-- UPDATE: Allow authenticated users
-- DELETE: Allow authenticated users
