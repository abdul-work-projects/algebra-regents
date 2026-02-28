import { useState } from "react";
import { Test, Subject } from "@/lib/types";
import TestMultiSelect from "@/components/TestMultiSelect";

interface CsvPreviewRow {
  question_text: string;
  answers: string[];
  correct_answer: number;
  points: number;
  difficulty: "easy" | "medium" | "hard" | null;
  skills: string[];
  tags: string[];
}

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: Test[];
  subjects: Subject[];
  onUpload: (csvData: CsvPreviewRow[], testIds: string[]) => Promise<void>;
}

function parseCSV(text: string): CsvPreviewRow[] {
  // Split CSV into rows, respecting quoted fields that span multiple lines
  const splitCsvRows = (csv: string): string[] => {
    const rows: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && csv[i + 1] === '\n') i++; // skip \r\n
        const trimmed = current.trim();
        if (trimmed) rows.push(trimmed);
        current = "";
      } else {
        current += char;
      }
    }
    const trimmed = current.trim();
    if (trimmed) rows.push(trimmed);
    return rows;
  };

  const lines = splitCsvRows(text);
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row");
  }

  const parseRow = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headerRow = parseRow(lines[0]);
  const header = headerRow.map((h) => h.trim().toLowerCase());

  let questionIdx: number;
  let correctIdx: number;
  let answerIndices: number[];
  let pointsIdx = -1;
  let difficultyIdx = -1;
  let mainSkillIdx = -1;
  let tagStartIdx = -1;

  questionIdx = header.findIndex((h) => h === "question_text");
  correctIdx = header.findIndex((h) => h === "correct_answer");
  answerIndices = [
    header.findIndex((h) => h === "choice_1"),
    header.findIndex((h) => h === "choice_2"),
    header.findIndex((h) => h === "choice_3"),
    header.findIndex((h) => h === "choice_4"),
  ];
  pointsIdx = header.findIndex((h) => h === "points");
  difficultyIdx = header.findIndex((h) => h === "difficulty_level");
  mainSkillIdx = header.findIndex((h) => h === "main_skill");

  if (mainSkillIdx !== -1) {
    tagStartIdx = mainSkillIdx + 1;
  }

  if (questionIdx === -1)
    throw new Error('CSV must have a "Question" or "question_text" column');
  if (correctIdx === -1)
    throw new Error('CSV must have a "Correct" or "correct_answer" column');
  if (answerIndices.some((i) => i === -1))
    throw new Error("CSV must have answer columns (1-4 or choice_1-4)");

  const questions: CsvPreviewRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const questionText = values[questionIdx] || "";
    const answers = answerIndices.map((idx) => values[idx] || "");
    const correctAnswer = parseInt(values[correctIdx]) || 1;
    const points = pointsIdx !== -1 ? parseInt(values[pointsIdx]) || 1 : 1;
    const difficultyRaw = difficultyIdx !== -1 ? values[difficultyIdx]?.toLowerCase() : null;
    const difficulty: "easy" | "medium" | "hard" | null =
      difficultyRaw === "easy" ? "easy" : difficultyRaw === "medium" ? "medium" : difficultyRaw === "hard" ? "hard" : null;

    const skills: string[] = [];
    if (mainSkillIdx !== -1 && values[mainSkillIdx]?.trim()) {
      skills.push(values[mainSkillIdx].trim());
    }

    const tags: string[] = [];
    if (tagStartIdx !== -1) {
      for (let t = tagStartIdx; t < values.length; t++) {
        const tagValue = values[t]?.trim();
        if (tagValue) tags.push(tagValue);
      }
    }

    if (!questionText.trim()) continue;

    questions.push({ question_text: questionText, answers, correct_answer: correctAnswer, points, difficulty, skills, tags });
  }

  return questions;
}

