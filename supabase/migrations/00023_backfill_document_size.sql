-- Backfill `size` on existing image entries inside *_documents arrays so the per-doc
-- size selector reflects the previously-saved question/passage `image_size` value.
-- Reference docs (questions, test_sections) had no parent size column, so they default to 'large'.

-- questions.question_documents — pull from questions.image_size
UPDATE questions
SET question_documents = (
  SELECT jsonb_agg(
    CASE
      WHEN d->>'type' = 'image' AND (d->'size') IS NULL
        THEN d || jsonb_build_object('size', COALESCE(image_size, 'large'))
      ELSE d
    END
  )
  FROM jsonb_array_elements(question_documents) d
)
WHERE jsonb_typeof(question_documents) = 'array'
  AND jsonb_array_length(question_documents) > 0;

-- questions.reference_documents — no parent column, default to large
UPDATE questions
SET reference_documents = (
  SELECT jsonb_agg(
    CASE
      WHEN d->>'type' = 'image' AND (d->'size') IS NULL
        THEN d || jsonb_build_object('size', 'large')
      ELSE d
    END
  )
  FROM jsonb_array_elements(reference_documents) d
)
WHERE jsonb_typeof(reference_documents) = 'array'
  AND jsonb_array_length(reference_documents) > 0;

-- passages.passage_documents — pull from passages.image_size
UPDATE passages
SET passage_documents = (
  SELECT jsonb_agg(
    CASE
      WHEN d->>'type' = 'image' AND (d->'size') IS NULL
        THEN d || jsonb_build_object('size', COALESCE(image_size, 'large'))
      ELSE d
    END
  )
  FROM jsonb_array_elements(passage_documents) d
)
WHERE jsonb_typeof(passage_documents) = 'array'
  AND jsonb_array_length(passage_documents) > 0;

-- test_sections.reference_documents — no parent column, default to large
UPDATE test_sections
SET reference_documents = (
  SELECT jsonb_agg(
    CASE
      WHEN d->>'type' = 'image' AND (d->'size') IS NULL
        THEN d || jsonb_build_object('size', 'large')
      ELSE d
    END
  )
  FROM jsonb_array_elements(reference_documents) d
)
WHERE jsonb_typeof(reference_documents) = 'array'
  AND jsonb_array_length(reference_documents) > 0;
