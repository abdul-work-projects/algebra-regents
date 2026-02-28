"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  fetchSectionsWithCounts,
  createTestSection,
  updateTestSection,
  uploadImage as uploadImageFn,
  unlinkQuestionsFromPassage,
  deletePassage,
} from "@/lib/supabase";
import { getCurrentUser, signOut, onAuthStateChange } from "@/lib/auth";
import {
  fetchBugReports,
  updateBugReportStatus,
  deleteBugReport,
  getBugReportCounts,
  DatabaseBugReport,
} from "@/lib/bugReports";
import TestModal from "@/components/TestModal";
import SubjectModal from "@/components/SubjectModal";
import SectionModal from "@/components/SectionModal";
import { Test, Subject, TestSection } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
// Admin components
import SubjectsTab from "@/components/admin/SubjectsTab";
import BugReportsTab from "@/components/admin/BugReportsTab";
import TestsTab from "@/components/admin/TestsTab";
import QuestionList from "@/components/admin/QuestionList";
import QuestionForm from "@/components/admin/QuestionForm";
import CsvUploadModal from "@/components/admin/CsvUploadModal";
import LinkQuestionsModal from "@/components/admin/LinkQuestionsModal";
import DeleteTestModal from "@/components/admin/DeleteTestModal";
import UngroupQuestionsModal from "@/components/admin/UngroupQuestionsModal";
import TestSettingsModal from "@/components/admin/TestSettingsModal";

type QuestionWithPassage = DatabaseQuestion & { passages?: DatabasePassage | null };

