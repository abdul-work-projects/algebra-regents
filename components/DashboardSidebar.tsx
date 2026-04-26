'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { Test } from '@/lib/types';

export type SidebarItem = 'overview' | 'full-length-tests' | 'question-bank' | 'my-stats' | 'settings';

type NavTab = 'overview' | 'full-length-tests' | 'question-bank';

interface DashboardSidebarProps {
  activeItem: SidebarItem;
  sidebarOpen: boolean;
  onSidebarClose: () => void;
  existingTest?: Test | null;
  onTabNavigate?: (tab: NavTab) => void;
  onContinueTest?: () => void;
}

export default function DashboardSidebar({
  activeItem,
  sidebarOpen,
  onSidebarClose,
  existingTest,
  onTabNavigate,
  onContinueTest,
}: DashboardSidebarProps) {
  const router = useRouter();

  const handleTab = (tab: NavTab) => {
    if (onTabNavigate) {
      onTabNavigate(tab);
    } else {
      router.push(`/dashboard?tab=${tab}`);
    }
    onSidebarClose();
  };

  const handleContinue = () => {
    if (onContinueTest) {
      onContinueTest();
    } else {
      window.location.href = '/quiz';
    }
  };

  const tabButtonClass = (item: SidebarItem) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
      activeItem === item
        ? 'bg-black dark:bg-white text-white dark:text-black'
        : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onSidebarClose}
        />
      )}

      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 transform transition-transform duration-300 lg:transform-none lg:h-screen lg:shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/beaver-images/logo.png"
                alt="Regents Ready"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-lg font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
                Regents Ready
              </span>
            </Link>
            <ThemeToggle />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <button onClick={() => handleTab('overview')} className={tabButtonClass('overview')}>
                  <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Home</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleTab('full-length-tests')} className={tabButtonClass('full-length-tests')}>
                  <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Full-length Tests</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleTab('question-bank')} className={tabButtonClass('question-bank')}>
                  <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Question Bank</span>
                </button>
              </li>
              <li>
                <Link href="/my-stats" onClick={onSidebarClose} className={tabButtonClass('my-stats')}>
                  <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>My Stats</span>
                </Link>
              </li>
            </ul>
          </nav>

          {/* Settings (above resume) */}
          <div className="px-4 pb-2">
            <Link
              href="/settings"
              onClick={onSidebarClose}
              className={tabButtonClass('settings')}
            >
              <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>
          </div>

          {/* Continue session (bottom) */}
          {existingTest && (
            <div className="p-4 border-t border-gray-100 dark:border-neutral-800">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
                <p className="text-blue-800 dark:text-blue-300 text-xs font-bold mb-2 truncate">
                  Continue: {existingTest.name}
                </p>
                <button
                  onClick={handleContinue}
                  className="w-full px-3 py-2 text-xs font-bold text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full transition-all"
                >
                  RESUME
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
