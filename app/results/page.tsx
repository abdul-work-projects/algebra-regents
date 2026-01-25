'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { loadSession, clearSession } from '@/lib/storage';
import { calculateResults, getPerformanceLevel, formatTime, getScoreComment, getScaledScore } from '@/lib/results';
import { fetchQuestionsForQuiz, fetchQuestionsForTestQuiz, fetchTestById, convertToTestFormat } from '@/lib/supabase';
import { Question, QuizResult, Test } from '@/lib/types';
import MathText from '@/components/MathText';
import dynamic from 'next/dynamic';

// Dynamic import for PDF generator to avoid SSR issues with @react-pdf/renderer
const ReportGenerator = dynamic(
  () => import('@/components/ReportPDF/ReportGenerator'),
  { ssr: false, loading: () => <div className="flex-1 px-6 py-3 text-sm font-bold text-gray-400 bg-gray-100 rounded-xl text-center">Loading PDF...</div> }
);

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [test, setTest] = useState<Test | null>(null);
  const [testId, setTestId] = useState<string | undefined>(undefined);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered' | 'missed_first' | 'second_attempt_correct'>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      const session = loadSession();
      if (!session) {
        router.push('/');
        return;
      }

      try {
        // Store testId for retake functionality
        setTestId(session.testId);

        // Load test info if we have a testId
        let currentTest: Test | null = null;
        if (session.testId) {
          const dbTest = await fetchTestById(session.testId);
          if (dbTest) {
            currentTest = convertToTestFormat({ ...dbTest, question_count: 0 });
            setTest(currentTest);
          }
        }

        // Load questions for this test or all questions
        let dbQuestions: Question[];
        if (session.testId) {
          dbQuestions = await fetchQuestionsForTestQuiz(session.testId);
        } else {
          dbQuestions = await fetchQuestionsForQuiz();
        }
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

  // Trigger confetti when results load
  const fireConfetti = useCallback(() => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });

    // Side cannons
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors,
      });
    }, 200);
  }, []);

  useEffect(() => {
    if (result) {
      // Only fire confetti for passing scores (65+)
      const rawScore = result.earnedPoints;
      const scaled = getScaledScore(rawScore, test?.scaledScoreTable);
      if (scaled >= 65) {
        fireConfetti();
      }
    }
  }, [result, test, fireConfetti]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <svg className="animate-spin w-12 h-12 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Analyzing your test...</h2>
          <p className="text-gray-500">Generating question-by-question analysis</p>
        </div>
      </div>
    );
  }

  const rawScore = result.earnedPoints;
  // Use test-specific scaled score table if available
  const scaledScore = getScaledScore(rawScore, test?.scaledScoreTable);
  const scoreComment = getScoreComment(scaledScore);

  const handleRetakeQuiz = () => {
    clearSession();
    // If we have a testId, go back to that specific test
    if (testId) {
      router.push(`/quiz?testId=${testId}`);
    } else {
      router.push('/quiz');
    }
  };

  const handleBackHome = () => {
    clearSession();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-14"></div>
          <h1 className="text-2xl font-bold text-gray-900 text-center flex-1">
            {test ? test.name : 'Algebra I Regents Practice Test'}
          </h1>
          <ReportGenerator result={result} test={test} scaledScore={scaledScore} questions={questions} iconOnly />
        </div>

        {/* Score Card - Main Display */}
        <div className="bg-white rounded-xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Left: Pass/Fail Circle */}
            <div className={`flex-shrink-0 w-52 h-52 md:w-60 md:h-60 rounded-full ${scoreComment.circleColor} flex items-center justify-center`}>
              <span className="font-bold text-4xl md:text-5xl text-white text-center">
                {scoreComment.status}
              </span>
            </div>

            {/* Right: Score Details */}
            <div className="flex-1 text-center md:text-left">
              {/* Main Score */}
              <div className="mb-3">
                <span className="text-5xl md:text-6xl font-bold text-gray-900">
                  {scaledScore}
                </span>
                <span className="text-2xl text-gray-400 ml-1">/100</span>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-1 text-gray-600 mb-4">
                <p className="flex items-center gap-1.5">
                  Scaled score: <span className="font-semibold text-gray-900">{scaledScore}</span>
                  <span className="relative group">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Your final score, based on your points
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                    </span>
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  Raw score: <span className="font-semibold text-gray-900">{rawScore}</span> / {result.totalPoints}
                  <span className="relative group">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      How many points you earned
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                    </span>
                  </span>
                </p>
                <p className="text-sm text-gray-400 pt-1">
                  {result.score} / {result.totalQuestions} questions correct
                </p>
              </div>

              {/* Message */}
              <div className={`inline-block px-5 py-2 rounded-xl ${scoreComment.bgColor}`}>
                <p className={`text-sm font-medium ${scoreComment.color}`}>
                  {scoreComment.message}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatTime(result.averageTime)}
              </div>
              <div className="text-xs text-gray-500">Avg. Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {Object.keys(result.topicAccuracy).length}
              </div>
              <div className="text-xs text-gray-500">Topics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500 mb-1">
                {result.missedOnFirstAttemptCount}
              </div>
              <div className="text-xs text-gray-500">Missed 1st Try</div>
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
            <div className="mt-6">
              {/* Filter Dropdown */}
              <div className="mb-4">
                <select
                  value={questionFilter}
                  onChange={(e) => setQuestionFilter(e.target.value as typeof questionFilter)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-black focus:outline-none"
                >
                  <option value="all">All Questions ({result.questionResults.length})</option>
                  <option value="correct">Correct ({result.questionResults.filter(q => q.isCorrect).length})</option>
                  <option value="incorrect">Incorrect ({result.questionResults.filter(q => !q.isCorrect && q.userAnswer !== null).length})</option>
                  <option value="unanswered">Unanswered ({result.questionResults.filter(q => q.userAnswer === null).length})</option>
                  <option value="missed_first">Missed 1st Attempt ({result.questionResults.filter(q => q.missedOnFirstAttempt).length})</option>
                  <option value="second_attempt_correct">2nd Attempt Correct ({result.questionResults.filter(q => q.isCorrect && q.missedOnFirstAttempt).length})</option>
                </select>
              </div>

              <div className="space-y-3">
              {result.questionResults
                .map((qResult, index) => ({ qResult, index }))
                .filter(({ qResult }) => {
                  switch (questionFilter) {
                    case 'correct':
                      return qResult.isCorrect;
                    case 'incorrect':
                      return !qResult.isCorrect && qResult.userAnswer !== null;
                    case 'unanswered':
                      return qResult.userAnswer === null;
                    case 'missed_first':
                      return qResult.missedOnFirstAttempt;
                    case 'second_attempt_correct':
                      return qResult.isCorrect && qResult.missedOnFirstAttempt;
                    default:
                      return true;
                  }
                })
                .map(({ qResult, index }) => {
                  const question = questions[index];
                  const isExpanded = expandedQuestionId === qResult.questionId;

                  return (
                    <div
                      key={qResult.questionId}
                      className={`p-4 rounded-lg border-2 ${
                        qResult.isCorrect
                          ? 'bg-green-50 border-green-200'
                          : qResult.userAnswer === null
                          ? 'bg-slate-100 border-slate-400'
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
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-200 text-slate-700 border border-slate-400">
                                Not Answered
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                ✗ Incorrect
                              </span>
                            )}
                            {qResult.missedOnFirstAttempt && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                Missed 1st attempt
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {qResult.topics.join(', ')}
                            </span>
                          </div>

                          {/* View Question Toggle */}
                          <button
                            onClick={() => setExpandedQuestionId(isExpanded ? null : qResult.questionId)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-2 flex items-center gap-1"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {isExpanded ? 'Hide Question' : 'View Question'}
                          </button>

                          {/* Expanded Question View */}
                          {isExpanded && (
                            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                              {question.imageFilename && (
                                <img
                                  src={question.imageFilename}
                                  alt="Question"
                                  className="w-full h-auto max-h-64 object-contain rounded-lg mb-2"
                                />
                              )}
                              {question.questionText && (
                                <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1rem' }}>
                                  <MathText text={question.questionText} className="leading-relaxed" />
                                </div>
                              )}
                              {question.referenceImageUrl && (
                                <img
                                  src={question.referenceImageUrl}
                                  alt="Reference"
                                  className="w-full h-auto max-h-48 object-contain rounded-lg mt-2 border border-gray-300"
                                />
                              )}
                            </div>
                          )}

                          <div className="text-sm text-gray-700">
                            {qResult.userAnswer !== null && (
                              <div className="mb-2">
                                <span className="block mb-1">Your answer:</span>
                                <div className="ml-4">
                                  {question.answers[qResult.userAnswer - 1] && (
                                    <div className="font-medium">
                                      <MathText text={question.answers[qResult.userAnswer - 1]} />
                                    </div>
                                  )}
                                  {question.answerImageUrls?.[qResult.userAnswer - 1] && (
                                    <img
                                      src={question.answerImageUrls[qResult.userAnswer - 1]}
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
                                  {question.answers[qResult.correctAnswer - 1] && (
                                    <div className="font-medium">
                                      <MathText text={question.answers[qResult.correctAnswer - 1]} />
                                    </div>
                                  )}
                                  {question.answerImageUrls?.[qResult.correctAnswer - 1] && (
                                    <img
                                      src={question.answerImageUrls[qResult.correctAnswer - 1]}
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
                  );
                })}
              </div>
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
