-- Migration: Add above_image_text column to questions table
-- This allows displaying text above the question image (text-image-text layout)
-- Idempotent: safe to re-run

ALTER TABLE questions ADD COLUMN IF NOT EXISTS above_image_text TEXT;
