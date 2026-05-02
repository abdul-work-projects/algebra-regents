import { useState } from "react";
import { Test, Subject } from "@/lib/types";
import { UseQuestionFormReturn } from "@/hooks/useQuestionForm";
import TagInput from "@/components/TagInput";
import TestMultiSelect from "@/components/TestMultiSelect";
import MathText from "@/components/MathText";
import PassageTextEditor from "@/components/admin/PassageTextEditor";
import DocumentsEditor from "@/components/admin/DocumentsEditor";

interface QuestionFormProps {
  editingId: string | null;
  q1Form: UseQuestionFormReturn;
  q2Form: UseQuestionFormReturn;
  additionalForms?: UseQuestionFormReturn[];
  isGroupedQuestion: boolean;
  onToggleGrouped: (grouped: boolean) => void;
  passageType: 'grouped' | 'parts';
  onPassageTypeChange: (type: 'grouped' | 'parts') => void;
  activeQuestionTab: number;
  onActiveQuestionTabChange: (tab: number) => void;
  onAddPart?: () => void;
  onRemovePart?: (index: number) => void;
  passageAboveText: string;
  onPassageAboveTextChange: (text: string) => void;
  passageText: string;
  onPassageTextChange: (text: string) => void;
  passageImageSize: "small" | "medium" | "large" | "extra-large";
  onPassageImageSizeChange: (size: "small" | "medium" | "large" | "extra-large") => void;
  passageDocuments: import("@/components/admin/DocumentsEditor").DocumentDraft[];
  onPassageDocumentsChange: (next: import("@/components/admin/DocumentsEditor").DocumentDraft[]) => void;
  selectedTestIds: string[];
  onSelectedTestIdsChange: (ids: string[]) => void;
  tests: Test[];
  subjects: Subject[];
  availableTags: string[];
  availableTagNames: string[];
  isSubmitting: boolean;
  notification: { type: "success" | "error"; message: string } | null;
  onSubmit: (e: React.FormEvent) => void;
}

