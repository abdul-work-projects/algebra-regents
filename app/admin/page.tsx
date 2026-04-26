"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuestionForm, createFormAccessor, initialState as formInitialState, QuestionFormState, docsToDrafts } from "@/hooks/useQuestionForm";
import { newDocId, DocumentDraft } from "@/components/admin/DocumentsEditor";
import { QuestionDocument } from "@/lib/types";
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
  extractSkillNames,
  extractTags,
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
  const [passageType, setPassageType] = useState<'grouped' | 'parts'>('grouped');
  const [passageAboveText, setPassageAboveText] = useState("");
  const [passageText, setPassageText] = useState("");
  const [passageImageSize, setPassageImageSize] = useState<"small" | "medium" | "large" | "extra-large">("large");
  const [passageDocuments, setPassageDocuments] = useState<DocumentDraft[]>([]);
  const [activeQuestionTab, setActiveQuestionTab] = useState<number>(1);
  const [editingQ2Id, setEditingQ2Id] = useState<string | null>(null);
  const [editingPassageId, setEditingPassageId] = useState<string | null>(null);

  // Additional part forms (beyond q1 and q2) for parts-type questions
  const [extraPartStates, setExtraPartStates] = useState<QuestionFormState[]>([]);
  const [editingExtraPartIds, setEditingExtraPartIds] = useState<string[]>([]);

  // Build UseQuestionFormReturn-compatible accessors for extra parts
  const extraPartForms = extraPartStates.map((state, idx) =>
    createFormAccessor(state, (updater) => {
      setExtraPartStates((prev) => {
        const next = [...prev];
        next[idx] = updater(next[idx]);
        return next;
      });
    })
  );

  const handleAddPart = () => {
    setExtraPartStates((prev) => [...prev, { ...formInitialState, answers: ["", "", "", ""], answerImages: [null, null, null, null], answerImagePreviews: [null, null, null, null] }]);
    setActiveQuestionTab(3 + extraPartStates.length); // Switch to new tab
  };

  const handleRemovePart = (tabNumber: number) => {
    // tabNumber is 1-based. Tab 3+ maps to extraPartStates index = tabNumber - 3
    const removeIdx = tabNumber - 3;
    if (removeIdx < 0 || removeIdx >= extraPartStates.length) return;
    setExtraPartStates((prev) => prev.filter((_, i) => i !== removeIdx));
    setEditingExtraPartIds((prev) => prev.filter((_, i) => i !== removeIdx));
    // Switch to previous tab
    setActiveQuestionTab(Math.max(1, tabNumber - 1));
  };

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
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoadingQuestions(true);
    setIsLoadingTests(true);
    setIsLoadingSubjects(true);

    const [questionsData, mappings, testsData, subjectsData, bugCounts] = await Promise.all([
      fetchQuestions(),
      getAllQuestionTestMappings(),
      fetchTests(),
      fetchSubjects(),
      getBugReportCounts(),
    ]);

    setQuestions(questionsData);
    const allSkills = questionsData.flatMap((q) => q.skills || []);
    setAvailableTags(Array.from(new Set(allSkills)).sort());
    setAvailableSkillNames(extractSkillNames(questionsData));
    setAvailableTagNames(extractTags(questionsData));
    setQuestionTestMap(mappings);
    setIsLoadingQuestions(false);

    setTests(testsData.map(convertToTestFormat));
    setIsLoadingTests(false);

    setSubjects(subjectsData.map(convertToSubjectFormat));
    setIsLoadingSubjects(false);

    setBugCounts(bugCounts);
  };

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    const [data, mappings] = await Promise.all([fetchQuestions(), getAllQuestionTestMappings()]);
    setQuestions(data);
    const allSkills = data.flatMap((q) => q.skills || []);
    setAvailableTags(Array.from(new Set(allSkills)).sort());
    setAvailableSkillNames(extractSkillNames(data));
    setAvailableTagNames(extractTags(data));
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
    setPassageType('grouped');
    setExtraPartStates([]);
    setEditingExtraPartIds([]);
    setPassageAboveText("");
    setPassageText("");
    setPassageImageSize("large");
    setPassageDocuments([]);
    setActiveQuestionTab(1);
  };

  const toggleQuestionSelection = (questionId: string) => {
    if (!questionId) { setSelectedForGrouping([]); return; }
    setSelectedForGrouping((prev) => {
      if (prev.includes(questionId)) return prev.filter((id) => id !== questionId);
      return [...prev, questionId];
    });
  };

  const handleLinkQuestions = async () => {
    if (selectedForGrouping.length < 2) { setNotification({ type: "error", message: "Please select at least 2 questions to group" }); return; }
    const alreadyGrouped = selectedForGrouping.some((id) => { const q = questions.find((q) => q.id === id); return q?.passage_id; });
    if (alreadyGrouped) { setNotification({ type: "error", message: "One or more selected questions are already in a group. Ungroup them first." }); return; }
    setShowLinkModal(true);
  };

  const confirmLinkQuestions = async (linkPassageText: string, linkPassageImage: File | null, type: 'grouped' | 'parts' = 'grouped') => {
    if (selectedForGrouping.length < 2) return;
    const passageDocs: QuestionDocument[] = [];
    if (linkPassageImage) {
      const sanitizedName = linkPassageImage.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const url = await uploadImage("question-images", linkPassageImage, `passages/${Date.now()}-${sanitizedName}`);
      if (url) passageDocs.push({ type: 'image', url, position: 'above', size: 'large' });
    }
    const result = await linkQuestionsToNewPassage(selectedForGrouping, { passage_text: linkPassageText.trim() || null, passage_documents: passageDocs, type });
    if (result && result.updatedCount === selectedForGrouping.length) {
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
      // Find ALL questions sharing this passage
      const allGrouped = questions
        .filter((q) => q.passage_id === question.passage_id)
        .sort((a, b) => {
          if (a.display_order !== undefined && b.display_order !== undefined) return a.display_order - b.display_order;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

      if (allGrouped.length >= 2) {
        const loadFormData = (dbQ: QuestionWithPassage) => ({
          name: dbQ.name, question_text: dbQ.question_text, above_image_text: dbQ.above_image_text,
          question_image_url: dbQ.question_image_url, reference_image_url: dbQ.reference_image_url,
          explanation_image_url: dbQ.explanation_image_url, answers: dbQ.answers,
          answer_image_urls: dbQ.answer_image_urls, answer_layout: dbQ.answer_layout,
          image_size: dbQ.image_size, question_type: dbQ.question_type, correct_answer: dbQ.correct_answer,
          explanation_text: dbQ.explanation_text, skills: dbQ.skills || [], tags: dbQ.tags || [],
          difficulty: dbQ.difficulty, points: dbQ.points, notes: dbQ.notes,
          question_documents: dbQ.question_documents, reference_documents: dbQ.reference_documents,
        });

        setEditingId(allGrouped[0].id);
        setEditingQ2Id(allGrouped[1].id);
        setEditingPassageId(question.passage_id);
        setIsGroupedQuestion(true);
        setPassageType((question.passages?.type as 'grouped' | 'parts') || 'grouped');

        // Determine which tab the clicked question maps to
        const clickedIdx = allGrouped.findIndex((q) => q.id === question.id);
        setActiveQuestionTab(clickedIdx >= 0 ? clickedIdx + 1 : 1);

        const passage = question.passages;
        setPassageAboveText(passage?.above_text || "");
        setPassageText(passage?.passage_text || "");
        setPassageImageSize((passage?.image_size as "small" | "medium" | "large" | "extra-large") || "large");
        setPassageDocuments(docsToDrafts(passage?.passage_documents));

        // Load first two into hook-based forms
        q1Form.loadFromQuestion(loadFormData(allGrouped[0]));
        q2Form.loadFromQuestion(loadFormData(allGrouped[1]));

        // Load any additional parts (index 2+) into extra part states
        if (allGrouped.length > 2) {
          const extras: QuestionFormState[] = allGrouped.slice(2).map((dbQ) => ({
            questionName: dbQ.name || "",
            questionText: dbQ.question_text || "",
            aboveImageText: dbQ.above_image_text || "",
            questionImage: null,
            questionImagePreview: null,
            referenceImage: null,
            referenceImagePreview: null,
            explanationImage: null,
            explanationImagePreview: dbQ.explanation_image_url || null,
            answers: dbQ.answers,
            answerImages: [null, null, null, null],
            answerImagePreviews: dbQ.answer_image_urls || [null, null, null, null],
            answerLayout: dbQ.answer_layout || "list",
            imageSize: dbQ.image_size || "large",
            questionType: (dbQ.question_type as "multiple-choice" | "drag-order") || "multiple-choice",
            correctAnswer: dbQ.correct_answer,
            explanationText: dbQ.explanation_text,
            selectedSkills: dbQ.skills || [],
            selectedTags: dbQ.tags || [],
            difficulty: dbQ.difficulty || "",
            points: dbQ.points || 1,
            notes: dbQ.notes || "",
            questionDocuments: docsToDrafts(dbQ.question_documents),
            referenceDocuments: docsToDrafts(dbQ.reference_documents),
          }));
          setExtraPartStates(extras);
          setEditingExtraPartIds(allGrouped.slice(2).map((q) => q.id));
        } else {
          setExtraPartStates([]);
          setEditingExtraPartIds([]);
        }

        const questionTestIds = await getTestsForQuestion(allGrouped[0].id);
        setSelectedTestIds(questionTestIds);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setEditingId(question.id);
    setEditingQ2Id(null);
    setEditingPassageId(null);
    setIsGroupedQuestion(false);
    q1Form.loadFromQuestion({ name: question.name, question_text: question.question_text, above_image_text: question.above_image_text, explanation_image_url: question.explanation_image_url, answers: question.answers, answer_image_urls: question.answer_image_urls, answer_layout: question.answer_layout, image_size: question.image_size, question_type: question.question_type, correct_answer: question.correct_answer, explanation_text: question.explanation_text, skills: question.skills || [], tags: question.tags || [], difficulty: question.difficulty, points: question.points, notes: question.notes, question_documents: question.question_documents, reference_documents: question.reference_documents });
    const questionTestIds = await getTestsForQuestion(question.id);
    setSelectedTestIds(questionTestIds);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sanitizeFilename = (filename: string): string => {
    return filename.replace(/\s+/g, "_").replace(/[^\w.-]/g, "").toLowerCase();
  };

  // ── Question submit ───────────────────────────────────────────────────
  const hasAnyDoc = (drafts: DocumentDraft[]) =>
    drafts.some((d) => (d.type === 'image' && (d.file || d.url)) || (d.type === 'pdf' && d.url));

  const uploadDocs = async (drafts: DocumentDraft[], prefix: string): Promise<QuestionDocument[]> => {
    const out: QuestionDocument[] = [];
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      if (d.type === 'image') {
        let url = d.url || '';
        if (d.file) {
          const uploaded = await uploadImage("question-images", d.file, `${prefix}/${Date.now()}-${i}-${sanitizeFilename(d.file.name)}`);
          if (!uploaded) continue;
          url = uploaded;
        }
        if (!url) continue;
        out.push({
          type: 'image',
          url,
          position: d.position,
          label: d.label || undefined,
          size: d.size,
          sourceUrl: d.sourceUrl?.trim() || undefined,
          sourceLabel: d.sourceLabel?.trim() || undefined,
        });
      } else {
        if (!d.url) continue;
        out.push({
          type: 'pdf',
          url: d.url,
          page: d.page,
          position: d.position,
          label: d.label || undefined,
          sourceUrl: d.sourceUrl?.trim() || undefined,
          sourceLabel: d.sourceLabel?.trim() || undefined,
        });
      }
    }
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q1 = q1Form.state;
    const q2 = q2Form.state;

    const hasQuestionText = q1.questionText.trim() || q1.aboveImageText.trim();
    const hasQuestionImage = hasAnyDoc(q1.questionDocuments);
    if (!hasQuestionText && !hasQuestionImage) { setNotification({ type: "error", message: "Question 1 must have text (above or below) or at least one document" }); return; }

    for (let i = 0; i < 4; i++) {
      const hasText = q1.answers[i]?.trim();
      const hasImage = q1.answerImages[i] || q1.answerImagePreviews[i];
      if (!hasText && !hasImage) { setNotification({ type: "error", message: `Question 1 Answer ${i + 1} must have either text or image (or both)` }); return; }
    }
    if (!q1.explanationText.trim()) { setNotification({ type: "error", message: "Question 1 explanation text is required" }); return; }
    if (q1.selectedSkills.length === 0) { setNotification({ type: "error", message: "At least one skill is required" }); return; }
    if (selectedTestIds.length === 0) { setNotification({ type: "error", message: "Question must be assigned to at least one test" }); return; }

    if (isGroupedQuestion) {
      if (!passageText.trim() && !passageAboveText.trim() && !hasAnyDoc(passageDocuments)) { setNotification({ type: "error", message: "Grouped questions must have a passage (text or at least one document)" }); return; }
      // Validate all secondary forms (q2 + extra parts)
      const secondaryForms = [q2, ...extraPartStates];
      const isPartsMode = passageType === 'parts';
      for (let fi = 0; fi < secondaryForms.length; fi++) {
        const form = secondaryForms[fi];
        const label = isPartsMode ? `Part ${String.fromCharCode(98 + fi)}` : `Question ${fi + 2}`;
        const hasFormText = form.questionText.trim() || form.aboveImageText.trim();
        const hasFormImage = hasAnyDoc(form.questionDocuments);
        if (!hasFormText && !hasFormImage) { setNotification({ type: "error", message: `${label} must have text (above or below) or at least one document` }); return; }
        for (let i = 0; i < 4; i++) {
          const hasText = form.answers[i]?.trim();
          const hasImage = form.answerImages[i] || form.answerImagePreviews[i];
          if (!hasText && !hasImage) { setNotification({ type: "error", message: `${label} Answer ${i + 1} must have either text or image (or both)` }); return; }
        }
        if (!form.explanationText.trim()) { setNotification({ type: "error", message: `${label} explanation text is required` }); return; }
      }
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      if (isGroupedQuestion && !editingId) {
        const passageDocs = await uploadDocs(passageDocuments, "passages");

        const uploadAuxiliaryImages = async (form: typeof q1, prefix: string) => {
          let explanationImageUrl: string | null = null;
          if (form.explanationImage) explanationImageUrl = await uploadImage("explanation-images", form.explanationImage, `explanations/${Date.now()}-${prefix}-${sanitizeFilename(form.explanationImage.name)}`);
          const answerImageUrls = await Promise.all(form.answerImages.map(async (img, index) => { if (img) return await uploadImage("answer-images", img, `answers/${Date.now()}-${prefix}-${index}-${sanitizeFilename(img.name)}`); return form.answerImagePreviews[index] || null; }));
          return { explanationImageUrl, answerImageUrls };
        };

        // Build all forms: q1, q2, + any extra parts
        const allFormStates = [q1, q2, ...extraPartStates];
        const allAux: { explanationImageUrl: string | null; answerImageUrls: (string | null)[] }[] = [];
        const allDocs: { questionDocs: QuestionDocument[]; referenceDocs: QuestionDocument[] }[] = [];
        for (let fi = 0; fi < allFormStates.length; fi++) {
          allAux.push(await uploadAuxiliaryImages(allFormStates[fi], `q${fi + 1}`));
          allDocs.push({
            questionDocs: await uploadDocs(allFormStates[fi].questionDocuments, `questions/q${fi + 1}`),
            referenceDocs: await uploadDocs(allFormStates[fi].referenceDocuments, `references/q${fi + 1}`),
          });
        }

        const baseOrder = questions.length + 1;
        const questionsToCreate = allFormStates.map((form, fi) => ({
          name: form.questionName.trim() || null,
          question_text: form.questionText.trim() || null,
          above_image_text: form.aboveImageText.trim() || null,
          question_image_url: null,
          reference_image_url: null,
          question_documents: allDocs[fi].questionDocs,
          reference_documents: allDocs[fi].referenceDocs,
          answers: form.answers,
          answer_image_urls: allAux[fi].answerImageUrls,
          answer_layout: form.answerLayout,
          image_size: form.imageSize,
          question_type: form.questionType,
          correct_answer: form.correctAnswer,
          explanation_text: form.explanationText,
          explanation_image_url: allAux[fi].explanationImageUrl,
          skills: form.selectedSkills,
          tags: form.selectedTags,
          difficulty: (form.difficulty as "easy" | "medium" | "hard") || null,
          points: form.points,
          notes: form.notes.trim() || null,
          display_order: baseOrder + fi,
        }));

        const result = await createPassageWithQuestions(
          { above_text: passageAboveText.trim() || null, passage_text: passageText.trim() || null, passage_image_url: null, iframe_url: null, iframe_page: null, passage_documents: passageDocs, image_size: passageImageSize, type: passageType },
          questionsToCreate
        );
        if (result) {
          for (const question of result.questions) { await setTestsForQuestion(question.id, selectedTestIds); }
          const label = passageType === 'parts' ? 'Part questions' : 'Grouped questions';
          setNotification({ type: "success", message: `${label} created successfully!` });
          resetForm(); loadQuestions(); loadTestsData();
          setTimeout(() => setNotification(null), 3000);
        } else throw new Error("Failed to create grouped questions");

      } else if (isGroupedQuestion && editingId && editingQ2Id && editingPassageId) {
        const passageDocs = await uploadDocs(passageDocuments, "passages");
        const passageResult = await updatePassage(editingPassageId, { above_text: passageAboveText.trim() || null, passage_text: passageText.trim() || null, passage_image_url: null, iframe_url: null, iframe_page: null, passage_documents: passageDocs, image_size: passageImageSize, type: passageType });
        if (!passageResult) throw new Error("Failed to update passage");

        const uploadAuxiliaryImages = async (form: typeof q1, prefix: string) => {
          let explanationImageUrl: string | null = form.explanationImagePreview;
          if (form.explanationImage) explanationImageUrl = await uploadImage("explanation-images", form.explanationImage, `explanations/${Date.now()}-${prefix}-${sanitizeFilename(form.explanationImage.name)}`);
          const answerImageUrls = await Promise.all(form.answerImages.map(async (img, index) => { if (img) return await uploadImage("answer-images", img, `answers/${Date.now()}-${prefix}-${index}-${sanitizeFilename(img.name)}`); return form.answerImagePreviews[index] || null; }));
          return { explanationImageUrl, answerImageUrls };
        };

        const uploadAndUpdate = async (form: typeof q1, qId: string, prefix: string) => {
          let explanationImageUrl = form.explanationImagePreview;
          if (form.explanationImage) explanationImageUrl = await uploadImage("explanation-images", form.explanationImage, `explanations/${Date.now()}-${prefix}-${sanitizeFilename(form.explanationImage.name)}`);
          const answerImageUrls = await Promise.all(form.answerImages.map(async (img, index) => { if (img) return await uploadImage("answer-images", img, `answers/${Date.now()}-${prefix}-${index}-${sanitizeFilename(img.name)}`); return form.answerImagePreviews[index] || null; }));
          const questionDocs = await uploadDocs(form.questionDocuments, `questions/${prefix}`);
          const referenceDocs = await uploadDocs(form.referenceDocuments, `references/${prefix}`);
          const qIndex = questions.findIndex((q) => q.id === qId);
          return await updateQuestion(qId, { name: form.questionName.trim() || null, question_text: form.questionText.trim() || null, above_image_text: form.aboveImageText.trim() || null, question_image_url: null, reference_image_url: null, question_documents: questionDocs, reference_documents: referenceDocs, answers: form.answers, answer_image_urls: answerImageUrls, answer_layout: form.answerLayout, image_size: form.imageSize, question_type: form.questionType, correct_answer: form.correctAnswer, explanation_text: form.explanationText, explanation_image_url: explanationImageUrl || null, skills: form.selectedSkills, tags: form.selectedTags, difficulty: (form.difficulty as "easy" | "medium" | "hard") || null, points: form.points, notes: form.notes.trim() || null, ...(qIndex !== -1 ? { display_order: qIndex + 1 } : {}) });
        };

        const q1Result = await uploadAndUpdate(q1, editingId, "q1");
        const q2Result = await uploadAndUpdate(q2, editingQ2Id, "q2");
        if (!q1Result || !q2Result) throw new Error("Failed to update grouped questions");

        // Update extra parts
        for (let ei = 0; ei < extraPartStates.length; ei++) {
          const extraForm = extraPartStates[ei];
          const extraId = editingExtraPartIds[ei];
          if (extraId) {
            // Existing extra part — update it
            await uploadAndUpdate(extraForm, extraId, `q${ei + 3}`);
          } else {
            // New extra part — create it and link to passage
            const imgs = await uploadAuxiliaryImages(extraForm, `q${ei + 3}`);
            const extraQuestionDocs = await uploadDocs(extraForm.questionDocuments, `questions/q${ei + 3}`);
            const extraReferenceDocs = await uploadDocs(extraForm.referenceDocuments, `references/q${ei + 3}`);
            const newQ = await createQuestion({
              name: extraForm.questionName.trim() || null,
              question_text: extraForm.questionText.trim() || null,
              above_image_text: extraForm.aboveImageText.trim() || null,
              question_image_url: null,
              reference_image_url: null,
              question_documents: extraQuestionDocs,
              reference_documents: extraReferenceDocs,
              answers: extraForm.answers,
              answer_image_urls: imgs.answerImageUrls,
              answer_layout: extraForm.answerLayout,
              image_size: extraForm.imageSize,
              question_type: extraForm.questionType,
              correct_answer: extraForm.correctAnswer,
              explanation_text: extraForm.explanationText,
              explanation_image_url: imgs.explanationImageUrl,
              skills: extraForm.selectedSkills,
              tags: extraForm.selectedTags,
              difficulty: (extraForm.difficulty as "easy" | "medium" | "hard") || null,
              points: extraForm.points,
              notes: extraForm.notes.trim() || null,
              passage_id: editingPassageId,
              display_order: questions.length + ei + 1,
            } as Omit<DatabaseQuestion, 'id' | 'created_at' | 'updated_at'>);
            if (!newQ) throw new Error(`Failed to create extra part ${ei + 3}`);
            await setTestsForQuestion(newQ.id, selectedTestIds);
          }
        }

        await setTestsForQuestion(editingId, selectedTestIds);
        await setTestsForQuestion(editingQ2Id, selectedTestIds);
        const label = passageType === 'parts' ? 'Part questions' : 'Grouped questions';
        setNotification({ type: "success", message: `${label} updated successfully!` });
        resetForm(); loadQuestions(); loadTestsData();
        setTimeout(() => setNotification(null), 3000);

      } else {
        let explanationImageUrl = q1.explanationImagePreview;
        if (q1.explanationImage) explanationImageUrl = await uploadImage("explanation-images", q1.explanationImage, `explanations/${Date.now()}-${sanitizeFilename(q1.explanationImage.name)}`);
        const answerImageUrls = await Promise.all(q1.answerImages.map(async (img, index) => { if (img) return await uploadImage("answer-images", img, `answers/${Date.now()}-${index}-${sanitizeFilename(img.name)}`); return q1.answerImagePreviews[index] || null; }));
        const questionDocs = await uploadDocs(q1.questionDocuments, "questions/q1");
        const referenceDocs = await uploadDocs(q1.referenceDocuments, "references/q1");

        const questionData: Record<string, unknown> = { name: q1.questionName.trim() || null, question_text: q1.questionText.trim() || null, above_image_text: q1.aboveImageText.trim() || null, question_image_url: null, reference_image_url: null, question_documents: questionDocs, reference_documents: referenceDocs, answers: q1.answers, answer_image_urls: answerImageUrls, answer_layout: q1.answerLayout, image_size: q1.imageSize, question_type: q1.questionType, correct_answer: q1.correctAnswer, explanation_text: q1.explanationText, explanation_image_url: explanationImageUrl, skills: q1.selectedSkills, tags: q1.selectedTags, difficulty: (q1.difficulty as "easy" | "medium" | "hard") || null, points: q1.points, notes: q1.notes.trim() || null, passage_id: null };

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
    const questionsToCreate = csvData.map((q, index) => ({ name: null, question_text: q.question_text, above_image_text: null, question_image_url: null, reference_image_url: null, answers: q.answers, answer_image_urls: [null, null, null, null], answer_layout: "list" as const, question_type: "multiple-choice" as const, correct_answer: q.correct_answer, explanation_text: "See solution in your notes.", explanation_image_url: null, skills: q.skills, tags: q.tags, difficulty: q.difficulty, points: q.points, notes: null, passage_id: null, display_order: questions.length + index + 1 }));
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
              additionalForms={extraPartForms}
              passageType={passageType}
              onPassageTypeChange={setPassageType}
              activeQuestionTab={activeQuestionTab}
              onActiveQuestionTabChange={setActiveQuestionTab}
              onAddPart={handleAddPart}
              onRemovePart={handleRemovePart}
              passageAboveText={passageAboveText}
              onPassageAboveTextChange={setPassageAboveText}
              passageText={passageText}
              onPassageTextChange={setPassageText}
              passageImageSize={passageImageSize}
              onPassageImageSizeChange={setPassageImageSize}
              passageDocuments={passageDocuments}
              onPassageDocumentsChange={setPassageDocuments}
              selectedTestIds={selectedTestIds}
              onSelectedTestIdsChange={setSelectedTestIds}
              tests={tests}
              subjects={subjects}
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
          const sectionRefDocs = await uploadDocs(data.referenceDocuments, "sections");
          const targetTestId = showTestSettingsModal ? filterTestId : expandedTestId;
          if (editingSection) {
            await updateTestSection(editingSection.id, { name: data.name, description: data.description || null, reference_image_url: null, reference_documents: sectionRefDocs });
          } else if (targetTestId) {
            await createTestSection({ test_id: targetTestId, name: data.name, description: data.description || undefined, reference_documents: sectionRefDocs, display_order: testSections.length });
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
        subjects={subjects}
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
