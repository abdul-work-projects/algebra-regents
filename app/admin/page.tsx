"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  uploadImage,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  fetchQuestions,
  updateQuestionOrders,
  updateTestQuestionOrders,
  fetchQuestionsForTest,
  DatabaseQuestion,
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
import TestMultiSelect from "@/components/TestMultiSelect";
import { Test } from "@/lib/types";
import MathText from "@/components/MathText";

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [questions, setQuestions] = useState<DatabaseQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionName, setQuestionName] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [explanationImage, setExplanationImage] = useState<File | null>(null);
  const [explanationImagePreview, setExplanationImagePreview] = useState<string | null>(null);

  const [answers, setAnswers] = useState<string[]>(["", "", "", ""]);
  const [answerImages, setAnswerImages] = useState<(File | null)[]>([null, null, null, null]);
  const [answerImagePreviews, setAnswerImagePreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [answerLayout, setAnswerLayout] = useState<'grid' | 'list'>('list');
  const [correctAnswer, setCorrectAnswer] = useState<number>(1);
  const [explanationText, setExplanationText] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [points, setPoints] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [answerDraggedOver, setAnswerDraggedOver] = useState<number | null>(null);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [originalQuestions, setOriginalQuestions] = useState<DatabaseQuestion[] | null>(null);
  const [originalTestOrder, setOriginalTestOrder] = useState<{ [questionId: string]: number } | null>(null);
  const dropSuccessRef = useRef(false);

  // Tests management state
  const [activeTab, setActiveTab] = useState<"questions" | "tests" | "bugs">("questions");
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [filterTestId, setFilterTestId] = useState<string>("all"); // "all" or a test ID
  const [questionTestMap, setQuestionTestMap] = useState<{ [questionId: string]: string[] }>({});
  const [testQuestionOrder, setTestQuestionOrder] = useState<{ [questionId: string]: number }>({}); // Test-specific order
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Bug reports state
  const [bugReports, setBugReports] = useState<DatabaseBugReport[]>([]);
  const [isLoadingBugs, setIsLoadingBugs] = useState(true);
  const [bugStatusFilter, setBugStatusFilter] = useState<'all' | 'open' | 'reviewed' | 'resolved'>('all');
  const [bugCounts, setBugCounts] = useState({ open: 0, reviewed: 0, resolved: 0 });
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [testNamesMap, setTestNamesMap] = useState<{ [id: string]: string }>({});

  // CSV bulk upload state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Array<{
    question_text: string;
    answers: string[];
    correct_answer: number;
  }>>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [csvSelectedTestIds, setCsvSelectedTestIds] = useState<string[]>([]);
  const [showNoTestWarning, setShowNoTestWarning] = useState(false);

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
    // Load bug counts for the tab badge
    getBugReportCounts().then(counts => setBugCounts(counts));
  }, []);

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    const data = await fetchQuestions();
    setQuestions(data);

    // Extract unique topics from all questions
    const allTopics = data.flatMap(q => q.topics);
    const uniqueTags = Array.from(new Set(allTopics)).sort();
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
    const filter = bugStatusFilter === 'all' ? undefined : bugStatusFilter;
    const data = await fetchBugReports(filter);
    setBugReports(data);

    const counts = await getBugReportCounts();
    setBugCounts(counts);

    // Build test names map
    const uniqueTestIds = [...new Set(data.filter(r => r.test_id).map(r => r.test_id!))];
    const namesMap: { [id: string]: string } = {};
    tests.forEach(t => {
      if (uniqueTestIds.includes(t.id)) {
        namesMap[t.id] = t.name;
      }
    });
    setTestNamesMap(namesMap);

    setIsLoadingBugs(false);
  };

  useEffect(() => {
    if (activeTab === 'bugs') {
      loadBugReports();
    }
  }, [activeTab, bugStatusFilter]);

  const handleBugStatusChange = async (reportId: string, newStatus: 'open' | 'reviewed' | 'resolved') => {
    const success = await updateBugReportStatus(reportId, newStatus);
    if (success) {
      loadBugReports();
    }
  };

  const handleDeleteBug = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }
    const success = await deleteBugReport(reportId);
    if (success) {
      loadBugReports();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getQuestionPreview = (questionId: string | null) => {
    if (!questionId) return null;
    return questions.find(q => q.id === questionId);
  };

  const handleSaveTest = async (testData: {
    name: string;
    description?: string;
    scaled_score_table?: { [key: string]: number };
    is_active: boolean;
  }) => {
    if (editingTest) {
      const result = await updateTest(editingTest.id, testData);
      if (result) {
        setNotification({ type: "success", message: "Test updated successfully" });
        loadTestsData();
      } else {
        throw new Error("Failed to update test");
      }
    } else {
      const result = await createTest(testData);
      if (result) {
        setNotification({ type: "success", message: "Test created successfully" });
        loadTestsData();
      } else {
        throw new Error("Failed to create test");
      }
    }
    setEditingTest(null);
  };

  const handleDeleteTest = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this test? This will remove all question associations.")) {
      return;
    }

    const success = await deleteTest(id);
    if (success) {
      setNotification({ type: "success", message: "Test deleted successfully" });
      loadTestsData();
    } else {
      setNotification({ type: "error", message: "Failed to delete test" });
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

  // CSV parsing function
  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    // Parse header to find column indices
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const questionIdx = header.findIndex(h => h === 'question');
    const correctIdx = header.findIndex(h => h === 'correct');

    // Find answer columns (1, 2, 3, 4)
    const answerIndices = [
      header.findIndex(h => h === '1'),
      header.findIndex(h => h === '2'),
      header.findIndex(h => h === '3'),
      header.findIndex(h => h === '4'),
    ];

    if (questionIdx === -1) throw new Error('CSV must have a "Question" column');
    if (correctIdx === -1) throw new Error('CSV must have a "Correct" column');
    if (answerIndices.some(i => i === -1)) throw new Error('CSV must have columns "1", "2", "3", "4" for answers');

    const questions: Array<{
      question_text: string;
      answers: string[];
      correct_answer: number;
    }> = [];

    // Parse each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Handle CSV with commas inside quoted fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Push last value

      const questionText = values[questionIdx] || '';
      const answers = answerIndices.map(idx => values[idx] || '');
      const correctAnswer = parseInt(values[correctIdx]) || 1;

      if (!questionText.trim()) continue; // Skip empty rows

      questions.push({
        question_text: questionText,
        answers,
        correct_answer: correctAnswer,
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
        setCsvError(err instanceof Error ? err.message : 'Failed to parse CSV');
      }
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (csvPreview.length === 0) return;

    // Show warning if no tests are selected
    if (csvSelectedTestIds.length === 0 && !showNoTestWarning) {
      setShowNoTestWarning(true);
      return;
    }

    await performCsvUpload();
  };

  const performCsvUpload = async () => {
    setShowNoTestWarning(false);
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
        answer_layout: 'list' as const,
        correct_answer: q.correct_answer,
        explanation_text: 'See solution in your notes.',
        explanation_image_url: null,
        topics: [],
        points: 1,
        display_order: questions.length + index + 1,
      }));

      const result = await bulkCreateQuestions(questionsToCreate);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create questions');
      }

      // Assign questions to tests if any selected
      if (csvSelectedTestIds.length > 0 && result.data) {
        for (const question of result.data) {
          await setTestsForQuestion(question.id, csvSelectedTestIds);
        }
      }

      setNotification({
        type: 'success',
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
      setCsvError(err instanceof Error ? err.message : 'Failed to upload questions');
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
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^\w.-]/g, '') // Remove special characters except dots, underscores, and dashes
      .toLowerCase();
  };

  const handleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (file: File | null) => void,
    setPreview: (preview: string | null) => void
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
    setPreview: (preview: string | null) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleAnswerImageSelect = (index: number, file: File | null) => {
    const newImages = [...answerImages];
    newImages[index] = file;
    setAnswerImages(newImages);

    const newPreviews = [...answerImagePreviews];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string;
        setAnswerImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    } else {
      newPreviews[index] = null;
      setAnswerImagePreviews(newPreviews);
    }
  };

  const removeAnswerImage = (index: number) => {
    const newImages = [...answerImages];
    newImages[index] = null;
    setAnswerImages(newImages);

    const newPreviews = [...answerImagePreviews];
    newPreviews[index] = null;
    setAnswerImagePreviews(newPreviews);
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
    if (file && file.type.startsWith('image/')) {
      handleAnswerImageSelect(index, file);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setQuestionName("");
    setQuestionText("");
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setReferenceImage(null);
    setReferenceImagePreview(null);
    setExplanationImage(null);
    setExplanationImagePreview(null);
    setAnswers(["", "", "", ""]);
    setAnswerImages([null, null, null, null]);
    setAnswerImagePreviews([null, null, null, null]);
    setAnswerLayout('list');
    setCorrectAnswer(1);
    setExplanationText("");
    setSelectedTopics([]);
    setPoints(1);
    // Auto-select the filtered test for new questions
    setSelectedTestIds(filterTestId !== "all" ? [filterTestId] : []);
  };

  const loadQuestionForEdit = async (question: DatabaseQuestion) => {
    setEditingId(question.id);
    setQuestionName(question.name || "");
    setQuestionText(question.question_text || "");
    setQuestionImagePreview(question.question_image_url);
    setReferenceImagePreview(question.reference_image_url);
    setExplanationImagePreview(question.explanation_image_url);
    setAnswers(question.answers);
    setAnswerImagePreviews(question.answer_image_urls || [null, null, null, null]);
    setAnswerLayout(question.answer_layout || 'list');
    setCorrectAnswer(question.correct_answer);
    setExplanationText(question.explanation_text);
    setSelectedTopics(question.topics);
    setPoints(question.points || 1);

    // Load tests this question belongs to
    const questionTestIds = await getTestsForQuestion(question.id);
    setSelectedTestIds(questionTestIds);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    const success = await deleteQuestion(id);
    if (success) {
      setNotification({ type: "success", message: "Question deleted successfully" });
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
    setOriginalQuestions([...questions]);
    // Save original test order if filtering by test
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      setOriginalTestOrder({ ...testQuestionOrder });
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', questionId);
  };

  const handleQuestionDragOver = (e: React.DragEvent, questionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedQuestionId || draggedQuestionId === questionId) return;

    // When a test filter is active, update test-specific order for visual feedback
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      const currentOrder = { ...testQuestionOrder };
      const draggedOrder = currentOrder[draggedQuestionId];
      const targetOrder = currentOrder[questionId];

      if (draggedOrder === undefined || targetOrder === undefined) return;
      if (draggedOrder === targetOrder) return;

      // Reorder by swapping positions
      const newOrder: { [questionId: string]: number } = {};
      const entries = Object.entries(currentOrder).sort((a, b) => a[1] - b[1]);
      const draggedIdx = entries.findIndex(([id]) => id === draggedQuestionId);
      const targetIdx = entries.findIndex(([id]) => id === questionId);

      if (draggedIdx === -1 || targetIdx === -1) return;

      // Remove dragged item and insert at target position
      const [draggedEntry] = entries.splice(draggedIdx, 1);
      entries.splice(targetIdx, 0, draggedEntry);

      // Rebuild order map
      entries.forEach(([id], index) => {
        newOrder[id] = index;
      });

      setTestQuestionOrder(newOrder);
    } else {
      // Original behavior for no test filter
      const draggedIndex = questions.findIndex(q => q.id === draggedQuestionId);
      const targetIndex = questions.findIndex(q => q.id === questionId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

      // Reorder the list visually
      const newQuestions = [...questions];
      const [draggedQuestion] = newQuestions.splice(draggedIndex, 1);
      newQuestions.splice(targetIndex, 0, draggedQuestion);
      setQuestions(newQuestions);
    }
  };

  const handleQuestionDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dropSuccessRef.current = true;

    // Clear drag state
    setDraggedQuestionId(null);
    setOriginalQuestions(null);
    setOriginalTestOrder(null);

    // Check if we're filtering by a specific test
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      // Get question IDs sorted by the current test order state
      const sortedEntries = Object.entries(testQuestionOrder).sort((a, b) => a[1] - b[1]);

      // Update test-specific order
      const testOrders = sortedEntries.map(([questionId], index) => ({
        questionId,
        display_order: index + 1,
      }));

      const success = await updateTestQuestionOrders(filterTestId, testOrders);
      if (!success) {
        setNotification({ type: "error", message: "Failed to save question order for this test" });
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
        setNotification({ type: "error", message: "Failed to save question order" });
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
    setOriginalQuestions(null);
    setOriginalTestOrder(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that either question text or image is provided
    const hasQuestionText = questionText.trim();
    const hasQuestionImage = questionImage || questionImagePreview;
    if (!hasQuestionText && !hasQuestionImage) {
      setNotification({ type: "error", message: "Question must have either text or image (or both)" });
      return;
    }

    // Validate that each answer has either text or image (or both)
    for (let i = 0; i < 4; i++) {
      const hasText = answers[i]?.trim();
      const hasImage = answerImages[i] || answerImagePreviews[i];
      if (!hasText && !hasImage) {
        setNotification({
          type: "error",
          message: `Answer ${i + 1} must have either text or image (or both)`
        });
        return;
      }
    }

    if (!explanationText.trim()) {
      setNotification({ type: "error", message: "Explanation text is required" });
      return;
    }

    if (selectedTopics.length === 0) {
      setNotification({ type: "error", message: "At least one topic is required" });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      let questionImageUrl = questionImagePreview;
      if (questionImage) {
        const sanitizedName = sanitizeFilename(questionImage.name);
        questionImageUrl = await uploadImage(
          "question-images",
          questionImage,
          `questions/${Date.now()}-${sanitizedName}`
        );
        if (!questionImageUrl) throw new Error("Failed to upload question image");
      }

      let referenceImageUrl = referenceImagePreview;
      if (referenceImage) {
        const sanitizedName = sanitizeFilename(referenceImage.name);
        referenceImageUrl = await uploadImage(
          "reference-images",
          referenceImage,
          `references/${Date.now()}-${sanitizedName}`
        );
      }

      let explanationImageUrl = explanationImagePreview;
      if (explanationImage) {
        const sanitizedName = sanitizeFilename(explanationImage.name);
        explanationImageUrl = await uploadImage(
          "explanation-images",
          explanationImage,
          `explanations/${Date.now()}-${sanitizedName}`
        );
      }

      // Upload answer images
      const answerImageUrls = await Promise.all(
        answerImages.map(async (img, index) => {
          if (img) {
            const sanitizedName = sanitizeFilename(img.name);
            return await uploadImage(
              "answer-images",
              img,
              `answers/${Date.now()}-${index}-${sanitizedName}`
            );
          }
          return answerImagePreviews[index] || null;
        })
      );

      const questionData = {
        name: questionName.trim() || null,
        question_text: questionText.trim() || null,
        question_image_url: questionImageUrl || null,
        reference_image_url: referenceImageUrl,
        answers,
        answer_image_urls: answerImageUrls,
        answer_layout: answerLayout,
        correct_answer: correctAnswer,
        explanation_text: explanationText,
        explanation_image_url: explanationImageUrl,
        topics: selectedTopics,
        points: points,
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
          message: editingId ? "Question updated successfully!" : "Question created successfully!"
        });
        resetForm();
        loadQuestions();
        loadTestsData(); // Refresh test question counts
        setTimeout(() => setNotification(null), 3000);
      } else {
        throw new Error("Failed to save question");
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === "bugs" ? "bg-white text-black" : "bg-red-500 text-white"
                }`}>
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

            {isLoadingTests ? (
              <div className="text-center py-8 text-gray-500">Loading tests...</div>
            ) : tests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tests yet. Create your first test to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 truncate">{test.name}</h3>
                          {!test.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {test.description && (
                          <p className="text-sm text-gray-600 truncate mb-2">{test.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {test.questionCount || 0} questions
                          </span>
                          {test.scaledScoreTable && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg active:scale-95 transition-all"
                          title="Delete test"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                {bugCounts.open + bugCounts.reviewed + bugCounts.resolved} total reports
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setBugStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  bugStatusFilter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({bugCounts.open + bugCounts.reviewed + bugCounts.resolved})
              </button>
              <button
                onClick={() => setBugStatusFilter('open')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  bugStatusFilter === 'open'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Open ({bugCounts.open})
              </button>
              <button
                onClick={() => setBugStatusFilter('reviewed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  bugStatusFilter === 'reviewed'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                Reviewed ({bugCounts.reviewed})
              </button>
              <button
                onClick={() => setBugStatusFilter('resolved')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  bugStatusFilter === 'resolved'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                Resolved ({bugCounts.resolved})
              </button>
            </div>

            {/* Bug Reports List */}
            {isLoadingBugs ? (
              <div className="text-center py-8 text-gray-500">Loading reports...</div>
            ) : bugReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {bugStatusFilter === 'all'
                  ? 'No bug reports yet.'
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
                        onClick={() => setExpandedBugId(isExpanded ? null : report.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {/* Status Badge */}
                              <span
                                className={`px-2 py-0.5 text-xs font-bold rounded ${
                                  report.status === 'open'
                                    ? 'bg-red-100 text-red-700'
                                    : report.status === 'reviewed'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
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
                              {report.test_id && testNamesMap[report.test_id] && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                                  {testNamesMap[report.test_id]}
                                </span>
                              )}

                              {/* Has Screenshot */}
                              {report.screenshot_url && (
                                <span className="text-purple-500" title="Has screenshot">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                              isExpanded ? 'rotate-180' : ''
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
                            <h4 className="text-xs font-bold text-gray-700 mb-1">Description</h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">
                              {report.description}
                            </p>
                          </div>

                          {/* Screenshot */}
                          {report.screenshot_url && (
                            <div className="mb-4">
                              <h4 className="text-xs font-bold text-gray-700 mb-2">Screenshot</h4>
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
                              <h4 className="text-xs font-bold text-gray-700 mb-2">Question Preview</h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
                                {/* Question Info Header */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {report.question_number && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-black text-white rounded">
                                      Question #{report.question_number}
                                    </span>
                                  )}
                                  {report.test_id && testNamesMap[report.test_id] && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                      {testNamesMap[report.test_id]}
                                    </span>
                                  )}
                                  {question.topics && question.topics.length > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded">
                                      {question.topics.join(', ')}
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
                                  <span className="font-semibold">Correct Answer:</span>{' '}
                                  ({question.correct_answer}){' '}
                                  <MathText text={question.answers[question.correct_answer - 1]} />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {report.status !== 'reviewed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBugStatusChange(report.id, 'reviewed');
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 active:scale-95 transition-all"
                              >
                                Mark Reviewed
                              </button>
                            )}
                            {report.status !== 'resolved' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBugStatusChange(report.id, 'resolved');
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all"
                              >
                                Mark Resolved
                              </button>
                            )}
                            {report.status === 'resolved' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBugStatusChange(report.id, 'open');
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
                  Questions ({questions.filter((q) => {
                    const matchesTest = filterTestId === "all" || questionTestMap[q.id]?.includes(filterTestId);
                    if (!matchesTest) return false;
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      (q.name?.toLowerCase().includes(query)) ||
                      (q.question_text?.toLowerCase().includes(query)) ||
                      q.topics.some(t => t.toLowerCase().includes(query)) ||
                      q.answers.some(a => a?.toLowerCase().includes(query))
                    );
                  }).length})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCsvModal(true)}
                    className="text-xs px-3 py-2 font-bold border-2 border-gray-300 text-gray-700 rounded-xl hover:border-black hover:bg-gray-50 active:scale-95 transition-all"
                    title="Bulk upload questions from CSV"
                  >
                    CSV
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                    setSelectedTestIds(newTestId !== "all" ? [newTestId] : []);
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
                <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No questions yet</div>
              ) : (
                <div
                  className="space-y-1 overflow-y-auto flex-1"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleQuestionDrop}
                >
                {questions
                  .filter((q) => {
                    // Test filter
                    const matchesTest = filterTestId === "all" || questionTestMap[q.id]?.includes(filterTestId);
                    if (!matchesTest) return false;

                    // Search filter
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      (q.name?.toLowerCase().includes(query)) ||
                      (q.question_text?.toLowerCase().includes(query)) ||
                      q.topics.some(t => t.toLowerCase().includes(query)) ||
                      q.answers.some(a => a?.toLowerCase().includes(query))
                    );
                  })
                  .sort((a, b) => {
                    // Sort by test-specific order when a test filter is active
                    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
                      const orderA = testQuestionOrder[a.id] ?? Infinity;
                      const orderB = testQuestionOrder[b.id] ?? Infinity;
                      return orderA - orderB;
                    }
                    return 0; // Keep original order from questions table
                  })
                  .map((question, index) => (
                  <div
                    key={question.id}
                    draggable
                    onDragStart={(e) => handleQuestionDragStart(e, question.id)}
                    onDragOver={(e) => handleQuestionDragOver(e, question.id)}
                    onDrop={handleQuestionDrop}
                    onDragEnd={handleQuestionDragEnd}
                    className={`border-2 rounded-xl p-3 hover:bg-gray-50 transition-all cursor-grab active:cursor-grabbing ${
                      editingId === question.id ? "border-black bg-gray-50" : "border-gray-200"
                    } ${draggedQuestionId === question.id ? "opacity-40 bg-blue-50 border-blue-300" : ""}`}
                  >
                        <div className="flex items-start gap-2">
                          {/* Drag Handle */}
                          <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 pt-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                            </svg>
                          </div>
                          {/* Question Info - Always on left */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">
                                  {question.name || `Q${index + 1}`}
                                </p>
                                {question.name && (
                                  <p className="text-[10px] text-gray-400">
                                    Q{index + 1}
                                  </p>
                                )}
                                <p className="text-xs text-gray-600 truncate">
                                  {question.topics.join(", ")}
                                </p>
                                {/* Test badges */}
                                {questionTestMap[question.id]?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {questionTestMap[question.id].slice(0, 2).map((testId) => {
                                      const test = tests.find((t) => t.id === testId);
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
                                    {questionTestMap[question.id].length > 2 && (
                                      <span className="text-[10px] text-gray-500">
                                        +{questionTestMap[question.id].length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 truncate">
                                  ✓ {question.answers[question.correct_answer - 1]}
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
                                  onClick={() => loadQuestionForEdit(question)}
                                  className="p-1.5 text-gray-700 hover:bg-gray-200 rounded-lg active:scale-95 transition-all"
                                  title="Edit question"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(question.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg active:scale-95 transition-all"
                                  title="Delete question"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                  </div>
                ))}
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
                      {(questionText || questionImagePreview) && (
                        <div className="mb-3">
                          {questionImagePreview && (
                            <div className="w-full">
                              <img
                                src={questionImagePreview}
                                alt="Question"
                                className="w-full h-auto max-h-64 object-contain rounded-lg"
                              />
                            </div>
                          )}
                          {questionText && (
                            <div className={questionImagePreview ? "mt-4" : ""} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem' }}>
                              <MathText text={questionText} className="leading-relaxed" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Answers Preview - Same as quiz page */}
                      {answers.some(a => a.trim() || answerImagePreviews[answers.indexOf(a)]) && (
                        <div
                          className={`${
                            answerLayout === 'grid'
                              ? 'grid grid-cols-2 gap-2'
                              : 'space-y-2'
                          }`}
                        >
                          {answers.map((answer, index) => {
                            const answerNum = index + 1;
                            const isCorrect = correctAnswer === answerNum;
                            const gridOrder = answerLayout === 'grid'
                              ? [0, 2, 1, 3][index]
                              : index;

                            let buttonClass = "w-full px-4 py-3 text-left rounded-xl border-2 transition-all duration-200 font-medium";
                            if (isCorrect) {
                              buttonClass += " bg-green-50 border-green-500 text-green-900";
                            } else {
                              buttonClass += " bg-white border-gray-300 text-gray-700";
                            }

                            const answerImage = answerImagePreviews[index];

                            return (
                              <div
                                key={index}
                                style={{ order: gridOrder }}
                              >
                                <div className={buttonClass}>
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
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Empty state */}
                      {!questionText && !questionImagePreview && !answers.some(a => a.trim()) && (
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
              {/* Question Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Question Name (Optional)
                </label>
                <input
                  type="text"
                  value={questionName}
                  onChange={(e) => setQuestionName(e.target.value)}
                  placeholder="e.g., Linear Equations - Problem 1"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-0.5">Helps you identify this question in the list</p>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Question Text <span className="text-gray-500">(text or image required)</span>
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter question text. Use LaTeX for math: \\frac{x}{2}, x^{2}, \\sqrt{x}"
                  rows={3}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-0.5">
                  Use LaTeX for math equations. Examples: $\frac{`{x}`}{`{2}`}$, $x^{`{2}`}$, $\sqrt{`{x}`}$
                </p>
              </div>

              {/* Compact Image Uploads */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Question Image <span className="text-gray-500">(text or image required)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, setQuestionImage, setQuestionImagePreview)}
                    className="hidden"
                    id="question-image"
                  />
                  <label
                    htmlFor="question-image"
                    className="cursor-pointer block"
                    onDragOver={(e) => handleDragOver(e, 'question')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, setQuestionImage, setQuestionImagePreview)}
                  >
                    {questionImagePreview ? (
                      <div className={`relative w-full h-24 rounded border-2 overflow-hidden transition-all ${
                        draggedOver === 'question' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                      }`}>
                        <img src={questionImagePreview} alt="Question" className="w-full h-full object-cover" />
                        {draggedOver === 'question' && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-700">Drop to replace</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`w-full h-24 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-400 transition-colors ${
                        draggedOver === 'question' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
                      }`}>
                        <span className="text-xs font-medium">Drop image</span>
                        <span className="text-xs">or click</span>
                      </div>
                    )}
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reference (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, setReferenceImage, setReferenceImagePreview)}
                    className="hidden"
                    id="reference-image"
                  />
                  <label
                    htmlFor="reference-image"
                    className="cursor-pointer block"
                    onDragOver={(e) => handleDragOver(e, 'reference')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, setReferenceImage, setReferenceImagePreview)}
                  >
                    {referenceImagePreview ? (
                      <div className={`relative w-full h-24 rounded border-2 overflow-hidden transition-all ${
                        draggedOver === 'reference' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                      }`}>
                        <img src={referenceImagePreview} alt="Reference" className="w-full h-full object-cover" />
                        {draggedOver === 'reference' && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-700">Drop to replace</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`w-full h-24 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-400 transition-colors ${
                        draggedOver === 'reference' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
                      }`}>
                        <span className="text-xs font-medium">Drop image</span>
                        <span className="text-xs">or click</span>
                      </div>
                    )}
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Explanation (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, setExplanationImage, setExplanationImagePreview)}
                    className="hidden"
                    id="explanation-image"
                  />
                  <label
                    htmlFor="explanation-image"
                    className="cursor-pointer block"
                    onDragOver={(e) => handleDragOver(e, 'explanation')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, setExplanationImage, setExplanationImagePreview)}
                  >
                    {explanationImagePreview ? (
                      <div className={`relative w-full h-24 rounded border-2 overflow-hidden transition-all ${
                        draggedOver === 'explanation' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                      }`}>
                        <img src={explanationImagePreview} alt="Explanation" className="w-full h-full object-cover" />
                        {draggedOver === 'explanation' && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-700">Drop to replace</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`w-full h-24 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-400 transition-colors ${
                        draggedOver === 'explanation' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
                      }`}>
                        <span className="text-xs font-medium">Drop image</span>
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
                    Answers <span className="text-red-500">*</span> <span className="text-gray-500 font-normal">(text or image or both required)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Layout:</span>
                    <button
                      type="button"
                      onClick={() => setAnswerLayout('list')}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        answerLayout === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      List (1×4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswerLayout('grid')}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        answerLayout === 'grid'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Grid (2×2)
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {answers.map((answer, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <input
                          type="radio"
                          name="correct-answer"
                          checked={correctAnswer === index + 1}
                          onChange={() => setCorrectAnswer(index + 1)}
                          className="h-4 w-4 mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-700">({index + 1})</span>
                            {correctAnswer === index + 1 && (
                              <span className="text-green-600 text-xs font-bold">✓ Correct</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={answer}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
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
                            handleAnswerImageSelect(index, file || null);
                          }}
                          className="hidden"
                          id={`answer-image-${index}`}
                        />
                        {answerImagePreviews[index] ? (
                          <label
                            htmlFor={`answer-image-${index}`}
                            className="cursor-pointer block"
                            onDragOver={(e) => handleAnswerImageDragOver(e, index)}
                            onDragLeave={handleAnswerImageDragLeave}
                            onDrop={(e) => handleAnswerImageDrop(e, index)}
                          >
                            <div className={`relative w-full max-w-xs h-24 rounded border-2 overflow-hidden transition-all ${
                              answerDraggedOver === index ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                            }`}>
                              <img
                                src={answerImagePreviews[index]!}
                                alt={`Answer ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {answerDraggedOver === index && (
                                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                  <span className="text-xs font-bold text-blue-700">Drop to replace</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeAnswerImage(index);
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 active:scale-95 transition-all z-10"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </label>
                        ) : (
                          <label
                            htmlFor={`answer-image-${index}`}
                            className="cursor-pointer block"
                            onDragOver={(e) => handleAnswerImageDragOver(e, index)}
                            onDragLeave={handleAnswerImageDragLeave}
                            onDrop={(e) => handleAnswerImageDrop(e, index)}
                          >
                            <div className={`w-full max-w-xs h-20 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-400 transition-colors ${
                              answerDraggedOver === index ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
                            }`}>
                              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs font-medium">Drop image or click</span>
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
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  placeholder="Explain the correct answer"
                  rows={3}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Topics */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Topics <span className="text-red-500">*</span>
                </label>
                <TagInput
                  selectedTags={selectedTopics}
                  availableTags={availableTags}
                  onChange={setSelectedTopics}
                  placeholder="Type to search or add new topics (e.g., Algebra, Linear Equations)"
                />
              </div>

              {/* Assign to Tests */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Assign to Tests
                </label>
                {tests.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No tests available. Create a test first.</p>
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
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                  placeholder="1"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-0.5">Points awarded for this question (default: 1)</p>
              </div>

              {/* Notification Message */}
              {notification && (
                <div className={`p-4 rounded-xl text-sm font-bold border-2 ${
                  notification.type === "success"
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}>
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
                  {isSubmitting ? "SAVING..." : editingId ? "UPDATE QUESTION" : "CREATE QUESTION"}
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
        />

        {/* CSV Upload Modal */}
        {showCsvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Bulk Upload Questions</h2>
                <button
                  onClick={() => {
                    setShowCsvModal(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setCsvError(null);
                    setCsvSelectedTestIds([]);
                    setShowNoTestWarning(false);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                    Format: Problem, Question, 1, 2, 3, 4, Correct
                  </p>
                </div>

                {/* Assign to Tests */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Tests
                  </label>
                  {tests.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No tests available</p>
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
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Fixed Header */}
                      <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200">
                        <div className="col-span-1 px-3 py-2 text-left text-xs font-bold text-gray-700">#</div>
                        <div className="col-span-7 px-3 py-2 text-left text-xs font-bold text-gray-700">Question</div>
                        <div className="col-span-4 px-3 py-2 text-left text-xs font-bold text-gray-700">Correct</div>
                      </div>
                      {/* Scrollable Body */}
                      <div className="max-h-64 overflow-y-auto">
                        {csvPreview.map((q, i) => (
                          <div
                            key={i}
                            className={`grid grid-cols-12 border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <div className="col-span-1 px-3 py-2 text-sm text-gray-500">{i + 1}</div>
                            <div className="col-span-7 px-3 py-2 text-sm text-gray-900 truncate">
                              {q.question_text}
                            </div>
                            <div className="col-span-4 px-3 py-2 text-sm text-gray-600 truncate">
                              ({q.correct_answer}) {q.answers[q.correct_answer - 1]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* No Test Warning */}
              {showNoTestWarning && (
                <div className="mx-4 mb-0 p-3 bg-yellow-50 border border-yellow-300 rounded-xl">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-yellow-800">No tests selected</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        These questions will be added to the question bank but won&apos;t appear in any test.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                {showNoTestWarning ? (
                  <>
                    <button
                      onClick={() => setShowNoTestWarning(false)}
                      className="px-4 py-2 text-sm font-bold text-gray-700 border-2 border-gray-300 rounded-xl hover:border-black hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={performCsvUpload}
                      disabled={isUploadingCsv}
                      className="px-4 py-2 text-sm font-bold bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isUploadingCsv ? 'Uploading...' : 'Upload Anyway'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowCsvModal(false);
                        setCsvFile(null);
                        setCsvPreview([]);
                        setCsvError(null);
                        setCsvSelectedTestIds([]);
                        setShowNoTestWarning(false);
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
                      {isUploadingCsv ? 'Uploading...' : `Upload ${csvPreview.length} Questions`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
