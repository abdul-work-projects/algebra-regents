"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, createQuestion, updateQuestion, deleteQuestion, fetchQuestions, updateQuestionOrders, DatabaseQuestion } from "@/lib/supabase";
import { getCurrentUser, signOut, onAuthStateChange } from "@/lib/auth";
import TagInput from "@/components/TagInput";

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
  const [correctAnswer, setCorrectAnswer] = useState<number>(1);
  const [explanationText, setExplanationText] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [points, setPoints] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [answerDraggedOver, setAnswerDraggedOver] = useState<number | null>(null);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [originalQuestions, setOriginalQuestions] = useState<DatabaseQuestion[] | null>(null);
  const dropSuccessRef = useRef(false);

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
  }, []);

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    const data = await fetchQuestions();
    setQuestions(data);

    // Extract unique topics from all questions
    const allTopics = data.flatMap(q => q.topics);
    const uniqueTags = Array.from(new Set(allTopics)).sort();
    setAvailableTags(uniqueTags);

    setIsLoadingQuestions(false);
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
    setCorrectAnswer(1);
    setExplanationText("");
    setSelectedTopics([]);
    setPoints(1);
  };

  const loadQuestionForEdit = (question: DatabaseQuestion) => {
    setEditingId(question.id);
    setQuestionName(question.name || "");
    setQuestionText(question.question_text || "");
    setQuestionImagePreview(question.question_image_url);
    setReferenceImagePreview(question.reference_image_url);
    setExplanationImagePreview(question.explanation_image_url);
    setAnswers(question.answers);
    setAnswerImagePreviews(question.answer_image_urls || [null, null, null, null]);
    setCorrectAnswer(question.correct_answer);
    setExplanationText(question.explanation_text);
    setSelectedTopics(question.topics);
    setPoints(question.points || 1);
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
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', questionId);
  };

  const handleQuestionDragOver = (e: React.DragEvent, questionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedQuestionId || draggedQuestionId === questionId) return;

    const draggedIndex = questions.findIndex(q => q.id === draggedQuestionId);
    const targetIndex = questions.findIndex(q => q.id === questionId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    // Reorder the list visually
    const newQuestions = [...questions];
    const [draggedQuestion] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(targetIndex, 0, draggedQuestion);
    setQuestions(newQuestions);
  };

  const handleQuestionDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dropSuccessRef.current = true;

    const currentQuestions = [...questions];

    // Clear drag state
    setDraggedQuestionId(null);
    setOriginalQuestions(null);

    // Save the new order to database
    const orders = currentQuestions.map((q, index) => ({
      id: q.id,
      display_order: index + 1,
    }));

    const success = await updateQuestionOrders(orders);
    if (!success) {
      setNotification({ type: "error", message: "Failed to save question order" });
      loadQuestions();
    }
  };

  const handleQuestionDragEnd = () => {
    // Only restore if drop didn't succeed (drag was cancelled)
    if (!dropSuccessRef.current && originalQuestions) {
      setQuestions(originalQuestions);
    }
    setDraggedQuestionId(null);
    setOriginalQuestions(null);
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
        correct_answer: correctAnswer,
        explanation_text: explanationText,
        explanation_image_url: explanationImageUrl,
        topics: selectedTopics,
        points: points,
      };

      let result;
      if (editingId) {
        result = await updateQuestion(editingId, questionData);
        setNotification({ type: "success", message: "Question updated successfully!" });
      } else {
        result = await createQuestion(questionData);
        setNotification({ type: "success", message: "Question created successfully!" });
      }

      if (result) {
        resetForm();
        loadQuestions();
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
          <div className="flex items-center justify-between">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Questions List */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="text-base font-bold text-gray-900">
                  Questions ({questions.length})
                </h2>
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
                {questions.map((question, index) => (
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
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? "Edit Question" : "Add New Question"}
            </h2>

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
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Answers <span className="text-red-500">*</span> <span className="text-gray-500 font-normal">(text or image or both required)</span>
                </label>
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
      </div>
    </div>
  );
}
