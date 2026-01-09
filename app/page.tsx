'use client';

import Link from 'next/link';
import { questions } from '@/lib/data';
import { loadSession, clearSession } from '@/lib/storage';
import { useEffect, useState } from 'react';

export default function Home() {
  const [hasExistingSession, setHasExistingSession] = useState(false);

  useEffect(() => {
    const session = loadSession();
    setHasExistingSession(session !== null);
  }, []);

  const handleStartNew = () => {
    clearSession();
    window.location.href = '/quiz';
  };

  const handleContinue = () => {
    window.location.href = '/quiz';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Algebra I Regents
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Practice Test
          </p>
          <p className="text-lg text-gray-500">
            {questions.length} Questions
          </p>
        </div>

        <div className="card max-w-md mx-auto">
          <div className="space-y-4">
            {hasExistingSession && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm font-medium">
                  You have an unfinished quiz. Continue where you left off or start a new one.
                </p>
              </div>
            )}

            {hasExistingSession ? (
              <>
                <button
                  onClick={handleContinue}
                  className="btn-primary w-full"
                >
                  Continue Quiz
                </button>
                <button
                  onClick={handleStartNew}
                  className="btn-outline w-full"
                >
                  Start New Quiz
                </button>
              </>
            ) : (
              <Link href="/quiz" className="block">
                <button className="btn-primary w-full">
                  Start Quiz
                </button>
              </Link>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Features:</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Draw and take notes directly on questions</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Track your time for each question</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Get detailed performance analytics by topic</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Your progress is automatically saved</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
