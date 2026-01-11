"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, createQuestion } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionImage) {
      setNotification({
        type: "error",
        message: "Question image is required",
      });
      return;
    }

    if (answers.some(a => !a.trim())) {
      setNotification({
        type: "error",
        message: "All 4 answers are required",
      });
      return;
    }

    if (!explanationText.trim()) {
      setNotification({
        type: "error",
        message: "Explanation text is required",
      });
      return;
    }

    if (!topicsInput.trim()) {
      setNotification({
        type: "error",
        message: "At least one topic is required",
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      const questionImageUrl = await uploadImage(
        "question-images",
        questionImage,
        `questions/${Date.now()}-${questionImage.name}`
      );

      if (!questionImageUrl) {
        throw new Error("Failed to upload question image");
      }

      let referenceImageUrl = null;
      if (referenceImage) {
        referenceImageUrl = await uploadImage(
          "reference-images",
          referenceImage,
          `references/${Date.now()}-${referenceImage.name}`
        );
      }

      let explanationImageUrl = null;
      if (explanationImage) {
        explanationImageUrl = await uploadImage(
          "explanation-images",
          explanationImage,
          `explanations/${Date.now()}-${explanationImage.name}`
        );
      }

      const topics = topicsInput
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const question = await createQuestion({
        question_image_url: questionImageUrl,
        reference_image_url: referenceImageUrl,
        answers,
        correct_answer: correctAnswer,
        explanation_text: explanationText,
        explanation_image_url: explanationImageUrl,
        topics,
      });

      if (question) {
        setNotification({
          type: "success",
          message: "Question created successfully!",
        });
        resetForm();

        setTimeout(() => {
          setNotification(null);
        }, 3000);
      } else {
        throw new Error("Failed to create question");
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600">Upload new questions to the database</p>
            </div>
            <button
              onClick={() => router.push("/")}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {notification && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                notification.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {notification.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Image <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageSelect(e, setQuestionImage, setQuestionImagePreview)
                  }
                  className="hidden"
                  id="question-image"
                />
                <label
                  htmlFor="question-image"
                  className="cursor-pointer"
                >
                  {questionImagePreview ? (
                    <img
                      src={questionImagePreview}
                      alt="Question preview"
                      className="max-h-64 mx-auto rounded"
                    />
                  ) : (
                    <div>
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload question image
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Image (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageSelect(e, setReferenceImage, setReferenceImagePreview)
                  }
                  className="hidden"
                  id="reference-image"
                />
                <label
                  htmlFor="reference-image"
                  className="cursor-pointer"
                >
                  {referenceImagePreview ? (
                    <img
                      src={referenceImagePreview}
                      alt="Reference preview"
                      className="max-h-64 mx-auto rounded"
                    />
                  ) : (
                    <div>
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload reference image
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer Choices <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {answers.map((answer, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct-answer"
                      checked={correctAnswer === index + 1}
                      onChange={() => setCorrectAnswer(index + 1)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder={`Answer ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {correctAnswer === index + 1 && (
                      <span className="text-green-600 font-medium text-sm">
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Select the radio button next to the correct answer
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={explanationText}
                onChange={(e) => setExplanationText(e.target.value)}
                placeholder="Enter detailed explanation for the correct answer"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation Image (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageSelect(e, setExplanationImage, setExplanationImagePreview)
                  }
                  className="hidden"
                  id="explanation-image"
                />
                <label
                  htmlFor="explanation-image"
                  className="cursor-pointer"
                >
                  {explanationImagePreview ? (
                    <img
                      src={explanationImagePreview}
                      alt="Explanation preview"
                      className="max-h-64 mx-auto rounded"
                    />
                  ) : (
                    <div>
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload explanation image
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topics <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
                placeholder="Enter topics separated by commas (e.g., Algebra, Linear Equations, Solving)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Separate multiple topics with commas
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Uploading..." : "Upload Question"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
