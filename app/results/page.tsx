'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadSession, clearSession } from '@/lib/storage';
import { calculateResults, getPerformanceLevel, formatTime, getScoreComment, getScaledScore } from '@/lib/results';
import { fetchQuestionsForQuiz } from '@/lib/supabase';
import { Question, QuizResult } from '@/lib/types';

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    async function loadResults() {
      const session = loadSession();
      if (!session) {
        router.push('/');
        return;
      }

      try {
        const dbQuestions = await fetchQuestionsForQuiz();
        setQuestions(dbQuestions);
        const calculatedResult = calculateResults(dbQuestions, session);
        setResult(calculatedResult);
      } catch (error) {
        console.error('Error fetching questions:', error);
        router.push('/');
      }
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

  const rawScore = result.earnedPoints;
  const scaledScore = getScaledScore(rawScore);
  const scoreComment = getScoreComment(scaledScore);

  const handleRetakeQuiz = () => {
    clearSession();
    router.push('/quiz');
  };

  const handleBackHome = () => {
    clearSession();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-white py-8">
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
        <div className="bg-white border-2 border-gray-200 rounded-xl p-8 mb-6">
          <div className="text-center">
            {/* Circle with Remark */}
            <div className={`inline-flex flex-col items-center justify-center w-48 h-48 rounded-full ${scoreComment.circleColor} mb-4 text-white`}>
              <span className="font-bold text-2xl text-center px-4">
                {scoreComment.status}
              </span>
            </div>

            {/* Score Details */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Raw Score: {rawScore} / {result.totalPoints}
            </h2>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              Scaled Score: {scaledScore} / 100
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {result.score} / {result.totalQuestions} Questions Correct
            </p>

            {/* Message */}
            <div
              className={`inline-block px-6 py-3 rounded-xl border-2 ${scoreComment.bgColor} mb-4`}
            >
              <div className={`text-sm ${scoreComment.color}`}>
                {scoreComment.message}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t-2 border-gray-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatTime(result.averageTime)}
              </div>
              <div className="text-sm text-gray-600 font-medium">Average Time per Question</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {Object.keys(result.topicAccuracy).length}
              </div>
              <div className="text-sm text-gray-600 font-medium">Topics Covered</div>
            </div>
          </div>
        </div>

        {/* Topic Performance */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Performance by Topic
          </h3>
          <div className="space-y-4">
            {Object.entries(result.topicAccuracy)
              .sort((a, b) => b[1].percentage - a[1].percentage)
              .map(([topic, stats]) => {
                return (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">{topic}</span>
                      <span className="text-xs text-gray-600 font-medium">
                        {stats.correct} / {stats.total} correct ({stats.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          stats.percentage >= 80
                            ? 'bg-green-500'
                            : stats.percentage >= 65
                            ? 'bg-blue-500'
                            : stats.percentage >= 50
                            ? 'bg-yellow-500'
                            : 'bg-rose-500'
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
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-left active:scale-95 transition-all"
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
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-bold text-gray-900">
                          Question {index + 1}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-black text-white">
                          {qResult.isCorrect ? qResult.points : 0}/{qResult.points} pts
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
                          <div className="mb-2">
                            <span className="block mb-1">Your answer:</span>
                            <div className="ml-4">
                              {questions[index].answers[qResult.userAnswer - 1] && (
                                <span className="font-medium">
                                  {questions[index].answers[qResult.userAnswer - 1]}
                                </span>
                              )}
                              {questions[index].answerImageUrls?.[qResult.userAnswer - 1] && (
                                <img
                                  src={questions[index].answerImageUrls[qResult.userAnswer - 1]}
                                  alt={`Your answer ${qResult.userAnswer}`}
                                  className="max-w-[200px] h-auto rounded border border-gray-300 mt-1"
                                />
                              )}
                            </div>
                          </div>
                        )}
                        {!qResult.isCorrect && (
                          <div className="text-green-700">
                            <span className="block mb-1">Correct answer:</span>
                            <div className="ml-4">
                              {questions[index].answers[qResult.correctAnswer - 1] && (
                                <span className="font-medium">
                                  {questions[index].answers[qResult.correctAnswer - 1]}
                                </span>
                              )}
                              {questions[index].answerImageUrls?.[qResult.correctAnswer - 1] && (
                                <img
                                  src={questions[index].answerImageUrls[qResult.correctAnswer - 1]}
                                  alt={`Correct answer ${qResult.correctAnswer}`}
                                  className="max-w-[200px] h-auto rounded border border-gray-300 mt-1"
                                />
                              )}
                            </div>
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
          <button
            onClick={handleRetakeQuiz}
            className="flex-1 px-6 py-3 text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-xl shadow-md transition-all"
          >
            RETAKE QUIZ
          </button>
          <button
            onClick={handleBackHome}
            className="flex-1 px-6 py-3 text-sm font-bold text-gray-700 bg-white border-2 border-gray-300 hover:border-black hover:bg-gray-50 active:scale-95 rounded-xl transition-all"
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </div>
  );
}
