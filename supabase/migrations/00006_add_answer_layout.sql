-- Migration: Add answer_layout column to questions table
-- This allows admin to choose between 'grid' (2x2) or 'list' (1x4) layout for answer choices

ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_layout TEXT DEFAULT 'list';

-- Add check constraint to ensure only valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_answer_layout_check'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_answer_layout_check
      CHECK (answer_layout IN ('grid', 'list'));
  END IF;
END $$;
