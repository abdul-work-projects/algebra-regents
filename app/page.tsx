'use client';

import { loadSession, clearSession, loadMarkedForReview, saveSelectedSubject, loadSelectedSubject, loadSkillProgress } from '@/lib/storage';
import { fetchActiveTests, convertToTestFormat, fetchActiveSubjects, convertToSubjectFormat, fetchQuestionsForSubject } from '@/lib/supabase';
import { Test, Question, Subject } from '@/lib/types';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Tab = 'question-bank' | 'full-length-tests';

interface SkillInfo {
  name: string;
  questionCount: number;
  questionIds: string[];
  markedCount: number;
  correctCount: number;
}

interface ClusterInfo {
  name: string;
  questionCount: number;
  skills: SkillInfo[];
}

interface SubjectData {
  subject: Subject;
  clusters: ClusterInfo[];
  totalQuestions: number;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'question-bank' ? 'question-bank' : 'full-length-tests'
  );
  const [tests, setTests] = useState<Test[]>([]);
  const [subjectDataList, setSubjectDataList] = useState<SubjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [existingSessionTestId, setExistingSessionTestId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

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
    router.replace(`/?tab=${tab}`);
  };

  useEffect(() => {
    const session = loadSession();
    if (session?.testId) {
      setExistingSessionTestId(session.testId);
    }

    // Load saved subject preference
    const savedSubjectId = loadSelectedSubject();
    if (savedSubjectId) {
      setSelectedSubjectId(savedSubjectId);
    }

    async function loadData() {
      try {
        const [dbTests, dbSubjects] = await Promise.all([
          fetchActiveTests(),
          fetchActiveSubjects(),
        ]);

        const formattedSubjects = dbSubjects.map(convertToSubjectFormat);
        setTests(dbTests.map(convertToTestFormat));
        setSubjects(formattedSubjects);

        // Load marked for review questions and skill progress
        const markedQuestions = loadMarkedForReview();
        const skillProgress = loadSkillProgress();

        // Fetch questions for each subject and build clusters
        const subjectDataPromises = formattedSubjects.map(async (subject) => {
          const questions = await fetchQuestionsForSubject(subject.id);

          // Build clusters from questions
          const clusterMap = new Map<string, Map<string, { questionIds: Set<string> }>>();

          questions.forEach(q => {
            const clusterName = q.cluster || 'Other';

            if (!clusterMap.has(clusterName)) {
              clusterMap.set(clusterName, new Map());
            }

            q.topics.forEach(topic => {
              const skillsInCluster = clusterMap.get(clusterName)!;
              if (!skillsInCluster.has(topic)) {
                skillsInCluster.set(topic, { questionIds: new Set() });
              }
              skillsInCluster.get(topic)!.questionIds.add(q.id);
            });
          });

          // Convert to ClusterInfo array
          const clusters: ClusterInfo[] = Array.from(clusterMap.entries())
            .map(([clusterName, skillsMap]) => {
              const skills: SkillInfo[] = Array.from(skillsMap.entries())
                .map(([skillName, data]) => {
                  const questionIds = Array.from(data.questionIds);
                  const markedCount = questionIds.filter(id => markedQuestions.has(id)).length;
                  const progress = skillProgress[skillName];
                  const correctCount = progress?.correct || 0;

                  return {
                    name: skillName,
                    questionCount: data.questionIds.size,
                    questionIds,
                    markedCount,
                    correctCount,
                  };
                })
                .sort((a, b) => a.name.localeCompare(b.name));

              const totalQuestions = skills.reduce((sum, skill) => sum + skill.questionCount, 0);

              return {
                name: clusterName,
                questionCount: totalQuestions,
                skills,
              };
            })
            .sort((a, b) => {
              if (a.name === 'Other') return 1;
              if (b.name === 'Other') return -1;
              return a.name.localeCompare(b.name);
            });

          return {
            subject,
            clusters,
            totalQuestions: questions.length,
          };
        });

        const subjectData = await Promise.all(subjectDataPromises);
        setSubjectDataList(subjectData);
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

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    saveSelectedSubject(subjectId);
  };

  const handleAllTopicsForSubject = (subjectId: string) => {
    const params = new URLSearchParams();
    params.set('mode', 'practice');
    params.set('subject', subjectId);
    window.location.href = `/quiz?${params.toString()}`;
  };

  // Filter tests by selected subject
  const filteredTests = selectedSubjectId === 'all'
    ? tests
    : tests.filter(test => test.subjectId === selectedSubjectId);

  // Get current subject name for sidebar title
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);

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
            <h1 className="text-xl font-bold text-gray-900">
              {currentSubject ? currentSubject.name : 'Practice App'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Practice & Prepare</p>
          </div>

          {/* Subject Selector - only show if multiple subjects */}
          {subjects.length > 1 && (
            <div className="p-4 border-b border-gray-200">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    handleTabChange('full-length-tests');
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
              <li>
                <button
                  onClick={() => {
                    handleTabChange('question-bank');
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
        <div className="p-4 lg:p-8 max-w-6xl">
          {activeTab === 'question-bank' ? (
            <div>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading skills...</div>
              ) : subjectDataList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No subjects available yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {subjectDataList.map(({ subject, clusters, totalQuestions }) => (
                    <div
                      key={subject.id}
                      className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden"
                    >
                      {/* Subject Header with Color */}
                      <div
                        className="p-4 flex items-center justify-between"
                        style={{ backgroundColor: subject.color }}
                      >
                        <div>
                          <h3 className="font-bold text-gray-900 text-xl">
                            {subject.name}
                          </h3>
                          <p className="text-gray-800/70 text-sm">
                            {totalQuestions} questions
                          </p>
                        </div>
                        <button
                          onClick={() => handleAllTopicsForSubject(subject.id)}
                          className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all shadow-sm"
                        >
                          All Topics
                        </button>
                      </div>

                      {/* Clusters and Skills */}
                      <div className="p-4">
                        {clusters.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No questions available yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {clusters.map((cluster) => (
                              <div key={cluster.name}>
                                {/* Cluster Header */}
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-gray-900">{cluster.name}</h4>
                                  <span className="text-gray-400 text-sm">{cluster.questionCount} questions</span>
                                </div>

                                {/* Skills List */}
                                <div className="space-y-0.5">
                                  {cluster.skills.map((skill) => (
                                    <div
                                      key={skill.name}
                                      onClick={() => handlePracticeSkill(skill.name)}
                                      className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
                                    >
                                      <span className="text-gray-700">{skill.name}</span>
                                      <div className="flex items-center gap-2">
                                        {skill.correctCount > 0 && (
                                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            {skill.correctCount}
                                          </span>
                                        )}
                                        {skill.markedCount > 0 && (
                                          <span className="flex items-center gap-1 text-yellow-600 text-xs">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                            </svg>
                                            {skill.markedCount}
                                          </span>
                                        )}
                                        <span className="text-gray-400 text-sm">{skill.questionCount} questions</span>
                                      </div>
                                    </div>
                                  ))}
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
              <div className="hidden lg:block mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Full-length Tests</h2>
                <p className="text-gray-600 mt-1">Take complete practice exams</p>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading tests...</div>
              ) : filteredTests.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white border-2 border-gray-200 rounded-xl">
                  {tests.length === 0 ? 'No tests available yet. Check back later.' : 'No tests available for this subject.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTests.map((test) => (
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
