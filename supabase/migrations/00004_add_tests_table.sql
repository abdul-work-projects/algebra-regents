-- =====================================================
-- Migration: Add Tests Table and Test-Questions Junction
-- This migration adds support for multiple tests/exams
-- =====================================================

-- Create tests table
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  scaled_score_table JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_tests_is_active ON tests(is_active);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at);

-- Enable RLS on tests table
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Allow public read access to tests
CREATE POLICY "Allow public read access to tests"
  ON tests
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert tests
CREATE POLICY "Allow authenticated users to insert tests"
  ON tests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update tests
CREATE POLICY "Allow authenticated users to update tests"
  ON tests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete tests
CREATE POLICY "Allow authenticated users to delete tests"
  ON tests
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for tests updated_at
DROP TRIGGER IF EXISTS update_tests_updated_at ON tests;
CREATE TRIGGER update_tests_updated_at
  BEFORE UPDATE ON tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Create test_questions junction table
-- =====================================================

CREATE TABLE IF NOT EXISTS test_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(test_id, question_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON test_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_display_order ON test_questions(display_order);

-- Enable RLS on test_questions table
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to test_questions
CREATE POLICY "Allow public read access to test_questions"
  ON test_questions
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert test_questions
CREATE POLICY "Allow authenticated users to insert test_questions"
  ON test_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update test_questions
CREATE POLICY "Allow authenticated users to update test_questions"
  ON test_questions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete test_questions
CREATE POLICY "Allow authenticated users to delete test_questions"
  ON test_questions
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Create default "Test 1" and migrate existing questions
-- =====================================================

-- Insert default test with the existing scaled score table
INSERT INTO tests (id, name, description, scaled_score_table, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Algebra I Regents - Practice Test 1',
  'Default practice test with all questions',
  '{
    "0": 0, "1": 6, "2": 11, "3": 16, "4": 20, "5": 24, "6": 28, "7": 31, "8": 34, "9": 37,
    "10": 40, "11": 42, "12": 45, "13": 47, "14": 48, "15": 50, "16": 52, "17": 53, "18": 55, "19": 56,
    "20": 57, "21": 58, "22": 59, "23": 60, "24": 61, "25": 62, "26": 63, "27": 63, "28": 64, "29": 65,
    "30": 66, "31": 66, "32": 66, "33": 67, "34": 67, "35": 68, "36": 68, "37": 69, "38": 69, "39": 70,
    "40": 70, "41": 70, "42": 71, "43": 71, "44": 72, "45": 72, "46": 73, "47": 73, "48": 73, "49": 74,
    "50": 74, "51": 75, "52": 75, "53": 76, "54": 76, "55": 77, "56": 77, "57": 78, "58": 78, "59": 79,
    "60": 79, "61": 80, "62": 81, "63": 81, "64": 82, "65": 83, "66": 83, "67": 84, "68": 85, "69": 86,
    "70": 86, "71": 87, "72": 88, "73": 89, "74": 90, "75": 92, "76": 93, "77": 94, "78": 95, "79": 97,
    "80": 98, "81": 100, "82": 100
  }'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Migrate all existing questions to the default test
INSERT INTO test_questions (test_id, question_id, display_order)
SELECT
  'a0000000-0000-0000-0000-000000000001'::uuid,
  q.id,
  COALESCE(q.display_order, ROW_NUMBER() OVER (ORDER BY q.created_at))
FROM questions q
ON CONFLICT (test_id, question_id) DO NOTHING;

-- =====================================================
-- Verify migration
-- =====================================================

SELECT 'Tests table created' AS status
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tests');

SELECT 'Test questions table created' AS status
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'test_questions');

SELECT 'Default test created with ' || COUNT(*) || ' questions' AS status
FROM test_questions
WHERE test_id = 'a0000000-0000-0000-0000-000000000001';