export default function QuestionForm({
  editingId,
  q1Form,
  q2Form,
  additionalForms = [],
  isGroupedQuestion,
  onToggleGrouped,
  passageType,
  onPassageTypeChange,
  activeQuestionTab,
  onActiveQuestionTabChange,
  onAddPart,
  onRemovePart,
  passageAboveText,
  onPassageAboveTextChange,
  passageText,
  onPassageTextChange,
  passageImageSize,
  onPassageImageSizeChange,
  passageDocuments,
  onPassageDocumentsChange,
  selectedTestIds,
  onSelectedTestIdsChange,
  tests,
  subjects,
  availableTags,
  availableTagNames,
  isSubmitting,
  notification,
  onSubmit,
}: QuestionFormProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [answerDraggedOver, setAnswerDraggedOver] = useState<number | null>(null);

  // All forms: q1, q2, plus any additional forms for parts
  const allForms = [q1Form, q2Form, ...additionalForms];
  const currentForm = isGroupedQuestion ? (allForms[activeQuestionTab - 1] || q1Form) : q1Form;
  const isPartsMode = passageType === 'parts';
  const totalParts = 2 + additionalForms.length;

  const handleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (file: File | null) => void,
    setPreview: (preview: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
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
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
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
      const reader = new FileReader();
      reader.onloadend = () => currentForm.setAnswerImage(index, file, reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const renderImageUpload = (
    id: string,
    label: string,
    preview: string | null,
    dropZone: string,
    onFileChange: (file: File | null) => void,
    onPreviewChange: (preview: string | null) => void
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleImageSelect(e, onFileChange, onPreviewChange)}
        className="hidden"
        id={id}
      />
      <label
        htmlFor={id}
        className="cursor-pointer block"
        onDragOver={(e) => handleDragOver(e, dropZone)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, onFileChange, onPreviewChange)}
      >
        {preview ? (
          <div className={`relative group w-full h-24 rounded-xl border overflow-hidden transition-all ${draggedOver === dropZone ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 dark:border-neutral-700"}`}>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFileChange(null); onPreviewChange(null); }}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              title="Remove image"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {draggedOver === dropZone && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-700">Drop to replace</span>
              </div>
            )}
          </div>
        ) : (
          <div className={`w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-gray-400 transition-colors ${draggedOver === dropZone ? "border-blue-500 bg-blue-50" : "border-gray-200 dark:border-neutral-700 hover:border-blue-500"}`}>
            <span className="text-xs font-medium text-gray-400 dark:text-neutral-500">Drop image</span>
            <span className="text-xs text-gray-400 dark:text-neutral-500">or click</span>
          </div>
        )}
      </label>
    </div>
  );

  return (
    <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm p-5 max-h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
          {editingId ? "Edit Question" : "Add New Question"}
        </h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              showPreview ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-300 dark:hover:bg-neutral-600"
            }`}
          >
            i
          </button>

          {showPreview && (
            <div className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 z-50">
              <div className="absolute -top-2 right-3 w-4 h-4 bg-white dark:bg-neutral-900 border-l border-t border-gray-100 dark:border-neutral-800 transform rotate-45"></div>
              <div className="p-4 space-y-3">
                {(currentForm.state.questionText || currentForm.state.questionImagePreview) && (
                  <div className="mb-3">
                    {currentForm.state.questionImagePreview && (
                      <div className="w-full">
                        <img src={currentForm.state.questionImagePreview} alt="Question" className={`w-full h-auto object-contain rounded-lg ${currentForm.state.imageSize === 'small' ? 'max-h-32' : currentForm.state.imageSize === 'medium' ? 'max-h-48' : currentForm.state.imageSize === 'extra-large' ? '' : 'max-h-80'}`} />
                      </div>
                    )}
                    {currentForm.state.questionText && (
                      <div className={currentForm.state.questionImagePreview ? "mt-4" : ""} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "1.125rem" }}>
                        <MathText text={currentForm.state.questionText} className="leading-relaxed" />
                      </div>
                    )}
                  </div>
                )}

                {currentForm.state.answers.some((a, idx) => a.trim() || currentForm.state.answerImagePreviews[idx]) && (
                  <div className={`${currentForm.state.answerLayout === "grid" ? "grid grid-cols-2 gap-2" : currentForm.state.answerLayout === "row" ? "grid grid-cols-4 gap-2" : "space-y-2"}`}>
                    {currentForm.state.answers.map((answer, index) => {
                      const answerNum = index + 1;
                      const isCorrect = currentForm.state.correctAnswer === answerNum;
                      const gridOrder = currentForm.state.answerLayout === "grid" ? [0, 2, 1, 3][index] : index;
                      let buttonClass = "w-full px-4 py-3 text-left rounded-xl border transition-all duration-200 font-medium";
                      if (isCorrect) buttonClass += " bg-green-50 dark:bg-green-900/30 border-green-500 text-green-900 dark:text-green-400";
                      else buttonClass += " bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300";
                      const answerImage = currentForm.state.answerImagePreviews[index];

                      return (
                        <div key={index} style={{ order: gridOrder }}>
                          <div className={buttonClass}>
                            <div className="flex items-start gap-3" style={{ fontSize: "1.125rem" }}>
                              <span className="font-bold shrink-0 leading-normal" style={{ fontFamily: "'Times New Roman', Times, serif" }}>({answerNum})</span>
                              <div className="flex-1 min-w-0 overflow-hidden" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                {answer && <div className="break-words overflow-wrap-anywhere"><MathText text={answer} className="text-left" /></div>}
                                {answerImage && <img src={answerImage} alt={`Answer ${answerNum}`} className="max-w-full h-auto rounded border border-gray-200 dark:border-neutral-700 mt-2" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!currentForm.state.questionText && !currentForm.state.questionImagePreview && !currentForm.state.answers.some((a) => a.trim()) && (
                  <div className="text-center text-gray-400 dark:text-neutral-500 py-8 text-sm">Start typing to see preview</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {/* Grouped Question Toggle */}
        {!editingId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-950 rounded-xl border border-gray-100 dark:border-neutral-800">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Grouped Question (Passage-based)</label>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Create questions that share a common passage</p>
              </div>
              <button
                type="button"
                onClick={() => onToggleGrouped(!isGroupedQuestion)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isGroupedQuestion ? "bg-black dark:bg-neutral-200" : "bg-gray-300 dark:bg-neutral-700"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isGroupedQuestion ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {isGroupedQuestion && (
              <div className="flex items-center gap-2 px-3">
                <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">Type:</span>
                <button
                  type="button"
                  onClick={() => onPassageTypeChange('grouped')}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${passageType === 'grouped' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'}`}
                >
                  Grouped (split-pane)
                </button>
                <button
                  type="button"
                  onClick={() => onPassageTypeChange('parts')}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${passageType === 'parts' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'}`}
                >
                  Parts (stacked, 1 question)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Passage Container */}
        {isGroupedQuestion && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">Shared Passage</h3>
            <PassageTextEditor
              value={passageAboveText}
              onChange={onPassageAboveTextChange}
              label="Passage Text (above image)"
              labelClassName="block text-xs font-medium text-blue-800 dark:text-blue-400 mb-1"
              placeholder="Text displayed above the passage (supports LaTeX)..."
              rows={3}
              inputClassName="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono"
            />
            <DocumentsEditor
              title="Passage Documents"
              value={passageDocuments}
              onChange={onPassageDocumentsChange}
              emptyHint="Add images or PDFs that appear with the passage."
            />
            <PassageTextEditor
              value={passageText}
              onChange={onPassageTextChange}
              label="Passage Text (below image)"
              labelClassName="block text-xs font-medium text-blue-800 dark:text-blue-400 mb-1"
              placeholder="Enter the shared passage or summary text..."
              rows={12}
              inputClassName="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono"
            />
          </div>
        )}

        {/* Question Tabs */}
        {isGroupedQuestion && (
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: totalParts }, (_, i) => i + 1).map((tabNum) => (
              <button
                key={tabNum}
                type="button"
                onClick={() => onActiveQuestionTabChange(tabNum)}
                className={`flex-1 min-w-[80px] py-2 px-4 text-sm font-medium rounded-full transition-all ${activeQuestionTab === tabNum ? "bg-black text-white dark:bg-white dark:text-black" : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700"}`}
              >
                {isPartsMode ? `Part ${String.fromCharCode(96 + tabNum)}` : `Question ${tabNum}`}
              </button>
            ))}
            {isPartsMode && onAddPart && (
              <button
                type="button"
                onClick={onAddPart}
                className="py-2 px-4 text-sm font-medium rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all"
              >
                + Add Part
              </button>
            )}
            {isPartsMode && onRemovePart && totalParts > 2 && activeQuestionTab > 2 && (
              <button
                type="button"
                onClick={() => onRemovePart(activeQuestionTab)}
                className="py-2 px-3 text-sm font-medium rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all"
                title="Remove this part"
              >
                Remove
              </button>
            )}
          </div>
        )}

        {/* Question Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
            {isGroupedQuestion ? (isPartsMode ? `Part ${String.fromCharCode(96 + activeQuestionTab)} Name (Optional)` : `Question ${activeQuestionTab} Name (Optional)`) : "Question Name (Optional)"}
          </label>
          <input
            type="text"
            value={currentForm.state.questionName}
            onChange={(e) => currentForm.setField("questionName", e.target.value)}
            placeholder="e.g., Linear Equations - Problem 1"
            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
          />
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">Helps you identify this question in the list</p>
        </div>

        {/* Above Image Text */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Question Text <span className="text-gray-500 dark:text-neutral-400">(above image)</span>
          </label>
          <textarea
            value={currentForm.state.aboveImageText || ""}
            onChange={(e) => currentForm.setField("aboveImageText", e.target.value)}
            placeholder="Text displayed above the question image (optional)..."
            rows={2}
            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono"
          />
        </div>

        {/* Question Documents (images / PDFs, above or below the question text) */}
        <DocumentsEditor
          title="Question Documents"
          showPosition
          value={currentForm.state.questionDocuments}
          onChange={(next) => currentForm.setField("questionDocuments", next)}
          emptyHint="Add images or PDFs that appear with the question."
        />

        {/* Question Text (Below Image) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Question Text <span className="text-gray-500 dark:text-neutral-400">(below image)</span>
          </label>
          <textarea
            value={currentForm.state.questionText}
            onChange={(e) => currentForm.setField("questionText", e.target.value)}
            placeholder="Enter question text. Use LaTeX for math: \frac{x}{2}, x^{2}, \sqrt{x}"
            rows={3}
            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono"
          />
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            Use LaTeX for math equations. Examples: $\frac{`{x}`}{`{2}`}$, $x^{`{2}`}$, $\sqrt{`{x}`}$
          </p>
        </div>

        {/* Reference Documents (multiple images / PDFs available via Reference button) */}
        <DocumentsEditor
          title="Reference Documents"
          value={currentForm.state.referenceDocuments}
          onChange={(next) => currentForm.setField("referenceDocuments", next)}
          emptyHint="Add reference images or PDFs students can open during this question."
        />

        {/* Explanation image (single, kept as-is) */}
        <div className="grid grid-cols-2 gap-2">
          {renderImageUpload("explanation-image", "Explanation Image (Optional)", currentForm.state.explanationImagePreview, "explanation", (file) => currentForm.setField("explanationImage", file), (preview) => currentForm.setField("explanationImagePreview", preview))}
        </div>

        {/* Question Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">Question Type</label>
          <select
            value={currentForm.state.questionType || "multiple-choice"}
            onChange={(e) => currentForm.setField("questionType", e.target.value as "multiple-choice" | "drag-order")}
            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
          >
            <option value="multiple-choice">Multiple Choice</option>
            <option value="drag-order">Drag & Order</option>
          </select>
          {currentForm.state.questionType === "drag-order" && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Enter items in the CORRECT order. They will be shuffled for students.</p>
          )}
        </div>

        {/* Answers */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300">
              {currentForm.state.questionType === "drag-order" ? "Items (in correct order)" : "Answers"} <span className="text-red-500">*</span>{" "}
              <span className="text-gray-500 dark:text-neutral-400 font-normal">(text or image or both required)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-neutral-400">Layout:</span>
              {(["list", "grid", "row"] as const).map((layout) => (
                <button key={layout} type="button" onClick={() => currentForm.setField("answerLayout", layout)} className={`px-2 py-1 text-xs rounded-full transition-all ${currentForm.state.answerLayout === layout ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700"}`}>
                  {layout === "list" ? "List (1x4)" : layout === "grid" ? "Grid (2x2)" : "Row (4x1)"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {currentForm.state.answers.map((answer, index) => (
              <div key={index} className="border border-gray-100 dark:border-neutral-800 rounded-xl p-3">
                <div className="flex items-start gap-2 mb-2">
                  {currentForm.state.questionType !== "drag-order" && (
                    <input type="radio" name="correct-answer" checked={currentForm.state.correctAnswer === index + 1} onChange={() => currentForm.setField("correctAnswer", index + 1)} className="h-4 w-4 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-700 dark:text-neutral-300">
                        {currentForm.state.questionType === "drag-order" ? `Item ${index + 1}` : `(${index + 1})`}
                      </span>
                      {currentForm.state.questionType !== "drag-order" && currentForm.state.correctAnswer === index + 1 && (
                        <span className="text-green-600 dark:text-green-400 text-xs font-bold">Correct</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => currentForm.setAnswer(index, e.target.value)}
                      placeholder="Answer text (optional if image provided)"
                      className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                    />
                  </div>
                </div>
                <div className="ml-6">
                  <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => currentForm.setAnswerImage(index, file, reader.result as string); reader.readAsDataURL(file); } else { currentForm.setAnswerImage(index, null, null); } }} className="hidden" id={`answer-image-${index}`} />
                  {currentForm.state.answerImagePreviews[index] ? (
                    <label htmlFor={`answer-image-${index}`} className="cursor-pointer block" onDragOver={(e) => handleAnswerImageDragOver(e, index)} onDragLeave={handleAnswerImageDragLeave} onDrop={(e) => handleAnswerImageDrop(e, index)}>
                      <div className={`relative w-full max-w-xs h-24 rounded-xl border overflow-hidden transition-all ${answerDraggedOver === index ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 dark:border-neutral-700"}`}>
                        <img src={currentForm.state.answerImagePreviews[index]!} alt={`Answer ${index + 1}`} className="w-full h-full object-cover" />
                        {answerDraggedOver === index && <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center"><span className="text-xs font-bold text-blue-700">Drop to replace</span></div>}
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); currentForm.removeAnswerImage(index); }} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 active:scale-95 transition-all z-10">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </label>
                  ) : (
                    <label htmlFor={`answer-image-${index}`} className="cursor-pointer block" onDragOver={(e) => handleAnswerImageDragOver(e, index)} onDragLeave={handleAnswerImageDragLeave} onDrop={(e) => handleAnswerImageDrop(e, index)}>
                      <div className={`w-full max-w-xs h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-neutral-500 transition-colors ${answerDraggedOver === index ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-neutral-700 hover:border-blue-500"}`}>
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

        {/* Points */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">Points <span className="text-red-500">*</span></label>
          <input type="number" value={currentForm.state.points} onChange={(e) => currentForm.setField("points", parseInt(e.target.value) || 1)} placeholder="1" className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100" />
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">Points awarded for this question (default: 1)</p>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">Difficulty</label>
          <select value={currentForm.state.difficulty} onChange={(e) => currentForm.setField("difficulty", e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100">
            <option value="">None</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">Skills <span className="text-red-500">*</span></label>
          <TagInput selectedTags={currentForm.state.selectedSkills} availableTags={availableTags} onChange={(tags) => currentForm.setField("selectedSkills", tags)} placeholder="Type to search or add new skills (e.g., Linear Equations, Quadratic Functions)" />
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Skills tested by this question</p>
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">Explanation <span className="text-red-500">*</span></label>
          <textarea value={currentForm.state.explanationText} onChange={(e) => currentForm.setField("explanationText", e.target.value)} placeholder="Explain the correct answer" rows={3} className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-mono" />
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300">Notes</label>
            <button
              type="button"
              onClick={() => currentForm.setField("notes", "The real test will not look this way")}
              className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all"
            >
              + Default Note
            </button>
          </div>
          <textarea
            value={currentForm.state.notes}
            onChange={(e) => currentForm.setField("notes", e.target.value)}
            placeholder="Add a note for this question (visible to students)..."
            rows={2}
            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">Tags</label>
          <TagInput selectedTags={currentForm.state.selectedTags} availableTags={availableTagNames} onChange={(tags) => currentForm.setField("selectedTags", tags)} placeholder="Type to search or add new tags (e.g., Algebra, Functions)" />
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Broader categorization tags for filtering</p>
        </div>

        {/* Assign to Tests */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">Assign to Tests</label>
          {tests.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-neutral-400 italic">No tests available. Create a test first.</p>
          ) : (
            <TestMultiSelect tests={tests} subjects={subjects} selectedTestIds={selectedTestIds} onChange={onSelectedTestIdsChange} placeholder="Select tests..." />
          )}
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Select which tests this question should appear in</p>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-2xl text-sm font-bold border ${notification.type === "success" ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800"}`}>
            {notification.message}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white dark:bg-white dark:text-black px-4 py-3 text-sm font-bold rounded-full hover:bg-gray-800 dark:hover:bg-neutral-200 active:scale-95 disabled:opacity-50 transition-all shadow-md">
            {isSubmitting ? "SAVING..." : editingId ? "UPDATE QUESTION" : "CREATE QUESTION"}
          </button>
        </div>
      </form>
    </div>
  );
}
