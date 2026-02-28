import { Test, Subject, TestSection } from "@/lib/types";
import { DatabaseQuestion } from "@/lib/supabase";
import {
  fetchSectionsWithCounts,
  deleteTestSection,
  bulkAssignQuestionsToSection,
} from "@/lib/supabase";
import { useState } from "react";

interface TestsTabProps {
  tests: Test[];
  subjects: Subject[];
  questions: DatabaseQuestion[];
  questionTestMap: { [questionId: string]: string[] };
  isLoading: boolean;
  filterSubjectId: string;
  onFilterSubjectIdChange: (id: string) => void;
  onCreateTest: () => void;
  onEditTest: (test: Test) => void;
  onDeleteTest: (test: Test) => void;
  onShowSectionModal: (section: TestSection | null) => void;
}

export default function TestsTab({
  tests,
  subjects,
  questions,
  questionTestMap,
  isLoading,
  filterSubjectId,
  onFilterSubjectIdChange,
  onCreateTest,
  onEditTest,
  onDeleteTest,
  onShowSectionModal,
}: TestsTabProps) {
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [testSections, setTestSections] = useState<TestSection[]>([]);
  const [testQuestionOrder, setTestQuestionOrder] = useState<{ [questionId: string]: number }>({});
  const [questionSectionMap, setQuestionSectionMap] = useState<{ [questionId: string]: string | undefined }>({});

  const loadSectionsForTest = async (testId: string) => {
    const sections = await fetchSectionsWithCounts(testId);
    setTestSections(sections);
  };

  const handleToggleTestSections = async (testId: string) => {
    if (expandedTestId === testId) {
      setExpandedTestId(null);
      setTestSections([]);
    } else {
      setExpandedTestId(testId);
      const sections = await fetchSectionsWithCounts(testId);
      setTestSections(sections);
      // Also build section assignments from questions
      const sectionMap: { [questionId: string]: string | undefined } = {};
      // We need to build section assignment from the questions
      const { fetchQuestionsForTest } = await import("@/lib/supabase");
      const testQuestions = await fetchQuestionsForTest(testId);
      const orderMap: { [questionId: string]: number } = {};
      testQuestions.forEach((q, index) => {
        orderMap[q.id] = index;
        sectionMap[q.id] = (q as any)._sectionId;
      });
      setTestQuestionOrder(orderMap);
      setQuestionSectionMap(sectionMap);
    }
  };

  const filteredTests = tests.filter(
    (test) => filterSubjectId === "all" || test.subjectId === filterSubjectId
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
            Tests
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            {filteredTests.length} test{filteredTests.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onCreateTest}
          className="px-4 py-2.5 text-sm font-bold bg-black text-white dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 transition-all"
        >
          + NEW TEST
        </button>
      </div>

      {/* Subject Filter */}
      {subjects.length > 1 && (
        <div className="mb-4">
          <select
            value={filterSubjectId}
            onChange={(e) => onFilterSubjectIdChange(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-medium focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
          >
            <option value="all">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
          Loading tests...
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
          No tests yet. Create your first test to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {filterSubjectId === "all" ? (
            subjects.map((subject) => {
              const subjectTests = filteredTests.filter((t) => t.subjectId === subject.id);
              if (subjectTests.length === 0) return null;
              return (
                <div key={subject.id}>
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">{subject.name}</h3>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800" />
                    <span className="text-xs text-gray-400 dark:text-neutral-500">{subjectTests.length}</span>
                  </div>
                  <div className="space-y-3">
                    {subjectTests.map((test) => renderTestCard(test))}
                  </div>
                </div>
              );
            })
          ) : (
            filteredTests.map((test) => renderTestCard(test))
          )}
        </div>
      )}
    </div>
  );

  function renderTestCard(test: Test) {
    return (
            <div
              key={test.id}
              className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm p-4 hover:border-gray-200 dark:hover:border-neutral-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-neutral-100 truncate">
                      {test.name}
                    </h3>
                    {!test.isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {test.description && (
                    <p className="text-sm text-gray-600 dark:text-neutral-400 truncate mb-2">
                      {test.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-neutral-400 flex-wrap">
                    {test.subjectName && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                        {test.subjectName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {test.questionCount || 0} questions
                    </span>
                    {test.scaledScoreTable && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Custom score table
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => onEditTest(test)}
                    className="p-2 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full active:scale-95 transition-all"
                    title="Edit test"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteTest(test)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full active:scale-95 transition-all"
                    title="Delete test"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleToggleTestSections(test.id)}
                    className={`p-2 rounded-full active:scale-95 transition-all ${
                      expandedTestId === test.id
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                        : "text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800"
                    }`}
                    title="Manage sections"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Section Management (expanded) */}
              {expandedTestId === test.id && (
                <div className="mt-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-neutral-300">Sections</h4>
                    <button
                      onClick={() => onShowSectionModal(null)}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    >
                      + Add Section
                    </button>
                  </div>
                  {(() => {
                    const testQuestionIds = questions
                      .filter((q) => questionTestMap[q.id]?.includes(test.id))
                      .sort((a, b) => {
                        const orderA = testQuestionOrder[a.id] ?? Infinity;
                        const orderB = testQuestionOrder[b.id] ?? Infinity;
                        return orderA - orderB;
                      })
                      .map((q) => q.id);
                    const totalQs = testQuestionIds.length;

                    const sectionRanges: { [sectionId: string]: { from: number; to: number } } = {};
                    testSections.forEach((section) => {
                      let minIdx = Infinity,
                        maxIdx = -1;
                      testQuestionIds.forEach((qId, idx) => {
                        if (questionSectionMap[qId] === section.id) {
                          minIdx = Math.min(minIdx, idx);
                          maxIdx = Math.max(maxIdx, idx);
                        }
                      });
                      if (maxIdx >= 0) {
                        sectionRanges[section.id] = { from: minIdx + 1, to: maxIdx + 1 };
                      }
                    });

                    return testSections.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-neutral-400 italic">
                        No sections. Questions will appear without section dividers.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {totalQs > 0 && (
                          <p className="text-xs text-gray-500 dark:text-neutral-400">
                            {totalQs} questions in this test. Assign sequential ranges below.
                          </p>
                        )}
                        {testSections.map((section) => {
                          const range = sectionRanges[section.id];
                          return (
                            <div key={section.id} className="p-2.5 bg-gray-50 dark:bg-neutral-800/50 rounded-xl">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800 dark:text-neutral-200">
                                    {section.name}
                                  </span>
                                  {section.questionCount !== undefined && section.questionCount > 0 && (
                                    <span className="text-[10px] text-gray-400 dark:text-neutral-500">
                                      ({section.questionCount} assigned)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onShowSectionModal(section)}
                                    className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (window.confirm("Delete this section?")) {
                                        await deleteTestSection(section.id);
                                        loadSectionsForTest(test.id);
                                      }
                                    }}
                                    className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {totalQs > 0 && (
                                <form
                                  className="flex items-center gap-2"
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.currentTarget;
                                    const fromInput = form.elements.namedItem("from") as HTMLInputElement;
                                    const toInput = form.elements.namedItem("to") as HTMLInputElement;
                                    const from = parseInt(fromInput.value);
                                    const to = parseInt(toInput.value);
                                    if (isNaN(from) || isNaN(to) || from < 1 || to > totalQs || from > to) {
                                      alert(`Enter valid range between 1 and ${totalQs}`);
                                      return;
                                    }
                                    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
                                    btn.disabled = true;
                                    btn.textContent = "...";

                                    const currentlyAssigned = testQuestionIds.filter(
                                      (qId) => questionSectionMap[qId] === section.id
                                    );
                                    if (currentlyAssigned.length > 0) {
                                      await bulkAssignQuestionsToSection(test.id, currentlyAssigned, null);
                                    }

                                    const newIds = testQuestionIds.slice(from - 1, to);
                                    await bulkAssignQuestionsToSection(test.id, newIds, section.id);

                                    setQuestionSectionMap((prev) => {
                                      const updated = { ...prev };
                                      currentlyAssigned.forEach((qId) => { updated[qId] = undefined; });
                                      newIds.forEach((qId) => { updated[qId] = section.id; });
                                      return updated;
                                    });

                                    loadSectionsForTest(test.id);
                                    btn.disabled = false;
                                    btn.textContent = "Assign";
                                  }}
                                >
                                  <span className="text-xs text-gray-600 dark:text-neutral-400">Q</span>
                                  <input
                                    name="from"
                                    type="number"
                                    min={1}
                                    max={totalQs}
                                    defaultValue={range?.from || ""}
                                    placeholder="1"
                                    className="w-14 px-1.5 py-1 text-xs border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 text-center focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none"
                                  />
                                  <span className="text-xs text-gray-600 dark:text-neutral-400">to</span>
                                  <input
                                    name="to"
                                    type="number"
                                    min={1}
                                    max={totalQs}
                                    defaultValue={range?.to || ""}
                                    placeholder={String(totalQs)}
                                    className="w-14 px-1.5 py-1 text-xs border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 text-center focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none"
                                  />
                                  <button
                                    type="submit"
                                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
                                  >
                                    Assign
                                  </button>
                                </form>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
    );
  }
}
