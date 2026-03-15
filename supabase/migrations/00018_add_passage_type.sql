-- Add type column to passages table to distinguish between grouped and parts questions
-- 'grouped': separate questions sharing a passage, displayed in split-pane, navigated individually
-- 'parts': single logical question with multiple parts, stacked on one page, navigated as one
ALTER TABLE passages ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'grouped' CHECK (type IN ('grouped', 'parts'));
