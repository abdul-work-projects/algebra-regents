-- =====================================================
-- Migration: Subject Groups
-- Allows grouping related subjects (e.g. Global History + US History under "Social Studies").
-- =====================================================

CREATE TABLE IF NOT EXISTS subject_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_groups_display_order ON subject_groups(display_order);

ALTER TABLE subject_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to subject_groups" ON subject_groups;
CREATE POLICY "Allow public read access to subject_groups"
  ON subject_groups FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert subject_groups" ON subject_groups;
CREATE POLICY "Allow authenticated users to insert subject_groups"
  ON subject_groups FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update subject_groups" ON subject_groups;
CREATE POLICY "Allow authenticated users to update subject_groups"
  ON subject_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete subject_groups" ON subject_groups;
CREATE POLICY "Allow authenticated users to delete subject_groups"
  ON subject_groups FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_subject_groups_updated_at ON subject_groups;
CREATE TRIGGER update_subject_groups_updated_at
  BEFORE UPDATE ON subject_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add nullable group_id to subjects (ungrouped = NULL)
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES subject_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_group_id ON subjects(group_id);
