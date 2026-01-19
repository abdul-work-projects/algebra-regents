-- =====================================================
-- Migration: Add display_order column to questions table
-- Date: 2026-01-19
-- Description: Adds a display_order column to allow custom ordering of questions
-- =====================================================

-- Add display_order column (nullable initially to support existing rows)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set initial order based on created_at for existing questions
UPDATE questions SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM questions
) AS subquery
WHERE questions.id = subquery.id
  AND questions.display_order IS NULL;

-- Create index on display_order for faster ordering
CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(display_order);

-- =====================================================
-- Verification
-- =====================================================
SELECT
  'display_order column added' AS status,
  COUNT(*) AS questions_updated
FROM questions
WHERE display_order IS NOT NULL;
