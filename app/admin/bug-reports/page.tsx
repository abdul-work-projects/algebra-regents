'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, onAuthStateChange } from '@/lib/auth';
import {
  fetchBugReports,
  updateBugReportStatus,
  deleteBugReport,
  getBugReportCounts,
  DatabaseBugReport,
  convertToBugReportFormat,
} from '@/lib/bugReports';
import { fetchTestById, fetchQuestions, DatabaseQuestion } from '@/lib/supabase';
import MathText from '@/components/MathText';

export default function BugReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [reports, setReports] = useState<DatabaseBugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'reviewed' | 'resolved'>('all');
  const [counts, setCounts] = useState({ open: 0, reviewed: 0, resolved: 0 });
  const [testNames, setTestNames] = useState<{ [id: string]: string }>({});
  const [questions, setQuestions] = useState<DatabaseQuestion[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/admin/login');
        return;
      }
      setUser(currentUser);
      setIsCheckingAuth(false);
    }

    checkAuth();

    const subscription = onAuthStateChange((user) => {
      if (!user) {
        router.push('/admin/login');
      } else {
        setUser(user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setIsLoading(true);

    // Fetch reports based on filter
    const filter = statusFilter === 'all' ? undefined : statusFilter;
    const data = await fetchBugReports(filter);
    setReports(data);

    // Fetch counts
    const reportCounts = await getBugReportCounts();
    setCounts(reportCounts);

    // Fetch questions for preview
    const allQuestions = await fetchQuestions();
    setQuestions(allQuestions);

    // Fetch test names for reports
    const uniqueTestIds = [...new Set(data.filter(r => r.test_id).map(r => r.test_id!))];
    const testNameMap: { [id: string]: string } = {};
    await Promise.all(
      uniqueTestIds.map(async (testId) => {
        const test = await fetchTestById(testId);
        if (test) {
          testNameMap[testId] = test.name;
        }
      })
    );
    setTestNames(testNameMap);

    setIsLoading(false);
  };

  const handleStatusChange = async (reportId: string, newStatus: 'open' | 'reviewed' | 'resolved') => {
    const success = await updateBugReportStatus(reportId, newStatus);
    if (success) {
      loadData();
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    const success = await deleteBugReport(reportId);
    if (success) {
      loadData();
    }
  };

  const getQuestionPreview = (questionId: string | null) => {
    if (!questionId) return null;
    return questions.find(q => q.id === questionId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const totalReports = counts.open + counts.reviewed + counts.resolved;

  return (
    <div className="min-h-screen bg-white py-4">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bug Reports</h1>
              <p className="text-sm text-gray-600">
                {totalReports} total reports
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="text-sm px-4 py-2 font-bold text-gray-700 border-2 border-gray-300 hover:border-black hover:bg-gray-50 active:scale-95 rounded-xl transition-all"
            >
              BACK TO ADMIN
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({totalReports})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                statusFilter === 'open'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Open ({counts.open})
            </button>
            <button
              onClick={() => setStatusFilter('reviewed')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                statusFilter === 'reviewed'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              Reviewed ({counts.reviewed})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                statusFilter === 'resolved'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Resolved ({counts.resolved})
            </button>
          </div>
        </div>

        {/* Reports List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {statusFilter === 'all'
              ? 'No bug reports yet.'
              : `No ${statusFilter} reports.`}
          </div>
        ) : (
          <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-200">
            {reports.map((report) => {
              const question = getQuestionPreview(report.question_id);
              const isExpanded = expandedReport === report.id;

              return (
                <div key={report.id}>
                  {/* Report Row */}
                  <div
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
                    onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Status Indicator */}
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          report.status === 'open'
                            ? 'bg-red-500'
                            : report.status === 'reviewed'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        title={report.status}
                      />

                      {/* Question Info */}
                      <div className="w-28 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900">
                          Q#{report.question_number || '?'}
                        </span>
                        {report.test_id && testNames[report.test_id] && (
                          <p className="text-xs text-gray-500 truncate">
                            {testNames[report.test_id]}
                          </p>
                        )}
                      </div>

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">
                          {report.description}
                        </p>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {report.screenshot_url && (
                          <span title="Has screenshot">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                        )}
                        <span className="text-xs text-gray-400 w-24 text-right">
                          {formatDate(report.created_at)}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t-2 border-gray-100 bg-gray-50">
                      {/* Two Column Layout */}
                      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Report Details */}
                        <div className="space-y-5">
                          {/* Status & Info */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-3 py-1 text-xs font-bold rounded-full ${
                                report.status === 'open'
                                  ? 'bg-red-100 text-red-700'
                                  : report.status === 'reviewed'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {report.status.toUpperCase()}
                            </span>
                            <span className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                              Question #{report.question_number}
                            </span>
                            {report.test_id && testNames[report.test_id] && (
                              <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                {testNames[report.test_id]}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Description</h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                              {report.description}
                            </p>
                          </div>

                          {/* Screenshot */}
                          {report.screenshot_url && (
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Screenshot</h4>
                              <a
                                href={report.screenshot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={report.screenshot_url}
                                  alt="Bug screenshot"
                                  className="w-full rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                                />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Question Preview */}
                        <div>
                          {question ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-4 h-full">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Question Preview</h4>

                              {/* Topics */}
                              {question.topics && question.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {question.topics.map((topic, i) => (
                                    <span key={i} className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Question Content */}
                              {question.question_image_url && (
                                <img
                                  src={question.question_image_url}
                                  alt="Question"
                                  className="max-w-full rounded-lg mb-3"
                                />
                              )}
                              {question.question_text && (
                                <div className="text-sm text-gray-800 mb-4">
                                  <MathText text={question.question_text} />
                                </div>
                              )}

                              {/* Correct Answer */}
                              <div className="pt-3 border-t border-gray-100">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Correct Answer</span>
                                <div className="mt-1 text-sm text-green-700 font-medium">
                                  ({question.correct_answer}) <MathText text={question.answers[question.correct_answer - 1]} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-4 h-full flex items-center justify-center">
                              <p className="text-sm text-gray-400">Question not found</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="px-5 py-4 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {report.status !== 'reviewed' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(report.id, 'reviewed'); }}
                              className="px-4 py-2 text-sm font-bold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 active:scale-95 transition-all"
                            >
                              Mark Reviewed
                            </button>
                          )}
                          {report.status !== 'resolved' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(report.id, 'resolved'); }}
                              className="px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all"
                            >
                              Mark Resolved
                            </button>
                          )}
                          {report.status === 'resolved' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(report.id, 'open'); }}
                              className="px-4 py-2 text-sm font-bold bg-gray-500 text-white rounded-lg hover:bg-gray-600 active:scale-95 transition-all"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {report.question_id && (
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/admin?editQuestion=${report.question_id}`); }}
                              className="px-4 py-2 text-sm font-bold border-2 border-gray-300 bg-white text-gray-700 rounded-lg hover:border-black hover:bg-gray-50 active:scale-95 transition-all"
                            >
                              Edit Question
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                            className="px-4 py-2 text-sm font-bold text-red-600 border-2 border-red-200 bg-white rounded-lg hover:bg-red-50 active:scale-95 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
