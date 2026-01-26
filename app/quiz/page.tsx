"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Question, QuizSession } from "@/lib/types";
import { loadSession, saveSession, createNewSession, updateSkillProgress, loadMarkedForReview, toggleMarkedForReview } from "@/lib/storage";
import { fetchQuestionsForQuiz, fetchQuestionsForTestQuiz, fetchTestById } from "@/lib/supabase";
import DrawingCanvas from "@/components/DrawingCanvas";
import FullscreenDrawingCanvas from "@/components/FullscreenDrawingCanvas";
import Timer from "@/components/Timer";
import ExplanationSlider from "@/components/ExplanationSlider";
import ReferenceImageModal from "@/components/ReferenceImageModal";
import MathText from "@/components/MathText";
import BugReportModal from "@/components/BugReport/BugReportModal";
import { GraphData, DEFAULT_GRAPH_DATA } from "@/components/GraphingTool/types";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with JSXGraph
const GraphingTool = dynamic(() => import("@/components/GraphingTool/GraphingTool"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-gray-500 text-sm">Loading graph...</div>
    </div>
  ),
});

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredAnswer, setHoveredAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showReferenceImage, setShowReferenceImage] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [showGraphingTool, setShowGraphingTool] = useState(false);
  const [graphClearKey, setGraphClearKey] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [testName, setTestName] = useState<string | undefined>(undefined);

  // Practice mode - multiple questions from question bank
  const practiceMode = searchParams.get('mode');
  const isPracticeMode = practiceMode === 'practice';
  const [practiceSkill, setPracticeSkill] = useState<string | null>(null);
  const [practiceMarkedQuestions, setPracticeMarkedQuestions] = useState<Set<string>>(new Set());

  // Drawing state for fullscreen canvas
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [penSize, setPenSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(15);
  const [penColor, setPenColor] = useState('#22c55e');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<Record<string, string[]>>({});

  const currentDrawingKey = session ? `fullscreen-${session.currentQuestionIndex}` : '';
  const currentHistory = drawingHistory[currentDrawingKey] || [];
  const canUndo = currentHistory.length > 0;

  const handleDrawingChange = (dataUrl: string) => {
    if (!session) return;
    const key = `fullscreen-${session.currentQuestionIndex}`;
    setDrawingHistory(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), dataUrl]
    }));
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        drawings: {
          ...prev.drawings,
          [key]: dataUrl,
        },
      };
    });
  };

  const handleUndo = () => {
    if (!session || currentHistory.length === 0) return;
    const key = `fullscreen-${session.currentQuestionIndex}`;
    const newHistory = currentHistory.slice(0, -1);
    setDrawingHistory(prev => ({
      ...prev,
      [key]: newHistory
    }));
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        drawings: {
          ...prev.drawings,
          [key]: newHistory.length > 0 ? newHistory[newHistory.length - 1] : '',
        },
      };
    });
  };

  const handleClear = () => {
    if (!session) return;
    const key = `fullscreen-${session.currentQuestionIndex}`;
    setDrawingHistory(prev => ({
      ...prev,
      [key]: []
    }));
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        drawings: {
          ...prev.drawings,
          [key]: '',
        },
      };
    });
  };

  useEffect(() => {
    setMounted(true);

    // Load marked for review questions for practice mode
    const markedQuestions = loadMarkedForReview();
    setPracticeMarkedQuestions(markedQuestions);

    const testIdFromUrl = searchParams.get('testId');
    const practiceModeFromUrl = searchParams.get('mode');
    const skillFilter = searchParams.get('skill');
    const existingSession = loadSession();

    async function loadQuestionsAndSession() {
      try {
        // Practice mode - questions filtered by skill
        if (practiceModeFromUrl === 'practice') {
          const allQuestions = await fetchQuestionsForQuiz();

          // Filter by skill if provided
          let filteredQuestions = allQuestions;
          if (skillFilter) {
            filteredQuestions = allQuestions.filter(q =>
              q.topics.includes(skillFilter)
            );
            setPracticeSkill(skillFilter);
          }

          if (filteredQuestions.length === 0) {
            // No questions match skill, redirect to home
            router.push('/');
            return;
          }

          setQuestions(filteredQuestions);
          // Create a fresh session for practice (don't save to localStorage)
          const practiceSession = createNewSession();
          setSession(practiceSession);
          setIsLoadingQuestions(false);
          return;
        }

        // Full test mode
        // Determine which test to load
        let testId = testIdFromUrl;

        // If no testId in URL but we have a session with a testId, use that
        if (!testId && existingSession?.testId) {
          testId = existingSession.testId;
        }

        // Load questions for the specific test or all questions if no test specified
        let dbQuestions: Question[];
        if (testId) {
          dbQuestions = await fetchQuestionsForTestQuiz(testId);
          // Fetch test name for bug reports
          const testData = await fetchTestById(testId);
          if (testData) {
            setTestName(testData.name);
          }
        } else {
          // Fallback to loading all questions (backward compatibility)
          dbQuestions = await fetchQuestionsForQuiz();
        }
        setQuestions(dbQuestions);

        // Handle session
        if (existingSession && existingSession.testId === testId) {
          // Continue existing session for the same test
          // Ensure backward compatibility - add checkedAnswers if it doesn't exist
          if (!existingSession.checkedAnswers) {
            existingSession.checkedAnswers = {};
          }
          // Add markedForReview if it doesn't exist (backward compatibility)
          if (!existingSession.markedForReview) {
            existingSession.markedForReview = {};
          }
          // Add firstAttemptAnswers if it doesn't exist (backward compatibility)
          if (!existingSession.firstAttemptAnswers) {
            existingSession.firstAttemptAnswers = {};
          }
          // Add graphs if it doesn't exist (backward compatibility)
          if (!existingSession.graphs) {
            existingSession.graphs = {};
          }
          // Convert old format (single number) to new format (array)
          Object.keys(existingSession.checkedAnswers).forEach((key) => {
            const value = existingSession.checkedAnswers[key];
            if (typeof value === "number") {
              existingSession.checkedAnswers[key] = [value];
            }
          });
          setSession(existingSession);
        } else {
          // Create new session for this test
          const newSession = createNewSession(testId || undefined);
          setSession(newSession);
          saveSession(newSession);
        }
      } catch (error) {
        console.error("Error fetching questions from Supabase:", error);
      } finally {
        setIsLoadingQuestions(false);
      }
    }

    loadQuestionsAndSession();
  }, [searchParams, router]);

  useEffect(() => {
    // Don't save session for practice mode
    if (session && !isPracticeMode) {
      saveSession(session);
    }
  }, [session, isPracticeMode]);

  if (!mounted || !session || isLoadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No questions available
          </h2>
          <p className="text-gray-600 mb-4">
            Please add questions using the admin panel.
          </p>
          <button onClick={() => router.push("/")} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[session.currentQuestionIndex];
  const progress =
    ((session.currentQuestionIndex + 1) / questions.length) * 100;
  const selectedAnswer = session.userAnswers[currentQuestion.id] || null;
  const checkedAnswers = session.checkedAnswers[currentQuestion.id] || [];
  const isMarkedForReview = isPracticeMode
    ? practiceMarkedQuestions.has(currentQuestion.id)
    : session.markedForReview[currentQuestion.id] || false;

  const handleAnswerSelect = (answerIndex: number) => {
    const timeSpent = Math.floor(
      (Date.now() - session.lastQuestionStartTime) / 1000
    );

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        userAnswers: {
          ...prev.userAnswers,
          [currentQuestion.id]: answerIndex,
        },
        questionTimes: {
          ...prev.questionTimes,
          [currentQuestion.id]:
            (prev.questionTimes[currentQuestion.id] || 0) + timeSpent,
        },
      };
    });
  };

  const handleCheckAnswer = (answerIndex: number) => {
    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    // Update skill progress in practice mode
    if (isPracticeMode && practiceSkill) {
      updateSkillProgress(practiceSkill, currentQuestion.id, isCorrect);
    }

    setSession((prev) => {
      if (!prev) return prev;
      const currentChecked = prev.checkedAnswers[currentQuestion.id] || [];

      // Only allow 1 check per question
      if (currentChecked.length >= 1) return prev;

      // Record this check attempt
      return {
        ...prev,
        checkedAnswers: {
          ...prev.checkedAnswers,
          [currentQuestion.id]: [answerIndex],
        },
        firstAttemptAnswers: {
          ...prev.firstAttemptAnswers,
          [currentQuestion.id]: answerIndex,
        },
      };
    });
  };

  const handleNext = () => {
    const timeSpent = Math.floor(
      (Date.now() - session.lastQuestionStartTime) / 1000
    );

    if (session.currentQuestionIndex < questions.length - 1) {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          lastQuestionStartTime: Date.now(),
          questionTimes: {
            ...prev.questionTimes,
            [currentQuestion.id]:
              (prev.questionTimes[currentQuestion.id] || 0) + timeSpent,
          },
        };
      });
    } else {
      // Last question
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questionTimes: {
            ...prev.questionTimes,
            [currentQuestion.id]:
              (prev.questionTimes[currentQuestion.id] || 0) + timeSpent,
          },
        };
      });
      // In practice mode, go back to question bank; in test mode, go to results
      if (isPracticeMode) {
        router.push("/?tab=question-bank");
      } else {
        router.push("/results");
      }
    }
  };

  const handlePrevious = () => {
    if (session.currentQuestionIndex > 0) {
      const timeSpent = Math.floor(
        (Date.now() - session.lastQuestionStartTime) / 1000
      );

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex - 1,
          lastQuestionStartTime: Date.now(),
          questionTimes: {
            ...prev.questionTimes,
            [currentQuestion.id]:
              (prev.questionTimes[currentQuestion.id] || 0) + timeSpent,
          },
        };
      });
    }
  };

  const handleToggleMarkForReview = () => {
    if (isPracticeMode) {
      // Use persistent storage for practice mode
      const isNowMarked = toggleMarkedForReview(currentQuestion.id);
      setPracticeMarkedQuestions(prev => {
        const newSet = new Set(prev);
        if (isNowMarked) {
          newSet.add(currentQuestion.id);
        } else {
          newSet.delete(currentQuestion.id);
        }
        return newSet;
      });
    } else {
      // Use session storage for test mode
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          markedForReview: {
            ...prev.markedForReview,
            [currentQuestion.id]: !prev.markedForReview[currentQuestion.id],
          },
        };
      });
    }
  };

  const handleSubmit = () => {
    if (
      window.confirm(
        "Are you sure you want to submit your quiz? You can review your answers before submitting."
      )
    ) {
      router.push("/results");
    }
  };

  const answeredCount = Object.keys(session.userAnswers).filter(
    (key) => session.userAnswers[key] !== null
  ).length;

  const isCorrect =
    checkedAnswers.length > 0 &&
    checkedAnswers.includes(currentQuestion.correctAnswer);
  const attemptsUsed = checkedAnswers.length;
  const maxAttempts = 1;
  const canAttempt = !isCorrect && attemptsUsed < maxAttempts;
  const hasChecked = attemptsUsed > 0;

  return (
    <>
      <div
        className={`min-h-screen pb-16 transition-all duration-300 relative ${
          showCalculator ? "md:mr-[420px]" : ""
        }`}
        style={{ backgroundColor: 'transparent', pointerEvents: 'none' }}
      >
        {/* Drawing Canvas - Scrolls with content */}
        <FullscreenDrawingCanvas
          initialDrawing={session.drawings[currentDrawingKey]}
          onDrawingChange={handleDrawingChange}
          tool={tool}
          penSize={penSize}
          eraserSize={eraserSize}
          penColor={penColor}
          onUndo={handleUndo}
          onClear={handleClear}
          canUndo={canUndo}
        />
        {/* Top Progress Bar */}
        <div className="sticky top-0 z-[200] bg-white border-b border-gray-200" style={{ pointerEvents: 'auto' }}>
          {!isPracticeMode && (
            <div className="relative h-2 bg-gray-200">
              <div
                className="h-2 bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="max-w-5xl mx-auto px-4 py-2.5 md:py-2 flex items-center justify-between">
            <button
              onClick={() => {
                if (isPracticeMode) {
                  router.push("/?tab=question-bank");
                } else if (
                  window.confirm(
                    "Are you sure you want to exit? Your progress will be saved."
                  )
                ) {
                  router.push("/");
                }
              }}
              className="p-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              title={isPracticeMode ? "Back to Question Bank" : "Exit"}
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Practice Mode Label */}
            {isPracticeMode && (
              <span className="text-sm font-bold text-gray-700">
                {practiceSkill ? practiceSkill : 'Practice'} ({questions.length} questions)
              </span>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowReferenceImage(true)}
                className="flex flex-col items-center gap-0.5 hover:bg-gray-100 active:scale-95 transition-all rounded-lg p-1"
                title="Reference Sheet"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-[9px] font-medium text-gray-600">Reference</span>
              </button>

              <button
                onClick={() => setShowGraphingTool(!showGraphingTool)}
                className={`flex flex-col items-center gap-0.5 active:scale-95 transition-all rounded-lg p-1 ${
                  showGraphingTool
                    ? 'bg-blue-100 text-blue-700'
                    : session.graphs?.[currentQuestion.id]
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Graphing Tool"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l4-4 4 4 5-5" />
                </svg>
                <span className="text-[9px] font-medium">Graph</span>
              </button>

              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="flex flex-col items-center gap-0.5 hover:bg-gray-100 active:scale-95 transition-all rounded-lg p-1"
                title="Calculator"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-[9px] font-medium text-gray-600">Calculator</span>
              </button>

              <Timer startTime={session.lastQuestionStartTime} />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 pt-4" style={{ pointerEvents: 'auto' }}>
          {/* Question Number and Topic Badges Row */}
          <div className="mb-4 flex items-center gap-2 flex-wrap relative" style={{ zIndex: 100, transform: 'translateZ(0)', pointerEvents: 'none' }}>
            {/* Question Number Badge */}
            <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
              <span className="inline-block text-sm font-bold px-4 py-1.5 rounded-full bg-black text-white">
                Question {session.currentQuestionIndex + 1}
              </span>

              {/* Mark for Review Button */}
              <button
                onClick={handleToggleMarkForReview}
                className={`px-3 py-1.5 rounded-full border-2 active:scale-95 transition-all flex items-center gap-1.5 ${
                  isMarkedForReview
                    ? "bg-yellow-50 border-yellow-400 hover:border-yellow-500"
                    : "border-gray-300 hover:border-black hover:bg-gray-100"
                }`}
                title={
                  isMarkedForReview ? "Unmark for review" : "Mark for review"
                }
              >
                <svg
                  className={`w-4 h-4 ${
                    isMarkedForReview ? "text-yellow-600" : "text-gray-700"
                  }`}
                  fill={isMarkedForReview ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <span className={`text-xs font-medium ${
                  isMarkedForReview ? "text-yellow-700" : "text-gray-700"
                }`}>
                  Mark for Review
                </span>
              </button>

              {/* Report Bug Button */}
              <button
                onClick={() => setShowBugReport(true)}
                className="px-3 py-1.5 rounded-full border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 active:scale-95 transition-all flex items-center gap-1.5"
                title="Report an issue with this question"
              >
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
                <span className="text-xs font-medium text-gray-700">Report</span>
              </button>
            </div>

            {/* Topic Badges */}
            {currentQuestion.topics.length > 0 && (
              <>
                {currentQuestion.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200"
                  >
                    {topic}
                  </span>
                ))}
              </>
            )}
          </div>

          {/* Drawing Toolbar - Compact Single Row */}
          <div className="flex items-center gap-2 mb-8 relative" style={{ zIndex: 100, transform: 'translateZ(0)', pointerEvents: 'none' }}>
            {/* Pen Tool with Integrated Color Picker */}
            <div className="relative" style={{ pointerEvents: 'auto' }}>
              <button
                onClick={() => {
                  if (tool === 'pen') {
                    setShowColorPicker(!showColorPicker);
                  } else {
                    setTool('pen');
                  }
                }}
                className={`relative p-1.5 rounded-lg border-2 transition-all active:scale-95 ${
                  tool === 'pen'
                    ? 'border-2 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }`}
                style={tool === 'pen' ? { backgroundColor: penColor, borderColor: penColor } : {}}
                title="Pen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {tool === 'pen' && (
                  <div className="absolute bottom-0 right-0 w-0 h-0 border-l-4 border-l-transparent border-b-4 border-b-white" />
                )}
              </button>

              {/* Color Picker Popup */}
              {showColorPicker && tool === 'pen' && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setShowColorPicker(false)} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl p-1.5 z-[120]">
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 rotate-45" />
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: 'Green', value: '#22c55e' },
                        { name: 'Blue', value: '#3b82f6' },
                        { name: 'Red', value: '#ef4444' },
                        { name: 'Yellow', value: '#eab308' },
                        { name: 'Purple', value: '#a855f7' },
                        { name: 'Black', value: '#000000' },
                      ].map((color) => (
                        <button
                          key={color.value}
                          onClick={() => {
                            setPenColor(color.value);
                            setShowColorPicker(false);
                          }}
                          className={`w-7 h-7 rounded-md transition-all hover:scale-110 active:scale-95 ${
                            penColor === color.value ? 'ring-2 ring-black ring-offset-1' : 'border-2 border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Clear Button */}
            <div style={{ pointerEvents: 'auto' }}>
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:border-rose-500 hover:bg-rose-50 active:scale-95 transition-all"
                title="Clear all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z" />
                </svg>
              </button>
            </div>

            {/* Eraser Button */}
            <div style={{ pointerEvents: 'auto' }}>
              <button
                onClick={() => setTool('eraser')}
                className={`p-1.5 rounded-lg border-2 transition-all active:scale-95 ${
                  tool === 'eraser'
                    ? 'bg-black border-black text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-black hover:bg-gray-100'
                }`}
                title="Eraser"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.24,3.56L21.19,8.5C21.97,9.29 21.97,10.55 21.19,11.34L12,20.53C10.44,22.09 7.91,22.09 6.34,20.53L2.81,17C2.03,16.21 2.03,14.95 2.81,14.16L13.41,3.56C14.2,2.78 15.46,2.78 16.24,3.56M4.22,15.58L7.76,19.11C8.54,19.9 9.8,19.9 10.59,19.11L14.12,15.58L9.17,10.63L4.22,15.58Z" />
                </svg>
              </button>
            </div>

            {/* Size Buttons */}
            <div className="flex items-center gap-1.5" style={{ pointerEvents: 'auto' }}>
                {tool === 'pen' ? (
                  <>
                    {[2, 6].map((size) => (
                      <button
                        key={size}
                        onClick={() => setPenSize(size)}
                        className={`px-2 py-1 rounded-lg border-2 text-xs font-medium transition-all active:scale-95 ${
                          penSize === size
                            ? 'bg-black border-black text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-black hover:bg-gray-100'
                        }`}
                      >
                        {size === 2 ? 'S' : 'L'}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[15, 35].map((size) => (
                      <button
                        key={size}
                        onClick={() => setEraserSize(size)}
                        className={`px-2 py-1 rounded-lg border-2 text-xs font-medium transition-all active:scale-95 ${
                          eraserSize === size
                            ? 'bg-black border-black text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-black hover:bg-gray-100'
                        }`}
                      >
                        {size === 15 ? 'S' : 'L'}
                      </button>
                    ))}
                  </>
                )}
            </div>

            <div className="flex-1" />

            {/* Undo Button */}
            <div style={{ pointerEvents: 'auto' }}>
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:border-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                title="Undo"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Question Card - Image and/or Text */}
          {(currentQuestion.imageFilename || currentQuestion.questionText) && (
            <div className="mb-3">
              {currentQuestion.imageFilename && (
                <div className="w-full">
                  <img
                    src={currentQuestion.imageFilename}
                    alt="Question"
                    className="w-full h-auto max-h-64 object-contain rounded-lg"
                  />
                </div>
              )}
              {currentQuestion.questionText && (
                <div className={currentQuestion.imageFilename ? "mt-4" : ""} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem' }}>
                  <MathText
                    text={currentQuestion.questionText}
                    className="leading-relaxed"
                  />
                </div>
              )}
            </div>
          )}

          {/* Embedded Graphing Tool */}
          {showGraphingTool && (
            <div className="mb-4 border-2 border-blue-200 rounded-xl overflow-hidden bg-white max-w-md mx-auto relative" style={{ zIndex: 100, pointerEvents: 'auto', transform: 'translateZ(0)' }}>
              {/* Graph Header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border-b border-blue-200">
                <span className="text-xs font-bold text-blue-900">Graph</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Clear graph data for this question
                      setSession((prev) => {
                        if (!prev) return prev;
                        const newGraphs = { ...prev.graphs };
                        delete newGraphs[currentQuestion.id];
                        return { ...prev, graphs: newGraphs };
                      });
                      setGraphClearKey(prev => prev + 1);
                    }}
                    className="p-0.5 rounded hover:bg-red-50 active:scale-95 transition-all"
                    title="Clear graph"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowGraphingTool(false)}
                    className="p-0.5 rounded hover:bg-blue-100 transition-colors"
                    title="Close graph"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Graph Area */}
              <div style={{ height: '380px' }}>
                <GraphingTool
                  key={`${currentQuestion.id}-${graphClearKey}`}
                  initialData={session.graphs?.[currentQuestion.id] || DEFAULT_GRAPH_DATA}
                  onChange={(data: GraphData) => {
                    setSession((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        graphs: {
                          ...prev.graphs,
                          [currentQuestion.id]: data,
                        },
                      };
                    });
                  }}
                />
              </div>
            </div>
          )}

          {/* Answer Choices */}
          <div
            className={`mb-6 relative ${
              currentQuestion.answerLayout === 'grid'
                ? 'grid grid-cols-2 gap-2'
                : 'space-y-2'
            }`}
            style={{ zIndex: 100, transform: 'translateZ(0)', pointerEvents: 'none' }}
          >
            {currentQuestion.answers.map((answer, index) => {
              const answerNum = index + 1;
              const isChecked = checkedAnswers.includes(answerNum);
              const isCorrectAnswer =
                answerNum === currentQuestion.correctAnswer;
              const isSelected = selectedAnswer === answerNum;

              let buttonClass =
                "w-full px-4 py-3 text-left rounded-xl border-2 transition-all duration-200 font-medium active:scale-[0.98]";

              if (isChecked) {
                if (isCorrectAnswer) {
                  buttonClass += " bg-green-50 border-black text-green-900";
                } else {
                  buttonClass += " bg-rose-50 border-rose-500 text-rose-900";
                }
              } else if (isSelected) {
                buttonClass += " bg-sky-50 border-sky-400 text-sky-900";
              } else {
                buttonClass +=
                  " bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50";
              }

              const answerImage = currentQuestion.answerImageUrls?.[index];

              // For grid layout: (1)(3) on top row, (2)(4) on bottom row
              // CSS order: index 0->0, 1->2, 2->1, 3->3
              const gridOrder = currentQuestion.answerLayout === 'grid'
                ? [0, 2, 1, 3][index]
                : index;

              return (
                <div
                  key={index}
                  className="relative group"
                  style={{ pointerEvents: 'auto', order: gridOrder }}
                >
                  <button
                    onClick={() => handleAnswerSelect(answerNum)}
                    className={buttonClass}
                  >
                    <div className="flex items-start gap-3" style={{ fontSize: '1.125rem' }}>
                      <span className="font-bold shrink-0 leading-normal" style={{ fontFamily: "'Times New Roman', Times, serif" }}>({answerNum})</span>
                      <div className="flex-1 min-w-0 overflow-hidden" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                        {answer && (
                          <div className="break-words overflow-wrap-anywhere">
                            <MathText text={answer} className="text-left" />
                          </div>
                        )}
                        {answerImage && (
                          <img
                            src={answerImage}
                            alt={`Answer ${answerNum}`}
                            className="max-w-full h-auto rounded border border-gray-300 mt-2"
                          />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Check button when selected - show only if can still attempt and not already checked */}
                  {isSelected && !isChecked && canAttempt && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckAnswer(answerNum);
                      }}
                      className="absolute right-3 top-3 px-3 py-1.5 bg-black hover:bg-gray-800 active:scale-95 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                    >
                      CHECK
                    </button>
                  )}
                </div>
              );
            })}
            </div>

            {/* Calculator on Mobile - inline below answers */}
            {showCalculator && (
              <div className="md:hidden w-full bg-white border-2 border-gray-200 rounded-xl overflow-hidden mb-6 relative" style={{ zIndex: 100, transform: 'translateZ(0)' }}>
                <div className="flex items-center justify-between p-4 border-b-2 border-gray-200 bg-gray-50">
                  <h3 className="text-base font-bold text-gray-900">
                    TI-84 Calculator
                  </h3>
                  <button
                    onClick={() => setShowCalculator(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
                    aria-label="Close calculator"
                  >
                    <svg
                      className="w-5 h-5 text-gray-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="w-full h-[650px] bg-gray-50 overflow-hidden">
                  <iframe
                    src="https://ti84.pages.dev/#popup"
                    className="border-0 w-full h-full"
                    title="TI-84 Plus CE Calculator"
                    allow="fullscreen"
                  />
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Drop-up Panel for All Questions */}
      {showAllQuestions && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-20 z-[110]"
            onClick={() => setShowAllQuestions(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-20 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 bg-white rounded-2xl shadow-2xl p-4 md:p-6 z-[120] md:max-w-2xl md:w-full border-2 border-gray-200 max-h-[70vh] md:max-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  All Questions
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {answeredCount} of {questions.length} completed
                </p>
              </div>
              <button
                onClick={() => setShowAllQuestions(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Question Grid */}
            <div className="flex flex-wrap gap-2 overflow-y-auto pr-2 flex-1 min-h-0">
              {questions.map((q, index) => {
                const userAnswer = session.userAnswers[q.id];
                const isAnswered = userAnswer !== null && userAnswer !== undefined;
                const isCurrent = index === session.currentQuestionIndex;
                const checkedArray = session.checkedAnswers[q.id] || [];
                const isChecked = checkedArray.length > 0;

                // In practice mode, mark based on selection; in test mode, only mark if checked
                const isCorrectAnswer = userAnswer === q.correctAnswer;
                const shouldShowResult = isPracticeMode ? isAnswered : isChecked;
                const isCorrect = isPracticeMode
                  ? isCorrectAnswer
                  : (isChecked && checkedArray[checkedArray.length - 1] === q.correctAnswer);
                const isMarked = isPracticeMode
                  ? practiceMarkedQuestions.has(q.id)
                  : session.markedForReview[q.id] || false;

                let bgClass = "bg-white border-2 border-gray-200 text-gray-700";
                if (isCurrent) {
                  bgClass = "bg-slate-700 border-slate-700 text-white";
                } else if (shouldShowResult) {
                  if (isCorrect) {
                    bgClass = "bg-green-50 border-black text-green-700";
                  } else {
                    bgClass = "bg-rose-50 border-rose-500 text-rose-700";
                  }
                } else if (isAnswered) {
                  bgClass = "bg-gray-100 border-gray-300 text-gray-600";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      const timeSpent = Math.floor(
                        (Date.now() - session.lastQuestionStartTime) / 1000
                      );
                      setSession((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          currentQuestionIndex: index,
                          lastQuestionStartTime: Date.now(),
                          questionTimes: {
                            ...prev.questionTimes,
                            [currentQuestion.id]:
                              (prev.questionTimes[currentQuestion.id] || 0) +
                              timeSpent,
                          },
                        };
                      });
                      setShowAllQuestions(false);
                    }}
                    className={`relative w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all hover:scale-105 ${bgClass}`}
                    title={`Question ${index + 1}${
                      isMarked ? " (Marked for review)" : ""
                    }`}
                  >
                    {index + 1}
                    {isMarked && (
                      <svg
                        className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend at bottom */}
            <div className="flex items-center justify-center gap-3 md:gap-6 mt-4 pt-4 border-t text-xs text-gray-600 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded border-2 border-gray-200 bg-white"></div>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded border-2 border-black bg-green-50"></div>
                <span>Correct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded border-2 border-rose-500 bg-rose-50"></div>
                <span>Incorrect</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-slate-700"></div>
                <span>Current</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fixed Bottom Section - Duolingo Style */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 z-[100] transition-all duration-300 ${
          showCalculator ? "md:right-[420px]" : "md:right-0"
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="max-w-5xl mx-auto px-3 md:px-4 py-2 md:py-2.5">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Left: Question Navigator with Back/Forward */}
            <div className="flex items-center gap-1">
              {/* Back Button */}
              <button
                onClick={handlePrevious}
                disabled={session.currentQuestionIndex === 0}
                className="p-1.5 md:p-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Question Counter */}
              <button
                onClick={() => setShowAllQuestions(true)}
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 border-gray-300 hover:border-black hover:bg-gray-100 text-xs md:text-sm font-bold text-gray-700 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>
                  {session.currentQuestionIndex + 1}/{questions.length}
                </span>
                <svg
                  className="w-3 h-3 md:w-3.5 md:h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>

              {/* Forward Button */}
              <button
                onClick={handleNext}
                disabled={session.currentQuestionIndex === questions.length - 1}
                className="p-1.5 md:p-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Right: Explanation + Next Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExplanation(true)}
                className="px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-bold text-gray-700 bg-white border-2 border-gray-300 hover:border-black hover:bg-gray-50 active:scale-95 rounded-lg md:rounded-xl transition-all"
              >
                EXPLANATION
              </button>
              {session.currentQuestionIndex === questions.length - 1 ? (
                isPracticeMode ? (
                  <button
                    onClick={() => router.push('/?tab=question-bank')}
                    className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-lg md:rounded-xl shadow-md transition-all"
                  >
                    DONE
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-lg md:rounded-xl shadow-md transition-all"
                  >
                    FINISH
                  </button>
                )
              ) : (
                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-lg md:rounded-xl shadow-md transition-all flex items-center gap-1"
                >
                  NEXT
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Slider */}
      <ExplanationSlider
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        explanationText={currentQuestion.explanation}
        explanationImageUrl={currentQuestion.explanationImageUrl}
        correctAnswer={
          currentQuestion.answers[currentQuestion.correctAnswer - 1]
        }
        isCorrect={isCorrect}
        hasAnswered={checkedAnswers.length > 0}
      />

      {/* Reference Image Modal - Shows default PDF if no specific reference */}
      <ReferenceImageModal
        isOpen={showReferenceImage}
        onClose={() => setShowReferenceImage(false)}
        imageUrl={currentQuestion.referenceImageUrl}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={showBugReport}
        onClose={() => setShowBugReport(false)}
        questionNumber={session.currentQuestionIndex + 1}
        questionId={currentQuestion.id}
        testId={session.testId}
        testName={testName}
      />

      {/* Calculator Panel - Desktop only (right sidebar) */}
      <div
        className={`hidden md:block fixed top-0 right-0 w-[420px] h-screen bg-white border-l-2 border-gray-200 shadow-2xl z-[100] transition-transform duration-300 ${
          showCalculator ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Calculator iframe */}
        <div className="w-full h-full bg-gray-50 overflow-auto">
          <iframe
            src="https://ti84.pages.dev/#popup"
            className="border-0 w-full h-full"
            title="TI-84 Plus CE Calculator"
            allow="fullscreen"
            scrolling="yes"
          />
        </div>
      </div>
    </>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <QuizPageContent />
    </Suspense>
  );
}
