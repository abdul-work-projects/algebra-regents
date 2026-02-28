'use client';

import { loadSession, clearSession, loadMarkedForReview, loadSkillProgress, AllSkillProgress } from '@/lib/storage';
import { fetchActiveTests, convertToTestFormat, fetchActiveSubjects, convertToSubjectFormat, fetchQuestionsForSubject, fetchAllTags } from '@/lib/supabase';
import { Test, Question, Subject } from '@/lib/types';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import Image from 'next/image';
import Link from 'next/link';

type Tab = 'question-bank' | 'full-length-tests';

interface SkillInfo {
  name: string;
  questionCount: number;
  questionIds: string[];
  markedCount: number;
  correctCount: number;
}

interface SubjectQuestionsData {
  subject: Subject;
  questions: Question[];
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'question-bank' ? 'question-bank' : 'full-length-tests'
  );
  const [tests, setTests] = useState<Test[]>([]);
  const [subjectQuestionsData, setSubjectQuestionsData] = useState<SubjectQuestionsData[]>([]);
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [skillProgress, setSkillProgress] = useState<AllSkillProgress>({});
  const [isLoading, setIsLoading] = useState(true);
  const [existingSessionTestId, setExistingSessionTestId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState<string>('');
  const [tagsDropdownOpen, setTagsDropdownOpen] = useState(false);
  const [difficultyDropdownOpen, setDifficultyDropdownOpen] = useState(false);

  // Sync tab with URL parameter
  useEffect(() => {
    if (tabParam === 'question-bank') {
      setActiveTab('question-bank');
    } else if (tabParam === 'full-length-tests') {
      setActiveTab('full-length-tests');
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
        const [dbTests, dbSubjects, tags] = await Promise.all([
          fetchActiveTests(),
          fetchActiveSubjects(),
          fetchAllTags(),
        ]);

        const formattedSubjects = dbSubjects.map(convertToSubjectFormat);
        setTests(dbTests.map(convertToTestFormat));
        setSubjects(formattedSubjects);
        setAllTags(tags);

        // Load marked for review questions and skill progress
        const loadedMarkedQuestions = loadMarkedForReview();
        const loadedSkillProgress = loadSkillProgress();
        setMarkedQuestions(loadedMarkedQuestions);
        setSkillProgress(loadedSkillProgress);

        // Fetch questions for each subject
        const subjectDataPromises = formattedSubjects.map(async (subject) => {
          const questions = await fetchQuestionsForSubject(subject.id);
          return {
            subject,
            questions,
          };
        });

        const subjectData = await Promise.all(subjectDataPromises);
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
        const progress = skillProgress[skillName];
        const correctCount = progress?.correct || 0;

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
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Title */}
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
                <button
                  onClick={() => {
                    handleTabChange('full-length-tests');
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === 'full-length-tests'
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Full-length Tests</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleTabChange('question-bank');
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === 'question-bank'
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Question Bank</span>
                </button>
              </li>
            </ul>
          </nav>

          {/* Continue Session - in sidebar */}
          {existingTest && (
            <div className="p-4 border-t border-gray-100 dark:border-neutral-800">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
                <p className="text-blue-800 dark:text-blue-300 text-xs font-bold mb-2 truncate">
                  Continue: {existingTest.name}
                </p>
                <button
                  onClick={handleContinueTest}
                  className="w-full px-3 py-2 text-xs font-bold text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full transition-all"
                >
                  RESUME
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

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
            {activeTab === 'question-bank' ? 'Question Bank' : 'Full-length Tests'}
          </h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'question-bank' ? (
          <div>
            {/* Header */}
            <div className="hidden lg:flex lg:items-center lg:justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">Question Bank</h2>
                <p className="text-gray-600 dark:text-neutral-400 mt-1">Practice by topic and skill</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Skills */}
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
                              className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            >
                              <span className="text-gray-700 dark:text-neutral-300">{skill.name}</span>
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
            {/* Header */}
            <div className="hidden lg:flex lg:items-center lg:justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">Full-length Tests</h2>
                <p className="text-gray-600 dark:text-neutral-400 mt-1">Take complete practice exams</p>
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
                    const subjectTests = tests.filter(t => t.subjectId === subject.id);
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
                            {subjectTests.map((test) => (
                              <div
                                key={test.id}
                                onClick={() => handleStartTest(test.id)}
                                className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                              >
                                <span className="text-gray-700 dark:text-neutral-300">{test.name}</span>
                                <span className="text-gray-400 dark:text-neutral-500 text-sm">{test.questionCount || 0} questions</span>
                              </div>
                            ))}
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
