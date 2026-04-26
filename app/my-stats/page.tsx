'use client';

import { useEffect, useState } from 'react';
import { loadAttempts, AttemptsStore } from '@/lib/attempts';
import { loadTestAttempts, TestAttempt } from '@/lib/testAttempts';
import { loadMarkedForReview, loadSession } from '@/lib/storage';
import { fetchActiveTests, convertToTestFormat, fetchAllDashboardData, DashboardQuestion } from '@/lib/supabase';
import { Test, Subject } from '@/lib/types';
import DashboardSidebar from '@/components/DashboardSidebar';
import ThemeToggle from '@/components/ThemeToggle';
import ActivityHeatmap from '@/components/ActivityHeatmap';

interface SubjectQuestionsBucket {
  subject: Subject;
  questions: DashboardQuestion[];
}

const MASTERY_THRESHOLD_PERCENT = 85;
const MASTERY_MIN_ATTEMPTS = 3;

function MyStatsPage() {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attempts, setAttempts] = useState<AttemptsStore>({});
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [subjectBuckets, setSubjectBuckets] = useState<SubjectQuestionsBucket[]>([]);
  const [existingTest, setExistingTest] = useState<Test | null>(null);

  useEffect(() => {
    setMounted(true);
    setAttempts(loadAttempts());
    setTestAttempts(loadTestAttempts());
    setMarkedQuestions(loadMarkedForReview());

    (async () => {
      const { subjects: dbSubjects, questionsBySubject } = await fetchAllDashboardData();
      setSubjectBuckets(
        dbSubjects.map((s) => ({
          subject: { id: s.id, name: s.name, color: s.color, isActive: s.is_active, displayOrder: s.display_order },
          questions: questionsBySubject[s.id] || [],
        })),
      );

      const session = loadSession();
      if (session?.testId) {
        const tests = await fetchActiveTests();
        const match = tests.find((t) => t.id === session.testId);
        if (match) setExistingTest(convertToTestFormat(match));
      }
    })();
  }, []);

  if (!mounted) return null;

  // ── Stats ──────────────────────────────────────────────────────────────
  const attemptedIds = Object.keys(attempts);
  const questionsCompleted = attemptedIds.length;
  const correctCount = attemptedIds.reduce((n, id) => n + (attempts[id]?.isCorrect ? 1 : 0), 0);
  const accuracyPercent = questionsCompleted > 0 ? Math.round((correctCount / questionsCompleted) * 100) : 0;
  const savedQuestions = markedQuestions.size;

  // Days studied: count of distinct local-calendar days with at least one attempt or test attempt.
  const dayStudiedSet = new Set<string>();
  for (const a of Object.values(attempts)) {
    if (a.timestamp) dayStudiedSet.add(new Date(a.timestamp).toDateString());
  }
  for (const t of testAttempts) {
    dayStudiedSet.add(new Date(t.completedAt).toDateString());
  }
  const daysStudied = dayStudiedSet.size;

  // Areas mastered: skills with ≥ MASTERY_MIN_ATTEMPTS and accuracy ≥ MASTERY_THRESHOLD_PERCENT.
  const skillAgg = new Map<string, { attempted: number; correct: number; subjectId: string; subjectColor: string }>();
  for (const { subject, questions } of subjectBuckets) {
    for (const q of questions) {
      for (const skill of q.skills || []) {
        let entry = skillAgg.get(skill);
        if (!entry) {
          entry = { attempted: 0, correct: 0, subjectId: subject.id, subjectColor: subject.color };
          skillAgg.set(skill, entry);
        }
        const a = attempts[q.id];
        if (a) {
          entry.attempted++;
          if (a.isCorrect) entry.correct++;
        }
      }
    }
  }

  const masteredSkills = Array.from(skillAgg.entries())
    .map(([name, e]) => ({
      name,
      subjectColor: e.subjectColor,
      attempted: e.attempted,
      correct: e.correct,
      accuracy: e.attempted > 0 ? Math.round((e.correct / e.attempted) * 100) : 0,
    }))
    .filter((s) => s.attempted >= MASTERY_MIN_ATTEMPTS && s.accuracy >= MASTERY_THRESHOLD_PERCENT)
    .sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex">
      <DashboardSidebar
        activeItem="my-stats"
        sidebarOpen={sidebarOpen}
        onSidebarClose={() => setSidebarOpen(false)}
        existingTest={existingTest}
      />

      <main className="flex-1 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6 text-gray-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-neutral-100 tracking-tight">My Stats</h1>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          <div className="hidden lg:block">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">My Stats</h2>
            <p className="text-gray-600 dark:text-neutral-400 mt-1">Your activity and mastery at a glance</p>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatTile label="Questions completed" value={questionsCompleted} />
            <StatTile label="Accuracy" value={`${accuracyPercent}%`} />
            <StatTile label="Saved questions" value={savedQuestions} />
            <StatTile label="Areas mastered" value={masteredSkills.length} />
            <StatTile label="Days studied" value={daysStudied} />
          </div>

          {/* Activity heatmap — daily question-completion intensity over the past year */}
          <ActivityHeatmap
            events={Object.values(attempts)
              .map((a) => a.timestamp)
              .filter((t): t is number => typeof t === 'number' && t > 0)}
          />

          {/* Mastered skills */}
          <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100 mb-1">Areas mastered</h3>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4">
              Skills with at least {MASTERY_MIN_ATTEMPTS} attempts and accuracy ≥ {MASTERY_THRESHOLD_PERCENT}%
            </p>
            {masteredSkills.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-neutral-400 py-4 text-center">
                No mastered areas yet. Keep practicing — they&apos;ll appear here once you cross the threshold.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                {masteredSkills.map((s) => (
                  <li key={s.name} className="py-3 flex items-center gap-3">
                    <span className="inline-block w-2 h-6 rounded-sm shrink-0" style={{ backgroundColor: s.subjectColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-neutral-100 truncate">{s.name}</div>
                      <div className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                        {s.correct}/{s.attempted} correct
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      {s.accuracy}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5">
      <div className="text-[11px] font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold text-gray-900 dark:text-neutral-100 mt-1.5">{value}</div>
    </div>
  );
}

export default MyStatsPage;
