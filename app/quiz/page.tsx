"use client";

import React, { useEffect, useState, useRef, useMemo, Suspense } from "react";
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
  loadGraphPaperDrawings,
  saveGraphPaperDrawings,
} from "@/lib/storage";
import { loadAttempts, syncSessionToAttempts, AttemptsStore } from "@/lib/attempts";
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
import PassageIframe from "@/components/PassageIframe";
import SplitPane from "@/components/SplitPane";
import { seededShuffle } from "@/lib/shuffle";
import { computeGroupingInfo, getGroupFlatIndices, isDisplayGroupAnswered } from "@/lib/questionGrouping";
import { resolveReferenceDocs } from "@/lib/reference";
import FullscreenDrawingCanvas from "@/components/FullscreenDrawingCanvas";
import Timer from "@/components/Timer";
import ExplanationSlider from "@/components/ExplanationSlider";
import ReferenceDocsModal from "@/components/ReferenceDocsModal";
import MathText from "@/components/MathText";
import BugReportModal from "@/components/BugReport/BugReportModal";
import { getScaledScore } from "@/lib/results";
import LiveScoreBeaver from "@/components/LiveScoreBeaver";
import PracticeProgressBar from "@/components/PracticeProgressBar";
import DocsList from "@/components/DocsList";
import GraphPaperCanvas from "@/components/GraphPaperCanvas";
import FormattedText from "@/components/FormattedText";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

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
  const [showGraphPaper, setShowGraphPaper] = useState(false);
  const [graphPaperDrawings, setGraphPaperDrawings] = useState<{ [questionId: string]: string }>({});
  const [showBugReport, setShowBugReport] = useState(false);
  const [scratchWorkIndex, setScratchWorkIndex] = useState<number | null>(null);
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
  const [priorAttempts, setPriorAttempts] = useState<AttemptsStore>({});
  const [revealedQuestionIds, setRevealedQuestionIds] = useState<Set<string>>(new Set());
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [testName, setTestName] = useState<string | undefined>(undefined);
  const [sections, setSections] = useState<TestSection[]>([]);
  const [sectionDivider, setSectionDivider] = useState<TestSection | null>(null);
  const [scaledScoreTable, setScaledScoreTable] = useState<{ [key: number]: number } | null>(null);

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
  const [showZoomTip, setShowZoomTip] = useState(false);
  const [isMac, setIsMac] = useState(false);
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
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    if (!showZoomTip) return;
    const dismiss = () => setShowZoomTip(false);
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", dismiss);
      document.addEventListener("scroll", dismiss, true);
      document.addEventListener("touchstart", dismiss);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("scroll", dismiss, true);
      document.removeEventListener("touchstart", dismiss);
    };
  }, [showZoomTip]);

  useEffect(() => {
    setMounted(true);

    // Load marked for review questions for practice mode
    const markedQuestions = loadMarkedForReview();
    setPracticeMarkedQuestions(markedQuestions);

    // Snapshot prior attempts so the nav popup shows last-attempt markers
    // (current session state takes precedence as the user answers).
    setPriorAttempts(loadAttempts());
    setGraphPaperDrawings(loadGraphPaperDrawings());

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
            if (testData.scaled_score_table) {
              const table = Object.fromEntries(
                Object.entries(testData.scaled_score_table).map(([k, v]) => [parseInt(k), v])
              );
              setScaledScoreTable(table);
            }
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

  // Mirror session answer state into the persistent per-question attempts store,
  // so later sessions can show prior correct/incorrect markers in the question popup.
  useEffect(() => {
    if (!session || questions.length === 0) return;
    syncSessionToAttempts(session, questions);
  }, [session, questions]);

  // Score snapshot — only updates when user clicks Next
  const [snapshotRawScore, setSnapshotRawScore] = useState(0);
  const [lastPointsGained, setLastPointsGained] = useState(0);
  const prevSnapshotRef = useRef(0);

  const liveTotalPoints = useMemo(() => {
    if (isPracticeMode || !isTestPracticeMode) return 0;
    return questions.reduce((sum, q) => sum + (q.points || 2), 0);
  }, [questions, isPracticeMode, isTestPracticeMode]);

  const snapshotScaledScore = useMemo(() => {
    if (!isTestPracticeMode || !questions.length) return 0;
    return getScaledScore(snapshotRawScore, scaledScoreTable || undefined);
  }, [snapshotRawScore, scaledScoreTable, isTestPracticeMode, questions.length]);

  // Compute grouping info for parts vs grouped questions (must be before early returns)
  const groupingInfo = useMemo(() => computeGroupingInfo(questions), [questions]);

  // Keyboard shortcuts listener — installed once. The actual handler is swapped in on every
  // render via a ref assignment further down, after all closures are in scope. This keeps the
  // hook call order stable even when the component early-returns before handlers are defined.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
                Check your answers as you go. Get a second chance if you are wrong.
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
                No checking. Your answer is your answer. Just like the real exam.
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

  // Section divider screen between parts
  if (sectionDivider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 px-4">
        <div className="max-w-lg w-full">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mb-3 text-left">
            {sectionDivider.name}
          </h1>
          {sectionDivider.description && (
            <FormattedText
              text={sectionDivider.description}
              className="text-gray-700 dark:text-neutral-300 text-sm leading-relaxed text-left mb-8"
            />
          )}
          <button
            onClick={() => setSectionDivider(null)}
            className="w-full p-5 rounded-xl border-2 border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all group"
          >
            <span className="text-lg font-bold text-gray-900 dark:text-neutral-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              Continue
            </span>
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[session.currentQuestionIndex];

  const currentDisplayInfo = groupingInfo.questionMap[session.currentQuestionIndex];
  const isPartQuestion = currentDisplayInfo?.groupType === 'parts';
  const partGroupFlatIndices = isPartQuestion
    ? getGroupFlatIndices(groupingInfo, session.currentQuestionIndex)
    : [];
  const partGroupQuestions = isPartQuestion
    ? partGroupFlatIndices.map((fi) => questions[fi])
    : [];

  // Determine current section (if sections exist)
  const currentSection =
    sections.length > 0 && currentQuestion.sectionId
      ? sections.find((s) => s.id === currentQuestion.sectionId)
      : undefined;

  // Find ALL grouped questions sharing the same passageId (for 'grouped' type only)
  const groupedQuestions = currentQuestion.passageId && !isPartQuestion
    ? questions.filter(
        (q) => q.passageId === currentQuestion.passageId,
      )
    : [];
  const isGroupedQuestion = groupedQuestions.length > 1;

  // For backwards compatibility, find the sibling (used by navigation/time logic)
  const siblingQuestion = isGroupedQuestion
    ? groupedQuestions.find((q) => q.id !== currentQuestion.id) || null
    : null;

  // Current question's position within its group (1-based)
  const groupQuestionIndex = isGroupedQuestion
    ? groupedQuestions.findIndex((q) => q.id === currentQuestion.id)
    : -1;

  const currentQuestionIdx = questions.findIndex(
    (q) => q.id === currentQuestion.id,
  );

  const progress = currentDisplayInfo
    ? (currentDisplayInfo.displayNumber / groupingInfo.totalDisplayQuestions) * 100
    : ((session.currentQuestionIndex + 1) / questions.length) * 100;
  const selectedAnswer = session.userAnswers[currentQuestion.id] || null;
  const checkedAnswers = session.checkedAnswers[currentQuestion.id] || [];
  const isMarkedForReview = isPracticeMode
    ? practiceMarkedQuestions.has(currentQuestion.id)
    : session.markedForReview[currentQuestion.id] || false;


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

  const computeRawScore = () => {
    if (!session || !questions.length) return 0;
    let earned = 0;
    questions.forEach((q) => {
      if (q.questionType === 'drag-order') {
        const order = session.dragOrderAnswers?.[q.id] || [];
        if (order.length > 0 && JSON.stringify(order) === JSON.stringify(q.answers)) {
          earned += q.points || 2;
        }
      } else {
        const ans = session.userAnswers[q.id];
        if (ans !== null && ans !== undefined && ans === q.correctAnswer) {
          earned += q.points || 2;
        }
      }
    });
    return earned;
  };

  const handleNext = () => {
    // Update score snapshot on Next
    if (isTestPracticeMode) {
      const newRaw = computeRawScore();
      const newScaled = getScaledScore(newRaw, scaledScoreTable || undefined);
      const oldScaled = getScaledScore(prevSnapshotRef.current, scaledScoreTable || undefined);
      const gained = newScaled - oldScaled;
      setLastPointsGained(gained > 0 ? gained : 0);
      setSnapshotRawScore(newRaw);
      prevSnapshotRef.current = newRaw;
    }

    // Reveal the current question (or all parts if it's a part group) on the practice progress bar.
    if (isPracticeMode) {
      setRevealedQuestionIds((prev) => {
        const next = new Set(prev);
        if (isPartQuestion) {
          const groupIndices = getGroupFlatIndices(groupingInfo, session.currentQuestionIndex);
          for (const i of groupIndices) {
            const pq = questions[i];
            if (pq) next.add(pq.id);
          }
        } else {
          next.add(currentQuestion.id);
        }
        return next;
      });
    }

    const timeSpent = Math.floor(
      (Date.now() - session.lastQuestionStartTime) / 1000,
    );

    // For part questions, skip to after the last part in the group
    let nextIndex: number;
    if (isPartQuestion && currentDisplayInfo) {
      const groupIndices = getGroupFlatIndices(groupingInfo, session.currentQuestionIndex);
      const lastInGroup = groupIndices[groupIndices.length - 1];
      nextIndex = lastInGroup + 1;
    } else {
      // Each question navigates individually (even grouped ones)
      nextIndex = session.currentQuestionIndex + 1;
    }

    if (nextIndex < questions.length) {
      // Check if moving to a new section — show divider if so
      const nextQuestion = questions[nextIndex];
      const currentSectionId = currentQuestion.sectionId;
      const nextSectionId = nextQuestion.sectionId;
      if (
        sections.length > 0 &&
        nextSectionId &&
        nextSectionId !== currentSectionId
      ) {
        const nextSec = sections.find((s) => s.id === nextSectionId);
        if (nextSec) {
          // Save time for current question, advance index, then show divider
          setSession((prev) => {
            if (!prev) return prev;
            const newTimes = { ...prev.questionTimes };
            newTimes[currentQuestion.id] =
              (newTimes[currentQuestion.id] || 0) + timeSpent;
            return {
              ...prev,
              currentQuestionIndex: nextIndex,
              lastQuestionStartTime: Date.now(),
              questionTimes: newTimes,
            };
          });
          setSectionDivider(nextSec);
          return;
        }
      }

      setSession((prev) => {
        if (!prev) return prev;
        const newTimes = { ...prev.questionTimes };
        newTimes[currentQuestion.id] =
          (newTimes[currentQuestion.id] || 0) + timeSpent;
        return {
          ...prev,
          currentQuestionIndex: nextIndex,
          lastQuestionStartTime: Date.now(),
          questionTimes: newTimes,
        };
      });
    } else {
      // Last question
      setSession((prev) => {
        if (!prev) return prev;
        const newTimes = { ...prev.questionTimes };
        newTimes[currentQuestion.id] =
          (newTimes[currentQuestion.id] || 0) + timeSpent;
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

      let prevIndex: number;
      if (isPartQuestion && currentDisplayInfo) {
        // Jump to before the first part of the current group
        const groupIndices = getGroupFlatIndices(groupingInfo, session.currentQuestionIndex);
        const firstInGroup = groupIndices[0];
        prevIndex = firstInGroup - 1;
      } else {
        prevIndex = session.currentQuestionIndex - 1;
      }

      // If the previous question is a part question, jump to the first part of that group
      if (prevIndex >= 0) {
        const prevInfo = groupingInfo.questionMap[prevIndex];
        if (prevInfo?.groupType === 'parts') {
          const prevGroupIndices = getGroupFlatIndices(groupingInfo, prevIndex);
          prevIndex = prevGroupIndices[0];
        }
      }

      if (prevIndex < 0) return;

      setSession((prev) => {
        if (!prev) return prev;
        const newTimes = { ...prev.questionTimes };
        newTimes[currentQuestion.id] =
          (newTimes[currentQuestion.id] || 0) + timeSpent;
        return {
          ...prev,
          currentQuestionIndex: prevIndex,
          lastQuestionStartTime: Date.now(),
          questionTimes: newTimes,
        };
      });
    }
  };

  const handleToggleMarkForReview = () => {
    if (isPracticeMode) {
      const isNowMarked = toggleMarkedForReview(currentQuestion.id);
      setPracticeMarkedQuestions((prev) => {
        const newSet = new Set(prev);
        if (isNowMarked) {
          newSet.add(currentQuestion.id);
        } else {
          newSet.delete(currentQuestion.id);
        }
        return newSet;
      });
    } else {
      setSession((prev) => {
        if (!prev) return prev;
        const newMarkedValue = !prev.markedForReview[currentQuestion.id];
        return {
          ...prev,
          markedForReview: {
            ...prev.markedForReview,
            [currentQuestion.id]: newMarkedValue,
          },
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

  // Latest keybinding logic — assigned every render so the installed listener (registered once
  // at the top of the component) always calls the freshest handler with current closures.
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const target = e.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (target.isContentEditable) return;
    }

    if (showExplanation || showAllQuestions || showBugReport) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
      return;
    }

    if (isPartQuestion) return;
    if (currentQuestion.questionType === 'drag-order') return;

    if (e.key >= '1' && e.key <= '4') {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= currentQuestion.answers.length) {
        e.preventDefault();
        handleAnswerSelect(n);
      }
    }
  };

  // Compute answered count as display questions (part groups count as 1 when all parts answered)
  let answeredDisplayCount = 0;
  for (let d = 1; d <= groupingInfo.totalDisplayQuestions; d++) {
    if (isDisplayGroupAnswered(groupingInfo, d, session.userAnswers, session.dragOrderAnswers, questions)) {
      answeredDisplayCount++;
    }
  }
  const answeredCount = answeredDisplayCount;

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
        className={`${isGroupedQuestion ? 'h-screen overflow-hidden' : ''} pb-16 transition-all duration-300 relative ${
          showGraphPaper ? "md:mr-[520px]" : showCalculator ? "md:mr-[420px]" : ""
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

          <div className="max-w-5xl mx-auto px-4 py-2.5 md:py-2 flex items-center justify-between gap-2 min-w-0">
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
              <span className="text-sm font-bold text-gray-700 dark:text-neutral-300 truncate min-w-0 flex items-center gap-2">
                {testName || "Quiz"}
                {session.testMode && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      session.testMode === 'practice'
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                    }`}
                    title={session.testMode === 'practice' ? 'Check your answers as you go. Get a second chance if you are wrong.' : 'No checking. Your answer is your answer. Just like the real exam.'}
                  >
                    {session.testMode === 'practice' ? 'Practice Mode' : 'Test Mode'}
                  </span>
                )}
              </span>
            )}

            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
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
                <span className="hidden md:block text-[9px] font-medium text-gray-600 dark:text-neutral-400">
                  Reference
                </span>
              </button>

              <button
                onClick={() => setShowGraphPaper(!showGraphPaper)}
                className={`flex flex-col items-center gap-0.5 active:scale-95 transition-all rounded-lg p-1 ${
                  showGraphPaper
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : graphPaperDrawings[currentQuestion.id]
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400"
                }`}
                title="Graph Paper"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="1.5" />
                  <path strokeLinecap="round" d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeWidth={1} />
                </svg>
                <span className="hidden md:block text-[9px] font-medium">Graph Paper</span>
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
                <span className="hidden md:block text-[9px] font-medium text-gray-600 dark:text-neutral-400">
                  Calculator
                </span>
              </button>

              <ThemeToggle />

              <Timer startTime={session.lastQuestionStartTime} />
            </div>
          </div>
        </div>

        <div
          className={`mx-auto ${isGroupedQuestion ? "max-w-none px-0 pt-4 h-full flex flex-col" : isPartQuestion ? "max-w-3xl px-4 pt-4" : "max-w-3xl px-4 pt-4"} ${isTestPracticeMode && !isGroupedQuestion ? "lg:pr-16" : ""}`}
          style={{ pointerEvents: "auto" }}
        >
          {/* Question Number and Topic Badges Row */}
          <div
            className={`${isGroupedQuestion ? 'mb-2 px-2 shrink-0' : 'mb-4'} flex items-center gap-2 flex-wrap relative`}
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
                {`Question ${currentDisplayInfo?.displayNumber ?? session.currentQuestionIndex + 1}`}
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

          {/* Drawing Toolbar - Compact Single Row (hidden for grouped questions, shown inside passage panel instead) */}
          <div
            className={`flex items-center gap-2 mb-8 relative ${isGroupedQuestion ? 'hidden' : ''}`}
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

            {/* Zoom Info Button */}
            <div className="relative" style={{ pointerEvents: "auto" }}>
              <button
                onClick={() => setShowZoomTip(!showZoomTip)}
                className={`p-1.5 rounded-lg border-2 transition-all active:scale-95 ${
                  showZoomTip
                    ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                    : "border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800"
                }`}
                title="Zoom instructions"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>
              {showZoomTip && (
                <>
                  {/* overlay dismissed via useEffect listener */}
                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl p-3 z-[120] w-48">
                    <p className="text-xs font-bold text-gray-900 dark:text-neutral-100 mb-2">Zoom Controls</p>
                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-neutral-400">
                      {isMac ? (
                        <div>
                          <div className="mt-0.5"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">&#8984;</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">=</kbd> Zoom in</div>
                          <div><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">&#8984;</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">-</kbd> Zoom out</div>
                        </div>
                      ) : (
                        <div>
                          <div className="mt-0.5"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">=</kbd> Zoom in</div>
                          <div><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">-</kbd> Zoom out</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* GROUPED QUESTIONS - SPLIT PANE LAYOUT */}
          {isGroupedQuestion ? (
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden" style={{ pointerEvents: "auto" }}>
              <SplitPane
                defaultSplit={60}
                minLeft={30}
                minRight={25}
                className="h-full"
                left={
                  <div className="px-4 py-3 pb-16 min-h-full flex flex-col">
                    {/* Passage Header with Drawing Tools */}
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-y-1 relative" style={{ zIndex: 100, transform: "translateZ(0)" }}>
                      <div className="flex items-center gap-2">
                        {(currentQuestion.passage?.passageText || currentQuestion.passage?.aboveText) && (
                          <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">
                            Passage
                          </div>
                        )}
                        {/* Drawing toolbar inline for grouped questions */}
                        <div className="flex items-center gap-1.5">
                          {/* Pen Tool */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (tool === "pen") {
                                  setTool(null);
                                  setShowColorPicker(false);
                                } else {
                                  setTool("pen");
                                }
                              }}
                              className={`relative p-1 rounded-md border-2 transition-all active:scale-95 ${
                                tool === "pen"
                                  ? "border-2 shadow-sm"
                                  : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800"
                              }`}
                              style={
                                tool === "pen"
                                  ? {
                                      backgroundColor: penColor,
                                      borderColor: theme === "dark" ? "#525252" : penColor,
                                      color: ["#000000","#3b82f6","#a855f7","#ef4444"].includes(penColor) ? "#ffffff" : "#000000",
                                    }
                                  : {}
                              }
                              title="Pen"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {tool === "pen" && (
                              <div
                                onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                                className="absolute bottom-0 right-0 cursor-pointer rounded-br-md"
                                title="Change color"
                                style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderBottom: `10px solid ${theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}` }}
                              />
                            )}
                            {showColorPicker && tool === "pen" && (
                              <>
                                <div className="fixed inset-0 z-[110]" onClick={() => setShowColorPicker(false)} />
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl p-1.5 z-[120]">
                                  <div className="flex items-center gap-1.5">
                                    {[
                                      { name: "Green", value: "#22c55e" },
                                      { name: "Blue", value: "#3b82f6" },
                                      { name: "Red", value: "#ef4444" },
                                      { name: "Yellow", value: "#eab308" },
                                      { name: "Purple", value: "#a855f7" },
                                      theme === "dark" ? { name: "White", value: "#ffffff" } : { name: "Black", value: "#000000" },
                                    ].map((color) => (
                                      <button
                                        key={color.value}
                                        onClick={() => { setPenColor(color.value); setShowColorPicker(false); }}
                                        className={`w-6 h-6 rounded-md transition-all hover:scale-110 active:scale-95 ${
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
                          {/* Eraser */}
                          <button
                            onClick={() => setTool(tool === "eraser" ? null : "eraser")}
                            className={`p-1 rounded-md border-2 transition-all active:scale-95 ${
                              tool === "eraser"
                                ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                                : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800"
                            }`}
                            title="Eraser"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16.24,3.56L21.19,8.5C21.97,9.29 21.97,10.55 21.19,11.34L12,20.53C10.44,22.09 7.91,22.09 6.34,20.53L2.81,17C2.03,16.21 2.03,14.95 2.81,14.16L13.41,3.56C14.2,2.78 15.46,2.78 16.24,3.56M4.22,15.58L7.76,19.11C8.54,19.9 9.8,19.9 10.59,19.11L14.12,15.58L9.17,10.63L4.22,15.58Z" />
                            </svg>
                          </button>
                          {/* Clear */}
                          <button
                            onClick={handleClear}
                            className="p-1 rounded-md border-2 border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 active:scale-95 transition-all"
                            title="Clear all"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z" />
                            </svg>
                          </button>
                          {/* Size Buttons */}
                          {tool && (
                            <div className="flex items-center gap-1">
                              {tool === "pen" ? (
                                [2, 6].map((size) => (
                                  <button key={size} onClick={() => setPenSize(size)}
                                    className={`px-1.5 py-0.5 rounded-md border-2 text-[10px] font-medium transition-all active:scale-95 ${
                                      penSize === size
                                        ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                                        : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white"
                                    }`}
                                  >{size === 2 ? "S" : "L"}</button>
                                ))
                              ) : (
                                [15, 35].map((size) => (
                                  <button key={size} onClick={() => setEraserSize(size)}
                                    className={`px-1.5 py-0.5 rounded-md border-2 text-[10px] font-medium transition-all active:scale-95 ${
                                      eraserSize === size
                                        ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                                        : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white"
                                    }`}
                                  >{size === 15 ? "S" : "L"}</button>
                                ))
                              )}
                            </div>
                          )}
                          {/* Undo */}
                          <button
                            onClick={handleUndo}
                            disabled={!canUndo}
                            className="p-1 rounded-md border-2 border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                            title="Undo"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z" />
                            </svg>
                          </button>
                          {/* Zoom Info */}
                          <div className="relative">
                            <button
                              onClick={() => setShowZoomTip(!showZoomTip)}
                              className={`p-1 rounded-md border-2 transition-all active:scale-95 ${
                                showZoomTip
                                  ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                                  : "border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-800"
                              }`}
                              title="Zoom instructions"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                              </svg>
                            </button>
                            {showZoomTip && (
                              <>
                                {/* overlay dismissed via useEffect listener */}
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl p-3 z-[120] w-48">
                                  <p className="text-xs font-bold text-gray-900 dark:text-neutral-100 mb-2">Zoom Controls</p>
                                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-neutral-400">
                                    {isMac ? (
                                      <div>
                                        <div className="mt-0.5"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">&#8984;</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">=</kbd> Zoom in</div>
                                        <div><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">&#8984;</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">-</kbd> Zoom out</div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="mt-0.5"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">=</kbd> Zoom in</div>
                                        <div><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">-</kbd> Zoom out</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Spacer for alignment */}
                      <div />
                    </div>

                    {/* Passage Above Text */}
                    {currentQuestion.passage?.aboveText && (
                      <div
                        className="mb-3"
                        style={{
                          fontFamily: "'Times New Roman', Times, serif",
                          fontSize: "1.125rem",
                        }}
                      >
                        <MathText
                          text={currentQuestion.passage.aboveText}
                          className="leading-relaxed dark:text-neutral-200"
                        />
                      </div>
                    )}

                    {/* Passage Documents (images / PDFs) */}
                    {currentQuestion.passage?.passageDocuments && currentQuestion.passage.passageDocuments.length > 0 && (
                      <div
                        className="mb-3 shrink-0"
                        style={{ zIndex: 60, pointerEvents: "auto", position: "relative" }}
                      >
                        <DocsList
                          docs={currentQuestion.passage.passageDocuments}
                          pdfHeight="80vh"
                          imageMaxWidthClass={currentQuestion.passage.imageSize === 'small' ? 'max-w-xs' : currentQuestion.passage.imageSize === 'medium' ? 'max-w-lg' : currentQuestion.passage.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                        />
                      </div>
                    )}

                    {/* Passage Text */}
                    {currentQuestion.passage?.passageText && (
                      <div className="relative" style={{ zIndex: 60, pointerEvents: "auto" }}>
                        <ScrollablePassage
                          passage={currentQuestion.passage}
                          highlights={
                            session.passageHighlights[currentQuestion.passage.id] || []
                          }
                          onHighlightAdd={(highlight) =>
                            handleHighlightAdd(currentQuestion.passage!.id, highlight)
                          }
                          onHighlightRemove={(highlightId) =>
                            handleHighlightRemove(currentQuestion.passage!.id, highlightId)
                          }
                          onNoteAdd={(highlightId, note) =>
                            handleNoteAdd(currentQuestion.passage!.id, highlightId, note)
                          }
                          showLineNumbers
                        />
                      </div>
                    )}
                  </div>
                }
                right={
                  <div className={`flex flex-col px-5 py-3 pb-16 ${isTestPracticeMode ? 'lg:pr-16' : ''}`}>

                    {/* Question Content - Regents style: number on left, text indented */}
                    <div className="mb-4 shrink-0 flex gap-3" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "1.125rem" }}>
                      {/* Question number */}
                      <div className="shrink-0 font-bold text-gray-900 dark:text-neutral-100" style={{ width: '1.5rem', textAlign: 'right' }}>
                        {session.currentQuestionIndex + 1}
                      </div>
                      {/* Question body */}
                      <div className="flex-1 min-w-0">
                        {currentQuestion.aboveImageText && (
                          <div className="mb-2">
                            <MathText
                              text={currentQuestion.aboveImageText}
                              className="leading-relaxed dark:text-neutral-200"
                            />
                          </div>
                        )}
                        {currentQuestion.questionDocuments && currentQuestion.questionDocuments.filter((d) => d.position !== 'below').length > 0 && (
                          <div className="w-full mb-2">
                            <DocsList
                              docs={currentQuestion.questionDocuments.filter((d) => d.position !== 'below')}
                              pdfHeight="50vh"
                              imageMaxWidthClass={currentQuestion.imageSize === 'small' ? 'max-w-xs' : currentQuestion.imageSize === 'medium' ? 'max-w-lg' : currentQuestion.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                            />
                          </div>
                        )}
                        {currentQuestion.questionText && (
                          <div>
                            <MathText
                              text={currentQuestion.questionText}
                              className="leading-relaxed dark:text-neutral-200"
                            />
                          </div>
                        )}
                        {currentQuestion.questionDocuments && currentQuestion.questionDocuments.filter((d) => d.position === 'below').length > 0 && (
                          <div className="w-full mt-2">
                            <DocsList
                              docs={currentQuestion.questionDocuments.filter((d) => d.position === 'below')}
                              pdfHeight="50vh"
                              imageMaxWidthClass={currentQuestion.imageSize === 'small' ? 'max-w-xs' : currentQuestion.imageSize === 'medium' ? 'max-w-lg' : currentQuestion.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Answer Options - Regents style (1),(2),(3),(4) */}
                    <div
                      className="space-y-1 relative z-[60] mt-auto w-full max-w-full pl-8"
                      style={{ pointerEvents: "auto", fontFamily: "'Times New Roman', Times, serif", fontSize: "1.125rem" }}
                    >
                      {currentQuestion.answers.map((answer, index) => {
                        const answerNum = index + 1;
                        // Hide empty answer slots for multiple-choice (admins can leave 1-2 blank to make
                        // a 2- or 3-option question). Slot numbering still maps to correctAnswer.
                        const hasAnswerImage = currentQuestion.answerImageUrls?.[index];
                        if (currentQuestion.questionType !== 'drag-order' && !answer?.trim() && !hasAnswerImage) return null;
                        const isChecked = checkedAnswers.includes(answerNum);
                        const isCorrectAnswer = answerNum === currentQuestion.correctAnswer;
                        const isSelected = selectedAnswer === answerNum;
                        const canAttempt = checkedAnswers.length < 1;

                        let textColor = "text-gray-900 dark:text-neutral-100";
                        let bgClass = "hover:bg-gray-100 dark:hover:bg-neutral-800";
                        if (isChecked) {
                          if (isCorrectAnswer) {
                            textColor = "text-green-700 dark:text-green-300";
                            bgClass = "bg-green-50 dark:bg-green-900/30";
                          } else {
                            textColor = "text-rose-700 dark:text-rose-300";
                            bgClass = "bg-rose-50 dark:bg-rose-900/30";
                          }
                        } else if (isSelected) {
                          textColor = "text-sky-700 dark:text-sky-300";
                          bgClass = "bg-sky-50 dark:bg-sky-900/30";
                        }

                        return (
                          <div key={index} className="relative">
                            <button
                              onClick={() => handleAnswerSelect(answerNum)}
                              className={`w-full text-left rounded-lg px-2 py-1 transition-all active:scale-[0.98] ${textColor} ${bgClass}`}
                            >
                              <div className="flex items-start gap-1.5 min-w-0 w-full">
                                <span className="shrink-0">({answerNum})</span>
                                <div className="flex-1 min-w-0">
                                  {answer && <MathText text={answer} className="text-left" />}
                                  {currentQuestion.answerImageUrls?.[index] && (
                                    <img
                                      src={currentQuestion.answerImageUrls[index]}
                                      alt={`Answer ${answerNum}`}
                                      className="h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
                                      style={{ maxWidth: '100%', display: 'block' }}
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
                                className="absolute right-2 top-1 px-2.5 py-1 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-black text-xs font-bold rounded-lg shadow-md transition-all"
                              >
                                CHECK
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Notes - after answers */}
                    {currentQuestion.notes && (
                      <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-300 italic">
                          <span className="font-semibold not-italic">Note: </span>
                          {currentQuestion.notes}
                        </p>
                      </div>
                    )}

                  </div>
                }
              />
            </div>
          ) : isPartQuestion ? (
            <>
              {/* PART QUESTION LAYOUT — stacked parts on one page */}
              {/* Shared Passage at top */}
              {currentQuestion.passage?.aboveText && (
                <div
                  className="mb-2"
                  style={{
                    fontFamily: "'Times New Roman', Times, serif",
                    fontSize: "1.125rem",
                  }}
                >
                  <MathText
                    text={currentQuestion.passage.aboveText}
                    className="leading-relaxed dark:text-neutral-200"
                  />
                </div>
              )}
              {currentQuestion.passage?.passageDocuments && currentQuestion.passage.passageDocuments.length > 0 && (
                <div className="mb-3">
                  {currentQuestion.passage.passageText && (
                    <p className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                      Passage
                    </p>
                  )}
                  <DocsList
                    docs={currentQuestion.passage.passageDocuments}
                    pdfHeight="70vh"
                    imageMaxWidthClass={currentQuestion.passage.imageSize === 'small' ? 'max-w-xs' : currentQuestion.passage.imageSize === 'medium' ? 'max-w-lg' : currentQuestion.passage.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                  />
                </div>
              )}
              {currentQuestion.passage?.passageText && (
                <div className="mb-4">
                  {(!currentQuestion.passage.passageDocuments || currentQuestion.passage.passageDocuments.length === 0) && (
                    <p className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                      Passage
                    </p>
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
                    showLineNumbers
                  />
                </div>
              )}

              {/* Stacked Parts */}
              {partGroupQuestions.map((partQ, partIdx) => {
                const partInfo = groupingInfo.questionMap[partGroupFlatIndices[partIdx]];
                const partSelectedAnswer = session.userAnswers[partQ.id] || null;
                const partCheckedAnswers = session.checkedAnswers[partQ.id] || [];
                const partIsCorrect = partCheckedAnswers.length > 0 && partCheckedAnswers.includes(partQ.correctAnswer);
                const partAttemptsUsed = partCheckedAnswers.length;
                const partCanAttempt = !partIsCorrect && partAttemptsUsed < 1;
                const partHasChecked = partAttemptsUsed > 0;
                const partIsDragOrder = partQ.questionType === 'drag-order';
                const partDragOrderAnswer = session.dragOrderAnswers[partQ.id] || [];
                const partDragOrderChecked = partIsDragOrder && partCheckedAnswers.length > 0;
                const partDragOrderCorrect = partIsDragOrder && partDragOrderChecked && JSON.stringify(partDragOrderAnswer) === JSON.stringify(partQ.answers);

                return (
                  <div
                    key={partQ.id}
                    className="mb-6 border-t border-gray-200 dark:border-neutral-700 pt-4 first:border-t-0 first:pt-0 flex gap-3"
                    style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "1.125rem" }}
                  >
                    {/* Part label — Regents style: bold "1a", "1b" aligned with the question number. */}
                    <div className="shrink-0 font-bold text-gray-900 dark:text-neutral-100" style={{ width: '2rem', textAlign: 'right' }}>
                      {partInfo?.displayLabel || `${(partInfo?.displayNumber ?? '')}${partInfo?.partLabel || String.fromCharCode(97 + partIdx)}`}
                    </div>
                    {/* Right column: question content + answers + notes share the same indent */}
                    <div className="flex-1 min-w-0">

                    {/* Part Question Content */}
                    <div className="mb-3">
                      {partQ.aboveImageText && (
                        <div className="mb-2">
                          <MathText text={partQ.aboveImageText} className="leading-relaxed dark:text-neutral-200" />
                        </div>
                      )}
                      {partQ.questionDocuments && partQ.questionDocuments.filter((d) => d.position !== 'below').length > 0 && (
                        <div className="w-full mb-2">
                          <DocsList
                            docs={partQ.questionDocuments.filter((d) => d.position !== 'below')}
                            pdfHeight="50vh"
                            imageMaxWidthClass={partQ.imageSize === 'small' ? 'max-w-xs' : partQ.imageSize === 'medium' ? 'max-w-lg' : partQ.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                          />
                        </div>
                      )}
                      {partQ.questionText && (
                        <div>
                          <MathText text={partQ.questionText} className="leading-relaxed dark:text-neutral-200" />
                        </div>
                      )}
                      {partQ.questionDocuments && partQ.questionDocuments.filter((d) => d.position === 'below').length > 0 && (
                        <div className="w-full mt-2">
                          <DocsList
                            docs={partQ.questionDocuments.filter((d) => d.position === 'below')}
                            pdfHeight="50vh"
                            imageMaxWidthClass={partQ.imageSize === 'small' ? 'max-w-xs' : partQ.imageSize === 'medium' ? 'max-w-lg' : partQ.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                          />
                        </div>
                      )}
                    </div>

                    {/* Part Answer Choices */}
                    {partIsDragOrder ? (
                      <div style={{ pointerEvents: "auto" }}>
                        <DragOrderAnswer
                          items={
                            partDragOrderAnswer.length > 0
                              ? partDragOrderAnswer
                              : seededShuffle(
                                  [...partQ.answers],
                                  partQ.id + String(session.startTime),
                                )
                          }
                          correctOrder={partQ.answers}
                          isChecked={partDragOrderChecked}
                          onOrderChange={(newOrder) => handleDragOrderChange(partQ.id, newOrder)}
                          onCheck={() => handleDragOrderCheck(partQ.id)}
                          canAttempt={!partDragOrderChecked}
                          orientation={dragOrderOrientation}
                          answerImageUrls={partQ.answerImageUrls}
                        />
                      </div>
                    ) : (
                      <div
                        className={`relative z-[60] -ml-2 ${
                          partQ.answerLayout === 'grid'
                            ? 'grid grid-cols-2 gap-x-4 gap-y-1'
                            : partQ.answerLayout === 'row'
                            ? 'grid grid-cols-4 gap-x-2 gap-y-1'
                            : 'space-y-1'
                        }`}
                        style={{
                          pointerEvents: "auto",
                          fontFamily: "'Times New Roman', Times, serif",
                          fontSize: "1.125rem",
                        }}
                      >
                        {partQ.answers.map((answer, ansIdx) => {
                          const answerNum = ansIdx + 1;
                          const partAnswerImage = partQ.answerImageUrls?.[ansIdx];
                          if (partQ.questionType !== 'drag-order' && !answer?.trim() && !partAnswerImage) return null;
                          const isChecked = partCheckedAnswers.includes(answerNum);
                          const isCorrectAnswer = answerNum === partQ.correctAnswer;
                          const isSelected = partSelectedAnswer === answerNum;

                          let textColor = "text-gray-900 dark:text-neutral-100";
                          let bgClass = "hover:bg-gray-100 dark:hover:bg-neutral-800";
                          if (partHasChecked && isCorrectAnswer) {
                            // Always highlight correct answer green after checking
                            textColor = "text-green-700 dark:text-green-300";
                            bgClass = "bg-green-50 dark:bg-green-900/30";
                          } else if (isChecked && !isCorrectAnswer) {
                            textColor = "text-rose-700 dark:text-rose-300";
                            bgClass = "bg-rose-50 dark:bg-rose-900/30";
                          } else if (isSelected) {
                            textColor = "text-sky-700 dark:text-sky-300";
                            bgClass = "bg-sky-50 dark:bg-sky-900/30";
                          }

                          const answerImage = partQ.answerImageUrls?.[ansIdx];
                          const gridOrder = partQ.answerLayout === 'grid' ? [0, 2, 1, 3][ansIdx] : ansIdx;

                          return (
                            <div key={ansIdx} className="relative" style={{ order: gridOrder }}>
                              <button
                                onClick={() => {
                                  const timeSpent = Math.floor((Date.now() - session.lastQuestionStartTime) / 1000);
                                  setSession((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      userAnswers: { ...prev.userAnswers, [partQ.id]: answerNum },
                                      questionTimes: { ...prev.questionTimes, [partQ.id]: (prev.questionTimes[partQ.id] || 0) + timeSpent },
                                    };
                                  });
                                }}
                                className={`w-full text-left rounded-lg px-2 py-1 transition-all active:scale-[0.98] ${textColor} ${bgClass}`}
                              >
                                <div className="flex items-start gap-1.5 min-w-0 w-full">
                                  <span className="shrink-0">({answerNum})</span>
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    {answer && (
                                      <div className="break-words overflow-wrap-anywhere">
                                        <MathText text={answer} className="text-left" />
                                      </div>
                                    )}
                                    {answerImage && (
                                      <img
                                        src={answerImage}
                                        alt={`Answer ${answerNum}`}
                                        className="h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
                                        style={{ maxWidth: '100%', display: 'block' }}
                                      />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {showCheckButton && isSelected && !partHasChecked && partCanAttempt && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isCorrectAns = partSelectedAnswer === partQ.correctAnswer;
                                    if (isPracticeMode && practiceSkill) {
                                      updateSkillProgress(practiceSkill, partQ.id, isCorrectAns);
                                    }
                                    setSession((prev) => {
                                      if (!prev) return prev;
                                      const currentChecked = prev.checkedAnswers[partQ.id] || [];
                                      if (currentChecked.length >= 1) return prev;
                                      return {
                                        ...prev,
                                        checkedAnswers: { ...prev.checkedAnswers, [partQ.id]: [partSelectedAnswer!] },
                                        firstAttemptAnswers: { ...prev.firstAttemptAnswers, [partQ.id]: partSelectedAnswer },
                                      };
                                    });
                                  }}
                                  className="absolute right-2 top-1 px-2.5 py-1 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-black text-xs font-bold rounded-lg shadow-md transition-all"
                                >
                                  CHECK
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Notes — matches single question style */}
                    {partQ.notes && (
                      <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg" style={{ pointerEvents: "auto", position: "relative", zIndex: 60 }}>
                        <p className="text-sm text-amber-800 dark:text-amber-300 italic">
                          <span className="font-semibold not-italic">Note: </span>
                          {partQ.notes}
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {/* SINGLE QUESTION LAYOUT (original) */}
              {/* Passage Above Text */}
              {currentQuestion.passage?.aboveText && (
                <div
                  className="mb-2"
                  style={{
                    fontFamily: "'Times New Roman', Times, serif",
                    fontSize: "1.125rem",
                  }}
                >
                  <MathText
                    text={currentQuestion.passage.aboveText}
                    className="leading-relaxed dark:text-neutral-200"
                  />
                </div>
              )}

              {/* Passage Documents (images / PDFs) */}
              {currentQuestion.passage?.passageDocuments && currentQuestion.passage.passageDocuments.length > 0 && (
                <div className="mb-4" style={{ zIndex: 60, pointerEvents: "auto", position: "relative" }}>
                  {currentQuestion.passage.passageText && (
                    <div className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                      Passage
                    </div>
                  )}
                  <DocsList
                    docs={currentQuestion.passage.passageDocuments}
                    pdfHeight="70vh"
                    imageMaxWidthClass={currentQuestion.passage.imageSize === 'small' ? 'max-w-xs' : currentQuestion.passage.imageSize === 'medium' ? 'max-w-lg' : currentQuestion.passage.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                  />
                </div>
              )}

              {/* Passage Text (above canvas — scrollable with annotation tools) */}
              {currentQuestion.passage?.passageText && (
                <div
                  className="mb-4 relative"
                  style={{ zIndex: 60, pointerEvents: "auto" }}
                >
                  {(!currentQuestion.passage.passageDocuments || currentQuestion.passage.passageDocuments.length === 0) && (
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

              {/* Question Card — Regents style: bold question number on the left with text indented to match. */}
              {((currentQuestion.questionDocuments && currentQuestion.questionDocuments.length > 0) ||
                currentQuestion.questionText ||
                currentQuestion.aboveImageText) && (
                <div
                  className="mb-3 flex gap-3"
                  style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "1.125rem" }}
                >
                  <div className="shrink-0 font-bold text-gray-900 dark:text-neutral-100" style={{ width: '1.5rem', textAlign: 'right' }}>
                    {(currentDisplayInfo?.displayNumber ?? session.currentQuestionIndex + 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {currentQuestion.aboveImageText && (
                      <div className="mb-2">
                        <MathText
                          text={currentQuestion.aboveImageText}
                          className="leading-relaxed dark:text-neutral-200"
                        />
                      </div>
                    )}
                    {currentQuestion.questionDocuments && currentQuestion.questionDocuments.filter((d) => d.position !== 'below').length > 0 && (
                      <div className="w-full">
                        <DocsList
                          docs={currentQuestion.questionDocuments.filter((d) => d.position !== 'below')}
                          pdfHeight="50vh"
                          imageMaxWidthClass={currentQuestion.imageSize === 'small' ? 'max-w-xs' : currentQuestion.imageSize === 'medium' ? 'max-w-lg' : currentQuestion.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                        />
                      </div>
                    )}
                    {currentQuestion.questionText && (
                      <div className={(currentQuestion.questionDocuments && currentQuestion.questionDocuments.filter((d) => d.position !== 'below').length > 0) ? "mt-4" : ""}>
                        <MathText
                          text={currentQuestion.questionText}
                          className="leading-relaxed dark:text-neutral-200"
                        />
                      </div>
                    )}
                    {currentQuestion.questionDocuments && currentQuestion.questionDocuments.filter((d) => d.position === 'below').length > 0 && (
                      <div className="w-full mt-4">
                        <DocsList
                          docs={currentQuestion.questionDocuments.filter((d) => d.position === 'below')}
                          pdfHeight="50vh"
                          imageMaxWidthClass={currentQuestion.imageSize === 'small' ? 'max-w-xs' : currentQuestion.imageSize === 'medium' ? 'max-w-lg' : currentQuestion.imageSize === 'extra-large' ? 'max-w-full' : 'max-w-2xl'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* More Space */}
              <div className="relative z-[60] pl-9" style={{ pointerEvents: "auto" }}>
                <button
                  onClick={() => setScratchWorkIndex(scratchWorkIndex === session.currentQuestionIndex ? null : session.currentQuestionIndex)}
                  className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors mb-2"
                >
                  <svg className={`w-3 h-3 transition-transform ${scratchWorkIndex === session.currentQuestionIndex ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {scratchWorkIndex === session.currentQuestionIndex ? 'Less space' : 'More space'}
                </button>
              </div>
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden pl-9 ${scratchWorkIndex === session.currentQuestionIndex ? 'max-h-[300px] mb-4' : 'max-h-0'}`}
              >
                <div className="h-[300px] rounded-xl border-2 border-dashed border-gray-200 dark:border-neutral-700" />
              </div>


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
                  className={`mb-6 relative pl-7 ${
                    currentQuestion.answerLayout === "grid"
                      ? "grid grid-cols-2 gap-x-4 gap-y-1"
                      : currentQuestion.answerLayout === "row"
                      ? "grid grid-cols-4 gap-x-2 gap-y-1"
                      : "space-y-1"
                  }`}
                  style={{
                    zIndex: 100,
                    transform: "translateZ(0)",
                    pointerEvents: "none",
                    fontFamily: "'Times New Roman', Times, serif",
                    fontSize: "1.125rem",
                  }}
                >
                  {currentQuestion.answers.map((answer, index) => {
                    const answerNum = index + 1;
                    const answerImageHere = currentQuestion.answerImageUrls?.[index];
                    if (currentQuestion.questionType !== 'drag-order' && !answer?.trim() && !answerImageHere) return null;
                    const isChecked = checkedAnswers.includes(answerNum);
                    const isCorrectAnswer =
                      answerNum === currentQuestion.correctAnswer;
                    const isSelected = selectedAnswer === answerNum;

                    let textColor = "text-gray-900 dark:text-neutral-100";
                    let bgClass = "hover:bg-gray-100 dark:hover:bg-neutral-800";
                    if (isChecked) {
                      if (isCorrectAnswer) {
                        textColor = "text-green-700 dark:text-green-300";
                        bgClass = "bg-green-50 dark:bg-green-900/30";
                      } else {
                        textColor = "text-rose-700 dark:text-rose-300";
                        bgClass = "bg-rose-50 dark:bg-rose-900/30";
                      }
                    } else if (isSelected) {
                      textColor = "text-sky-700 dark:text-sky-300";
                      bgClass = "bg-sky-50 dark:bg-sky-900/30";
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
                        className="relative"
                        style={{ pointerEvents: "auto", order: gridOrder }}
                      >
                        <button
                          onClick={() => handleAnswerSelect(answerNum)}
                          className={`w-full text-left rounded-lg px-2 py-1 transition-all active:scale-[0.98] ${textColor} ${bgClass}`}
                        >
                          <div className="flex items-start gap-1.5 min-w-0 w-full">
                            <span className="shrink-0">({answerNum})</span>
                            <div className="flex-1 min-w-0 overflow-hidden">
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
                                  className="h-auto rounded border border-gray-300 dark:border-neutral-600 mt-1"
                                  style={{ maxWidth: '100%', display: 'block' }}
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
                            className="absolute right-2 top-1 px-2.5 py-1 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-black text-xs font-bold rounded-lg shadow-md transition-all"
                          >
                            CHECK
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notes - after answers */}
              {currentQuestion.notes && (
                <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg" style={{ pointerEvents: "auto", position: "relative", zIndex: 60 }}>
                  <p className="text-sm text-amber-800 dark:text-amber-300 italic">
                    <span className="font-semibold not-italic">Note: </span>
                    {currentQuestion.notes}
                  </p>
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
                  {answeredCount} of {groupingInfo.totalDisplayQuestions} completed
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
              {(() => {
                const renderedDisplayNumbers = new Set<number>();
                return questions.map((q, index) => {
                  const displayInfo = groupingInfo.questionMap[index];
                  if (!displayInfo) return null;

                  // For part questions, only render on the first part
                  if (displayInfo.groupType === 'parts' && !displayInfo.isFirstInGroup) {
                    return null;
                  }
                  // Avoid duplicate renders
                  if (renderedDisplayNumbers.has(displayInfo.displayNumber)) return null;
                  renderedDisplayNumbers.add(displayInfo.displayNumber);

                  const displayIdx = displayInfo.displayNumber - 1;
                  const flatIndices = groupingInfo.displayToFlatIndices[displayIdx];
                  const isPartGroup = displayInfo.groupType === 'parts' && flatIndices.length > 1;

                  // Show section label when section changes
                  const prevQ = index > 0 ? questions[index - 1] : null;
                  const qSection =
                    sections.length > 0 && q.sectionId
                      ? sections.find((s) => s.id === q.sectionId)
                      : null;
                  const showSectionLabel =
                    qSection && (!prevQ || prevQ.sectionId !== q.sectionId);

                  // For part groups, check if ANY part is current
                  const isCurrent = flatIndices.some((fi) => fi === session.currentQuestionIndex);

                  // Check answered state
                  const allAnswered = flatIndices.every((fi) => {
                    const fq = questions[fi];
                    if (!fq) return false;
                    if (fq.questionType === 'drag-order') return (session.dragOrderAnswers[fq.id]?.length || 0) > 0;
                    return session.userAnswers[fq.id] !== null && session.userAnswers[fq.id] !== undefined;
                  });

                  // Check if this question is part of a grouped pair (not parts)
                  const hasPassage = !!q.passageId && displayInfo.groupType !== 'parts';
                  const siblingQ = hasPassage
                    ? questions.find(
                        (sq) => sq.id !== q.id && sq.passageId === q.passageId,
                      )
                    : null;
                  const siblingIdx = siblingQ
                    ? questions.findIndex((sq) => sq.id === siblingQ.id)
                    : -1;
                  const isPartOfCurrentGroup =
                    siblingQ &&
                    (index === session.currentQuestionIndex ||
                      siblingIdx === session.currentQuestionIndex);

                  // Result display — session state wins; fall back to prior-attempt snapshot so
                  // the popup still shows last-attempt markers before the user re-answers.
                  const checkedArray = session.checkedAnswers[q.id] || [];
                  const isChecked = checkedArray.length > 0;
                  const userAnswer = session.userAnswers[q.id];
                  const isAnswered = userAnswer !== null && userAnswer !== undefined;
                  const isCorrectAnswer = userAnswer === q.correctAnswer;
                  const hasSessionState =
                    isAnswered ||
                    isChecked ||
                    (session.dragOrderAnswers[q.id]?.length ?? 0) > 0;
                  const priorAttempt = hasSessionState ? null : priorAttempts[q.id];
                  const shouldShowResult = isPracticeMode
                    ? isAnswered || !!priorAttempt
                    : showCheckButton ? (isChecked || !!priorAttempt) : false;
                  const isCorrect = isPracticeMode
                    ? (isAnswered ? isCorrectAnswer : !!priorAttempt?.isCorrect)
                    : isChecked
                      ? checkedArray[checkedArray.length - 1] === q.correctAnswer
                      : !!priorAttempt?.isCorrect;
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
                  } else if (isPartGroup ? allAnswered : isAnswered) {
                    bgClass =
                      "bg-gray-100 dark:bg-neutral-800 border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-neutral-400";
                  }

                  // Navigate to first part of group
                  const targetIndex = flatIndices[0];

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
                        className={`relative ${isPartGroup ? 'min-w-[3.5rem] px-2' : 'w-10'} h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all hover:scale-105 ${bgClass} ${hasPassage ? 'ring-2 ring-purple-300 dark:ring-purple-700 ring-offset-1 dark:ring-offset-neutral-900' : ''}`}
                        title={`Question ${displayInfo.displayNumber}${isPartGroup ? ` (${flatIndices.length} parts)` : ''}${hasPassage ? " (Grouped)" : ""}${
                          isMarked ? " (Marked for review)" : ""
                        }`}
                      >
                        <span>{displayInfo.displayNumber}</span>
                        {isPartGroup && (
                          <span className="ml-0.5 text-[10px] opacity-70">({flatIndices.length})</span>
                        )}
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
                    </React.Fragment>
                  );
                });
              })()}
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

      {/* Live Score Beaver — test-practice mode only */}
      {isTestPracticeMode && questions.length > 0 && session && (
        <LiveScoreBeaver
          scaledScore={snapshotScaledScore}
          rawScore={snapshotRawScore}
          totalPoints={liveTotalPoints}
          pointsGained={lastPointsGained}
        />
      )}

      {/* Question-bank practice — per-question tick/cross progress bar */}
      {isPracticeMode && questions.length > 0 && session && (
        <PracticeProgressBar
          questions={questions}
          session={session}
          revealedIds={revealedQuestionIds}
        />
      )}

      {/* Fixed Bottom Section - Duolingo Style */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 z-[100] transition-all duration-300 ${
          showGraphPaper ? "md:right-[520px]" : showCalculator ? "md:right-[420px]" : "md:right-0"
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
                  {currentDisplayInfo?.displayNumber ?? session.currentQuestionIndex + 1}/{groupingInfo.totalDisplayQuestions}
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
                    isPartQuestion
                      ? (getGroupFlatIndices(groupingInfo, session.currentQuestionIndex).slice(-1)[0] ?? session.currentQuestionIndex) >= questions.length - 1
                      : session.currentQuestionIndex === questions.length - 1
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
              {session.testMode !== 'test' && !isPartQuestion && (
                <button
                  onClick={() => setShowExplanation(true)}
                  className="px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-bold text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 rounded-full transition-all"
                >
                  EXPLANATION
                </button>
              )}
              {(isPartQuestion
                ? (getGroupFlatIndices(groupingInfo, session.currentQuestionIndex).slice(-1)[0] ?? session.currentQuestionIndex) >= questions.length - 1
                : session.currentQuestionIndex === questions.length - 1
              ) ? (
                isPracticeMode ? (
                  <button
                    onClick={() => router.push("/dashboard?tab=question-bank")}
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
        explanationText={currentQuestion.explanation}
        explanationImageUrl={currentQuestion.explanationImageUrl}
        correctAnswer={currentQuestion.answers[currentQuestion.correctAnswer - 1]}
        isCorrect={isCorrect}
        hasAnswered={checkedAnswers.length > 0}
      />

      {/* Reference Docs Modal — shows multi-doc references with thumbnail switcher;
          falls back to the default reference sheet when none are configured. */}
      <ReferenceDocsModal
        isOpen={showReferenceImage}
        onClose={() => setShowReferenceImage(false)}
        docs={resolveReferenceDocs(currentQuestion, currentSection)}
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

      {/* Graph Paper Panel - desktop right slide-out */}
      <div
        className={`hidden md:flex flex-col fixed top-0 right-0 w-[520px] h-screen bg-white dark:bg-neutral-900 border-l-2 border-gray-200 dark:border-neutral-700 shadow-2xl z-[101] transition-transform duration-300 ${
          showGraphPaper ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-700 shrink-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-neutral-100">Graph Paper</h3>
          <button
            onClick={() => setShowGraphPaper(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
            aria-label="Close graph paper"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <GraphPaperCanvas
            key={currentQuestion.id}
            initialDrawing={graphPaperDrawings[currentQuestion.id]}
            onChange={(dataUrl) => {
              setGraphPaperDrawings((prev) => {
                const next = { ...prev };
                if (dataUrl) next[currentQuestion.id] = dataUrl;
                else delete next[currentQuestion.id];
                saveGraphPaperDrawings(next);
                return next;
              });
            }}
          />
        </div>
      </div>

      {/* Graph Paper Panel - mobile inline below content */}
      {showGraphPaper && (
        <div className="md:hidden fixed inset-0 bg-white dark:bg-neutral-900 z-[120] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-700 shrink-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-neutral-100">Graph Paper</h3>
            <button
              onClick={() => setShowGraphPaper(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
              aria-label="Close graph paper"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <GraphPaperCanvas
              key={currentQuestion.id}
              initialDrawing={graphPaperDrawings[currentQuestion.id]}
              onChange={(dataUrl) => {
                setGraphPaperDrawings((prev) => {
                  const next = { ...prev };
                  if (dataUrl) next[currentQuestion.id] = dataUrl;
                  else delete next[currentQuestion.id];
                  saveGraphPaperDrawings(next);
                  return next;
                });
              }}
            />
          </div>
        </div>
      )}
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
