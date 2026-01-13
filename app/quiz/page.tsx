"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Question, QuizSession } from "@/lib/types";
import { loadSession, saveSession, createNewSession } from "@/lib/storage";
import { fetchQuestionsForQuiz } from "@/lib/supabase";
import DrawingCanvas from "@/components/DrawingCanvas";
import Timer from "@/components/Timer";
import ExplanationSlider from "@/components/ExplanationSlider";
import ReferenceImageModal from "@/components/ReferenceImageModal";

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
  const isMarkedForReview = session.markedForReview[currentQuestion.id] || false;

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

  const handleDrawingChange = (dataUrl: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        drawings: {
          ...prev.drawings,
          [currentQuestion.id]: dataUrl,
        },
      };
    });
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
        className={`min-h-screen bg-white pb-32 transition-all duration-300 ${
          showCalculator ? "md:mr-[420px]" : ""
        }`}
      >
        {/* Top Progress Bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="relative h-1 bg-gray-200">
            <div
              className="h-1 bg-black transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="max-w-5xl mx-auto px-4 py-4 md:py-3 flex items-center justify-between">
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="p-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="Calculator"
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
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </button>

              <Timer startTime={session.lastQuestionStartTime} />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 pt-8">
          {/* Question Number and Topic Badges Row */}
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {/* Question Number Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-block text-sm font-bold px-4 py-1.5 rounded-full bg-black text-white">
                Question {session.currentQuestionIndex + 1}
              </span>

              {/* Mark for Review Button */}
              <button
                onClick={handleToggleMarkForReview}
                className={`p-1.5 rounded-full border-2 active:scale-95 transition-all ${
                  isMarkedForReview
                    ? "bg-yellow-50 border-yellow-400 hover:border-yellow-500"
                    : "border-gray-300 hover:border-black hover:bg-gray-100"
                }`}
                title={isMarkedForReview ? "Unmark for review" : "Mark for review"}
              >
                <svg
                  className={`w-4 h-4 ${isMarkedForReview ? "text-yellow-600" : "text-gray-700"}`}
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
              </button>
            </div>

            {/* Topic Badges */}
            {currentQuestion.topics.length > 0 && (
              <>
                {currentQuestion.topics.map((topic, index) => (
                  <span key={index} className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    {topic}
                  </span>
                ))}
              </>
            )}
          </div>

          {/* Question Image Card */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 mb-6">
            {/* Always show reference button - shows default PDF if no specific reference */}
            <button
              onClick={() => setShowReferenceImage(true)}
              className="mb-3 text-sm text-black hover:text-green-700 font-medium flex items-center gap-1"
            >
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {currentQuestion.referenceImageUrl ? 'View Reference' : 'View Reference Sheet'}
            </button>
            <DrawingCanvas
              imageUrl={currentQuestion.imageFilename}
              initialDrawing={session.drawings[currentQuestion.id]}
              onDrawingChange={handleDrawingChange}
            />
          </div>

          {/* Answer Choices */}
          <div className="space-y-3 mb-6">
            {currentQuestion.answers.map((answer, index) => {
              const answerNum = index + 1;
              const isChecked = checkedAnswers.includes(answerNum);
              const isCorrectAnswer =
                answerNum === currentQuestion.correctAnswer;
              const isSelected = selectedAnswer === answerNum;

              let buttonClass =
                "w-full px-4 py-3 text-left rounded-xl border-2 transition-all duration-200 text-sm font-medium active:scale-[0.98]";

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
                <div
                  key={index}
                  className="relative group"
                >
                  <button
                    onClick={() => handleAnswerSelect(answerNum)}
                    className={buttonClass}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-bold shrink-0">({answerNum})</span>
                      <div className="flex-1">
                        {answer && <div className="mb-2">{answer}</div>}
                        {answerImage && (
                          <img
                            src={answerImage}
                            alt={`Answer ${answerNum}`}
                            className="max-w-full h-auto rounded border border-gray-300"
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
            <div className="md:hidden w-full bg-white border-2 border-gray-200 rounded-xl overflow-hidden mb-6">
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
            className="fixed inset-0 bg-black bg-opacity-20 z-40"
            onClick={() => setShowAllQuestions(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-24 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 bg-white rounded-2xl shadow-2xl p-4 md:p-6 z-50 md:max-w-2xl md:w-full border-2 border-gray-200 max-h-[70vh] md:max-h-[600px] flex flex-col">
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
            <div className="grid grid-cols-10 gap-2.5 overflow-y-auto pr-2 flex-1 min-h-0">
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
                    className={`relative h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all hover:scale-105 ${bgClass}`}
                    title={`Question ${index + 1}${isMarked ? ' (Marked for review)' : ''}`}
                  >
                    {index + 1}
                    {isMarked && (
                      <svg
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-500"
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
        className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 z-30 transition-all duration-300 ${
          showCalculator ? "md:right-[420px]" : "md:right-0"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Navigation */}
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={handlePrevious}
                disabled={session.currentQuestionIndex === 0}
                className="p-2 rounded-full border-2 border-gray-300 hover:border-black hover:bg-gray-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Previous"
              >
                <svg
                  className="w-4 h-4 text-gray-700"
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
                className="px-3 py-2 rounded-full border-2 border-gray-300 hover:border-black hover:bg-gray-100 text-xs font-bold text-gray-700 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>
                  {session.currentQuestionIndex + 1} of {questions.length}
                </span>
                <svg
                  className="w-3 h-3"
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
                  className="px-4 py-2 rounded-full border-2 border-black bg-black text-white hover:bg-gray-800 active:scale-95 text-xs font-bold transition-all"
                  title="Finish Quiz"
                >
                  FINISH
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="p-2 rounded-full border-2 border-gray-300 hover:border-black hover:bg-gray-100 active:scale-95 transition-all"
                  title="Next"
                >
                  <svg
                    className="w-4 h-4 text-gray-700"
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
              className="px-5 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 active:scale-95 rounded-xl shadow-md transition-all"
            >
              EXPLANATION
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
        className={`hidden md:block fixed top-0 right-0 w-[420px] h-screen bg-white border-l-2 border-gray-200 shadow-2xl z-40 transition-transform duration-300 ${
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
