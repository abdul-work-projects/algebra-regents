-- Update check constraint to also accept above_image_text as valid question content
-- This is needed for part questions where the question text may be in above_image_text only
ALTER TABLE questions DROP CONSTRAINT IF EXISTS question_text_or_image_required;

ALTER TABLE questions ADD CONSTRAINT question_text_or_image_required CHECK (
  (question_text IS NOT NULL AND question_text != '')
  OR
  (question_image_url IS NOT NULL AND question_image_url != '')
  OR
  (above_image_text IS NOT NULL AND above_image_text != '')
);
