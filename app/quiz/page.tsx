"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Question,
  QuizSession,
  TestSection,
  PassageHighlight,
} from "@/lib/types";
import {
  loadSession,
  saveSession,
  createNewSession,
  updateSkillProgress,
  loadMarkedForReview,
  toggleMarkedForReview,
} from "@/lib/storage";
import {
  fetchQuestionsForQuiz,
  fetchQuestionsForTestQuiz,
  fetchTestById,
  fetchQuestionsForSubject,
  fetchSectionsWithCounts,
} from "@/lib/supabase";
import DragOrderAnswer from "@/components/DragOrderAnswer";
import BucketOrderAnswer from "@/components/BucketOrderAnswer";
import ScrollablePassage from "@/components/ScrollablePassage";
import { seededShuffle } from "@/lib/shuffle";
import { resolveReferenceImage } from "@/lib/reference";
import FullscreenDrawingCanvas from "@/components/FullscreenDrawingCanvas";
import Timer from "@/components/Timer";
import ExplanationSlider from "@/components/ExplanationSlider";
import ReferenceImageModal from "@/components/ReferenceImageModal";
import MathText from "@/components/MathText";
import BugReportModal from "@/components/BugReport/BugReportModal";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { GraphData, DEFAULT_GRAPH_DATA } from "@/components/GraphingTool/types";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with JSXGraph
const GraphingTool = dynamic(
  () => import("@/components/GraphingTool/GraphingTool"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 flex items-center justify-center bg-gray-50 dark:bg-neutral-950 rounded-lg border border-gray-200 dark:border-neutral-700">
        <div className="text-gray-500 dark:text-neutral-400 text-sm">
          Loading graph...
        </div>
      </div>
    ),
  },
);

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredAnswer, setHoveredAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showReferenceImage, setShowReferenceImage] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [showScratchWork, setShowScratchWork] = useState(false);
  const [showGraphingTool, setShowGraphingTool] = useState(false);
  const [graphClearKey, setGraphClearKey] = useState(0);
  const [dragOrderView, setDragOrderView] = useState<"list" | "slots">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("drag-order-view") as "list" | "slots") || "list"
      );
    }
    return "list";
  });
  const [dragOrderOrientation, setDragOrderOrientation] = useState<
    "vertical" | "horizontal"
  >(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("drag-order-orientation") as
          | "vertical"
          | "horizontal") || "vertical"
      );
    }
    return "vertical";
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [testName, setTestName] = useState<string | undefined>(undefined);
  const [sections, setSections] = useState<TestSection[]>([]);

  // Practice mode - multiple questions from question bank
  const practiceMode = searchParams.get("mode");
  const isPracticeMode = practiceMode === "practice";
  const [practiceSkill, setPracticeSkill] = useState<string | null>(null);

  // Test-taking mode: "practice" (CHECK button) or "test" (no CHECK button)
  const testModeParam = searchParams.get("testMode") as 'practice' | 'test' | null;
  const testIdParam = searchParams.get("testId");
  const isTestPracticeMode = !isPracticeMode && (session?.testMode === 'practice' || testModeParam === 'practice');
  const showCheckButton = isPracticeMode || isTestPracticeMode;
  const [practiceMarkedQuestions, setPracticeMarkedQuestions] = useState<
    Set<string>
  >(new Set());

  // Drawing state for fullscreen canvas
  const [tool, setTool] = useState<"pen" | "eraser" | null>(null);
  const [penSize, setPenSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(15);
  const [penColor, setPenColor] = useState("#22c55e");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<
    Record<string, string[]>
  >({});

  const currentDrawingKey = session
    ? `fullscreen-${session.currentQuestionIndex}`
    : "";
  const currentHistory = drawingHistory[currentDrawingKey] || [];
  const canUndo = currentHistory.length > 0;

  const handleDrawingChange = (dataUrl: string) => {
    if (!session) return;
    const key = `fullscreen-${session.currentQuestionIndex}`;
    setDrawingHistory((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), dataUrl],
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
    setDrawingHistory((prev) => ({
      ...prev,
      [key]: newHistory,
    }));
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        drawings: {
          ...prev.drawings,
          [key]: newHistory.length > 0 ? newHistory[newHistory.length - 1] : "",
        },
      };
    });
  };

  const handleClear = () => {
    if (!session) return;
    const key = `fullscreen-${session.currentQuestionIndex}`;
    setDrawingHistory((prev) => ({
      ...prev,
      [key]: [],
    }));
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        drawings: {
          ...prev.drawings,
          [key]: "",
        },
      };
    });
  };

  useEffect(() => {
    setMounted(true);

    // Load marked for review questions for practice mode
    const markedQuestions = loadMarkedForReview();
    setPracticeMarkedQuestions(markedQuestions);

    const testIdFromUrl = searchParams.get("testId");
    const testModeFromUrl = searchParams.get("testMode") as 'practice' | 'test' | null;
    const practiceModeFromUrl = searchParams.get("mode");
    const skillFilter = searchParams.get("skill");
    const subjectFilter = searchParams.get("subject");
    const tagsFilter = searchParams.get("tags"); // Comma-separated tags
    const difficultyFilter = searchParams.get("difficulty"); // Single difficulty (legacy)
    const difficultiesFilter = searchParams.get("difficulties"); // Comma-separated difficulties (new)
    const existingSession = loadSession();

    // If testId is present but no testMode and no existing session with testMode,
    // show mode selection screen instead of loading the quiz
    if (testIdFromUrl && !testModeFromUrl && practiceModeFromUrl !== "practice") {
      const hasExistingTestMode = existingSession?.testId === testIdFromUrl && existingSession?.testMode;
      if (!hasExistingTestMode) {
        setIsLoadingQuestions(false);
        return;
      }
    }

    async function loadQuestionsAndSession() {
      try {
        // Practice mode - questions filtered by skill, subject, tags, or difficulty
        if (practiceModeFromUrl === "practice") {
          let filteredQuestions: Question[];

          // If subject is provided, fetch questions for that subject only
          if (subjectFilter) {
            filteredQuestions = await fetchQuestionsForSubject(subjectFilter);
          } else {
            // Fallback to all questions
            filteredQuestions = await fetchQuestionsForQuiz();
          }

          // Further filter by skill if provided
          if (skillFilter) {
            filteredQuestions = filteredQuestions.filter((q) =>
              q.skills.includes(skillFilter),
            );
            setPracticeSkill(skillFilter);
          }

          // Filter by tags if provided (match any)
          if (tagsFilter) {
            const tagsToMatch = tagsFilter.split(",").map((t) => t.trim());
            filteredQuestions = filteredQuestions.filter(
              (q) => q.tags && q.tags.some((tag) => tagsToMatch.includes(tag)),
            );
          }

          // Filter by difficulties if provided (multi-select)
          if (difficultiesFilter) {
            const difficultiesToMatch = difficultiesFilter
              .split(",")
              .map((d) => d.trim());
            filteredQuestions = filteredQuestions.filter(
              (q) => q.difficulty && difficultiesToMatch.includes(q.difficulty),
            );
          } else if (difficultyFilter && difficultyFilter !== "all") {
            // Legacy single difficulty filter
            filteredQuestions = filteredQuestions.filter(
              (q) => q.difficulty === difficultyFilter,
            );
          }

          if (filteredQuestions.length === 0) {
            // No questions match filter, redirect to home
            router.push("/dashboard");
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
            // Load sections for this test
            const testSections = await fetchSectionsWithCounts(testId);
            if (testSections.length > 0) {
              setSections(testSections);
            }
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
          // Add dragOrderAnswers if it doesn't exist (backward compatibility)
          if (!existingSession.dragOrderAnswers) {
            existingSession.dragOrderAnswers = {};
          }
          // Add passageHighlights if it doesn't exist (backward compatibility)
          if (!existingSession.passageHighlights) {
            existingSession.passageHighlights = {};
          }
          // Add currentSectionIndex if it doesn't exist (backward compatibility)
          if (existingSession.currentSectionIndex === undefined) {
            existingSession.currentSectionIndex = 0;
          }
          // Add testMode from URL if session doesn't have it (backward compatibility)
          if (!existingSession.testMode && testModeFromUrl) {
            existingSession.testMode = testModeFromUrl;
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
          const newSession = createNewSession(testId || undefined, testModeFromUrl || undefined);
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

  // Mode selection screen: testId present but no testMode chosen yet
  if (mounted && !isLoadingQuestions && testIdParam && !testModeParam && !isPracticeMode && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 px-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mb-2">
              Choose Your Mode
            </h1>
            <p className="text-gray-500 dark:text-neutral-400 text-sm">
              How would you like to take this test?
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => router.replace(`/quiz?testId=${testIdParam}&testMode=practice`)}
              className="w-full text-left p-5 rounded-xl border-2 border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-lg font-bold text-gray-900 dark:text-neutral-100 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">Practice Mode</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">Recommended</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                Check your answers as you go and get a second attempt if wrong.
              </p>
            </button>
            <button
              onClick={() => router.replace(`/quiz?testId=${testIdParam}&testMode=test`)}
              className="w-full text-left p-5 rounded-xl border-2 border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-lg font-bold text-gray-900 dark:text-neutral-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">Test Mode</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                No checking — your first answer is final, just like the real exam.
              </p>
            </button>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full text-center text-sm text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!mounted || !session || isLoadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-gray-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100 mb-2">
            No questions available
          </h2>
          <p className="text-gray-600 dark:text-neutral-400 mb-4">
            Please add questions using the admin panel.
          </p>
          <button onClick={() => router.push("/dashboard")} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[session.currentQuestionIndex];

  // Determine current section (if sections exist)
  const currentSection =
    sections.length > 0 && currentQuestion.sectionId
      ? sections.find((s) => s.id === currentQuestion.sectionId)
      : undefined;

  // Find grouped question pair (questions sharing the same passageId)
  const siblingQuestion = currentQuestion.passageId
    ? questions.find(
        (q) =>
          q.id !== currentQuestion.id &&
          q.passageId === currentQuestion.passageId,
      )
    : null;
  const isGroupedQuestion = !!siblingQuestion;

  // Debug logging for grouped questions
  if (currentQuestion.passageId) {
    console.log("Grouped question detected:", {
      currentId: currentQuestion.id,
      passageId: currentQuestion.passageId,
      hasPassage: !!currentQuestion.passage,
      siblingFound: !!siblingQuestion,
      siblingId: siblingQuestion?.id,
    });
  }

  // For grouped questions, determine which question comes first
  const currentQuestionIdx = questions.findIndex(
    (q) => q.id === currentQuestion.id,
  );
  const siblingQuestionIdx = siblingQuestion
    ? questions.findIndex((q) => q.id === siblingQuestion.id)
    : -1;
  const isFirstInGroup = siblingQuestionIdx > currentQuestionIdx;

  // The two questions to display (in order)
  const question1 = isFirstInGroup ? currentQuestion : siblingQuestion;
  const question2 = isFirstInGroup ? siblingQuestion : currentQuestion;

  const progress =
    ((session.currentQuestionIndex + 1) / questions.length) * 100;
  const selectedAnswer = session.userAnswers[currentQuestion.id] || null;
  const checkedAnswers = session.checkedAnswers[currentQuestion.id] || [];
  const isMarkedForReview = isPracticeMode
    ? practiceMarkedQuestions.has(currentQuestion.id)
    : session.markedForReview[currentQuestion.id] || false;

  // For grouped questions, also track the sibling's answers
  const siblingSelectedAnswer = siblingQuestion
    ? session.userAnswers[siblingQuestion.id] || null
    : null;
  const siblingCheckedAnswers = siblingQuestion
    ? session.checkedAnswers[siblingQuestion.id] || []
    : [];

  const handleAnswerSelect = (answerIndex: number) => {
    const timeSpent = Math.floor(
      (Date.now() - session.lastQuestionStartTime) / 1000,
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

  // Generic handlers for grouped questions that take question as parameter
  const handleAnswerSelectForQuestion = (
    question: Question,
    answerIndex: number,
  ) => {
    const timeSpent = Math.floor(
      (Date.now() - session.lastQuestionStartTime) / 1000,
    );

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        userAnswers: {
          ...prev.userAnswers,
          [question.id]: answerIndex,
        },
        questionTimes: {
          ...prev.questionTimes,
          [question.id]: (prev.questionTimes[question.id] || 0) + timeSpent,
        },
      };
    });
  };

  const handleCheckAnswerForQuestion = (
    question: Question,
    answerIndex: number,
  ) => {
    const isCorrect = answerIndex === question.correctAnswer;

    if (isPracticeMode && practiceSkill) {
      updateSkillProgress(practiceSkill, question.id, isCorrect);
    }

    setSession((prev) => {
      if (!prev) return prev;
      const currentChecked = prev.checkedAnswers[question.id] || [];

      if (currentChecked.length >= 1) return prev;

      return {
        ...prev,
        checkedAnswers: {
          ...prev.checkedAnswers,
          [question.id]: [answerIndex],
        },
        firstAttemptAnswers: {
          ...prev.firstAttemptAnswers,
          [question.id]: answerIndex,
        },
      };
    });
  };

  // Drag-order question handlers
  const handleDragOrderChange = (questionId: string, newOrder: string[]) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dragOrderAnswers: {
          ...prev.dragOrderAnswers,
          [questionId]: newOrder,
        },
      };
    });
  };

  const handleDragOrderCheck = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const studentOrder = session.dragOrderAnswers[questionId] || [];
    const isCorrect =
      JSON.stringify(studentOrder) === JSON.stringify(question.answers);

    if (isPracticeMode && practiceSkill) {
      updateSkillProgress(practiceSkill, questionId, isCorrect);
    }

    setSession((prev) => {
      if (!prev) return prev;
      const currentChecked = prev.checkedAnswers[questionId] || [];
      if (currentChecked.length >= 1) return prev;

      return {
        ...prev,
        checkedAnswers: {
          ...prev.checkedAnswers,
          [questionId]: [isCorrect ? 1 : 0], // Use 1/0 as placeholder for drag-order
        },
      };
    });
  };

  // Passage highlight handlers
  const handleHighlightAdd = (
    passageId: string,
    highlight: PassageHighlight,
  ) => {
    setSession((prev) => {
      if (!prev) return prev;
      const existing = prev.passageHighlights[passageId] || [];
      return {
        ...prev,
        passageHighlights: {
          ...prev.passageHighlights,
          [passageId]: [...existing, highlight],
        },
      };
    });
  };

  const handleHighlightRemove = (passageId: string, highlightId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const existing = prev.passageHighlights[passageId] || [];
      return {
        ...prev,
        passageHighlights: {
          ...prev.passageHighlights,
          [passageId]: existing.filter((h) => h.id !== highlightId),
        },
      };
    });
  };

  const handleNoteAdd = (
    passageId: string,
    highlightId: string,
    note: string,
  ) => {
    setSession((prev) => {
      if (!prev) return prev;
      const existing = prev.passageHighlights[passageId] || [];
      return {
        ...prev,
        passageHighlights: {
          ...prev.passageHighlights,
          [passageId]: existing.map((h) =>
            h.id === highlightId ? { ...h, note } : h,
          ),
        },
      };
    });
  };

  const handleNext = () => {
    const timeSpent = Math.floor(
      (Date.now() - session.lastQuestionStartTime) / 1000,
    );

    // For grouped questions, skip the sibling (we show both together)
    const skipCount = isGroupedQuestion && isFirstInGroup ? 2 : 1;
    const nextIndex = session.currentQuestionIndex + skipCount;

    if (nextIndex < questions.length) {
      setSession((prev) => {
        if (!prev) return prev;
        const newTimes = { ...prev.questionTimes };
        // Split time equally between grouped questions
        const perQuestionTime = siblingQuestion
          ? Math.round(timeSpent / 2)
          : timeSpent;
        newTimes[currentQuestion.id] =
          (newTimes[currentQuestion.id] || 0) + perQuestionTime;
        if (siblingQuestion) {
          newTimes[siblingQuestion.id] =
            (newTimes[siblingQuestion.id] || 0) + perQuestionTime;
        }
        return {
          ...prev,
          currentQuestionIndex: nextIndex,
          lastQuestionStartTime: Date.now(),
          questionTimes: newTimes,
        };
      });
    } else {
      // Last question(s)
      setSession((prev) => {
        if (!prev) return prev;
        const newTimes = { ...prev.questionTimes };
        const perQuestionTime = siblingQuestion
          ? Math.round(timeSpent / 2)
          : timeSpent;
        newTimes[currentQuestion.id] =
          (newTimes[currentQuestion.id] || 0) + perQuestionTime;
        if (siblingQuestion) {
          newTimes[siblingQuestion.id] =
            (newTimes[siblingQuestion.id] || 0) + perQuestionTime;
        }
        return {
          ...prev,
          questionTimes: newTimes,
        };
      });
      // In practice mode, go back to question bank; in test mode, go to results
      if (isPracticeMode) {
        router.push("/dashboard?tab=question-bank");
      } else {
        router.push("/results");
      }
    }
  };

  const handlePrevious = () => {
    if (session.currentQuestionIndex > 0) {
      const timeSpent = Math.floor(
        (Date.now() - session.lastQuestionStartTime) / 1000,
      );

      // Check if the previous question is part of a group we need to jump over
      const prevIndex = session.currentQuestionIndex - 1;
      const prevQuestion = questions[prevIndex];
      const prevSibling = prevQuestion?.passageId
        ? questions.find(
            (q) =>
              q.id !== prevQuestion.id &&
              q.passageId === prevQuestion.passageId,
          )
        : null;
      const prevSiblingIdx = prevSibling
        ? questions.findIndex((q) => q.id === prevSibling.id)
        : -1;

      // If prev question has a sibling that comes before it, jump to that sibling
      const targetIndex =
        prevSibling && prevSiblingIdx < prevIndex ? prevSiblingIdx : prevIndex;

      setSession((prev) => {
        if (!prev) return prev;
        const newTimes = { ...prev.questionTimes };
        const perQuestionTime = siblingQuestion
          ? Math.round(timeSpent / 2)
          : timeSpent;
        newTimes[currentQuestion.id] =
          (newTimes[currentQuestion.id] || 0) + perQuestionTime;
        if (siblingQuestion) {
          newTimes[siblingQuestion.id] =
            (newTimes[siblingQuestion.id] || 0) + perQuestionTime;
        }
        return {
          ...prev,
          currentQuestionIndex: targetIndex,
          lastQuestionStartTime: Date.now(),
          questionTimes: newTimes,
        };
      });
    }
  };

  const handleToggleMarkForReview = () => {
    if (isPracticeMode) {
      // Use persistent storage for practice mode
      const isNowMarked = toggleMarkedForReview(currentQuestion.id);
      // Also toggle sibling question if grouped
      if (siblingQuestion) {
        toggleMarkedForReview(siblingQuestion.id);
      }
      setPracticeMarkedQuestions((prev) => {
        const newSet = new Set(prev);
        if (isNowMarked) {
          newSet.add(currentQuestion.id);
          if (siblingQuestion) newSet.add(siblingQuestion.id);
        } else {
          newSet.delete(currentQuestion.id);
          if (siblingQuestion) newSet.delete(siblingQuestion.id);
        }
        return newSet;
      });
    } else {
      // Use session storage for test mode
      setSession((prev) => {
        if (!prev) return prev;
        const newMarkedValue = !prev.markedForReview[currentQuestion.id];
        const newMarkedForReview = {
          ...prev.markedForReview,
          [currentQuestion.id]: newMarkedValue,
        };
        // Also mark sibling question if grouped
        if (siblingQuestion) {
          newMarkedForReview[siblingQuestion.id] = newMarkedValue;
        }
        return {
          ...prev,
          markedForReview: newMarkedForReview,
        };
      });
    }
  };

  const handleSubmit = () => {
    if (
      window.confirm(
        "Are you sure you want to submit your quiz? You can review your answers before submitting.",
      )
    ) {
      router.push("/results");
    }
  };

  const answeredCount =
    Object.keys(session.userAnswers).filter(
      (key) => session.userAnswers[key] !== null,
    ).length +
    Object.keys(session.dragOrderAnswers).filter(
      (key) => session.dragOrderAnswers[key]?.length > 0,
    ).length;

  const isCorrect =
    checkedAnswers.length > 0 &&
    checkedAnswers.includes(currentQuestion.correctAnswer);
  const attemptsUsed = checkedAnswers.length;
  const maxAttempts = 1;
  const canAttempt = !isCorrect && attemptsUsed < maxAttempts;
  const hasChecked = attemptsUsed > 0;

  // Drag-order specific state
  const isDragOrder = currentQuestion.questionType === "drag-order";
  const dragOrderAnswer = session.dragOrderAnswers[currentQuestion.id] || [];
  const dragOrderChecked = isDragOrder && checkedAnswers.length > 0;
  const dragOrderCorrect =
    isDragOrder &&
    dragOrderChecked &&
    JSON.stringify(dragOrderAnswer) === JSON.stringify(currentQuestion.answers);

  return (
    <>
      <div
        className={`min-h-screen pb-16 transition-all duration-300 relative ${
          showCalculator ? "md:mr-[420px]" : ""
        }`}
        style={{ backgroundColor: "transparent", pointerEvents: "none" }}
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
        <div
          className="sticky top-0 z-[200] bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800"
          style={{ pointerEvents: "auto" }}
        >
          {!isPracticeMode && (
            <div className="relative h-2 bg-gray-200 dark:bg-neutral-800">
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
                  router.push("/dashboard?tab=question-bank");
                } else if (
                  window.confirm(
                    "Are you sure you want to exit? Your progress will be saved.",
                  )
                ) {
                  router.push("/dashboard");
                }
              }}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
              title={isPracticeMode ? "Back to Question Bank" : "Exit"}
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-neutral-400"
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

            {/* Test/Practice Name */}
            {isPracticeMode ? (
              <span className="text-sm font-bold text-gray-700 dark:text-neutral-300 truncate max-w-[200px] md:max-w-none">
                {practiceSkill ? practiceSkill : "Practice"} ({questions.length}{" "}
                questions)
              </span>
            ) : (
              <span className="text-sm font-bold text-gray-700 dark:text-neutral-300 truncate max-w-[200px] md:max-w-none flex items-center gap-2">
                {testName || "Quiz"}
                {session.testMode && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    session.testMode === 'practice'
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                      : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                  }`}>
                    {session.testMode === 'practice' ? 'PRACTICE' : 'TEST'}
                  </span>
                )}
              </span>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowReferenceImage(true)}
                className="flex flex-col items-center gap-0.5 hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all rounded-lg p-1"
                title="Reference Sheet"
              >
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-neutral-400"
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
                <span className="text-[9px] font-medium text-gray-600 dark:text-neutral-400">
                  Reference
                </span>
              </button>

              <button
                onClick={() => setShowGraphingTool(!showGraphingTool)}
                className={`flex flex-col items-center gap-0.5 active:scale-95 transition-all rounded-lg p-1 ${
                  showGraphingTool
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : session.graphs?.[currentQuestion.id]
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400"
                }`}
                title="Graphing Tool"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3v18h18"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 14l4-4 4 4 5-5"
                  />
                </svg>
                <span className="text-[9px] font-medium">Graph</span>
              </button>

              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="flex flex-col items-center gap-0.5 hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all rounded-lg p-1"
                title="Calculator"
              >
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-neutral-400"
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
                <span className="text-[9px] font-medium text-gray-600 dark:text-neutral-400">
                  Calculator
                </span>
              </button>

              <ThemeToggle />

              <Timer startTime={session.lastQuestionStartTime} />
            </div>
          </div>
        </div>

        <div
          className={`mx-auto pt-4 ${isGroupedQuestion ? "max-w-6xl px-2" : "max-w-3xl px-4"}`}
          style={{ pointerEvents: "auto" }}
        >
          {/* Question Number and Topic Badges Row */}
          <div
            className="mb-4 flex items-center gap-2 flex-wrap relative"
            style={{
              zIndex: 100,
              transform: "translateZ(0)",
              pointerEvents: "none",
            }}
          >
            {/* Question Number Badge + Section Tag */}
            <div
              className="flex items-center gap-2"
              style={{ pointerEvents: "auto" }}
            >
              <span className="inline-block text-sm font-bold px-4 py-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black">
                {isGroupedQuestion
                  ? `Questions ${Math.min(currentQuestionIdx, siblingQuestionIdx) + 1}-${Math.max(currentQuestionIdx, siblingQuestionIdx) + 1}`
                  : `Question ${session.currentQuestionIndex + 1}`}
              </span>
              {currentSection && (
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                  {currentSection.name}
                </span>
              )}

              {/* Mark for Review Button */}
              <button
                onClick={handleToggleMarkForReview}
                className={`px-3 py-1.5 rounded-full border-2 active:scale-95 transition-all flex items-center gap-1.5 ${
                  isMarkedForReview
                    ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 hover:border-yellow-500 dark:hover:border-yellow-500"
                    : "border-gray-300 dark:border-neutral-600 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800"
                }`}
                title={
                  isMarkedForReview ? "Unmark for review" : "Mark for review"
                }
              >
                <svg
                  className={`w-4 h-4 ${
                    isMarkedForReview
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-gray-700 dark:text-neutral-300"
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
                <span
                  className={`text-xs font-medium ${
                    isMarkedForReview
                      ? "text-yellow-700 dark:text-yellow-400"
                      : "text-gray-700 dark:text-neutral-300"
                  }`}
                >
                  Mark for Review
                </span>
              </button>

              {/* Report Bug Button */}
              <button
                onClick={() => setShowBugReport(true)}
                className="px-3 py-1.5 rounded-full border-2 border-gray-300 dark:border-neutral-600 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all flex items-center gap-1.5"
                title="Report an issue with this question"
              >
                <svg
                  className="w-4 h-4 text-gray-600 dark:text-neutral-400"
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
                <span className="text-xs font-medium text-gray-700 dark:text-neutral-300">
                  Report
                </span>
              </button>
            </div>

            {/* Skill Badges */}
            {currentQuestion.skills && currentQuestion.skills.length > 0 && (
              <>
                {currentQuestion.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700"
                  >
                    {skill}
                  </span>
                ))}
              </>
            )}
          </div>

          {/* Drawing Toolbar - Compact Single Row */}
          <div
            className="flex items-center gap-2 mb-8 relative"
            style={{
              zIndex: 100,
              transform: "translateZ(0)",
              pointerEvents: "none",
            }}
          >
            {/* Pen Tool with Color Picker */}
            <div className="relative" style={{ pointerEvents: "auto" }}>
              <button
                onClick={() => {
                  if (tool === "pen") {
                    setTool(null);
                    setShowColorPicker(false);
                  } else {
                    setTool("pen");
                  }
                }}
                className={`relative p-1.5 rounded-lg border-2 transition-all active:scale-95 ${
                  tool === "pen"
                    ? "border-2 shadow-sm"
                    : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800"
                }`}
                style={
                  tool === "pen"
                    ? {
                        backgroundColor: penColor,
                        borderColor: theme === "dark" ? "#525252" : penColor,
                        color: [
                          "#000000",
                          "#3b82f6",
                          "#a855f7",
                          "#ef4444",
                        ].includes(penColor)
                          ? "#ffffff"
                          : "#000000",
                      }
                    : {}
                }
                title="Pen"
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
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>

              {/* Color picker arrow - overlaid on bottom-right corner of pen button */}
              {tool === "pen" && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColorPicker(!showColorPicker);
                  }}
                  className="absolute bottom-0 right-0 cursor-pointer rounded-br-md"
                  title="Change color"
                  style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderBottom: `12px solid ${theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}` }}
                />
              )}

              {/* Color Picker Popup */}
              {showColorPicker && tool === "pen" && (
                <>
                  <div
                    className="fixed inset-0 z-[110]"
                    onClick={() => setShowColorPicker(false)}
                  />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl p-1.5 z-[120]">
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-neutral-900 border-r-2 border-b-2 border-gray-200 dark:border-neutral-600 rotate-45" />
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: "Green", value: "#22c55e" },
                        { name: "Blue", value: "#3b82f6" },
                        { name: "Red", value: "#ef4444" },
                        { name: "Yellow", value: "#eab308" },
                        { name: "Purple", value: "#a855f7" },
                        theme === "dark"
                          ? { name: "White", value: "#ffffff" }
                          : { name: "Black", value: "#000000" },
                      ].map((color) => (
                        <button
                          key={color.value}
                          onClick={() => {
                            setPenColor(color.value);
                            setShowColorPicker(false);
                          }}
                          className={`w-7 h-7 rounded-md transition-all hover:scale-110 active:scale-95 ${
                            penColor === color.value
                              ? "ring-2 ring-black dark:ring-white ring-offset-1 dark:ring-offset-neutral-800"
                              : "border-2 border-gray-300 dark:border-neutral-600"
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
            <div style={{ pointerEvents: "auto" }}>
              <button
                onClick={() => setTool(tool === "eraser" ? null : "eraser")}
                className={`p-1.5 rounded-lg border-2 transition-all active:scale-95 ${
                  tool === "eraser"
                    ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                    : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800"
                }`}
                title="Eraser"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.24,3.56L21.19,8.5C21.97,9.29 21.97,10.55 21.19,11.34L12,20.53C10.44,22.09 7.91,22.09 6.34,20.53L2.81,17C2.03,16.21 2.03,14.95 2.81,14.16L13.41,3.56C14.2,2.78 15.46,2.78 16.24,3.56M4.22,15.58L7.76,19.11C8.54,19.9 9.8,19.9 10.59,19.11L14.12,15.58L9.17,10.63L4.22,15.58Z" />
                </svg>
              </button>
            </div>

            {/* Clear Button */}
            <div style={{ pointerEvents: "auto" }}>
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg border-2 border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 active:scale-95 transition-all"
                title="Clear all"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z" />
                </svg>
              </button>
            </div>

            {/* Size Buttons - only show when a tool is active */}
            {tool && (
              <div
                className="flex items-center gap-1.5"
                style={{ pointerEvents: "auto" }}
              >
                {tool === "pen" ? (
                  <>
                    {[2, 6].map((size) => (
                      <button
                        key={size}
                        onClick={() => setPenSize(size)}
                        className={`px-2 py-1 rounded-lg border-2 text-xs font-medium transition-all active:scale-95 ${
                          penSize === size
                            ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                            : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {size === 2 ? "S" : "L"}
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
                            ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                            : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {size === 15 ? "S" : "L"}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            <div className="flex-1" />

            {/* Undo Button */}
            <div style={{ pointerEvents: "auto" }}>
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg border-2 border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                title="Undo"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z" />
                </svg>
              </button>
            </div>
          </div>

          {/* GROUPED QUESTIONS LAYOUT */}
          {isGroupedQuestion && question1 && question2 ? (
            <>
              {/* Passage Image (drawable — stays under canvas) */}
              {currentQuestion.passage?.passageImageUrl && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                    Passage
                  </div>
                  <img
                    src={currentQuestion.passage.passageImageUrl}
                    alt="Passage"
                    className="w-full h-auto object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Passage Text (above canvas — scrollable with annotation tools) */}
              {currentQuestion.passage?.passageText && (
                <div
                  className="mb-4 relative"
                  style={{ zIndex: 60, pointerEvents: "auto" }}
                >
                  {!currentQuestion.passage.passageImageUrl && (
                    <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                      Passage
                    </div>
                  )}
                  <ScrollablePassage
                    passage={currentQuestion.passage}
                    highlights={
                      session.passageHighlights[currentQuestion.passage.id] ||
                      []
                    }
                    onHighlightAdd={(highlight) =>
                      handleHighlightAdd(currentQuestion.passage!.id, highlight)
                    }
                    onHighlightRemove={(highlightId) =>
                      handleHighlightRemove(
                        currentQuestion.passage!.id,
                        highlightId,
                      )
                    }
                    onNoteAdd={(highlightId, note) =>
                      handleNoteAdd(
                        currentQuestion.passage!.id,
                        highlightId,
                        note,
                      )
                    }
                  />
                </div>
              )}

              {/* Embedded Graphing Tool for grouped questions - below passage */}
              {showGraphingTool && (
                <div
                  className="mb-4 border-2 border-blue-200 dark:border-blue-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 max-w-md mx-auto relative"
                  style={{
                    zIndex: 100,
                    pointerEvents: "auto",
                    transform: "translateZ(0)",
                  }}
                >
                  <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      Graph
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSession((prev) => {
                            if (!prev) return prev;
                            const newGraphs = { ...prev.graphs };
                            delete newGraphs[currentQuestion.id];
                            return { ...prev, graphs: newGraphs };
                          });
                          setGraphClearKey((prev) => prev + 1);
                        }}
                        className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all"
                        title="Clear graph"
                      >
                        <svg
                          className="w-4 h-4 text-red-500 dark:text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowGraphingTool(false)}
                        className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="Close graph"
                      >
                        <svg
                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
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
                  </div>
                  <div style={{ height: "380px" }}>
                    <GraphingTool
                      key={`grouped-${currentQuestion.id}-${graphClearKey}`}
                      initialData={
                        session.graphs?.[currentQuestion.id] ||
                        DEFAULT_GRAPH_DATA
                      }
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

              {/* Two questions side by side */}
              <div className="grid grid-cols-2 gap-0 mb-6">
                {/* Question 1 */}
                <div className="pr-4 border-r-2 border-dashed border-gray-300 dark:border-neutral-600 flex flex-col">
                  <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 mb-2">
                    Q{questions.findIndex((q) => q.id === question1.id) + 1}
                  </div>
                  {/* Q1 Question Card */}
                  {(question1.imageFilename ||
                    question1.questionText ||
                    question1.aboveImageText) && (
                    <div className="mb-3">
                      {question1.aboveImageText && (
                        <div
                          className="mb-2"
                          style={{
                            fontFamily: "'Times New Roman', Times, serif",
                            fontSize: "1rem",
                          }}
                        >
                          <MathText
                            text={question1.aboveImageText}
                            className="leading-relaxed dark:text-neutral-200"
                          />
                        </div>
                      )}
                      {question1.imageFilename && (
                        <div className="w-full">
                          <img
                            src={question1.imageFilename}
                            alt="Question"
                            className={`w-full h-auto object-contain rounded-lg ${question1.imageSize === 'small' ? 'max-h-32' : question1.imageSize === 'medium' ? 'max-h-48' : 'max-h-48'}`}
                          />
                        </div>
                      )}
                      {question1.questionText && (
                        <div
                          className={question1.imageFilename ? "mt-2" : ""}
                          style={{
                            fontFamily: "'Times New Roman', Times, serif",
                            fontSize: "1rem",
                          }}
                        >
                          <MathText
                            text={question1.questionText}
                            className="leading-relaxed dark:text-neutral-200"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Q1 Answers */}
                  <div
                    className="space-y-2 relative z-[60] mt-auto"
                    style={{ pointerEvents: "auto" }}
                  >
                    {question1.answers.map((answer, index) => {
                      const answerNum = index + 1;
                      const q1Selected =
                        session.userAnswers[question1.id] || null;
                      const q1Checked =
                        session.checkedAnswers[question1.id] || [];
                      const isChecked = q1Checked.includes(answerNum);
                      const isCorrectAnswer =
                        answerNum === question1.correctAnswer;
                      const isSelected = q1Selected === answerNum;
                      const q1CanAttempt = q1Checked.length < 1;

                      let btnClass =
                        "w-full px-3 py-2 text-left rounded-lg border-2 transition-all duration-200 font-medium active:scale-[0.98] text-sm";
                      if (isChecked) {
                        btnClass += isCorrectAnswer
                          ? " bg-green-50 dark:bg-green-900/30 border-black dark:border-green-500 text-green-900 dark:text-green-300"
                          : " bg-rose-50 dark:bg-rose-900/30 border-rose-500 text-rose-900 dark:text-rose-300";
                      } else if (isSelected) {
                        btnClass +=
                          " bg-sky-50 dark:bg-sky-900/30 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-300";
                      } else {
                        btnClass +=
                          " bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800";
                      }

                      return (
                        <div key={index} className="relative">
                          <button
                            onClick={() =>
                              handleAnswerSelectForQuestion(
                                question1,
                                answerNum,
                              )
                            }
                            className={btnClass}
                          >
                            <div
                              className="flex items-start gap-2"
                              style={{
                                fontFamily: "'Times New Roman', Times, serif",
                              }}
                            >
                              <span className="font-bold shrink-0">
                                ({answerNum})
                              </span>
                              <div className="flex-1 min-w-0">
                                {answer && (
                                  <MathText
                                    text={answer}
                                    className="text-left"
                                  />
                                )}
                                {question1.answerImageUrls?.[index] && (
                                  <img
                                    src={question1.answerImageUrls[index]}
                                    alt={`Answer ${answerNum}`}
                                    className="max-w-full h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
                                  />
                                )}
                              </div>
                            </div>
                          </button>
                          {showCheckButton && isSelected && !isChecked && q1CanAttempt && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckAnswerForQuestion(
                                  question1,
                                  answerNum,
                                );
                              }}
                              className="absolute right-2 top-2 px-2 py-1 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-black text-xs font-bold rounded-lg shadow-md transition-all"
                            >
                              CHECK
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Question 2 */}
                <div className="pl-4 flex flex-col">
                  <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 mb-2">
                    Q{questions.findIndex((q) => q.id === question2.id) + 1}
                  </div>
                  {/* Q2 Question Card */}
                  {(question2.imageFilename ||
                    question2.questionText ||
                    question2.aboveImageText) && (
                    <div className="mb-3">
                      {question2.aboveImageText && (
                        <div
                          className="mb-2"
                          style={{
                            fontFamily: "'Times New Roman', Times, serif",
                            fontSize: "1rem",
                          }}
                        >
                          <MathText
                            text={question2.aboveImageText}
                            className="leading-relaxed dark:text-neutral-200"
                          />
                        </div>
                      )}
                      {question2.imageFilename && (
                        <div className="w-full">
                          <img
                            src={question2.imageFilename}
                            alt="Question"
                            className={`w-full h-auto object-contain rounded-lg ${question2.imageSize === 'small' ? 'max-h-32' : question2.imageSize === 'medium' ? 'max-h-48' : 'max-h-48'}`}
                          />
                        </div>
                      )}
                      {question2.questionText && (
                        <div
                          className={question2.imageFilename ? "mt-2" : ""}
                          style={{
                            fontFamily: "'Times New Roman', Times, serif",
                            fontSize: "1rem",
                          }}
                        >
                          <MathText
                            text={question2.questionText}
                            className="leading-relaxed dark:text-neutral-200"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Q2 Answers */}
                  <div
                    className="space-y-2 relative z-[60] mt-auto"
                    style={{ pointerEvents: "auto" }}
                  >
                    {question2.answers.map((answer, index) => {
                      const answerNum = index + 1;
                      const q2Selected =
                        session.userAnswers[question2.id] || null;
                      const q2Checked =
                        session.checkedAnswers[question2.id] || [];
                      const isChecked = q2Checked.includes(answerNum);
                      const isCorrectAnswer =
                        answerNum === question2.correctAnswer;
                      const isSelected = q2Selected === answerNum;
                      const q2CanAttempt = q2Checked.length < 1;

                      let btnClass =
                        "w-full px-3 py-2 text-left rounded-lg border-2 transition-all duration-200 font-medium active:scale-[0.98] text-sm";
                      if (isChecked) {
                        btnClass += isCorrectAnswer
                          ? " bg-green-50 dark:bg-green-900/30 border-black dark:border-green-500 text-green-900 dark:text-green-300"
                          : " bg-rose-50 dark:bg-rose-900/30 border-rose-500 text-rose-900 dark:text-rose-300";
                      } else if (isSelected) {
                        btnClass +=
                          " bg-sky-50 dark:bg-sky-900/30 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-300";
                      } else {
                        btnClass +=
                          " bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800";
                      }

                      return (
                        <div key={index} className="relative">
                          <button
                            onClick={() =>
                              handleAnswerSelectForQuestion(
                                question2,
                                answerNum,
                              )
                            }
                            className={btnClass}
                          >
                            <div
                              className="flex items-start gap-2"
                              style={{
                                fontFamily: "'Times New Roman', Times, serif",
                              }}
                            >
                              <span className="font-bold shrink-0">
                                ({answerNum})
                              </span>
                              <div className="flex-1 min-w-0">
                                {answer && (
                                  <MathText
                                    text={answer}
                                    className="text-left"
                                  />
                                )}
                                {question2.answerImageUrls?.[index] && (
                                  <img
                                    src={question2.answerImageUrls[index]}
                                    alt={`Answer ${answerNum}`}
                                    className="max-w-full h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
                                  />
                                )}
                              </div>
                            </div>
                          </button>
                          {showCheckButton && isSelected && !isChecked && q2CanAttempt && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckAnswerForQuestion(
                                  question2,
                                  answerNum,
                                );
                              }}
                              className="absolute right-2 top-2 px-2 py-1 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-black text-xs font-bold rounded-lg shadow-md transition-all"
                            >
                              CHECK
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* SINGLE QUESTION LAYOUT (original) */}
              {/* Passage Image (drawable — stays under canvas) */}
              {currentQuestion.passage?.passageImageUrl && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                    Passage
                  </div>
                  <img
                    src={currentQuestion.passage.passageImageUrl}
                    alt="Passage"
                    className="w-full h-auto object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Passage Text (above canvas — scrollable with annotation tools) */}
              {currentQuestion.passage?.passageText && (
                <div
                  className="mb-4 relative"
                  style={{ zIndex: 60, pointerEvents: "auto" }}
                >
                  {!currentQuestion.passage.passageImageUrl && (
                    <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                      Passage
                    </div>
                  )}
                  <ScrollablePassage
                    passage={currentQuestion.passage}
                    highlights={
                      session.passageHighlights[currentQuestion.passage.id] ||
                      []
                    }
                    onHighlightAdd={(highlight) =>
                      handleHighlightAdd(currentQuestion.passage!.id, highlight)
                    }
                    onHighlightRemove={(highlightId) =>
                      handleHighlightRemove(
                        currentQuestion.passage!.id,
                        highlightId,
                      )
                    }
                    onNoteAdd={(highlightId, note) =>
                      handleNoteAdd(
                        currentQuestion.passage!.id,
                        highlightId,
                        note,
                      )
                    }
                  />
                </div>
              )}

              {/* Question Card - Above Image Text, Image, and/or Question Text */}
              {(currentQuestion.imageFilename ||
                currentQuestion.questionText ||
                currentQuestion.aboveImageText) && (
                <div className="mb-3">
                  {currentQuestion.aboveImageText && (
                    <div
                      className="mb-2"
                      style={{
                        fontFamily: "'Times New Roman', Times, serif",
                        fontSize: "1.125rem",
                      }}
                    >
                      <MathText
                        text={currentQuestion.aboveImageText}
                        className="leading-relaxed dark:text-neutral-200"
                      />
                    </div>
                  )}
                  {currentQuestion.imageFilename && (
                    <div className="w-full">
                      <img
                        src={currentQuestion.imageFilename}
                        alt="Question"
                        className={`w-full h-auto object-contain rounded-lg ${currentQuestion.imageSize === 'small' ? 'max-h-32' : currentQuestion.imageSize === 'medium' ? 'max-h-48' : 'max-h-64'}`}
                      />
                    </div>
                  )}
                  {currentQuestion.questionText && (
                    <div
                      className={currentQuestion.imageFilename ? "mt-4" : ""}
                      style={{
                        fontFamily: "'Times New Roman', Times, serif",
                        fontSize: "1.125rem",
                      }}
                    >
                      <MathText
                        text={currentQuestion.questionText}
                        className="leading-relaxed dark:text-neutral-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* More Space */}
              {!showScratchWork && (
                <div className="relative z-[60]" style={{ pointerEvents: "auto" }}>
                  <button
                    onClick={() => setShowScratchWork(true)}
                    className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors mb-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    More space
                  </button>
                </div>
              )}
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${showScratchWork ? 'max-h-[300px] mb-4' : 'max-h-0'}`}
              >
                <div className="h-[300px] rounded-xl border-2 border-dashed border-gray-200 dark:border-neutral-700" />
              </div>

              {/* Embedded Graphing Tool */}
              {showGraphingTool && (
                <div
                  className="mb-4 border-2 border-blue-200 dark:border-blue-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 max-w-md mx-auto relative"
                  style={{
                    zIndex: 100,
                    pointerEvents: "auto",
                    transform: "translateZ(0)",
                  }}
                >
                  {/* Graph Header */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      Graph
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSession((prev) => {
                            if (!prev) return prev;
                            const newGraphs = { ...prev.graphs };
                            delete newGraphs[currentQuestion.id];
                            return { ...prev, graphs: newGraphs };
                          });
                          setGraphClearKey((prev) => prev + 1);
                        }}
                        className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all"
                        title="Clear graph"
                      >
                        <svg
                          className="w-4 h-4 text-red-500 dark:text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowGraphingTool(false)}
                        className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="Close graph"
                      >
                        <svg
                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
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
                  </div>
                  <div style={{ height: "380px" }}>
                    <GraphingTool
                      key={`${currentQuestion.id}-${graphClearKey}`}
                      initialData={
                        session.graphs?.[currentQuestion.id] ||
                        DEFAULT_GRAPH_DATA
                      }
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

              {/* Answer Area */}
              {isDragOrder ? (
                <div className="mb-6" style={{ pointerEvents: "auto" }}>
                  {/* View toggles — hidden after check */}
                  {!dragOrderChecked && (
                    <div className="flex items-center gap-2 mb-3 relative z-[60]">
                      <div className="inline-flex rounded-lg border border-gray-300 dark:border-neutral-600 overflow-hidden text-xs font-medium">
                        <button
                          onClick={() => {
                            setDragOrderView("list");
                            localStorage.setItem("drag-order-view", "list");
                          }}
                          className={`px-3 py-1.5 transition-colors ${dragOrderView === "list" ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
                        >
                          List
                        </button>
                        <button
                          onClick={() => {
                            setDragOrderView("slots");
                            localStorage.setItem("drag-order-view", "slots");
                          }}
                          className={`px-3 py-1.5 transition-colors ${dragOrderView === "slots" ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
                        >
                          Slots
                        </button>
                      </div>
                      <div className="inline-flex rounded-lg border border-gray-300 dark:border-neutral-600 overflow-hidden text-xs font-medium">
                        <button
                          onClick={() => {
                            setDragOrderOrientation("vertical");
                            localStorage.setItem(
                              "drag-order-orientation",
                              "vertical",
                            );
                          }}
                          className={`px-2 py-1.5 transition-colors ${dragOrderOrientation === "vertical" ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
                          title="Vertical layout"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <rect x="2" y="1" width="12" height="3" rx="0.5" />
                            <rect x="2" y="6" width="12" height="3" rx="0.5" />
                            <rect x="2" y="11" width="12" height="3" rx="0.5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setDragOrderOrientation("horizontal");
                            localStorage.setItem(
                              "drag-order-orientation",
                              "horizontal",
                            );
                          }}
                          className={`px-2 py-1.5 transition-colors ${dragOrderOrientation === "horizontal" ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
                          title="Horizontal layout"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <rect x="1" y="2" width="3" height="12" rx="0.5" />
                            <rect x="6" y="2" width="3" height="12" rx="0.5" />
                            <rect x="11" y="2" width="3" height="12" rx="0.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {dragOrderView === "list" ? (
                    <DragOrderAnswer
                      items={
                        dragOrderAnswer.length > 0
                          ? dragOrderAnswer
                          : seededShuffle(
                              [...currentQuestion.answers],
                              currentQuestion.id + String(session.startTime),
                            )
                      }
                      correctOrder={currentQuestion.answers}
                      isChecked={dragOrderChecked}
                      onOrderChange={(newOrder) =>
                        handleDragOrderChange(currentQuestion.id, newOrder)
                      }
                      onCheck={() => handleDragOrderCheck(currentQuestion.id)}
                      canAttempt={showCheckButton && !dragOrderChecked}
                      orientation={dragOrderOrientation}
                    />
                  ) : (
                    <BucketOrderAnswer
                      items={
                        dragOrderAnswer.length > 0
                          ? dragOrderAnswer
                          : seededShuffle(
                              [...currentQuestion.answers],
                              currentQuestion.id + String(session.startTime),
                            )
                      }
                      correctOrder={currentQuestion.answers}
                      isChecked={dragOrderChecked}
                      onOrderChange={(newOrder) =>
                        handleDragOrderChange(currentQuestion.id, newOrder)
                      }
                      onCheck={() => handleDragOrderCheck(currentQuestion.id)}
                      canAttempt={showCheckButton && !dragOrderChecked}
                      orientation={dragOrderOrientation}
                    />
                  )}
                </div>
              ) : (
                <div
                  className={`mb-6 relative ${
                    currentQuestion.answerLayout === "grid"
                      ? "grid grid-cols-2 gap-2"
                      : currentQuestion.answerLayout === "row"
                      ? "grid grid-cols-4 gap-2"
                      : "space-y-2"
                  }`}
                  style={{
                    zIndex: 100,
                    transform: "translateZ(0)",
                    pointerEvents: "none",
                  }}
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
                        buttonClass +=
                          " bg-green-50 dark:bg-green-900/30 border-black dark:border-green-500 text-green-900 dark:text-green-300";
                      } else {
                        buttonClass +=
                          " bg-rose-50 dark:bg-rose-900/30 border-rose-500 text-rose-900 dark:text-rose-300";
                      }
                    } else if (isSelected) {
                      buttonClass +=
                        " bg-sky-50 dark:bg-sky-900/30 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-300";
                    } else {
                      buttonClass +=
                        " bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800";
                    }

                    const answerImage =
                      currentQuestion.answerImageUrls?.[index];
                    const gridOrder =
                      currentQuestion.answerLayout === "grid"
                        ? [0, 2, 1, 3][index]
                        : index;

                    return (
                      <div
                        key={index}
                        className="relative group"
                        style={{ pointerEvents: "auto", order: gridOrder }}
                      >
                        <button
                          onClick={() => handleAnswerSelect(answerNum)}
                          className={buttonClass}
                        >
                          <div
                            className="flex items-start gap-3"
                            style={{ fontSize: "1.125rem" }}
                          >
                            <span
                              className="font-bold shrink-0 leading-normal"
                              style={{
                                fontFamily: "'Times New Roman', Times, serif",
                              }}
                            >
                              ({answerNum})
                            </span>
                            <div
                              className="flex-1 min-w-0 overflow-hidden"
                              style={{
                                fontFamily: "'Times New Roman', Times, serif",
                              }}
                            >
                              {answer && (
                                <div className="break-words overflow-wrap-anywhere">
                                  <MathText
                                    text={answer}
                                    className="text-left"
                                  />
                                </div>
                              )}
                              {answerImage && (
                                <img
                                  src={answerImage}
                                  alt={`Answer ${answerNum}`}
                                  className="max-w-full h-auto rounded border border-gray-300 dark:border-neutral-600 mt-2"
                                />
                              )}
                            </div>
                          </div>
                        </button>

                        {showCheckButton && isSelected && !isChecked && canAttempt && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckAnswer(answerNum);
                            }}
                            className="absolute right-3 top-3 px-3 py-1.5 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-black text-xs font-bold rounded-lg shadow-md transition-all"
                          >
                            CHECK
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Calculator on Mobile - inline below answers */}
          {showCalculator && (
            <div
              className="md:hidden w-full bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden mb-6 relative"
              style={{ zIndex: 100, transform: "translateZ(0)" }}
            >
              <div className="flex items-center justify-between p-4 border-b-2 border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950">
                <h3 className="text-base font-bold text-gray-900 dark:text-neutral-100">
                  TI-84 Calculator
                </h3>
                <button
                  onClick={() => setShowCalculator(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                  aria-label="Close calculator"
                >
                  <svg
                    className="w-5 h-5 text-gray-700 dark:text-neutral-300"
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
              <div className="w-full h-[650px] bg-gray-50 dark:bg-neutral-950 overflow-hidden">
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
            className="fixed inset-0 bg-black bg-opacity-20 dark:bg-opacity-50 z-[110]"
            onClick={() => setShowAllQuestions(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-20 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-4 md:p-6 z-[120] md:max-w-2xl md:w-full border border-gray-100 dark:border-neutral-800 max-h-[70vh] md:max-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
                  All Questions
                </h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                  {answeredCount} of {questions.length} completed
                </p>
              </div>
              <button
                onClick={() => setShowAllQuestions(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-500 dark:text-neutral-400"
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
            <div className="flex flex-wrap gap-2 overflow-y-auto pr-2 flex-1 min-h-0 content-start">
              {questions.map((q, index) => {
                // Show section label when section changes
                const prevQ = index > 0 ? questions[index - 1] : null;
                const qSection =
                  sections.length > 0 && q.sectionId
                    ? sections.find((s) => s.id === q.sectionId)
                    : null;
                const showSectionLabel =
                  qSection && (!prevQ || prevQ.sectionId !== q.sectionId);
                const userAnswer = session.userAnswers[q.id];
                const isAnswered =
                  userAnswer !== null && userAnswer !== undefined;
                const isCurrent = index === session.currentQuestionIndex;
                const checkedArray = session.checkedAnswers[q.id] || [];
                const isChecked = checkedArray.length > 0;

                // Check if this question is part of a group
                const hasPassage = !!q.passageId;
                const siblingQ = hasPassage
                  ? questions.find(
                      (sq) => sq.id !== q.id && sq.passageId === q.passageId,
                    )
                  : null;
                const siblingIdx = siblingQ
                  ? questions.findIndex((sq) => sq.id === siblingQ.id)
                  : -1;
                const isFirstInPair = siblingIdx > index;
                const isPartOfCurrentGroup =
                  siblingQ &&
                  (index === session.currentQuestionIndex ||
                    siblingIdx === session.currentQuestionIndex);

                // In practice mode, mark based on selection; in test practice mode, after check; in test mode, no feedback
                const isCorrectAnswer = userAnswer === q.correctAnswer;
                const shouldShowResult = isPracticeMode
                  ? isAnswered
                  : showCheckButton ? isChecked : false;
                const isCorrect = isPracticeMode
                  ? isCorrectAnswer
                  : isChecked &&
                    checkedArray[checkedArray.length - 1] === q.correctAnswer;
                const isMarked = isPracticeMode
                  ? practiceMarkedQuestions.has(q.id)
                  : session.markedForReview[q.id] || false;

                let bgClass =
                  "bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300";
                if (isCurrent || isPartOfCurrentGroup) {
                  bgClass =
                    "bg-slate-700 dark:bg-slate-600 border-slate-700 dark:border-slate-600 text-white";
                } else if (shouldShowResult) {
                  if (isCorrect) {
                    bgClass =
                      "bg-green-50 dark:bg-green-900/30 border-black dark:border-green-500 text-green-700 dark:text-green-400";
                  } else {
                    bgClass =
                      "bg-rose-50 dark:bg-rose-900/30 border-rose-500 text-rose-700 dark:text-rose-400";
                  }
                } else if (isAnswered) {
                  bgClass =
                    "bg-gray-100 dark:bg-neutral-800 border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-neutral-400";
                }

                // For grouped questions, navigate to the first question in the pair
                const targetIndex =
                  hasPassage && !isFirstInPair && siblingIdx !== -1
                    ? siblingIdx
                    : index;

                return (
                  <React.Fragment key={q.id}>
                    {showSectionLabel && (
                      <div className="w-full text-[10px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wide pt-2 pb-0.5 first:pt-0">
                        {qSection!.name}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const timeSpent = Math.floor(
                          (Date.now() - session.lastQuestionStartTime) / 1000,
                        );
                        setSession((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            currentQuestionIndex: targetIndex,
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
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all hover:scale-105 ${bgClass} ${hasPassage && siblingQ ? (isFirstInPair ? 'rounded-r-sm !mr-0' : 'rounded-l-sm !ml-0') : ''}`}
                      title={`Question ${index + 1}${hasPassage ? " (Grouped)" : ""}${
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
                    {/* Connector between grouped questions */}
                    {hasPassage && isFirstInPair && (
                      <div className="flex items-center -mx-1.5 z-10">
                        <svg className="w-2.5 h-2.5 text-gray-400 dark:text-neutral-500" viewBox="0 0 10 10" fill="currentColor">
                          <rect x="1" y="4" width="8" height="2" rx="1" />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Legend at bottom */}
            <div className="flex items-center justify-center gap-3 md:gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700 text-xs text-gray-600 dark:text-neutral-400 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded border-2 border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"></div>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded border-2 border-black dark:border-green-500 bg-green-50 dark:bg-green-900/30"></div>
                <span>Correct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded border-2 border-rose-500 bg-rose-50 dark:bg-rose-900/30"></div>
                <span>Incorrect</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-slate-700 dark:bg-slate-600"></div>
                <span>Current</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fixed Bottom Section - Duolingo Style */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 z-[100] transition-all duration-300 ${
          showCalculator ? "md:right-[420px]" : "md:right-0"
        }`}
        style={{ pointerEvents: "auto" }}
      >
        <div className="max-w-5xl mx-auto px-3 md:px-4 py-2 md:py-2.5">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Left: Question Navigator + Back/Forward */}
            <div className="flex items-center gap-2">
              {/* Question Counter */}
              <button
                onClick={() => setShowAllQuestions(true)}
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-300 dark:border-neutral-600 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800 text-xs md:text-sm font-bold text-gray-700 dark:text-neutral-300 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>
                  {isGroupedQuestion
                    ? `${Math.min(currentQuestionIdx, siblingQuestionIdx) + 1} and ${Math.max(currentQuestionIdx, siblingQuestionIdx) + 1}`
                    : session.currentQuestionIndex + 1}/{questions.length}
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

              {/* Back/Forward Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevious}
                  disabled={session.currentQuestionIndex === 0}
                  className="p-1.5 md:p-2 rounded-full border border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  <svg
                    className="w-4 h-4 text-gray-600 dark:text-neutral-400"
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
                <button
                  onClick={handleNext}
                  disabled={
                    session.currentQuestionIndex === questions.length - 1
                  }
                  className="p-1.5 md:p-2 rounded-full border border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  <svg
                    className="w-4 h-4 text-gray-600 dark:text-neutral-400"
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
              </div>
            </div>

            {/* Right: Explanation + Next Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExplanation(true)}
                className="px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-bold text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 rounded-full transition-all"
              >
                EXPLANATION
              </button>
              {session.currentQuestionIndex === questions.length - 1 ? (
                isPracticeMode ? (
                  <button
                    onClick={() => router.push("/?tab=question-bank")}
                    className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full shadow-md transition-all"
                  >
                    DONE
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full shadow-md transition-all"
                  >
                    FINISH
                  </button>
                )
              ) : (
                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 rounded-full shadow-md transition-all flex items-center gap-1"
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
        explanationText={question1?.explanation || currentQuestion.explanation}
        explanationImageUrl={
          question1?.explanationImageUrl || currentQuestion.explanationImageUrl
        }
        correctAnswer={
          question1
            ? question1.answers[question1.correctAnswer - 1]
            : currentQuestion.answers[currentQuestion.correctAnswer - 1]
        }
        isCorrect={
          question1
            ? session.userAnswers[question1.id] === question1.correctAnswer
            : isCorrect
        }
        hasAnswered={
          question1
            ? session.checkedAnswers[question1.id]?.length > 0
            : checkedAnswers.length > 0
        }
        additionalExplanations={
          isGroupedQuestion && question2
            ? [
                {
                  questionNumber: 2,
                  explanationText: question2.explanation,
                  explanationImageUrl: question2.explanationImageUrl,
                  correctAnswer: question2.answers[question2.correctAnswer - 1],
                  isCorrect:
                    session.userAnswers[question2.id] ===
                    question2.correctAnswer,
                  hasAnswered:
                    (session.checkedAnswers[question2.id]?.length || 0) > 0,
                },
              ]
            : undefined
        }
      />

      {/* Reference Image Modal - Shows default PDF if no specific reference */}
      <ReferenceImageModal
        isOpen={showReferenceImage}
        onClose={() => setShowReferenceImage(false)}
        imageUrl={resolveReferenceImage(currentQuestion, currentSection)}
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
        className={`hidden md:block fixed top-0 right-0 w-[420px] h-screen bg-white dark:bg-neutral-900 border-l-2 border-gray-200 dark:border-neutral-700 shadow-2xl z-[100] transition-transform duration-300 ${
          showCalculator ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Calculator iframe */}
        <div className="w-full h-full bg-gray-50 dark:bg-neutral-950 overflow-auto">
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
          <div className="text-gray-500 dark:text-neutral-400">Loading...</div>
        </div>
      }
    >
      <QuizPageContent />
    </Suspense>
  );
}
