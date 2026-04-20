'use client';

import { TestAttempt } from '@/lib/testAttempts';

interface TestAttemptHistoryModalProps {
  testName: string;
  attempts: TestAttempt[];
  onClose: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function scoreBadgeClass(scaled: number): string {
  if (scaled >= 85) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (scaled >= 65) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  if (scaled >= 50) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
}

export default function TestAttemptHistoryModal({ testName, attempts, onClose }: TestAttemptHistoryModalProps) {
  const best = attempts.reduce((m, a) => Math.max(m, a.scaledScore), 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[300]" onClick={onClose} />
      <div className="fixed inset-0 z-[301] flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-neutral-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-neutral-800">
            <div className="min-w-0 flex-1 pr-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100 truncate">{testName}</h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
                {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}
                {attempts.length > 0 && <> · Best {best}/100</>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 -m-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {attempts.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500 dark:text-neutral-400">
                No attempts yet.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                {attempts.map((a, idx) => (
                  <li key={a.id} className="px-6 py-3 flex items-center gap-4">
                    <div className="text-xs font-bold text-gray-400 dark:text-neutral-500 tabular-nums shrink-0 w-6">
                      #{attempts.length - idx}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                        {formatDate(a.completedAt)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                        {a.correctCount}/{a.totalQuestions} correct · {a.accuracyPercent}% · {formatDuration(a.timeSpentSeconds)}
                        {a.testMode === 'practice' && <span className="ml-1">· Practice</span>}
                      </div>
                    </div>
                    <div className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-bold ${scoreBadgeClass(a.scaledScore)}`}>
                      {a.scaledScore}
                      <span className="text-xs font-medium opacity-70 ml-0.5">/100</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
