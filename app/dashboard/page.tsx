'use client';

import { loadSession, clearSession, loadMarkedForReview, loadSkillProgress, AllSkillProgress } from '@/lib/storage';
import { loadAttempts, AttemptsStore } from '@/lib/attempts';
import { loadTestAttempts, TestAttempt } from '@/lib/testAttempts';
import TestAttemptHistoryModal from '@/components/TestAttemptHistoryModal';
import { fetchActiveTests, convertToTestFormat, fetchActiveSubjects, convertToSubjectFormat, fetchAllDashboardData, DashboardQuestion } from '@/lib/supabase';
import { Test, Subject } from '@/lib/types';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import DashboardSidebar from '@/components/DashboardSidebar';
import Link from 'next/link';

type Tab = 'overview' | 'question-bank' | 'full-length-tests';

interface SkillInfo {
  name: string;
  questionCount: number;
  questionIds: string[];
  markedCount: number;
  correctCount: number;
}

interface SubjectQuestionsData {
  subject: Subject;
  questions: DashboardQuestion[];
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'question-bank'
      ? 'question-bank'
      : tabParam === 'full-length-tests'
      ? 'full-length-tests'
      : 'overview'
  );
  const [tests, setTests] = useState<Test[]>([]);
  const [subjectQuestionsData, setSubjectQuestionsData] = useState<SubjectQuestionsData[]>([]);
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [skillProgress, setSkillProgress] = useState<AllSkillProgress>({});
  const [attempts, setAttempts] = useState<AttemptsStore>({});
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [historyTestId, setHistoryTestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [existingSessionTestId, setExistingSessionTestId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState<string>('');
  const [testSearch, setTestSearch] = useState<string>('');
  const [tagsDropdownOpen, setTagsDropdownOpen] = useState(false);
  const [difficultyDropdownOpen, setDifficultyDropdownOpen] = useState(false);

  // Sync tab with URL parameter
  useEffect(() => {
    if (tabParam === 'question-bank') {
      setActiveTab('question-bank');
    } else if (tabParam === 'full-length-tests') {
      setActiveTab('full-length-tests');
    } else if (tabParam === 'overview' || !tabParam) {
      setActiveTab('overview');
    }
  }, [tabParam]);

  // Update URL when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/dashboard?tab=${tab}`);
  };

  useEffect(() => {
    const session = loadSession();
    if (session?.testId) {
      setExistingSessionTestId(session.testId);
    }

    async function loadData() {
      try {
        const { tests: dbTests, subjects: dbSubjects, tags, questionsBySubject } = await fetchAllDashboardData();

        const formattedSubjects = dbSubjects.map(convertToSubjectFormat);
        setTests(dbTests.map(convertToTestFormat));
        setSubjects(formattedSubjects);
        setAllTags(tags);

        const loadedMarkedQuestions = loadMarkedForReview();
        const loadedSkillProgress = loadSkillProgress();
        setMarkedQuestions(loadedMarkedQuestions);
        setSkillProgress(loadedSkillProgress);
        setAttempts(loadAttempts());
        setTestAttempts(loadTestAttempts());

        const subjectData = formattedSubjects.map(subject => ({
          subject,
          questions: questionsBySubject[subject.id] || [],
        }));
        setSubjectQuestionsData(subjectData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleStartTest = (testId: string) => {
    clearSession();
    window.location.href = `/quiz?testId=${testId}`;
  };

  const handleContinueTest = () => {
    window.location.href = '/quiz';
  };

  const handlePracticeSkill = (skill: string, subjectId: string) => {
    const params = new URLSearchParams();
    params.set('mode', 'practice');
    params.set('skill', skill);
    params.set('subject', subjectId);
    // Pass active filters
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }
    if (selectedDifficulties.length > 0) {
      params.set('difficulties', selectedDifficulties.join(','));
    }
    window.location.href = `/quiz?${params.toString()}`;
  };

  const handleAllTopicsForSubject = (subjectId: string) => {
    const params = new URLSearchParams();
    params.set('mode', 'practice');
    params.set('subject', subjectId);
    // Pass active filters
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }
    if (selectedDifficulties.length > 0) {
      params.set('difficulties', selectedDifficulties.join(','));
    }
    window.location.href = `/quiz?${params.toString()}`;
  };

  // Build filtered subject data - filter questions first, then build skills from filtered questions
  const filteredSubjectDataList = subjectQuestionsData.map(({ subject, questions }) => {
    // Step 1: Filter questions by tags and difficulty
    const filteredQuestions = questions.filter(q => {
      // Tags filter - show if no tags selected OR question has at least one matching tag
      if (selectedTags.length > 0) {
        const questionTags = q.tags || [];
        if (!questionTags.some(tag => selectedTags.includes(tag))) {
          return false;
        }
      }

      // Difficulty filter - show if no difficulties selected OR question matches selected difficulty
      if (selectedDifficulties.length > 0) {
        const questionDifficulty = q.difficulty || null;
        if (questionDifficulty === null || !selectedDifficulties.includes(questionDifficulty)) {
          return false;
        }
      }

      return true;
    });

    // Step 2: Build skills from filtered questions
    const skillsMap = new Map<string, Set<string>>();
    filteredQuestions.forEach(q => {
      (q.skills || []).forEach(skill => {
        if (!skillsMap.has(skill)) {
          skillsMap.set(skill, new Set());
        }
        skillsMap.get(skill)!.add(q.id);
      });
    });

    // Step 3: Convert to SkillInfo array and apply skill name filter
    const skills: SkillInfo[] = Array.from(skillsMap.entries())
      .map(([skillName, questionIdSet]) => {
        const questionIds = Array.from(questionIdSet);
        const markedCount = questionIds.filter(id => markedQuestions.has(id)).length;
        // Prefer per-question attempt tracking (counts any question answered correctly,
        // regardless of whether the user clicked CHECK). Falls back to legacy skillProgress.
        const attemptCorrectCount = questionIds.filter(id => attempts[id]?.isCorrect).length;
        const progress = skillProgress[skillName];
        const correctCount = attemptCorrectCount > 0 ? attemptCorrectCount : (progress?.correct || 0);

        return {
          name: skillName,
          questionCount: questionIdSet.size,
          questionIds,
          markedCount,
          correctCount,
        };
      })
      .filter(skill => {
        // Skill name search filter
        if (skillSearch.trim()) {
          const searchLower = skillSearch.toLowerCase();
          if (!skill.name.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      subject,
      skills,
      totalQuestions: filteredQuestions.length,
    };
  }).filter(subjectData => subjectData.totalQuestions > 0); // Remove subjects with no matching questions

  // Per-test attempt lookup (sorted newest-first) for the Full-length Tests tab.
  const attemptsByTest = (() => {
    const map = new Map<string, TestAttempt[]>();
    for (const a of testAttempts) {
      const list = map.get(a.testId) || [];
      list.push(a);
      map.set(a.testId, list);
    }
    for (const list of map.values()) list.sort((a, b) => b.completedAt - a.completedAt);
    return map;
  })();

  // Overview stats: total attempts, accuracy, and per-skill breakdown for weak-area suggestions.
  const overview = (() => {
    const attemptedIds = Object.keys(attempts);
    const totalAttempted = attemptedIds.length;
    const totalCorrect = attemptedIds.reduce((n, id) => n + (attempts[id].isCorrect ? 1 : 0), 0);
    const totalIncorrect = totalAttempted - totalCorrect;
    const accuracyPercent = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    // Aggregate per-skill stats across all subjects.
    // Map: skillName -> { attempted, correct, subjectId (primary = subject with most questions for this skill) }
    const skillAgg = new Map<string, { attempted: number; correct: number; subjectCounts: Map<string, number>; totalQuestions: number }>();
    subjectQuestionsData.forEach(({ subject, questions }) => {
      questions.forEach((q) => {
        (q.skills || []).forEach((skill) => {
          let entry = skillAgg.get(skill);
          if (!entry) {
            entry = { attempted: 0, correct: 0, subjectCounts: new Map(), totalQuestions: 0 };
            skillAgg.set(skill, entry);
          }
          entry.totalQuestions++;
          entry.subjectCounts.set(subject.id, (entry.subjectCounts.get(subject.id) || 0) + 1);
          const a = attempts[q.id];
          if (a) {
            entry.attempted++;
            if (a.isCorrect) entry.correct++;
          }
        });
      });
    });

    const skillStats = Array.from(skillAgg.entries()).map(([name, e]) => {
      // Pick the subject where this skill is most represented so Practice deep-link is sensible.
      let primarySubjectId = '';
      let max = -1;
      for (const [sid, count] of e.subjectCounts) {
        if (count > max) { max = count; primarySubjectId = sid; }
      }
      return {
        name,
        subjectId: primarySubjectId,
        attempted: e.attempted,
        correct: e.correct,
        incorrect: e.attempted - e.correct,
        totalQuestions: e.totalQuestions,
        accuracy: e.attempted > 0 ? Math.round((e.correct / e.attempted) * 100) : 0,
      };
    });

    const weakSkills = skillStats
      .filter((s) => s.attempted >= 2 && s.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    return { totalAttempted, totalCorrect, totalIncorrect, accuracyPercent, weakSkills };
  })();

  // Helper to toggle tag selection
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  // Helper to toggle difficulty selection
  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties(prev =>
      prev.includes(difficulty)
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const existingTest = existingSessionTestId
    ? tests.find((t) => t.id === existingSessionTestId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex">
      <DashboardSidebar
        activeItem={activeTab}
        sidebarOpen={sidebarOpen}
        onSidebarClose={() => setSidebarOpen(false)}
        existingTest={existingTest}
        onTabNavigate={(tab) => handleTabChange(tab)}
        onContinueTest={handleContinueTest}
      />

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
          >
            <svg className="w-6 h-6 text-gray-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
            {activeTab === 'overview' ? 'Overview' : activeTab === 'question-bank' ? 'Question Bank' : 'Full-length Tests'}
          </h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' ? (
          <div>
            <div className="mb-6 hidden lg:block">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">Overview</h2>
              <p className="text-gray-600 dark:text-neutral-400 mt-1">Your progress and areas to focus on</p>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5">
                <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">Attempted</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-neutral-100 mt-1.5">{overview.totalAttempted}</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5">
                <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">Accuracy</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-neutral-100 mt-1.5">{overview.accuracyPercent}%</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5">
                <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">Correct</div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1.5">{overview.totalCorrect}</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5">
                <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">Incorrect</div>
                <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">{overview.totalIncorrect}</div>
              </div>
            </div>

            {/* Areas to improve */}
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Areas to improve</h3>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                    Skills where your accuracy is below 70% (at least 2 attempts)
                  </p>
                </div>
              </div>

              {overview.totalAttempted === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
                    You haven&apos;t attempted any questions yet.
                  </p>
                  <button
                    onClick={() => handleTabChange('question-bank')}
                    className="px-4 py-2 text-sm font-bold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full transition-all"
                  >
                    Browse question bank
                  </button>
                </div>
              ) : overview.weakSkills.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-neutral-400">
                    Nothing to flag yet. Keep practicing and we&apos;ll surface weak spots here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {overview.weakSkills.map((skill) => (
                    <li key={skill.name} className="py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-gray-900 dark:text-neutral-100 truncate">
                            {skill.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-neutral-400 shrink-0">
                            {skill.correct}/{skill.attempted} correct · {skill.accuracy}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              skill.accuracy < 40
                                ? 'bg-rose-500'
                                : skill.accuracy < 60
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.max(skill.accuracy, 4)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handlePracticeSkill(skill.name, skill.subjectId)}
                        className="shrink-0 px-3 py-1.5 text-xs font-bold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full transition-all"
                      >
                        Practice
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tests taken */}
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Tests taken</h3>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                    Full-length tests you&apos;ve completed
                  </p>
                </div>
              </div>

              {(() => {
                const summaries = Array.from(attemptsByTest.entries()).map(([testId, list]) => {
                  const best = list.reduce((m, a) => Math.max(m, a.scaledScore), 0);
                  const latest = list[0]; // list is sorted newest-first
                  return {
                    testId,
                    testName: latest.testName,
                    count: list.length,
                    best,
                    latestAt: latest.completedAt,
                    latestScaled: latest.scaledScore,
                  };
                }).sort((a, b) => b.latestAt - a.latestAt);

                if (summaries.length === 0) {
                  return (
                    <div className="py-8 text-center">
                      <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
                        You haven&apos;t completed any full-length tests yet.
                      </p>
                      <button
                        onClick={() => handleTabChange('full-length-tests')}
                        className="px-4 py-2 text-sm font-bold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full transition-all"
                      >
                        Browse tests
                      </button>
                    </div>
                  );
                }

                return (
                  <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {summaries.map((s) => {
                      const badgeClass =
                        s.best >= 85 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : s.best >= 65 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : s.best >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
                      const latestDate = new Date(s.latestAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      });
                      return (
                        <li key={s.testId} className="py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-neutral-100 truncate">
                              {s.testName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                              {s.count} {s.count === 1 ? 'attempt' : 'attempts'} · last {latestDate}
                            </div>
                          </div>
                          <div className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-bold ${badgeClass}`}>
                            Best {s.best}
                          </div>
                          <button
                            onClick={() => setHistoryTestId(s.testId)}
                            className="shrink-0 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full transition-all"
                          >
                            History
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
          </div>
        ) : activeTab === 'question-bank' ? (
          <div>
            {/* Header + Filters */}
            <div className="mb-6">
              {/* Desktop: title + filters in one row */}
              <div className="hidden lg:flex lg:items-center lg:justify-between mb-4">
                <div className="shrink-0">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">Question Bank</h2>
                  <p className="text-gray-600 dark:text-neutral-400 mt-1">Practice by topic and skill</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Search Skills */}
                  <div className="relative w-64">
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="Search skills..."
                      className="w-full h-10 px-3 pl-9 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-700 dark:text-neutral-300 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {skillSearch && (
                      <button
                        onClick={() => setSkillSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Tags Filter */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setTagsDropdownOpen(!tagsDropdownOpen);
                        setDifficultyDropdownOpen(false);
                      }}
                      className="h-10 px-4 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent inline-flex items-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 text-gray-500 dark:text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Tags</span>
                      {selectedTags.length > 0 && (
                        <span className="bg-black dark:bg-white text-white dark:text-black text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {selectedTags.length}
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 text-gray-400 dark:text-neutral-500 flex-shrink-0 transition-transform ${tagsDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {tagsDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setTagsDropdownOpen(false)}
                        />
                        <div className="absolute right-0 z-20 mt-1 w-56 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-60 overflow-auto">
                          {allTags.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400 dark:text-neutral-500">No tags available</div>
                          ) : (
                            allTags.map((tag) => (
                              <label
                                key={tag}
                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedTags.includes(tag)}
                                  onChange={() => toggleTag(tag)}
                                  className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-black dark:text-white focus:ring-black dark:focus:ring-white"
                                />
                                <span className="text-sm text-gray-700 dark:text-neutral-300">{tag}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Difficulty Filter */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setDifficultyDropdownOpen(!difficultyDropdownOpen);
                        setTagsDropdownOpen(false);
                      }}
                      className="h-10 px-4 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent inline-flex items-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 text-gray-500 dark:text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      <span>Difficulty</span>
                      {selectedDifficulties.length > 0 && (
                        <span className="bg-black dark:bg-white text-white dark:text-black text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {selectedDifficulties.length}
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 text-gray-400 dark:text-neutral-500 flex-shrink-0 transition-transform ${difficultyDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {difficultyDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setDifficultyDropdownOpen(false)}
                        />
                        <div className="absolute right-0 z-20 mt-1 w-44 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg">
                          {['easy', 'medium', 'hard'].map((difficulty) => (
                            <label
                              key={difficulty}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDifficulties.includes(difficulty)}
                                onChange={() => toggleDifficulty(difficulty)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-black dark:text-white focus:ring-black dark:focus:ring-white"
                              />
                              <span className="text-sm text-gray-700 dark:text-neutral-300 capitalize">{difficulty}</span>
                            </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              </div>

              {/* Mobile: filters below */}
              <div className="lg:hidden flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search skills..."
                    className="w-full h-10 px-3 pl-9 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-700 dark:text-neutral-300 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {skillSearch && (
                    <button
                      onClick={() => setSkillSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setTagsDropdownOpen(!tagsDropdownOpen);
                      setDifficultyDropdownOpen(false);
                    }}
                    className="h-10 px-4 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Tags</span>
                    {selectedTags.length > 0 && (
                      <span className="bg-black dark:bg-white text-white dark:text-black text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {selectedTags.length}
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 dark:text-neutral-500 flex-shrink-0 transition-transform ${tagsDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {tagsDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setTagsDropdownOpen(false)}
                      />
                      <div className="absolute right-0 z-20 mt-1 w-56 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-60 overflow-auto">
                        {allTags.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-400 dark:text-neutral-500">No tags available</div>
                        ) : (
                          allTags.map((tag) => (
                            <label
                              key={tag}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTags.includes(tag)}
                                onChange={() => toggleTag(tag)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-black dark:text-white focus:ring-black dark:focus:ring-white"
                              />
                              <span className="text-sm text-gray-700 dark:text-neutral-300">{tag}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setDifficultyDropdownOpen(!difficultyDropdownOpen);
                      setTagsDropdownOpen(false);
                    }}
                    className="h-10 px-4 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    <span>Difficulty</span>
                    {selectedDifficulties.length > 0 && (
                      <span className="bg-black dark:bg-white text-white dark:text-black text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {selectedDifficulties.length}
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 dark:text-neutral-500 flex-shrink-0 transition-transform ${difficultyDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {difficultyDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setDifficultyDropdownOpen(false)}
                      />
                      <div className="absolute right-0 z-20 mt-1 w-44 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg">
                        {['easy', 'medium', 'hard'].map((difficulty) => (
                          <label
                            key={difficulty}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDifficulties.includes(difficulty)}
                              onChange={() => toggleDifficulty(difficulty)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-black dark:text-white focus:ring-black dark:focus:ring-white"
                            />
                            <span className="text-sm text-gray-700 dark:text-neutral-300 capitalize">{difficulty}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Active Filters Summary */}
              {(selectedTags.length > 0 || selectedDifficulties.length > 0 || skillSearch.trim()) && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-neutral-700">
                  {selectedTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-medium">
                      {tag}
                      <button onClick={() => toggleTag(tag)} className="hover:text-gray-300 dark:hover:text-neutral-600 ml-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {selectedDifficulties.map(difficulty => (
                    <span key={difficulty} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 rounded-full text-xs font-medium capitalize">
                      {difficulty}
                      <button onClick={() => toggleDifficulty(difficulty)} className="hover:text-gray-900 dark:hover:text-neutral-100 ml-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {skillSearch.trim() && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 rounded-full text-xs font-medium">
                      &quot;{skillSearch}&quot;
                      <button onClick={() => setSkillSearch('')} className="hover:text-gray-900 dark:hover:text-neutral-100 ml-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedTags([]);
                      setSelectedDifficulties([]);
                      setSkillSearch('');
                    }}
                    className="ml-auto text-xs text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-pulse">
                    <div className="p-4 bg-gray-100 dark:bg-neutral-800">
                      <div className="h-5 w-32 bg-gray-200 dark:bg-neutral-700 rounded" />
                      <div className="h-3 w-20 bg-gray-200 dark:bg-neutral-700 rounded mt-2" />
                    </div>
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="flex items-center justify-between py-2">
                          <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded w-2/5" />
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-12 bg-gray-100 dark:bg-neutral-800 rounded-full" />
                            <div className="h-6 w-14 bg-gray-100 dark:bg-neutral-800 rounded-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredSubjectDataList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm">
                {subjectQuestionsData.length === 0 ? 'No subjects available yet.' : 'No skills match your filters.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredSubjectDataList.map(({ subject, skills, totalQuestions }) => (
                  <div
                    key={subject.id}
                    className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 transition-transform"
                  >
                    {/* Subject Header with Color */}
                    <div
                      className="p-4 flex items-center justify-between"
                      style={{ backgroundColor: subject.color }}
                    >
                      <div>
                        <h3 className="font-bold text-gray-900 text-xl tracking-tight">
                          {subject.name}
                        </h3>
                        <p className="text-gray-800/70 text-sm">
                          {totalQuestions} questions
                        </p>
                      </div>
                      <button
                        onClick={() => handleAllTopicsForSubject(subject.id)}
                        className="px-4 py-2 bg-white dark:bg-neutral-900 rounded-full text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all shadow-sm"
                      >
                        All Skills
                      </button>
                    </div>

                    {/* Skills List */}
                    <div className="p-4">
                      {skills.length === 0 ? (
                        <p className="text-gray-500 dark:text-neutral-400 text-center py-4">No questions available yet.</p>
                      ) : (
                        <div className="space-y-0.5">
                          {skills.map((skill) => (
                            <div
                              key={skill.name}
                              onClick={() => handlePracticeSkill(skill.name, subject.id)}
                              className="group/item flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            >
                              <span className="text-gray-700 dark:text-neutral-300 group-hover/item:underline">{skill.name}</span>
                              <div className="flex items-center gap-2">
                                {skill.correctCount > 0 && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {skill.correctCount}
                                  </span>
                                )}
                                {skill.markedCount > 0 && (
                                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                    {skill.markedCount}
                                  </span>
                                )}
                                <span className="text-gray-400 dark:text-neutral-500 text-sm">{skill.questionCount} questions</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Full-length Tests Tab */
          <div>
            {/* Header + Search */}
            <div className="hidden lg:flex lg:items-center lg:justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">Full-length Tests</h2>
                <p className="text-gray-600 dark:text-neutral-400 mt-1">Take complete practice exams</p>
              </div>
              <div className="relative w-72">
                <input
                  type="text"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Search tests..."
                  className="w-full h-10 px-3 pl-9 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-700 dark:text-neutral-300 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {testSearch && (
                  <button
                    onClick={() => setTestSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* Mobile search */}
            <div className="lg:hidden mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Search tests..."
                  className="w-full h-10 px-3 pl-9 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-700 dark:text-neutral-300 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {testSearch && (
                  <button
                    onClick={() => setTestSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-pulse">
                    <div className="p-4 bg-gray-100 dark:bg-neutral-800">
                      <div className="h-6 w-40 bg-gray-200 dark:bg-neutral-700 rounded" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-neutral-700 rounded mt-2" />
                    </div>
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="flex items-center justify-between py-2">
                          <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded w-2/5" />
                          <div className="h-3 w-16 bg-gray-100 dark:bg-neutral-800 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm">
                No tests available yet. Check back later.
              </div>
            ) : (
              <div className="space-y-6">
                {subjects
                  .filter(subject => tests.some(t => t.subjectId === subject.id))
                  .map((subject) => {
                    const searchLower = testSearch.toLowerCase().trim();
                    const subjectTests = tests.filter(t =>
                      t.subjectId === subject.id &&
                      (!searchLower || t.name.toLowerCase().includes(searchLower))
                    );
                    if (subjectTests.length === 0) return null;
                    return (
                      <div
                        key={subject.id}
                        className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 transition-transform"
                      >
                        {/* Subject Header with Color */}
                        <div
                          className="p-4 flex items-center justify-between"
                          style={{ backgroundColor: subject.color }}
                        >
                          <div>
                            <h3 className="font-bold text-gray-900 text-xl tracking-tight">
                              {subject.name}
                            </h3>
                            <p className="text-gray-800/70 text-sm">
                              {subjectTests.length} {subjectTests.length === 1 ? 'test' : 'tests'}
                            </p>
                          </div>
                        </div>

                        {/* Tests List */}
                        <div className="p-4">
                          <div className="space-y-0.5">
                            {subjectTests.map((test) => {
                              const myAttempts = attemptsByTest.get(test.id) || [];
                              const best = myAttempts.reduce((m, a) => Math.max(m, a.scaledScore), 0);
                              return (
                                <div
                                  key={test.id}
                                  onClick={() => handleStartTest(test.id)}
                                  className="group/item flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                                >
                                  <span className="text-gray-700 dark:text-neutral-300 group-hover/item:underline truncate">{test.name}</span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {myAttempts.length > 0 && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                        Best {best}
                                      </span>
                                    )}
                                    {myAttempts.length > 0 && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setHistoryTestId(test.id); }}
                                        className="px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full transition-all"
                                        title="View attempt history"
                                      >
                                        {myAttempts.length}× history
                                      </button>
                                    )}
                                    <span className="text-gray-400 dark:text-neutral-500 text-sm">{test.questionCount || 0} questions</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Features */}
            <div className="mt-8 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-neutral-100 mb-4 text-base tracking-tight">Test Features:</h3>
              <ul className="space-y-3 text-gray-600 dark:text-neutral-400 text-sm">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 font-bold mr-2">&#10003;</span>
                  <span>Draw and take notes directly on questions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 font-bold mr-2">&#10003;</span>
                  <span>Track your time for each question</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 font-bold mr-2">&#10003;</span>
                  <span>Get detailed performance analytics by topic</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 font-bold mr-2">&#10003;</span>
                  <span>Your progress is automatically saved</span>
                </li>
              </ul>
            </div>
          </div>
        )}
        </div>
      </main>

      {historyTestId && (
        <TestAttemptHistoryModal
          testName={tests.find((t) => t.id === historyTestId)?.name || 'Test'}
          attempts={attemptsByTest.get(historyTestId) || []}
          onClose={() => setHistoryTestId(null)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-neutral-400">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
