'use client';

import Link from 'next/link';
import { questions as staticQuestions } from '@/lib/data';
import { loadSession, clearSession } from '@/lib/storage';
import { fetchQuestionsForQuiz } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function Home() {
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [questionCount, setQuestionCount] = useState(staticQuestions.length);

  useEffect(() => {
    const session = loadSession();
    setHasExistingSession(session !== null);

    async function loadQuestionCount() {
      try {
        const dbQuestions = await fetchQuestionsForQuiz();
        if (dbQuestions.length > 0) {
          setQuestionCount(dbQuestions.length);
        }
      } catch (error) {
        console.error('Error fetching question count:', error);
      }
    }

    loadQuestionCount();
  }, []);

  const handleStartNew = () => {
    clearSession();
    window.location.href = '/quiz';
  };

  const handleContinue = () => {
    window.location.href = '/quiz';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-3">
            Algebra I Regents
          </h1>
          <p className="text-2xl text-gray-700 font-semibold mb-2">
            Practice Test
          </p>
          <div className="inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-xl font-bold text-sm">
            {questionCount} Questions
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-8 max-w-md mx-auto">
          <div className="space-y-4">
            {hasExistingSession && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-800 text-sm font-bold">
                  You have an unfinished quiz. Continue where you left off or start a new one.
                </p>
              </div>
            )}

            {hasExistingSession ? (
              <>
                <button
                  onClick={handleContinue}
                  className="w-full px-6 py-4 text-base font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-xl shadow-md transition-all"
                >
                  CONTINUE QUIZ
                </button>
                <button
                  onClick={handleStartNew}
                  className="w-full px-6 py-4 text-base font-bold text-gray-700 bg-white border-2 border-gray-300 hover:border-black hover:bg-gray-50 active:scale-95 rounded-xl transition-all"
                >
                  START NEW QUIZ
                </button>
              </>
            ) : (
              <Link href="/quiz" className="block">
                <button className="w-full px-6 py-4 text-base font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-xl shadow-md transition-all">
                  START QUIZ
                </button>
              </Link>
            )}
          </div>

          <div className="mt-8 pt-6 border-t-2 border-gray-200">
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
