'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { questions as staticQuestions } from '@/lib/data';
import { loadSession, clearSession } from '@/lib/storage';
import { calculateResults, getPerformanceLevel, formatTime } from '@/lib/results';
import { fetchQuestionsForQuiz } from '@/lib/supabase';
import { Question, QuizResult } from '@/lib/types';

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(staticQuestions);

  useEffect(() => {
    async function loadResults() {
      const session = loadSession();
      if (!session) {
        router.push('/');
        return;
      }

      let questionsToUse: Question[] = staticQuestions;
      try {
        const dbQuestions = await fetchQuestionsForQuiz();
        if (dbQuestions.length > 0) {
          questionsToUse = dbQuestions;
          setQuestions(dbQuestions);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }

      const calculatedResult = calculateResults(questionsToUse, session);
      setResult(calculatedResult);
    }

    loadResults();
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading results...</div>
      </div>
    );
  }

  const scorePercentage = Math.round((result.score / result.totalQuestions) * 100);
  const performance = getPerformanceLevel(scorePercentage);

  const handleRetakeQuiz = () => {
    clearSession();
    router.push('/quiz');
  };

  const handleBackHome = () => {
    clearSession();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Quiz Complete!
          </h1>
          <p className="text-gray-600">
            Here's how you performed on the Algebra I Regents practice test
          </p>
        </div>

        {/* Score Card */}
        <div className="card mb-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-blue-100 mb-4">
              <span className="text-5xl font-bold text-blue-600">
                {scorePercentage}%
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {result.score} / {result.totalQuestions}
            </h2>
            <div
              className={`inline-block px-4 py-2 rounded-full border-2 ${performance.bgColor}`}
            >
              <span className={`font-semibold ${performance.color}`}>
                {performance.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-gray-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatTime(result.averageTime)}
              </div>
              <div className="text-sm text-gray-600">Average Time per Question</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {Object.keys(result.topicAccuracy).length}
              </div>
              <div className="text-sm text-gray-600">Topics Covered</div>
            </div>
          </div>
        </div>

        {/* Topic Performance */}
        <div className="card mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Performance by Topic
          </h3>
          <div className="space-y-4">
            {Object.entries(result.topicAccuracy)
              .sort((a, b) => b[1].percentage - a[1].percentage)
              .map(([topic, stats]) => {
                const topicPerformance = getPerformanceLevel(stats.percentage);
                return (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{topic}</span>
                      <span className="text-sm text-gray-600">
                        {stats.correct} / {stats.total} correct ({stats.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          stats.percentage >= 80
                            ? 'bg-green-500'
                            : stats.percentage >= 65
                            ? 'bg-blue-500'
                            : stats.percentage >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Question-by-Question Details */}
        <div className="card mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-xl font-bold text-gray-900">
              Question-by-Question Breakdown
            </h3>
            <svg
              className={`w-6 h-6 transition-transform ${
                showDetails ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showDetails && (
            <div className="mt-6 space-y-3">
              {result.questionResults.map((qResult, index) => (
                <div
                  key={qResult.questionId}
                  className={`p-4 rounded-lg border-2 ${
                    qResult.isCorrect
                      ? 'bg-green-50 border-green-200'
                      : qResult.userAnswer === null
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-gray-900">
                          Question {index + 1}
                        </span>
                        {qResult.isCorrect ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            ✓ Correct
                          </span>
                        ) : qResult.userAnswer === null ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Not Answered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            ✗ Incorrect
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {qResult.topics.join(', ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        {qResult.userAnswer !== null && (
                          <div>
                            Your answer:{' '}
                            <span className="font-medium">
                              {
                                questions[index].answers[qResult.userAnswer - 1]
                              }
                            </span>
                          </div>
                        )}
                        {!qResult.isCorrect && (
                          <div className="text-green-700">
                            Correct answer:{' '}
                            <span className="font-medium">
                              {
                                questions[index].answers[
                                  qResult.correctAnswer - 1
                                ]
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 ml-4">
                      {formatTime(qResult.timeSpent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={handleRetakeQuiz} className="btn-primary flex-1">
            Retake Quiz
          </button>
          <button onClick={handleBackHome} className="btn-outline flex-1">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
