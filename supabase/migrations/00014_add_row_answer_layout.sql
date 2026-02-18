-- Migration: Add 'row' option to answer_layout column
-- This allows a 4x1 (single row) layout for answer choices

-- Drop the existing constraint and recreate with the new value
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_answer_layout_check;
ALTER TABLE questions ADD CONSTRAINT questions_answer_layout_check
  CHECK (answer_layout IN ('grid', 'list', 'row'));