export default function CsvUploadModal({ isOpen, onClose, tests, subjects, onUpload }: CsvUploadModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleClose = () => {
    setCsvFile(null);
    setCsvPreview([]);
    setCsvError(null);
    setSelectedTestIds([]);
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError(null);
    setCsvPreview([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setCsvPreview(parsed);
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (csvPreview.length === 0) return;
    if (selectedTestIds.length === 0) {
      setCsvError("Questions must be assigned to at least one test");
      return;
    }
    setIsUploading(true);
    setCsvError(null);
    try {
      await onUpload(csvPreview, selectedTestIds);
      handleClose();
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Failed to upload questions");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Bulk Upload Questions</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
            />
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
              Format: question_text, choice_1-4, correct_answer, Points, difficulty_level, Main Skill, [tags...]
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Assign to Tests</label>
            {tests.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-neutral-400 italic">No tests available</p>
            ) : (
              <TestMultiSelect tests={tests} subjects={subjects} selectedTestIds={selectedTestIds} onChange={setSelectedTestIds} placeholder="Select tests..." />
            )}
          </div>

          {csvError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {csvError}
            </div>
          )}

          {csvPreview.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Preview ({csvPreview.length} questions)
              </h3>
              <div className="border border-gray-100 dark:border-neutral-800 rounded-xl overflow-auto max-h-80">
                <div style={{ minWidth: "1400px" }}>
                  <div className="flex bg-gray-50 dark:bg-neutral-950 sticky top-0 border-b border-gray-100 dark:border-neutral-800 text-xs font-bold text-gray-700 dark:text-neutral-300">
                    <div className="px-3 py-2" style={{ width: "40px", flexShrink: 0 }}>#</div>
                    <div className="px-3 py-2" style={{ width: "250px", flexShrink: 0 }}>Question</div>
                    <div className="px-3 py-2" style={{ width: "150px", flexShrink: 0 }}>Choice 1</div>
                    <div className="px-3 py-2" style={{ width: "150px", flexShrink: 0 }}>Choice 2</div>
                    <div className="px-3 py-2" style={{ width: "150px", flexShrink: 0 }}>Choice 3</div>
                    <div className="px-3 py-2" style={{ width: "150px", flexShrink: 0 }}>Choice 4</div>
                    <div className="px-3 py-2" style={{ width: "60px", flexShrink: 0 }}>Correct</div>
                    <div className="px-3 py-2" style={{ width: "40px", flexShrink: 0 }}>Pts</div>
                    <div className="px-3 py-2" style={{ width: "80px", flexShrink: 0 }}>Difficulty</div>
                    <div className="px-3 py-2" style={{ width: "120px", flexShrink: 0 }}>Skill</div>
                    <div className="px-3 py-2" style={{ width: "200px", flexShrink: 0 }}>Tags</div>
                  </div>
                  {csvPreview.map((q, i) => (
                    <div
                      key={i}
                      className={`flex text-xs border-b border-gray-100 dark:border-neutral-800 ${
                        i % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-gray-50 dark:bg-neutral-950"
                      }`}
                    >
                      <div className="px-3 py-2 text-gray-500 dark:text-neutral-400" style={{ width: "40px", flexShrink: 0 }}>{i + 1}</div>
                      <div className="px-3 py-2 text-gray-900 dark:text-neutral-100" style={{ width: "250px", flexShrink: 0 }}>{q.question_text}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400" style={{ width: "150px", flexShrink: 0 }}>{q.answers[0] || "-"}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400" style={{ width: "150px", flexShrink: 0 }}>{q.answers[1] || "-"}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400" style={{ width: "150px", flexShrink: 0 }}>{q.answers[2] || "-"}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400" style={{ width: "150px", flexShrink: 0 }}>{q.answers[3] || "-"}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400 font-medium" style={{ width: "60px", flexShrink: 0 }}>{q.correct_answer}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400" style={{ width: "40px", flexShrink: 0 }}>{q.points}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400 capitalize" style={{ width: "80px", flexShrink: 0 }}>{q.difficulty || "-"}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400" style={{ width: "120px", flexShrink: 0 }}>{q.skills[0] || "-"}</div>
                      <div className="px-3 py-2 text-gray-600 dark:text-neutral-400" style={{ width: "200px", flexShrink: 0 }}>{q.tags.length > 0 ? q.tags.join(", ") : "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={csvPreview.length === 0 || isUploading}
            className="px-4 py-2 text-sm font-bold bg-black text-white dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUploading ? "Uploading..." : `Upload ${csvPreview.length} Questions`}
          </button>
        </div>
      </div>
    </div>
  );
}
