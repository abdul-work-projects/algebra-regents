-- Add notes column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
