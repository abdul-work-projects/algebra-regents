-- =====================================================
-- Migration: Add Question Text Support
-- Run this script to add text field for questions
-- =====================================================

-- Add question_text column to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS question_text TEXT;

-- Make question_image_url nullable since now either text or image can be provided
ALTER TABLE questions
ALTER COLUMN question_image_url DROP NOT NULL;

-- Add a check constraint to ensure at least one of text or image is provided
ALTER TABLE questions
ADD CONSTRAINT question_text_or_image_required
CHECK (
  (question_text IS NOT NULL AND question_text != '')
  OR
  (question_image_url IS NOT NULL AND question_image_url != '')
);

-- Verify migration
SELECT 'Migration complete - question_text column added' AS status
WHERE EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'questions'
  AND column_name = 'question_text'
);
