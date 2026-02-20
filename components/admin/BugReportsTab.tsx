import { DatabaseBugReport } from "@/lib/bugReports";
import { DatabaseQuestion } from "@/lib/supabase";
import MathText from "@/components/MathText";

interface BugReportsTabProps {
  bugReports: DatabaseBugReport[];
  isLoading: boolean;
  bugStatusFilter: "all" | "open" | "reviewed" | "resolved";
  onBugStatusFilterChange: (filter: "all" | "open" | "reviewed" | "resolved") => void;
  bugCounts: { open: number; reviewed: number; resolved: number };
  expandedBugId: string | null;
  onToggleBugExpand: (id: string | null) => void;
  onBugStatusChange: (reportId: string, newStatus: "open" | "reviewed" | "resolved") => void;
  onDeleteBug: (reportId: string) => void;
  questions: DatabaseQuestion[];
  testNamesMap: { [id: string]: string };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BugReportsTab({
  bugReports,
  isLoading,
  bugStatusFilter,
  onBugStatusFilterChange,
  bugCounts,
  expandedBugId,
  onToggleBugExpand,
  onBugStatusChange,
  onDeleteBug,
  questions,
  testNamesMap,
}: BugReportsTabProps) {
  const getQuestionPreview = (questionId: string | null) => {
    if (!questionId) return null;
    return questions.find((q) => q.id === questionId);
  };

  const totalReports = bugCounts.open + bugCounts.reviewed + bugCounts.resolved;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
            Bug Reports
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            {totalReports} total report{totalReports !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => onBugStatusFilterChange("all")}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
            bugStatusFilter === "all"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
          }`}
        >
          All ({totalReports})
        </button>
        <button
          onClick={() => onBugStatusFilterChange("open")}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
            bugStatusFilter === "open"
              ? "bg-red-600 text-white"
              : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
          }`}
        >
          Open ({bugCounts.open})
        </button>
        <button
          onClick={() => onBugStatusFilterChange("reviewed")}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
            bugStatusFilter === "reviewed"
              ? "bg-yellow-500 text-white"
              : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
          }`}
        >
          Reviewed ({bugCounts.reviewed})
        </button>
        <button
          onClick={() => onBugStatusFilterChange("resolved")}
          className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
            bugStatusFilter === "resolved"
              ? "bg-green-600 text-white"
              : "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"
          }`}
        >
          Resolved ({bugCounts.resolved})
        </button>
      </div>

      {/* Bug Reports List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-neutral-700 rounded-full" />
                    <div className="h-5 w-12 bg-gray-100 dark:bg-neutral-800 rounded-full" />
                    <div className="h-5 w-24 bg-gray-100 dark:bg-neutral-800 rounded-full" />
                  </div>
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-100 dark:bg-neutral-800 rounded" />
                </div>
                <div className="h-5 w-5 bg-gray-100 dark:bg-neutral-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : bugReports.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
          {bugStatusFilter === "all"
            ? "No bug reports yet."
            : `No ${bugStatusFilter} reports.`}
        </div>
      ) : (
        <div className="space-y-3">
          {bugReports.map((report) => {
            const question = getQuestionPreview(report.question_id);
            const isExpanded = expandedBugId === report.id;

            return (
              <div
                key={report.id}
                className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Report Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
                  onClick={() => onToggleBugExpand(isExpanded ? null : report.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            report.status === "open"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : report.status === "reviewed"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          }`}
                        >
                          {report.status.toUpperCase()}
                        </span>
                        {report.question_number && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 rounded-full">
                            Q#{report.question_number}
                          </span>
                        )}
                        {report.test_id && testNamesMap[report.test_id] && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                            {testNamesMap[report.test_id]}
                          </span>
                        )}
                        {report.screenshot_url && (
                          <span className="text-purple-500" title="Has screenshot">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 dark:text-neutral-100 line-clamp-2">
                        {report.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                        {formatDate(report.created_at)}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 dark:text-neutral-500 transition-transform flex-shrink-0 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-neutral-800 p-4 bg-gray-50 dark:bg-neutral-950">
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-gray-700 dark:text-neutral-300 mb-1">Description</h4>
                      <p className="text-sm text-gray-900 dark:text-neutral-100 whitespace-pre-wrap">
                        {report.description}
                      </p>
                    </div>

                    {report.screenshot_url && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-neutral-300 mb-2">Screenshot</h4>
                        <a href={report.screenshot_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={report.screenshot_url}
                            alt="Bug screenshot"
                            className="max-w-sm rounded-xl border border-gray-200 dark:border-neutral-700 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      </div>
                    )}

                    {question && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-neutral-300 mb-2">Question Preview</h4>
                        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 p-3">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {report.question_number && (
                              <span className="px-2 py-0.5 text-xs font-bold bg-black dark:bg-white text-white dark:text-black rounded-full">
                                Question #{report.question_number}
                              </span>
                            )}
                            {report.test_id && testNamesMap[report.test_id] && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                                {testNamesMap[report.test_id]}
                              </span>
                            )}
                            {question.skills && question.skills.length > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                {question.skills.join(", ")}
                              </span>
                            )}
                          </div>
                          {question.question_image_url && (
                            <img src={question.question_image_url} alt="Question" className="max-w-xs rounded mb-2" />
                          )}
                          {question.question_text && (
                            <div className="text-sm text-gray-800 dark:text-neutral-200 mb-2">
                              <MathText text={question.question_text} />
                            </div>
                          )}
                          <div className="text-xs text-green-700 dark:text-green-400 mt-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
                            <span className="font-semibold">Correct Answer:</span>{" "}
                            ({question.correct_answer}){" "}
                            <MathText text={question.answers[question.correct_answer - 1]} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {report.status !== "reviewed" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onBugStatusChange(report.id, "reviewed"); }}
                          className="px-4 py-2 text-xs font-bold bg-yellow-500 text-white rounded-full hover:bg-yellow-600 active:scale-95 transition-all"
                        >
                          Mark Reviewed
                        </button>
                      )}
                      {report.status !== "resolved" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onBugStatusChange(report.id, "resolved"); }}
                          className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-full hover:bg-green-700 active:scale-95 transition-all"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {report.status === "resolved" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onBugStatusChange(report.id, "open"); }}
                          className="px-4 py-2 text-xs font-bold bg-gray-500 text-white rounded-full hover:bg-gray-600 active:scale-95 transition-all"
                        >
                          Reopen
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteBug(report.id); }}
                        className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
