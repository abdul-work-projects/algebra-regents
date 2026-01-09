"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { questions } from "@/lib/data";
import { QuizSession } from "@/lib/types";
import { loadSession, saveSession, createNewSession } from "@/lib/storage";
import DrawingCanvas from "@/components/DrawingCanvas";
import Timer from "@/components/Timer";

export default function QuizPage() {
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existingSession = loadSession();
    if (existingSession) {
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

  if (!mounted || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const currentQuestion = questions[session.currentQuestionIndex];
  const progress =
    ((session.currentQuestionIndex + 1) / questions.length) * 100;
  const selectedAnswer = session.userAnswers[currentQuestion.id] || null;

  const handleAnswerSelect = (answerIndex: number) => {
    // Save time spent on this question before moving
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

  const handleNext = () => {
    // Save time for current question
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
      // Quiz complete
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
      // Save time for current question
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

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="card mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
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
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Question {session.currentQuestionIndex + 1} of{" "}
                  {questions.length}
                </h1>
                <p className="text-sm text-gray-500">
                  {answeredCount} of {questions.length} answered
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Timer startTime={session.lastQuestionStartTime} />
              <button
                onClick={() =>
                  window.open("https://www.desmos.com/scientific", "_blank")
                }
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
              >
                <svg
                  className="w-5 h-5"
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
                Calculator
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Content */}
        <div className="space-y-6">
          {/* Question Image with Drawing - Full Width */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {currentQuestion.topics[0]}
              </span>
              <span className="text-sm text-gray-500">
                Draw your scratch work below
              </span>
            </div>
            <DrawingCanvas
              imageUrl={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='40%25' font-family='Arial' font-size='32' fill='%236b7280' text-anchor='middle' dominant-baseline='middle'%3EQuestion ${
                session.currentQuestionIndex + 1
              }%3C/text%3E%3Ctext x='50%25' y='52%25' font-family='Arial' font-size='18' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3EReplace with your actual question image%3C/text%3E%3Ctext x='50%25' y='62%25' font-family='Arial' font-size='16' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3E(See ADDING_QUESTIONS.md for instructions)%3C/text%3E%3C/svg%3E`}
              initialDrawing={session.drawings[currentQuestion.id]}
              onDrawingChange={handleDrawingChange}
            />
          </div>

          {/* Answer Choices and Navigation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Answer Choices */}
            <div className="lg:col-span-2">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Select your answer:
                </h2>
                <div className="space-y-3">
                  {currentQuestion.answers.map((answer, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index + 1)}
                      className={`answer-option ${
                        selectedAnswer === index + 1 ? "selected" : ""
                      }`}
                    >
                      <span className="font-medium">{answer}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div>
              <div className="card">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevious}
                    disabled={session.currentQuestionIndex === 0}
                    className="btn-outline flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {session.currentQuestionIndex === questions.length - 1 ? (
                    <button
                      onClick={handleSubmit}
                      className="btn-primary flex-1"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button onClick={handleNext} className="btn-primary flex-1">
                      Next
                    </button>
                  )}
                </div>
              </div>

              {/* Question Navigator */}
              <div className="card mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Quick Navigation
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, index) => {
                    const isAnswered =
                      session.userAnswers[q.id] !== null &&
                      session.userAnswers[q.id] !== undefined;
                    const isCurrent = index === session.currentQuestionIndex;

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
                                  (prev.questionTimes[currentQuestion.id] ||
                                    0) + timeSpent,
                              },
                            };
                          });
                        }}
                        className={`p-2 rounded text-sm font-medium transition-colors ${
                          isCurrent
                            ? "bg-blue-600 text-white"
                            : isAnswered
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
