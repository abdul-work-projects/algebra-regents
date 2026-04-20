-- Add iframe_url column to passages for embedding copyrighted external content
-- (e.g. official exam PDFs hosted by NYSED) that cannot be redistributed directly.
ALTER TABLE passages ADD COLUMN IF NOT EXISTS iframe_url TEXT;
