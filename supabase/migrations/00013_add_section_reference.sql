-- Migration: Add reference_image_url to test_sections
-- Allows section-specific reference sheets
-- Idempotent: safe to re-run

ALTER TABLE test_sections ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
