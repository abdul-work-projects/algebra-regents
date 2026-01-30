-- Migration: Refactor schema - tags & difficulty
-- This migration:
-- 1. Renames topics column to skills
-- 2. Adds new tags column (TEXT array)
-- 3. Adds difficulty column (enum-like with check constraint)
-- 4. Drops student_friendly_skill and cluster columns
-- 5. Updates indexes

-- =====================================================
-- 1. Rename topics column to skills
-- =====================================================
ALTER TABLE questions RENAME COLUMN topics TO skills;

-- =====================================================
-- 2. Add new tags column (TEXT array)
-- =====================================================
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- =====================================================
-- 3. Add difficulty column (enum-like with check constraint)
-- =====================================================
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT NULL;
ALTER TABLE questions ADD CONSTRAINT questions_difficulty_check
  CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard'));

-- =====================================================
-- 4. Drop old columns
-- =====================================================
ALTER TABLE questions DROP COLUMN IF EXISTS student_friendly_skill;
ALTER TABLE questions DROP COLUMN IF EXISTS cluster;

-- =====================================================
-- 5. Drop old indexes
-- =====================================================
DROP INDEX IF EXISTS idx_questions_cluster;
DROP INDEX IF EXISTS idx_questions_skill;

-- =====================================================
-- 6. Create new indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_skills ON questions USING GIN (skills);
