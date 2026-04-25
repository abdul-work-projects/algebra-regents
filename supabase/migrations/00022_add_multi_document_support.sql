-- Multi-document support for questions, passages, and test sections.
-- Each docs array contains entries shaped like:
--   { "type": "image" | "pdf", "url": "...", "page": 3?, "label": "..."?, "position": "above" | "below"? }
-- Old single-URL columns (question_image_url, reference_image_url, passage_image_url,
-- iframe_url/iframe_page, test_sections.reference_image_url) are left intact for safe rollback;
-- the read path prefers the new arrays and falls back to the legacy columns when empty.

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_documents  JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reference_documents JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE passages
  ADD COLUMN IF NOT EXISTS passage_documents JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE test_sections
  ADD COLUMN IF NOT EXISTS reference_documents JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: existing single image -> array entry. Position 'above' since that's where the
-- single image renders today.
UPDATE questions
SET question_documents = jsonb_build_array(
  jsonb_build_object('type','image','url',question_image_url,'position','above'))
WHERE question_image_url IS NOT NULL
  AND question_image_url <> ''
  AND question_documents = '[]'::jsonb;

UPDATE questions
SET reference_documents = jsonb_build_array(
  jsonb_build_object('type','image','url',reference_image_url))
WHERE reference_image_url IS NOT NULL
  AND reference_image_url <> ''
  AND reference_documents = '[]'::jsonb;

-- Passages: image first, then PDF (matches current render order). Drop nulls when only one is set.
UPDATE passages
SET passage_documents = (
  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object('type','image','url',passage_image_url,'position','above') AS d
    WHERE passage_image_url IS NOT NULL AND passage_image_url <> ''
    UNION ALL
    SELECT jsonb_build_object(
             'type','pdf',
             'url',iframe_url,
             'page', iframe_page,
             'position','above')
    WHERE iframe_url IS NOT NULL AND iframe_url <> ''
  ) s
)
WHERE (passage_image_url IS NOT NULL OR iframe_url IS NOT NULL)
  AND passage_documents = '[]'::jsonb;

UPDATE test_sections
SET reference_documents = jsonb_build_array(
  jsonb_build_object('type','image','url',reference_image_url))
WHERE reference_image_url IS NOT NULL
  AND reference_image_url <> ''
  AND reference_documents = '[]'::jsonb;
