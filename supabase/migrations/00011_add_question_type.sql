-- Migration: Add question_type column to questions table
-- Supports 'multiple-choice' (existing behavior) and 'drag-order' (new)
-- For drag-order: answers[] stores items in CORRECT order, frontend shuffles
-- correct_answer is ignored for drag-order (set to 1 as placeholder)
-- Idempotent: safe to re-run

ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'multiple-choice';

-- Add CHECK constraint (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_question_type'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT chk_question_type
      CHECK (question_type IN ('multiple-choice', 'drag-order'));
  END IF;
END
$$;
