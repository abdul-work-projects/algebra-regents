-- Add 'extra-large' to image_size CHECK constraint
-- Drop old constraint and recreate with new values
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_image_size_check;
ALTER TABLE questions ADD CONSTRAINT questions_image_size_check
  CHECK (image_size IN ('small', 'medium', 'large', 'extra-large'));

-- Add above_text column to passages table
ALTER TABLE passages ADD COLUMN IF NOT EXISTS above_text TEXT;

-- Add image_size column to passages table
ALTER TABLE passages ADD COLUMN IF NOT EXISTS image_size TEXT DEFAULT 'large';

-- Add constraint for valid values on passages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'passages_image_size_check'
  ) THEN
    ALTER TABLE passages ADD CONSTRAINT passages_image_size_check
      CHECK (image_size IN ('small', 'medium', 'large', 'extra-large'));
  END IF;
END $$;
