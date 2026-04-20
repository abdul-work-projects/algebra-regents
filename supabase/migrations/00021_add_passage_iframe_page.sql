-- Add iframe_page column to passages for specifying which page to open in embedded PDFs.
ALTER TABLE passages ADD COLUMN IF NOT EXISTS iframe_page INTEGER;
