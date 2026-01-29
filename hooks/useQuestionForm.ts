import { useState } from "react";

export interface QuestionFormState {
  questionName: string;
  questionText: string;
  questionImage: File | null;
  questionImagePreview: string | null;
  referenceImage: File | null;
  referenceImagePreview: string | null;
  explanationImage: File | null;
  explanationImagePreview: string | null;
  answers: string[];
  answerImages: (File | null)[];
  answerImagePreviews: (string | null)[];
  answerLayout: "grid" | "list";
  correctAnswer: number;
  explanationText: string;
  selectedTopics: string[];
  points: number;
  studentFriendlySkill: string;
  cluster: string;
}

const initialState: QuestionFormState = {
  questionName: "",
  questionText: "",
  questionImage: null,
  questionImagePreview: null,
  referenceImage: null,
  referenceImagePreview: null,
  explanationImage: null,
  explanationImagePreview: null,
  answers: ["", "", "", ""],
  answerImages: [null, null, null, null],
  answerImagePreviews: [null, null, null, null],
  answerLayout: "list",
  correctAnswer: 1,
  explanationText: "",
  selectedTopics: [],
  points: 1,
  studentFriendlySkill: "",
  cluster: "",
};

export function useQuestionForm() {
  const [state, setState] = useState<QuestionFormState>(initialState);

  const setField = <K extends keyof QuestionFormState>(
    field: K,
    value: QuestionFormState[K]
  ) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const setAnswer = (index: number, value: string) => {
    setState((prev) => {
      const newAnswers = [...prev.answers];
      newAnswers[index] = value;
      return { ...prev, answers: newAnswers };
    });
  };

  const setAnswerImage = (index: number, file: File | null, preview: string | null) => {
    setState((prev) => {
      const newImages = [...prev.answerImages];
      const newPreviews = [...prev.answerImagePreviews];
      newImages[index] = file;
      newPreviews[index] = preview;
      return { ...prev, answerImages: newImages, answerImagePreviews: newPreviews };
    });
  };

  const removeAnswerImage = (index: number) => {
    setAnswerImage(index, null, null);
  };

  const reset = () => {
    setState(initialState);
  };

  const loadFromQuestion = (question: {
    name?: string | null;
    question_text?: string | null;
    question_image_url?: string | null;
    reference_image_url?: string | null;
    explanation_image_url?: string | null;
    answers: string[];
    answer_image_urls?: (string | null)[];
    answer_layout?: "grid" | "list";
    correct_answer: number;
    explanation_text: string;
    topics: string[];
    points?: number;
    student_friendly_skill?: string | null;
    cluster?: string | null;
  }) => {
    setState({
      questionName: question.name || "",
      questionText: question.question_text || "",
      questionImage: null,
      questionImagePreview: question.question_image_url || null,
      referenceImage: null,
      referenceImagePreview: question.reference_image_url || null,
      explanationImage: null,
      explanationImagePreview: question.explanation_image_url || null,
      answers: question.answers,
      answerImages: [null, null, null, null],
      answerImagePreviews: question.answer_image_urls || [null, null, null, null],
      answerLayout: question.answer_layout || "list",
      correctAnswer: question.correct_answer,
      explanationText: question.explanation_text,
      selectedTopics: question.topics,
      points: question.points || 1,
      studentFriendlySkill: question.student_friendly_skill || "",
      cluster: question.cluster || "",
    });
  };

  return {
    state,
    setField,
    setAnswer,
    setAnswerImage,
    removeAnswerImage,
    reset,
    loadFromQuestion,
  };
}

export type UseQuestionFormReturn = ReturnType<typeof useQuestionForm>;
