-- =====================================================
-- Migration: Add display_order to tests
-- Allows admins to reorder tests within a subject from the Subjects tab.
-- =====================================================

ALTER TABLE tests
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tests_display_order ON tests(display_order);

-- Backfill display_order per subject by created_at so existing tests retain their order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY created_at) - 1 AS rn
  FROM tests
)
UPDATE tests t
SET display_order = ordered.rn
FROM ordered
WHERE t.id = ordered.id
  AND (t.display_order IS NULL OR t.display_order = 0);
