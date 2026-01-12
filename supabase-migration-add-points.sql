-- Migration: Add points column to questions table
-- Run this SQL in your Supabase SQL Editor

-- Add points column with default value of 1
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 1;

-- Update any existing questions to have 1 point (in case they don't have a value)
UPDATE questions
SET points = 1
WHERE points IS NULL OR points = 0;
