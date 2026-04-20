'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { loadSession, clearSession } from '@/lib/storage';
import { calculateResults, getPerformanceLevel, formatTime, getScoreComment, getScaledScore } from '@/lib/results';
import { saveTestAttempt } from '@/lib/testAttempts';
import { fetchQuestionsForQuiz, fetchQuestionsForTestQuiz, fetchTestById, convertToTestFormat } from '@/lib/supabase';
import { Question, QuizResult, Test } from '@/lib/types';
import { computeGroupingInfo } from '@/lib/questionGrouping';
import MathText from '@/components/MathText';
import ThemeToggle from '@/components/ThemeToggle';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import for PDF generator to avoid SSR issues with @react-pdf/renderer
const ReportGenerator = dynamic(
  () => import('@/components/ReportPDF/ReportGenerator'),
  { ssr: false, loading: () => <div className="flex-1 px-6 py-3 text-sm font-bold text-gray-400 bg-gray-100 dark:bg-neutral-900 dark:text-neutral-500 rounded-xl text-center">Loading PDF...</div> }
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
  const [showTopics, setShowTopics] = useState(false);

  useEffect(() => {
    async function loadResults() {
      const session = loadSession();
      if (!session) {
        router.push('/dashboard');
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

        // Persist this test attempt to local history (idempotent — keyed by session start time).
        if (session.testId && currentTest) {
          const rawScore = calculatedResult.earnedPoints;
          const scaledScore = getScaledScore(rawScore, currentTest.scaledScoreTable);
          const correctCount = calculatedResult.questionResults.filter((r) => r.isCorrect).length;
          const timeSpent = Math.max(0, Math.floor((Date.now() - session.startTime) / 1000));
          saveTestAttempt({
            id: `${session.testId}-${session.startTime}`,
            testId: session.testId,
            testName: currentTest.name,
            completedAt: Date.now(),
            rawScore,
            scaledScore,
            earnedPoints: calculatedResult.earnedPoints,
            totalPoints: calculatedResult.totalPoints,
            correctCount,
            totalQuestions: calculatedResult.totalDisplayQuestions || calculatedResult.totalQuestions,
            accuracyPercent: calculatedResult.totalQuestions > 0
              ? Math.round((correctCount / calculatedResult.totalQuestions) * 100)
              : 0,
            timeSpentSeconds: timeSpent,
            testMode: session.testMode,
          });
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        router.push('/dashboard');
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <svg className="animate-spin w-12 h-12 text-black dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100 mb-2">Analyzing your test...</h2>
          <p className="text-gray-500 dark:text-neutral-400">Generating question-by-question analysis</p>
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
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 py-4">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/beaver-images/logo.png" alt="Regents Ready" width={32} height={32} className="rounded-lg" />
            <span className="text-sm font-bold text-gray-900 dark:text-neutral-100 tracking-tight hidden sm:inline">Regents Ready</span>
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-neutral-100 text-center flex-1">
            {test ? test.name : 'Regents Ready Practice Test'}
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ReportGenerator result={result} test={test} scaledScore={scaledScore} questions={questions} iconOnly />
          </div>
        </div>

        {/* Score Card - Compact Display */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 md:p-6 mb-4">
          <div className="flex items-center gap-4 md:gap-8">
            {/* Left: Pass/Fail Circle - Smaller */}
            <div className={`flex-shrink-0 w-28 h-28 md:w-36 md:h-36 rounded-full ${scoreComment.circleColor} flex items-center justify-center`}>
              <span className="font-bold text-2xl md:text-3xl text-white text-center">
                {scoreComment.status}
              </span>
            </div>

            {/* Right: Score Details - More Compact */}
            <div className="flex-1">
              {/* Main Score */}
              <div className="mb-1">
                <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-neutral-100">
                  {scaledScore}
                </span>
                <span className="text-lg text-gray-400 dark:text-neutral-500 ml-1">/100</span>
              </div>

              {/* Score Breakdown - Inline */}
              <div className="text-sm text-gray-600 dark:text-neutral-400 space-y-0.5">
                <p className="flex items-center gap-1">
                  Scaled score: <span className="font-semibold text-gray-900 dark:text-neutral-100">{scaledScore}</span>
                  <span className="relative group">
                    <svg className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-neutral-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Your final score, based on your points
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-neutral-700"></span>
                    </span>
                  </span>
                </p>
                <p className="flex items-center gap-1">
                  Raw score: <span className="font-semibold text-gray-900 dark:text-neutral-100">{rawScore}</span> / {result.totalPoints}
                  <span className="relative group">
                    <svg className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-neutral-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      How many points you earned
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-neutral-700"></span>
                    </span>
                  </span>
                </p>
                <p className="text-xs text-gray-400 dark:text-neutral-500">
                  {result.score} / {result.totalQuestions} questions correct
                </p>
              </div>

              {/* Message - Smaller */}
              <div className={`inline-block px-3 py-1 rounded-lg mt-2 ${scoreComment.bgColor}`}>
                <p className={`text-xs font-medium ${scoreComment.color}`}>
                  {scoreComment.message}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Row - More Compact */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-neutral-100">
                {formatTime(result.averageTime)}
              </div>
              <div className="text-xs text-gray-500 dark:text-neutral-400">Avg. Time</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-neutral-100">
                {Object.keys(result.skillAccuracy).length}
              </div>
              <div className="text-xs text-gray-500 dark:text-neutral-400">Skills</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-500">
                {result.missedOnFirstAttemptCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-neutral-400">Missed 1st Try</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <button
            onClick={handleRetakeQuiz}
            className="flex-1 px-6 py-3 text-sm font-bold text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full shadow-md transition-all"
          >
            RETAKE QUIZ
          </button>
          <button
            onClick={handleBackHome}
            className="flex-1 px-6 py-3 text-sm font-bold text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-white hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 rounded-full transition-all"
          >
            BACK TO HOME
          </button>
        </div>

        {/* Skill Performance - Collapsible */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4 mb-4 shadow-sm">
          <button
            onClick={() => setShowTopics(!showTopics)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-base font-bold text-gray-900 dark:text-neutral-100">
              Performance by Skill
            </h3>
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-neutral-400 transition-transform ${showTopics ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showTopics && (
            <div className="space-y-3 mt-4">
              {Object.entries(result.skillAccuracy)
                .sort((a, b) => b[1].percentage - a[1].percentage)
                .map(([skill, stats]) => {
                  return (
                    <div key={skill}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-neutral-100">{skill}</span>
                        <span className="text-xs text-gray-500 dark:text-neutral-400">
                          {stats.correct} / {stats.total} correct ({stats.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
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
          )}
        </div>

        {/* Question-by-Question Details */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4 mb-4 shadow-sm">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-base font-bold text-gray-900 dark:text-neutral-100">
              Question-by-Question Breakdown
            </h3>
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-neutral-400 transition-transform ${
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
            <div className="mt-4">
              {/* Filter Dropdown */}
              <div className="mb-4">
                <select
                  value={questionFilter}
                  onChange={(e) => setQuestionFilter(e.target.value as typeof questionFilter)}
                  className="px-4 py-2 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-medium focus:border-black dark:focus:border-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
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
              {(() => {
                const groupingInfo = computeGroupingInfo(questions);
                return result.questionResults
                .map((qResult, index) => ({ qResult, index, displayInfo: groupingInfo.questionMap[index] }))
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
                .map(({ qResult, index, displayInfo }) => {
                  const question = questions[index];
                  const isExpanded = expandedQuestionId === qResult.questionId;
                  const questionLabel = displayInfo
                    ? `Question ${displayInfo.displayLabel}`
                    : `Question ${index + 1}`;

                  return (
                    <div
                      key={qResult.questionId}
                      className={`p-4 rounded-lg border-2 ${
                        qResult.isCorrect
                          ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                          : qResult.userAnswer === null
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600'
                          : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="font-bold text-gray-900 dark:text-neutral-100">
                              {questionLabel}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-black dark:bg-white text-white dark:text-black">
                              {qResult.isCorrect ? qResult.points : 0}/{qResult.points} pts
                            </span>
                            {qResult.isCorrect ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400">
                                ✓ Correct
                              </span>
                            ) : qResult.userAnswer === null ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-400 dark:border-slate-500">
                                Not Answered
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400">
                                ✗ Incorrect
                              </span>
                            )}
                            {qResult.missedOnFirstAttempt && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400">
                                Missed 1st attempt
                              </span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-neutral-400">
                              {qResult.skills.join(', ')}
                            </span>
                          </div>

                          {/* Tags and Difficulty Info */}
                          {(question.tags && question.tags.length > 0) || question.difficulty ? (
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {question.tags && question.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                  {tag}
                                </span>
                              ))}
                              {question.difficulty && (
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  question.difficulty === 'easy' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                  question.difficulty === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                  'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}>
                                  {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                                </span>
                              )}
                            </div>
                          ) : null}

                          {/* View Question Toggle */}
                          <button
                            onClick={() => setExpandedQuestionId(isExpanded ? null : qResult.questionId)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mb-2 flex items-center gap-1"
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
                            <div className="mb-4 p-3 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700">
                              {question.aboveImageText && (
                                <div className="mb-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                  <MathText text={question.aboveImageText} className="leading-relaxed dark:text-neutral-200" />
                                </div>
                              )}
                              {question.imageFilename && (
                                <img
                                  src={question.imageFilename}
                                  alt="Question"
                                  className={`mx-auto h-auto rounded-lg mb-2 w-full ${question.imageSize === 'small' ? 'max-w-xs' : question.imageSize === 'medium' ? 'max-w-md' : question.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-lg'}`}
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
                                  className="w-full h-auto max-h-48 object-contain rounded-lg mt-2 border border-gray-300 dark:border-neutral-600"
                                />
                              )}

                              {/* Answer Options - Same styling as quiz page */}
                              <div className={`mt-3 ${
                                question.answerLayout === 'grid'
                                  ? 'grid grid-cols-2 gap-2'
                                  : question.answerLayout === 'row'
                                  ? 'grid grid-cols-4 gap-2'
                                  : 'space-y-2'
                              }`}>
                                {question.answers.map((answer, answerIndex) => {
                                  const optionNumber = answerIndex + 1;
                                  const isUserAnswer = qResult.userAnswer === optionNumber;
                                  const isCorrectAnswer = qResult.correctAnswer === optionNumber;

                                  let buttonClass = "w-full px-3 py-2 text-left rounded-xl border-2 transition-all";

                                  if (isCorrectAnswer) {
                                    buttonClass += " bg-green-50 dark:bg-green-900/30 border-black dark:border-green-500 text-green-900 dark:text-green-300";
                                  } else if (isUserAnswer && !qResult.isCorrect) {
                                    buttonClass += " bg-rose-50 dark:bg-rose-900/30 border-rose-500 text-rose-900 dark:text-rose-300";
                                  } else {
                                    buttonClass += " bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-neutral-300";
                                  }

                                  // Grid order: (1)(3) on top, (2)(4) on bottom
                                  const gridOrder = question.answerLayout === 'grid'
                                    ? [0, 2, 1, 3][answerIndex]
                                    : answerIndex;

                                  return (
                                    <div
                                      key={answerIndex}
                                      className="relative"
                                      style={{ order: gridOrder }}
                                    >
                                      <div className={buttonClass}>
                                        <div className="flex items-start gap-2" style={{ fontSize: '0.9rem' }}>
                                          <span className="font-bold shrink-0 leading-normal" style={{ fontFamily: "'Times New Roman', Times, serif" }}>({optionNumber})</span>
                                          <div className="flex-1 min-w-0 overflow-hidden" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                            {answer && (
                                              <div className="break-words">
                                                <MathText text={answer} className="text-left" />
                                              </div>
                                            )}
                                            {question.answerImageUrls?.[answerIndex] && (
                                              <img
                                                src={question.answerImageUrls[answerIndex]}
                                                alt={`Answer ${optionNumber}`}
                                                className="max-w-full h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
                                              />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="text-sm text-gray-700 dark:text-neutral-300">
                            {qResult.questionType === 'drag-order' ? (
                              <div className="mt-2 space-y-2">
                                <div>
                                  <span className="text-xs font-bold text-gray-500 dark:text-neutral-400">Your Order:</span>
                                  <ol className="list-decimal list-inside text-sm mt-1 space-y-0.5">
                                    {(qResult.dragOrderAnswer || []).map((item, i) => {
                                      const isCorrectPosition = qResult.dragOrderCorrect && item === qResult.dragOrderCorrect[i];
                                      return (
                                        <li key={i} className={isCorrectPosition ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                          <MathText text={item} className="inline" />
                                        </li>
                                      );
                                    })}
                                  </ol>
                                </div>
                                {!qResult.isCorrect && (
                                  <div>
                                    <span className="text-xs font-bold text-gray-500 dark:text-neutral-400">Correct Order:</span>
                                    <ol className="list-decimal list-inside text-sm mt-1 space-y-0.5 text-green-700 dark:text-green-400">
                                      {(qResult.dragOrderCorrect || []).map((item, i) => (
                                        <li key={i}><MathText text={item} className="inline" /></li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
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
                                          className="max-w-[200px] h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                                {!qResult.isCorrect && (
                                  <div className="text-green-700 dark:text-green-400">
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
                                          className="max-w-[200px] h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-neutral-400 ml-4">
                          {formatTime(qResult.timeSpent)}
                        </div>
                      </div>
                    </div>
                  );
                })
              })()}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
