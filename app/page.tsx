'use client';

import { loadSession, clearSession } from '@/lib/storage';
import { fetchActiveTests, convertToTestFormat, fetchQuestionsForQuiz } from '@/lib/supabase';
import { Test, Question } from '@/lib/types';
import { useEffect, useState } from 'react';

type Tab = 'question-bank' | 'full-length-tests';

interface SkillInfo {
  name: string;
  questionCount: number;
  questionIds: string[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('question-bank');
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [existingSessionTestId, setExistingSessionTestId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session?.testId) {
      setExistingSessionTestId(session.testId);
    }

    async function loadData() {
      try {
        const [dbTests, dbQuestions] = await Promise.all([
          fetchActiveTests(),
          fetchQuestionsForQuiz(),
        ]);
        setTests(dbTests.map(convertToTestFormat));
        setQuestions(dbQuestions);

        // Build skills from questions
        const skillMap = new Map<string, { questionIds: Set<string> }>();
        dbQuestions.forEach(q => {
          q.topics.forEach(topic => {
            if (!skillMap.has(topic)) {
              skillMap.set(topic, { questionIds: new Set() });
            }
            skillMap.get(topic)!.questionIds.add(q.id);
          });
        });

        const skillsArray: SkillInfo[] = Array.from(skillMap.entries())
          .map(([name, data]) => ({
            name,
            questionCount: data.questionIds.size,
            questionIds: Array.from(data.questionIds),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setSkills(skillsArray);
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

  const handlePracticeSkill = (skill: string) => {
    const params = new URLSearchParams();
    params.set('mode', 'practice');
    params.set('skill', skill);
    window.location.href = `/quiz?${params.toString()}`;
  };

  const existingTest = existingSessionTestId
    ? tests.find((t) => t.id === existingSessionTestId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r-2 border-gray-200 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Title */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Algebra I Regents</h1>
            <p className="text-sm text-gray-500 mt-1">Practice & Prepare</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    setActiveTab('question-bank');
                    setSidebarOpen(false);
                  }}
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}
                  className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === 'question-bank'
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg width="20" height="20" style={{ flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Question Bank</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('full-length-tests');
                    setSidebarOpen(false);
                  }}
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}
                  className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === 'full-length-tests'
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg width="20" height="20" style={{ flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Full-length Tests</span>
                </button>
              </li>
            </ul>
          </nav>

          {/* Continue Session - in sidebar */}
          {existingTest && (
            <div className="p-4 border-t border-gray-200">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                <p className="text-blue-800 text-xs font-bold mb-2 truncate">
                  Continue: {existingTest.name}
                </p>
                <button
                  onClick={handleContinueTest}
                  className="w-full px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg transition-all"
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
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b-2 border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">
            {activeTab === 'question-bank' ? 'Question Bank' : 'Full-length Tests'}
          </h1>
        </div>

        {/* Content Area */}
        <div className="p-4 lg:p-8 max-w-5xl">
          {activeTab === 'question-bank' ? (
            <div>
              {/* Header */}
              <div className="hidden lg:block mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Question Bank</h2>
              </div>
              <p className="text-gray-500 mb-6">{questions.length} questions</p>

              {/* Skills List */}
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading skills...</div>
              ) : skills.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No skills available yet.
                </div>
              ) : (
                <div className="w-full">
                  {skills.map((skill) => (
                    <div
                      key={skill.name}
                      onClick={() => handlePracticeSkill(skill.name)}
                      className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <span className="text-gray-800">{skill.name}</span>
                      <span className="text-sm text-gray-400">{skill.questionCount} questions</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Full-length Tests Tab */
            <div>
              {/* Header */}
              <div className="hidden lg:block mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Full-length Tests</h2>
                <p className="text-gray-600 mt-1">Take complete practice exams</p>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading tests...</div>
              ) : tests.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white border-2 border-gray-200 rounded-xl">
                  No tests available yet. Check back later.
                </div>
              ) : (
                <div className="space-y-3">
                  {tests.map((test) => (
                    <div
                      key={test.id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{test.name}</h3>
                          {test.description && (
                            <p className="text-sm text-gray-600 truncate">{test.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                              {test.questionCount || 0} Questions
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartTest(test.id)}
                          className="ml-4 px-5 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-xl transition-all flex-shrink-0"
                        >
                          START TEST
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Features */}
              <div className="mt-8 bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-base">Test Features:</h3>
                <ul className="space-y-3 text-gray-600 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    <span>Draw and take notes directly on questions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    <span>Track your time for each question</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    <span>Get detailed performance analytics by topic</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-2">✓</span>
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
