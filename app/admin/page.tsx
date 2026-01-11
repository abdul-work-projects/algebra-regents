"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, createQuestion, updateQuestion, deleteQuestion, fetchQuestions, DatabaseQuestion } from "@/lib/supabase";
import { getCurrentUser, signOut, onAuthStateChange } from "@/lib/auth";

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [questions, setQuestions] = useState<DatabaseQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [explanationImage, setExplanationImage] = useState<File | null>(null);
  const [explanationImagePreview, setExplanationImagePreview] = useState<string | null>(null);

  const [answers, setAnswers] = useState<string[]>(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState<number>(1);
  const [explanationText, setExplanationText] = useState("");
  const [topicsInput, setTopicsInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
    setIsLoadingQuestions(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
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

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const resetForm = () => {
    setEditingId(null);
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setReferenceImage(null);
    setReferenceImagePreview(null);
    setExplanationImage(null);
    setExplanationImagePreview(null);
    setAnswers(["", "", "", ""]);
    setCorrectAnswer(1);
    setExplanationText("");
    setTopicsInput("");
  };

  const loadQuestionForEdit = (question: DatabaseQuestion) => {
    setEditingId(question.id);
    setQuestionImagePreview(question.question_image_url);
    setReferenceImagePreview(question.reference_image_url);
    setExplanationImagePreview(question.explanation_image_url);
    setAnswers(question.answers);
    setCorrectAnswer(question.correct_answer);
    setExplanationText(question.explanation_text);
    setTopicsInput(question.topics.join(", "));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionImage && !editingId) {
      setNotification({ type: "error", message: "Question image is required" });
      return;
    }

    if (answers.some(a => !a.trim())) {
      setNotification({ type: "error", message: "All 4 answers are required" });
      return;
    }

    if (!explanationText.trim()) {
      setNotification({ type: "error", message: "Explanation text is required" });
      return;
    }

    if (!topicsInput.trim()) {
      setNotification({ type: "error", message: "At least one topic is required" });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      let questionImageUrl = questionImagePreview;
      if (questionImage) {
        questionImageUrl = await uploadImage(
          "question-images",
          questionImage,
          `questions/${Date.now()}-${questionImage.name}`
        );
        if (!questionImageUrl) throw new Error("Failed to upload question image");
      }

      let referenceImageUrl = referenceImagePreview;
      if (referenceImage) {
        referenceImageUrl = await uploadImage(
          "reference-images",
          referenceImage,
          `references/${Date.now()}-${referenceImage.name}`
        );
      }

      let explanationImageUrl = explanationImagePreview;
      if (explanationImage) {
        explanationImageUrl = await uploadImage(
          "explanation-images",
          explanationImage,
          `explanations/${Date.now()}-${explanationImage.name}`
        );
      }

      const topics = topicsInput.split(",").map(t => t.trim()).filter(t => t.length > 0);

      const questionData = {
        question_image_url: questionImageUrl!,
        reference_image_url: referenceImageUrl,
        answers,
        correct_answer: correctAnswer,
        explanation_text: explanationText,
        explanation_image_url: explanationImageUrl,
        topics,
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
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-7xl mx-auto px-4">
        {/* Compact Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
              {user && <p className="text-xs text-gray-500">{user.email}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLogout} className="text-xs px-3 py-1 text-gray-700 hover:bg-gray-100 rounded">
                Logout
              </button>
              <button onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {notification && (
          <div className={`mb-3 p-3 rounded-lg text-sm ${
            notification.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {notification.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Form */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-base font-semibold mb-3">
              {editingId ? "Edit Question" : "Add New Question"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Compact Image Uploads */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Question Image {!editingId && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, setQuestionImage, setQuestionImagePreview)}
                    className="hidden"
                    id="question-image"
                  />
                  <label htmlFor="question-image" className="cursor-pointer block">
                    {questionImagePreview ? (
                      <img src={questionImagePreview} alt="Question" className="w-full h-24 object-cover rounded border" />
                    ) : (
                      <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-500">
                        <span className="text-xs">Upload</span>
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
                  <label htmlFor="reference-image" className="cursor-pointer block">
                    {referenceImagePreview ? (
                      <img src={referenceImagePreview} alt="Reference" className="w-full h-24 object-cover rounded border" />
                    ) : (
                      <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-500">
                        <span className="text-xs">Upload</span>
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
                  <label htmlFor="explanation-image" className="cursor-pointer block">
                    {explanationImagePreview ? (
                      <img src={explanationImagePreview} alt="Explanation" className="w-full h-24 object-cover rounded border" />
                    ) : (
                      <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-500">
                        <span className="text-xs">Upload</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Compact Answers */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Answers <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {answers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={correctAnswer === index + 1}
                        onChange={() => setCorrectAnswer(index + 1)}
                        className="h-3 w-3"
                      />
                      <input
                        type="text"
                        value={answer}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        placeholder={`Answer ${index + 1}`}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                      {correctAnswer === index + 1 && (
                        <span className="text-green-600 text-xs font-medium">✓</span>
                      )}
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
                <input
                  type="text"
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  placeholder="Algebra, Linear Equations"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right: Questions List */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-base font-semibold mb-3">
              Questions ({questions.length})
            </h2>

            {isLoadingQuestions ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No questions yet</div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className={`border rounded p-2 hover:bg-gray-50 ${
                      editingId === question.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <img
                        src={question.question_image_url}
                        alt={`Question ${index + 1}`}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">
                              Question {index + 1}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {question.topics.join(", ")}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Correct: {question.answers[question.correct_answer - 1]}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => loadQuestionForEdit(question)}
                              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(question.id)}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                            >
                              Delete
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
      </div>
    </div>
  );
}
