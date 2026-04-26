import { useState } from "react";
import { DocumentDraft, newDocId } from "@/components/admin/DocumentsEditor";
import { QuestionDocument } from "@/lib/types";

export interface QuestionFormState {
  questionName: string;
  questionText: string;
  aboveImageText: string;
  questionImage: File | null;
  questionImagePreview: string | null;
  referenceImage: File | null;
  referenceImagePreview: string | null;
  explanationImage: File | null;
  explanationImagePreview: string | null;
  answers: string[];
  answerImages: (File | null)[];
  answerImagePreviews: (string | null)[];
  answerLayout: "grid" | "list" | "row";
  imageSize: "small" | "medium" | "large" | "extra-large";
  questionType: "multiple-choice" | "drag-order";
  correctAnswer: number;
  explanationText: string;
  selectedSkills: string[]; // Renamed from selectedTopics
  selectedTags: string[]; // New field for tags
  difficulty: string; // 'easy' | 'medium' | 'hard' | '' (empty = none)
  points: number;
  notes: string;
  questionDocuments: DocumentDraft[];
  referenceDocuments: DocumentDraft[];
}

// Convert a stored doc array into editable drafts. Image docs keep `file: null` until the
// admin re-uploads a replacement.
export function docsToDrafts(docs: QuestionDocument[] | undefined | null): DocumentDraft[] {
  if (!Array.isArray(docs)) return [];
  return docs.map((d) => ({
    id: newDocId(),
    type: d.type,
    file: d.type === 'image' ? null : undefined,
    url: d.url,
    page: d.page,
    label: d.label,
    position: d.position,
    size: d.size,
  }));
}

export const initialState: QuestionFormState = {
  questionName: "",
  questionText: "",
  aboveImageText: "",
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
  imageSize: "large",
  questionType: "multiple-choice",
  correctAnswer: 1,
  explanationText: "",
  selectedSkills: [],
  selectedTags: [],
  difficulty: "",
  points: 1,
  notes: "",
  questionDocuments: [],
  referenceDocuments: [],
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
    above_image_text?: string | null;
    explanation_image_url?: string | null;
    answers: string[];
    answer_image_urls?: (string | null)[];
    answer_layout?: "grid" | "list" | "row";
    image_size?: "small" | "medium" | "large" | "extra-large";
    question_type?: string | null;
    correct_answer: number;
    explanation_text: string;
    skills: string[];
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard' | null;
    points?: number;
    notes?: string | null;
    question_documents?: QuestionDocument[] | null;
    reference_documents?: QuestionDocument[] | null;
  }) => {
    setState({
      questionName: question.name || "",
      questionText: question.question_text || "",
      aboveImageText: question.above_image_text || "",
      questionImage: null,
      questionImagePreview: null,
      referenceImage: null,
      referenceImagePreview: null,
      explanationImage: null,
      explanationImagePreview: question.explanation_image_url || null,
      answers: question.answers,
      answerImages: [null, null, null, null],
      answerImagePreviews: question.answer_image_urls || [null, null, null, null],
      answerLayout: question.answer_layout || "list",
      imageSize: question.image_size || "large",
      questionType: (question.question_type as "multiple-choice" | "drag-order") || "multiple-choice",
      correctAnswer: question.correct_answer,
      explanationText: question.explanation_text,
      selectedSkills: question.skills || [],
      selectedTags: question.tags || [],
      difficulty: question.difficulty || "",
      points: question.points || 1,
      notes: question.notes || "",
      questionDocuments: docsToDrafts(question.question_documents),
      referenceDocuments: docsToDrafts(question.reference_documents),
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

/** Create a UseQuestionFormReturn-compatible object from external state + setter.
 *  Useful for dynamically-sized form arrays where hooks can't be called conditionally. */
export function createFormAccessor(
  state: QuestionFormState,
  setState: (updater: (prev: QuestionFormState) => QuestionFormState) => void,
): UseQuestionFormReturn {
  return {
    state,
    setField: <K extends keyof QuestionFormState>(field: K, value: QuestionFormState[K]) => {
      setState((prev) => ({ ...prev, [field]: value }));
    },
    setAnswer: (index: number, value: string) => {
      setState((prev) => {
        const newAnswers = [...prev.answers];
        newAnswers[index] = value;
        return { ...prev, answers: newAnswers };
      });
    },
    setAnswerImage: (index: number, file: File | null, preview: string | null) => {
      setState((prev) => {
        const newImages = [...prev.answerImages];
        const newPreviews = [...prev.answerImagePreviews];
        newImages[index] = file;
        newPreviews[index] = preview;
        return { ...prev, answerImages: newImages, answerImagePreviews: newPreviews };
      });
    },
    removeAnswerImage: (index: number) => {
      setState((prev) => {
        const newImages = [...prev.answerImages];
        const newPreviews = [...prev.answerImagePreviews];
        newImages[index] = null;
        newPreviews[index] = null;
        return { ...prev, answerImages: newImages, answerImagePreviews: newPreviews };
      });
    },
    reset: () => {
      setState(() => ({ ...initialState, answers: ["", "", "", ""], answerImages: [null, null, null, null], answerImagePreviews: [null, null, null, null], questionDocuments: [], referenceDocuments: [] }));
    },
    loadFromQuestion: (question: Parameters<UseQuestionFormReturn['loadFromQuestion']>[0]) => {
      setState(() => ({
        questionName: question.name || "",
        questionText: question.question_text || "",
        aboveImageText: question.above_image_text || "",
        questionImage: null,
        questionImagePreview: null,
        referenceImage: null,
        referenceImagePreview: null,
        explanationImage: null,
        explanationImagePreview: question.explanation_image_url || null,
        answers: question.answers,
        answerImages: [null, null, null, null],
        answerImagePreviews: question.answer_image_urls || [null, null, null, null],
        answerLayout: question.answer_layout || "list",
        imageSize: question.image_size || "large",
        questionType: (question.question_type as "multiple-choice" | "drag-order") || "multiple-choice",
        correctAnswer: question.correct_answer,
        explanationText: question.explanation_text,
        selectedSkills: question.skills || [],
        selectedTags: question.tags || [],
        difficulty: question.difficulty || "",
        points: question.points || 1,
        notes: question.notes || "",
        questionDocuments: docsToDrafts(question.question_documents),
        referenceDocuments: docsToDrafts(question.reference_documents),
      }));
    },
  };
}
