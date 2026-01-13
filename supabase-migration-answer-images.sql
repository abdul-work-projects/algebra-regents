-- =====================================================
-- Migration: Add Answer Image URLs Support
-- Run this script if you already have an existing database
-- and need to add answer image support
-- =====================================================

-- Add answer_image_urls column to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS answer_image_urls TEXT[];

-- Create storage bucket for answer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('answer-images', 'answer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Answer Images Bucket Policies

-- Allow public to read answer images
CREATE POLICY "Public can view answer images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'answer-images');

-- Allow authenticated users to upload answer images
CREATE POLICY "Authenticated users can upload answer images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'answer-images');

-- Allow authenticated users to update answer images
CREATE POLICY "Authenticated users can update answer images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'answer-images');

-- Allow authenticated users to delete answer images
CREATE POLICY "Authenticated users can delete answer images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'answer-images');

-- Verify migration
SELECT 'Migration complete - answer_image_urls column added' AS status
WHERE EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'questions'
  AND column_name = 'answer_image_urls'
);

SELECT 'Storage bucket created: answer-images' AS status
FROM storage.buckets
WHERE name = 'answer-images';
