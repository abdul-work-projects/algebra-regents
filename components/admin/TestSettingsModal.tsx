"use client";

import { useState, useEffect, useMemo } from "react";
import { Test, Subject, TestSection } from "@/lib/types";
import { DatabaseQuestion } from "@/lib/supabase";
import { getDefaultScoreTable } from "@/lib/results";
import {
  updateTest,
  bulkAssignQuestionsToSection,
  deleteTestSection,
} from "@/lib/supabase";

interface ScoreTableRow {
  raw: number;
  scaled: number;
}

interface TestSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: Test | null;
  subjects: Subject[];
  testSections: TestSection[];
  testQuestionOrder: { [questionId: string]: number };
  questionSectionMap: { [questionId: string]: string | undefined };
  questions: DatabaseQuestion[];
  questionTestMap: { [questionId: string]: string[] };
  onTestUpdated: () => void;
  onSectionsChanged: () => void;
  onShowSectionModal: (section: TestSection | null) => void;
}

export default function TestSettingsModal({
  isOpen,
  onClose,
  test,
  subjects,
  testSections,
  testQuestionOrder,
  questionSectionMap,
  questions,
  questionTestMap,
  onTestUpdated,
  onSectionsChanged,
  onShowSectionModal,
}: TestSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "sections">("info");

  // Test Info state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [subjectId, setSubjectId] = useState("");
  const [useCustomScoreTable, setUseCustomScoreTable] = useState(false);
  const [scoreTableRows, setScoreTableRows] = useState<ScoreTableRow[]>([]);
  const [maxRawScore, setMaxRawScore] = useState(86);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sections state — range inputs per section
  const [sectionRanges, setSectionRanges] = useState<{
    [sectionId: string]: { from: string; to: string };
  }>({});
  const [sectionErrors, setSectionErrors] = useState<{
    [sectionId: string]: string | null;
  }>({});
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);

  // Get test questions in order
  const testQuestions = useMemo(() => {
    if (!test) return [];
    return questions
      .filter((q) => questionTestMap[q.id]?.includes(test.id))
      .sort((a, b) => {
        const orderA = testQuestionOrder[a.id] ?? Infinity;
        const orderB = testQuestionOrder[b.id] ?? Infinity;
        return orderA - orderB;
      });
  }, [test, questions, questionTestMap, testQuestionOrder]);

  const totalQuestions = testQuestions.length;

  const unassignedCount = useMemo(() => {
    return testQuestions.filter((q) => !questionSectionMap[q.id]).length;
  }, [testQuestions, questionSectionMap]);

  // Score table helpers
  const objectToRows = (obj: { [key: number]: number }): ScoreTableRow[] => {
    return Object.entries(obj)
      .map(([raw, scaled]) => ({ raw: parseInt(raw), scaled }))
      .sort((a, b) => a.raw - b.raw);
  };

  const rowsToObject = (rows: ScoreTableRow[]): { [key: string]: number } => {
    const obj: { [key: string]: number } = {};
    rows.forEach((row) => {
      obj[row.raw.toString()] = row.scaled;
    });
    return obj;
  };

  const generateEmptyRows = (max: number): ScoreTableRow[] => {
    const rows: ScoreTableRow[] = [];
    for (let i = 0; i <= max; i++) {
      rows.push({ raw: i, scaled: 0 });
    }
    return rows;
  };

  // Init form when test changes
  useEffect(() => {
    if (test) {
      setName(test.name);
      setDescription(test.description || "");
      setIsActive(test.isActive);
      setSubjectId(test.subjectId);
      if (test.scaledScoreTable) {
        setUseCustomScoreTable(true);
        const rows = objectToRows(test.scaledScoreTable);
        setScoreTableRows(rows);
        if (rows.length > 0) {
          setMaxRawScore(Math.max(...rows.map((r) => r.raw)));
        }
      } else {
        setUseCustomScoreTable(false);
        setScoreTableRows([]);
        setMaxRawScore(86);
      }
      setError(null);
    }
  }, [test, isOpen]);

  // Init section ranges from current assignments
  useEffect(() => {
    if (!test || testSections.length === 0) {
      setSectionRanges({});
      return;
    }

    const ranges: { [sectionId: string]: { from: string; to: string } } = {};
    testSections.forEach((section) => {
      // Find questions assigned to this section
      const assignedIndices: number[] = [];
      testQuestions.forEach((q, idx) => {
        if (questionSectionMap[q.id] === section.id) {
          assignedIndices.push(idx + 1); // 1-indexed
        }
      });

      if (assignedIndices.length > 0) {
        const min = Math.min(...assignedIndices);
        const max = Math.max(...assignedIndices);
        // Only show range if it's contiguous
        const isContiguous = max - min + 1 === assignedIndices.length;
        if (isContiguous) {
          ranges[section.id] = { from: min.toString(), to: max.toString() };
        } else {
          ranges[section.id] = { from: "", to: "" };
        }
      } else {
        ranges[section.id] = { from: "", to: "" };
      }
    });
    setSectionRanges(ranges);
    setSectionErrors({});
  }, [test, testSections, testQuestions, questionSectionMap]);

  if (!isOpen || !test) return null;

  // Score table handlers
  const handleLoadDefaultScoreTable = () => {
    const defaultTable = getDefaultScoreTable();
    const rows = objectToRows(defaultTable);
    setScoreTableRows(rows);
    setMaxRawScore(Math.max(...rows.map((r) => r.raw)));
    setUseCustomScoreTable(true);
  };

  const handleGenerateEmptyTable = () => {
    setScoreTableRows(generateEmptyRows(maxRawScore));
    setUseCustomScoreTable(true);
  };

  const handleScaledScoreChange = (raw: number, scaled: number) => {
    setScoreTableRows((prev) =>
      prev.map((row) => (row.raw === raw ? { ...row, scaled } : row))
    );
  };

  const handleMaxRawScoreChange = (newMax: number) => {
    setMaxRawScore(newMax);
    if (scoreTableRows.length > 0) {
      const currentMax = Math.max(...scoreTableRows.map((r) => r.raw));
      if (newMax > currentMax) {
        const newRows = [...scoreTableRows];
        for (let i = currentMax + 1; i <= newMax; i++) {
          newRows.push({ raw: i, scaled: 0 });
        }
        setScoreTableRows(newRows);
      } else if (newMax < currentMax) {
        setScoreTableRows(scoreTableRows.filter((r) => r.raw <= newMax));
      }
    }
  };

  // Save test info
  const handleSaveTestInfo = async () => {
    if (!name.trim()) {
      setError("Test name is required");
      return;
    }
    if (!subjectId) {
      setError("Subject is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let scaledScoreTable: { [key: string]: number } | undefined;
      if (useCustomScoreTable && scoreTableRows.length > 0) {
        scaledScoreTable = rowsToObject(scoreTableRows);
      }

      const result = await updateTest(test.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        scaled_score_table: scaledScoreTable,
        is_active: isActive,
        subject_id: subjectId,
      });

      if (result) {
        onTestUpdated();
      } else {
        setError("Failed to update test");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save test");
    } finally {
      setIsSaving(false);
    }
  };

  // Section range validation
  const validateRange = (
    sectionId: string,
    from: string,
    to: string
  ): string | null => {
    if (!from && !to) return null; // empty is okay
    const fromNum = parseInt(from);
    const toNum = parseInt(to);

    if (from && isNaN(fromNum)) return "From must be a number";
    if (to && isNaN(toNum)) return "To must be a number";
    if (from && !to) return "To is required";
    if (!from && to) return "From is required";
    if (fromNum < 1) return "From must be at least 1";
    if (toNum > totalQuestions)
      return `To cannot exceed ${totalQuestions} (total questions)`;
    if (fromNum > toNum) return "From must be less than or equal to To";

    // Check overlap with other sections
    for (const [otherSectionId, range] of Object.entries(sectionRanges)) {
      if (otherSectionId === sectionId) continue;
      const otherFrom = parseInt(range.from);
      const otherTo = parseInt(range.to);
      if (isNaN(otherFrom) || isNaN(otherTo)) continue;

      if (fromNum <= otherTo && toNum >= otherFrom) {
        const otherSection = testSections.find((s) => s.id === otherSectionId);
        return `Overlaps with ${otherSection?.name || "another section"} (Q${otherFrom}-Q${otherTo})`;
      }
    }

    return null;
  };

  const handleRangeChange = (
    sectionId: string,
    field: "from" | "to",
    value: string
  ) => {
    const newRanges = {
      ...sectionRanges,
      [sectionId]: { ...sectionRanges[sectionId], [field]: value },
    };
    setSectionRanges(newRanges);

    const range = newRanges[sectionId];
    const err = validateRange(sectionId, range.from, range.to);
    setSectionErrors((prev) => ({ ...prev, [sectionId]: err }));
  };

  const handleApplyRange = async (sectionId: string) => {
    const range = sectionRanges[sectionId];
    if (!range) return;

    const err = validateRange(sectionId, range.from, range.to);
    if (err) {
      setSectionErrors((prev) => ({ ...prev, [sectionId]: err }));
      return;
    }

    setSavingSectionId(sectionId);
    try {
      const fromNum = parseInt(range.from);
      const toNum = parseInt(range.to);

      if (isNaN(fromNum) || isNaN(toNum)) {
        // Clear assignment — unassign all questions from this section
        const assignedIds = testQuestions
          .filter((q) => questionSectionMap[q.id] === sectionId)
          .map((q) => q.id);
        if (assignedIds.length > 0) {
          await bulkAssignQuestionsToSection(test.id, assignedIds, null);
        }
      } else {
        // First, unassign any questions currently in this section
        const currentlyAssigned = testQuestions
          .filter((q) => questionSectionMap[q.id] === sectionId)
          .map((q) => q.id);
        if (currentlyAssigned.length > 0) {
          await bulkAssignQuestionsToSection(
            test.id,
            currentlyAssigned,
            null
          );
        }

        // Assign the new range (1-indexed from/to)
        const questionIdsToAssign = testQuestions
          .slice(fromNum - 1, toNum)
          .map((q) => q.id);
        if (questionIdsToAssign.length > 0) {
          await bulkAssignQuestionsToSection(
            test.id,
            questionIdsToAssign,
            sectionId
          );
        }
      }

      onSectionsChanged();
    } catch {
      setSectionErrors((prev) => ({
        ...prev,
        [sectionId]: "Failed to save",
      }));
    } finally {
      setSavingSectionId(null);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const section = testSections.find((s) => s.id === sectionId);
    if (
      !window.confirm(
        `Delete "${section?.name}"? Questions will become unassigned.`
      )
    )
      return;

    const success = await deleteTestSection(sectionId);
    if (success) {
      onSectionsChanged();
    }
  };

  const getRangeQuestionCount = (from: string, to: string): number | null => {
    const fromNum = parseInt(from);
    const toNum = parseInt(to);
    if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) return null;
    return toNum - fromNum + 1;
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[200]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
              Test Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
            >
              <svg
                className="w-5 h-5 text-gray-500 dark:text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Tab Toggle */}
          <div className="flex items-center gap-1 px-4 pt-3 flex-shrink-0">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${
                activeTab === "info"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
              }`}
            >
              Test Info
            </button>
            <button
              onClick={() => setActiveTab("sections")}
              className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${
                activeTab === "sections"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
              }`}
            >
              Sections
              {testSections.length > 0 && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({testSections.length})
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "info" && (
              <div className="space-y-4">
                {/* Test Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                    Test Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., January 2024 Regents"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                  >
                    <option value="">Select a subject...</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-neutral-100 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description for this test"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="settingsIsActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-200 dark:border-neutral-700"
                  />
                  <label
                    htmlFor="settingsIsActive"
                    className="text-sm text-gray-700 dark:text-neutral-300"
                  >
                    Active (visible to students)
                  </label>
                </div>

                {/* Scaled Score Table */}
                <div className="border-t border-gray-100 dark:border-neutral-800 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="settingsUseCustomScoreTable"
                      checked={useCustomScoreTable}
                      onChange={(e) => {
                        setUseCustomScoreTable(e.target.checked);
                        if (e.target.checked && scoreTableRows.length === 0) {
                          handleLoadDefaultScoreTable();
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-200 dark:border-neutral-700"
                    />
                    <label
                      htmlFor="settingsUseCustomScoreTable"
                      className="text-sm font-bold text-gray-900 dark:text-neutral-100"
                    >
                      Use custom scaled score table
                    </label>
                  </div>

                  {useCustomScoreTable && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 dark:text-neutral-400">
                            Max raw score:
                          </label>
                          <input
                            type="number"
                            value={maxRawScore}
                            onChange={(e) =>
                              handleMaxRawScoreChange(
                                parseInt(e.target.value) || 0
                              )
                            }
                            min={1}
                            max={200}
                            className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleLoadDefaultScoreTable}
                          className="px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 active:scale-95 transition-all"
                        >
                          Load Default
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateEmptyTable}
                          className="px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 active:scale-95 transition-all"
                        >
                          Generate Empty
                        </button>
                      </div>

                      {scoreTableRows.length > 0 && (
                        <div className="border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden">
                          <div className="grid grid-cols-2 bg-gray-50 dark:bg-neutral-950 border-b border-gray-100 dark:border-neutral-800">
                            <div className="px-3 py-2 text-left font-bold text-gray-700 dark:text-neutral-300 text-sm">
                              Raw Score
                            </div>
                            <div className="px-3 py-2 text-left font-bold text-gray-700 dark:text-neutral-300 text-sm">
                              Scaled Score
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {scoreTableRows.map((row, index) => (
                              <div
                                key={row.raw}
                                className={`grid grid-cols-2 border-b border-gray-100 dark:border-neutral-800 ${
                                  index % 2 === 0
                                    ? "bg-white dark:bg-neutral-900"
                                    : "bg-gray-50 dark:bg-neutral-950"
                                }`}
                              >
                                <div className="px-3 py-1.5 text-gray-900 dark:text-neutral-100 font-medium text-sm">
                                  {row.raw}
                                </div>
                                <div className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    value={row.scaled}
                                    onChange={(e) =>
                                      handleScaledScoreChange(
                                        row.raw,
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    min={0}
                                    max={100}
                                    className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        Maps raw scores to scaled scores (0-100). If not set,
                        the default Regents conversion table will be used.
                      </p>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}
              </div>
            )}

            {activeTab === "sections" && (
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-600 dark:text-neutral-400">
                    {totalQuestions} question{totalQuestions !== 1 ? "s" : ""} in
                    this test
                  </span>
                  {unassignedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {unassignedCount} unassigned
                    </span>
                  )}
                </div>

                {/* Section cards */}
                {testSections.map((section) => {
                  const range = sectionRanges[section.id] || {
                    from: "",
                    to: "",
                  };
                  const sectionError = sectionErrors[section.id];
                  const count = getRangeQuestionCount(range.from, range.to);
                  const isSavingThis = savingSectionId === section.id;

                  return (
                    <div
                      key={section.id}
                      className="border border-gray-100 dark:border-neutral-800 rounded-2xl p-3 space-y-3"
                    >
                      {/* Section header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-bold">
                            {section.name}
                            {section.questionCount !== undefined && (
                              <span className="text-xs font-normal opacity-70">
                                ({section.questionCount})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onShowSectionModal(section)}
                            className="p-1.5 text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full active:scale-95 transition-all"
                            title="Edit section"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSection(section.id)}
                            className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full active:scale-95 transition-all"
                            title="Delete section"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Range inputs */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600 dark:text-neutral-400">
                          From Q
                        </span>
                        <input
                          type="number"
                          value={range.from}
                          onChange={(e) =>
                            handleRangeChange(
                              section.id,
                              "from",
                              e.target.value
                            )
                          }
                          min={1}
                          max={totalQuestions}
                          placeholder="—"
                          className="w-16 px-2 py-1 text-sm text-center border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                        />
                        <span className="text-sm text-gray-600 dark:text-neutral-400">
                          to Q
                        </span>
                        <input
                          type="number"
                          value={range.to}
                          onChange={(e) =>
                            handleRangeChange(
                              section.id,
                              "to",
                              e.target.value
                            )
                          }
                          min={1}
                          max={totalQuestions}
                          placeholder="—"
                          className="w-16 px-2 py-1 text-sm text-center border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                        />
                        {count !== null && (
                          <span className="text-xs text-gray-400 dark:text-neutral-500">
                            ({count} question{count !== 1 ? "s" : ""})
                          </span>
                        )}
                        <button
                          onClick={() => handleApplyRange(section.id)}
                          disabled={!!sectionError || isSavingThis}
                          className="ml-auto px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                        >
                          {isSavingThis && (
                            <svg
                              className="animate-spin w-3 h-3"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          )}
                          Apply
                        </button>
                      </div>

                      {/* Inline error */}
                      {sectionError && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {sectionError}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Add Section button */}
                <button
                  onClick={() => onShowSectionModal(null)}
                  className="w-full py-2.5 text-sm font-bold text-gray-600 dark:text-neutral-400 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-2xl hover:border-gray-400 dark:hover:border-neutral-500 hover:text-gray-900 dark:hover:text-neutral-200 active:scale-[0.99] transition-all"
                >
                  + Add Section
                </button>
              </div>
            )}
          </div>

          {/* Footer — only for Test Info tab */}
          {activeTab === "info" && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTestInfo}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-bold text-white bg-black dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSaving && (
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
