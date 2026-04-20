'use client';

import { useEffect, useState } from 'react';
import { clearAllAttempts, getAttemptCount } from '@/lib/attempts';
import { clearSession, loadSession } from '@/lib/storage';
import { fetchActiveTests, convertToTestFormat } from '@/lib/supabase';
import { Test } from '@/lib/types';
import DashboardSidebar from '@/components/DashboardSidebar';
import ThemeToggle from '@/components/ThemeToggle';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [existingTest, setExistingTest] = useState<Test | null>(null);

  useEffect(() => {
    setMounted(true);
    setAttemptCount(getAttemptCount());

    (async () => {
      const session = loadSession();
      if (!session?.testId) return;
      const tests = await fetchActiveTests();
      const match = tests.find((t) => t.id === session.testId);
      if (match) setExistingTest(convertToTestFormat(match));
    })();
  }, []);

  const handleClear = () => {
    clearAllAttempts();
    clearSession();
    setAttemptCount(0);
    setExistingTest(null);
    setConfirming(false);
    setNotice('Practice history cleared.');
    setTimeout(() => setNotice(null), 3000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex">
      <DashboardSidebar
        activeItem="settings"
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
          <h1 className="text-lg font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
            Settings
          </h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <div className="hidden lg:block">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
              Settings
            </h2>
            <p className="text-gray-600 dark:text-neutral-400 mt-1">
              Manage your practice history and preferences
            </p>
          </div>

          <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-neutral-100 mb-1">
              Practice history
            </h3>
            <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
              Your answers are saved in this browser so the question navigation popup shows last-attempt markers. Clearing wipes saved answers and any resumable test session — start fresh next time.
            </p>

            <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
                  {attemptCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wide mt-0.5">
                  Questions attempted
                </div>
              </div>

              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={attemptCount === 0}
                  className="px-4 py-2 text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-full transition-all"
                >
                  Clear all
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    className="px-3 py-2 text-sm font-bold text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 rounded-full transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-full transition-all"
                  >
                    Confirm clear
                  </button>
                </div>
              )}
            </div>

            {notice && (
              <div className="mt-3 px-3 py-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                {notice}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
