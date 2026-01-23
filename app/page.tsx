'use client';

import { loadSession, clearSession } from '@/lib/storage';
import { fetchActiveTests, convertToTestFormat } from '@/lib/supabase';
import { Test } from '@/lib/types';
import { useEffect, useState } from 'react';

export default function Home() {
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [existingSessionTestId, setExistingSessionTestId] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (session?.testId) {
      setExistingSessionTestId(session.testId);
    }

    async function loadTests() {
      try {
        const dbTests = await fetchActiveTests();
        setTests(dbTests.map(convertToTestFormat));
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTests();
  }, []);

  const handleStartTest = (testId: string) => {
    // Clear any existing session and start fresh with this test
    clearSession();
    window.location.href = `/quiz?testId=${testId}`;
  };

  const handleContinueTest = () => {
    window.location.href = '/quiz';
  };

  const existingTest = existingSessionTestId
    ? tests.find((t) => t.id === existingSessionTestId)
    : null;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            Algebra I Regents
          </h1>
          <p className="text-xl text-gray-700 font-semibold">
            Practice Tests
          </p>
        </div>

        {/* Continue Session Banner */}
        {existingTest && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-blue-800 text-sm font-bold mb-3">
              You have an unfinished quiz: <span className="text-blue-900">{existingTest.name}</span>
            </p>
            <button
              onClick={handleContinueTest}
              className="w-full px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md transition-all"
            >
              CONTINUE QUIZ
            </button>
          </div>
        )}

        {/* Tests List */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Available Tests</h2>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tests...</div>
          ) : tests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tests available yet. Check back later.
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{test.name}</h3>
                      {test.description && (
                        <p className="text-sm text-gray-600 truncate">{test.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {test.questionCount || 0} Questions
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartTest(test.id)}
                      className="ml-4 px-4 py-2 text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-xl transition-all flex-shrink-0"
                    >
                      START
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 text-base">Features:</h3>
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
      </div>
    </div>
  );
}
