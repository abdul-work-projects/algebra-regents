-- =====================================================
-- Migration: Per-subject tool toggles
-- Lets admins enable/disable graph paper, graphing tool, and calculator
-- on a per-subject basis. Reference sheet remains automatic (driven by
-- whether the current question/section has reference docs configured).
-- =====================================================

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS tool_graph_paper BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tool_graphing_tool BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tool_calculator BOOLEAN NOT NULL DEFAULT true;
