import { useState, useRef } from "react";
import { Test, TestSection, Subject } from "@/lib/types";
import { DatabaseQuestion, DatabasePassage } from "@/lib/supabase";
import MathText from "@/components/MathText";

type QuestionWithPassage = DatabaseQuestion & {
  passages?: DatabasePassage | null;
};

interface QuestionListProps {
  questions: QuestionWithPassage[];
  tests: Test[];
  questionTestMap: { [questionId: string]: string[] };
  testQuestionOrder: { [questionId: string]: number };
  testSections: TestSection[];
  questionSectionMap: { [questionId: string]: string | undefined };
  subjects: Subject[];
  filterSubjectId: string;
  onFilterSubjectIdChange: (subjectId: string) => void;
  filterTestId: string;
  onFilterTestIdChange: (testId: string) => void;
  editingId: string | null;
  isLoadingQuestions: boolean;
  selectedForGrouping: string[];
  onToggleQuestionSelection: (questionId: string) => void;
  onLinkQuestions: () => void;
  onShowCsvModal: () => void;
  onResetForm: () => void;
  onLoadQuestionForEdit: (question: QuestionWithPassage) => void;
  onDeleteQuestion: (id: string) => void;
  onQuestionsReorder: (newQuestions: QuestionWithPassage[]) => void;
  onTestQuestionOrderChange: (newOrder: {
    [questionId: string]: number;
  }) => void;
  onDragDrop: (e: React.DragEvent) => void;
  onShowTestSettings: () => void;
  onUngroupQuestions: (passageId: string, questionIds: string[]) => void;
}

