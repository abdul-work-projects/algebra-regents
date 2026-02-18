-- Add image_size column to questions table
-- Controls the display size of question images: small, medium, or large
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_size TEXT DEFAULT 'large';

-- Add constraint for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_image_size_check'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_image_size_check
      CHECK (image_size IN ('small', 'medium', 'large'));
  END IF;
END $$;