export default function AdminPage() {
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Core data
  const [questions, setQuestions] = useState<QuestionWithPassage[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [questionTestMap, setQuestionTestMap] = useState<{ [questionId: string]: string[] }>({});
  const [testQuestionOrder, setTestQuestionOrder] = useState<{ [questionId: string]: number }>({});
  const [questionSectionMap, setQuestionSectionMap] = useState<{ [questionId: string]: string | undefined }>({});
  const [testSections, setTestSections] = useState<TestSection[]>([]);

  // Autocomplete
  const [availableSkillNames, setAvailableSkillNames] = useState<string[]>([]);
  const [availableTagNames, setAvailableTagNames] = useState<string[]>([]);

  // Tab + UI state
  const [activeTab, setActiveTab] = useState<"questions" | "tests" | "subjects" | "bugs">("questions");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Question editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const q1Form = useQuestionForm();
  const q2Form = useQuestionForm();
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [filterTestId, setFilterTestId] = useState<string>("all");
  const [questionsFilterSubjectId, setQuestionsFilterSubjectId] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grouped question state
  const [isGroupedQuestion, setIsGroupedQuestion] = useState(false);
  const [passageAboveText, setPassageAboveText] = useState("");
  const [passageText, setPassageText] = useState("");
  const [passageImage, setPassageImage] = useState<File | null>(null);
  const [passageImagePreview, setPassageImagePreview] = useState<string | null>(null);
  const [passageImageSize, setPassageImageSize] = useState<"small" | "medium" | "large" | "extra-large">("large");
  const [activeQuestionTab, setActiveQuestionTab] = useState<1 | 2>(1);
  const [editingQ2Id, setEditingQ2Id] = useState<string | null>(null);
  const [editingPassageId, setEditingPassageId] = useState<string | null>(null);

  // Link questions state
  const [selectedForGrouping, setSelectedForGrouping] = useState<string[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<TestSection | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showTestSettingsModal, setShowTestSettingsModal] = useState(false);
  const [deleteTestModal, setDeleteTestModal] = useState<{ show: boolean; test: Test | null; isDeleting: boolean }>({ show: false, test: null, isDeleting: false });
  const [ungroupTarget, setUngroupTarget] = useState<{ passageId: string; questionIds: string[] } | null>(null);
  const [isUngrouping, setIsUngrouping] = useState(false);

  // Tests tab state
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");

  // Bug reports state
  const [bugReports, setBugReports] = useState<DatabaseBugReport[]>([]);
  const [isLoadingBugs, setIsLoadingBugs] = useState(true);
  const [bugStatusFilter, setBugStatusFilter] = useState<"all" | "open" | "reviewed" | "resolved">("all");
  const [bugCounts, setBugCounts] = useState({ open: 0, reviewed: 0, resolved: 0 });
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null);
  const [testNamesMap, setTestNamesMap] = useState<{ [id: string]: string }>({});

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (!currentUser) { router.push("/admin/login"); return; }
      setUser(currentUser);
      setIsCheckingAuth(false);
    }
    checkAuth();
    const subscription = onAuthStateChange((user) => {
      if (!user) router.push("/admin/login");
      else setUser(user);
    });
    return () => { subscription.unsubscribe(); };
  }, [router]);

  // Lock body scroll on admin page — prevent page-level scroll
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100vh";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────
  useEffect(() => {
    loadQuestions();
    loadTestsData();
    loadSubjectsData();
    loadFieldAutocomplete();
    getBugReportCounts().then((counts) => setBugCounts(counts));
  }, []);

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    const data = await fetchQuestions();
    setQuestions(data);
    const allSkills = data.flatMap((q) => q.skills || []);
    setAvailableTags(Array.from(new Set(allSkills)).sort());
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
    const [skills, tags] = await Promise.all([fetchAllSkillNames(), fetchAllTags()]);
    setAvailableSkillNames(skills);
    setAvailableTagNames(tags);
  };

  // Load test-specific order when filter changes
  useEffect(() => {
    async function loadTestOrder() {
      if (filterTestId === "all") {
        setTestQuestionOrder({});
        setQuestionSectionMap({});
        setTestSections([]);
        return;
      }
      const [testQuestions, sections] = await Promise.all([
        fetchQuestionsForTest(filterTestId),
        fetchSectionsWithCounts(filterTestId),
      ]);
      const orderMap: { [questionId: string]: number } = {};
      const sectionMap: { [questionId: string]: string | undefined } = {};
      testQuestions.forEach((q, index) => {
        orderMap[q.id] = index;
        sectionMap[q.id] = (q as any)._sectionId;
      });
      setTestQuestionOrder(orderMap);
      setQuestionSectionMap(sectionMap);
      setTestSections(sections);
    }
    loadTestOrder();
  }, [filterTestId]);

  // ── Bug reports ───────────────────────────────────────────────────────
  const loadBugReports = async () => {
    setIsLoadingBugs(true);
    const filter = bugStatusFilter === "all" ? undefined : bugStatusFilter;
    const data = await fetchBugReports(filter);
    setBugReports(data);
    const counts = await getBugReportCounts();
    setBugCounts(counts);
    const uniqueTestIds = [...new Set(data.filter((r) => r.test_id).map((r) => r.test_id!))];
    const namesMap: { [id: string]: string } = {};
    tests.forEach((t) => { if (uniqueTestIds.includes(t.id)) namesMap[t.id] = t.name; });
    setTestNamesMap(namesMap);
    setIsLoadingBugs(false);
  };

  useEffect(() => {
    if (activeTab === "bugs") loadBugReports();
  }, [activeTab, bugStatusFilter]);

  const handleBugStatusChange = async (reportId: string, newStatus: "open" | "reviewed" | "resolved") => {
    const success = await updateBugReportStatus(reportId, newStatus);
    if (success) loadBugReports();
  };

  const handleDeleteBug = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const success = await deleteBugReport(reportId);
    if (success) loadBugReports();
  };

  // ── Test CRUD ─────────────────────────────────────────────────────────
  const handleSaveTest = async (testData: { name: string; description?: string; scaled_score_table?: { [key: string]: number }; is_active: boolean; subject_id: string }) => {
    if (editingTest) {
      const result = await updateTest(editingTest.id, testData);
      if (result) { setNotification({ type: "success", message: "Test updated successfully" }); loadTestsData(); }
      else throw new Error("Failed to update test");
    } else {
      const result = await createTest(testData);
      if (result) { setNotification({ type: "success", message: "Test created successfully" }); loadTestsData(); }
      else throw new Error("Failed to create test");
    }
    setEditingTest(null);
  };

  const handleDeleteTest = (test: Test) => { setDeleteTestModal({ show: true, test, isDeleting: false }); };

  const confirmDeleteTest = async (deleteQuestions: boolean) => {
    if (!deleteTestModal.test) return;
    setDeleteTestModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      let deletedQuestionsCount = 0;
      if (deleteQuestions) {
        const result = await deleteQuestionsForTest(deleteTestModal.test.id);
        if (!result.success) { setNotification({ type: "error", message: "Failed to delete questions" }); setDeleteTestModal((prev) => ({ ...prev, isDeleting: false })); return; }
        deletedQuestionsCount = result.count;
      }
      const success = await deleteTest(deleteTestModal.test.id);
      if (success) {
        const message = deleteQuestions && deletedQuestionsCount > 0 ? `Test and ${deletedQuestionsCount} question${deletedQuestionsCount !== 1 ? "s" : ""} deleted successfully` : "Test deleted successfully";
        setNotification({ type: "success", message });
        loadTestsData();
        loadQuestions();
      } else { setNotification({ type: "error", message: "Failed to delete test" }); }
    } finally { setDeleteTestModal({ show: false, test: null, isDeleting: false }); }
  };

  const handleUngroupQuestions = (passageId: string, questionIds: string[]) => {
    setUngroupTarget({ passageId, questionIds });
  };

  const confirmUngroupQuestions = async () => {
    if (!ungroupTarget) return;
    setIsUngrouping(true);
    try {
      const unlinked = await unlinkQuestionsFromPassage(ungroupTarget.questionIds);
      if (!unlinked) { setNotification({ type: "error", message: "Failed to ungroup questions" }); return; }
      await deletePassage(ungroupTarget.passageId);
      setNotification({ type: "success", message: "Questions ungrouped successfully" });
      if (editingId && ungroupTarget.questionIds.includes(editingId)) resetForm();
      loadQuestions();
    } finally {
      setIsUngrouping(false);
      setUngroupTarget(null);
    }
  };

  // ── Subject CRUD ──────────────────────────────────────────────────────
  const handleSaveSubject = async (subjectData: { name: string; description?: string; color: string; is_active: boolean; display_order: number }) => {
    if (editingSubject) {
      const result = await updateSubject(editingSubject.id, subjectData);
      if (result) { setNotification({ type: "success", message: "Subject updated successfully" }); loadSubjectsData(); }
      else throw new Error("Failed to update subject");
    } else {
      const result = await createSubject(subjectData);
      if (result) { setNotification({ type: "success", message: "Subject created successfully" }); loadSubjectsData(); }
      else throw new Error("Failed to create subject");
    }
    setEditingSubject(null);
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (subject.testCount && subject.testCount > 0) { setNotification({ type: "error", message: `Cannot delete subject with ${subject.testCount} test(s). Please delete or reassign all tests first.` }); return; }
    if (!window.confirm(`Are you sure you want to delete "${subject.name}"?`)) return;
    const success = await deleteSubject(subject.id);
    if (success) { setNotification({ type: "success", message: "Subject deleted successfully" }); loadSubjectsData(); }
    else setNotification({ type: "error", message: "Failed to delete subject" });
  };

  // ── Question CRUD ─────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null);
    setEditingQ2Id(null);
    setEditingPassageId(null);
    q1Form.reset();
    q2Form.reset();
    setSelectedTestIds(filterTestId !== "all" ? [filterTestId] : []);
    setIsGroupedQuestion(false);
    setPassageAboveText("");
    setPassageText("");
    setPassageImage(null);
    setPassageImagePreview(null);
    setPassageImageSize("large");
    setActiveQuestionTab(1);
  };

  const toggleQuestionSelection = (questionId: string) => {
    if (!questionId) { setSelectedForGrouping([]); return; }
    setSelectedForGrouping((prev) => {
      if (prev.includes(questionId)) return prev.filter((id) => id !== questionId);
      if (prev.length >= 2) return [...prev.slice(1), questionId];
      return [...prev, questionId];
    });
  };

  const handleLinkQuestions = async () => {
    if (selectedForGrouping.length !== 2) { setNotification({ type: "error", message: "Please select exactly 2 questions to group" }); return; }
    const alreadyGrouped = selectedForGrouping.some((id) => { const q = questions.find((q) => q.id === id); return q?.passage_id; });
    if (alreadyGrouped) { setNotification({ type: "error", message: "One or more selected questions are already in a group. Ungroup them first." }); return; }
    setShowLinkModal(true);
  };

  const confirmLinkQuestions = async (linkPassageText: string, linkPassageImage: File | null) => {
    if (selectedForGrouping.length !== 2) return;
    let passageImageUrl: string | null = null;
    if (linkPassageImage) {
      const sanitizedName = linkPassageImage.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      passageImageUrl = await uploadImage("question-images", linkPassageImage, `passages/${Date.now()}-${sanitizedName}`);
    }
    const result = await linkQuestionsToNewPassage(selectedForGrouping, { passage_text: linkPassageText.trim() || null, passage_image_url: passageImageUrl });
    if (result && result.updatedCount === 2) {
      setNotification({ type: "success", message: "Questions linked successfully!" });
      setShowLinkModal(false);
      setSelectedForGrouping([]);
      loadQuestions();
    } else { throw new Error("Failed to link all questions"); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    const success = await deleteQuestion(id);
    if (success) { setNotification({ type: "success", message: "Question deleted successfully" }); loadQuestions(); if (editingId === id) resetForm(); }
    else setNotification({ type: "error", message: "Failed to delete question" });
  };

  const loadQuestionForEdit = async (question: QuestionWithPassage) => {
    if (question.passage_id) {
      const siblingQuestion = questions.find((q) => q.id !== question.id && q.passage_id === question.passage_id);
      if (siblingQuestion) {
        const questionsOrdered = [question, siblingQuestion].sort((a, b) => {
          if (a.display_order !== undefined && b.display_order !== undefined) return a.display_order - b.display_order;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        const [q1, q2] = questionsOrdered;
        setEditingId(q1.id);
        setEditingQ2Id(q2.id);
        setEditingPassageId(question.passage_id);
        setIsGroupedQuestion(true);
        setActiveQuestionTab(question.id === q2.id ? 2 : 1);
        const passage = question.passages;
        setPassageAboveText(passage?.above_text || "");
        setPassageText(passage?.passage_text || "");
        setPassageImagePreview(passage?.passage_image_url || null);
        setPassageImage(null);
        setPassageImageSize((passage?.image_size as "small" | "medium" | "large" | "extra-large") || "large");
        q1Form.loadFromQuestion({ name: q1.name, question_text: q1.question_text, above_image_text: q1.above_image_text, question_image_url: q1.question_image_url, reference_image_url: q1.reference_image_url, explanation_image_url: q1.explanation_image_url, answers: q1.answers, answer_image_urls: q1.answer_image_urls, answer_layout: q1.answer_layout, image_size: q1.image_size, question_type: q1.question_type, correct_answer: q1.correct_answer, explanation_text: q1.explanation_text, skills: q1.skills || [], tags: q1.tags || [], difficulty: q1.difficulty, points: q1.points });
        q2Form.loadFromQuestion({ name: q2.name, question_text: q2.question_text, above_image_text: q2.above_image_text, question_image_url: q2.question_image_url, reference_image_url: q2.reference_image_url, explanation_image_url: q2.explanation_image_url, answers: q2.answers, answer_image_urls: q2.answer_image_urls, answer_layout: q2.answer_layout, image_size: q2.image_size, question_type: q2.question_type, correct_answer: q2.correct_answer, explanation_text: q2.explanation_text, skills: q2.skills || [], tags: q2.tags || [], difficulty: q2.difficulty, points: q2.points });
        const questionTestIds = await getTestsForQuestion(q1.id);
        setSelectedTestIds(questionTestIds);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setEditingId(question.id);
    setEditingQ2Id(null);
    setEditingPassageId(null);
    setIsGroupedQuestion(false);
    q1Form.loadFromQuestion({ name: question.name, question_text: question.question_text, above_image_text: question.above_image_text, question_image_url: question.question_image_url, reference_image_url: question.reference_image_url, explanation_image_url: question.explanation_image_url, answers: question.answers, answer_image_urls: question.answer_image_urls, answer_layout: question.answer_layout, image_size: question.image_size, question_type: question.question_type, correct_answer: question.correct_answer, explanation_text: question.explanation_text, skills: question.skills || [], tags: question.tags || [], difficulty: question.difficulty, points: question.points });
    const questionTestIds = await getTestsForQuestion(question.id);
    setSelectedTestIds(questionTestIds);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sanitizeFilename = (filename: string): string => {
    return filename.replace(/\s+/g, "_").replace(/[^\w.-]/g, "").toLowerCase();
  };

  // ── Question submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q1 = q1Form.state;
    const q2 = q2Form.state;

    const hasQuestionText = q1.questionText.trim() || q1.aboveImageText.trim();
    const hasQuestionImage = q1.questionImage || q1.questionImagePreview;
    if (!hasQuestionText && !hasQuestionImage) { setNotification({ type: "error", message: "Question 1 must have text (above or below) or an image" }); return; }

    for (let i = 0; i < 4; i++) {
      const hasText = q1.answers[i]?.trim();
      const hasImage = q1.answerImages[i] || q1.answerImagePreviews[i];
      if (!hasText && !hasImage) { setNotification({ type: "error", message: `Question 1 Answer ${i + 1} must have either text or image (or both)` }); return; }
    }
    if (!q1.explanationText.trim()) { setNotification({ type: "error", message: "Question 1 explanation text is required" }); return; }
    if (q1.selectedSkills.length === 0) { setNotification({ type: "error", message: "At least one skill is required" }); return; }
    if (selectedTestIds.length === 0) { setNotification({ type: "error", message: "Question must be assigned to at least one test" }); return; }

    if (isGroupedQuestion) {
      if (!passageText.trim() && !passageImage && !passageImagePreview) { setNotification({ type: "error", message: "Grouped questions must have a passage (text or image)" }); return; }
      const hasQ2Text = q2.questionText.trim() || q2.aboveImageText.trim();
      const hasQ2Image = q2.questionImage || q2.questionImagePreview;
      if (!hasQ2Text && !hasQ2Image) { setNotification({ type: "error", message: "Question 2 must have text (above or below) or an image" }); return; }
      for (let i = 0; i < 4; i++) {
        const hasText = q2.answers[i]?.trim();
        const hasImage = q2.answerImages[i] || q2.answerImagePreviews[i];
        if (!hasText && !hasImage) { setNotification({ type: "error", message: `Question 2 Answer ${i + 1} must have either text or image (or both)` }); return; }
      }
      if (!q2.explanationText.trim()) { setNotification({ type: "error", message: "Question 2 explanation text is required" }); return; }
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      if (isGroupedQuestion && !editingId) {
        let passageImageUrl: string | null = null;
        if (passageImage) { passageImageUrl = await uploadImage("question-images", passageImage, `passages/${Date.now()}-${sanitizeFilename(passageImage.name)}`); }

        const uploadQuestionImages = async (form: typeof q1, prefix: string) => {
          let imageUrl: string | null = null;
          if (form.questionImage) imageUrl = await uploadImage("question-images", form.questionImage, `questions/${Date.now()}-${prefix}-${sanitizeFilename(form.questionImage.name)}`);
          let explanationImageUrl: string | null = null;
          if (form.explanationImage) explanationImageUrl = await uploadImage("explanation-images", form.explanationImage, `explanations/${Date.now()}-${prefix}-${sanitizeFilename(form.explanationImage.name)}`);
          const answerImageUrls = await Promise.all(form.answerImages.map(async (img, index) => { if (img) return await uploadImage("answer-images", img, `answers/${Date.now()}-${prefix}-${index}-${sanitizeFilename(img.name)}`); return form.answerImagePreviews[index] || null; }));
          return { imageUrl, explanationImageUrl, answerImageUrls };
        };

        const q1Images = await uploadQuestionImages(q1, "q1");
        const q2Images = await uploadQuestionImages(q2, "q2");

        const baseOrder = questions.length + 1;
        const result = await createPassageWithQuestions(
          { above_text: passageAboveText.trim() || null, passage_text: passageText.trim() || null, passage_image_url: passageImageUrl, image_size: passageImageSize },
          [
            { name: q1.questionName.trim() || null, question_text: q1.questionText.trim() || null, above_image_text: q1.aboveImageText.trim() || null, question_image_url: q1Images.imageUrl, reference_image_url: null, answers: q1.answers, answer_image_urls: q1Images.answerImageUrls, answer_layout: q1.answerLayout, image_size: q1.imageSize, question_type: q1.questionType, correct_answer: q1.correctAnswer, explanation_text: q1.explanationText, explanation_image_url: q1Images.explanationImageUrl, skills: q1.selectedSkills, tags: q1.selectedTags, difficulty: (q1.difficulty as "easy" | "medium" | "hard") || null, points: q1.points, display_order: baseOrder },
            { name: q2.questionName.trim() || null, question_text: q2.questionText.trim() || null, above_image_text: q2.aboveImageText.trim() || null, question_image_url: q2Images.imageUrl, reference_image_url: null, answers: q2.answers, answer_image_urls: q2Images.answerImageUrls, answer_layout: q2.answerLayout, image_size: q2.imageSize, question_type: q2.questionType, correct_answer: q2.correctAnswer, explanation_text: q2.explanationText, explanation_image_url: q2Images.explanationImageUrl, skills: q1.selectedSkills, tags: q1.selectedTags, difficulty: (q1.difficulty as "easy" | "medium" | "hard") || null, points: q2.points, display_order: baseOrder + 1 },
          ]
        );
        if (result) {
          for (const question of result.questions) { await setTestsForQuestion(question.id, selectedTestIds); }
          setNotification({ type: "success", message: "Grouped questions created successfully!" });
          resetForm(); loadQuestions(); loadTestsData();
          setTimeout(() => setNotification(null), 3000);
        } else throw new Error("Failed to create grouped questions");

      } else if (isGroupedQuestion && editingId && editingQ2Id && editingPassageId) {
        let pImageUrl: string | null = passageImagePreview;
        if (passageImage) pImageUrl = await uploadImage("question-images", passageImage, `passages/${Date.now()}-${sanitizeFilename(passageImage.name)}`);
        const passageResult = await updatePassage(editingPassageId, { above_text: passageAboveText.trim() || null, passage_text: passageText.trim() || null, passage_image_url: pImageUrl, image_size: passageImageSize });
        if (!passageResult) throw new Error("Failed to update passage");

        const uploadAndUpdate = async (form: typeof q1, qId: string, prefix: string) => {
          let imageUrl = form.questionImagePreview;
          if (form.questionImage) imageUrl = await uploadImage("question-images", form.questionImage, `questions/${Date.now()}-${prefix}-${sanitizeFilename(form.questionImage.name)}`);
          let explanationImageUrl = form.explanationImagePreview;
          if (form.explanationImage) explanationImageUrl = await uploadImage("explanation-images", form.explanationImage, `explanations/${Date.now()}-${prefix}-${sanitizeFilename(form.explanationImage.name)}`);
          const answerImageUrls = await Promise.all(form.answerImages.map(async (img, index) => { if (img) return await uploadImage("answer-images", img, `answers/${Date.now()}-${prefix}-${index}-${sanitizeFilename(img.name)}`); return form.answerImagePreviews[index] || null; }));
          const qIndex = questions.findIndex((q) => q.id === qId);
          return await updateQuestion(qId, { name: form.questionName.trim() || null, question_text: form.questionText.trim() || null, above_image_text: form.aboveImageText.trim() || null, question_image_url: imageUrl || null, reference_image_url: null, answers: form.answers, answer_image_urls: answerImageUrls, answer_layout: form.answerLayout, image_size: form.imageSize, question_type: form.questionType, correct_answer: form.correctAnswer, explanation_text: form.explanationText, explanation_image_url: explanationImageUrl || null, skills: q1.selectedSkills, tags: q1.selectedTags, difficulty: (q1.difficulty as "easy" | "medium" | "hard") || null, points: form.points, ...(qIndex !== -1 ? { display_order: qIndex + 1 } : {}) });
        };

        const q1Result = await uploadAndUpdate(q1, editingId, "q1");
        const q2Result = await uploadAndUpdate(q2, editingQ2Id, "q2");
        if (q1Result && q2Result) {
          await setTestsForQuestion(editingId, selectedTestIds);
          await setTestsForQuestion(editingQ2Id, selectedTestIds);
          setNotification({ type: "success", message: "Grouped questions updated successfully!" });
          resetForm(); loadQuestions(); loadTestsData();
          setTimeout(() => setNotification(null), 3000);
        } else throw new Error("Failed to update grouped questions");

      } else {
        let questionImageUrl = q1.questionImagePreview;
        if (q1.questionImage) { questionImageUrl = await uploadImage("question-images", q1.questionImage, `questions/${Date.now()}-${sanitizeFilename(q1.questionImage.name)}`); if (!questionImageUrl) throw new Error("Failed to upload question image"); }
        let referenceImageUrl = q1.referenceImagePreview;
        if (q1.referenceImage) referenceImageUrl = await uploadImage("reference-images", q1.referenceImage, `references/${Date.now()}-${sanitizeFilename(q1.referenceImage.name)}`);
        let explanationImageUrl = q1.explanationImagePreview;
        if (q1.explanationImage) explanationImageUrl = await uploadImage("explanation-images", q1.explanationImage, `explanations/${Date.now()}-${sanitizeFilename(q1.explanationImage.name)}`);
        const answerImageUrls = await Promise.all(q1.answerImages.map(async (img, index) => { if (img) return await uploadImage("answer-images", img, `answers/${Date.now()}-${index}-${sanitizeFilename(img.name)}`); return q1.answerImagePreviews[index] || null; }));

        const questionData: Record<string, unknown> = { name: q1.questionName.trim() || null, question_text: q1.questionText.trim() || null, above_image_text: q1.aboveImageText.trim() || null, question_image_url: questionImageUrl || null, reference_image_url: referenceImageUrl, answers: q1.answers, answer_image_urls: answerImageUrls, answer_layout: q1.answerLayout, image_size: q1.imageSize, question_type: q1.questionType, correct_answer: q1.correctAnswer, explanation_text: q1.explanationText, explanation_image_url: explanationImageUrl, skills: q1.selectedSkills, tags: q1.selectedTags, difficulty: (q1.difficulty as "easy" | "medium" | "hard") || null, points: q1.points, passage_id: null };

        let result;
        let questionId: string;
        if (editingId) {
          const editIndex = questions.findIndex((q) => q.id === editingId);
          if (editIndex !== -1) questionData.display_order = editIndex + 1;
          result = await updateQuestion(editingId, questionData as Partial<DatabaseQuestion>);
          questionId = editingId;
        } else {
          questionData.display_order = questions.length + 1;
          result = await createQuestion(questionData as Omit<DatabaseQuestion, "id" | "created_at" | "updated_at">);
          questionId = result?.id || "";
        }

        if (result) {
          if (questionId) await setTestsForQuestion(questionId, selectedTestIds);
          setNotification({ type: "success", message: editingId ? "Question updated successfully!" : "Question created successfully!" });
          resetForm(); loadQuestions(); loadTestsData();
          setTimeout(() => setNotification(null), 3000);
        } else throw new Error("Failed to save question");
      }
    } catch (error) {
      setNotification({ type: "error", message: error instanceof Error ? error.message : "An error occurred" });
    } finally { setIsSubmitting(false); }
  };

  // ── CSV upload handler ────────────────────────────────────────────────
  const handleCsvUpload = async (csvData: Array<{ question_text: string; answers: string[]; correct_answer: number; points: number; difficulty: "easy" | "medium" | "hard" | null; skills: string[]; tags: string[] }>, testIds: string[]) => {
    const questionsToCreate = csvData.map((q, index) => ({ name: null, question_text: q.question_text, above_image_text: null, question_image_url: null, reference_image_url: null, answers: q.answers, answer_image_urls: [null, null, null, null], answer_layout: "list" as const, question_type: "multiple-choice" as const, correct_answer: q.correct_answer, explanation_text: "See solution in your notes.", explanation_image_url: null, skills: q.skills, tags: q.tags, difficulty: q.difficulty, points: q.points, passage_id: null, display_order: questions.length + index + 1 }));
    const result = await bulkCreateQuestions(questionsToCreate);
    if (!result.success) throw new Error(result.error || "Failed to create questions");
    if (testIds.length > 0 && result.data) { for (const question of result.data) { await setTestsForQuestion(question.id, testIds); } }
    setNotification({ type: "success", message: `Successfully uploaded ${csvData.length} questions!` });
    loadQuestions(); loadTestsData();
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Drag/drop save ────────────────────────────────────────────────────
  const handleDragDropSave = async () => {
    if (filterTestId !== "all" && Object.keys(testQuestionOrder).length > 0) {
      const sortedEntries = Object.entries(testQuestionOrder).sort((a, b) => a[1] - b[1]);
      const testOrders = sortedEntries.map(([questionId], index) => ({ questionId, display_order: index + 1 }));
      const success = await updateTestQuestionOrders(filterTestId, testOrders);
      if (!success) {
        setNotification({ type: "error", message: "Failed to save question order for this test" });
        const testQuestions = await fetchQuestionsForTest(filterTestId);
        const orderMap: { [questionId: string]: number } = {};
        testQuestions.forEach((q, index) => { orderMap[q.id] = index; });
        setTestQuestionOrder(orderMap);
      }
    } else {
      const orders = questions.map((q, index) => ({ id: q.id, display_order: index + 1 }));
      const success = await updateQuestionOrders(orders);
      if (!success) { setNotification({ type: "error", message: "Failed to save question order" }); loadQuestions(); }
    }
  };

  const handleQuestionsFilterSubjectIdChange = (subjectId: string) => {
    setQuestionsFilterSubjectId(subjectId);
    if (filterTestId !== "all") {
      const selectedTest = tests.find((t) => t.id === filterTestId);
      if (selectedTest && subjectId !== "all" && selectedTest.subjectId !== subjectId) {
        setFilterTestId("all");
        resetForm();
        setSelectedTestIds([]);
      }
    }
  };

  const handleFilterTestIdChange = (testId: string) => {
    setFilterTestId(testId);
    resetForm();
    setSelectedTestIds(testId !== "all" ? [testId] : []);
  };

  const handleTestSettingsChanged = async () => {
    await loadTestsData();
    if (filterTestId !== "all") {
      const [testQuestions, sections] = await Promise.all([
        fetchQuestionsForTest(filterTestId),
        fetchSectionsWithCounts(filterTestId),
      ]);
      const orderMap: { [questionId: string]: number } = {};
      const sectionMap: { [questionId: string]: string | undefined } = {};
      testQuestions.forEach((q, index) => {
        orderMap[q.id] = index;
        sectionMap[q.id] = (q as any)._sectionId;
      });
      setTestQuestionOrder(orderMap);
      setQuestionSectionMap(sectionMap);
      setTestSections(sections);
    }
  };

  const handleLogout = async () => { await signOut(); router.push("/dashboard"); };

  // ── Render ────────────────────────────────────────────────────────────
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <div className="text-gray-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  const adminTabs = [
    { key: "questions" as const, label: "Questions" },
    { key: "tests" as const, label: "Tests" },
    { key: "subjects" as const, label: "Subjects" },
    { key: "bugs" as const, label: "Bugs", badge: bugCounts.open },
  ];

  return (
    <div className="bg-gray-50 dark:bg-neutral-950 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/beaver-images/logo.png" alt="Regents Ready" width={28} height={28} className="rounded-lg" />
            <span className="text-sm font-bold text-gray-900 dark:text-neutral-100 tracking-tight hidden sm:block">Admin</span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {adminTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setNotification(null); }}
                className={`relative px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-800"
                }`}
              >
                {tab.label}
                {tab.badge ? (
                  <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    activeTab === tab.key
                      ? "bg-white text-black dark:bg-black dark:text-white"
                      : "bg-red-500 text-white"
                  }`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 flex-shrink-0">
            <ThemeToggle />
            {user?.email && (
              <span className="text-xs text-gray-500 dark:text-neutral-400 truncate max-w-[120px] hidden md:block">{user.email}</span>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-neutral-400 border border-gray-200 dark:border-neutral-700 rounded-full hover:border-black dark:hover:border-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 active:scale-95 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 ${activeTab === 'questions' ? 'lg:overflow-hidden overflow-y-auto' : 'overflow-y-auto'}`}>
      <div className={`max-w-7xl mx-auto px-3 sm:px-4 py-3 ${activeTab === 'questions' ? 'lg:h-full' : ''}`}>
        {activeTab === "tests" && (
          <TestsTab
            tests={tests}
            subjects={subjects}
            questions={questions}
            questionTestMap={questionTestMap}
            isLoading={isLoadingTests}
            filterSubjectId={filterSubjectId}
            onFilterSubjectIdChange={setFilterSubjectId}
            onCreateTest={() => { setEditingTest(null); setShowTestModal(true); }}
            onEditTest={(test) => { setEditingTest(test); setShowTestModal(true); }}
            onDeleteTest={handleDeleteTest}
            onShowSectionModal={(section) => { setEditingSection(section); setShowSectionModal(true); }}
          />
        )}

        {activeTab === "subjects" && (
          <SubjectsTab
            subjects={subjects}
            isLoading={isLoadingSubjects}
            onCreateSubject={() => { setEditingSubject(null); setShowSubjectModal(true); }}
            onEditSubject={(subject) => { setEditingSubject(subject); setShowSubjectModal(true); }}
            onDeleteSubject={handleDeleteSubject}
          />
        )}

        {activeTab === "bugs" && (
          <BugReportsTab
            bugReports={bugReports}
            isLoading={isLoadingBugs}
            bugStatusFilter={bugStatusFilter}
            onBugStatusFilterChange={setBugStatusFilter}
            bugCounts={bugCounts}
            expandedBugId={expandedBugId}
            onToggleBugExpand={setExpandedBugId}
            onBugStatusChange={handleBugStatusChange}
            onDeleteBug={handleDeleteBug}
            questions={questions}
            testNamesMap={testNamesMap}
          />
        )}

        {activeTab === "questions" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start lg:items-stretch lg:h-full">
            <QuestionList
              questions={questions}
              tests={tests}
              questionTestMap={questionTestMap}
              testQuestionOrder={testQuestionOrder}
              testSections={testSections}
              questionSectionMap={questionSectionMap}
              subjects={subjects}
              filterSubjectId={questionsFilterSubjectId}
              onFilterSubjectIdChange={handleQuestionsFilterSubjectIdChange}
              filterTestId={filterTestId}
              onFilterTestIdChange={handleFilterTestIdChange}
              editingId={editingId}
              isLoadingQuestions={isLoadingQuestions}
              selectedForGrouping={selectedForGrouping}
              onToggleQuestionSelection={toggleQuestionSelection}
              onLinkQuestions={handleLinkQuestions}
              onShowCsvModal={() => setShowCsvModal(true)}
              onResetForm={resetForm}
              onLoadQuestionForEdit={loadQuestionForEdit}
              onDeleteQuestion={handleDeleteQuestion}
              onQuestionsReorder={setQuestions}
              onTestQuestionOrderChange={setTestQuestionOrder}
              onDragDrop={handleDragDropSave}
              onShowTestSettings={() => setShowTestSettingsModal(true)}
              onUngroupQuestions={handleUngroupQuestions}
            />

            <QuestionForm
              editingId={editingId}
              q1Form={q1Form}
              q2Form={q2Form}
              isGroupedQuestion={isGroupedQuestion}
              onToggleGrouped={setIsGroupedQuestion}
              activeQuestionTab={activeQuestionTab}
              onActiveQuestionTabChange={setActiveQuestionTab}
              passageAboveText={passageAboveText}
              onPassageAboveTextChange={setPassageAboveText}
              passageText={passageText}
              onPassageTextChange={setPassageText}
              passageImage={passageImage}
              passageImagePreview={passageImagePreview}
              onPassageImageChange={(file, preview) => { setPassageImage(file); setPassageImagePreview(preview); }}
              passageImageSize={passageImageSize}
              onPassageImageSizeChange={setPassageImageSize}
              selectedTestIds={selectedTestIds}
              onSelectedTestIdsChange={setSelectedTestIds}
              tests={tests}
              availableTags={availableTags}
              availableTagNames={availableTagNames}
              isSubmitting={isSubmitting}
              notification={notification}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </div>
      </div>

      {/* Modals */}
      <TestModal
        isOpen={showTestModal}
        onClose={() => { setShowTestModal(false); setEditingTest(null); }}
        onSave={handleSaveTest}
        editingTest={editingTest}
        subjects={subjects}
      />

      <SubjectModal
        isOpen={showSubjectModal}
        onClose={() => { setShowSubjectModal(false); setEditingSubject(null); }}
        onSave={handleSaveSubject}
        editingSubject={editingSubject}
      />

      <SectionModal
        isOpen={showSectionModal}
        onClose={() => { setShowSectionModal(false); setEditingSection(null); }}
        onSave={async (data) => {
          let referenceImageUrl = data.referenceImageUrl || "";
          if (data.referenceImageFile) {
            const uploadedUrl = await uploadImage("reference-images", data.referenceImageFile, "sections/" + Date.now() + "-" + data.referenceImageFile.name);
            if (uploadedUrl) referenceImageUrl = uploadedUrl;
          }
          const targetTestId = showTestSettingsModal ? filterTestId : expandedTestId;
          if (editingSection) {
            await updateTestSection(editingSection.id, { name: data.name, description: data.description || null, reference_image_url: referenceImageUrl || null });
          } else if (targetTestId) {
            await createTestSection({ test_id: targetTestId, name: data.name, description: data.description || undefined, reference_image_url: referenceImageUrl || undefined, display_order: testSections.length });
          }
          setShowSectionModal(false);
          setEditingSection(null);
          if (showTestSettingsModal) handleTestSettingsChanged();
        }}
        section={editingSection}
      />

      <CsvUploadModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        tests={tests}
        onUpload={handleCsvUpload}
      />

      <LinkQuestionsModal
        isOpen={showLinkModal}
        onClose={() => { setShowLinkModal(false); }}
        selectedQuestions={selectedForGrouping}
        questions={questions}
        onConfirm={confirmLinkQuestions}
      />

      <UngroupQuestionsModal
        isOpen={!!ungroupTarget}
        questionCount={ungroupTarget?.questionIds.length || 0}
        isUngrouping={isUngrouping}
        onClose={() => setUngroupTarget(null)}
        onConfirm={confirmUngroupQuestions}
      />

      <DeleteTestModal
        isOpen={deleteTestModal.show}
        test={deleteTestModal.test}
        isDeleting={deleteTestModal.isDeleting}
        onClose={() => setDeleteTestModal({ show: false, test: null, isDeleting: false })}
        onConfirm={confirmDeleteTest}
      />

      <TestSettingsModal
        isOpen={showTestSettingsModal}
        onClose={() => setShowTestSettingsModal(false)}
        test={filterTestId !== "all" ? tests.find((t) => t.id === filterTestId) || null : null}
        subjects={subjects}
        testSections={testSections}
        testQuestionOrder={testQuestionOrder}
        questionSectionMap={questionSectionMap}
        questions={questions}
        questionTestMap={questionTestMap}
        onTestUpdated={handleTestSettingsChanged}
        onSectionsChanged={handleTestSettingsChanged}
        onShowSectionModal={(section) => { setEditingSection(section); setShowSectionModal(true); }}
      />
    </div>
  );
}
