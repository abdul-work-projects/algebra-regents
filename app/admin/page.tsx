"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuestionForm } from "@/hooks/useQuestionForm";
import {
  uploadImage,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  fetchQuestions,
  updateQuestionOrders,
  updateTestQuestionOrders,
  fetchQuestionsForTest,
  deleteQuestionsForTest,
  DatabaseQuestion,
  DatabasePassage,
  fetchTests,
  createTest,
  updateTest,
  deleteTest,
  convertToTestFormat,
  getTestsForQuestion,
  setTestsForQuestion,
  addQuestionToTest,
  DatabaseTestWithCount,
  getAllQuestionTestMappings,
  bulkCreateQuestions,
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  convertToSubjectFormat,
  fetchAllSkillNames,
  fetchAllTags,
  createPassageWithQuestions,
  updatePassage,
  linkQuestionsToNewPassage,
} from "@/lib/supabase";
import { getCurrentUser, signOut, onAuthStateChange } from "@/lib/auth";
import {
  fetchBugReports,
  updateBugReportStatus,
  deleteBugReport,
  getBugReportCounts,
  DatabaseBugReport,
} from "@/lib/bugReports";
import TagInput from "@/components/TagInput";
import TestModal from "@/components/TestModal";
import SubjectModal from "@/components/SubjectModal";
import TestMultiSelect from "@/components/TestMultiSelect";
import { Test, Subject } from "@/lib/types";
import MathText from "@/components/MathText";

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [questions, setQuestions] = useState<
    (DatabaseQuestion & { passages?: DatabasePassage | null })[]
  >([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Question form hooks for Q1 and Q2
  const q1Form = useQuestionForm();
  const q2Form = useQuestionForm();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [answerDraggedOver, setAnswerDraggedOver] = useState<number | null>(
    null,
  );
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(
    null,
  );
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null); // For dragging grouped questions
  const [originalQuestions, setOriginalQuestions] = useState<
    DatabaseQuestion[] | null
  >(null);
  const [originalTestOrder, setOriginalTestOrder] = useState<{
    [questionId: string]: number;
  } | null>(null);
  const dropSuccessRef = useRef(false);

  // Tests management state
  const [activeTab, setActiveTab] = useState<
    "questions" | "tests" | "subjects" | "bugs"
  >("questions");
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [filterTestId, setFilterTestId] = useState<string>("all"); // "all" or a test ID
  const [questionTestMap, setQuestionTestMap] = useState<{
    [questionId: string]: string[];
  }>({});
  const [testQuestionOrder, setTestQuestionOrder] = useState<{
    [questionId: string]: number;
  }>({}); // Test-specific order
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Delete test modal state
  const [deleteTestModal, setDeleteTestModal] = useState<{
    show: boolean;
    test: Test | null;
    deleteQuestions: boolean;
    isDeleting: boolean;
  }>({
    show: false,
    test: null,
    deleteQuestions: false,
    isDeleting: false,
  });

  // Bug reports state
  const [bugReports, setBugReports] = useState<DatabaseBugReport[]>([]);
  const [isLoadingBugs, setIsLoadingBugs] = useState(true);
  const [bugStatusFilter, setBugStatusFilter] = useState<
    "all" | "open" | "reviewed" | "resolved"
  >("all");
  const [bugCounts, setBugCounts] = useState({
    open: 0,
    reviewed: 0,
    resolved: 0,
  });
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [testNamesMap, setTestNamesMap] = useState<{ [id: string]: string }>(
    {},
  );

  // CSV bulk upload state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<
    Array<{
      question_text: string;
      answers: string[];
      correct_answer: number;
      points: number;
      difficulty: 'easy' | 'medium' | 'hard' | null;
      skills: string[];
      tags: string[];
    }>
  >([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [csvSelectedTestIds, setCsvSelectedTestIds] = useState<string[]>([]);

  // Subjects management state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");

  // Autocomplete options for fields
  const [availableSkillNames, setAvailableSkillNames] = useState<string[]>([]);
  const [availableTagNames, setAvailableTagNames] = useState<string[]>([]);

  // Grouped question state (passage-based questions)
  const [isGroupedQuestion, setIsGroupedQuestion] = useState(false);
  const [passageText, setPassageText] = useState("");
  const [passageImage, setPassageImage] = useState<File | null>(null);
  const [passageImagePreview, setPassageImagePreview] = useState<string | null>(
    null,
  );
  const [activeQuestionTab, setActiveQuestionTab] = useState<1 | 2>(1);
  const [editingQ2Id, setEditingQ2Id] = useState<string | null>(null); // Second question ID when editing grouped questions
  const [editingPassageId, setEditingPassageId] = useState<string | null>(null); // Passage ID when editing grouped questions

  // Link existing questions state
  const [selectedForGrouping, setSelectedForGrouping] = useState<string[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkPassageText, setLinkPassageText] = useState("");
  const [linkPassageImage, setLinkPassageImage] = useState<File | null>(null);
  const [linkPassageImagePreview, setLinkPassageImagePreview] = useState<
    string | null
  >(null);
  const [isLinking, setIsLinking] = useState(false);

  // Current form based on active tab - switches between Q1 and Q2 forms
  const currentForm =
    isGroupedQuestion && activeQuestionTab === 2 ? q2Form : q1Form;

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/admin/login");
        return;
      }
      setUser(currentUser);
      setIsCheckingAuth(false);
    }

    checkAuth();

    const subscription = onAuthStateChange((user) => {
      if (!user) {
        router.push("/admin/login");
      } else {
        setUser(user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    loadQuestions();
    loadTestsData();
    loadSubjectsData();
    loadFieldAutocomplete();
    // Load bug counts for the tab badge
    getBugReportCounts().then((counts) => setBugCounts(counts));
  }, []);

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    const data = await fetchQuestions();
    setQuestions(data);

    // Extract unique skills from all questions for autocomplete
    const allSkills = data.flatMap((q) => q.skills || []);
    const uniqueTags = Array.from(new Set(allSkills)).sort();
    setAvailableTags(uniqueTags);

    // Load question-test mappings
    const mappings = await getAllQuestionTestMappings();
    setQuestionTestMap(mappings);

    setIsLoadingQuestions(false);
  };

  const loadTestsData = async () => {
    setIsLoadingTests(true);
    const data = await fetchTests();
    setTests(data.map(convertToTestFormat));
    setIsLoadingTests(false);
  };

  const loadSubjectsData = async () => {
    setIsLoadingSubjects(true);
    const data = await fetchSubjects();
    setSubjects(data.map(convertToSubjectFormat));
    setIsLoadingSubjects(false);
  };

  const loadFieldAutocomplete = async () => {
    const [skills, tags] = await Promise.all([
      fetchAllSkillNames(),
      fetchAllTags(),
    ]);
    setAvailableSkillNames(skills);
    setAvailableTagNames(tags);
  };

  // Load test-specific question order when filter changes
  useEffect(() => {
    async function loadTestOrder() {
      if (filterTestId === "all") {
        setTestQuestionOrder({});
        return;
      }
      const testQuestions = await fetchQuestionsForTest(filterTestId);
      const orderMap: { [questionId: string]: number } = {};
      testQuestions.forEach((q, index) => {
        orderMap[q.id] = index;
      });
      setTestQuestionOrder(orderMap);
    }
    loadTestOrder();
  }, [filterTestId]);

  const loadBugReports = async () => {
    setIsLoadingBugs(true);
    const filter = bugStatusFilter === "all" ? undefined : bugStatusFilter;
    const data = await fetchBugReports(filter);
    setBugReports(data);

    const counts = await getBugReportCounts();
    setBugCounts(counts);

    // Build test names map
    const uniqueTestIds = [
      ...new Set(data.filter((r) => r.test_id).map((r) => r.test_id!)),
    ];
    const namesMap: { [id: string]: string } = {};
    tests.forEach((t) => {
      if (uniqueTestIds.includes(t.id)) {
        namesMap[t.id] = t.name;
      }
    });
    setTestNamesMap(namesMap);

    setIsLoadingBugs(false);
  };

  useEffect(() => {
    if (activeTab === "bugs") {
      loadBugReports();
    }
  }, [activeTab, bugStatusFilter]);

  const handleBugStatusChange = async (
    reportId: string,
    newStatus: "open" | "reviewed" | "resolved",
  ) => {
    const success = await updateBugReportStatus(reportId, newStatus);
    if (success) {
      loadBugReports();
    }
  };

  const handleDeleteBug = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) {
      return;
    }
    const success = await deleteBugReport(reportId);
    if (success) {
      loadBugReports();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getQuestionPreview = (questionId: string | null) => {
    if (!questionId) return null;
    return questions.find((q) => q.id === questionId);
  };

  const handleSaveTest = async (testData: {
    name: string;
    description?: string;
    scaled_score_table?: { [key: string]: number };
    is_active: boolean;
    subject_id: string;
  }) => {
    if (editingTest) {
      const result = await updateTest(editingTest.id, testData);
      if (result) {
        setNotification({
          type: "success",
          message: "Test updated successfully",
        });
        loadTestsData();
      } else {
        throw new Error("Failed to update test");
      }
    } else {
      const result = await createTest(testData);
      if (result) {
        setNotification({
          type: "success",
          message: "Test created successfully",
        });
        loadTestsData();
      } else {
        throw new Error("Failed to create test");
      }
    }
    setEditingTest(null);
  };

  const handleSaveSubject = async (subjectData: {
    name: string;
    description?: string;
    color: string;
    is_active: boolean;
    display_order: number;
  }) => {
    if (editingSubject) {
      const result = await updateSubject(editingSubject.id, subjectData);
      if (result) {
        setNotification({
          type: "success",
          message: "Subject updated successfully",
        });
        loadSubjectsData();
      } else {
        throw new Error("Failed to update subject");
      }
    } else {
      const result = await createSubject(subjectData);
      if (result) {
        setNotification({
          type: "success",
          message: "Subject created successfully",
        });
        loadSubjectsData();
      } else {
        throw new Error("Failed to create subject");
      }
    }
    setEditingSubject(null);
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (subject.testCount && subject.testCount > 0) {
      setNotification({
        type: "error",
        message: `Cannot delete subject with ${subject.testCount} test(s). Please delete or reassign all tests first.`,
      });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${subject.name}"?`)) {
      return;
    }
    const success = await deleteSubject(subject.id);
    if (success) {
      setNotification({
        type: "success",
        message: "Subject deleted successfully",
      });
      loadSubjectsData();
    } else {
      setNotification({ type: "error", message: "Failed to delete subject" });
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setShowSubjectModal(true);
  };

  const handleCreateSubject = () => {
    setEditingSubject(null);
    setShowSubjectModal(true);
  };

  const handleDeleteTest = (test: Test) => {
    setDeleteTestModal({
      show: true,
      test,
      deleteQuestions: false,
      isDeleting: false,
    });
  };

  const confirmDeleteTest = async () => {
    if (!deleteTestModal.test) return;

    setDeleteTestModal((prev) => ({ ...prev, isDeleting: true }));

    try {
      let deletedQuestionsCount = 0;

      // Delete questions first if option is selected
      if (deleteTestModal.deleteQuestions) {
        const result = await deleteQuestionsForTest(deleteTestModal.test.id);
        if (!result.success) {
          setNotification({
            type: "error",
            message: "Failed to delete questions",
          });
          setDeleteTestModal((prev) => ({ ...prev, isDeleting: false }));
          return;
        }
        deletedQuestionsCount = result.count;
      }

      // Delete the test
      const success = await deleteTest(deleteTestModal.test.id);
      if (success) {
        const message =
          deleteTestModal.deleteQuestions && deletedQuestionsCount > 0
            ? `Test and ${deletedQuestionsCount} question${deletedQuestionsCount !== 1 ? "s" : ""} deleted successfully`
            : "Test deleted successfully";
        setNotification({ type: "success", message });
        loadTestsData();
        loadQuestions();
      } else {
        setNotification({ type: "error", message: "Failed to delete test" });
      }
    } finally {
      setDeleteTestModal({
        show: false,
        test: null,
        deleteQuestions: false,
        isDeleting: false,
      });
    }
  };

  const handleEditTest = (test: Test) => {
    setEditingTest(test);
    setShowTestModal(true);
  };

  const handleCreateTest = () => {
    setEditingTest(null);
    setShowTestModal(true);
  };

  // CSV parsing function - supports two formats:
  // Format 1 (old): Question, 1, 2, 3, 4, Correct
  // Format 2 (new): question_number, question_text, choice_1-4, correct_answer, Points, difficulty_level, Main Skill, [tags...]
  const parseCSV = (text: string) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    // Parse header row with quote handling
    const parseRow = (line: string): string[] => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    };

    const headerRow = parseRow(lines[0]);
    const header = headerRow.map((h) => h.trim().toLowerCase());

    // Detect format based on header columns
    const isNewFormat = header.includes("question_text") || header.includes("choice_1");

    let questionIdx: number;
    let correctIdx: number;
    let answerIndices: number[];
    let pointsIdx = -1;
    let difficultyIdx = -1;
    let mainSkillIdx = -1;
    let tagStartIdx = -1;

    if (isNewFormat) {
      // New format: question_text, choice_1-4, correct_answer, Points, difficulty_level, Main Skill, [tags...]
      questionIdx = header.findIndex((h) => h === "question_text");
      correctIdx = header.findIndex((h) => h === "correct_answer");
      answerIndices = [
        header.findIndex((h) => h === "choice_1"),
        header.findIndex((h) => h === "choice_2"),
        header.findIndex((h) => h === "choice_3"),
        header.findIndex((h) => h === "choice_4"),
      ];
      pointsIdx = header.findIndex((h) => h === "points");
      difficultyIdx = header.findIndex((h) => h === "difficulty_level");
      mainSkillIdx = header.findIndex((h) => h === "main skill");

      // All columns after Main Skill are tags
      if (mainSkillIdx !== -1) {
        tagStartIdx = mainSkillIdx + 1;
      }
    } else {
      // Old format: Question, 1, 2, 3, 4, Correct
      questionIdx = header.findIndex((h) => h === "question");
      correctIdx = header.findIndex((h) => h === "correct");
      answerIndices = [
        header.findIndex((h) => h === "1"),
        header.findIndex((h) => h === "2"),
        header.findIndex((h) => h === "3"),
        header.findIndex((h) => h === "4"),
      ];
    }

    if (questionIdx === -1)
      throw new Error('CSV must have a "Question" or "question_text" column');
    if (correctIdx === -1)
      throw new Error('CSV must have a "Correct" or "correct_answer" column');
    if (answerIndices.some((i) => i === -1))
      throw new Error('CSV must have answer columns (1-4 or choice_1-4)');

    const questions: Array<{
      question_text: string;
      answers: string[];
      correct_answer: number;
      points: number;
      difficulty: 'easy' | 'medium' | 'hard' | null;
      skills: string[];
      tags: string[];
    }> = [];

    // Parse each data row
    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i]);

      const questionText = values[questionIdx] || "";
      const answers = answerIndices.map((idx) => values[idx] || "");
      const correctAnswer = parseInt(values[correctIdx]) || 1;

      // Parse new format fields
      const points = pointsIdx !== -1 ? parseInt(values[pointsIdx]) || 1 : 1;
      const difficultyRaw = difficultyIdx !== -1 ? values[difficultyIdx]?.toLowerCase() : null;
      const difficulty: 'easy' | 'medium' | 'hard' | null =
        difficultyRaw === 'easy' ? 'easy' :
        difficultyRaw === 'medium' ? 'medium' :
        difficultyRaw === 'hard' ? 'hard' : null;

      // Main Skill goes into skills array
      const skills: string[] = [];
      if (mainSkillIdx !== -1 && values[mainSkillIdx]?.trim()) {
        skills.push(values[mainSkillIdx].trim());
      }

      // All columns after Main Skill are tags
      const tags: string[] = [];
      if (tagStartIdx !== -1) {
        for (let t = tagStartIdx; t < values.length; t++) {
          const tagValue = values[t]?.trim();
          if (tagValue) {
            tags.push(tagValue);
          }
        }
      }

      if (!questionText.trim()) continue; // Skip empty rows

      questions.push({
        question_text: questionText,
        answers,
        correct_answer: correctAnswer,
        points,
        difficulty,
        skills,
        tags,
      });
    }

    return questions;
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError(null);
    setCsvPreview([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setCsvPreview(parsed);
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (csvPreview.length === 0) return;

    // Require at least one test to be selected
    if (csvSelectedTestIds.length === 0) {
      setCsvError("Questions must be assigned to at least one test");
      return;
    }

    await performCsvUpload();
  };

  const performCsvUpload = async () => {
    setIsUploadingCsv(true);
    setCsvError(null);

    try {
      // Convert preview to database format
      const questionsToCreate = csvPreview.map((q, index) => ({
        name: null,
        question_text: q.question_text,
        question_image_url: null,
        reference_image_url: null,
        answers: q.answers,
        answer_image_urls: [null, null, null, null],
        answer_layout: "list" as const,
        correct_answer: q.correct_answer,
        explanation_text: "See solution in your notes.",
        explanation_image_url: null,
        skills: q.skills,
        tags: q.tags,
        difficulty: q.difficulty,
        points: q.points,
        passage_id: null,
        display_order: questions.length + index + 1,
      }));

      const result = await bulkCreateQuestions(questionsToCreate);

      if (!result.success) {
        throw new Error(result.error || "Failed to create questions");
      }

      // Assign questions to tests if any selected
      if (csvSelectedTestIds.length > 0 && result.data) {
        for (const question of result.data) {
          await setTestsForQuestion(question.id, csvSelectedTestIds);
        }
      }

      setNotification({
        type: "success",
        message: `Successfully uploaded ${csvPreview.length} questions!`,
      });

      // Reset modal state
      setShowCsvModal(false);
      setCsvFile(null);
      setCsvPreview([]);
      setCsvSelectedTestIds([]);

      // Reload questions
      loadQuestions();
      loadTestsData();

      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setCsvError(
        err instanceof Error ? err.message : "Failed to upload questions",
      );
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const sanitizeFilename = (filename: string): string => {
    // Remove special characters and spaces, replace with underscores or dashes
    return filename
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^\w.-]/g, "") // Remove special characters except dots, underscores, and dashes
      .toLowerCase();
  };

  const handleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (file: File | null) => void,
    setPreview: (preview: string | null) => void,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent, dropZone: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(dropZone);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    setImage: (file: File | null) => void,
    setPreview: (preview: string | null) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnswerImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setAnswerDraggedOver(index);
  };

  const handleAnswerImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnswerDraggedOver(null);
  };

  const handleAnswerImageDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setAnswerDraggedOver(null);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      // Read file as preview and update current form
      const reader = new FileReader();
      reader.onloadend = () => {
        currentForm.setAnswerImage(index, file, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingQ2Id(null);
    setEditingPassageId(null);
    q1Form.reset();
    q2Form.reset();
    // Auto-select the filtered test for new questions
    setSelectedTestIds(filterTestId !== "all" ? [filterTestId] : []);

    // Reset grouped question state
    setIsGroupedQuestion(false);
    setPassageText("");
    setPassageImage(null);
    setPassageImagePreview(null);
    setActiveQuestionTab(1);
  };

  // Toggle question selection for grouping
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedForGrouping((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      }
      // Limit to 2 questions
      if (prev.length >= 2) {
        return [...prev.slice(1), questionId];
      }
      return [...prev, questionId];
    });
  };

  // Handle linking selected questions
  const handleLinkQuestions = async () => {
    if (selectedForGrouping.length !== 2) {
      setNotification({
        type: "error",
        message: "Please select exactly 2 questions to group",
      });
      return;
    }

    // Check if any selected question is already grouped
    const alreadyGrouped = selectedForGrouping.some((id) => {
      const q = questions.find((q) => q.id === id);
      return q?.passage_id;
    });

    if (alreadyGrouped) {
      setNotification({
        type: "error",
        message:
          "One or more selected questions are already in a group. Ungroup them first.",
      });
      return;
    }

    setShowLinkModal(true);
  };

  // Confirm linking with passage
  const confirmLinkQuestions = async () => {
    if (selectedForGrouping.length !== 2) return;

    if (
      !linkPassageText.trim() &&
      !linkPassageImage &&
      !linkPassageImagePreview
    ) {
      setNotification({
        type: "error",
        message: "Please provide passage text or an image",
      });
      return;
    }

    setIsLinking(true);

    try {
      // Upload passage image if present
      let passageImageUrl: string | null = null;
      if (linkPassageImage) {
        const sanitizedName = linkPassageImage.name.replace(
          /[^a-zA-Z0-9.-]/g,
          "_",
        );
        passageImageUrl = await uploadImage(
          "question-images",
          linkPassageImage,
          `passages/${Date.now()}-${sanitizedName}`,
        );
      }

      const result = await linkQuestionsToNewPassage(selectedForGrouping, {
        passage_text: linkPassageText.trim() || null,
        passage_image_url: passageImageUrl,
      });

      if (result && result.updatedCount === 2) {
        setNotification({
          type: "success",
          message: "Questions linked successfully!",
        });
        // Reset link modal state
        setShowLinkModal(false);
        setSelectedForGrouping([]);
        setLinkPassageText("");
        setLinkPassageImage(null);
        setLinkPassageImagePreview(null);
        // Refresh questions
        loadQuestions();
      } else {
        throw new Error("Failed to link all questions");
      }
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to link questions",
      });
    } finally {
      setIsLinking(false);
    }
  };

  // Cancel linking
  const cancelLinkQuestions = () => {
    setShowLinkModal(false);
    setLinkPassageText("");
    setLinkPassageImage(null);
    setLinkPassageImagePreview(null);
  };

  const loadQuestionForEdit = async (
    question: DatabaseQuestion & { passages?: DatabasePassage | null },
  ) => {
    // Check if this is a grouped question (has a passage_id)
    if (question.passage_id) {
      // Find sibling question with the same passage_id
      const siblingQuestion = questions.find(
        (q) => q.id !== question.id && q.passage_id === question.passage_id,
      );

      if (siblingQuestion) {
        // Determine which question is Q1 and Q2 based on display_order or created_at
        const questionsOrdered = [question, siblingQuestion].sort((a, b) => {
          if (a.display_order !== undefined && b.display_order !== undefined) {
            return a.display_order - b.display_order;
          }
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });

        const [q1, q2] = questionsOrdered;

        // Set editing IDs - track both questions and the passage
        setEditingId(q1.id);
        setEditingQ2Id(q2.id);
        setEditingPassageId(question.passage_id);
        setIsGroupedQuestion(true);
        setActiveQuestionTab(1);

        // Load passage data
        const passage = question.passages;
        setPassageText(passage?.passage_text || "");
        setPassageImagePreview(passage?.passage_image_url || null);
        setPassageImage(null);

        // Load Q1
        q1Form.loadFromQuestion({
          name: q1.name,
          question_text: q1.question_text,
          question_image_url: q1.question_image_url,
          reference_image_url: q1.reference_image_url,
          explanation_image_url: q1.explanation_image_url,
          answers: q1.answers,
          answer_image_urls: q1.answer_image_urls,
          answer_layout: q1.answer_layout,
          correct_answer: q1.correct_answer,
          explanation_text: q1.explanation_text,
          skills: q1.skills || [],
          tags: q1.tags || [],
          difficulty: q1.difficulty,
          points: q1.points,
        });

        // Load Q2
        q2Form.loadFromQuestion({
          name: q2.name,
          question_text: q2.question_text,
          question_image_url: q2.question_image_url,
          reference_image_url: q2.reference_image_url,
          explanation_image_url: q2.explanation_image_url,
          answers: q2.answers,
          answer_image_urls: q2.answer_image_urls,
          answer_layout: q2.answer_layout,
          correct_answer: q2.correct_answer,
          explanation_text: q2.explanation_text,
          skills: q2.skills || [],
          tags: q2.tags || [],
          difficulty: q2.difficulty,
          points: q2.points,
        });

        // Load tests for Q1 (both questions should be in same tests)
        const questionTestIds = await getTestsForQuestion(q1.id);
        setSelectedTestIds(questionTestIds);

        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    // Regular single question editing
    setEditingId(question.id);
    setEditingQ2Id(null);
    setEditingPassageId(null);
    setIsGroupedQuestion(false);
    q1Form.loadFromQuestion({
      name: question.name,
      question_text: question.question_text,
      question_image_url: question.question_image_url,
      reference_image_url: question.reference_image_url,
      explanation_image_url: question.explanation_image_url,
      answers: question.answers,
      answer_image_urls: question.answer_image_urls,
      answer_layout: question.answer_layout,
      correct_answer: question.correct_answer,
      explanation_text: question.explanation_text,
      skills: question.skills || [],
      tags: question.tags || [],
      difficulty: question.difficulty,
      points: question.points,
    });

    // Load tests this question belongs to
    const questionTestIds = await getTestsForQuestion(question.id);
    setSelectedTestIds(questionTestIds);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    const success = await deleteQuestion(id);
    if (success) {
      setNotification({
        type: "success",
        message: "Question deleted successfully",
      });
      loadQuestions();
      if (editingId === id) {
        resetForm();
      }
    } else {
      setNotification({ type: "error", message: "Failed to delete question" });
    }
  };

  const handleQuestionDragStart = (e: React.DragEvent, questionId: string) => {
    dropSuccessRef.current = false;
    setDraggedQuestionId(questionId);
    setDraggedGroupId(null);
    setOriginalQuestions([...questions]);
    // Save original test order if filtering by test
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      setOriginalTestOrder({ ...testQuestionOrder });
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", questionId);
  };

  const handleGroupDragStart = (e: React.DragEvent, passageId: string, questionIds: string[]) => {
    dropSuccessRef.current = false;
    setDraggedGroupId(passageId);
    setDraggedQuestionId(questionIds[0]); // Use first question ID for compatibility
    setOriginalQuestions([...questions]);
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      setOriginalTestOrder({ ...testQuestionOrder });
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `group:${passageId}`);
  };

  const handleQuestionDragOver = (e: React.DragEvent, questionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!draggedQuestionId || draggedQuestionId === questionId) return;

    // Check if target is in the same group as dragged
    const targetQuestion = questions.find((q) => q.id === questionId);
    if (draggedGroupId && targetQuestion?.passage_id === draggedGroupId) return;

    // When a test filter is active, update test-specific order for visual feedback
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      const currentOrder = { ...testQuestionOrder };

      if (draggedGroupId) {
        // Handle grouped question drag - move all questions in the group
        const groupQuestionIds = questions
          .filter((q) => q.passage_id === draggedGroupId)
          .map((q) => q.id);

        const entries = Object.entries(currentOrder).sort((a, b) => a[1] - b[1]);
        const targetIdx = entries.findIndex(([id]) => id === questionId);
        if (targetIdx === -1) return;

        // Remove all group questions from entries
        const filteredEntries = entries.filter(([id]) => !groupQuestionIds.includes(id));
        const groupEntries = entries.filter(([id]) => groupQuestionIds.includes(id));

        // Find where to insert (adjust for removed items)
        let insertIdx = filteredEntries.findIndex(([id]) => id === questionId);
        if (insertIdx === -1) insertIdx = filteredEntries.length;

        // Insert group entries at target position
        filteredEntries.splice(insertIdx, 0, ...groupEntries);

        // Rebuild order map
        const newOrder: { [questionId: string]: number } = {};
        filteredEntries.forEach(([id], index) => {
          newOrder[id] = index;
        });

        setTestQuestionOrder(newOrder);
      } else {
        // Single question drag
        const draggedOrder = currentOrder[draggedQuestionId];
        const targetOrder = currentOrder[questionId];

        if (draggedOrder === undefined || targetOrder === undefined) return;
        if (draggedOrder === targetOrder) return;

        const newOrder: { [questionId: string]: number } = {};
        const entries = Object.entries(currentOrder).sort((a, b) => a[1] - b[1]);
        const draggedIdx = entries.findIndex(([id]) => id === draggedQuestionId);
        const targetIdx = entries.findIndex(([id]) => id === questionId);

        if (draggedIdx === -1 || targetIdx === -1) return;

        const [draggedEntry] = entries.splice(draggedIdx, 1);
        entries.splice(targetIdx, 0, draggedEntry);

        entries.forEach(([id], index) => {
          newOrder[id] = index;
        });

        setTestQuestionOrder(newOrder);
      }
    } else {
      // No test filter - reorder global question list
      if (draggedGroupId) {
        // Handle grouped question drag
        const groupQuestions = questions.filter((q) => q.passage_id === draggedGroupId);
        const groupQuestionIds = groupQuestions.map((q) => q.id);

        const targetIndex = questions.findIndex((q) => q.id === questionId);
        if (targetIndex === -1) return;

        // Remove group questions from list
        const newQuestions = questions.filter((q) => !groupQuestionIds.includes(q.id));

        // Find new target index (adjusted for removed items)
        let newTargetIndex = newQuestions.findIndex((q) => q.id === questionId);
        if (newTargetIndex === -1) newTargetIndex = newQuestions.length;

        // Insert group questions at target
        newQuestions.splice(newTargetIndex, 0, ...groupQuestions);
        setQuestions(newQuestions);
      } else {
        // Single question drag
        const draggedIndex = questions.findIndex(
          (q) => q.id === draggedQuestionId,
        );
        const targetIndex = questions.findIndex((q) => q.id === questionId);

        if (
          draggedIndex === -1 ||
          targetIndex === -1 ||
          draggedIndex === targetIndex
        )
          return;

        const newQuestions = [...questions];
        const [draggedQuestion] = newQuestions.splice(draggedIndex, 1);
        newQuestions.splice(targetIndex, 0, draggedQuestion);
        setQuestions(newQuestions);
      }
    }
  };

  const handleQuestionDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dropSuccessRef.current = true;

    // Clear drag state
    setDraggedQuestionId(null);
    setDraggedGroupId(null);
    setOriginalQuestions(null);
    setOriginalTestOrder(null);

    // Check if we're filtering by a specific test
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      // Get question IDs sorted by the current test order state
      const sortedEntries = Object.entries(testQuestionOrder).sort(
        (a, b) => a[1] - b[1],
      );

      // Update test-specific order
      const testOrders = sortedEntries.map(([questionId], index) => ({
        questionId,
        display_order: index + 1,
      }));

      const success = await updateTestQuestionOrders(filterTestId, testOrders);
      if (!success) {
        setNotification({
          type: "error",
          message: "Failed to save question order for this test",
        });
        // Reload test order on failure
        const testQuestions = await fetchQuestionsForTest(filterTestId);
        const orderMap: { [questionId: string]: number } = {};
        testQuestions.forEach((q, index) => {
          orderMap[q.id] = index;
        });
        setTestQuestionOrder(orderMap);
      }
    } else {
      // Update global question order
      const currentQuestions = [...questions];
      const orders = currentQuestions.map((q, index) => ({
        id: q.id,
        display_order: index + 1,
      }));

      const success = await updateQuestionOrders(orders);
      if (!success) {
        setNotification({
          type: "error",
          message: "Failed to save question order",
        });
        loadQuestions();
      }
    }
  };

  const handleQuestionDragEnd = () => {
    // Only restore if drop didn't succeed (drag was cancelled)
    if (!dropSuccessRef.current) {
      if (originalQuestions) {
        setQuestions(originalQuestions);
      }
      if (originalTestOrder) {
        setTestQuestionOrder(originalTestOrder);
      }
    }
    setDraggedQuestionId(null);
    setDraggedGroupId(null);
    setOriginalQuestions(null);
    setOriginalTestOrder(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const q1 = q1Form.state;
    const q2 = q2Form.state;

    // Validate that either question text or image is provided
    const hasQuestionText = q1.questionText.trim();
    const hasQuestionImage = q1.questionImage || q1.questionImagePreview;
    if (!hasQuestionText && !hasQuestionImage) {
      setNotification({
        type: "error",
        message: "Question 1 must have either text or image (or both)",
      });
      return;
    }

    // Validate that each answer has either text or image (or both)
    for (let i = 0; i < 4; i++) {
      const hasText = q1.answers[i]?.trim();
      const hasImage = q1.answerImages[i] || q1.answerImagePreviews[i];
      if (!hasText && !hasImage) {
        setNotification({
          type: "error",
          message: `Question 1 Answer ${i + 1} must have either text or image (or both)`,
        });
        return;
      }
    }

    if (!q1.explanationText.trim()) {
      setNotification({
        type: "error",
        message: "Question 1 explanation text is required",
      });
      return;
    }

    if (q1.selectedSkills.length === 0) {
      setNotification({
        type: "error",
        message: "At least one skill is required",
      });
      return;
    }

    if (selectedTestIds.length === 0) {
      setNotification({
        type: "error",
        message: "Question must be assigned to at least one test",
      });
      return;
    }

    // Additional validation for grouped questions
    if (isGroupedQuestion) {
      if (!passageText.trim() && !passageImage && !passageImagePreview) {
        setNotification({
          type: "error",
          message: "Grouped questions must have a passage (text or image)",
        });
        return;
      }

      const hasQ2Text = q2.questionText.trim();
      const hasQ2Image = q2.questionImage || q2.questionImagePreview;
      if (!hasQ2Text && !hasQ2Image) {
        setNotification({
          type: "error",
          message: "Question 2 must have either text or image (or both)",
        });
        return;
      }

      for (let i = 0; i < 4; i++) {
        const hasText = q2.answers[i]?.trim();
        const hasImage = q2.answerImages[i] || q2.answerImagePreviews[i];
        if (!hasText && !hasImage) {
          setNotification({
            type: "error",
            message: `Question 2 Answer ${i + 1} must have either text or image (or both)`,
          });
          return;
        }
      }

      if (!q2.explanationText.trim()) {
        setNotification({
          type: "error",
          message: "Question 2 explanation text is required",
        });
        return;
      }
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      // Handle grouped questions
      if (isGroupedQuestion && !editingId) {
        // Upload passage image if present
        let passageImageUrl: string | null = null;
        if (passageImage) {
          const sanitizedName = sanitizeFilename(passageImage.name);
          passageImageUrl = await uploadImage(
            "question-images",
            passageImage,
            `passages/${Date.now()}-${sanitizedName}`,
          );
        }

        // Upload Q1 images
        let q1ImageUrl: string | null = null;
        if (q1.questionImage) {
          const sanitizedName = sanitizeFilename(q1.questionImage.name);
          q1ImageUrl = await uploadImage(
            "question-images",
            q1.questionImage,
            `questions/${Date.now()}-q1-${sanitizedName}`,
          );
        }

        let q1ExplanationImageUrl: string | null = null;
        if (q1.explanationImage) {
          const sanitizedName = sanitizeFilename(q1.explanationImage.name);
          q1ExplanationImageUrl = await uploadImage(
            "explanation-images",
            q1.explanationImage,
            `explanations/${Date.now()}-q1-${sanitizedName}`,
          );
        }

        const q1AnswerImageUrls = await Promise.all(
          q1.answerImages.map(async (img, index) => {
            if (img) {
              const sanitizedName = sanitizeFilename(img.name);
              return await uploadImage(
                "answer-images",
                img,
                `answers/${Date.now()}-q1-${index}-${sanitizedName}`,
              );
            }
            return q1.answerImagePreviews[index] || null;
          }),
        );

        // Upload Q2 images
        let q2ImageUrl: string | null = null;
        if (q2.questionImage) {
          const sanitizedName = sanitizeFilename(q2.questionImage.name);
          q2ImageUrl = await uploadImage(
            "question-images",
            q2.questionImage,
            `questions/${Date.now()}-q2-${sanitizedName}`,
          );
        }

        let q2ExplanationImageUrl: string | null = null;
        if (q2.explanationImage) {
          const sanitizedName = sanitizeFilename(q2.explanationImage.name);
          q2ExplanationImageUrl = await uploadImage(
            "explanation-images",
            q2.explanationImage,
            `explanations/${Date.now()}-q2-${sanitizedName}`,
          );
        }

        const q2AnswerImageUrls = await Promise.all(
          q2.answerImages.map(async (img, index) => {
            if (img) {
              const sanitizedName = sanitizeFilename(img.name);
              return await uploadImage(
                "answer-images",
                img,
                `answers/${Date.now()}-q2-${index}-${sanitizedName}`,
              );
            }
            return q2.answerImagePreviews[index] || null;
          }),
        );

        // Create passage with both questions
        const result = await createPassageWithQuestions(
          {
            passage_text: passageText.trim() || null,
            passage_image_url: passageImageUrl,
          },
          [
            {
              name: q1.questionName.trim() || null,
              question_text: q1.questionText.trim() || null,
              question_image_url: q1ImageUrl,
              reference_image_url: null,
              answers: q1.answers,
              answer_image_urls: q1AnswerImageUrls,
              answer_layout: q1.answerLayout,
              correct_answer: q1.correctAnswer,
              explanation_text: q1.explanationText,
              explanation_image_url: q1ExplanationImageUrl,
              skills: q1.selectedSkills,
              tags: q1.selectedTags,
              difficulty: (q1.difficulty as 'easy' | 'medium' | 'hard') || null,
              points: q1.points,
            },
            {
              name: q2.questionName.trim() || null,
              question_text: q2.questionText.trim() || null,
              question_image_url: q2ImageUrl,
              reference_image_url: null,
              answers: q2.answers,
              answer_image_urls: q2AnswerImageUrls,
              answer_layout: q2.answerLayout,
              correct_answer: q2.correctAnswer,
              explanation_text: q2.explanationText,
              explanation_image_url: q2ExplanationImageUrl,
              skills: q1.selectedSkills, // Share skills from Q1
              tags: q1.selectedTags, // Share tags from Q1
              difficulty: (q1.difficulty as 'easy' | 'medium' | 'hard') || null, // Share difficulty from Q1
              points: q2.points,
            },
          ],
        );

        if (result) {
          // Assign both questions to selected tests
          for (const question of result.questions) {
            await setTestsForQuestion(question.id, selectedTestIds);
          }

          setNotification({
            type: "success",
            message: "Grouped questions created successfully!",
          });
          resetForm();
          loadQuestions();
          loadTestsData();
          setTimeout(() => setNotification(null), 3000);
        } else {
          throw new Error("Failed to create grouped questions");
        }
      } else if (
        isGroupedQuestion &&
        editingId &&
        editingQ2Id &&
        editingPassageId
      ) {
        // Edit grouped questions - update passage and both questions

        // Upload passage image if a new one is selected
        let passageImageUrl: string | null = passageImagePreview;
        if (passageImage) {
          const sanitizedName = sanitizeFilename(passageImage.name);
          passageImageUrl = await uploadImage(
            "question-images",
            passageImage,
            `passages/${Date.now()}-${sanitizedName}`,
          );
        }

        // Update the passage
        const passageResult = await updatePassage(editingPassageId, {
          passage_text: passageText.trim() || null,
          passage_image_url: passageImageUrl,
        });

        if (!passageResult) {
          throw new Error("Failed to update passage");
        }

        // Upload Q1 images
        let q1ImageUrl = q1.questionImagePreview;
        if (q1.questionImage) {
          const sanitizedName = sanitizeFilename(q1.questionImage.name);
          q1ImageUrl = await uploadImage(
            "question-images",
            q1.questionImage,
            `questions/${Date.now()}-q1-${sanitizedName}`,
          );
        }

        let q1ExplanationImageUrl = q1.explanationImagePreview;
        if (q1.explanationImage) {
          const sanitizedName = sanitizeFilename(q1.explanationImage.name);
          q1ExplanationImageUrl = await uploadImage(
            "explanation-images",
            q1.explanationImage,
            `explanations/${Date.now()}-q1-${sanitizedName}`,
          );
        }

        const q1AnswerImageUrls = await Promise.all(
          q1.answerImages.map(async (img, index) => {
            if (img) {
              const sanitizedName = sanitizeFilename(img.name);
              return await uploadImage(
                "answer-images",
                img,
                `answers/${Date.now()}-q1-${index}-${sanitizedName}`,
              );
            }
            return q1.answerImagePreviews[index] || null;
          }),
        );

        // Upload Q2 images
        let q2ImageUrl = q2.questionImagePreview;
        if (q2.questionImage) {
          const sanitizedName = sanitizeFilename(q2.questionImage.name);
          q2ImageUrl = await uploadImage(
            "question-images",
            q2.questionImage,
            `questions/${Date.now()}-q2-${sanitizedName}`,
          );
        }

        let q2ExplanationImageUrl = q2.explanationImagePreview;
        if (q2.explanationImage) {
          const sanitizedName = sanitizeFilename(q2.explanationImage.name);
          q2ExplanationImageUrl = await uploadImage(
            "explanation-images",
            q2.explanationImage,
            `explanations/${Date.now()}-q2-${sanitizedName}`,
          );
        }

        const q2AnswerImageUrls = await Promise.all(
          q2.answerImages.map(async (img, index) => {
            if (img) {
              const sanitizedName = sanitizeFilename(img.name);
              return await uploadImage(
                "answer-images",
                img,
                `answers/${Date.now()}-q2-${index}-${sanitizedName}`,
              );
            }
            return q2.answerImagePreviews[index] || null;
          }),
        );

        // Update Q1
        const q1Result = await updateQuestion(editingId, {
          name: q1.questionName.trim() || null,
          question_text: q1.questionText.trim() || null,
          question_image_url: q1ImageUrl || null,
          reference_image_url: null,
          answers: q1.answers,
          answer_image_urls: q1AnswerImageUrls,
          answer_layout: q1.answerLayout,
          correct_answer: q1.correctAnswer,
          explanation_text: q1.explanationText,
          explanation_image_url: q1ExplanationImageUrl || null,
          skills: q1.selectedSkills,
          tags: q1.selectedTags,
          difficulty: (q1.difficulty as 'easy' | 'medium' | 'hard') || null,
          points: q1.points,
        });

        // Update Q2
        const q2Result = await updateQuestion(editingQ2Id, {
          name: q2.questionName.trim() || null,
          question_text: q2.questionText.trim() || null,
          question_image_url: q2ImageUrl || null,
          reference_image_url: null,
          answers: q2.answers,
          answer_image_urls: q2AnswerImageUrls,
          answer_layout: q2.answerLayout,
          correct_answer: q2.correctAnswer,
          explanation_text: q2.explanationText,
          explanation_image_url: q2ExplanationImageUrl || null,
          skills: q1.selectedSkills, // Share skills from Q1
          tags: q1.selectedTags, // Share tags from Q1
          difficulty: (q1.difficulty as 'easy' | 'medium' | 'hard') || null, // Share difficulty from Q1
          points: q2.points,
        });

        if (q1Result && q2Result) {
          // Update test assignments for both questions
          await setTestsForQuestion(editingId, selectedTestIds);
          await setTestsForQuestion(editingQ2Id, selectedTestIds);

          setNotification({
            type: "success",
            message: "Grouped questions updated successfully!",
          });
          resetForm();
          loadQuestions();
          loadTestsData();
          setTimeout(() => setNotification(null), 3000);
        } else {
          throw new Error("Failed to update grouped questions");
        }
      } else {
        // Single question creation/update (existing logic)
        let questionImageUrl = q1.questionImagePreview;
        if (q1.questionImage) {
          const sanitizedName = sanitizeFilename(q1.questionImage.name);
          questionImageUrl = await uploadImage(
            "question-images",
            q1.questionImage,
            `questions/${Date.now()}-${sanitizedName}`,
          );
          if (!questionImageUrl)
            throw new Error("Failed to upload question image");
        }

        let referenceImageUrl = q1.referenceImagePreview;
        if (q1.referenceImage) {
          const sanitizedName = sanitizeFilename(q1.referenceImage.name);
          referenceImageUrl = await uploadImage(
            "reference-images",
            q1.referenceImage,
            `references/${Date.now()}-${sanitizedName}`,
          );
        }

        let explanationImageUrl = q1.explanationImagePreview;
        if (q1.explanationImage) {
          const sanitizedName = sanitizeFilename(q1.explanationImage.name);
          explanationImageUrl = await uploadImage(
            "explanation-images",
            q1.explanationImage,
            `explanations/${Date.now()}-${sanitizedName}`,
          );
        }

        // Upload answer images
        const answerImageUrls = await Promise.all(
          q1.answerImages.map(async (img, index) => {
            if (img) {
              const sanitizedName = sanitizeFilename(img.name);
              return await uploadImage(
                "answer-images",
                img,
                `answers/${Date.now()}-${index}-${sanitizedName}`,
              );
            }
            return q1.answerImagePreviews[index] || null;
          }),
        );

        const questionData = {
          name: q1.questionName.trim() || null,
          question_text: q1.questionText.trim() || null,
          question_image_url: questionImageUrl || null,
          reference_image_url: referenceImageUrl,
          answers: q1.answers,
          answer_image_urls: answerImageUrls,
          answer_layout: q1.answerLayout,
          correct_answer: q1.correctAnswer,
          explanation_text: q1.explanationText,
          explanation_image_url: explanationImageUrl,
          skills: q1.selectedSkills,
          tags: q1.selectedTags,
          difficulty: (q1.difficulty as 'easy' | 'medium' | 'hard') || null,
          points: q1.points,
          passage_id: null,
        };

        let result;
        let questionId: string;
        if (editingId) {
          result = await updateQuestion(editingId, questionData);
          questionId = editingId;
        } else {
          result = await createQuestion(questionData);
          questionId = result?.id || "";
        }

        if (result) {
          // Save test assignments
          if (questionId) {
            await setTestsForQuestion(questionId, selectedTestIds);
          }

          setNotification({
            type: "success",
            message: editingId
              ? "Question updated successfully!"
              : "Question created successfully!",
          });
          resetForm();
          loadQuestions();
          loadTestsData(); // Refresh test question counts
          setTimeout(() => setNotification(null), 3000);
        } else {
          throw new Error("Failed to save question");
        }
      }
    } catch (error) {
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-4">
      <div className="max-w-7xl mx-auto px-4">
        {/* Compact Header */}
        <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              {user && <p className="text-sm text-gray-600">{user.email}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="text-sm px-4 py-2 font-bold text-gray-700 border-2 border-gray-300 hover:border-black hover:bg-gray-50 active:scale-95 rounded-xl transition-all"
              >
                LOGOUT
              </button>
              <button
                onClick={() => router.push("/")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab("questions");
                setNotification(null);
              }}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === "questions"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Questions
            </button>
            <button
              onClick={() => {
                setActiveTab("tests");
                setNotification(null);
              }}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === "tests"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tests ({tests.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("subjects");
                setNotification(null);
              }}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === "subjects"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Subjects ({subjects.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("bugs");
                setNotification(null);
              }}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "bugs"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Bug Reports
              {bugCounts.open > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === "bugs"
                      ? "bg-white text-black"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {bugCounts.open}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tests Tab Content */}
        {activeTab === "tests" && (
          <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Manage Tests</h2>
              <button
                onClick={handleCreateTest}
                className="px-4 py-2 text-sm font-bold bg-black text-white rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
              >
                + NEW TEST
              </button>
            </div>

            {/* Subject Filter */}
            {subjects.length > 1 && (
              <div className="mb-4">
                <select
                  value={filterSubjectId}
                  onChange={(e) => setFilterSubjectId(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-black focus:outline-none"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLoadingTests ? (
              <div className="text-center py-8 text-gray-500">
                Loading tests...
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tests yet. Create your first test to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {tests
                  .filter(
                    (test) =>
                      filterSubjectId === "all" ||
                      test.subjectId === filterSubjectId,
                  )
                  .map((test) => (
                    <div
                      key={test.id}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 truncate">
                              {test.name}
                            </h3>
                            {!test.isActive && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          {test.description && (
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {test.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                            {test.subjectName && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                                {test.subjectName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
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
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                              </svg>
                              {test.questionCount || 0} questions
                            </span>
                            {test.scaledScoreTable && (
                              <span className="flex items-center gap-1">
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
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                  />
                                </svg>
                                Custom score table
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEditTest(test)}
                            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg active:scale-95 transition-all"
                            title="Edit test"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTest(test)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg active:scale-95 transition-all"
                            title="Delete test"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Subjects Tab Content */}
        {activeTab === "subjects" && (
          <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Manage Subjects
              </h2>
              <button
                onClick={handleCreateSubject}
                className="px-4 py-2 text-sm font-bold bg-black text-white rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
              >
                + NEW SUBJECT
              </button>
            </div>

            {isLoadingSubjects ? (
              <div className="text-center py-8 text-gray-500">
                Loading subjects...
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No subjects yet. Create your first subject to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 truncate">
                            {subject.name}
                          </h3>
                          {!subject.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {subject.description && (
                          <p className="text-sm text-gray-600 truncate mb-2">
                            {subject.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
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
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            {subject.testCount || 0} tests
                          </span>
                          <span className="text-gray-400">
                            Order: {subject.displayOrder}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditSubject(subject)}
                          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg active:scale-95 transition-all"
                          title="Edit subject"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(subject)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg active:scale-95 transition-all"
                          title="Delete subject"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bug Reports Tab Content */}
        {activeTab === "bugs" && (
          <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Bug Reports</h2>
              <p className="text-sm text-gray-500">
                {bugCounts.open + bugCounts.reviewed + bugCounts.resolved} total
                reports
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setBugStatusFilter("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  bugStatusFilter === "all"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All ({bugCounts.open + bugCounts.reviewed + bugCounts.resolved})
              </button>
              <button
                onClick={() => setBugStatusFilter("open")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  bugStatusFilter === "open"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                Open ({bugCounts.open})
              </button>
              <button
                onClick={() => setBugStatusFilter("reviewed")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  bugStatusFilter === "reviewed"
                    ? "bg-yellow-500 text-white"
                    : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                }`}
              >
                Reviewed ({bugCounts.reviewed})
              </button>
              <button
                onClick={() => setBugStatusFilter("resolved")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  bugStatusFilter === "resolved"
                    ? "bg-green-600 text-white"
                    : "bg-green-50 text-green-700 hover:bg-green-100"
                }`}
              >
                Resolved ({bugCounts.resolved})
              </button>
            </div>

            {/* Bug Reports List */}
            {isLoadingBugs ? (
              <div className="text-center py-8 text-gray-500">
                Loading reports...
              </div>
            ) : bugReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {bugStatusFilter === "all"
                  ? "No bug reports yet."
                  : `No ${bugStatusFilter} reports.`}
              </div>
            ) : (
              <div className="space-y-3">
                {bugReports.map((report) => {
                  const question = getQuestionPreview(report.question_id);
                  const isExpanded = expandedBugId === report.id;

                  return (
                    <div
                      key={report.id}
                      className="border-2 border-gray-200 rounded-xl overflow-hidden"
                    >
                      {/* Report Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() =>
                          setExpandedBugId(isExpanded ? null : report.id)
                        }
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {/* Status Badge */}
                              <span
                                className={`px-2 py-0.5 text-xs font-bold rounded ${
                                  report.status === "open"
                                    ? "bg-red-100 text-red-700"
                                    : report.status === "reviewed"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-green-100 text-green-700"
                                }`}
                              >
                                {report.status.toUpperCase()}
                              </span>

                              {/* Question Number */}
                              {report.question_number && (
                                <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 rounded">
                                  Q#{report.question_number}
                                </span>
                              )}

                              {/* Test Name */}
                              {report.test_id &&
                                testNamesMap[report.test_id] && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                                    {testNamesMap[report.test_id]}
                                  </span>
                                )}

                              {/* Has Screenshot */}
                              {report.screenshot_url && (
                                <span
                                  className="text-purple-500"
                                  title="Has screenshot"
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
                                </span>
                              )}
                            </div>

                            {/* Description Preview */}
                            <p className="text-sm text-gray-900 line-clamp-2">
                              {report.description}
                            </p>

                            {/* Date */}
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(report.created_at)}
                            </p>
                          </div>

                          {/* Expand Icon */}
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                              isExpanded ? "rotate-180" : ""
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
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          {/* Full Description */}
                          <div className="mb-4">
                            <h4 className="text-xs font-bold text-gray-700 mb-1">
                              Description
                            </h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">
                              {report.description}
                            </p>
                          </div>

                          {/* Screenshot */}
                          {report.screenshot_url && (
                            <div className="mb-4">
                              <h4 className="text-xs font-bold text-gray-700 mb-2">
                                Screenshot
                              </h4>
                              <a
                                href={report.screenshot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={report.screenshot_url}
                                  alt="Bug screenshot"
                                  className="max-w-sm rounded-lg border border-gray-300 hover:opacity-90 transition-opacity"
                                />
                              </a>
                            </div>
                          )}

                          {/* Question Preview */}
                          {question && (
                            <div className="mb-4">
                              <h4 className="text-xs font-bold text-gray-700 mb-2">
                                Question Preview
                              </h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
                                {/* Question Info Header */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {report.question_number && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-black text-white rounded">
                                      Question #{report.question_number}
                                    </span>
                                  )}
                                  {report.test_id &&
                                    testNamesMap[report.test_id] && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                        {testNamesMap[report.test_id]}
                                      </span>
                                    )}
                                  {question.skills &&
                                    question.skills.length > 0 && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded">
                                        {question.skills.join(", ")}
                                      </span>
                                    )}
                                </div>

                                {question.question_image_url && (
                                  <img
                                    src={question.question_image_url}
                                    alt="Question"
                                    className="max-w-xs rounded mb-2"
                                  />
                                )}
                                {question.question_text && (
                                  <div className="text-sm text-gray-800 mb-2">
                                    <MathText text={question.question_text} />
                                  </div>
                                )}
                                <div className="text-xs text-green-700 mt-2 pt-2 border-t border-gray-100">
                                  <span className="font-semibold">
                                    Correct Answer:
                                  </span>{" "}
                                  ({question.correct_answer}){" "}
                                  <MathText
                                    text={
                                      question.answers[
                                        question.correct_answer - 1
                                      ]
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {report.status !== "reviewed" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBugStatusChange(report.id, "reviewed");
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 active:scale-95 transition-all"
                              >
                                Mark Reviewed
                              </button>
                            )}
                            {report.status !== "resolved" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBugStatusChange(report.id, "resolved");
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all"
                              >
                                Mark Resolved
                              </button>
                            )}
                            {report.status === "resolved" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBugStatusChange(report.id, "open");
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-gray-500 text-white rounded-lg hover:bg-gray-600 active:scale-95 transition-all"
                              >
                                Reopen
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBug(report.id);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-red-600 border-2 border-red-200 rounded-lg hover:bg-red-50 active:scale-95 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Questions Tab Content */}
        {activeTab === "questions" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Questions List */}
            <div className="lg:col-span-1">
              <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] flex flex-col">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h2 className="text-base font-bold text-gray-900">
                    Questions (
                    {
                      questions.filter((q) => {
                        const matchesTest =
                          filterTestId === "all" ||
                          questionTestMap[q.id]?.includes(filterTestId);
                        if (!matchesTest) return false;
                        if (!searchQuery.trim()) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          q.name?.toLowerCase().includes(query) ||
                          q.question_text?.toLowerCase().includes(query) ||
                          (q.skills || []).some((t) =>
                            t.toLowerCase().includes(query),
                          ) ||
                          q.answers.some((a) =>
                            a?.toLowerCase().includes(query),
                          )
                        );
                      }).length
                    }
                    )
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                    {selectedForGrouping.length > 0 && (
                      <>
                        <span className="text-xs px-2 py-2 text-purple-700 font-medium">
                          {selectedForGrouping.length}/2 selected
                        </span>
                        <button
                          onClick={() => setSelectedForGrouping([])}
                          className="text-xs px-2 py-2 font-bold text-gray-500 hover:text-gray-700"
                          title="Clear selection"
                        >
                          Clear
                        </button>
                        {selectedForGrouping.length === 2 && (
                          <button
                            onClick={handleLinkQuestions}
                            className="text-xs px-3 py-2 font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition-all"
                            title="Group selected questions together"
                          >
                            Group Selected
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setShowCsvModal(true)}
                      className="text-xs px-3 py-2 font-bold border-2 border-gray-300 text-gray-700 rounded-xl hover:border-black hover:bg-gray-50 active:scale-95 transition-all"
                      title="Bulk upload questions from CSV"
                    >
                      Upload CSV
                    </button>
                    {editingId && (
                      <button
                        onClick={resetForm}
                        className="text-xs px-3 py-2 font-bold bg-black text-white rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
                        title="Clear form and add new question"
                      >
                        + NEW
                      </button>
                    )}
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="mb-3 flex-shrink-0 space-y-2">
                  {/* Search Input */}
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search questions..."
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                      >
                        <svg
                          className="w-4 h-4 text-gray-400"
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
                    )}
                  </div>

                  {/* Test Filter Dropdown */}
                  <select
                    value={filterTestId}
                    onChange={(e) => {
                      const newTestId = e.target.value;
                      setFilterTestId(newTestId);
                      // Reset form when changing filter (clears edit mode)
                      resetForm();
                      // Set the new test as selected for new questions
                      setSelectedTestIds(
                        newTestId !== "all" ? [newTestId] : [],
                      );
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="all">All Questions</option>
                    {tests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.name} ({test.questionCount || 0})
                      </option>
                    ))}
                  </select>
                </div>

                {isLoadingQuestions ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Loading...
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No questions yet
                  </div>
                ) : (
                  <div
                    className="space-y-1 overflow-y-auto flex-1"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleQuestionDrop}
                  >
                    {(() => {
                      // Filter and sort questions first
                      const filteredQuestions = questions
                        .filter((q) => {
                          // Test filter
                          const matchesTest =
                            filterTestId === "all" ||
                            questionTestMap[q.id]?.includes(filterTestId);
                          if (!matchesTest) return false;

                          // Search filter
                          if (!searchQuery.trim()) return true;
                          const query = searchQuery.toLowerCase();
                          return (
                            q.name?.toLowerCase().includes(query) ||
                            q.question_text?.toLowerCase().includes(query) ||
                            (q.skills || []).some((t) =>
                              t.toLowerCase().includes(query),
                            ) ||
                            q.answers.some((a) =>
                              a?.toLowerCase().includes(query),
                            )
                          );
                        })
                        .sort((a, b) => {
                          // Sort by test-specific order when a test filter is active
                          if (
                            filterTestId !== "all" &&
                            Object.keys(testQuestionOrder).length > 0
                          ) {
                            const orderA = testQuestionOrder[a.id] ?? Infinity;
                            const orderB = testQuestionOrder[b.id] ?? Infinity;
                            return orderA - orderB;
                          }
                          return 0; // Keep original order from questions table
                        });

                      // Group questions by passage_id
                      const processedPassageIds = new Set<string>();
                      const groupedItems: Array<{
                        type: "single" | "grouped";
                        questions: typeof filteredQuestions;
                        passageId?: string;
                      }> = [];

                      filteredQuestions.forEach((question) => {
                        if (question.passage_id) {
                          // Skip if we've already processed this passage
                          if (processedPassageIds.has(question.passage_id)) {
                            return;
                          }
                          processedPassageIds.add(question.passage_id);

                          // Find all questions with the same passage_id
                          const groupedQuestions = filteredQuestions.filter(
                            (q) => q.passage_id === question.passage_id,
                          );
                          groupedItems.push({
                            type: "grouped",
                            questions: groupedQuestions,
                            passageId: question.passage_id,
                          });
                        } else {
                          groupedItems.push({
                            type: "single",
                            questions: [question],
                          });
                        }
                      });

                      // Render helper for a single question item
                      const renderQuestionItem = (
                        question: (typeof filteredQuestions)[0],
                        index: number,
                        isGrouped: boolean,
                        groupPosition?: "first" | "last" | "middle",
                      ) => (
                        <div
                          key={question.id}
                          draggable={!isGrouped}
                          onDragStart={(e) =>
                            !isGrouped &&
                            handleQuestionDragStart(e, question.id)
                          }
                          onDragOver={(e) =>
                            !isGrouped && handleQuestionDragOver(e, question.id)
                          }
                          onDrop={!isGrouped ? handleQuestionDrop : undefined}
                          onDragEnd={
                            !isGrouped ? handleQuestionDragEnd : undefined
                          }
                          className={`border-2 p-3 hover:bg-gray-50 transition-all ${!isGrouped ? "cursor-grab active:cursor-grabbing rounded-xl" : ""} ${
                            editingId === question.id
                              ? "border-black bg-gray-50"
                              : selectedForGrouping.includes(question.id)
                                ? "border-purple-400 bg-purple-50"
                                : "border-gray-200"
                          } ${draggedQuestionId === question.id ? "opacity-40 bg-blue-50 border-blue-300" : ""} ${
                            isGrouped && groupPosition === "first"
                              ? "rounded-t-xl border-b-0"
                              : ""
                          } ${
                            isGrouped && groupPosition === "last"
                              ? "rounded-b-xl border-t-0"
                              : ""
                          } ${
                            isGrouped && groupPosition === "middle"
                              ? "border-t-0 border-b-0"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {/* Selection checkbox - only for non-grouped questions */}
                            {!isGrouped && (
                              <div className="flex-shrink-0 pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedForGrouping.includes(
                                    question.id,
                                  )}
                                  onChange={() =>
                                    toggleQuestionSelection(question.id)
                                  }
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                  title="Select to group with another question"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                            {/* Drag Handle - only for non-grouped */}
                            {!isGrouped && (
                              <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 pt-1">
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                                </svg>
                              </div>
                            )}
                            {/* Question Info - Always on left */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-semibold text-gray-900 truncate">
                                      {question.name || `Q${index + 1}`}
                                    </p>
                                    {isGrouped && (
                                      <span
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium flex-shrink-0"
                                        title="Grouped question (shares a passage)"
                                      >
                                        <svg
                                          className="w-2.5 h-2.5"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                        </svg>
                                        Grouped
                                      </span>
                                    )}
                                  </div>
                                  {question.name && (
                                    <p className="text-[10px] text-gray-400">
                                      Q{index + 1}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-600 truncate">
                                    {(question.skills || []).join(", ")}
                                  </p>
                                  {/* Test badges */}
                                  {questionTestMap[question.id]?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {questionTestMap[question.id]
                                        .slice(0, 2)
                                        .map((testId) => {
                                          const test = tests.find(
                                            (t) => t.id === testId,
                                          );
                                          return test ? (
                                            <span
                                              key={testId}
                                              className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium truncate max-w-[80px]"
                                              title={test.name}
                                            >
                                              {test.name}
                                            </span>
                                          ) : null;
                                        })}
                                      {questionTestMap[question.id].length >
                                        2 && (
                                        <span className="text-[10px] text-gray-500">
                                          +
                                          {questionTestMap[question.id].length -
                                            2}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500 truncate">
                                    ✓{" "}
                                    {
                                      question.answers[
                                        question.correct_answer - 1
                                      ]
                                    }
                                  </p>
                                </div>
                                {/* Image thumbnail - on right of text */}
                                {question.question_image_url && (
                                  <img
                                    src={question.question_image_url}
                                    alt={`Q${index + 1}`}
                                    className="w-10 h-10 object-cover rounded flex-shrink-0"
                                  />
                                )}
                                {/* Action buttons */}
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() =>
                                      loadQuestionForEdit(question)
                                    }
                                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded-lg active:scale-95 transition-all"
                                    title={
                                      isGrouped
                                        ? "Edit grouped questions"
                                        : "Edit question"
                                    }
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
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(question.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg active:scale-95 transition-all"
                                    title="Delete question"
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
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );

                      // Track the original index for display
                      let displayIndex = 0;

                      return groupedItems.map((item, groupIndex) => {
                        if (item.type === "single") {
                          const question = item.questions[0];
                          displayIndex++;
                          return renderQuestionItem(
                            question,
                            displayIndex,
                            false,
                          );
                        } else {
                          // Grouped questions - render in a connected container
                          const startIndex = displayIndex;
                          const groupQuestionIds = item.questions.map((q) => q.id);
                          const isGroupBeingDragged = draggedGroupId === item.passageId;
                          return (
                            <div
                              key={`group-${item.passageId}`}
                              className={`relative cursor-grab active:cursor-grabbing ${isGroupBeingDragged ? "opacity-40" : ""}`}
                              draggable
                              onDragStart={(e) =>
                                handleGroupDragStart(e, item.passageId!, groupQuestionIds)
                              }
                              onDragOver={(e) => {
                                e.preventDefault();
                                handleQuestionDragOver(e, item.questions[0].id);
                              }}
                              onDrop={handleQuestionDrop}
                              onDragEnd={handleQuestionDragEnd}
                            >
                              {/* Purple left border to indicate grouping */}
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400 rounded-l-xl" />
                              <div className="ml-1">
                                {item.questions.map((question, qIndex) => {
                                  displayIndex++;
                                  const groupPosition =
                                    qIndex === 0
                                      ? "first"
                                      : qIndex === item.questions.length - 1
                                        ? "last"
                                        : "middle";
                                  return renderQuestionItem(
                                    question,
                                    displayIndex,
                                    true,
                                    groupPosition,
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-2 bg-white border-2 border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Question" : "Add New Question"}
                </h2>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      showPreview
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    i
                  </button>

                  {/* Preview Tooltip */}
                  {showPreview && (
                    <div className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200 z-50">
                      {/* Tooltip Arrow */}
                      <div className="absolute -top-2 right-3 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>

                      <div className="p-4 space-y-3">
                        {/* Question Preview */}
                        {(currentForm.state.questionText ||
                          currentForm.state.questionImagePreview) && (
                          <div className="mb-3">
                            {currentForm.state.questionImagePreview && (
                              <div className="w-full">
                                <img
                                  src={currentForm.state.questionImagePreview}
                                  alt="Question"
                                  className="w-full h-auto max-h-64 object-contain rounded-lg"
                                />
                              </div>
                            )}
                            {currentForm.state.questionText && (
                              <div
                                className={
                                  currentForm.state.questionImagePreview
                                    ? "mt-4"
                                    : ""
                                }
                                style={{
                                  fontFamily: "'Times New Roman', Times, serif",
                                  fontSize: "1.125rem",
                                }}
                              >
                                <MathText
                                  text={currentForm.state.questionText}
                                  className="leading-relaxed"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Answers Preview - Same as quiz page */}
                        {currentForm.state.answers.some(
                          (a, idx) =>
                            a.trim() ||
                            currentForm.state.answerImagePreviews[idx],
                        ) && (
                          <div
                            className={`${
                              currentForm.state.answerLayout === "grid"
                                ? "grid grid-cols-2 gap-2"
                                : "space-y-2"
                            }`}
                          >
                            {currentForm.state.answers.map((answer, index) => {
                              const answerNum = index + 1;
                              const isCorrect =
                                currentForm.state.correctAnswer === answerNum;
                              const gridOrder =
                                currentForm.state.answerLayout === "grid"
                                  ? [0, 2, 1, 3][index]
                                  : index;

                              let buttonClass =
                                "w-full px-4 py-3 text-left rounded-xl border-2 transition-all duration-200 font-medium";
                              if (isCorrect) {
                                buttonClass +=
                                  " bg-green-50 border-green-500 text-green-900";
                              } else {
                                buttonClass +=
                                  " bg-white border-gray-300 text-gray-700";
                              }

                              const answerImage =
                                currentForm.state.answerImagePreviews[index];

                              return (
                                <div key={index} style={{ order: gridOrder }}>
                                  <div className={buttonClass}>
                                    <div
                                      className="flex items-start gap-3"
                                      style={{ fontSize: "1.125rem" }}
                                    >
                                      <span
                                        className="font-bold shrink-0 leading-normal"
                                        style={{
                                          fontFamily:
                                            "'Times New Roman', Times, serif",
                                        }}
                                      >
                                        ({answerNum})
                                      </span>
                                      <div
                                        className="flex-1 min-w-0 overflow-hidden"
                                        style={{
                                          fontFamily:
                                            "'Times New Roman', Times, serif",
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
                                            className="max-w-full h-auto rounded border border-gray-300 mt-2"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Empty state */}
                        {!currentForm.state.questionText &&
                          !currentForm.state.questionImagePreview &&
                          !currentForm.state.answers.some((a) => a.trim()) && (
                            <div className="text-center text-gray-400 py-8 text-sm">
                              Start typing to see preview
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Grouped Question Toggle */}
                {!editingId && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Grouped Question (Passage-based)
                      </label>
                      <p className="text-xs text-gray-500">
                        Create two questions that share a common passage
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGroupedQuestion(!isGroupedQuestion)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isGroupedQuestion ? "bg-black" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isGroupedQuestion ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Passage Container (for grouped questions) */}
                {isGroupedQuestion && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl space-y-3">
                    <h3 className="text-sm font-bold text-blue-900">
                      Shared Passage
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Passage Text
                      </label>
                      <textarea
                        value={passageText}
                        onChange={(e) => setPassageText(e.target.value)}
                        placeholder="Enter the shared passage or summary text..."
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Passage Image (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleImageSelect(
                            e,
                            setPassageImage,
                            setPassageImagePreview,
                          )
                        }
                        className="hidden"
                        id="passage-image"
                      />
                      <label
                        htmlFor="passage-image"
                        className="cursor-pointer block"
                        onDragOver={(e) => handleDragOver(e, "passage")}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) =>
                          handleDrop(e, setPassageImage, setPassageImagePreview)
                        }
                      >
                        {passageImagePreview ? (
                          <div
                            className={`relative w-full h-32 rounded-lg border-2 overflow-hidden transition-all ${
                              draggedOver === "passage"
                                ? "border-blue-500 ring-2 ring-blue-200"
                                : "border-blue-300"
                            }`}
                          >
                            <img
                              src={passageImagePreview}
                              alt="Passage"
                              className="w-full h-full object-contain bg-white"
                            />
                            {draggedOver === "passage" && (
                              <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-700">
                                  Drop to replace
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPassageImage(null);
                                setPassageImagePreview(null);
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`w-full h-20 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${
                              draggedOver === "passage"
                                ? "border-blue-500 bg-blue-50"
                                : "border-blue-300 bg-white hover:bg-blue-50"
                            }`}
                          >
                            <span className="text-xs text-blue-600">
                              Click or drag image
                            </span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                )}

                {/* Question Tabs (for grouped questions) */}
                {isGroupedQuestion && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveQuestionTab(1)}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
                        activeQuestionTab === 1
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Question 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveQuestionTab(2)}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
                        activeQuestionTab === 2
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Question 2
                    </button>
                  </div>
                )}

                {/* Question Fields (uses currentForm which switches between Q1/Q2 based on tab) */}
                {/* Question Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {isGroupedQuestion
                      ? `Question ${activeQuestionTab} Name (Optional)`
                      : "Question Name (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={currentForm.state.questionName}
                    onChange={(e) =>
                      currentForm.setField("questionName", e.target.value)
                    }
                    placeholder="e.g., Linear Equations - Problem 1"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">
                    Helps you identify this question in the list
                  </p>
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Question Text{" "}
                    <span className="text-gray-500">
                      (text or image required)
                    </span>
                  </label>
                  <textarea
                    value={currentForm.state.questionText}
                    onChange={(e) =>
                      currentForm.setField("questionText", e.target.value)
                    }
                    placeholder="Enter question text. Use LaTeX for math: \\frac{x}{2}, x^{2}, \\sqrt{x}"
                    rows={3}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">
                    Use LaTeX for math equations. Examples: $\frac{`{x}`}
                    {`{2}`}$, $x^{`{2}`}$, $\sqrt{`{x}`}$
                  </p>
                </div>

                {/* Compact Image Uploads */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Question Image{" "}
                      <span className="text-gray-500">
                        (text or image required)
                      </span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageSelect(
                          e,
                          (file) => currentForm.setField("questionImage", file),
                          (preview) =>
                            currentForm.setField(
                              "questionImagePreview",
                              preview,
                            ),
                        )
                      }
                      className="hidden"
                      id="question-image"
                    />
                    <label
                      htmlFor="question-image"
                      className="cursor-pointer block"
                      onDragOver={(e) => handleDragOver(e, "question")}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) =>
                        handleDrop(
                          e,
                          (file) => currentForm.setField("questionImage", file),
                          (preview) =>
                            currentForm.setField(
                              "questionImagePreview",
                              preview,
                            ),
                        )
                      }
                    >
                      {currentForm.state.questionImagePreview ? (
                        <div
                          className={`relative w-full h-24 rounded border-2 overflow-hidden transition-all ${
                            draggedOver === "question"
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-300"
                          }`}
                        >
                          <img
                            src={currentForm.state.questionImagePreview}
                            alt="Question"
                            className="w-full h-full object-cover"
                          />
                          {draggedOver === "question" && (
                            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-700">
                                Drop to replace
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`w-full h-24 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-400 transition-colors ${
                            draggedOver === "question"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 hover:border-blue-500"
                          }`}
                        >
                          <span className="text-xs font-medium">
                            Drop image
                          </span>
                          <span className="text-xs">or click</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Reference (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageSelect(
                          e,
                          (file) =>
                            currentForm.setField("referenceImage", file),
                          (preview) =>
                            currentForm.setField(
                              "referenceImagePreview",
                              preview,
                            ),
                        )
                      }
                      className="hidden"
                      id="reference-image"
                    />
                    <label
                      htmlFor="reference-image"
                      className="cursor-pointer block"
                      onDragOver={(e) => handleDragOver(e, "reference")}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) =>
                        handleDrop(
                          e,
                          (file) =>
                            currentForm.setField("referenceImage", file),
                          (preview) =>
                            currentForm.setField(
                              "referenceImagePreview",
                              preview,
                            ),
                        )
                      }
                    >
                      {currentForm.state.referenceImagePreview ? (
                        <div
                          className={`relative w-full h-24 rounded border-2 overflow-hidden transition-all ${
                            draggedOver === "reference"
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-300"
                          }`}
                        >
                          <img
                            src={currentForm.state.referenceImagePreview}
                            alt="Reference"
                            className="w-full h-full object-cover"
                          />
                          {draggedOver === "reference" && (
                            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-700">
                                Drop to replace
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`w-full h-24 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-400 transition-colors ${
                            draggedOver === "reference"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 hover:border-blue-500"
                          }`}
                        >
                          <span className="text-xs font-medium">
                            Drop image
                          </span>
                          <span className="text-xs">or click</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Explanation (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageSelect(
                          e,
                          (file) =>
                            currentForm.setField("explanationImage", file),
                          (preview) =>
                            currentForm.setField(
                              "explanationImagePreview",
                              preview,
                            ),
                        )
                      }
                      className="hidden"
                      id="explanation-image"
                    />
                    <label
                      htmlFor="explanation-image"
                      className="cursor-pointer block"
                      onDragOver={(e) => handleDragOver(e, "explanation")}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) =>
                        handleDrop(
                          e,
                          (file) =>
                            currentForm.setField("explanationImage", file),
                          (preview) =>
                            currentForm.setField(
                              "explanationImagePreview",
                              preview,
                            ),
                        )
                      }
                    >
                      {currentForm.state.explanationImagePreview ? (
                        <div
                          className={`relative w-full h-24 rounded border-2 overflow-hidden transition-all ${
                            draggedOver === "explanation"
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-300"
                          }`}
                        >
                          <img
                            src={currentForm.state.explanationImagePreview}
                            alt="Explanation"
                            className="w-full h-full object-cover"
                          />
                          {draggedOver === "explanation" && (
                            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-700">
                                Drop to replace
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`w-full h-24 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-400 transition-colors ${
                            draggedOver === "explanation"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 hover:border-blue-500"
                          }`}
                        >
                          <span className="text-xs font-medium">
                            Drop image
                          </span>
                          <span className="text-xs">or click</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Answers with optional images */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Answers <span className="text-red-500">*</span>{" "}
                      <span className="text-gray-500 font-normal">
                        (text or image or both required)
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Layout:</span>
                      <button
                        type="button"
                        onClick={() =>
                          currentForm.setField("answerLayout", "list")
                        }
                        className={`px-2 py-1 text-xs rounded transition-all ${
                          currentForm.state.answerLayout === "list"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        List (1×4)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          currentForm.setField("answerLayout", "grid")
                        }
                        className={`px-2 py-1 text-xs rounded transition-all ${
                          currentForm.state.answerLayout === "grid"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Grid (2×2)
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {currentForm.state.answers.map((answer, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <input
                            type="radio"
                            name="correct-answer"
                            checked={
                              currentForm.state.correctAnswer === index + 1
                            }
                            onChange={() =>
                              currentForm.setField("correctAnswer", index + 1)
                            }
                            className="h-4 w-4 mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-700">
                                ({index + 1})
                              </span>
                              {currentForm.state.correctAnswer ===
                                index + 1 && (
                                <span className="text-green-600 text-xs font-bold">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={answer}
                              onChange={(e) =>
                                currentForm.setAnswer(index, e.target.value)
                              }
                              placeholder={`Answer text (optional if image provided)`}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Image upload for this answer */}
                        <div className="ml-6">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  currentForm.setAnswerImage(
                                    index,
                                    file,
                                    reader.result as string,
                                  );
                                };
                                reader.readAsDataURL(file);
                              } else {
                                currentForm.setAnswerImage(index, null, null);
                              }
                            }}
                            className="hidden"
                            id={`answer-image-${index}`}
                          />
                          {currentForm.state.answerImagePreviews[index] ? (
                            <label
                              htmlFor={`answer-image-${index}`}
                              className="cursor-pointer block"
                              onDragOver={(e) =>
                                handleAnswerImageDragOver(e, index)
                              }
                              onDragLeave={handleAnswerImageDragLeave}
                              onDrop={(e) => handleAnswerImageDrop(e, index)}
                            >
                              <div
                                className={`relative w-full max-w-xs h-24 rounded border-2 overflow-hidden transition-all ${
                                  answerDraggedOver === index
                                    ? "border-blue-500 ring-2 ring-blue-200"
                                    : "border-gray-300"
                                }`}
                              >
                                <img
                                  src={
                                    currentForm.state.answerImagePreviews[
                                      index
                                    ]!
                                  }
                                  alt={`Answer ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                {answerDraggedOver === index && (
                                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                    <span className="text-xs font-bold text-blue-700">
                                      Drop to replace
                                    </span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    currentForm.removeAnswerImage(index);
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 active:scale-95 transition-all z-10"
                                >
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
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </label>
                          ) : (
                            <label
                              htmlFor={`answer-image-${index}`}
                              className="cursor-pointer block"
                              onDragOver={(e) =>
                                handleAnswerImageDragOver(e, index)
                              }
                              onDragLeave={handleAnswerImageDragLeave}
                              onDrop={(e) => handleAnswerImageDrop(e, index)}
                            >
                              <div
                                className={`w-full max-w-xs h-20 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-400 transition-colors ${
                                  answerDraggedOver === index
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-300 hover:border-blue-500"
                                }`}
                              >
                                <svg
                                  className="w-5 h-5 mb-1"
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
                                <span className="text-xs font-medium">
                                  Drop image or click
                                </span>
                                <span className="text-xs">(optional)</span>
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compact Explanation */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Explanation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={currentForm.state.explanationText}
                    onChange={(e) =>
                      currentForm.setField("explanationText", e.target.value)
                    }
                    placeholder="Explain the correct answer"
                    rows={3}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Skills <span className="text-red-500">*</span>
                  </label>
                  <TagInput
                    selectedTags={currentForm.state.selectedSkills}
                    availableTags={availableTags}
                    onChange={(tags) =>
                      currentForm.setField("selectedSkills", tags)
                    }
                    placeholder="Type to search or add new skills (e.g., Linear Equations, Quadratic Functions)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Skills tested by this question
                  </p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <TagInput
                    selectedTags={currentForm.state.selectedTags}
                    availableTags={availableTagNames}
                    onChange={(tags) =>
                      currentForm.setField("selectedTags", tags)
                    }
                    placeholder="Type to search or add new tags (e.g., Algebra, Functions)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Broader categorization tags for filtering
                  </p>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={currentForm.state.difficulty}
                    onChange={(e) =>
                      currentForm.setField("difficulty", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">None</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Question difficulty level (optional)
                  </p>
                </div>

                {/* Assign to Tests */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Assign to Tests
                  </label>
                  {tests.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No tests available. Create a test first.
                    </p>
                  ) : (
                    <TestMultiSelect
                      tests={tests}
                      selectedTestIds={selectedTestIds}
                      onChange={setSelectedTestIds}
                      placeholder="Select tests..."
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Select which tests this question should appear in
                  </p>
                </div>

                {/* Points */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Points <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={currentForm.state.points}
                    onChange={(e) =>
                      currentForm.setField(
                        "points",
                        parseInt(e.target.value) || 1,
                      )
                    }
                    placeholder="1"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">
                    Points awarded for this question (default: 1)
                  </p>
                </div>

                {/* Notification Message */}
                {notification && (
                  <div
                    className={`p-4 rounded-xl text-sm font-bold border-2 ${
                      notification.type === "success"
                        ? "bg-green-50 text-green-800 border-green-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                  >
                    {notification.message}
                  </div>
                )}

                {/* Buttons */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-black text-white px-4 py-3 text-sm font-bold rounded-xl hover:bg-gray-800 active:scale-95 disabled:opacity-50 transition-all shadow-md"
                  >
                    {isSubmitting
                      ? "SAVING..."
                      : editingId
                        ? "UPDATE QUESTION"
                        : "CREATE QUESTION"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Test Modal */}
        <TestModal
          isOpen={showTestModal}
          onClose={() => {
            setShowTestModal(false);
            setEditingTest(null);
          }}
          onSave={handleSaveTest}
          editingTest={editingTest}
          subjects={subjects}
        />

        {/* Subject Modal */}
        <SubjectModal
          isOpen={showSubjectModal}
          onClose={() => {
            setShowSubjectModal(false);
            setEditingSubject(null);
          }}
          onSave={handleSaveSubject}
          editingSubject={editingSubject}
        />

        {/* CSV Upload Modal */}
        {showCsvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  Bulk Upload Questions
                </h2>
                <button
                  onClick={() => {
                    setShowCsvModal(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setCsvError(null);
                    setCsvSelectedTestIds([]);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* File Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: question_text, choice_1-4, correct_answer, Points, difficulty_level, Main Skill, [tags...]
                  </p>
                </div>

                {/* Assign to Tests */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Tests
                  </label>
                  {tests.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No tests available
                    </p>
                  ) : (
                    <TestMultiSelect
                      tests={tests}
                      selectedTestIds={csvSelectedTestIds}
                      onChange={setCsvSelectedTestIds}
                      placeholder="Select tests..."
                    />
                  )}
                </div>

                {/* Error Message */}
                {csvError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {csvError}
                  </div>
                )}

                {/* Preview */}
                {csvPreview.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Preview ({csvPreview.length} questions)
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-auto max-h-80">
                      <table className="text-xs border-collapse" style={{ minWidth: '1400px', width: '100%' }}>
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '40px' }}>#</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '250px' }}>Question</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '150px' }}>Choice 1</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '150px' }}>Choice 2</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '150px' }}>Choice 3</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '150px' }}>Choice 4</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '60px' }}>Correct</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '40px' }}>Pts</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '80px' }}>Difficulty</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '120px' }}>Skill</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 border-b border-gray-200 sticky top-0 bg-gray-50" style={{ width: '200px' }}>Tags</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((q, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-3 py-2 text-gray-500 border-b border-gray-100">{i + 1}</td>
                              <td className="px-3 py-2 text-gray-900 border-b border-gray-100">{q.question_text}</td>
                              <td className="px-3 py-2 text-gray-600 border-b border-gray-100">{q.answers[0] || '-'}</td>
                              <td className="px-3 py-2 text-gray-600 border-b border-gray-100">{q.answers[1] || '-'}</td>
                              <td className="px-3 py-2 text-gray-600 border-b border-gray-100">{q.answers[2] || '-'}</td>
                              <td className="px-3 py-2 text-gray-600 border-b border-gray-100">{q.answers[3] || '-'}</td>
                              <td className="px-3 py-2 text-gray-600 font-medium border-b border-gray-100">{q.correct_answer}</td>
                              <td className="px-3 py-2 text-gray-600 border-b border-gray-100">{q.points}</td>
                              <td className="px-3 py-2 text-gray-600 capitalize border-b border-gray-100">{q.difficulty || '-'}</td>
                              <td className="px-3 py-2 text-gray-600 border-b border-gray-100">{q.skills[0] || '-'}</td>
                              <td className="px-3 py-2 text-gray-600 border-b border-gray-100">{q.tags.length > 0 ? q.tags.join(', ') : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setShowCsvModal(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setCsvError(null);
                    setCsvSelectedTestIds([]);
                  }}
                  className="px-4 py-2 text-sm font-bold text-gray-700 border-2 border-gray-300 rounded-xl hover:border-black hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCsvUpload}
                  disabled={csvPreview.length === 0 || isUploadingCsv}
                  className="px-4 py-2 text-sm font-bold bg-black text-white rounded-xl hover:bg-gray-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isUploadingCsv
                    ? "Uploading..."
                    : `Upload ${csvPreview.length} Questions`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link Questions Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-purple-50">
                <div className="p-2 bg-purple-100 rounded-full">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Group Questions
                </h2>
              </div>

              {/* Modal Body */}
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                  Add a shared passage for these questions. The passage will be
                  displayed above both questions when students take the quiz.
                </p>

                {/* Selected Questions Preview */}
                <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-2">
                    Selected Questions:
                  </p>
                  <div className="space-y-1">
                    {selectedForGrouping.map((id, idx) => {
                      const q = questions.find((q) => q.id === id);
                      return (
                        <p key={id} className="text-sm text-gray-900 truncate">
                          {idx + 1}.{" "}
                          {q?.name ||
                            q?.question_text?.slice(0, 50) ||
                            `Question ${idx + 1}`}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* Passage Text */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Passage Text
                  </label>
                  <textarea
                    value={linkPassageText}
                    onChange={(e) => setLinkPassageText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    rows={4}
                    placeholder="Enter the shared passage text... (supports LaTeX: $x^2$)"
                  />
                </div>

                {/* Passage Image */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Passage Image (Optional)
                  </label>
                  <input
                    type="file"
                    id="link-passage-image"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setLinkPassageImage(file);
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) =>
                          setLinkPassageImagePreview(
                            ev.target?.result as string,
                          );
                        reader.readAsDataURL(file);
                      } else {
                        setLinkPassageImagePreview(null);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="link-passage-image"
                    className="cursor-pointer block"
                    onDragOver={(e) => handleDragOver(e, "linkPassage")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) =>
                      handleDrop(
                        e,
                        setLinkPassageImage,
                        setLinkPassageImagePreview,
                      )
                    }
                  >
                    {linkPassageImagePreview ? (
                      <div
                        className={`relative w-full h-32 rounded-lg border-2 overflow-hidden transition-all ${
                          draggedOver === "linkPassage"
                            ? "border-purple-500 ring-2 ring-purple-200"
                            : "border-gray-300"
                        }`}
                      >
                        <img
                          src={linkPassageImagePreview}
                          alt="Passage preview"
                          className="w-full h-full object-contain bg-gray-50"
                        />
                        {draggedOver === "linkPassage" && (
                          <div className="absolute inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center">
                            <span className="text-sm font-bold text-purple-700">
                              Drop to replace
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLinkPassageImage(null);
                            setLinkPassageImagePreview(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 shadow-md"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 transition-colors ${
                          draggedOver === "linkPassage"
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-300 hover:border-purple-500"
                        }`}
                      >
                        <svg
                          className="w-8 h-8 mb-2"
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
                        <span className="text-sm font-medium">
                          Drop image here
                        </span>
                        <span className="text-xs">or click to browse</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={cancelLinkQuestions}
                  disabled={isLinking}
                  className="px-4 py-2 text-sm font-bold text-gray-700 border-2 border-gray-300 rounded-xl hover:border-black hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLinkQuestions}
                  disabled={
                    isLinking || (!linkPassageText.trim() && !linkPassageImage)
                  }
                  className="px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLinking ? "Linking..." : "Group Questions"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Test Confirmation Modal */}
        {deleteTestModal.show && deleteTestModal.test && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-red-50">
                <div className="p-2 bg-red-100 rounded-full">
                  <svg
                    className="w-5 h-5 text-red-600"
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
                </div>
                <h2 className="text-lg font-bold text-gray-900">Delete Test</h2>
              </div>

              {/* Modal Body */}
              <div className="p-4">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete{" "}
                  <span className="font-bold">
                    &quot;{deleteTestModal.test.name}&quot;
                  </span>
                  ?
                </p>

                {deleteTestModal.test.questionCount &&
                deleteTestModal.test.questionCount > 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteTestModal.deleteQuestions}
                        onChange={(e) =>
                          setDeleteTestModal((prev) => ({
                            ...prev,
                            deleteQuestions: e.target.checked,
                          }))
                        }
                        className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Also delete {deleteTestModal.test.questionCount}{" "}
                          question
                          {deleteTestModal.test.questionCount !== 1
                            ? "s"
                            : ""}{" "}
                          assigned to this test
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          This will permanently remove the questions from the
                          question bank
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">
                    This test has no questions assigned to it.
                  </p>
                )}

                {deleteTestModal.deleteQuestions && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <p className="text-sm text-red-700">
                        <span className="font-bold">Warning:</span> This action
                        cannot be undone. All selected questions will be
                        permanently deleted.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() =>
                    setDeleteTestModal({
                      show: false,
                      test: null,
                      deleteQuestions: false,
                      isDeleting: false,
                    })
                  }
                  disabled={deleteTestModal.isDeleting}
                  className="px-4 py-2 text-sm font-bold text-gray-700 border-2 border-gray-300 rounded-xl hover:border-black hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTest}
                  disabled={deleteTestModal.isDeleting}
                  className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {deleteTestModal.isDeleting
                    ? "Deleting..."
                    : deleteTestModal.deleteQuestions
                      ? "Delete Test & Questions"
                      : "Delete Test"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
