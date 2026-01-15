"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Question, QuizSession } from "@/lib/types";
import { loadSession, saveSession, createNewSession } from "@/lib/storage";
import { fetchQuestionsForQuiz } from "@/lib/supabase";
import DrawingCanvas from "@/components/DrawingCanvas";
import FullscreenDrawingCanvas from "@/components/FullscreenDrawingCanvas";
import Timer from "@/components/Timer";
import ExplanationSlider from "@/components/ExplanationSlider";
import ReferenceImageModal from "@/components/ReferenceImageModal";
import MathText from "@/components/MathText";

export default function QuizPage() {
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredAnswer, setHoveredAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showReferenceImage, setShowReferenceImage] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

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

    async function loadQuestions() {
      try {
        const dbQuestions = await fetchQuestionsForQuiz();
        setQuestions(dbQuestions);
      } catch (error) {
        console.error("Error fetching questions from Supabase:", error);
      } finally {
        setIsLoadingQuestions(false);
      }
    }

    loadQuestions();

    const existingSession = loadSession();
    if (existingSession) {
      // Ensure backward compatibility - add checkedAnswers if it doesn't exist
      if (!existingSession.checkedAnswers) {
        existingSession.checkedAnswers = {};
      }
      // Add markedForReview if it doesn't exist (backward compatibility)
      if (!existingSession.markedForReview) {
        existingSession.markedForReview = {};
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
      const newSession = createNewSession();
      setSession(newSession);
      saveSession(newSession);
    }
  }, []);

  useEffect(() => {
    if (session) {
      saveSession(session);
    }
  }, [session]);

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
  const isMarkedForReview =
    session.markedForReview[currentQuestion.id] || false;

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
    setSession((prev) => {
      if (!prev) return prev;
      const currentChecked = prev.checkedAnswers[currentQuestion.id] || [];

      // Add to checked answers if not already checked
      if (!currentChecked.includes(answerIndex)) {
        return {
          ...prev,
          userAnswers: {
            ...prev.userAnswers,
            [currentQuestion.id]: answerIndex,
          },
          checkedAnswers: {
            ...prev.checkedAnswers,
            [currentQuestion.id]: [...currentChecked, answerIndex],
          },
        };
      }
      return prev;
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
      router.push("/results");
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
    checkedAnswers[checkedAnswers.length - 1] === currentQuestion.correctAnswer;

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
        <div className="sticky top-0 z-[100] bg-white border-b border-gray-200" style={{ pointerEvents: 'auto' }}>
          <div className="relative h-1 bg-gray-200">
            <div
              className="h-1 bg-black transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="max-w-5xl mx-auto px-4 py-2.5 md:py-2 flex items-center justify-between">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to exit? Your progress will be saved."
                  )
                ) {
                  router.push("/");
                }
              }}
              className="p-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              title="Exit"
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
          <div className="mb-3 flex items-center gap-2 flex-wrap relative" style={{ zIndex: 100, transform: 'translateZ(0)', pointerEvents: 'none' }}>
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
          <div className="flex items-center gap-1.5 mb-2 relative" style={{ zIndex: 100, transform: 'translateZ(0)', pointerEvents: 'none' }}>
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
            <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
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
          </div>

          {/* Question Card - Image and/or Text */}
          {(currentQuestion.imageFilename || currentQuestion.questionText) && (
            <div className="mb-4">
              {currentQuestion.imageFilename && (
                <div className="w-full">
                  <img
                    src={currentQuestion.imageFilename}
                    alt="Question"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              )}
              {currentQuestion.questionText && (
                <div className={currentQuestion.imageFilename ? "mt-3" : ""} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem' }}>
                  <MathText
                    text={currentQuestion.questionText}
                    className="leading-relaxed"
                  />
                </div>
              )}
            </div>
          )}

          {/* Answer Choices */}
          <div className="space-y-2 mb-4 relative" style={{ zIndex: 100, transform: 'translateZ(0)', pointerEvents: 'none' }}>
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

              return (
                <div key={index} className="relative group" style={{ pointerEvents: 'auto' }}>
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

                  {/* Check button when selected - show on any option that hasn't been checked yet */}
                  {isSelected && !isChecked && (
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
                const isAnswered =
                  session.userAnswers[q.id] !== null &&
                  session.userAnswers[q.id] !== undefined;
                const isCurrent = index === session.currentQuestionIndex;
                const checkedArray = session.checkedAnswers[q.id] || [];
                const isChecked = checkedArray.length > 0;
                const isCorrect =
                  isChecked &&
                  checkedArray[checkedArray.length - 1] === q.correctAnswer;
                const isMarked = session.markedForReview[q.id] || false;

                let bgClass = "bg-white border-2 border-gray-200 text-gray-700";
                if (isCurrent) {
                  bgClass = "bg-slate-700 border-slate-700 text-white";
                } else if (isChecked) {
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
            {/* Left: Navigation */}
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Previous Button */}
              <button
                onClick={handlePrevious}
                disabled={session.currentQuestionIndex === 0}
                className="p-1.5 md:p-2 rounded-full border-2 border-gray-300 hover:border-black hover:bg-gray-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Previous"
              >
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Question Navigator */}
              <button
                onClick={() => setShowAllQuestions(true)}
                className="px-2 py-1.5 md:px-3 md:py-2 rounded-full border-2 border-gray-300 hover:border-black hover:bg-gray-100 text-xs font-bold text-gray-700 active:scale-95 transition-all flex items-center gap-1"
              >
                <span>
                  {session.currentQuestionIndex + 1}/{questions.length}
                </span>
                <svg
                  className="w-2.5 h-2.5 md:w-3 md:h-3"
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

              {/* Next/Finish Button */}
              {session.currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 border-black bg-black text-white hover:bg-gray-800 active:scale-95 text-xs font-bold transition-all"
                  title="Finish Quiz"
                >
                  FINISH
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="p-1.5 md:p-2 rounded-full border-2 border-gray-300 hover:border-black hover:bg-gray-100 active:scale-95 transition-all"
                  title="Next"
                >
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-700"
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

            {/* Right: Explanation Button */}
            <button
              onClick={() => setShowExplanation(true)}
              className="px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-lg md:rounded-xl shadow-md transition-all"
            >
              <span className="hidden sm:inline">EXPLANATION</span>
              <span className="sm:hidden">EXPLANATION</span>
            </button>
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
