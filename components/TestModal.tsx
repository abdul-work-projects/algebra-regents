"use client";

import { useState, useEffect } from "react";
import { Test, Subject } from "@/lib/types";
import { getDefaultScoreTable } from "@/lib/results";

interface ScoreTableRow {
  raw: number;
  scaled: number;
}

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (test: {
    name: string;
    description?: string;
    scaled_score_table?: { [key: string]: number };
    is_active: boolean;
    subject_id: string;
  }) => Promise<void>;
  editingTest?: Test | null;
  subjects: Subject[];
}

export default function TestModal({
  isOpen,
  onClose,
  onSave,
  editingTest,
  subjects,
}: TestModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [subjectId, setSubjectId] = useState("");
  const [useCustomScoreTable, setUseCustomScoreTable] = useState(false);
  const [scoreTableRows, setScoreTableRows] = useState<ScoreTableRow[]>([]);
  const [maxRawScore, setMaxRawScore] = useState(86);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (editingTest) {
      setName(editingTest.name);
      setDescription(editingTest.description || "");
      setIsActive(editingTest.isActive);
      setSubjectId(editingTest.subjectId);
      if (editingTest.scaledScoreTable) {
        setUseCustomScoreTable(true);
        const rows = objectToRows(editingTest.scaledScoreTable);
        setScoreTableRows(rows);
        if (rows.length > 0) {
          setMaxRawScore(Math.max(...rows.map((r) => r.raw)));
        }
      } else {
        setUseCustomScoreTable(false);
        setScoreTableRows([]);
      }
    } else {
      setName("");
      setDescription("");
      setIsActive(true);
      setSubjectId(subjects.length > 0 ? subjects[0].id : "");
      setUseCustomScoreTable(false);
      setScoreTableRows([]);
      setMaxRawScore(86);
    }
    setError(null);
  }, [editingTest, isOpen, subjects]);

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

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Test name is required");
      return;
    }

    if (!subjectId) {
      setError("Subject is required");
      return;
    }

    let scaledScoreTable: { [key: string]: number } | undefined;
    if (useCustomScoreTable && scoreTableRows.length > 0) {
      scaledScoreTable = rowsToObject(scoreTableRows);
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        scaled_score_table: scaledScoreTable,
        is_active: isActive,
        subject_id: subjectId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save test");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

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
              {editingTest ? "Edit Test" : "Create New Test"}
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

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
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
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-200 dark:border-neutral-700"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-neutral-300">
                Active (visible to students)
              </label>
            </div>

            {/* Scaled Score Table */}
            <div className="border-t border-gray-100 dark:border-neutral-800 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="useCustomScoreTable"
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
                  htmlFor="useCustomScoreTable"
                  className="text-sm font-bold text-gray-900 dark:text-neutral-100"
                >
                  Use custom scaled score table
                </label>
              </div>

              {useCustomScoreTable && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-neutral-400">Max raw score:</label>
                      <input
                        type="number"
                        value={maxRawScore}
                        onChange={(e) => handleMaxRawScoreChange(parseInt(e.target.value) || 0)}
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
                      Load Default Table
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateEmptyTable}
                      className="px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 active:scale-95 transition-all"
                    >
                      Generate Empty Table
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
                            className={`grid grid-cols-2 border-b border-gray-100 dark:border-neutral-800 ${index % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-gray-50 dark:bg-neutral-950"}`}
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
                    Maps raw scores to scaled scores (0-100). If not set, the default Regents conversion table will be used.
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

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-bold text-white bg-black dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isSaving ? "Saving..." : editingTest ? "Update Test" : "Create Test"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