export default function QuestionList({
  questions,
  tests,
  questionTestMap,
  testQuestionOrder,
  testSections,
  questionSectionMap,
  subjects,
  filterSubjectId,
  onFilterSubjectIdChange,
  filterTestId,
  onFilterTestIdChange,
  editingId,
  isLoadingQuestions,
  selectedForGrouping,
  onToggleQuestionSelection,
  onLinkQuestions,
  onShowCsvModal,
  onResetForm,
  onLoadQuestionForEdit,
  onDeleteQuestion,
  onQuestionsReorder,
  onTestQuestionOrderChange,
  onDragDrop,
  onShowTestSettings,
  onUngroupQuestions,
}: QuestionListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(
    null,
  );
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [originalQuestions, setOriginalQuestions] = useState<
    QuestionWithPassage[] | null
  >(null);
  const [originalTestOrder, setOriginalTestOrder] = useState<{
    [questionId: string]: number;
  } | null>(null);
  const dropSuccessRef = useRef(false);

  const handleQuestionDragStart = (e: React.DragEvent, questionId: string) => {
    dropSuccessRef.current = false;
    setDraggedQuestionId(questionId);
    setDraggedGroupId(null);
    setOriginalQuestions([...questions]);
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      setOriginalTestOrder({ ...testQuestionOrder });
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", questionId);
  };

  const handleGroupDragStart = (
    e: React.DragEvent,
    passageId: string,
    questionIds: string[],
  ) => {
    dropSuccessRef.current = false;
    setDraggedGroupId(passageId);
    setDraggedQuestionId(questionIds[0]);
    setOriginalQuestions([...questions]);
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      setOriginalTestOrder({ ...testQuestionOrder });
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `group:${passageId}`);
  };

  const handleQuestionDragOver = (e: React.DragEvent, questionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!draggedQuestionId || draggedQuestionId === questionId) return;

    const targetQuestion = questions.find((q) => q.id === questionId);
    if (draggedGroupId && targetQuestion?.passage_id === draggedGroupId) return;

    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      const currentOrder = { ...testQuestionOrder };

      if (draggedGroupId) {
        const groupQuestionIds = questions
          .filter((q) => q.passage_id === draggedGroupId)
          .map((q) => q.id);
        const entries = Object.entries(currentOrder).sort(
          (a, b) => a[1] - b[1],
        );
        const targetIdx = entries.findIndex(([id]) => id === questionId);
        if (targetIdx === -1) return;

        const filteredEntries = entries.filter(
          ([id]) => !groupQuestionIds.includes(id),
        );
        const groupEntries = entries.filter(([id]) =>
          groupQuestionIds.includes(id),
        );
        let insertIdx = filteredEntries.findIndex(([id]) => id === questionId);
        if (insertIdx === -1) insertIdx = filteredEntries.length;
        filteredEntries.splice(insertIdx, 0, ...groupEntries);

        const newOrder: { [questionId: string]: number } = {};
        filteredEntries.forEach(([id], index) => {
          newOrder[id] = index;
        });
        onTestQuestionOrderChange(newOrder);
      } else {
        const draggedOrder = currentOrder[draggedQuestionId];
        const targetOrder = currentOrder[questionId];
        if (draggedOrder === undefined || targetOrder === undefined) return;
        if (draggedOrder === targetOrder) return;

        const entries = Object.entries(currentOrder).sort(
          (a, b) => a[1] - b[1],
        );
        const draggedIdx = entries.findIndex(
          ([id]) => id === draggedQuestionId,
        );
        let targetIdx = entries.findIndex(([id]) => id === questionId);
        if (draggedIdx === -1 || targetIdx === -1) return;

        const tq = questions.find((q) => q.id === questionId);
        if (tq?.passage_id) {
          const groupIds = new Set(
            questions
              .filter((q) => q.passage_id === tq.passage_id)
              .map((q) => q.id),
          );
          let groupFirst = -1,
            groupLast = -1;
          entries.forEach(([id], idx) => {
            if (groupIds.has(id)) {
              if (groupFirst === -1) groupFirst = idx;
              groupLast = idx;
            }
          });
          if (draggedIdx < groupFirst) targetIdx = groupLast;
          else if (draggedIdx > groupLast) targetIdx = groupFirst;
        }

        const [draggedEntry] = entries.splice(draggedIdx, 1);
        const insertIdx = draggedIdx < targetIdx ? targetIdx : targetIdx;
        entries.splice(insertIdx, 0, draggedEntry);

        const newOrder: { [questionId: string]: number } = {};
        entries.forEach(([id], index) => {
          newOrder[id] = index;
        });
        onTestQuestionOrderChange(newOrder);
      }
    } else {
      if (draggedGroupId) {
        const groupQuestions = questions.filter(
          (q) => q.passage_id === draggedGroupId,
        );
        const groupQuestionIds = groupQuestions.map((q) => q.id);
        const targetIndex = questions.findIndex((q) => q.id === questionId);
        if (targetIndex === -1) return;

        const newQuestions = questions.filter(
          (q) => !groupQuestionIds.includes(q.id),
        );
        let newTargetIndex = newQuestions.findIndex((q) => q.id === questionId);
        if (newTargetIndex === -1) newTargetIndex = newQuestions.length;
        newQuestions.splice(newTargetIndex, 0, ...groupQuestions);
        onQuestionsReorder(newQuestions);
      } else {
        const draggedIndex = questions.findIndex(
          (q) => q.id === draggedQuestionId,
        );
        let targetIndex = questions.findIndex((q) => q.id === questionId);
        if (
          draggedIndex === -1 ||
          targetIndex === -1 ||
          draggedIndex === targetIndex
        )
          return;

        const tq = questions[targetIndex];
        if (tq?.passage_id) {
          let groupFirst = -1,
            groupLast = -1;
          questions.forEach((q, idx) => {
            if (q.passage_id === tq.passage_id) {
              if (groupFirst === -1) groupFirst = idx;
              groupLast = idx;
            }
          });
          if (draggedIndex < groupFirst) targetIndex = groupLast;
          else if (draggedIndex > groupLast) targetIndex = groupFirst;
        }

        const newQuestions = [...questions];
        const [draggedQuestion] = newQuestions.splice(draggedIndex, 1);
        const insertIdx =
          draggedIndex < targetIndex ? targetIndex : targetIndex;
        newQuestions.splice(insertIdx, 0, draggedQuestion);
        onQuestionsReorder(newQuestions);
      }
    }
  };

  const handleQuestionDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dropSuccessRef.current = true;
    setDraggedQuestionId(null);
    setDraggedGroupId(null);
    setOriginalQuestions(null);
    setOriginalTestOrder(null);
    onDragDrop(e);
  };

  const handleQuestionDragEnd = () => {
    if (!dropSuccessRef.current) {
      if (originalQuestions) onQuestionsReorder(originalQuestions);
      if (originalTestOrder) onTestQuestionOrderChange(originalTestOrder);
    }
    setDraggedQuestionId(null);
    setDraggedGroupId(null);
    setOriginalQuestions(null);
    setOriginalTestOrder(null);
  };

  // Get test IDs for the selected subject
  const subjectTestIds =
    filterSubjectId === "all"
      ? null
      : new Set(
          tests.filter((t) => t.subjectId === filterSubjectId).map((t) => t.id),
        );

  // Filter tests shown in dropdown by subject
  const filteredTests =
    filterSubjectId === "all"
      ? tests
      : tests.filter((t) => t.subjectId === filterSubjectId);

  // Filter and sort questions
  const testFilteredQuestions = questions
    .filter((q) => {
      if (filterTestId !== "all")
        return questionTestMap[q.id]?.includes(filterTestId);
      if (subjectTestIds)
        return questionTestMap[q.id]?.some((tid) => subjectTestIds.has(tid));
      return true;
    })
    .sort((a, b) => {
      if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
        const orderA = testQuestionOrder[a.id] ?? Infinity;
        const orderB = testQuestionOrder[b.id] ?? Infinity;
        return orderA - orderB;
      }
      return 0;
    });

  // Build original position map — parts-type passages share a number (Q1a, Q1b)
  const originalIndexMap = new Map<string, number>();
  const partLabelMap = new Map<string, string>(); // questionId -> "a", "b", etc.
  let origIdx = 0;
  const origProcessedPassages = new Set<string>();
  const PART_LABELS = 'abcdefghijklmnopqrstuvwxyz';
  testFilteredQuestions.forEach((q) => {
    if (q.passage_id) {
      if (!origProcessedPassages.has(q.passage_id)) {
        origProcessedPassages.add(q.passage_id);
        const grouped = testFilteredQuestions.filter(
          (gq) => gq.passage_id === q.passage_id,
        );
        const isPartsType = grouped[0]?.passages?.type === 'parts';
        if (isPartsType) {
          // All parts share the same display number
          origIdx++;
          grouped.forEach((gq, pi) => {
            originalIndexMap.set(gq.id, origIdx);
            partLabelMap.set(gq.id, PART_LABELS[pi] || String(pi + 1));
          });
        } else {
          // Grouped type: each gets its own number
          grouped.forEach((gq) => {
            origIdx++;
            originalIndexMap.set(gq.id, origIdx);
          });
        }
      }
    } else {
      origIdx++;
      originalIndexMap.set(q.id, origIdx);
    }
  });

  // Apply search filter
  const filteredQuestions = testFilteredQuestions.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.name?.toLowerCase().includes(query) ||
      q.question_text?.toLowerCase().includes(query) ||
      (q.skills || []).some((t) => t.toLowerCase().includes(query)) ||
      q.answers.some((a) => a?.toLowerCase().includes(query))
    );
  });

  // Group questions by passage_id
  const processedPassageIds = new Set<string>();
  const groupedItems: Array<{
    type: "single" | "grouped";
    questions: typeof filteredQuestions;
    passageId?: string;
  }> = [];

  filteredQuestions.forEach((question) => {
    if (question.passage_id) {
      if (processedPassageIds.has(question.passage_id)) return;
      processedPassageIds.add(question.passage_id);
      const groupedQuestions = filteredQuestions.filter(
        (q) => q.passage_id === question.passage_id,
      );
      groupedItems.push({
        type: "grouped",
        questions: groupedQuestions,
        passageId: question.passage_id,
      });
    } else {
      groupedItems.push({ type: "single", questions: [question] });
    }
  });

  const totalFilteredCount = testFilteredQuestions.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.name?.toLowerCase().includes(query) ||
      q.question_text?.toLowerCase().includes(query) ||
      (q.skills || []).some((t) => t.toLowerCase().includes(query)) ||
      q.answers.some((a) => a?.toLowerCase().includes(query))
    );
  }).length;

  const renderQuestionItem = (
    question: QuestionWithPassage,
    index: number,
    isGrouped: boolean,
    groupPosition?: "first" | "last" | "middle",
    ungroupInfo?: { passageId: string; questionIds: string[] },
  ) => {
    const isPartsType = question.passages?.type === 'parts';
    const partLabel = partLabelMap.get(question.id);
    const displayNum = partLabel ? `Q${index}${partLabel}` : `Q${index}`;
    const badgeLabel = isPartsType ? null : isGrouped ? 'Grouped' : null;

    return (
    <div
      key={question.id}
      draggable={!isGrouped}
      onDragStart={(e) => !isGrouped && handleQuestionDragStart(e, question.id)}
      onDragOver={(e) => !isGrouped && handleQuestionDragOver(e, question.id)}
      onDrop={!isGrouped ? handleQuestionDrop : undefined}
      onDragEnd={!isGrouped ? handleQuestionDragEnd : undefined}
      className={`border p-3 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-all ${
        !isGrouped ? "cursor-grab active:cursor-grabbing rounded-2xl" : ""
      } ${
        editingId === question.id
          ? "border-black dark:border-neutral-400 bg-gray-50 dark:bg-neutral-800"
          : selectedForGrouping.includes(question.id)
            ? "border-purple-400 bg-purple-50 dark:bg-purple-900/30"
            : "border-gray-100 dark:border-neutral-800"
      } ${draggedQuestionId === question.id ? "opacity-40 bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" : ""} ${
        isGrouped && groupPosition === "first" ? "rounded-t-2xl border-b-0" : ""
      } ${isGrouped && groupPosition === "last" ? "rounded-b-2xl border-t-0" : ""} ${
        isGrouped && groupPosition === "middle" ? "border-t-0 border-b-0" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {!isGrouped && (
          <div className="flex-shrink-0 pt-0.5">
            <input
              type="checkbox"
              checked={selectedForGrouping.includes(question.id)}
              onChange={() => onToggleQuestionSelection(question.id)}
              className="w-4 h-4 text-purple-600 border-gray-300 dark:border-neutral-600 rounded focus:ring-purple-500 cursor-pointer dark:bg-neutral-800"
              title="Select to group with another question"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {!isGrouped && (
          <div className="flex-shrink-0 text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 pt-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-semibold text-gray-900 dark:text-neutral-100 truncate">
                  {isPartsType ? displayNum : (question.name || displayNum)}
                </p>
                {isGrouped && badgeLabel && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                      isPartsType
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    }`}
                    title={isPartsType ? "Part of a multi-part question" : "Grouped question (shares a passage)"}
                  >
                    {!isPartsType && (
                      <svg
                        className="w-2.5 h-2.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                    )}
                    {badgeLabel}
                  </span>
                )}
                {filterTestId !== "all" &&
                  testSections.length > 0 &&
                  questionSectionMap[question.id] && (
                    <span className="inline-block px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-medium flex-shrink-0">
                      {testSections.find(
                        (s) => s.id === questionSectionMap[question.id],
                      )?.name || "Section"}
                    </span>
                  )}
              </div>
              {question.name && (
                <p className="text-[10px] text-gray-400 dark:text-neutral-500">
                  {isPartsType ? question.name : displayNum}
                </p>
              )}
              <p className="text-xs text-gray-600 dark:text-neutral-400 truncate">
                {(question.skills || []).join(", ")}
              </p>
              {filterTestId === "all" &&
                questionTestMap[question.id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {questionTestMap[question.id].slice(0, 2).map((testId) => {
                      const test = tests.find((t) => t.id === testId);
                      return test ? (
                        <span
                          key={testId}
                          className="inline-block px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium truncate max-w-[200px]"
                          title={test.name}
                        >
                          {test.name}
                        </span>
                      ) : null;
                    })}
                    {questionTestMap[question.id].length > 2 && (
                      <span className="text-xs text-gray-500 dark:text-neutral-400">
                        +{questionTestMap[question.id].length - 2}
                      </span>
                    )}
                  </div>
                )}
            </div>
            {question.question_image_url && (
              <img
                src={question.question_image_url}
                alt={`Q${index + 1}`}
                className="w-10 h-10 object-cover rounded flex-shrink-0"
              />
            )}
            <div className="flex gap-1 flex-shrink-0">
              {ungroupInfo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUngroupQuestions(
                      ungroupInfo.passageId,
                      ungroupInfo.questionIds,
                    );
                  }}
                  className="p-1.5 text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full active:scale-95 transition-all"
                  title="Ungroup questions"
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
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => onLoadQuestionForEdit(question)}
                className="p-1.5 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full active:scale-95 transition-all"
                title={isGrouped ? "Edit grouped questions" : "Edit question"}
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
                onClick={() => onDeleteQuestion(question.id)}
                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full active:scale-95 transition-all"
                title="Delete question"
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
          {question.question_text && (
            <div className="text-xs text-gray-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
              <MathText text={question.question_text} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="lg:col-span-1 flex flex-col max-h-[calc(100vh-80px)]">
      {/* Search + Actions */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div className="relative flex-1 min-w-0">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full"
            >
              <svg
                className="w-4 h-4 text-gray-400"
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
          )}
        </div>
        {selectedForGrouping.length > 0 && (
          <>
            <span className="text-xs px-2 py-2 text-purple-700 dark:text-purple-400 font-medium whitespace-nowrap">
              {selectedForGrouping.length} selected
            </span>
            <button
              onClick={() => onToggleQuestionSelection("")}
              className="text-xs px-2 py-2 font-bold text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
              title="Clear selection"
            >
              Clear
            </button>
            {selectedForGrouping.length >= 2 && (
              <button
                onClick={onLinkQuestions}
                className="text-xs px-3 py-2 font-bold bg-purple-600 text-white rounded-full hover:bg-purple-700 active:scale-95 transition-all whitespace-nowrap"
                title="Group selected questions together"
              >
                Group
              </button>
            )}
          </>
        )}
        <button
          onClick={onShowCsvModal}
          className="flex-shrink-0 text-xs px-3 py-2 font-bold border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded-full hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all"
          title="Bulk upload questions from CSV"
        >
          Upload CSV
        </button>
        {editingId && (
          <button
            onClick={onResetForm}
            className="flex-shrink-0 text-xs px-3 py-2 font-bold bg-black text-white dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 transition-all"
            title="Clear form and add new question"
          >
            + NEW
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-3 flex-shrink-0 flex items-center gap-2">
        <select
          value={filterSubjectId}
          onChange={(e) => onFilterSubjectIdChange(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
        >
          <option value="all">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filterTestId}
          onChange={(e) => onFilterTestIdChange(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
        >
          <option value="all">All Tests</option>
          {filterSubjectId !== "all"
            ? filteredTests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.name} ({test.questionCount || 0})
                </option>
              ))
            : subjects.map((s) => {
                const subjectTests = tests.filter((t) => t.subjectId === s.id);
                if (subjectTests.length === 0) return null;
                return (
                  <optgroup key={s.id} label={s.name}>
                    {subjectTests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.name} ({test.questionCount || 0})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
        </select>
        {filterTestId !== "all" && (
          <button
            onClick={onShowTestSettings}
            className="flex-shrink-0 p-2 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full active:scale-95 transition-all"
            title="Test settings"
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
        {isLoadingQuestions ? (
          <div className="text-center py-8 text-gray-500 dark:text-neutral-400 text-sm">
            Loading...
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-neutral-400 text-sm">
            No questions yet
          </div>
        ) : (
          <div
            className="space-y-1 overflow-y-auto flex-1 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleQuestionDrop}
          >
            {groupedItems.map((item) => {
              if (item.type === "single") {
                const question = item.questions[0];
                return renderQuestionItem(
                  question,
                  originalIndexMap.get(question.id) || 0,
                  false,
                );
              } else {
                const groupQuestionIds = item.questions.map((q) => q.id);
                const isGroupBeingDragged = draggedGroupId === item.passageId;
                return (
                  <div
                    key={`group-${item.passageId}`}
                    className={`relative cursor-grab active:cursor-grabbing ${isGroupBeingDragged ? "opacity-40" : ""}`}
                    draggable
                    onDragStart={(e) =>
                      handleGroupDragStart(e, item.passageId!, groupQuestionIds)
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleQuestionDragOver(e, item.questions[0].id);
                    }}
                    onDrop={handleQuestionDrop}
                    onDragEnd={handleQuestionDragEnd}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400 rounded-l-2xl" />
                    <div className="ml-1">
                      {item.questions.map((question, qIndex) => {
                        const groupPosition =
                          qIndex === 0
                            ? "first"
                            : qIndex === item.questions.length - 1
                              ? "last"
                              : "middle";
                        return renderQuestionItem(
                          question,
                          originalIndexMap.get(question.id) || 0,
                          true,
                          groupPosition,
                          qIndex === 0
                            ? {
                                passageId: item.passageId!,
                                questionIds: groupQuestionIds,
                              }
                            : undefined,
                        );
                      })}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
